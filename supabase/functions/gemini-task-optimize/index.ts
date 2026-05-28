import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3";

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
  suggestedProject: z.string().nullable().transform((v) => v || null),
  suggestedTags: z.array(z.string()).transform((arr) => arr.filter((s) => s.length > 0)).pipe(z.array(z.string()).max(3)),
  timeEstimate: z.enum(["15 min", "30 min", "1 hod", "2 hod", "půl dne", "celý den"]),
  subtasks: z.array(z.string()).transform((arr) => arr.filter((s) => s.length > 0)).pipe(z.array(z.string()).min(3).max(6)),
});

const GEMINI_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    optimizedTitle: { type: "STRING" },
    suggestedProject: { type: "STRING" },
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
- suggestedProject: vyber NEJLEPŠÍ projekt ze seznamu dostupných podle tématu úkolu. Pokud žádný nesedí, vrať prázdný řetězec "".
- suggestedTags: vyber 1–3 nejrelevantnější tagy ze seznamu dostupných. Navrhuj pouze existující, přidej nový jen pokud opravdu nic nesedí.
- timeEstimate: realistický odhad celkového času práce (nejen deadline).
- subtasks: 3–6 konkrétních, akčních podúkolů pro dokončení tohoto úkolu (česky, každý max 80 znaků).`;

    let rawText = "";
    let success = false;

    const apiKey = Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY");
    if (apiKey) {
      try {
        console.log("gemini-task-optimize: Pokouším se volat Google Gemini API (gemini-2.0-flash)...");
        const geminiResp = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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

        if (geminiResp.ok) {
          const geminiData = await geminiResp.json();
          const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            rawText = text;
            success = true;
            console.log("gemini-task-optimize: Google Gemini API úspěšně vrátil odpověď.");
          } else {
            console.warn("gemini-task-optimize: Gemini vrátil prázdnou odpověď.");
          }
        } else {
          const errText = await geminiResp.text();
          console.warn(`gemini-task-optimize: Gemini API vrátil chybu: ${geminiResp.status} ${errText.slice(0, 300)}`);
        }
      } catch (e) {
        console.warn("gemini-task-optimize: Selhalo volání Google Gemini API:", e);
      }
    } else {
      console.warn("gemini-task-optimize: Chybí GOOGLE_GENERATIVE_AI_API_KEY, zkouším rovnou zálohu (Claude).");
    }

    // Fallback na Claude, pokud Gemini selhalo nebo nebylo úspěšné
    if (!success) {
      const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
      if (!anthropicKey) {
        console.error("gemini-task-optimize: Chybí GOOGLE_GENERATIVE_AI_API_KEY i ANTHROPIC_API_KEY");
        return new Response(JSON.stringify({ error: "AI API credentials missing" }), { status: 500, headers: CORS });
      }

      console.log("gemini-task-optimize: Spouštím záložní volání na Anthropic Claude...");
      const claudeSystem = `Jsi asistent produktivity. Analyzuj úkol a navrhni optimalizovaná data přesně ve formátu JSON, který splňuje zadanou strukturu. Odpovídej výhradně čistým validním JSON objektem, bez jakéhokoli jiného textu, keců nebo markdown značek jako \`\`\`json.`;
      
      const claudePrompt = `${prompt}
      
Vrať výsledek jako JSON objekt s touto strukturou:
{
  "optimizedTitle": "string",
  "suggestedProject": "string (název projektu nebo prázdný řetězec)",
  "suggestedTags": ["tag1", "tag2"],
  "timeEstimate": "15 min" | "30 min" | "1 hod" | "2 hod" | "půl dne" | "celý den",
  "subtasks": ["podúkol1", "podúkol2", "podúkol3"]
}`;

      const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 800,
          system: claudeSystem,
          messages: [{ role: "user", content: claudePrompt }],
        }),
      });

      if (!claudeResp.ok) {
        const errText = await claudeResp.text();
        console.error("gemini-task-optimize: Claude API error:", errText);
        return new Response(JSON.stringify({ error: "AI služba nedostupná" }), { status: 502, headers: CORS });
      }

      const claudeData = await claudeResp.json();
      rawText = claudeData.content?.[0]?.text?.trim() ?? "";
      console.log("gemini-task-optimize: Anthropic Claude úspěšně vrátil záložní odpověď.");
    }

    // Odstranění případných markdown bloků \`\`\`json, pokud by je Claude přesto přidal
    let cleanedText = rawText.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "").trim();
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanedText);
    } catch {
      console.error("gemini-task-optimize: JSON parse error:", cleanedText);
      return new Response(JSON.stringify({ error: "AI vrátila neplatný JSON formát" }), { status: 500, headers: CORS });
    }

    const validated = TaskOptimizationSchema.safeParse(parsed);
    if (!validated.success) {
      console.error("gemini-task-optimize: Zod validation error:", JSON.stringify(validated.error.flatten()));
      console.error("gemini-task-optimize: raw parsed data:", JSON.stringify(parsed));
      return new Response(JSON.stringify({ error: "AI vrátila neočekávanou strukturu dat" }), { status: 500, headers: CORS });
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
