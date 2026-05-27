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

  const apply = () => {
    if (!result) return;

    if (activeAction === "optimize" && result) {
      const updates = {};

      if (result.optimizedTitle && result.optimizedTitle !== task.title) {
        updates.title = result.optimizedTitle;
        onTitleChange?.(result.optimizedTitle);
      }

      if (result.suggestedProject) {
        const matchedProject = projects.find(
          (p) => p.name.toLowerCase() === result.suggestedProject.toLowerCase()
        );
        if (matchedProject) {
          updates.projectId = matchedProject.id;
        } else {
          toast(`Projekt "${result.suggestedProject}" nenalezen — přiřazen nebyl`, "info");
        }
      }

      if (Array.isArray(result.suggestedTags) && result.suggestedTags.length > 0) {
        const existingTagIds = task.tagIds || [];
        const newTagIds = result.suggestedTags
          .map((name) => tags.find((tg) => tg.name.toLowerCase() === name.toLowerCase())?.id)
          .filter(Boolean);
        const merged = [...new Set([...existingTagIds, ...newTagIds])];
        if (merged.length !== existingTagIds.length) updates.tagIds = merged;
      }

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

  const dismiss = () => { setResult(null); setActiveAction(null); };

  return (
    <div style={{ marginBottom: 16 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 6, width: "100%",
          background: open ? t.accentBg : "transparent",
          border: `1px solid ${open ? t.accent + "40" : t.border}`,
          borderRadius: 8, padding: "7px 10px", cursor: "pointer",
          transition: "all .15s",
        }}
      >
        <span style={{ fontSize: 14 }}>✨</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: open ? t.accent : t.text2, flex: 1, textAlign: "left" }}>
          AI asistent
        </span>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={13} color={t.text3} strokeWidth={2} />
      </button>

      {open && (
        <div className="fi" style={{ marginTop: 8 }}>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: result ? 10 : 0 }}>
            {ACTIONS.map((a) => (
              <button
                key={a.id}
                onClick={() => run(a.id)}
                disabled={!!loading}
                title={a.desc}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${activeAction === a.id ? t.accent + "60" : t.border}`,
                  background: activeAction === a.id ? t.accentBg : t.input,
                  color: activeAction === a.id ? t.accent : t.text2,
                  cursor: loading ? "wait" : "pointer",
                  opacity: loading && loading !== a.id ? 0.5 : 1,
                  transition: "all .12s",
                }}
              >
                {loading === a.id
                  ? <span style={{ display: "inline-block", animation: "spin .7s linear infinite", fontSize: 12 }}>◌</span>
                  : <Icon name={a.icon} size={11} color="currentColor" strokeWidth={2} />
                }
                {a.label}
              </button>
            ))}
          </div>

          {result !== null && (
            <div className="fi" style={{
              background: t.input, border: `1px solid ${t.border}`,
              borderRadius: 10, padding: "10px 12px",
            }}>
              <ResultView action={activeAction} result={result} t={t} />
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                <button
                  onClick={apply}
                  style={{
                    flex: 1, padding: "7px", borderRadius: 7, border: "none",
                    background: t.accent, color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Použít
                </button>
                <button
                  onClick={dismiss}
                  style={{
                    padding: "7px 12px", borderRadius: 7,
                    border: `1px solid ${t.border}`, background: "transparent",
                    color: t.text2, fontSize: 12, cursor: "pointer",
                  }}
                >
                  Zahodit
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultView({ action, result, t }) {
  if (action === "optimize" && result) {
    return (
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>
          Návrh optimalizace
        </div>
        <OptimizeRow icon="edit-2" label="Název" t={t}>
          <span style={{ fontSize: 13, color: t.text, fontWeight: 600 }}>{result.optimizedTitle}</span>
        </OptimizeRow>
        <OptimizeRow icon="folder" label="Projekt" t={t}>
          {result.suggestedProject
            ? <span style={{ fontSize: 13, color: t.accent }}>{result.suggestedProject}</span>
            : <span style={{ fontSize: 12, color: t.text3, fontStyle: "italic" }}>Žádný</span>}
        </OptimizeRow>
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
        <OptimizeRow icon="clock" label="Odhad" t={t}>
          <span style={{ fontSize: 13, color: t.text2 }}>
            {result.timeEstimate}
            <span style={{ fontSize: 11, color: t.text3, marginLeft: 6 }}>(jen informace)</span>
          </span>
        </OptimizeRow>
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
