import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = "Jsi asistent produktivity. Odpovídáš vždy v češtině, stručně a prakticky.";

// Simple rate limit: max N AI calls per user per window.
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const userClient = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded — max ${RATE_LIMIT_MAX} AI calls per hour.` }),
        { status: 429, headers: { ...CORS, "Retry-After": "3600", "Content-Type": "application/json" } }
      );
    }

    let action, task, note, availableTags;
    try {
      const body = await req.json();
      action = body?.action;
      task = body?.task;
      note = body?.note;
      availableTags = body?.availableTags;
    } catch (parseErr) {
      console.error("ai-task-assist: JSON parse error:", parseErr);
      return new Response(
        JSON.stringify({ error: "Neplatný požadavek. Tělo musí být platný JSON." }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    let prompt = "";

    if (action === "subtasks") {
      prompt = `Úkol: "${task.title}"${task.description ? `\nPopis: ${task.description}` : ""}

Navrhni 3–6 konkrétních, akčních podúkolů v češtině.
Vrať POUZE JSON pole stringů, žádný jiný text.
Příklad: ["Podúkol 1", "Podúkol 2", "Podúkol 3"]`;

    } else if (action === "tags") {
      const existing = availableTags?.length
        ? `Existující tagy: ${availableTags.join(", ")}`
        : "Zatím žádné tagy.";
      prompt = `Úkol: "${task.title}"${task.description ? `\nPopis: ${task.description}` : ""}
${existing}

Navrhni 1–3 relevantní tagy. Preferuj existující, jinak navrhni nové.
Vrať POUZE JSON pole stringů (malá písmena, bez mezer).
Příklad: ["design", "backend", "urgent"]`;

    } else if (action === "description") {
      prompt = `Název úkolu: "${task.title}"

Napiš stručný a užitečný popis (2–4 věty). Co je třeba udělat, proč je to důležité, jaký je výsledek.
Vrať POUZE text popisu, bez nadpisů nebo odrážek.`;

    } else if (action === "priority") {
      prompt = `Úkol: "${task.title}"${task.description ? `\nPopis: ${task.description}` : ""}${task.dueDate ? `\nTermín: ${task.dueDate}` : ""}

Odhadni prioritu. Vrať POUZE JSON objekt (žádný jiný text):
{"priority":"low"|"medium"|"high","reason":"krátké vysvětlení max 1 věta"}`;

    } else if (action === "note_summary") {
      prompt = `Shrň tuto poznámku ve 2–3 větách. Vrať POUZE text shrnutí.

Název: ${note.title || "Bez názvu"}
Obsah:
${(note.content || "").slice(0, 4000)}`;

    } else if (action === "note_continue") {
      prompt = `Pokračuj přirozeně v psaní této poznámky. Přidej 1–2 odstavce ve stejném stylu.
Vrať POUZE nový text ve formátu Markdown (bez opakování existujícího obsahu).

Název: ${note.title || "Bez názvu"}
Obsah:
${(note.content || "").slice(-2000)}`;

    } else if (action === "note_summary_bullet") {
      prompt = `Převeď tuto poznámku do stručných, přehledných odrážek (bullet-points) v češtině. Použij standardní odrážky (pomlčky nebo tečky). Vrať POUZE text s odrážkami, bez jakéhokoli jiného komentáře.

Název: ${note.title || "Bez názvu"}
Obsah:
${(note.content || "").slice(0, 4000)}`;

    } else if (action === "note_fix_tone") {
      prompt = `Oprav v této poznámce gramatické, pravopisné a stylistické chyby. Přepiš text do spisovné, profesionální a vkusné češtiny, aniž bys měnil původní význam.
Vrať POUZE opravený a upravený text poznámky bez jakýchkoli vysvětlivek, uvozovek nebo komentářů okolo.

Název: ${note.title || "Bez názvu"}
Obsah:
${(note.content || "").slice(0, 4000)}`;

    } else if (action === "note_extract_tasks") {
      prompt = `Z této poznámky vytáhni konkrétní akční body nebo úkoly k udělání.
