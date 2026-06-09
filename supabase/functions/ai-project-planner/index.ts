import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_MAX = 15;
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

const ProjectPlannerSchema = z.object({
  projectName: z.string().min(1).max(100),
  projectDescription: z.string().min(1).max(500),
  projectColor: z.string(),
  tasks: z.array(z.object({
    title: z.string().min(1).max(120),
    description: z.string().max(500),
    priority: z.enum(["low", "medium", "high"]),
    timeEstimate: z.enum(["15 min", "30 min", "1 hod", "2 hod", "půl dne", "celý den"]),
    subtasks: z.array(z.string()).transform((arr) => arr.filter((s) => s.length > 0)),
    tags: z.array(z.string()).transform((arr) => arr.filter((s) => s.length > 0)),
  })).min(3).max(12),
});

const GEMINI_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    projectName: { type: "STRING" },
    projectDescription: { type: "STRING" },
    projectColor: { type: "STRING" },
    tasks: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          description: { type: "STRING" },
          priority: { type: "STRING", enum: ["low", "medium", "high"] },
          timeEstimate: { type: "STRING", enum: ["15 min", "30 min", "1 hod", "2 hod", "půl dne", "celý den"] },
          subtasks: { type: "ARRAY", items: { type: "STRING" } },
          tags: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["title", "description", "priority", "timeEstimate", "subtasks", "tags"],
      },
    },
  },
  required: ["projectName", "projectDescription", "projectColor", "tasks"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 200, headers: CORS });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 200, headers: CORS });
    }

    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: `Limit překročen — max ${RATE_LIMIT_MAX} generování projektů za hodinu.` }),
        { status: 200, headers: { ...CORS, "Retry-After": "3600" } }
      );
    }

    const { userPrompt, availableTags } = await req.json();

    if (!userPrompt?.trim()) {
      return new Response(JSON.stringify({ error: "userPrompt je povinný." }), { status: 200, headers: CORS });
    }

    const tagList = Array.isArray(availableTags) && availableTags.length > 0
      ? `Dostupné štítky v aplikaci (pokud se hodí, preferuj je): ${availableTags.join(", ")}`
      : "Žádné stávající štítky.";

    const allowedColors = ["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#84cc16", "#6366f1", "#f97316"];

    const prompt = `Jsi elitní projektový manažer a agilní Scrum Master. Navrhni kompletní, detailní, a profesionální strukturu projektu na základě uživatelského záměru.

Záměr uživatele: "${userPrompt}"

${tagList}

Pravidla pro výstup:
1. projectName: Vyber reprezentativní, výstižný a úderný název projektu v češtině.
2. projectDescription: Napiš inspirativní, motivační popis projektu (2-4 věty v češtině). Měl by popisovat cíl, očekávané přínosy a celkový kontext projektu.
3. projectColor: Vyber přesně jednu z těchto barev, která nejlépe vystihuje téma projektu (např. červená pro urgentní/obchodní, modrá pro technické, zelená pro ekologii/finance apod.):
   Dostupné barvy: ${JSON.stringify(allowedColors)}
4. tasks: Vygeneruj seznam 6 až 10 vysoce konkrétních, akčních a smysluplných úkolů, které pokrývají kompletní životní cyklus projektu (od přípravy/výzkumu, přes realizaci, až po kontrolu a předání).
   Pro každý úkol uveď:
   - title: Akční název začínající silným českým slovesem v rozkazovacím způsobu nebo infinitivu (např. "Zanalyzovat...", "Sestavit...", "Otestovat...").
   - description: Stručný ale konkrétní popis úkolu (2-3 věty), co je cílem a jaké jsou klíčové parametry pro splnění.
   - priority: "high" (vysoká), "medium" (střední), nebo "low" (nízká) na základě důležitosti.
   - timeEstimate: Odhadovaný čas úkolu (vyber z: "15 min", "30 min", "1 hod", "2 hod", "půl dne", "celý den").
   - subtasks: 3 až 5 logicky po sobě jdoucích podúkolů (milníků) pro dokončení tohoto úkolu v češtině (každý podúkol max 80 znaků).
   - tags: 1 až 2 relevantní štítky. Použij dostupné štítky, pokud sedí s tématem, nebo vymysli nové (např. "marketing", "design", "vyvoj", "admin", "priprava"). Štítky piš malými písmeny, bez mezer a speciálních znaků.`;

    let rawText = "";
    let success = false;
    let errorDetails = "";
    let geminiDebugInfo: any = null;

    const apiKey = Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY");
    if (apiKey) {
      try {
        console.log("ai-project-planner: Volám Google Gemini API (gemini-3.5-flash)...");
        const geminiResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
                responseSchema: GEMINI_RESPONSE_SCHEMA,
                temperature: 0.6,
                maxOutputTokens: 8192,
              },
            }),
          }
        );

        if (geminiResp.ok) {
          const geminiData = await geminiResp.json();
          geminiDebugInfo = geminiData;
          const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            rawText = text;
            success = true;
            console.log("ai-project-planner: Google Gemini API úspěšně vrátil odpověď.");
          } else {
            console.warn("ai-project-planner: Gemini vrátil prázdnou odpověď.");
            errorDetails += "[Gemini: prázdná odpověď] ";
          }
        } else {
          const errText = await geminiResp.text();
          console.warn(`ai-project-planner: Gemini API vrátil chybu: ${geminiResp.status} ${errText.slice(0, 300)}`);
          errorDetails += `[Gemini chybný status ${geminiResp.status}: ${errText.slice(0, 150)}] `;
        }
      } catch (e: any) {
        console.warn("ai-project-planner: Selhalo volání Google Gemini API:", e);
        errorDetails += `[Gemini výjimka: ${e?.message || String(e)}] `;
      }
    } else {
      console.warn("ai-project-planner: Chybí GOOGLE_GENERATIVE_AI_API_KEY, zkouším rovnou zálohu (Claude).");
      errorDetails += "[Gemini: chybí API klíč] ";
    }

    // Fallback na Claude, pokud Gemini selhalo nebo nebylo úspěšné
    if (!success) {
      const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
      if (!anthropicKey) {
        console.error("ai-project-planner: Chybí GOOGLE_GENERATIVE_AI_API_KEY i ANTHROPIC_API_KEY");
        return new Response(
          JSON.stringify({ error: `AI není dostupné. Detaily chyb: ${errorDetails} + [Claude: chybí API klíč]` }),
          { status: 200, headers: CORS }
        );
      }

      console.log("ai-project-planner: Spouštím záložní volání na Anthropic Claude...");
      const claudeSystem = `Jsi elitní projektový manažer. Navrhni kompletní a detailní projektovou strukturu přesně ve formátu JSON, který splňuje zadanou strukturu. Odpovídej výhradně čistým validním JSON objektem, bez jakéhokoli jiného doprovodného textu, keců nebo markdown značek jako \`\`\`json.`;
      
      const claudePrompt = `${prompt}
      
Vrať výsledek jako JSON objekt s touto strukturou:
{
  "projectName": "string",
  "projectDescription": "string",
  "projectColor": "string (vybraný hex)",
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "priority": "low" | "medium" | "high",
      "timeEstimate": "15 min" | "30 min" | "1 hod" | "2 hod" | "půl dne" | "celý den",
      "subtasks": ["string"],
      "tags": ["string"]
    }
  ]
}`;

      try {
        const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1500,
            system: claudeSystem,
            messages: [{ role: "user", content: claudePrompt }],
          }),
        });

        if (!claudeResp.ok) {
          const errText = await claudeResp.text();
          console.error("ai-project-planner: Claude API error:", errText);
          errorDetails += `[Claude chybný status ${claudeResp.status}: ${errText.slice(0, 150)}]`;
          return new Response(
            JSON.stringify({ error: `AI služba nedostupná. Detaily chyb: ${errorDetails}` }),
            { status: 200, headers: CORS }
          );
        }

        const claudeData = await claudeResp.json();
        rawText = claudeData.content?.[0]?.text?.trim() ?? "";
        console.log("ai-project-planner: Anthropic Claude úspěšně vrátil záložní odpověď.");
      } catch (claudeError: any) {
        console.error("ai-project-planner: Claude API výjimka:", claudeError);
        errorDetails += `[Claude výjimka: ${claudeError?.message || String(claudeError)}]`;
        return new Response(
          JSON.stringify({ error: `AI služba nedostupná. Detaily chyb: ${errorDetails}` }),
          { status: 200, headers: CORS }
        );
      }
    }

    // Odstranění případných markdown bloků \`\`\`json
    let cleanedText = rawText.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "").trim();
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanedText);
    } catch (parseErr: any) {
      console.error("ai-project-planner: JSON parse error:", cleanedText);
      return new Response(
        JSON.stringify({ 
          error: `AI vrátila neplatný JSON formát. Detaily chyb: ${errorDetails}`,
          rawText: rawText,
          cleanedText: cleanedText,
          parseError: parseErr?.message || String(parseErr),
          geminiDebugInfo: geminiDebugInfo
        }),
        { status: 200, headers: CORS }
      );
    }

    const validated = ProjectPlannerSchema.safeParse(parsed);
    if (!validated.success) {
      console.error("ai-project-planner: Zod validation error:", JSON.stringify(validated.error.flatten()));
      console.error("ai-project-planner: raw parsed data:", JSON.stringify(parsed));
      return new Response(
        JSON.stringify({ 
          error: `AI vrátila neočekávanou strukturu dat. Detaily chyb: ${errorDetails}`,
          rawParsed: parsed,
          validationErrors: validated.error.flatten(),
          geminiDebugInfo: geminiDebugInfo
        }),
        { status: 200, headers: CORS }
      );
    }

    return new Response(
      JSON.stringify({ result: validated.data }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("ai-project-planner: unhandled error:", e);
    return new Response(
      JSON.stringify({ error: `Interní chyba serveru: ${e?.message || String(e)}` }),
      { status: 200, headers: CORS }
    );
  }
});
