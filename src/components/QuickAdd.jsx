import React, { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from './Toast.jsx'
import Icon from './Icon.jsx'
import { STATUSES, PRIORITIES } from '../constants.js'

export default function QuickAdd({ defaultProjectId = null }) {
  const { t, tasks, addTask, updateTask, projects, tags, setTaskDetail } = useApp();
  const toast = useToast();

  const [val, setVal] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [lastTaskId, setLastTaskId] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = () => inputRef.current?.focus();
    window.addEventListener("focusQuickAdd", handler);
    return () => window.removeEventListener("focusQuickAdd", handler);
  }, []);

  const handleAdd = () => {
    const title = val.trim();
    if (!title) return;
    const task = addTask({ title, projectId: defaultProjectId });
    setLastTaskId(task.id);
    setVal("");
    setExpanded(true);
    toast("Úkol přidán", "success");
  };

  const task = lastTaskId ? tasks.find((x) => x.id === lastTaskId) : null;
  const upd = (u) => task && updateTask(task.id, u);

  const close = () => {
    setExpanded(false);
    setLastTaskId(null);
  };

  return (
    <div
      style={{
        background: t.card,
        border: `1px solid ${expanded ? t.accent + "40" : t.border}`,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: t.shadow,
        transition: "border-color .2s",
      }}
    >
      <div style={{ display: "flex", gap: 0 }}>
        <div style={{ display: "flex", alignItems: "center", padding: "0 14px", color: t.text3 }}>
          <span style={{ fontSize: 20, fontWeight: 300 }}>+</span>
        </div>

        <input
          ref={inputRef}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Nový úkol… (N / Enter)"
          style={{
            flex: 1,
            border: "none",
            background: "transparent",
            outline: "none",
            color: t.text,
            fontSize: 14,
            padding: "13px 0",
          }}
        />

        <button
          onClick={handleAdd}
          style={{
            padding: "0 20px",
            border: "none",
            background: val.trim() ? t.accent : "transparent",
            color: val.trim() ? "#fff" : t.text3,
            fontSize: 13,
            fontWeight: 600,
            transition: "all .15s",
          }}
        >
          Přidat
        </button>
      </div>

      {expanded && task && (
        <div style={{ borderTop: `1px solid ${t.border}`, padding: "18px 20px", animation: "fadeIn .15s ease-out" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: t.text }}>
              <span style={{ color: "#22c55e", marginRight: 4 }}>✓</span>„{task.title}"
            </span>
            <button onClick={close} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", padding: "0 2px", display: "flex", alignItems: "center" }}>
              <Icon name="x" size={13} color={t.text3} strokeWidth={2} />
            </button>
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 }}>
              Status
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {Object.entries(STATUSES).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => upd({ status: k })}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    border: `1.5px solid ${task.status === k ? v.color : t.border}`,
                    background: task.status === k ? v.bg : "transparent",
                    color: task.status === k ? v.color : t.text2,
                    transition: "all .1s",
                    display: "inline-flex", alignItems: "center", gap: 5,
                  }}
                >
                  <Icon name={v.icon} size={11} color="currentColor" strokeWidth={2} />
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 }}>
              Priorita
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {Object.entries(PRIORITIES).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => upd({ priority: task.priority === k ? null : k })}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    border: `1.5px solid ${task.priority === k ? v.color : t.border}`,
                    background: task.priority === k ? v.bg : "transparent",
                    color: task.priority === k ? v.color : t.text2,
                    transition: "all .1s",
                    display: "inline-flex", alignItems: "center", gap: 5,
                  }}
                >
                  <Icon name={v.icon} size={11} color="currentColor" strokeWidth={2.5} />
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 }}>
                Projekt
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                <button
                  onClick={() => upd({ projectId: null })}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    border: `1.5px solid ${!task.projectId ? t.accent : t.border}`,
                    background: !task.projectId ? t.accentBg : "transparent",
                    color: !task.projectId ? t.accent : t.text2,
                  }}
                >
                  Inbox
                </button>

                {projects
                  .filter((p) => p.status === "active")
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => upd({ projectId: p.id })}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 500,
                        border: `1.5px solid ${task.projectId === p.id ? t.accent : t.border}`,
                        background: task.projectId === p.id ? t.accentBg : "transparent",
                        color: task.projectId === p.id ? t.accent : t.text2,
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 }}>
                Termín
              </div>
              <input
                type="date"
                value={task.dueDate || ""}
                onChange={(e) => upd({ dueDate: e.target.value || null })}
                onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }}
                onFocus={(e) => { try { e.target.showPicker(); } catch(err) {} }}
                style={{
                  padding: "5px 10px",
                  borderRadius: 7,
                  border: `1px solid ${t.border}`,
                  background: t.input,
                  color: t.text,
                  fontSize: 12,
                  outline: "none",
                }}
              />
            </div>
          </div>

          {tags.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 }}>
                Tagy
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {tags.map((tg) => {
                  const active = (task.tagIds || []).includes(tg.id);
                  return (
                    <button
                      key={tg.id}
                      onClick={() =>
                        upd({
                          tagIds: active ? task.tagIds.filter((id) => id !== tg.id) : [...(task.tagIds || []), tg.id],
                        })
                      }
                      style={{
                        padding: "3px 9px",
                        borderRadius: 5,
                        fontSize: 12,
                        fontWeight: 600,
                        border: `1.5px solid ${active ? tg.color : t.border}`,
                        background: active ? tg.color + "18" : "transparent",
                        color: active ? tg.color : t.text2,
                      }}
                    >
                      {tg.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 6, paddingTop: 4 }}>
            <button
              onClick={() => {
                setTaskDetail(task.id);
                close();
              }}
              style={{ padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, border: "none", background: t.accent, color: "#fff" }}
            >
              Otevřít detail →
            </button>
            <button onClick={close} style={{ padding: "6px 14px", borderRadius: 7, fontSize: 12, border: `1px solid ${t.border}`, background: "transparent", color: t.text2 }}>
              Hotovo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
