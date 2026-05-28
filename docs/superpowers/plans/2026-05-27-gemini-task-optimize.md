# Gemini Task Optimize — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Přidat funkci "Optimalizuj úkol pomocí AI" do TaskDrawer — zavolá Gemini 1.5 Flash přes Supabase Edge Function a najednou navrhne optimalizovaný název, projekt, tagy, odhad času a podúkoly.

**Architecture:** Tato aplikace je **Vite + React SPA s Supabase Edge Functions (Deno)** — NENÍ Next.js. Proto se nepoužívají Server Actions ani Vercel AI SDK (ty vyžadují Node.js). Nová edge function `gemini-task-optimize` volá Gemini REST API přímo (stejný vzor jako stávající `ai-task-assist`), Zod se použije pro runtime validaci odpovědi na straně Dena. API klíč je uložen jako Supabase secret (nikdy se nedostane na klienta).

**Tech Stack:** Supabase Edge Functions (Deno), Gemini 1.5 Flash REST API, Zod přes `npm:zod`, React state management v AppContext

---

## ⚠️ Architektonická poznámka — proč ne Vercel AI SDK

Uživatel zmínil `@ai-sdk/google` — ten je ideální pro Next.js nebo Node.js backend.
Tato aplikace ale běží na Supabase Edge Functions (Deno runtime), kde přímé volání REST API je spolehlivější a konzistentní se stávajícím kódem (`ai-task-assist` volá Anthropic API přes `fetch()`). Gemini 1.5 Flash nabízí nativní structured output (JSON mode se schématem), takže Zod validace funguje perfektně bez wrapper knihovny.

**Pokud v budoucnu přejdeš na Next.js:** stačí přepsat edge function na Next.js API Route a přidat `import { generateObject } from "ai"; import { google } from "@ai-sdk/google"` — Zod schéma zůstane stejné.

---

## API klíč — kde ho nastavit

### Lokální vývoj
```bash
# Soubor: supabase/.env (pro lokální Supabase CLI, nikdy do gitu)
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...
```

Nebo přímo jako secret pro lokální Supabase:
```bash
supabase secrets set GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...
```

### Produkce (Supabase cloud)
```bash
# Příkaz spustit jednou (klíč se uloží v Supabase dashboardu → Settings → Edge Functions → Secrets)
supabase secrets set GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...
```

### Klíč se NIKDY nedostane do:
- `VITE_*` proměnných (ty jsou bundlované do klientského JS)
- `.env.local` v root složce projektu (to je pro Vite klient)
- Žádné `import.meta.env.*` proměnné

---

## Mapa souborů

| Akce | Soubor | Odpovědnost |
|------|--------|-------------|
| **CREATE** | `supabase/functions/gemini-task-optimize/index.ts` | Deno edge function: auth, rate limit, Gemini REST API, Zod validace |
| **MODIFY** | `src/components/AITaskAssist.jsx` | Přidat akci "optimize", OptimizeResultView, apply logika pro multi-field výsledek |
| **MODIFY** | `src/components/TaskDrawer.jsx` | Přidat `onTitleChange` callback prop do `<AITaskAssist>` a propojit se state |

---

## Task 1: Supabase Edge Function — gemini-task-optimize

**Files:**
- Create: `supabase/functions/gemini-task-optimize/index.ts`

- [ ] **Step 1: Vytvoř soubor edge funkce**

Vytvoř `supabase/functions/gemini-task-optimize/index.ts` s tímto obsahem:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_MAX = 20;
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

const TaskOptimizationSchema = z.object({
  optimizedTitle: z.string().min(1).max(120),
  suggestedProject: z.string().nullable(),
  suggestedTags: z.array(z.string()).min(0).max(3),
  timeEstimate: z.enum(["15 min", "30 min", "1 hod", "2 hod", "půl dne", "celý den"]),
  subtasks: z.array(z.string().min(1)).min(3).max(6),
});

type TaskOptimization = z.infer<typeof TaskOptimizationSchema>;

// Gemini REST API JSON Schema for structured output
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
        JSON.stringify({ error: "Rate limit exceeded — max 20 optimalizací za hodinu." }),
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
```

- [ ] **Step 2: Nastav API klíč lokálně**

```bash
# V terminálu (v root složce projektu):
supabase secrets set GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...your_key_here...

