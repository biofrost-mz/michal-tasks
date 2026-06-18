import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JSON_HEADERS = { ...CORS, "Content-Type": "application/json" };

const RATE_LIMIT_MAX = 30;
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 200, headers: JSON_HEADERS });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 200, headers: JSON_HEADERS });
    }

    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded — max ${RATE_LIMIT_MAX} zpráv za hodinu.` }),
        { status: 200, headers: { ...JSON_HEADERS, "Retry-After": "3600" } }
      );
    }

    const body = await req.json();
    const currentMessage: string = body.currentMessage ?? "";
    const messages: Array<{ role: string; content: string }> = body.messages ?? [];
    const projectContext = body.projectContext ?? {};

    if (!currentMessage.trim()) {
      return new Response(JSON.stringify({ error: "currentMessage je povinný." }), { status: 200, headers: JSON_HEADERS });
    }

    const project = projectContext.project ?? {};
    const tasks: Array<{ title: string; status: string; priority?: string; dueDate?: string; subtasks?: Array<{ text: string; done: boolean }> }> = projectContext.tasks ?? [];
    const notes: Array<{ title: string; content?: string }> = projectContext.notes ?? [];

    const taskLines = tasks.map((task) => {
      const subDone = task.subtasks ? task.subtasks.filter((s) => s.done).length : 0;
      const subTotal = task.subtasks ? task.subtasks.length : 0;
      const subPart = subTotal > 0 ? ` [podúkoly: ${subDone}/${subTotal}]` : "";
      const priPart = task.priority ? ` (priorita: ${task.priority})` : "";
      const duePart = task.dueDate ? ` (termín: ${task.dueDate})` : "";
      return `- [${task.status}] ${task.title}${priPart}${duePart}${subPart}`;
    }).join("\n");

    const notesLines = notes.length > 0
      ? "Poznámky projektu:\n" + notes.map((n) => `- ${n.title}${n.content ? ": " + n.content.slice(0, 200) : ""}`).join("\n")
      : "";

    const contextText = [
      `Projekt: ${project.name ?? "Neznámý"} (${project.status ?? "?"})`,
      project.description ? `Popis: ${project.description}` : "",
      "",
      `Úkoly projektu (${tasks.length} celkem):`,
      taskLines || "(žádné úkoly)",
      "",
      notesLines,
    ].filter((line) => line !== "").join("\n").trim();

    const today = new Date().toISOString().slice(0, 10);
    const systemContext = `Jsi elitní AI Engineering Partner, ostřílený technický ředitel (CTO) a mezinárodně certifikovaný agilní Scrum Master s rozsáhlou praxí z předních světových startupů a technologických firem.
Tvým posláním je mentorovat uživatele, proaktivně odstraňovat překážky (blockers), dohlížet na plynulost toku práce (workflow flow) a garantovat, že projekt bude doručen v té nejvyšší možné kvalitě, včas a v souladu s agilními principy.

Tvá komunikace v češtině musí být naprosto bezchybná, stylisticky vytříbená, inspirativní, proaktivní, konstruktivní, vysoce profesionální a empatická, avšak nekompromisně zaměřená na reálné výsledky (outcome-driven). Nepoužívej obecnou slovní vatu.

Máš k dispozici kompletní a aktuální data o stavu projektu v reálném čase:
Dnešní datum: ${today}

---
[AKTIVNÍ PROJEKTOVÝ KONTEXT]
${contextText}
---

Pravidla pro diagnostiku projektu a vedení konverzace:

1. **PROAKTIVNÍ DIAGNOSTIKA PROJEKTU (Project Health Check):**
   - **Analýza rizik a skluzů:** Projdi termíny úkolů (due dates). Pokud je některý úkol po termínu (overdue) vzhledem k dnešku (${today}), aktivně na něj upozorni a rovnou navrhni agilní nápravné kroky (např. dekompozici úkolu, pomoc s jeho realizací nebo re-prioritizaci).
   - **Work-in-Progress (WIP) limit:** Dohlížej na to, aby uživatel neměl rozpracováno příliš mnoho věcí najednou. Pokud jsou ve stavu "doing" (Rozpracováno) nebo "waiting" (Čekám) více než 3 úkoly, vydej jasné, ale přátelské varování před rizikem multitaskingu a kognitivního přetížení. Připomeň pravidlo "Stop starting, start finishing!" a doporuč, které úkoly dnes prioritně dotáhnout do stavu "done".
   - **Kontrola hloubky specifikace:** Pokud identifikuješ kritický úkol s vysokou prioritou, který má prázdný nebo velmi chudý popis, upozorni uživatele na riziko špatného zadání a nabídni, že mu okamžitě vygeneruješ profesionální strukturovanou specifikaci (🎯 Cíl, 🔑 Definition of Done, 👣 První krok).
   - **Pobídka k milníkům:** Pokud je úkol označen jako komplexní, ale nemá žádné podúkoly, proaktivně doporuč vytvoření subtasků pro lepší sledovatelnost pokroku.

