import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_MAX = 20;
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

const TaskOptimizationSchema = z.object({
  optimizedTitle: z.string().min(1).max(120),
  suggestedProject: z.string().nullable(),
  suggestedTags: z.array(z.string().min(1)).min(0).max(3),
  timeEstimate: z.enum(["15 min", "30 min", "1 hod", "2 hod", "půl dne", "celý den"]),
  subtasks: z.array(z.string().min(1)).min(3).max(6),
});

const GEMINI_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    optimizedTitle: { type: "STRING" },
    suggestedProject: { type: "STRING", nullable: true },
    suggestedTags: { type: "ARRAY", items: { type: "STRING" } },
    timeEstimate: {
      type: "STRING",
      enum: ["15 min", "30 min", "1 hod", "2 hod", "půl dne", "celý den"],
    },
    subtasks: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["optimizedTitle", "suggestedProject", "suggestedTags", "timeEstimate", "subtasks"],
};

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
        JSON.stringify({ error: `Rate limit exceeded — max ${RATE_LIMIT_MAX} optimalizací za hodinu.` }),
        { status: 429, headers: { ...CORS, "Retry-After": "3600" } }
      );
    }

    const { currentTitle, currentDescription, availableProjects, availableTags } = await req.json();

    if (!currentTitle?.trim()) {
      return new Response(JSON.stringify({ error: "currentTitle je povinný." }), { status: 400, headers: CORS });
    }

    const projectList = Array.isArray(availableProjects) && availableProjects.length > 0
      ? `Dostupné projekty: ${availableProjects.join(", ")}`
      : "Žádné projekty zatím.";

    const tagList = Array.isArray(availableTags) && availableTags.length > 0
      ? `Dostupné tagy: ${availableTags.join(", ")}`
      : "Žádné tagy zatím.";

    const prompt = `Jsi asistent produktivity. Analyzuj tento úkol a vrať optimalizovaná data.

Název úkolu: "${currentTitle}"${currentDescription ? `\nPopis: "${currentDescription}"` : ""}

${projectList}
${tagList}

Pravidla:
- optimizedTitle: přeformuluj na akční větu začínající slovesem (např. "Aktualizovat...", "Připravit...", "Navrhnout..."). Zachovej klíčové info, buď konkrétnější než vstup.
- suggestedProject: vyber NEJLEPŠÍ projekt ze seznamu dostupných podle tématu úkolu. Pokud žádný nesedí, vrať null.
- suggestedTags: vyber 1–3 nejrelevantnější tagy ze seznamu dostupných. Navrhuj pouze existující, přidej nový jen pokud opravdu nic nesedí.
- timeEstimate: realistický odhad celkového času práce (nejen deadline).
- subtasks: 3–6 konkrétních, akčních podúkolů pro dokončení tohoto úkolu (česky, každý max 80 znaků).`;

    const apiKey = Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY");
    if (!apiKey) {
      console.error("gemini-task-optimize: chybí GOOGLE_GENERATIVE_AI_API_KEY");
      return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500, headers: CORS });
    }

    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: GEMINI_RESPONSE_SCHEMA,
            temperature: 0.4,
            maxOutputTokens: 800,
          },
        }),
      }
    );

    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      console.error("gemini-task-optimize: Gemini API error:", errText);
      return new Response(JSON.stringify({ error: "Chyba AI služby" }), { status: 502, headers: CORS });
    }

    const geminiData = await geminiResp.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      console.error("gemini-task-optimize: JSON parse error:", rawText);
      return new Response(JSON.stringify({ error: "AI vrátila neplatný formát" }), { status: 500, headers: CORS });
    }

    const validated = TaskOptimizationSchema.safeParse(parsed);
    if (!validated.success) {
      console.error("gemini-task-optimize: Zod validation error:", validated.error.flatten());
      return new Response(JSON.stringify({ error: "AI vrátila neočekávaná data" }), { status: 500, headers: CORS });
    }

    return new Response(
      JSON.stringify({ result: validated.data }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("gemini-task-optimize: unhandled error:", e);
    return new Response(JSON.stringify({ error: "Interní chyba serveru" }), { status: 500, headers: CORS });
  }
});
