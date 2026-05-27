import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JSON_HEADERS = { ...CORS, "Content-Type": "application/json" };

const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: JSON_HEADERS });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: JSON_HEADERS });
    }

    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded — max ${RATE_LIMIT_MAX} zpráv za hodinu.` }),
        { status: 429, headers: { ...JSON_HEADERS, "Retry-After": "3600" } }
      );
    }

    const body = await req.json();
    const currentMessage: string = body.currentMessage ?? "";
    const messages: Array<{ role: string; content: string }> = body.messages ?? [];
    const projectContext = body.projectContext ?? {};

    if (!currentMessage.trim()) {
      return new Response(JSON.stringify({ error: "currentMessage je povinný." }), { status: 400, headers: JSON_HEADERS });
    }

    const project = projectContext.project ?? {};
    const tasks: Array<{ title: string; status: string; priority?: string; dueDate?: string; subtasks?: Array<{ text: string; done: boolean }> }> = projectContext.tasks ?? [];
    const notes: Array<{ title: string; content?: string }> = projectContext.notes ?? [];

    const taskLines = tasks.map((task) => {
      const subDone = task.subtasks ? task.subtasks.filter((s) => s.done).length : 0;
      const subTotal = task.subtasks ? task.subtasks.length : 0;
      const subPart = subTotal > 0 ? ` [podúkoly: ${subDone}/${subTotal}]` : "";
      const priPart = task.priority ? ` (priorita: ${task.priority})` : "";
      const duePart = task.dueDate ? ` (termín: ${task.dueDate})` : "";
      return `- [${task.status}] ${task.title}${priPart}${duePart}${subPart}`;
    }).join("\n");

    const notesLines = notes.length > 0
      ? "Poznámky projektu:\n" + notes.map((n) => `- ${n.title}${n.content ? ": " + n.content.slice(0, 200) : ""}`).join("\n")
      : "";

    const contextText = [
      `Projekt: ${project.name ?? "Neznámý"} (${project.status ?? "?"})`,
      project.description ? `Popis: ${project.description}` : "",
      "",
      `Úkoly projektu (${tasks.length} celkem):`,
      taskLines || "(žádné úkoly)",
      "",
      notesLines,
    ].filter((line) => line !== "").join("\n").trim();

    const systemContext = `Jsi AI asistent pro správu projektů. Odpovídáš stručně a prakticky v češtině. Máš k dispozici kompletní data projektu níže. Pomáháš uživateli analyzovat stav projektu, identifikovat problémy a plánovat další kroky.\n\n${contextText}`;

    const apiKey = Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY");
    if (!apiKey) {
      console.error("gemini-project-chat: chybí GOOGLE_GENERATIVE_AI_API_KEY");
      return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500, headers: JSON_HEADERS });
    }

    // Build history with strictly alternating user/model roles
    const rawHistory = messages.slice(-20).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const alternating: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    for (const msg of rawHistory) {
      if (alternating.length > 0 && alternating[alternating.length - 1].role === msg.role) {
        alternating[alternating.length - 1] = msg;
      } else {
        alternating.push(msg);
      }
    }

    // Include project context directly in the user message (no systemInstruction)
    const userMessageText = alternating.length === 0
      ? `${systemContext}\n\nOtázka: ${currentMessage}`
      : currentMessage;

    const geminiContents = [
      ...alternating,
      { role: "user", parts: [{ text: userMessageText }] },
    ];

    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: geminiContents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      console.error("gemini-project-chat: Gemini API error", geminiResp.status, errText.slice(0, 500));
      return new Response(JSON.stringify({ error: "Chyba AI služby" }), { status: 200, headers: JSON_HEADERS });
    }

    const geminiData = await geminiResp.json();
    const reply: string = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    if (!reply) {
      console.error("gemini-project-chat: empty reply, data:", JSON.stringify(geminiData).slice(0, 500));
      return new Response(JSON.stringify({ error: "AI nevrátila žádnou odpověď" }), { status: 200, headers: JSON_HEADERS });
    }

    return new Response(
      JSON.stringify({ reply }),
      { headers: JSON_HEADERS }
    );
  } catch (e) {
    console.error("gemini-project-chat: unhandled error:", e);
    return new Response(JSON.stringify({ error: "Interní chyba serveru" }), { status: 200, headers: JSON_HEADERS });
  }
});
