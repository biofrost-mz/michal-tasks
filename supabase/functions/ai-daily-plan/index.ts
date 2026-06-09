import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit: max 10 daily-plan generations per user per hour (heavy model call).
const RATE_LIMIT_MAX = 10;
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

const STATUS_LABELS: Record<string, string> = {
  todo: "To do",
  doing: "Rozpracováno",
  waiting: "Čekám",
  done: "Hotovo",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "🔴 Vysoká",
  medium: "🟡 Střední",
  low: "🟢 Nízká",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    // Auth — vyber user z JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ověř JWT přes Supabase
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      console.error("ai-daily-plan auth error:", authErr);
      return new Response(JSON.stringify({ error: `Invalid token: ${authErr?.message || "User not found"}` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parsuj tělo
    let workspaceId: string;
    try {
      const body = await req.json();
      workspaceId = body.workspaceId;
      if (!workspaceId) throw new Error("Missing workspaceId");
    } catch {
      return new Response(JSON.stringify({ error: "workspaceId required" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ověř, že user je členem workspace
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { count } = await db
      .from("workspace_members")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id);
    if (!count) {
      return new Response(JSON.stringify({ error: "Not a workspace member" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded — max ${RATE_LIMIT_MAX} daily plans per hour.` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "3600" } }
      );
    }

    // Načti data
    const [{ data: tasks }, { data: projects }] = await Promise.all([
      db.from("tasks")
        .select("title, description, status, priority, due_date, project_id, starred")
        .eq("workspace_id", workspaceId)
        .neq("status", "done")
        .order("due_date", { ascending: true, nullsFirst: false }),
      db.from("projects")
        .select("id, name, status")
        .eq("workspace_id", workspaceId)
        .eq("status", "active"),
    ]);

    const projMap: Record<string, string> = {};
    (projects ?? []).forEach((p: { id: string; name: string }) => { projMap[p.id] = p.name; });

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const dateLabel = today.toLocaleString("cs-CZ", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    const taskList = (tasks ?? []).map((t: Record<string, string | boolean | null>) => {
      const proj = t.project_id ? projMap[t.project_id as string] : null;
      const dueDate = t.due_date as string | null;
      let dueMark = "";
      if (dueDate) {
        if (dueDate < todayStr) dueMark = " ⚠️ PROŠLÝ TERMÍN";
        else if (dueDate === todayStr) dueMark = " 📅 TERMÍN DNES";
        else dueMark = ` (termín ${dueDate})`;
      }
      const priority = t.priority ? PRIORITY_LABELS[t.priority as string] || "" : "";
      const status = STATUS_LABELS[t.status as string] || t.status;
      const star = t.starred ? " ⭐" : "";
      const projLabel = proj ? ` [${proj}]` : "";
      return `- ${t.title}${star}${projLabel} | ${status}${priority ? ` | ${priority}` : ""}${dueMark}`;
    }).join("\n");

    if (!taskList) {
      return new Response(
        JSON.stringify({ plan: "## ✨ Žádné aktivní úkoly\n\nNemáš žádné aktivní úkoly. Uži si volný čas nebo přidej nové!", generatedAt: new Date().toISOString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Jsi špičkový executive mentor, elitní osobní kouč produktivity a přední expert na metodologii GTD (Getting Things Done), atomové návyky (Atomic Habits) a nekompromisní osobní efektivitu (Cal Newport's Deep Work).
Odpovídáš výhradně v češtině. Tvůj tón je vysoce profesionální, charismatický, energický, přímočarý, pragmatický, intelektuálně stimulující a hluboce motivující.
Nepoužíváš žádný prázdný balast, klišé, otřepané korporátní fráze ani zdvořilostní omáčky typu "Zde je tvůj plán".
Pomáháš uživateli přetavit nepřehledný chaos úkolů v naprosto čistou, krystalicky jasnou, realistickou a nekompromisně realizovatelnou denní strategii.
Působíš jako neúprosný, ale chápavý parťák (Accountability Partner), který dohlíží na to, aby se uživatel nepřetěžoval (respektování WIP limitů), ale zároveň dnes doručil ty nejdůležitější výsledky s největším pákovým efektem (high leverage).`;

    const userPrompt = `Dnes je ${dateLabel}. Aktuální systémový čas a datum: ${todayStr}.

Zde je kompletní seznam mých aktuálních aktivních úkolů z mého osobního workspace:
${taskList}

Zanalyzuj tento seznam a sestav mi vysoce efektivní, na míru šitý denní plán v češtině, který maximalizuje myšlenkový fokus a zredukuje kognitivní tření.

Strukturu odpovědi vygeneruj PŘESNĚ ve formátu Markdown s následujícími sekcemi (nevynechávej žádnou sekci, nepoužívej úvodní ani závěrečné pozdravy typu "Ahoj Michale, tady je...", začni přímo prvním nadpisem):

## 📊 Diagnostika kapacity a kognitivní zátěže (WIP Check)
- Posuď celkový počet aktivních úkolů a kognitivní zátěž. Pokud je aktivních úkolů více než 10, důrazně varuj před přemotivovaností, rizikem multitaskingu a syndromem vyhoření.
- Zhodnoť zastoupení prošlých termínů (⚠️), úkolů s vysokou prioritou (🔴) a rozpracovaných úkolů.
- Navrhni stručné, hluboké doporučení pro dnešní kapacitu (např. zda dnes "tlačit na pilu" nebo spíše stabilizovat a dokončovat rozpracované věci, tzv. "stop starting, start finishing").

## 🐸 Sněz tu žábu (Klíčový úkol dne)
- Vyber s absolutní nekompromisností **přesně JEDEN** nejdůležitější úkol z mého seznamu.
- **Pravidla výběru:** Upřednostni úkol označený hvězdičkou (⭐), následně s prošlým termínem (⚠️) nebo vysokou prioritou (🔴), který má největší dopad (leverage) na zbytek projektů.
- Uveď přesný název úkolu zvýrazněný tučně v uvozovkách (např. "**[Název úkolu]**").
- Napiš dvě věty: První věta jasně zdůvodní, proč je toto dnešní "žába" (přínos, eliminace úzkého hrdla), a druhá popíše, jaké obrovské mentální uvolnění a úlevu pocítím, až ji hned ráno v dopoledním bloku dokončím.

## 🔥 Kritické priority pro dnešní den
- Vyber **maximálně 2 další** kritické úkoly, které mají prošlý termín nebo termín dnes a musí se bezpodmínečně uzavřít. Pokud takové v seznamu nejsou, vyber úkoly, které nejvíce blokují další práci.
- Pro každý z těchto 2 úkolů napiš 1 vysoce akční a praktickou doporučující větu, jak k němu dnes přistoupit a co přesně vyřešit.

## 🎯 Navržené Focus Bloky (Časový harmonogram hluboké práce)
- Sestav realistický, biorytmy respektující časový harmonogram pro dnešní den (předpokládej standardní pracovní dobu od 9:00, celkem max 4 hodiny čisté Deep Work za den pro zachování mentální svěžesti).
- Harmonogram naformátuj přehledně jako odrážky s časovým rozmezím, délkou v minutách a konkrétním názvem úkolu v uvozovkách.
- **Struktura harmonogramu:**
  - **Dopolední Focus Blok (Deep Work, 90-120 min):** Vyhrazen striktně pro dnešní "žábu" (🐸). Žádné e-maily, žádné vyrušování, plná koncentrace.
  - **Administrativní okno (30-45 min):** Vyřízení drobných administrativních úkolů, štítků, rychlých reakcí a organizace.
  - **Odpolední Focus Blok (60-90 min):** Práce na kritických prioritách (🔥).
  - **Reflexe a úklid (15 min):** Uzavření rozdělaných věcí a příprava na zítřek.

## 💡 Co je dobré dnes posunout (Světlé body)
- Vyber **1 až 2 úkoly** s nižší prioritou (🟢, 🟡) nebo rozpracované věci, u kterých dnes stačí udělat i malý pokrok (např. posunout o 15-30 minut), aby se udrželo momentum a pokrok v projektech bez pocitu zahlcení.
- Ukaž mi, že i malé kroky vedou k velkým cílům.

## ✨ Záměr a motto pro dnešní den
- Vytvoř jedno unikátní, vysoce energické a hluboce personalizované motto pro dnešní den.
- Motto musí vzniknout syntézou témat mých dnešních úkolů (např. pokud mám hodně úkolů ohledně designu a psaní, motto bude o "tvořivé preciznosti", pokud o restech, tak o "čištění stolu"). Žádné generické citáty, ale originální, vysoce energické povzbuzení na míru.

Buď maximálně konkrétní — uváděj skutečné názvy úkolů z mého seznamu a provazuj je logicky dohromady. Nepiš žádné zbytečné úvodní ani závěrečné texty, začni rovnou prvním nadpisem.`;

    let plan = "";
    let success = false;
    let errorDetails = "";

    const apiKey = Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY");
    if (apiKey) {
      try {
        console.log("ai-daily-plan: Pokouším se volat Google Gemini API (gemini-3.5-flash)...");
        const geminiResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: userPrompt }] }],
              systemInstruction: {
                parts: [{ text: systemPrompt }]
              },
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192,
              },
            }),
          }
        );

        if (geminiResp.ok) {
          const geminiData = await geminiResp.json();
          const geminiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (geminiText) {
            plan = geminiText;
            success = true;
            console.log("ai-daily-plan: Google Gemini API úspěšně vrátil odpověď.");
          } else {
            console.warn("ai-daily-plan: Gemini vrátil prázdnou odpověď.");
            errorDetails += "[Gemini: prázdná odpověď] ";
          }
        } else {
          const errText = await geminiResp.text();
          console.warn(`ai-daily-plan: Gemini API vrátil chybu: ${geminiResp.status} ${errText.slice(0, 300)}`);
          errorDetails += `[Gemini chybný status ${geminiResp.status}: ${errText.slice(0, 150)}] `;
        }
      } catch (geminiError: any) {
        console.warn("ai-daily-plan: Selhalo volání Google Gemini API:", geminiError);
        errorDetails += `[Gemini výjimka: ${geminiError?.message || String(geminiError)}] `;
      }
    } else {
      console.warn("ai-daily-plan: Chybí GOOGLE_GENERATIVE_AI_API_KEY, zkouším rovnou zálohu (Claude).");
      errorDetails += "[Gemini: chybí API klíč] ";
    }

    // Fallback na Claude, pokud Gemini selhalo nebo nebylo úspěšné
    if (!success) {
      const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") || "";
      if (!anthropicKey) {
        console.error("ai-daily-plan: Chybí GOOGLE_GENERATIVE_AI_API_KEY i ANTHROPIC_API_KEY");
        return new Response(
          JSON.stringify({ error: `AI není dostupné. Detaily chyb: ${errorDetails} + [Claude: chybí API klíč]` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("ai-daily-plan: Spouštím záložní volání na Anthropic Claude...");
      try {
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
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
          }),
        });

        if (!claudeRes.ok) {
          const errText = await claudeRes.text();
          console.error("ai-daily-plan: Claude API error:", errText);
          errorDetails += `[Claude chybný status ${claudeRes.status}: ${errText.slice(0, 150)}]`;
          return new Response(
            JSON.stringify({ error: `AI není dostupné. Detaily chyb: ${errorDetails}` }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const claudeData = await claudeRes.json();
        plan = claudeData.content?.[0]?.text ?? "";
        console.log("ai-daily-plan: Anthropic Claude úspěšně vrátil záložní odpověď.");
      } catch (claudeError: any) {
        console.error("ai-daily-plan: Claude API výjimka:", claudeError);
        errorDetails += `[Claude výjimka: ${claudeError?.message || String(claudeError)}]`;
        return new Response(
          JSON.stringify({ error: `AI není dostupné. Detaily chyb: ${errorDetails}` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ plan, generatedAt: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (globalErr: any) {
    console.error("ai-daily-plan: unhandled error:", globalErr);
    return new Response(
      JSON.stringify({ error: `Interní chyba serveru: ${globalErr?.message || String(globalErr)}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
