# Chat s projektem — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Přidat interaktivní AI chat panel do detailu projektu, který odpovídá na otázky s plnou znalostí všech úkolů a poznámek projektu.

**Architecture:** Nová Supabase Edge Function `gemini-project-chat` přijme kontext projektu (tasks + notes) přímo z frontendu a předá ho Gemini 2.0 Flash spolu s historií konverzace. Frontend komponenta `ProjectChatPanel.jsx` zobrazí sliding panel zprava (desktop) nebo full-screen overlay (mobil) s persistencí zpráv v localStorage.

**Tech Stack:** Supabase Edge Functions (Deno), Gemini 2.0 Flash REST API, React + Vite, localStorage, esm.sh pro Deno importy

---

## Mapa souborů

| Akce | Soubor | Odpovědnost |
|------|--------|-------------|
| CREATE | `supabase/functions/gemini-project-chat/index.ts` | Deno edge function: auth, rate limit, Gemini API, odpověď |
| CREATE | `src/components/ProjectChatPanel.jsx` | Chat UI: panel, zprávy, input, localStorage, starter suggestions |
| MODIFY | `src/pages/ProjectsPage.jsx` | Přidat `notes` + `chatOpen` state do `ProjectDetailPage`, tlačítko Chat + render panelu |

---

## Task 1: Edge Function gemini-project-chat

**Files:**
- Create: `supabase/functions/gemini-project-chat/index.ts`

- [ ] **Step 1: Vytvoř soubor edge funkce**

Vytvoř `supabase/functions/gemini-project-chat/index.ts` s tímto obsahem:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_MAX = 30;
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
        JSON.stringify({ error: `Rate limit exceeded — max ${RATE_LIMIT_MAX} zpráv za hodinu.` }),
        { status: 429, headers: { ...CORS, "Retry-After": "3600" } }
      );
    }

    const { currentMessage, messages, projectContext } = await req.json();

    if (!currentMessage?.trim()) {
      return new Response(JSON.stringify({ error: "currentMessage je povinný." }), { status: 400, headers: CORS });
    }

    const { project, tasks, notes } = projectContext ?? {};

    const contextText = `
Projekt: ${project?.name ?? "Neznámý"} (${project?.status ?? "?"})
${project?.description ? `Popis: ${project.description}` : ""}

Úkoly projektu (${(tasks ?? []).length} celkem):
${(tasks ?? []).map((t: { title: string; status: string; priority?: string; dueDate?: string; subtasks?: Array<{text: string; done: boolean}> }) => {
  const subtaskSummary = t.subtasks?.length
    ? ` [podúkoly: ${t.subtasks.filter((s) => s.done).length}/${t.subtasks.length} hotovo]`
    : "";
  return `- [${t.status}] ${t.title}${t.priority ? ` (priorita: ${t.priority})` : ""}${t.dueDate ? ` (termín: ${t.dueDate})` : ""}${subtaskSummary}`;
}).join("\n")}

${(notes ?? []).length > 0 ? `Poznámky projektu:\n${(notes ?? []).map((n: { title: string; content: string }) => `- ${n.title}${n.content ? `: ${n.content.slice(0, 200)}` : ""}`).join("\n")}` : ""}
`.trim();

    const systemPrompt = `Jsi AI asistent pro správu projektů. Odpovídáš stručně a prakticky v češtině.
Máš k dispozici kompletní data projektu níže. Pomáháš uživateli analyzovat stav projektu, identifikovat problémy a plánovat další kroky.

${contextText}`;

    const geminiMessages = [
      ...(messages ?? []).map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      { role: "user", parts: [{ text: currentMessage }] },
    ];

    const apiKey = Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY");
    if (!apiKey) {
      console.error("gemini-project-chat: chybí GOOGLE_GENERATIVE_AI_API_KEY");
      return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500, headers: CORS });
    }

    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      console.error("gemini-project-chat: Gemini API error:", errText);
      return new Response(JSON.stringify({ error: "Chyba AI služby" }), { status: 502, headers: CORS });
    }

    const geminiData = await geminiResp.json();
    const reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    if (!reply) {
      return new Response(JSON.stringify({ error: "AI nevrátila žádnou odpověď" }), { status: 500, headers: CORS });
    }

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("gemini-project-chat: unhandled error:", e);
    return new Response(JSON.stringify({ error: "Interní chyba serveru" }), { status: 500, headers: CORS });
  }
});
```

- [ ] **Step 2: Ověř soubor a commitni**

```bash
cd "/Users/michalzich/Desktop/Hero projekty/michal-tasks"
git add supabase/functions/gemini-project-chat/index.ts
git commit -m "feat: add gemini-project-chat Supabase edge function"
```

- [ ] **Step 3: Deploy na Supabase**

Ze svého terminálu v projektu:
```bash
supabase functions deploy gemini-project-chat
```

Očekávaný výstup: `Deployed Functions on project ...: gemini-project-chat`

---

## Task 2: ProjectChatPanel komponenta

**Files:**
- Create: `src/components/ProjectChatPanel.jsx`

- [ ] **Step 1: Vytvoř soubor komponenty**

Vytvoř `src/components/ProjectChatPanel.jsx`:

```jsx
import React, { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from './Toast.jsx'
import Icon from './Icon.jsx'
import { supabase } from '../supabase.js'

const CHAT_STORAGE_KEY = (projectId) => `mt3:chat:${projectId}`;
const MAX_MESSAGES = 50;

const STARTERS = [
  "Co v tomto projektu hoří?",
  "Co jsem tento týden nestihl?",
  "Navrhni priority na zítřek",
];

function loadMessages(projectId) {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY(projectId));
    return raw ? JSON.parse(raw).messages ?? [] : [];
  } catch {
    return [];
  }
}

