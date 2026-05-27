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
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
    }

    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded — max ${RATE_LIMIT_MAX} AI calls per hour.` }),
        { status: 429, headers: { ...CORS, "Retry-After": "3600" } }
      );
    }

    const { action, task, note, availableTags } = await req.json();

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

    } else if (action === "note_extract_tasks") {
      prompt = `Z této poznámky vytáhni konkrétní akční body nebo úkoly k udělání.
Vrať POUZE JSON pole stringů, žádný jiný text.
Příklad: ["Zavolat Petrovi ohledně smlouvy", "Připravit prezentaci do pátku"]

Název: ${note.title || "Bez názvu"}
Obsah:
${(note.content || "").slice(0, 4000)}`;

    } else {
      return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: CORS });
    }

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system: SYSTEM,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error("ai-task-assist: upstream AI error:", err);
      return new Response(JSON.stringify({ error: "AI API error" }), { status: 500, headers: CORS });
    }

    const data = await resp.json();
    const raw = data.content?.[0]?.text?.trim() ?? "";

    return new Response(
      JSON.stringify({ result: raw }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-task-assist: unhandled error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: CORS });
  }
});
