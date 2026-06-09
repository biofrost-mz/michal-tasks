import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Jsi elitní AI asistent pro osobní produktivitu, kognitivní organizaci a agilní řízení úkolů.
Tvým posláním je pomáhat uživateli s precizní formulací, hlubokou analýzou, prioritizací a shrnováním úkolů či poznámek.
Komunikuj výhradně v bezchybné, profesionální a kultivované češtině. Postupuj metodicky a analyticky.
Pokud je vyžadován strukturovaný formát (JSON, Markdown), dbej na absolutní přesnost a čistotu syntaxe.`;

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

       if (action === "subtasks") {
      prompt = `Jsi elitní technický projektový koordinátor. Rozlož následující úkol na sekvenci 3 až 6 vysoce konkrétních, logicky na sebe navazujících podúkolů (subtasks), které v součtu garantují stoprocentní a bezchybnou realizaci celého úkolu.

Úkol: "${task.title}"
${task.description ? `Popis úkolu: ${task.description}` : "K úkolu není k dispozici žádný další popis."}

Pravidla pro tvorbu podúkolů:
1. **Chronologický postup (životní cyklus):** První podúkoly se musí týkat přípravy (sběr podkladů, rešerše), prostřední samotné implementace/realizace a poslední kontroly kvality, testování či předání.
2. **Akční názvy začínající silným českým slovesem v infinitivu:** Každý podúkol must začínat jasně definovanou aktivitou (např. "Analyzovat...", "Naformátovat...", "Zkonstruovat...", "Otestovat...", "Připravit...", "Sepsat...").
3. **PŘÍSNÝ ZÁKAZ slabých a nekonkrétních sloves:** Nikdy nepoužívej "udělat", "vyřešit", "nastavit", "pořešit", "jít na", "pracovat na".
4. **Rozsah:** Každý podúkol smí mít maximálně 80 znaků a musí být naprosto srozumitelný sám o sobě.
5. **Formát výstupu:** Vrať VÝHRADNĚ validní JSON pole řetězců (array of strings), bez jakéhokoliv doplňujícího textu, vysvětlení nebo Markdown uvozovek (\`\`\`json).

Příklad správného výstupu:
["Analyzovat stávající databázové schéma a najít slabá místa", "Navrhnout optimalizované indexy pro nejčastější dotazy", "Otestovat rychlost dotazů na testovacích datech", "Nasadit optimalizační skript na produkční prostředí"]`;

    } else if (action === "tags") {
      const existing = availableTags?.length
        ? `Dostupné štítky v systému: ${availableTags.map(t => `"${t}"`).join(", ")}`
        : "V systému zatím nejsou definovány žádné štítky.";
      prompt = `Jsi taxonomický AI specialista pro kategorizaci úkolů. Navrhni 1 až 3 nejvhodnější, vysoce relevantní štítky (tagy) pro následující úkol.

Úkol: "${task.title}"
${task.description ? `Popis úkolu: ${task.description}` : "K úkolu není k dispozici žádný další popis."}

${existing}

Pravidla pro výběr a tvorbu štítků:
1. **Striktní preference stávajících štítků:** Pokud se stávající štítky jakkoliv tematicky hodí k podstatě úkolu, vyber je přednostně.
2. **Standardy pro NOVÉ štítky:** Pokud je nutné vytvořit nový štítek (protože žádný ze stávajících vůbec nesouvisí), musí splňovat tato přísná technická kritéria:
   - Pouze malá písmena latinské abecedy (a-z).
   - **BEZ DIAKRITIKY** (např. "vyvoj" místo "vývoj", "marketing" místo "propagační", "analyza" místo "analýza").
   - Jednoslovný název, bez mezer, podtržítek či pomlček.
   - Vyhni se příliš obecným štítkům jako "ukol" nebo "prace". Štítek musí jasně reprezentovat doménu (např. "vyvoj", "design", "finance", "copy", "studium", "osobni", "organisace", "domov").
3. **Formát výstupu:** Vrať VÝHRADNĚ validní JSON pole řetězců (array of strings), bez jakéhokoliv doprovodného komentáře nebo Markdown uvozovek.

Příklad správného výstupu:
["vyvoj", "design"]`;

    } else if (action === "description") {
      prompt = `Jsi seniorní Business Analyst a technický spisovatel. Vytvoř pro následující úkol prémiový, vysoce strukturovaný a plně srozumitelný popis (description) ve formátu Markdown v bezchybné češtině.

Název úkolu: "${task.title}"
${task.description ? `Dosavadní hrubé poznámky/popis: ${task.description}` : "K úkolu nebyly zadány žádné doplňující podrobnosti."}

Popis musí mít přesně tuto luxusní strukturu a formátování:

## 🎯 Cíl (Objective)
*Napiš 1 až 2 věty formulující strategický význam úkolu, čeho přesně má být dosaženo a jaký přínos (hodnotu) to přinese po dokončení.*

## 🔑 Definice hotova (Definition of Done)
*Uveď 2 až 4 naprosto konkrétní, měřitelná a jednoznačně ověřitelná akceptační kritéria, která musí být stoprocentně splněna, aby mohl být úkol prohlášen za dokončený. Použij odrážky.*
- **Kritérium 1:** [Konkrétní technický či obsahový stav]
- **Kritérium 2:** [Standard kvality nebo způsob ověření]

## 📋 Předpoklady (Prerequisites)
*Uveď 1 až 2 body popisující, co je nezbytně nutné mít připraveno (přihlašovací údaje, podklady, hotové předchozí úkoly), aby bylo vůbec možné na tomto úkolu začít pracovat. Pokud nejsou žádné předpoklady potřeba, napiš "Nejsou vyžadovány žádné specifické předpoklady."*

## 👣 První akční krok (Immediate Next Step)
- [ ] *Zde navrhni jeden, naprosto konkrétní, přímočarý a mikro-akční první krok začínající silným slovesem, kterým může uživatel okamžitě odbourat prokrastinaci a začít pracovat.*

Důležité instrukce:
- Nepoužívej žádný doplňující text, úvodní pozdravy nebo závěrečná shrnutí.
- Začni přímo prvním nadpisem ## 🎯 Cíl (Objective).
- Nepoužívej na začátku ani na konci bloku zpětné uvozovky pro kód (\`\`\`).`;

    } else if (action === "priority") {
      const today = new Date().toISOString().slice(0, 10);
      prompt = `Jsi elitní Agile Scrum Master a expert na osobní efektivitu. Zhodnoť prioritu následujícího úkolu pomocí mentálního modelu Eisenhowerovy matice a RICE prioritizační metody.

Úkol: "${task.title}"
${task.description ? `Popis úkolu: ${task.description}` : "K úkolu není k dispozici žádný další popis."}
${task.dueDate ? `Termín splnění (due date): ${task.dueDate}` : "Úkol nemá stanovený termín splnění."}
Dnešní datum pro kontext naléhavosti: ${today}

Pravidla prioritizace:
1. **"high" (Vysoká):** Úkol je kritický pro pokračování projektu (blokující úkol), má blížící se nebo zmeškaný termín splnění, nebo představuje extrémní byznysovou či osobní hodnotu.
2. **"medium" (Střední):** Standardní realizace, úkol je důležitý, ale nemá bezprostředně kritický termín a jeho odložení o několik dní nezpůsobí vážné problémy.
3. **"low" (Nízká):** Drobnosti, refaktoringy, kosmetické úpravy, učení se doplňkových věcí, nebo úkoly bez termínu s nízkým dopadem na celkový výsledek.

Formát výstupu: Vrať VÝHRADNĚ platný JSON objekt s klíči "priority" a "reason" (důvod v češtině, maximálně 1 kognitivně brilantní věta vysvětlující logické opodstatnění této priority). Žádné Markdown uvozovky ani vysvětlující texty okolo.

Příklad výstupu:
{
  "priority": "high",
  "reason": "Vzhledem k blížícímu se termínu odevzdání a faktu, že tento úkol blokuje další fázi vývoje, je nezbytné jej prioritizovat s nejvyšší urgencí."
}`;

    } else if (action === "note_summary") {
      prompt = `Jsi elitní Chief of Staff a odborník na syntézu informací. Zanalyzuj obsah následující poznámky a vytvoř z ní vysoce profesionální, reprezentativní a precizní manažerské shrnutí (executive summary) v češtině.

Název poznámky: "${note.title || "Bez názvu"}"
Obsah poznámky:
${(note.content || "").slice(0, 4000)}

Požadavky na shrnutí:
1. **Délka a forma:** Přesně 2 až 4 stylisticky vytříbené věty v podobě souvislého, plynulého textu.
2. **Obsah:** Musí jasně formulovat hlavní cíl/myšlenku, širší kontext a klíčové závěry či rozhodnutí obsažená v poznámce.
3. **Tón:** Formální, objektivní, exekutivní a bezvýhradně profesionální.
4. **Omezení:** Vrať POUZE naformátovaný text samotného shrnutí. Nepřidávej žádné nadpisy, úvodní fráze (např. "Zde je shrnutí..."), zpětné uvozovky ani závěrečné komentáře.`;

    } else if (action === "note_continue") {
      prompt = `Jsi spoluautor a myšlenkový partner uživatele. Tvým úkolem je s nejvyšší možnou mírou kontinuity pokračovat v psaní rozpracované poznámky v češtině.

Název poznámky: "${note.title || "Bez názvu"}"
Dosavadní závěr poznámky (posledních 2000 znaků pro kontext):
${(note.content || "").slice(-2000)}

Pokyny pro generování pokračování:
1. **Hluboká analýza stylu:** Pečlivě zanalyzuj tón hlasu (tone of voice), slovní zásobu, úroveň odbornosti, délku vět a formátování (Markdown, odrážky, nadpisy) dosavadního textu. Pokračování musí působit, jako by ho psal tentýž autor v jednom zátahu.
2. **Obsahový přínos:** Navázej na poslední vyjádřenou myšlenku. Přidej přesně 1 až 2 logicky propracované odstavce, které téma prohloubí, přinesou věcné argumenty, konkrétní příklady nebo praktické vyústění.
3. **Formátování:** Pokud autor používá specifické formátování (např. odrážky nebo zvýrazňování), pokračuj v tom.
4. **Omezení:** Vrať POUZE nový navazující text (nepřidávej žádný úvod, neopakuj stávající text poznámky a nepiš žádné meta-komentáře).`;

    } else if (action === "note_summary_bullet") {
      prompt = `Jsi špičkový analytik. Převeď obsah následující poznámky do strukturovaného, vizuálně dokonale přehledného a srozumitelného přehledu klíčových bodů (bullet-points) v češtině.

Název poznámky: "${note.title || "Bez názvu"}"
Obsah poznámky:
${(note.content || "").slice(0, 4000)}

Pravidla pro strukturování odrážek:
1. **Tematické seskupení:** Rozděl klíčové body do 2 až 3 logických kategorií (např. **💡 Hlavní myšlenky & Rozhodnutí**, **📌 Klíčová fakta & Kontext**, **⚡ Akční kroky**).
2. **Styl odrážek:** Každý bod must začínat standardní odrážkou (-), mít maximálně 2 věty, být úderný a začínat tučným zvýrazněním klíčového pojmu (např. "- **Finální deadline:** Termín spuštění byl stanoven na...").
3. **Přísná selekce:** Ignoruj omáčku a balast. Vypiš pouze esenciální informace s vysokou informační hodnotou.
4. **Omezení:** Vrať POUZE naformátovaný Markdown text s odrážkami. Nepřidávej žádné úvodní řeči ani závěrečné poznámky.`;

    } else if (action === "note_fix_tone") {
      prompt = `Jsi elitní korektor, šéfredaktor a mistr české stylistiky. Tvým úkolem je vzít text poznámky a převést jej do naprosto bezchybné, stylisticky vytříbené, čtivé a reprezentativní formy v češtině.

Název poznámky: "${note.title || "Bez názvu"}"
Původní text poznámky:
${(note.content || "").slice(0, 4000)}

Korektorské a stylistické pokyny:
1. **Gramatika a pravopis:** Odstraň veškeré pravopisné chyby, překlepy, nesprávné shody přísudku s podmětem a špatnou interpunkci.
2. **Pokročilá typografie:** Oprav uvozovky na české (style „ “), nahraď spojovníky (-) patřičnými pomlčkami (–) s mezerami tam, kde jde o pomlčku ve větě, a doplň nezlomitelné mezery za jednopísmenné předložky (v, k, s, o, u, z).
3. **Stylistický upgrade:** Zvyš úroveň slovní zásoby. Odstraň hovorové výrazy, slovní vatu, zbytečné opakování slov a těžkopádné formulace. Věty přeformuluj tak, aby text plynul hladce a zněl elegantně a profesionálně, ale **STRIKTNĚ PONECH původní věcný význam a myšlenky autora**.
4. **Zachování struktury:** Kompletně zachovej veškeré Markdown prvky (nadpisy, odrážky, tučné písmo, tabulky, kód).
5. **Omezení:** Vrať POUZE kompletní upravený a opravený text poznámky. Nepřidávej žádné vysvětlivky, přehledy provedených oprav, uvozující texty ani komentáře.`;

    } else if (action === "note_extract_tasks") {
      prompt = `Jsi agilní produktový analytik. Prohledej obsah následující poznámky a extrahuj z ní veškeré explicitní i implicitní akční úkoly, závazky, sliby nebo další kroky (follow-ups), které z textu vyplývají.

Název poznámky: "${note.title || "Bez názvu"}"
Obsah poznámky:
${(note.content || "").slice(0, 4000)}

Pokyny pro formulaci úkolů:
1. **Akčnost a struktura:** Každý extrahovaný úkol must začínat silným, konkrétním českým slovesem v infinitivu (např. "Odeslat...", "Prověřit...", "Zavolat...", "Zpracovat...").
2. **Zákaz slabých sloves:** Vyhni se obecným slovům jako "vyřešit", "udělat", "zajistit". Úkol must jasně popisovat fyzickou či mentální aktivitu.
3. **Délka:** Maximálně 80 znaků na úkol. Úkol must být věcný a srozumitelný sám o sobě.
4. **Žádné úkoly:** Pokud v textu nejsou vůbec žádné akční úkoly, vrať prázdné pole [].
5. **Formát výstupu:** Vrať VÝHRADNĚ validní JSON pole řetězců (array of strings), bez jakéhokoliv doprovodného textu nebo Markdown uvozovek.

Příklad správného výstupu:
["Zavolat klientovi ohledně schválení rozpočtu", "Přeformátovat tabulku s daty do CSV", "Odeslat zápis z meetingu všem účastníkům"]`;

    } else if (action === "draft_task") {
      const text = body?.text || "";
      const len = body?.length || "short";
      const todayDate = body?.todayDate || new Date().toISOString().slice(0, 10);
      const projNames = body?.availableProjects || [];
      const tagNames = body?.availableTags || [];

      const projectList = projNames.length ? `Seznam dostupných projektů: ${projNames.map(p => `"${p}"`).join(", ")}` : "Nejsou k dispozici žádné projekty.";
      const tagList = tagNames.length ? `Seznam dostupných štítků (tagů): ${tagNames.map(t => `"${t}"`).join(", ")}` : "Nejsou k dispozici žádné štítky.";

      prompt = `Jsi pokročilý kognitivní parser přirozeného jazyka a AI projektový asistent. Zanalyzuj následující textový vstup od uživatele (může se jednad o rychlou textovou poznámku nebo přepis hlasového diktátu) a extrahuj z něj strukturovaný návrh úkolu v češtině.

Text od uživatele: "${text}"
Dnešní datum (pro výpočet relativních termínů): ${todayDate}

Pokyny pro zpracování jednotlivých parametrů:
1. **title (Název úkolu):** Výstižný, úderný a akční název úkolu v češtině, který začíná silným slovesem v infinitivu (např. "Připravit...", "Zkontrolovat...", "Vyčistit..."). Max 80 znaků.
2. **description (Popis úkolu):** Popis úkolu v češtině.
   - Pokud je délka (length) nastavena na "short" (krátká), vytvoř výstižný popis o délce přesně 1 až 2 věty.
   - Pokud je délka nastavena na "long" (dlouhá), vytvoř detailní, strukturovaný a profesionální popis ve formátu Markdown s jasně oddělenými sekcemi (🎯 Cíl, 🔑 Kritéria úspěchu, 👣 První krok).
3. **suggestedProject (Doporučený projekt):** Porovnej uživatelský text se seznamem dostupných projektů. Pokud text explicitně nebo silně implicitně odkazuje na některý z nich, uveď jeho PŘESNÝ název ze seznamu. Pokud žádný neodpovídá, vrať "".
   ${projectList}
4. **suggestedTags (Doporučené štítky):** Vyber nejrelevantnější štítky ze seznamu dostupných štítků, které odpovídají obsahu textu. Pokud žádný neodpovídá, vrať prázdné pole [].
   ${tagList}
5. **priority (Priorita):** Vyhodnoť prioritu ("high" | "medium" | "low"). Pokud uživatel zmiňuje spěch, asapu, hoření termínu nebo vysokou důležitost, nastav "high". Pokud jde o běžnou věc, nastav "medium". Pokud jde o drobnou, nezávaznou aktivitu, nastav "low".
6. **dueDate (Termín splnění):** Pokud uživatel v textu zmiňuje termín (např. "do zítra", "v pondělí", "příští úterý", "do konce příštího týdne", "za 3 dny"), proveď matematicky přesný výpočet na základě dnešního data (${todayDate}) a převeď jej na formát YYYY-MM-DD. Pokud termín není zmíněn, vrať "".

Vrať VÝHRADNĚ platný JSON objekt s následující strukturou (bez jakýchkoliv doplňících komentářů nebo Markdown značek):
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
              contents: [{ role: "user", parts: [{ text: prompt }] }],
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
