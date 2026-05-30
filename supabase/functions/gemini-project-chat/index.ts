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
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 200, headers: JSON_HEADERS });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 200, headers: JSON_HEADERS });
    }

    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded — max ${RATE_LIMIT_MAX} zpráv za hodinu.` }),
        { status: 200, headers: { ...JSON_HEADERS, "Retry-After": "3600" } }
      );
    }

    const body = await req.json();
    const currentMessage: string = body.currentMessage ?? "";
    const messages: Array<{ role: string; content: string }> = body.messages ?? [];
    const projectContext = body.projectContext ?? {};

    if (!currentMessage.trim()) {
      return new Response(JSON.stringify({ error: "currentMessage je povinný." }), { status: 200, headers: JSON_HEADERS });
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

    let reply = "";
    let success = false;
    let errorDetails = "";

    const apiKey = Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY");
    if (apiKey) {
      try {
        console.log("gemini-project-chat: Pokouším se volat Google Gemini API (gemini-2.0-flash)...");
        const geminiResp = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "gemini-2.0-flash",
              contents: geminiContents,
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1024,
              },
            }),
          }
        );

        if (geminiResp.ok) {
          const geminiData = await geminiResp.json();
          const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) {
            reply = text;
            success = true;
            console.log("gemini-project-chat: Google Gemini API úspěšně vrátil odpověď.");
          } else {
            console.warn("gemini-project-chat: Gemini vrátil prázdnou odpověď.");
            errorDetails += "[Gemini: prázdná odpověď] ";
          }
        } else {
          const errText = await geminiResp.text();
          console.warn(`gemini-project-chat: Gemini API vrátil chybu: ${geminiResp.status} ${errText.slice(0, 300)}`);
          errorDetails += `[Gemini chybný status ${geminiResp.status}: ${errText.slice(0, 150)}] `;
        }
      } catch (geminiError: any) {
        console.warn("gemini-project-chat: Selhalo volání Google Gemini API:", geminiError);
        errorDetails += `[Gemini výjimka: ${geminiError?.message || String(geminiError)}] `;
      }
    } else {
      console.warn("gemini-project-chat: Chybí GOOGLE_GENERATIVE_AI_API_KEY, zkouším rovnou zálohu (Claude).");
      errorDetails += "[Gemini: chybí API klíč] ";
    }

    // Fallback na Claude, pokud Gemini selhalo nebo nebylo úspěšné
    if (!success) {
      const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") || "";
      if (!anthropicKey) {
        console.error("gemini-project-chat: Chybí GOOGLE_GENERATIVE_AI_API_KEY i ANTHROPIC_API_KEY");
        return new Response(
          JSON.stringify({ error: `AI není dostupné. Detaily chyb: ${errorDetails} + [Claude: chybí API klíč]` }),
          { status: 200, headers: JSON_HEADERS }
        );
      }

      console.log("gemini-project-chat: Spouštím záložní volání na Anthropic Claude...");
      try {
        const claudeHistory = geminiContents.map(msg => ({
          role: msg.role === "model" ? "assistant" : "user",
          content: msg.parts[0].text,
        }));

        const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1024,
            system: systemContext,
            messages: claudeHistory,
          }),
        });

        if (!claudeRes.ok) {
          const errText = await claudeRes.text();
          console.error("gemini-project-chat: Claude API error:", errText);
          errorDetails += `[Claude chybný status ${claudeRes.status}: ${errText.slice(0, 150)}]`;
          return new Response(
            JSON.stringify({ error: `AI není dostupné. Detaily chyb: ${errorDetails}` }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        const claudeData = await claudeRes.json();
        reply = claudeData.content?.[0]?.text ?? "";
        console.log("gemini-project-chat: Anthropic Claude úspěšně vrátil záložní odpověď.");
      } catch (claudeError: any) {
        console.error("gemini-project-chat: Claude API výjimka:", claudeError);
        errorDetails += `[Claude výjimka: ${claudeError?.message || String(claudeError)}]`;
        return new Response(
          JSON.stringify({ error: `AI není dostupné. Detaily chyb: ${errorDetails}` }),
          { status: 200, headers: JSON_HEADERS }
        );
      }
    }

    if (!reply) {
      return new Response(JSON.stringify({ error: `AI nevrátila žádnou odpověď. Detaily chyb: ${errorDetails}` }), { status: 200, headers: JSON_HEADERS });
    }

    return new Response(
      JSON.stringify({ reply }),
      { headers: JSON_HEADERS }
    );
  } catch (e: any) {
    console.error("gemini-project-chat: unhandled error:", e);
    return new Response(JSON.stringify({ error: `Interní chyba serveru: ${e?.message || String(e)}` }), { status: 200, headers: JSON_HEADERS });
  }
});
