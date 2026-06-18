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
        JSON.stringify({ error: `Rate limit exceeded — max ${RATE_LIMIT_MAX} optimalizací za hodinu.` }),
        { status: 200, headers: { ...CORS, "Retry-After": "3600" } }
      );
    }

    const { currentTitle, currentDescription, availableProjects, availableTags } = await req.json();

    if (!currentTitle?.trim()) {
      return new Response(JSON.stringify({ error: "currentTitle je povinný." }), { status: 200, headers: CORS });
    }

    const projectList = Array.isArray(availableProjects) && availableProjects.length > 0
      ? `Dostupné projekty: ${availableProjects.join(", ")}`
      : "Žádné projekty zatím.";

    const tagList = Array.isArray(availableTags) && availableTags.length > 0
      ? `Dostupné tagy: ${availableTags.join(", ")}`
      : "Žádné tagy zatím.";

    const prompt = `Jsi absolutní špička v oboru osobní produktivity, elitní certifikovaný GTD (Getting Things Done) kouč a ostřílený Scrum Master / Agile Product Owner. Tvá kognitivní schopnost dekonstruovat vágní, chaotické nebo kusé zadání do precizních, strukturovaných a okamžitě vykonatelných kroků nemá obdoby.

Zanalyzuj zadaný úkol a navrhni jeho kompletní, vysoce profesionální optimalizaci. Tvým výstupem musí být dokonale validní JSON splňující zadané schéma.

Vstupní údaje k analýze:
- Název úkolu: "${currentTitle}"
${currentDescription ? `- Popis úkolu: "${currentDescription}"` : "- Popis úkolu: (bez popisu)"}

Workspace kontext (Zde jsou reálná stávající data z uživatelovy aplikace, která musíš přednostně využít):
- ${projectList}
- ${tagList}

Pravidla pro optimalizaci (všechny výstupy vygeneruj výhradně v bezchybné češtině):

1. **optimizedTitle (Optimalizovaný název úkolu):**
   - Transformuj původní název na silný, jasný, srozumitelný a nekompromisně akční titul začínající prémiovým, specifickým slovesem v infinitivu.
   - Název musí přesně definovat měřitelný nebo hmatatelný výsledek (Definition of Done) a zachovat veškerý věcný kontext původního zadání.
   - **KATEGORICKÝ ZÁKAZ** slabých, vágních a líných sloves: "udělat", "vyřešit", "pořešit", "připravit", "nastavit", "naplánovat", "zajistit", "podívat se", "zkusit", "pracovat na". Tato slovesa nic neříkají o skutečné povaze práce a jsou v profesionálním prostředí nepřípustná.
   - Místo nich použij vysoce specifická akční slovesa, jako např.: "zanalyzovat", "zkonstruovat", "zvalidovat", "naimplementovat", "zrefaktorovat", "vypracovat", "shromáždit", "projednat", "zintegrovat", "sepsat", "otestovat", "zprovoznit", "publikovat", "objednat".
   - Příklady přerodu ze špatného na excelentní název:
     - "Udělat analýzu konkurence" -> "Vypracovat hloubkovou srovnávací analýzu klíčových konkurentů"
     - "Webové stránky" -> "Zkonstruovat responzivní wireframe domovské stránky"
     - "Zavolat Petrovi ohledně peněz" -> "Projednat s Petrem rozpočet na Q3 a schválit finální výši investice"
     - "Koupit dárek" -> "Vybrat a objednat dárkový poukaz pro obchodního partnera"
     - "Opravit chybu s přihlášením" -> "Zanalyzovat a opravit autentizační chybu v login komponentě"

2. **suggestedProject (Doporučený projekt):**
   - Pečlivě projdi seznam dostupných projektů. Vyber pouze ten JEDINÝ existující projekt, který tématicky dokonale ladí s úkolem.
   - Buď maximálně konzervativní. Pokud v seznamu dostupných projektů neexistuje projekt, který by s úkolem prokazatelně a úzce souvisel, vrať hodnotu null nebo prázdný řetězec "".
   - **PŘÍSNÝ ZÁKAZ HALUCINACÍ:** Nikdy nevymýšlej nové projekty! Pokud projekt není v seznamu, nepřiřazuj ho.

3. **suggestedTags (Navržené tagy):**
   - Navrhni **1 až 3** nejrelevantnější štítky.
   - **Zlaté pravidlo:** Vždy prioritně vybírej ze seznamu dostupných tagů (case-insensitive porovnání).
   - Pouze v případě, že žádný z dostupných tagů ani vzdáleně neodpovídá a nový tag by přinesl extrémní hodnotu, navrhni **maximálně jeden nový tag**.
   - Pro nový tag platí extrémně přísná typografická omezení: pouze malá písmena, jednoslovný, bez diakritiky, bez mezer a bez speciálních znaků (např. "marketing", "copywriting", "finance", "dev", "design").

4. **timeEstimate (Časový odhad):**
   - Odhadni čistý čas potřebný pro vykonání celého úkolu.
   - **Bojuj s plánovacím optimismem (Planning Fallacy):** Lidé mají tendenci čas podhodnocovat. Přidej rozumný časový pufr (cca 20-30 %) pro nečekané komplikace, otestování a začištění.
   - Hodnota musí být striktně vybrána z tohoto výčtu: "15 min", "30 min", "1 hod", "2 hod", "půl dne", "celý den".
     - Drobná korektura, rychlý e-mail -> "15 min" / "30 min"
     - Běžná soustředěná práce -> "1 hod" / "2 hod"
     - Komplexní blok úkolů, hluboká práce -> "půl dne"
     - Velký, celodenní balík prací -> "celý den"

5. **subtasks (Chronologický životní cyklus - krok za krokem):**
   - Vygeneruj přesně **3 až 6 konkrétních, akčních a atomických podúkolů** (subtasks).
   - Tyto podúkoly musí být seřazeny v naprosto striktní chronologické posloupnosti a pokrývat kompletní životní cyklus úspěšného doručení úkolu:
     - **Fáze 1: Příprava a analýza (Preparation & Research)** (1-2 podúkoly) - např. shromáždit podklady, provést rešerši, prostudovat dokumentaci, definovat požadavky.
     - **Fáze 2: Exekuce a tvorba (Execution & Creation)** (1-2 podúkoly) - např. vypracovat první koncept, napsat zdrojový kód, sestavit návrh smlouvy, naformátovat data.
     - **Fáze 3: Validace, QA a doručení (Validation, QA & Handover)** (1-2 podúkoly) - např. zkontrolovat gramatiku, otestovat funkčnost na reálných datech, odeslat ke schválení, archivovat podklady.
   - Každý podúkol must začínat silným, specifickým slovesem v infinitivu a mít **maximálně 80 znaků**. Zákaz neurčitých slov jako "udělat" i v podúkolech!`;

    let rawText = "";
    let success = false;
    let errorDetails = "";

    const apiKey = Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY");
    if (apiKey) {
      try {
        console.log("gemini-task-optimize: Pokouším se volat Google Gemini API (gemini-2.5-flash)...");
        const geminiResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
                responseSchema: GEMINI_RESPONSE_SCHEMA,
                temperature: 0.4,
                maxOutputTokens: 8192,
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
            errorDetails += "[Gemini: prázdná odpověď] ";
          }
        } else {
          const errText = await geminiResp.text();
          console.warn(`gemini-task-optimize: Gemini API vrátil chybu: ${geminiResp.status} ${errText.slice(0, 300)}`);
          errorDetails += `[Gemini chybný status ${geminiResp.status}: ${errText.slice(0, 150)}] `;
        }
      } catch (e: any) {
        console.warn("gemini-task-optimize: Selhalo volání Google Gemini API:", e);
        errorDetails += `[Gemini výjimka: ${e?.message || String(e)}] `;
      }
    } else {
      console.warn("gemini-task-optimize: Chybí GOOGLE_GENERATIVE_AI_API_KEY, zkouším rovnou zálohu (Claude).");
      errorDetails += "[Gemini: chybí API klíč] ";
    }

    // Fallback na Claude, pokud Gemini selhalo nebo nebylo úspěšné
    if (!success) {
      const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
      if (!anthropicKey) {
        console.error("gemini-task-optimize: Chybí GOOGLE_GENERATIVE_AI_API_KEY i ANTHROPIC_API_KEY");
        return new Response(
          JSON.stringify({ error: `AI není dostupné. Detaily chyb: ${errorDetails} + [Claude: chybí API klíč]` }),
          { status: 200, headers: CORS }
        );
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

      try {
        const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-3-5-haiku-20241022",
            max_tokens: 800,
            system: claudeSystem,
            messages: [{ role: "user", content: claudePrompt }],
          }),
        });

        if (!claudeResp.ok) {
          const errText = await claudeResp.text();
          console.error("gemini-task-optimize: Claude API error:", errText);
          errorDetails += `[Claude chybný status ${claudeResp.status}: ${errText.slice(0, 150)}]`;
          return new Response(
            JSON.stringify({ error: `AI služba nedostupná. Detaily chyb: ${errorDetails}` }),
            { status: 200, headers: CORS }
          );
        }

        const claudeData = await claudeResp.json();
        rawText = claudeData.content?.[0]?.text?.trim() ?? "";
        console.log("gemini-task-optimize: Anthropic Claude úspěšně vrátil záložní odpověď.");
      } catch (claudeError: any) {
        console.error("gemini-task-optimize: Claude API výjimka:", claudeError);
        errorDetails += `[Claude výjimka: ${claudeError?.message || String(claudeError)}]`;
        return new Response(
          JSON.stringify({ error: `AI služba nedostupná. Detaily chyb: ${errorDetails}` }),
          { status: 200, headers: CORS }
        );
      }
    }

    // Odstranění případných markdown bloků \`\`\`json, pokud by je Claude přesto přidal
    let cleanedText = rawText.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "").trim();
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanedText);
    } catch (parseErr: any) {
      console.error("gemini-task-optimize: JSON parse error:", cleanedText);
      return new Response(
        JSON.stringify({ error: `AI vrátila neplatný JSON formát. Text: "${cleanedText}". Detaily chyb: ${errorDetails}` }),
        { status: 200, headers: CORS }
      );
    }

    const validated = TaskOptimizationSchema.safeParse(parsed);
    if (!validated.success) {
      console.error("gemini-task-optimize: Zod validation error:", JSON.stringify(validated.error.flatten()));
      console.error("gemini-task-optimize: raw parsed data:", JSON.stringify(parsed));
      return new Response(
        JSON.stringify({ error: `AI vrátila neočekávanou strukturu dat. Detaily chyb: ${errorDetails}` }),
        { status: 200, headers: CORS }
      );
    }

    return new Response(
      JSON.stringify({
        result: validated.data,
        meta: {
          model: success ? "Gemini 2.5 Flash" : "Claude 3.5 Haiku",
        }
      }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("gemini-task-optimize: unhandled error:", e);
    return new Response(
      JSON.stringify({ error: `Interní chyba serveru: ${e?.message || String(e)}` }),
      { status: 200, headers: CORS }
    );
  }
});
