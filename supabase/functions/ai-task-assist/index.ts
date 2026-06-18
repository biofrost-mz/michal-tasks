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
      console.error("ai-task-assist auth error:", authErr);
      return new Response(JSON.stringify({ error: `Unauthorized: ${authErr?.message || "User not found"}` }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded — max ${RATE_LIMIT_MAX} AI calls per hour.` }),
        { status: 429, headers: { ...CORS, "Retry-After": "3600", "Content-Type": "application/json" } }
      );
    }

    let body, action, task, note, availableTags;
    try {
      body = await req.json();
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

    let aiPrompt = "";

    if (action === "subtasks") {
      aiPrompt = `Úkol: "${task.title}"${task.description ? `\nPopis: ${task.description}` : ""}

Navrhni 3–6 konkrétních, akčních podúkolů (subtasks) v češtině. Podúkoly musí pokrývat kompletní dokončení úkolu a být chronologicky seřazeny (od přípravy podkladů po finální odevzdání/kontrolu). Každý podúkol začni silným slovesem a omez na max 80 znaků.
Vrať POUZE JSON pole stringů, žádný jiný text ani markdown.
Příklad: ["Sběr potřebných podkladů", "Realizace první verze návrhu", "Interní revize a úprava chyb", "Odeslání hotového díla ke schválení"]`;

    } else if (action === "tags") {
      const existing = availableTags?.length
        ? `Existující tagy v aplikaci: ${availableTags.join(", ")}`
        : "Zatím žádné tagy v aplikaci.";
      aiPrompt = `Úkol: "${task.title}"${task.description ? `\nPopis: ${task.description}` : ""}
${existing}

Navrhni 1–3 nejrelevantnější štítky (tags) v češtině pro tento úkol. Striktně preferuj stávající tagy, pokud tematicky odpovídají. Nové tagy navrhuj pouze v případě, že žádný z existujících neodpovídá (používej malá písmena, jednoslovné, bez mezer).
Vrať POUZE JSON pole stringů.
Příklad: ["design", "marketing", "vyvoj"]`;

    } else if (action === "description") {
      aiPrompt = `Název úkolu: "${task.title}"

Napiš pro tento úkol profesionální, strukturovaný a přehledný popis ve formátu Markdown v češtině. Popis strukturuj takto:

## 🎯 Cíl (Objective)
(Stručné a jasné vyjádření, čeho má být tímto úkolem dosaženo a jaký je očekávaný výsledek.)

## 🔑 Klíčové parametry (Key Results)
- **Kritérium 1**: Co přesně musí být splněno, aby byl úkol považován za úspěšný.
- **Kritérium 2**: Konkrétní kvalita nebo vlastnost výstupu.

## 👣 První akční krok (Next Step)
- [ ] Co je potřeba udělat jako úplně první krok k nastartování práce.

Vrať POUZE vygenerovaný formátovaný text popisu, bez jakýchkoli dalších úvodních či závěrečných keců a bez zpětných uvozovek.`;

    } else if (action === "priority") {
      aiPrompt = `Úkol: "${task.title}"${task.description ? `\nPopis: ${task.description}` : ""}${task.dueDate ? `\nTermín: ${task.dueDate}` : ""}

Zhodnoť závažnost a naléhavost tohoto úkolu z hlediska prioritizace (low = nízká, medium = střední, high = vysoká). Projdi termín dokončení, název i popis a proveď hlubší úvahu nad důležitostí.
Vrať POUZE JSON objekt s klíči "priority" a "reason" v češtině (reason musí být max 1 výstižná věta):
{"priority":"low"|"medium"|"high","reason":"zdůvodnění priority na základě termínu nebo složitosti úkolu"}`;

    } else if (action === "note_summary") {
      aiPrompt = `Zanalyzuj a shrň tuto poznámku. Napiš vysoce profesionální, reprezentativní a výstižné shrnutí v češtině (2–3 věty).
Shrnutí napiš jako souvislý text, který popíše hlavní myšlenku, kontext a klíčové závěry poznámky. Vrať POUZE text shrnutí.

Název poznámky: ${note.title || "Bez názvu"}
Obsah:
${(note.content || "").slice(0, 4000)}`;

    } else if (action === "note_continue") {
      aiPrompt = `Pokračuj přirozeně a s vysokou odborností v psaní této poznámky v češtině. Navázej na poslední myšlenku a přidej 1–2 logicky propracované odstavce ve stejném stylu, formátování a tónu.
Vrať POUZE nový navazující text ve formátu Markdown (neopakuj stávající text poznámky a nepiš žádné komentáře).

Název poznámky: ${note.title || "Bez názvu"}
Obsah:
${(note.content || "").slice(-2000)}`;

    } else if (action === "note_summary_bullet") {
      aiPrompt = `Převeď obsah této poznámky do přehledných, stručných a strukturovaných odrážek (bullet-points) v češtině. Odrážky musí vystihovat nejdůležitější fakta, rozhodnutí nebo úkoly z poznámky. Použij standardní odrážky (pomlčky nebo tečky) a tučné písmo pro zvýraznění klíčových pojmů. Vrať POUZE naformátovaný text s odrážkami, bez jakýchkoli komentářů.

Název poznámky: ${note.title || "Bez názvu"}
Obsah:
${(note.content || "").slice(0, 4000)}`;

    } else if (action === "note_fix_tone") {
      aiPrompt = `Oprav v této poznámce veškeré gramatické, pravopisné, typografické a stylistické chyby. Přepiš text do vysoce kultivované, čtivé, spisovné a profesionální češtiny (uprav slovní zásobu a strukturu vět k lepšímu), aniž bys změnil původní věcný význam a myšlenky. Ponech strukturu Markdown (nadpisy, odrážky), pokud je v poznámce přítomna.
Vrať POUZE kompletní upravený a opravený text poznámky, bez jakýchkoli vysvětlivek, uvozovek, poznámek pod čarou nebo komentářů okolo.

Název poznámky: ${note.title || "Bez názvu"}
Obsah:
${(note.content || "").slice(0, 4000)}`;

    } else if (action === "note_extract_tasks") {
      aiPrompt = `Zanalyzuj obsah této poznámky a vytáhni z ní všechny konkrétní akční kroky, úkoly nebo sliby k vyřízení. Každý úkol formuluj v češtině jako akční větu začínající slovesem (max 80 znaků).
Vrať POUZE JSON pole stringů, žádný jiný text. Pokud v poznámce nejsou žádné akční úkoly, vrať prázdné pole [].
Příklad: ["Zavolat klientovi ohledně zpětné vazby k návrhu", "Připravit finální prezentaci do páteční porady"]

Název poznámky: ${note.title || "Bez názvu"}
Obsah:
${(note.content || "").slice(0, 4000)}`;

    } else if (action === "draft_task") {
      const text = body?.text || "";
      const len = body?.length || "short";
      const todayDate = body?.todayDate || new Date().toISOString().slice(0, 10);
      const projNames = body?.availableProjects || [];
      const tagNames = body?.availableTags || [];

      const projectList = projNames.length ? `Dostupné projekty: ${projNames.join(", ")}` : "Žádné projekty.";
      const tagList = tagNames.length ? `Dostupné tagy: ${tagNames.join(", ")}` : "Žádné tagy.";

      aiPrompt = `Zanalyzuj následující text a vytvoř z něj strukturovaný návrh úkolu.
Text od uživatele: "${text}"

Parametry výstupu:
1. title: Krátký, výstižný a akční název úkolu v češtině (začínající slovesem).
2. description: Popis úkolu v češtině. Pokud je délka nastavení (length) "${len}" rovna "short", vygeneruj stručný popis (1-2 věty). Pokud je rovna "long", vygeneruj detailnější, strukturovaný popis s odrážkami (Markdown).
3. suggestedProject: Pokud text zmiňuje nebo odpovídá některému z dostupných projektů, vyber jeho přesné jméno ze seznamu. Pokud žádný neodpovídá, vrať prázdný řetězec "".
   ${projectList}
4. suggestedTags: Vyber nejrelevantnější tagy ze seznamu dostupných tagů, které odpovídají obsahu textu. Pokud žádný neodpovídá, vrať prázdné pole [].
   ${tagList}
5. priority: Vyhodnoť prioritu ("high" | "medium" | "low"). Pokud je v textu zmíněna naléhavost nebo spěch, nastav "high" nebo "medium", jinak "low" nebo "medium".
6. dueDate: Pokud je v textu explicitně nebo implicitně zmíněn termín splnění (např. "do zítra", "v pondělí", "příští týden", "do konce června"), převeď ho na konkrétní datum ve formátu YYYY-MM-DD. Dnešní datum je: ${todayDate}. Pokud termín není zmíněn, vrať prázdný řetězec "".

Vrať POUZE JSON objekt s následující strukturou (nic jiného, žádné markdown značky jako \`\`\`json):
{
  "title": "Název úkolu",
  "description": "Stručný nebo detailní popis",
  "suggestedProject": "přesný název projektu nebo prázdný řetězec",
  "suggestedTags": ["tag1", "tag2"],
  "priority": "high"|"medium"|"low",
  "dueDate": "YYYY-MM-DD" nebo prázdný řetězec
}`;

    } else {
      return new Response(JSON.stringify({ error: "Unknown action" }), { status: 200, headers: CORS });
    }

    let raw = "";
    let success = false;
    let errorDetails = "";

    const apiKey = Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY");
    if (apiKey) {
      try {
        console.log(`ai-task-assist: Pokouším se volat Google Gemini API (gemini-3.5-flash) pro akci "${action}"...`);
        const isJsonAction = ["subtasks", "tags", "priority", "note_extract_tasks", "draft_task"].includes(action);
        
        const geminiResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "gemini-3.5-flash",
              contents: [{ role: "user", parts: [{ text: aiPrompt }] }],
              systemInstruction: {
                parts: [{ text: SYSTEM }]
              },
              generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 8192,
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
            messages: [{ role: "user", content: aiPrompt }],
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
      JSON.stringify({
        result: raw,
        meta: {
          model: success ? "Gemini 3.5 Flash" : "Claude 3.5 Haiku",
        }
      }),
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