function saveMessages(projectId, messages) {
  const trimmed = messages.slice(-MAX_MESSAGES);
  localStorage.setItem(CHAT_STORAGE_KEY(projectId), JSON.stringify({ messages: trimmed }));
}

export default function ProjectChatPanel({ project, tasks, notes, onClose }) {
  const { t, isMobile } = useApp();
  const toast = useToast();
  const [messages, setMessages] = useState(() => loadMessages(project.id));
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!isMobile) inputRef.current?.focus();
  }, [isMobile]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const userMsg = { role: "user", content: msg, ts: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);
    saveMessages(project.id, next);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("gemini-project-chat", {
        body: {
          currentMessage: msg,
          messages: messages.map(({ role, content }) => ({ role, content })),
          projectContext: {
            project: { name: project.name, description: project.description, status: project.status },
            tasks: tasks.map((t) => ({
              title: t.title,
              status: t.status,
              priority: t.priority,
              dueDate: t.dueDate,
              subtasks: t.subtasks,
            })),
            notes: notes.map((n) => ({ title: n.title, content: n.content })),
          },
        },
      });

      if (error || !data?.reply) {
        const msg2 = data?.error || error?.message || "Neznámá chyba";
        if (msg2.includes("Rate limit")) {
          toast("Příliš mnoho zpráv — zkus to za hodinu.", "error");
        } else {
          toast(`Chat selhal: ${msg2}`, "error");
        }
        return;
      }

      const aiMsg = { role: "assistant", content: data.reply, ts: Date.now() };
      const withReply = [...next, aiMsg];
      setMessages(withReply);
      saveMessages(project.id, withReply);
    } catch {
      toast("Chyba chatu — zkus to znovu", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clearChat = () => {
    setMessages([]);
    saveMessages(project.id, []);
  };

  const panelStyle = isMobile
    ? {
        position: "fixed", inset: 0, zIndex: 300,
        background: t.bg, display: "flex", flexDirection: "column",
      }
    : {
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: 360, zIndex: 200,
        background: t.bg2, borderLeft: `1px solid ${t.border}`,
        display: "flex", flexDirection: "column",
        boxShadow: "-4px 0 24px rgba(0,0,0,.15)",
        animation: "slideRight .2s ease",
      };

  return (
    <>
      {/* Overlay backdrop (desktop only) */}
      {!isMobile && (
        <div
          onClick={onClose}
          style={{ position: "fixed", inset: 0, zIndex: 199, background: "rgba(0,0,0,.15)" }}
        />
      )}

      <div style={panelStyle}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "14px 16px", borderBottom: `1px solid ${t.border}`,
          flexShrink: 0,
        }}>
          {isMobile && (
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, marginRight: 2, display: "flex" }}>
              <Icon name="chevron-left" size={18} color={t.text2} strokeWidth={2} />
            </button>
          )}
          <span style={{ fontSize: 14 }}>💬</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Chat — {project.name}
            </div>
            <div style={{ fontSize: 11, color: t.text3 }}>Gemini 2.0 Flash · {tasks.length} úkolů</div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              title="Smazat historii"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}
            >
              <Icon name="trash-2" size={14} color={t.text3} strokeWidth={2} />
            </button>
          )}
          {!isMobile && (
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
              <Icon name="x" size={16} color={t.text2} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.length === 0 && (
            <div className="fi" style={{ alignItems: "center", paddingTop: 20 }}>
              <div style={{ fontSize: 28, marginBottom: 8, textAlign: "center" }}>💬</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 4, textAlign: "center" }}>
                Chat s projektem
              </div>
              <div style={{ fontSize: 12, color: t.text3, marginBottom: 20, textAlign: "center" }}>
                Ptej se na cokoli ohledně tohoto projektu
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    style={{
                      padding: "8px 12px", borderRadius: 8, fontSize: 12.5,
                      border: `1px solid ${t.border}`, background: t.input,
                      color: t.text2, cursor: "pointer", textAlign: "left",
                      transition: "all .12s",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "85%",
                  padding: "8px 12px",
                  borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                  background: m.role === "user" ? t.accent : t.input,
                  color: m.role === "user" ? "#fff" : t.text,
                  fontSize: 13,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{
                padding: "8px 14px", borderRadius: "12px 12px 12px 4px",
                background: t.input, color: t.text3, fontSize: 18, letterSpacing: 3,
              }}>
                <span style={{ animation: "pulse 1.2s ease infinite" }}>···</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: "10px 12px", borderTop: `1px solid ${t.border}`,
          display: "flex", gap: 8, flexShrink: 0, alignItems: "flex-end",
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Napiš zprávu… (Enter = odeslat)"
            rows={1}
            disabled={loading}
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 8,
              border: `1px solid ${t.border}`, background: t.input,
              color: t.text, fontSize: 13, outline: "none", resize: "none",
              maxHeight: 100, overflowY: "auto", lineHeight: 1.5,
              opacity: loading ? 0.6 : 1,
            }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            style={{
              width: 36, height: 36, borderRadius: 8, border: "none",
              background: input.trim() && !loading ? t.accent : t.border,
              color: "#fff", cursor: input.trim() && !loading ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "background .15s",
            }}
          >
            {loading
              ? <span style={{ animation: "spin .7s linear infinite", fontSize: 14 }}>◌</span>
              : <Icon name="send" size={14} color="#fff" strokeWidth={2.5} />
            }
          </button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commitni**

```bash
cd "/Users/michalzich/Desktop/Hero projekty/michal-tasks"
git add src/components/ProjectChatPanel.jsx
git commit -m "feat: add ProjectChatPanel component with localStorage persistence"
```

---

## Task 3: Integrace do ProjectsPage.jsx

**Files:**
- Modify: `src/pages/ProjectsPage.jsx`

- [ ] **Step 1: Přidej import ProjectChatPanel**

Na začátek souboru za ostatní importy (řádek ~10) přidej:

```jsx
import ProjectChatPanel from '../components/ProjectChatPanel.jsx'
```

- [ ] **Step 2: Přidej `notes` a `chatOpen` state do ProjectDetailPage**

V `ProjectDetailPage` (řádek ~150) najdi:
```jsx
  const { t, projects, tasks, addTask, updateTask, updateProject, deleteProject, selProject, setPage, isMobile } = useApp();
```

Nahraď:
```jsx
  const { t, projects, tasks, notes, addTask, updateTask, updateProject, deleteProject, selProject, setPage, isMobile } = useApp();
```

A za řádek `const [showAllDone, setShowAllDone] = useState(false);` přidej:
```jsx
  const [chatOpen, setChatOpen] = useState(false);
```

- [ ] **Step 3: Odvoď poznámky projektu z notes**

Za řádek `const pTasks = tasks.filter((x) => x.projectId === project.id);` přidej:
```jsx
  const pNotes = notes.filter((n) => n.primaryProjectId === project.id);
```

- [ ] **Step 4: Přidej tlačítko Chat do headeru projektu**

Najdi blok s tlačítky "Upravit" a "Smazat" (řádek ~199):
```jsx
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => {
```

Přidej tlačítko Chat jako první v tomto divu:
```jsx
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setChatOpen(true)}
              style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${t.accent}40`, background: t.accentBg, color: t.accent, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}
            >
              <Icon name="message-circle" size={13} color={t.accent} strokeWidth={2} />
              Chat
            </button>
            <button
              onClick={() => {
```

- [ ] **Step 5: Přidej panel na konec returnu ProjectDetailPage**

Najdi uzavírací `</div>` na konci returnu `ProjectDetailPage` (těsně před `}`):

```jsx
      {/* Notes section */}
      <div style={{ marginTop: 32, borderTop: `1px solid ${t.border}`, paddingTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Poznámky projektu</span>
        </div>
        <NotesMiniList projectId={project.id} />
      </div>
    </div>
```

Nahraď za:
```jsx
      {/* Notes section */}
      <div style={{ marginTop: 32, borderTop: `1px solid ${t.border}`, paddingTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Poznámky projektu</span>
        </div>
        <NotesMiniList projectId={project.id} />
      </div>

      {chatOpen && (
        <ProjectChatPanel
          project={project}
          tasks={pTasks}
          notes={pNotes}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
```

- [ ] **Step 6: Commitni**

```bash
cd "/Users/michalzich/Desktop/Hero projekty/michal-tasks"
git add src/pages/ProjectsPage.jsx
git commit -m "feat: integrate ProjectChatPanel into ProjectDetailPage"
```

---

## Self-Review

**Spec coverage:**
- ✅ Sliding panel zprava (desktop 360px) — Task 2, panelStyle
- ✅ Full-screen overlay mobil — Task 2, panelStyle isMobile branch
- ✅ localStorage persistence (max 50 zpráv) — Task 2, loadMessages/saveMessages
- ✅ Gemini 2.0 Flash REST API — Task 1
- ✅ Auth check + rate limit (30/hod) — Task 1
- ✅ Starter suggestions — Task 2, STARTERS array
- ✅ Kontext projektu posílán z frontendu — Task 2, supabase.functions.invoke body
- ✅ Tlačítko Chat v headeru — Task 3, Step 4
- ✅ Clear chat funkce — Task 2, clearChat()
- ✅ Loading stav (animované tečky) — Task 2
- ✅ Error handling s toasty — Task 2

**Placeholder scan:** Žádné TBD, TODO ani vágní kroky.

**Type consistency:** `project.id`, `project.name`, `project.description`, `project.status` konzistentní v Task 1 i Task 2. `tasks` a `notes` jako arrays konzistentní napříč tasky.