# Ověř, že je nastavený:
supabase secrets list
```

Očekávaný výstup: `GOOGLE_GENERATIVE_AI_API_KEY` v seznamu.

- [ ] **Step 3: Deploy edge funkce lokálně nebo na cloud**

```bash
# Lokální testování (pokud máš supabase start):
supabase functions serve gemini-task-optimize

# Nebo deploy na produkci:
supabase functions deploy gemini-task-optimize
```

- [ ] **Step 4: Ruční test curl**

```bash
# Nejdřív získej JWT token (z browser DevTools → Application → Local Storage → supabase.auth.token → access_token)
curl -X POST 'http://localhost:54321/functions/v1/gemini-task-optimize' \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentTitle": "web",
    "currentDescription": "",
    "availableProjects": ["Práce", "Osobní", "Marketing"],
    "availableTags": ["design", "backend", "urgent", "meeting"]
  }'
```

Očekávaný výstup:
```json
{
  "result": {
    "optimizedTitle": "Aktualizovat hlavní stránku webu",
    "suggestedProject": "Práce",
    "suggestedTags": ["design"],
    "timeEstimate": "2 hod",
    "subtasks": [
      "Analyzovat aktuální obsah stránky",
      "Navrhnout nové rozvržení sekce hero",
      "Aktualizovat texty a CTA tlačítka",
      "Zkontrolovat responsivitu na mobilu"
    ]
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/gemini-task-optimize/index.ts
git commit -m "feat: add gemini-task-optimize edge function with Zod validation"
```

---

## Task 2: Rozšíření AITaskAssist.jsx — akce "optimize"

**Files:**
- Modify: `src/components/AITaskAssist.jsx`

- [ ] **Step 1: Přidej "optimize" do ACTIONS a import projektů**

Nahraď začátek souboru (řádky 1–26):

```jsx
import React, { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from './Toast.jsx'
import Icon from './Icon.jsx'
import { supabase } from '../supabase.js'

const ACTIONS = [
  { id: "optimize",    icon: "zap",          label: "Optimalizovat", desc: "Optimalizuj název, projekt, tagy a podúkoly najednou" },
  { id: "subtasks",    icon: "check-square", label: "Podúkoly",      desc: "Navrhni podúkoly" },
  { id: "tags",        icon: "tag",          label: "Tagy",          desc: "Navrhni tagy" },
  { id: "description", icon: "file-text",    label: "Popis",         desc: "Doplň popis" },
  { id: "priority",    icon: "arrow-up",     label: "Priorita",      desc: "Odhadni prioritu" },
];

const PRIORITY_LABELS = { low: "Nízká", medium: "Střední", high: "Vysoká" };
const PRIORITY_COLORS = { low: "#22c55e", medium: "#f59e0b", high: "#ef4444" };

export default function AITaskAssist({ task, onTitleChange }) {
  const { t, tags, projects, updateTask, activeWorkspaceId } = useApp();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(null);
  const [result, setResult] = useState(null);
  const [activeAction, setActiveAction] = useState(null);

  const availableTags = tags.map((tg) => tg.name);
  const availableProjects = projects.map((p) => p.name);
```

- [ ] **Step 2: Nahraď funkci `run` — přidej větev pro "optimize"**

Nahraď celou funkci `run` (řádky 27–76):

```jsx
  const run = async (action) => {
    setLoading(action);
    setResult(null);
    setActiveAction(action);
    try {
      if (action === "optimize") {
        const { data, error } = await supabase.functions.invoke("gemini-task-optimize", {
          body: {
            currentTitle: task.title,
            currentDescription: task.description ?? "",
            availableProjects,
            availableTags,
          },
        });
        if (error) {
          const msg = data?.error || error.message || String(error);
          if (error.status === 429 || msg.includes("Rate limit")) {
            toast("Příliš mnoho AI dotazů — zkus to za hodinu.", "error");
          } else {
            toast("Chyba AI optimalizace", "error");
          }
          setActiveAction(null);
          return;
        }
        setResult(data?.result ?? null);
      } else {
        const { data, error } = await supabase.functions.invoke("ai-task-assist", {
          body: {
            action,
            task: {
              title: task.title,
              description: task.description,
              dueDate: task.dueDate,
              priority: task.priority,
            },
            availableTags,
            workspaceId: activeWorkspaceId,
          },
        });
        if (error) {
          const msg = data?.error || error.message || String(error);
          if (error.status === 429 || msg.includes("Rate limit")) {
            toast("Příliš mnoho AI dotazů — zkus to za hodinu.", "error");
          } else {
            toast("Chyba AI", "error");
          }
          setActiveAction(null);
          return;
        }

        const raw = data?.result ?? "";
        if (action === "subtasks" || action === "tags" || action === "priority") {
          try {
            const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "").trim();
            setResult(JSON.parse(cleaned));
          } catch {
            setResult(raw);
          }
        } else {
          setResult(raw);
        }
      }
    } catch (e) {
      toast("Chyba AI — zkus to znovu", "error");
      setResult(null);
      setActiveAction(null);
    } finally {
      setLoading(null);
    }
  };
```

- [ ] **Step 3: Nahraď funkci `apply` — přidej větev pro "optimize"**

Nahraď celou funkci `apply` (řádky 78–101):

```jsx
  const apply = () => {
    if (!result) return;

    if (activeAction === "optimize" && result) {
      const updates = {};

      // Titulek — přes updateTask + sync lokálního stavu v TaskDrawer
      if (result.optimizedTitle && result.optimizedTitle !== task.title) {
        updates.title = result.optimizedTitle;
        onTitleChange?.(result.optimizedTitle);
      }

      // Projekt — najdi ID podle jména
      if (result.suggestedProject) {
        const matchedProject = projects.find(
          (p) => p.name.toLowerCase() === result.suggestedProject.toLowerCase()
        );
        if (matchedProject) updates.projectId = matchedProject.id;
      }

      // Tagy — najdi ID pro každý navržený tag
      if (Array.isArray(result.suggestedTags) && result.suggestedTags.length > 0) {
        const existingTagIds = task.tagIds || [];
        const newTagIds = result.suggestedTags
          .map((name) => tags.find((tg) => tg.name.toLowerCase() === name.toLowerCase())?.id)
          .filter(Boolean);
        const merged = [...new Set([...existingTagIds, ...newTagIds])];
        if (merged.length !== existingTagIds.length) updates.tagIds = merged;
      }

      // Podúkoly — připoj ke stávajícím
      if (Array.isArray(result.subtasks) && result.subtasks.length > 0) {
        const newSubs = result.subtasks.map((text) => ({
          id: crypto.randomUUID(),
          text: String(text),
          done: false,
        }));
        updates.subtasks = [...(task.subtasks || []), ...newSubs];
      }

      if (Object.keys(updates).length > 0) {
        updateTask(task.id, updates);
        toast("Úkol optimalizován ✨", "success");
      } else {
        toast("Vše bylo již nastaveno správně", "info");
      }
    } else if (activeAction === "subtasks" && Array.isArray(result)) {
      const newSubs = result.map((text) => ({
        id: crypto.randomUUID(),
        text: String(text),
        done: false,
      }));
      updateTask(task.id, { subtasks: [...(task.subtasks || []), ...newSubs] });
      toast(`Přidáno ${newSubs.length} podúkolů`, "success");
    } else if (activeAction === "tags" && Array.isArray(result)) {
      toast("Tagy zatím musíš přidat ručně — funkce přiřazení tagů přes AI brzy", "info");
    } else if (activeAction === "description" && typeof result === "string") {
      updateTask(task.id, { description: result });
      toast("Popis uložen", "success");
    } else if (activeAction === "priority" && result?.priority) {
      updateTask(task.id, { priority: result.priority });
      toast(`Priorita nastavena: ${PRIORITY_LABELS[result.priority]}`, "success");
    }

    setResult(null);
    setActiveAction(null);
  };
```

- [ ] **Step 4: Přidej OptimizeResultView do ResultView komponenty**

Nahraď celou funkci `ResultView` (řádky 191–259):

```jsx
function ResultView({ action, result, t }) {
  if (action === "optimize" && result) {
    return (
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>
          Návrh optimalizace
        </div>
        {/* Název */}
        <OptimizeRow icon="edit-2" label="Název" t={t}>
          <span style={{ fontSize: 13, color: t.text, fontWeight: 600 }}>{result.optimizedTitle}</span>
        </OptimizeRow>
        {/* Projekt */}
        <OptimizeRow icon="folder" label="Projekt" t={t}>
          {result.suggestedProject
            ? <span style={{ fontSize: 13, color: t.accent }}>{result.suggestedProject}</span>
            : <span style={{ fontSize: 12, color: t.text3, fontStyle: "italic" }}>Žádný</span>}
        </OptimizeRow>
        {/* Tagy */}
        <OptimizeRow icon="tag" label="Tagy" t={t}>
          {result.suggestedTags?.length > 0
            ? <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {result.suggestedTags.map((tag, i) => (
                  <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: t.accentBg, color: t.accent }}>
                    #{tag}
                  </span>
                ))}
              </div>
            : <span style={{ fontSize: 12, color: t.text3, fontStyle: "italic" }}>Žádné</span>}
        </OptimizeRow>
        {/* Odhad času — jen zobrazení, neuloží se do DB */}
        <OptimizeRow icon="clock" label="Odhad" t={t}>
          <span style={{ fontSize: 13, color: t.text2 }}>
            {result.timeEstimate}
            <span style={{ fontSize: 11, color: t.text3, marginLeft: 6 }}>(jen informace)</span>
          </span>
        </OptimizeRow>
        {/* Podúkoly */}
        <OptimizeRow icon="list" label="Podúkoly" t={t}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {result.subtasks?.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: t.text }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: t.accent, flexShrink: 0 }} />
                {s}
              </div>
            ))}
          </div>
        </OptimizeRow>
      </div>
    );
  }

  if (action === "subtasks" && Array.isArray(result)) {
    return (
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
          Navržené podúkoly
        </div>
        {result.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, padding: "3px 0", fontSize: 13, color: t.text }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.accent, flexShrink: 0 }} />
            {String(s)}
          </div>
        ))}
      </div>
    );
  }

  if (action === "tags" && Array.isArray(result)) {
    return (
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
          Navržené tagy
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {result.map((tag, i) => (
            <span key={i} style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 6, background: t.accentBg, color: t.accent }}>
              # {String(tag)}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (action === "description" && typeof result === "string") {
    return (
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
          Navržený popis
        </div>
        <div style={{ fontSize: 13, color: t.text, lineHeight: 1.5 }}>{result}</div>
      </div>
    );
  }

  if (action === "priority" && result?.priority) {
    const color = PRIORITY_COLORS[result.priority] ?? t.accent;
    return (
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
          Navržená priorita
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color, background: color + "18", padding: "4px 12px", borderRadius: 7 }}>
            {PRIORITY_LABELS[result.priority] ?? result.priority}
          </span>
          {result.reason && <span style={{ fontSize: 12, color: t.text2, fontStyle: "italic" }}>{result.reason}</span>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontSize: 13, color: t.text, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
      {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
    </div>
  );
}

function OptimizeRow({ icon, label, children, t }) {
  return (
    <div style={{ display: "flex", gap: 8, padding: "5px 0", borderBottom: `1px solid ${t.border}20`, alignItems: "flex-start" }}>
      <div style={{ width: 70, flexShrink: 0, display: "flex", alignItems: "center", gap: 5, paddingTop: 1 }}>
        <Icon name={icon} size={10} color={t.text3} strokeWidth={2} />
        <span style={{ fontSize: 11, color: t.text3, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}
```

- [ ] **Step 5: Ověř, že render AI asistent sekce je správný**

V JSX části komponenty (řádky 106–188) nic neměníme — tlačítka a result card jsou sdílené. Jen zkontroluj, že `ACTIONS` array (krok 1) zahrnuje "optimize" jako první položku.

- [ ] **Step 6: Commit**

```bash
git add src/components/AITaskAssist.jsx
git commit -m "feat: add optimize action to AITaskAssist with Gemini edge function"
```

---

## Task 3: Propojení s TaskDrawer.jsx

**Files:**
- Modify: `src/components/TaskDrawer.jsx:529`

- [ ] **Step 1: Přidej `onTitleChange` callback při volání AITaskAssist**

Najdi řádek 529 v `src/components/TaskDrawer.jsx`:
```jsx
          <AITaskAssist task={task} />
```

Nahraď ho za:
```jsx
          <AITaskAssist task={task} onTitleChange={setTitle} />
```

To je celá změna. `setTitle` je lokální state setter pro title input (definován na řádku 270). Když AITaskAssist aplikuje optimalizovaný název, zavolá `onTitleChange(newTitle)`, čímž:
1. Okamžitě aktualizuje input pole v UI (přes `setTitle`)
2. `updateTask` v AITaskAssist zároveň uloží do DB

- [ ] **Step 2: Ověř vizuálně v prohlížeči**

1. Otevři detail úkolu s vágním názvem (např. "web" nebo "schůzka")
2. Rozbal "AI asistent"
3. Klikni na "⚡ Optimalizovat" (první tlačítko)
4. Počkej na loading (rotující ◌)
5. Zkontroluj preview — měly by se zobrazit 5 řádků: Název, Projekt, Tagy, Odhad, Podúkoly
6. Klikni "Použít"
7. Ověř: název se změnil v input poli nahoře, projekt/tagy se přidaly, podúkoly přibyly do seznamu

- [ ] **Step 3: Commit**

```bash
git add src/components/TaskDrawer.jsx
git commit -m "feat: wire onTitleChange prop from TaskDrawer to AITaskAssist optimize"
```

---

## Poznámky k timeEstimate

Pole `timeEstimate` se zobrazí v preview jako informace, ale **neuloží se do databáze** — v tabulce `tasks` takový sloupec neexistuje. Pokud ho chceš persistovat:

1. Přidej migraci:
   ```sql
   ALTER TABLE tasks ADD COLUMN time_estimate TEXT;
   ```
2. Přidej `timeEstimate` do `normalizeTask()` v `src/services/taskService.js`
3. Přidej `if (result.timeEstimate) updates.timeEstimate = result.timeEstimate;` do `apply()` v AITaskAssist

---

## Příprava na "Chat s projektem" (architektonická poznámka)

Gemini 1.5 Flash má 1M token okno — stačí poslat všechny úkoly projektu jako text přímo v promptu. Navrhovaný vzor pro budoucí edge function `gemini-project-chat`:

```typescript
// V edge funkci: načti všechny úkoly projektu z DB
const { data: tasks } = await serviceClient
  .from("tasks")
  .select("title, description, status, priority, due_date, subtasks")
  .eq("project_id", projectId)
  .eq("workspace_id", workspaceId);

// Přeměň na kontext
const projectContext = JSON.stringify(tasks, null, 2);

const prompt = `Kontext projektu:\n${projectContext}\n\nDotaz uživatele: ${userMessage}`;
// Gemini 1.5 Flash to zvládne v jednom promptu, žádná RAG databáze není potřeba
```

---

## Self-Review

**Spec coverage:**
- ✅ Gemini 1.5 Flash pro task optimalizaci
- ✅ Gemini 1.5 Pro zmíněn v architektonické poznámce (pro budoucí denní plán)
- ✅ API klíč bezpečně jako Supabase secret, nikdy na klientovi
- ✅ Zod schéma pro validaci odpovědi
- ✅ Všechna 3 pole vstupu: title, description, availableProjects, availableTags
- ✅ Všechna pole výstupu: optimizedTitle, suggestedProject, suggestedTags, timeEstimate, subtasks
- ✅ timeEstimate enum hodnoty přesně odpovídají zadání
- ✅ subtasks min 3 max 6
- ✅ suggestedTags max 3
- ✅ UI tlačítko "Optimalizovat" s loading stavem
- ✅ Preview card se všemi poli
- ✅ Apply logic pro každé pole
- ✅ Chat s projektem architektura popsána
- ✅ Bezpečnost: auth check + rate limit v edge function

**Placeholder scan:** žádné TBD, TODO nebo "implement later" v plánu.

**Type consistency:** `TaskOptimizationSchema` v edge function → `result` v AITaskAssist → pole `suggestedProject`, `suggestedTags`, `optimizedTitle`, `timeEstimate`, `subtasks` konzistentní v celém plánu.
