import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
// In-memory store (resets on cold start — good enough for personal app).
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
    }

    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded — max ${RATE_LIMIT_MAX} zpráv za hodinu.` }),
        { status: 429, headers: { ...CORS, "Retry-After": "3600" } }
      );
    }

    const { currentMessage, messages, projectContext } = await req.json();

    if (!currentMessage?.trim()) {
      return new Response(JSON.stringify({ error: "currentMessage je povinný." }), { status: 400, headers: CORS });
    }

    const { project, tasks, notes } = projectContext ?? {};

    const contextText = `
Projekt: ${project?.name ?? "Neznámý"} (${project?.status ?? "?"})
${project?.description ? `Popis: ${project.description}` : ""}

Úkoly projektu (${(tasks ?? []).length} celkem):
${(tasks ?? []).map((t: { title: string; status: string; priority?: string; dueDate?: string; subtasks?: Array<{text: string; done: boolean}> }) => {
  const subtaskSummary = t.subtasks?.length
    ? ` [podúkoly: ${t.subtasks.filter((s) => s.done).length}/${t.subtasks.length} hotovo]`
    : "";
  return `- [${t.status}] ${t.title}${t.priority ? ` (priorita: ${t.priority})` : ""}${t.dueDate ? ` (termín: ${t.dueDate})` : ""}${subtaskSummary}`;
}).join("\n")}

${(notes ?? []).length > 0 ? `Poznámky projektu:\n${(notes ?? []).map((n: { title: string; content: string }) => `- ${n.title}${n.content ? `: ${n.content.slice(0, 200)}` : ""}`).join("\n")}` : ""}
`.trim();

    const systemPrompt = `Jsi AI asistent pro správu projektů. Odpovídáš stručně a prakticky v češtině.
Máš k dispozici kompletní data projektu níže. Pomáháš uživateli analyzovat stav projektu, identifikovat problémy a plánovat další kroky.

${contextText}`;

    const rawHistory = (messages ?? []).slice(-20).map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Gemini requires strictly alternating user/model turns.
    // Drop consecutive same-role messages keeping the last one in each run.
    const alternating: typeof rawHistory = [];
    for (const msg of rawHistory) {
      if (alternating.length > 0 && alternating[alternating.length - 1].role === msg.role) {
        alternating[alternating.length - 1] = msg;
      } else {
        alternating.push(msg);
      }
    }

    const geminiMessages = [
      ...alternating,
      { role: "user", parts: [{ text: currentMessage }] },
    ];

    const apiKey = Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY");
    if (!apiKey) {
      console.error("gemini-project-chat: chybí GOOGLE_GENERATIVE_AI_API_KEY");
      return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500, headers: CORS });
    }

    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      console.error("gemini-project-chat: Gemini API error:", errText);
      return new Response(JSON.stringify({ error: "Chyba AI služby" }), { status: 502, headers: CORS });
    }

    const geminiData = await geminiResp.json();
    const reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    if (!reply) {
      return new Response(JSON.stringify({ error: "AI nevrátila žádnou odpověď" }), { status: 500, headers: CORS });
    }

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("gemini-project-chat: unhandled error:", e);
    return new Response(JSON.stringify({ error: "Interní chyba serveru" }), { status: 500, headers: CORS });
  }
});