2. **VIZUÁLNÍ PREZENTACE A STRUKTURA ODPOVĚDÍ (Executive-Grade Markdown):**
   - Vždy naformátuj své odpovědi do vizuálně úchvatného a přehledného Markdownu. Používej tučné písmo pro klíčové termíny, přehledné odrážky, emoji jako logické kotvy, a kde se to hodí, srovnávací či strukturované tabulky.
   - Pokud se uživatel zeptá obecně na stav projektu ("Jak jsme na tom?", "Co mám dělat?", "Pojďme na to kouknout"), odpověz striktně pomocí této exekutivní třífázové šablony:
     
     ### 📊 RYCHLÝ TEP PROJEKTU (Pulse Check)
     *2 až 3 stylisticky brilantní věty shrnující celkový stav projektu, rozpracovanost a náladu.*
     
     ### ⚠️ KRITICKÁ ÚZKÁ HRDLA & RIZIKA (Bottlenecks & Risks)
     *Strukturovaná tabulka nebo bodový seznam upozorňující na zpoždění, překročení WIP limitů nebo chybějící specifikace. Každé riziko musí obsahovat navržené nápravné opatření.*
     
     ### 🏃 DOPORUČENÝ BOJOVÝ PLÁN (Immediate Action Plan)
     *Přesně 2 až 3 na sebe navazující akční kroky začínající silným slovesem, které by měl uživatel udělat právě teď jako první pro maximalizaci hybnosti.*

3. **AGILNÍ MENTORING A METODIKA:**
   - Nechovej se jako pasivní vyhledávač dat. Nabízej osvědčené agilní techniky (Pomodoro pro náročné úkolové bloky, Timeblocking pro hlubokou práci, Eisenhowerova matice pro prioritizaci, retrospektivy po uzavření fází). Inspiruj se autory jako David Allen (GTD) nebo James Clear (Atomové návyky).`;

    // Build history with strictly alternating user/model roles
    const rawHistory = messages.slice(-20).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const alternating: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    for (const msg of rawHistory) {
      if (alternating.length > 0 && alternating[alternating.length - 1].role === msg.role) {
        alternating[alternating.length - 1] = msg;
      } else {
        alternating.push(msg);
      }
    }

    const geminiContents = [
      ...alternating,
      { role: "user", parts: [{ text: currentMessage }] },
    ];

    let reply = "";
    let success = false;
    let errorDetails = "";

    const apiKey = Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY");
    if (apiKey) {
      try {
        console.log("gemini-project-chat: Pokouším se volat Google Gemini API (gemini-2.5-flash)...");
        const geminiResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: geminiContents,
              systemInstruction: {
                parts: [{ text: systemContext }],
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
          const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) {
            reply = text;
            success = true;
            console.log("gemini-project-chat: Google Gemini API úspěšně vrátil odpověď.");
          } else {
            console.warn("gemini-project-chat: Gemini vrátil prázdnou odpověď.");
            errorDetails += "[Gemini: prázdná odpověď] ";
          }
        } else {
          const errText = await geminiResp.text();
          console.warn(`gemini-project-chat: Gemini API vrátil chybu: ${geminiResp.status} ${errText.slice(0, 300)}`);
          errorDetails += `[Gemini chybný status ${geminiResp.status}: ${errText.slice(0, 150)}] `;
        }
      } catch (geminiError: any) {
        console.warn("gemini-project-chat: Selhalo volání Google Gemini API:", geminiError);
        errorDetails += `[Gemini výjimka: ${geminiError?.message || String(geminiError)}] `;
      }
    } else {
      console.warn("gemini-project-chat: Chybí GOOGLE_GENERATIVE_AI_API_KEY, zkouším rovnou zálohu (Claude).");
      errorDetails += "[Gemini: chybí API klíč] ";
    }

    // Fallback na Claude, pokud Gemini selhalo nebo nebylo úspěšné
    if (!success) {
      const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") || "";
      if (!anthropicKey) {
        console.error("gemini-project-chat: Chybí GOOGLE_GENERATIVE_AI_API_KEY i ANTHROPIC_API_KEY");
        return new Response(
          JSON.stringify({ error: `AI není dostupné. Detaily chyb: ${errorDetails} + [Claude: chybí API klíč]` }),
          { status: 200, headers: JSON_HEADERS }
        );
      }

      console.log("gemini-project-chat: Spouštím záložní volání na Anthropic Claude...");
      try {
        const claudeHistory = geminiContents.map(msg => ({
          role: msg.role === "model" ? "assistant" : "user",
          content: msg.parts[0].text,
        }));

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
            system: systemContext,
            messages: claudeHistory,
          }),
        });

        if (!claudeRes.ok) {
          const errText = await claudeRes.text();
          console.error("gemini-project-chat: Claude API error:", errText);
          errorDetails += `[Claude chybný status ${claudeRes.status}: ${errText.slice(0, 150)}]`;
          return new Response(
            JSON.stringify({ error: `AI není dostupné. Detaily chyb: ${errorDetails}` }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        const claudeData = await claudeRes.json();
        reply = claudeData.content?.[0]?.text ?? "";
        console.log("gemini-project-chat: Anthropic Claude úspěšně vrátil záložní odpověď.");
      } catch (claudeError: any) {
        console.error("gemini-project-chat: Claude API výjimka:", claudeError);
        errorDetails += `[Claude výjimka: ${claudeError?.message || String(claudeError)}]`;
        return new Response(
          JSON.stringify({ error: `AI není dostupné. Detaily chyb: ${errorDetails}` }),
          { status: 200, headers: JSON_HEADERS }
        );
      }
    }

    if (!reply) {
      return new Response(JSON.stringify({ error: `AI nevrátila žádnou odpověď. Detaily chyb: ${errorDetails}` }), { status: 200, headers: JSON_HEADERS });
    }

    return new Response(
      JSON.stringify({
        reply,
        meta: {
          model: success ? "Gemini 2.5 Flash" : "Claude 3.5 Sonnet",
        }
      }),
      { headers: JSON_HEADERS }
    );
  } catch (e: any) {
    console.error("gemini-project-chat: unhandled error:", e);
    return new Response(JSON.stringify({ error: `Interní chyba serveru: ${e?.message || String(e)}` }), { status: 200, headers: JSON_HEADERS });
  }
});