Vrať POUZE JSON pole stringů, žádný jiný text.
Příklad: ["Zavolat Petrovi ohledně smlouvy", "Připravit prezentaci do pátku"]

Název: ${note.title || "Bez názvu"}
Obsah:
${(note.content || "").slice(0, 4000)}`;

    } else {
      return new Response(JSON.stringify({ error: "Unknown action" }), { status: 200, headers: CORS });
    }

    let raw = "";
    let success = false;
    let errorDetails = "";

    const apiKey = Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY");
    if (apiKey) {
      try {
        console.log(`ai-task-assist: Pokouším se volat Google Gemini API (gemini-2.0-flash) pro akci "${action}"...`);
        const isJsonAction = ["subtasks", "tags", "priority", "note_extract_tasks"].includes(action);
        
        const geminiResp = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "gemini-2.0-flash",
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              systemInstruction: {
                parts: [{ text: SYSTEM }]
              },
              generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 600,
                ...(isJsonAction ? { responseMimeType: "application/json" } : {}),
              },
            }),
          }
        );

        if (geminiResp.ok) {
          const geminiData = await geminiResp.json();
          const geminiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (geminiText) {
            raw = geminiText;
            success = true;
            console.log(`ai-task-assist: Google Gemini API úspěšně dokončil akci "${action}".`);
          } else {
            console.warn("ai-task-assist: Gemini vrátil prázdnou odpověď.");
            errorDetails += "[Gemini: prázdná odpověď] ";
          }
        } else {
          const errText = await geminiResp.text();
          console.warn(`ai-task-assist: Gemini API vrátil chybu: ${geminiResp.status} ${errText.slice(0, 300)}`);
          errorDetails += `[Gemini chybný status ${geminiResp.status}: ${errText.slice(0, 150)}] `;
        }
      } catch (geminiError: any) {
        console.warn("ai-task-assist: Selhalo volání Google Gemini API:", geminiError);
        errorDetails += `[Gemini výjimka: ${geminiError?.message || String(geminiError)}] `;
      }
    } else {
      console.warn("ai-task-assist: Chybí GOOGLE_GENERATIVE_AI_API_KEY, zkouším rovnou zálohu (Claude).");
      errorDetails += "[Gemini: chybí API klíč] ";
    }

    // Fallback na Claude
    if (!success) {
      const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
      if (!anthropicKey) {
        console.error("ai-task-assist: Chybí GOOGLE_GENERATIVE_AI_API_KEY i ANTHROPIC_API_KEY");
        return new Response(
          JSON.stringify({ error: `AI není dostupné. Detaily chyb: ${errorDetails} + [Claude: chybí API klíč]` }),
          { status: 200, headers: CORS }
        );
      }

      console.log(`ai-task-assist: Spouštím záložní volání na Anthropic Claude pro akci "${action}"...`);
      try {
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-3-5-haiku-20241022",
            max_tokens: 600,
            system: SYSTEM,
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (!resp.ok) {
          const err = await resp.text();
          console.error("ai-task-assist: upstream Claude API error:", err);
          errorDetails += `[Claude chybný status ${resp.status}: ${err.slice(0, 150)}]`;
          return new Response(
            JSON.stringify({ error: `AI není dostupné. Detaily chyb: ${errorDetails}` }),
            { status: 200, headers: CORS }
          );
        }

        const data = await resp.json();
        raw = data.content?.[0]?.text?.trim() ?? "";
        console.log("ai-task-assist: Anthropic Claude úspěšně vrátil záložní odpověď.");
      } catch (claudeError: any) {
        console.error("ai-task-assist: Claude API výjimka:", claudeError);
        errorDetails += `[Claude výjimka: ${claudeError?.message || String(claudeError)}]`;
        return new Response(
          JSON.stringify({ error: `AI není dostupné. Detaily chyb: ${errorDetails}` }),
          { status: 200, headers: CORS }
        );
      }
    }

    return new Response(
      JSON.stringify({ result: raw }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("ai-task-assist: unhandled error:", e);
    return new Response(
      JSON.stringify({ error: `Interní chyba serveru: ${e?.message || String(e)}` }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
