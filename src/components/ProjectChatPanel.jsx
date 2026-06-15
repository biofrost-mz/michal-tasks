import React, { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from './Toast.jsx'
import Icon from './Icon.jsx'
import { supabase } from '../supabase.js'
import { fetchProjectChat, insertProjectChat, clearProjectChat } from '../services/projectChatService.js'

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
  const { isMobile, activeWorkspaceId, userId } = useApp();
  const toast = useToast();
  const [messages, setMessages] = useState(() => loadMessages(project.id));

  // Uloží zprávu do DB (sdílená historie). Tiše ignoruje chyby —
  // bez migrace / offline zůstává jen localStorage níže.
  const persist = (role, content) => {
    if (!activeWorkspaceId || !userId) return;
    insertProjectChat({ projectId: project.id, workspaceId: activeWorkspaceId, userId, role, content }).catch(() => {});
  };
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

  // Načti sdílenou historii ze serveru; fallback = localStorage (init výše).
  // Přepíšeme jen když server nějaké zprávy má, ať se nepřemaže lokální cache,
  // dokud není migrace nasazená.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const server = await fetchProjectChat(project.id);
        if (!cancelled && server.length) {
          setMessages(server);
          saveMessages(project.id, server);
        }
      } catch {
        /* tabulka neexistuje / offline → necháme localStorage */
      }
    })();
    return () => { cancelled = true; };
  }, [project.id]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const userMsg = { role: "user", content: msg, ts: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);
    saveMessages(project.id, next);
    persist("user", msg);
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
        if (msg2.includes("non-2xx") || msg2.includes("Unauthorized") || error?.status === 401) {
          toast("Chyba přihlášení k AI službám. Odhlaste se a znovu přihlaste.", "error");
        } else if (msg2.toLowerCase().includes("rate limit")) {
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
      persist("assistant", data.reply);
    } catch (err) {
      const errMsg = err?.message || String(err);
      if (errMsg.includes("non-2xx")) {
        toast("Chyba přihlášení k AI službám. Odhlaste se a znovu přihlaste.", "error");
      } else {
        toast("Chyba chatu — zkus to znovu", "error");
      }
    } finally {
      setLoading(false);
      if (!isMobile) inputRef.current?.focus();
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
    clearProjectChat(project.id).catch(() => {});
  };

  const panelStyle = isMobile
    ? {
        position: "fixed", inset: 0, zIndex: 300,
        background: "var(--bg)", display: "flex", flexDirection: "column",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }
    : {
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: 360, zIndex: 200,
        background: "var(--bg-2)", borderLeft: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        boxShadow: "-4px 0 24px rgba(0,0,0,.15)",
        animation: "slideRight .2s ease",
      };

  return (
    <>
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
          padding: "14px 16px", borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}>
          {isMobile && (
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, marginRight: 2, display: "flex" }}>
              <Icon name="chevron-left" size={18} color="var(--text-2)" strokeWidth={2} />
            </button>
          )}
          <span style={{ fontSize: 14 }}>💬</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Chat — {project.name}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)" }}>Gemini 2.0 Flash · {tasks.length} úkolů</div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              title="Smazat historii"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}
            >
              <Icon name="trash-2" size={14} color="var(--text-3)" strokeWidth={2} />
            </button>
          )}
          {!isMobile && (
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
              <Icon name="x" size={16} color="var(--text-2)" strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.length === 0 && (
            <div className="fi" style={{ alignItems: "center", paddingTop: 20 }}>
              <div style={{ fontSize: 28, marginBottom: 8, textAlign: "center" }}>💬</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4, textAlign: "center" }}>
                Chat s projektem
              </div>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 20, textAlign: "center" }}>
                Ptej se na cokoli ohledně tohoto projektu
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    style={{
                      padding: "8px 12px", borderRadius: 8, fontSize: 12.5,
                      border: "1px solid var(--border)", background: "var(--input)",
                      color: "var(--text-2)", cursor: "pointer", textAlign: "left",
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
              key={`${m.ts}-${m.role}-${i}`}
              style={{
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: isMobile ? "90%" : "85%",
                  padding: "8px 12px",
                  borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                  background: m.role === "user" ? "var(--accent)" : "var(--input)",
                  color: m.role === "user" ? "#fff" : "var(--text)",
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
                background: "var(--input)", color: "var(--text-3)", fontSize: 18, letterSpacing: 3,
              }}>
                <span style={{ animation: "pulse 1.2s ease infinite" }}>···</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: `10px 12px calc(10px + env(safe-area-inset-bottom, 0px))`,
          borderTop: "1px solid var(--border)",
          display: "flex", gap: 8, flexShrink: 0, alignItems: "flex-end",
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={isMobile ? "Zpráva…" : "Napiš zprávu… (Enter = odeslat)"}
            rows={1}
            disabled={loading}
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 8,
              border: "1px solid var(--border)", background: "var(--input)",
              color: "var(--text)", fontSize: 13, outline: "none", resize: "none",
              maxHeight: 100, overflowY: "auto", lineHeight: 1.5,
              opacity: loading ? 0.6 : 1,
            }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            style={{
              width: isMobile ? 42 : 36, height: isMobile ? 42 : 36,
              borderRadius: 10, border: "none",
              background: input.trim() && !loading ? "var(--accent)" : "var(--border)",
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
