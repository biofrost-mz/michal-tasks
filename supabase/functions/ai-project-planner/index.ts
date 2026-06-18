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

    const allowedColors = ["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];
    const prompt = `Jsi elitní technický projektový manažer (PM), certifikovaný agilní Scrum Master a produktový vizionář s hlubokým pochopením produktové psychologie a softwarového inženýrství.
Navrhni kompletní, do nejmenšího detailu promyšlenou, vysoce profesionální, robustní a plně realizovatelnou strukturu projektu na základě uživatelského záměru v češtině.

Záměr uživatele: "${userPrompt}"

${tagList}

Pravidla pro tvorbu a výstup projektu:

1. **projectName (Název projektu):**
   - Vyber reprezentativní, výstižný, úderný a profesionální název v češtině (např. "Zprovoznění firemního intranetu", "Optimalizace konverzního trychtýře"), který perfektně charakterizuje podstatu celého projektu. Vyhni se obecným názvům.

2. **projectDescription (Popis projektu):**
   - Napiš inspirativní, vysoce motivační, věcný a detailní popis projektu v češtině o délce přesně 3 až 4 věty.
   - Popis musí jasně formulovat strategický cíl projektu, jeho očekávané klíčové přínosy pro uživatele nebo byznys a celkový kontext dodávky.

3. **projectColor (Barevný styl):**
   - Vyber přesně jednu z povolených barev, která psychologicky nejlépe sedí k tématu projektu (např. červená pro prodej/urgentnost, zelená pro finance/ekologii, modrá/indigo pro software/technologie, fialová pro kreativní tvorbu apod.).
   - Povolené barvy: ${JSON.stringify(allowedColors)}

4. **tasks (Úkoly projektu):**
   - Vygeneruj seznam **přesně 6 až 10 vysoce konkrétních, akčních a smysluplných úkolů**.
   - Úkoly musí být uspořádány tak, aby logicky a chronologicky pokrývaly **kompletní životní cyklus (fázování) projektu**:
     - **Fáze 1: Analýza & Příprava** (rešerše, sběr požadavků, příprava prostředí).
     - **Fáze 2: Návrh & Specifikace** (wireframy, architektura, osnovy).
     - **Fáze 3: Vývoj & Implementace** (samotná tvorba, programování, copywriting, konstrukce).
     - **Fáze 4: Testování & Revize** (kontrola kvality, uživatelské testování, oprava chyb).
     - **Fáze 5: Nasazení & Předání** (spuštění, odevzdání, archivace).
   - Pro každý jednotlivý úkol uveď tyto parametry:
     - **title (Název úkolu):** Akční název začínající silným českým slovesem v infinitivu (např. "Zkonstruovat...", "Zprovoznit...", "Analyzovat...", "Otestovat...", "Vytvořit...", "Zrefaktorovat...").
       - **PŘÍSNÝ ZÁKAZ** slabých, vágních a neproduktivních sloves: "udělat", "vyřešit", "pořešit", "jít na", "pracovat na". Každý název musí jasně říkat, co se fyzicky provádí.
     - **description (Popis úkolu):** Konkrétní a srozumitelný popis (2 až 3 věty) definující přesný cíl úkolu a povinně obsahující **Definici hotova (Definition of Done)** a **logické závislosti** (např. "Cílem je vytvořit kompletní databázový model. **Definition of Done:** Schválené ERD schéma a připravený migrační skript. Tento úkol přímo navazuje na dokončení předchozí analýzy požadavků.").
     - **priority (Priorita):** Vyhodnoť logicky: "high" pro startovací analýzy a kritické realizační bloky, "medium" pro standardní vývoj, "low" pro doplňkové revize a drobnosti.
     - **timeEstimate (Časový odhad):** Realistický střízlivý odhad času, který musí patřit výhradně do této sady: "15 min", "30 min", "1 hod", "2 hod", "půl dne", "celý den". Zapoj mírnou časovou rezervu pro potlačení plánovacího optimismu (Planning Fallacy).
     - **subtasks (Milníky úkolu):** Vygeneruj **3 až 5 logicky po sobě jdoucích podúkolů** (mikro-kroků), které tvoří plán pro tento konkrétní úkol (délka každého subtasku max 80 znaků, začátek silným slovesem). Tyto podúkoly must pokrývat přípravu, realizaci i kontrolu.
     - **tags (Štítky):** Vyber 1 až 2 relevantní štítky. Preferuj stávající štítky z databáze, pokud tematicky sedí, nebo navrhni nové, vysoce přesné (vždy malá písmena, jednoslovné, bez mezer a diakritiky, např. "vyvoj", "design", "marketing", "copy").`;

    let rawText = "";
    let success = false;
    let errorDetails = "";
    let geminiDebugInfo: any = null;

    const apiKey = Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY");
    if (apiKey) {
      try {
        console.log("ai-project-planner: Volám Google Gemini API (gemini-1.5-flash)...");
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
      JSON.stringify({
        result: validated.data,
        meta: {
          model: success ? "Gemini 1.5 Flash" : "Claude 3.5 Sonnet",
        }
      }),
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
