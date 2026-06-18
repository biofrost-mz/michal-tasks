import React, { useState, useRef, useCallback, useEffect } from 'react'
import { SkeletonLine } from '../components/Skeleton.jsx'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from '../components/Toast.jsx'
import Icon from '../components/Icon.jsx'
import { PrioChip, TagPill } from '../components/atlas/AtlasTaskCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { triggerConfettiBurst } from '../utils.js'
import { useConfirm } from '../components/Confirm.jsx'
import { SectionLabel } from "../components/ui/index.js"

const PRIORITY_CONFIG = {
  low:    { label: "Nízká",   color: "#22c55e", bg: "#22c55e18" },
  medium: { label: "Střední", color: "#f59e0b", bg: "#f59e0b18" },
  high:   { label: "Vysoká",  color: "#ef4444", bg: "#ef444418" },
};

const MAX_SWIPE = 132;
const COMPLETE_THRESHOLD = 35;

function openNativeDatePicker(input) {
  try {
    input.showPicker?.();
  } catch {
    // Some browsers expose showPicker but block it outside trusted gestures.
  }
}

/* ─────────────────────────────────────────────
   QuickTodoCard — Atlas .tcard design with swipe support
───────────────────────────────────────────── */
function QuickTodoCard({ todo, onArchive, onDelete, isMobile, hintOffset = 0 }) {
  const { updateQuickTodo, restoreQuickTodo } = useApp();
  const toast = useToast();
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [exiting, setExiting] = useState(false);
  const startXRef = useRef(null);
  const startYRef = useRef(null);
  const swipeAxisRef = useRef(null); // null | "x" | "y" | "ignored"
  const hasSwipedRef = useRef(false);
  const offsetXRef = useRef(0);
  const pointerIdRef = useRef(null);
  const archiveTimerRef = useRef(null);
  const completingRef = useRef(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text || "");
  const [editDesc, setEditDesc] = useState(todo.description || "");
  const [editPrio, setEditPrio] = useState(todo.priority || "");
  const [editDue, setEditDue] = useState(todo.dueDate || "");
  const [editTags, setEditTags] = useState(todo.tags ? todo.tags.join(", ") : "");

  useEffect(() => () => {
    if (archiveTimerRef.current) clearTimeout(archiveTimerRef.current);
  }, []);

  const triggerArchive = useCallback(() => {
    if (completingRef.current) return;
    completingRef.current = true;
    navigator.vibrate?.([20, 30, 60]);
    setExiting(true);
    setOffsetX(-MAX_SWIPE);
    offsetXRef.current = -MAX_SWIPE;

    toast(
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span>Položka byla dokončena</span>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (archiveTimerRef.current) {
              clearTimeout(archiveTimerRef.current);
              archiveTimerRef.current = null;
            }
            completingRef.current = false;
            setExiting(false);
            setOffsetX(0);
            offsetXRef.current = 0;
            restoreQuickTodo(todo.id);
          }}
          style={{
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            color: '#22c55e',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '700',
            cursor: 'pointer',
            textTransform: 'uppercase',
            transition: 'background 0.12s',
          }}
        >
          Zpět
        </button>
      </div>,
      "success"
    );

    archiveTimerRef.current = setTimeout(() => {
      archiveTimerRef.current = null;
      onArchive(todo.id, { silent: true });
    }, 180);
  }, [onArchive, todo.id, toast, restoreQuickTodo]);

  const onPointerDown = (e) => {
    if (exiting) return;
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target.closest?.("button, input, textarea, select, a")) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    pointerIdRef.current = e.pointerId;
    offsetXRef.current = 0;
    swipeAxisRef.current = null;
    setSwiping(false);
    hasSwipedRef.current = false;
  };

  const onPointerMove = (e) => {
    if (pointerIdRef.current !== e.pointerId) return;
    if (startXRef.current == null) return;

    const diff = e.clientX - startXRef.current;
    const diffY = e.clientY - startYRef.current;
    const absX = Math.abs(diff);
    const absY = Math.abs(diffY);

    if (swipeAxisRef.current == null) {
      if (absX < 3 && absY < 3) return;
      if (absY > absX * 4.0 || diff >= 0) {
        swipeAxisRef.current = "ignored";
        setSwiping(false);
        return;
      }
      swipeAxisRef.current = "x";
      setSwiping(true);
      hasSwipedRef.current = true;
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch {
        // Pointer capture is best-effort on some mobile browsers.
      }
    }

    if (swipeAxisRef.current !== "x") return;
    e.preventDefault();

    // ignore right swipe, use left swipe
    const currentX = Math.min(0, diff);
    const clamped = Math.max(-MAX_SWIPE, currentX);

    offsetXRef.current = clamped;
    setOffsetX(clamped);
    if (Math.abs(clamped) > 10) {
      hasSwipedRef.current = true;
    }
  };

  const onPointerEnd = (e) => {
    if (pointerIdRef.current == null || pointerIdRef.current !== e.pointerId) return;
    setSwiping(false);
    const finalX = offsetXRef.current;
    
    if (swipeAxisRef.current === "x" && finalX <= -COMPLETE_THRESHOLD) {
      triggerArchive();
    } else {
      setOffsetX(0);
      offsetXRef.current = 0;
    }
    
    startXRef.current = null;
    startYRef.current = null;
    swipeAxisRef.current = null;
    pointerIdRef.current = null;
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      // Pointer capture may already be released.
    }
  };

  const onPointerCancel = (e) => {
    setSwiping(false);
    setOffsetX(0);
    offsetXRef.current = 0;
    startXRef.current = null;
    startYRef.current = null;
    swipeAxisRef.current = null;
    pointerIdRef.current = null;
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      // Pointer capture may already be released.
    }
  };

  const swipeFraction = Math.min(Math.abs(offsetX + hintOffset) / COMPLETE_THRESHOLD, 1);
  const bgOpacity = swipeFraction;
  const pastThreshold = (offsetX + hintOffset) < -COMPLETE_THRESHOLD;

  // Map quickTodo to a visual status — active items are "todo"
  const statusClass = "todo";

  if (isEditing) {
    return (
      <div
        className="tcard todo editing"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: "18px",
          padding: isMobile ? "16px" : "20px 24px",
          background: "var(--surface)",
          border: "1px solid var(--accent)",
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.25)",
          animation: "pop .2s ease-out",
          cursor: "default"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Title Field */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <SectionLabel>
              Název
            </SectionLabel>
            <input
              autoFocus
              className="detail-input"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="Co je potřeba udělat…"
              style={{ padding: "10px 14px", fontSize: "14px" }}
            />
          </div>

          {/* Description Field */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <SectionLabel>
              Popis
            </SectionLabel>
            <textarea
              className="detail-input"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Doplňující informace nebo poznámka…"
              rows={2}
              style={{ padding: "10px 14px", fontSize: "13.5px", resize: "vertical" }}
            />
          </div>

          {/* Meta Fields (Responsive Grid) */}
          <div style={isMobile ? { display: "flex", flexDirection: "column", gap: "14px" } : { display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px" }}>
            {/* Priority Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <SectionLabel>
                Priorita
              </SectionLabel>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setEditPrio(editPrio === key ? "" : key)}
                    className={`chip ${editPrio === key ? "active" : ""}`}
                    style={{
                      padding: "8px 14px",
                      fontSize: "12px",
                      fontWeight: 600,
                      borderRadius: "8px",
                      borderColor: editPrio === key ? cfg.color : "var(--border-soft)",
                      color: editPrio === key ? cfg.color : "var(--text-2)",
                      background: editPrio === key ? cfg.bg : "transparent",
                    }}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Due Date Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <SectionLabel>
                Termín splnění
              </SectionLabel>
              <input
                type="date"
                className="detail-input"
                value={editDue}
                onChange={(e) => setEditDue(e.target.value)}
                style={{ padding: "8px 12px", fontSize: "13px" }}
                onClick={(e) => openNativeDatePicker(e.target)}
              />
            </div>
          </div>

          {/* Tags Field */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <SectionLabel>
              Tagy
            </SectionLabel>
            <input
              className="detail-input"
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              placeholder="nakup, osobni, prace (oddělené čárkou)"
              style={{ padding: "10px 14px", fontSize: "13px" }}
            />
          </div>
        </div>

        {/* Action Buttons Row */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px", borderTop: "1px solid var(--border-soft)", paddingTop: "14px" }}>
          <button
            className="btn"
            style={{ padding: "8px 16px", fontSize: "13px", fontWeight: 600, borderRadius: "8px", minWidth: "80px" }}
            onClick={() => {
              setEditText(todo.text || "");
              setEditDesc(todo.description || "");
              setEditPrio(todo.priority || "");
              setEditDue(todo.dueDate || "");
              setEditTags(todo.tags ? todo.tags.join(", ") : "");
              setIsEditing(false);
            }}
          >
            Zrušit
          </button>
          <button
            className="btn primary"
            style={{ padding: "8px 20px", fontSize: "13px", fontWeight: 600, borderRadius: "8px", background: "var(--accent)", color: "var(--bg)", minWidth: "90px" }}
            onClick={() => {
              const text = editText.trim();
              if (!text) return;
              const tags = editTags
                .split(",")
                .map((s) => s.trim().replace(/^#/, ""))
                .filter(Boolean);

              updateQuickTodo(todo.id, {
                text,
                description: editDesc.trim() || null,
                priority: editPrio || null,
                dueDate: editDue || null,
                tags: tags.length ? tags : null,
              });
              setIsEditing(false);
            }}
          >
            Uložit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`quick-todo-swipe-shell${swiping ? " is-swiping" : ""}${pastThreshold ? " is-complete-ready" : ""}${exiting ? " is-exiting" : ""}`}
      style={{
        "--drag-x": exiting ? "-115%" : `${offsetX + hintOffset}px`,
        "--swipe-progress": bgOpacity,
        "--swipe-scale": pastThreshold ? 1.04 : 0.7 + swipeFraction * 0.22,
      }}
    >
      <div className="quick-todo-swipe-bg" aria-hidden="true">
        <div className="quick-todo-swipe-action">
          <div className="quick-todo-swipe-icon">
            <Icon name="check" size={14} color="#ecfdf5" strokeWidth={3} />
          </div>
          <span>Hotovo</span>
        </div>
      </div>

      <div
        className={`tcard ${statusClass} quick-todo-swipe-card`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onPointerEnd}
        onClick={() => {
          if (hasSwipedRef.current) return;
          if (Math.abs(offsetX) > 5) return;
          setIsEditing(true);
        }}
      >
        <div
          className="tcard-state"
          onClick={(e) => {
            e.stopPropagation();
            triggerConfettiBurst(e);
            triggerArchive();
          }}
          title="Označit jako hotové"
        />
        <div className="tcard-body">
          <div className="tcard-title">{todo.text}</div>
          {(todo.priority || todo.dueDate || todo.tags?.length || todo.description) && (
            <div className="tcard-meta">
              <PrioChip priority={todo.priority} />
              {todo.tags?.map((tag, i) => <TagPill key={i} name={tag} />)}
              {todo.dueDate && (
                <span className="due">{todo.dueDate}</span>
              )}
              {todo.description && (
                <span style={{ color: "var(--text-3)", fontSize: 13 }}>{todo.description}</span>
              )}
            </div>
          )}
        </div>
        <div className="tcard-acts" onClick={(e) => e.stopPropagation()}>
          <div className="stepper">
            <button className="cur todo" title="Aktivní">Todo</button>
            <button onClick={() => triggerArchive()} title="Hotovo">Done</button>
          </div>
          {!isMobile && (
            <button
              className="icon-btn"
              onClick={() => onDelete(todo.id)}
              title="Smazat"
              style={{ opacity: 0.4 }}
            >
              <Icon name="x" size={13} color="currentColor" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ArchivedRow — done items in .tcard done style
───────────────────────────────────────────── */
function ArchivedRow({ todo, onRestore, onDelete }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="tcard done"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ opacity: 0.6 }}
    >
      <div className="tcard-state" style={{ cursor: "default" }} />
      <div className="tcard-body">
        <div className="tcard-title" style={{ textDecoration: "line-through", color: "var(--text-3)" }}>
          {todo.text}
        </div>
      </div>
      <div className="tcard-acts" onClick={(e) => e.stopPropagation()}>
        <button
          className="btn"
          onClick={() => onRestore(todo.id)}
          style={{ padding: "4px 10px", fontSize: 11, opacity: hovered ? 1 : 0, transition: "opacity .15s" }}
        >
          Obnovit
        </button>
        <button
          className="icon-btn"
          onClick={() => onDelete(todo.id)}
          style={{ opacity: hovered ? 0.6 : 0, transition: "opacity .15s" }}
        >
          <Icon name="x" size={13} color="#ef4444" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   QuickTodosPage
───────────────────────────────────────────── */
const SWIPE_HINT_KEY = "qt:swipe-hint-shown";

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2, "": 3, null: 3 };

export default function QuickTodosPage() {
  const { isMobile, quickTodos, addQuickTodo, archiveQuickTodo, restoreQuickTodo, deleteQuickTodo, clearArchivedQuickTodos, loaded } = useApp();
  const confirm = useConfirm();
  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [priority, setPriority] = useState(null);
  const [dueDate, setDueDate] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [description, setDescription] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [hintOffset, setHintOffset] = useState(0);
  const [sortBy, setSortBy] = useState("created");
  const [filterPrio, setFilterPrio] = useState(null);
  const inputRef = useRef(null);

  const prevTodosLenRef = useRef(quickTodos.length);
  const [newestTodoId, setNewestTodoId] = useState(null);

  useEffect(() => {
    if (quickTodos.length > prevTodosLenRef.current) {
      const newId = quickTodos[quickTodos.length - 1]?.id ?? null;
      setTimeout(() => setNewestTodoId(newId), 0);
      const timer = setTimeout(() => setNewestTodoId(null), 400);
      prevTodosLenRef.current = quickTodos.length;
      return () => clearTimeout(timer);
    }
    prevTodosLenRef.current = quickTodos.length;
  }, [quickTodos]);

  const rawActive = quickTodos.filter((q) => !q.done);
  const archived = quickTodos.filter((q) => q.done);

  const active = React.useMemo(() => {
    let list = filterPrio ? rawActive.filter((q) => q.priority === filterPrio) : rawActive;
    if (sortBy === "priority") {
      list = [...list].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3));
    } else if (sortBy === "due") {
      list = [...list].sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
    }
    return list;
  }, [rawActive, sortBy, filterPrio]);

  useEffect(() => { if (!isMobile) inputRef.current?.focus(); }, [isMobile]);

  useEffect(() => {
    if (!isMobile) return;
    if (sessionStorage.getItem(SWIPE_HINT_KEY)) return;
    if (active.length === 0) return;
    const t1 = setTimeout(() => setShowSwipeHint(true), 800);
    return () => clearTimeout(t1);
  }, [isMobile, active.length]);

  useEffect(() => {
    if (!showSwipeHint) return;
    const t1 = setTimeout(() => setHintOffset(-80), 100);
    const t2 = setTimeout(() => setHintOffset(0), 900);
    const t3 = setTimeout(() => { setShowSwipeHint(false); sessionStorage.setItem(SWIPE_HINT_KEY, "1"); }, 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [showSwipeHint]);

  const resetForm = () => {
    setInput(""); setPriority(null); setDueDate(""); setTagsRaw(""); setDescription(""); setExpanded(false);
    inputRef.current?.focus();
  };

  const handleAdd = () => {
    const text = input.trim();
    if (!text) return;
    const tags = tagsRaw.split(",").map((s) => s.trim().replace(/^#/, "")).filter(Boolean);
    addQuickTodo(text, {
      priority: priority || null,
      dueDate: dueDate || null,
      tags: tags.length ? tags : null,
      description: description.trim() || null,
    });
    resetForm();
  };

  const hasExtras = priority || dueDate || tagsRaw || description;
  const panelBorder = "var(--border-soft)";
  return (
    <div className="content">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Nakup · udělej · vyřiď</div>
          <h1 className="ph-title">Rychlý seznam</h1>
          <div className="ph-sub"><span>{filterPrio ? `${active.length} z ${rawActive.length}` : rawActive.length} položek</span><span className="dot" /><span>nejjednodušší capture</span></div>
        </div>
      </div>

      {/* QuickAdd — Atlas design */}
      <div className="quickadd">
        <span className="quickadd-plus">+</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder="Co potřebuješ udělat nebo koupit…"
        />
        <span className="quickadd-kbd">Enter</span>
      </div>

      {/* Expanded extras — production feature, hidden behind toggle */}
      {expanded && (
        <div style={{
          background: "var(--surface)",
          border: `1px solid ${panelBorder}`,
          borderRadius: "var(--r, 14px)",
          padding: "14px 18px",
          marginBottom: 16,
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="flag" size={13} color="var(--text-3)" strokeWidth={2} />
            <span style={{ fontSize: 13, color: "var(--text-3)", width: 56 }}>Priorita</span>
            <div style={{ display: "flex", gap: 6 }}>
              {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setPriority(priority === key ? null : key)}
                  className={`chip ${priority === key ? "active" : ""}`}
                  style={priority === key ? { borderColor: cfg.color, color: cfg.color } : undefined}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="calendar" size={13} color="var(--text-3)" strokeWidth={2} />
            <span style={{ fontSize: 13, color: "var(--text-3)", width: 56 }}>Datum</span>
            <input
              type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="detail-input" style={{ maxWidth: 180 }}
              onClick={(e) => openNativeDatePicker(e.target)}
              onFocus={(e) => openNativeDatePicker(e.target)}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="tag" size={13} color="var(--text-3)" strokeWidth={2} />
            <span style={{ fontSize: 13, color: "var(--text-3)", width: 56 }}>Tagy</span>
            <input
              value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="nakup, práce, osobní…"
              className="detail-input" style={{ flex: 1 }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <Icon name="align-left" size={13} color="var(--text-3)" strokeWidth={2} style={{ marginTop: 6 }} />
            <span style={{ fontSize: 13, color: "var(--text-3)", width: 56, paddingTop: 6 }}>Popisek</span>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Krátká poznámka…" rows={2}
              className="detail-input" style={{ flex: 1, resize: "vertical" }}
            />
          </div>
          <div className="row" style={{ justifyContent: "flex-end", gap: 6 }}>
            <button className="btn" onClick={() => setExpanded(false)}>Zrušit</button>
            <button className="btn primary" onClick={handleAdd} disabled={!input.trim()}>
              <Icon name="plus" size={13} color="currentColor" strokeWidth={2.5} /> Přidat
            </button>
          </div>
        </div>
      )}

      {!expanded && (
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <button
            className={`chip ${hasExtras ? "active" : ""}`}
            onClick={() => setExpanded(true)}
          >
            {hasExtras ? "Podrobnosti ▾" : "+ Podrobnosti"}
          </button>
        </div>
      )}

      {/* Sort + filter controls — only shown when there's something to sort/filter */}
      {rawActive.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", marginRight: 2 }}>Řadit:</span>
          {[
            { k: "created", label: "Nové" },
            { k: "priority", label: "Priorita" },
            { k: "due", label: "Datum" },
          ].map(({ k, label }) => (
            <button key={k} className={`chip ${sortBy === k ? "active" : ""}`} onClick={() => setSortBy(k)}>{label}</button>
          ))}
          {rawActive.some((q) => q.priority) && (
            <>
              <span style={{ width: 1, height: 16, background: "var(--border-soft)", margin: "0 4px" }} />
              {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  className={`chip ${filterPrio === key ? "active" : ""}`}
                  onClick={() => setFilterPrio(filterPrio === key ? null : key)}
                  style={filterPrio === key ? { borderColor: cfg.color, color: cfg.color } : undefined}
                >
                  {cfg.label}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Active todos — Atlas .tcard cards */}
      {loaded && rawActive.length === 0 && archived.length === 0 && (
        <EmptyState
          type="todos"
          title="Žádné položky"
          description="Napiš co potřebuješ a stiskni Enter nebo klikni na + Přidat."
          action={() => inputRef.current?.focus()}
          actionLabel="Vytvořit první úkol"
        />
      )}

      {loaded && rawActive.length === 0 && archived.length > 0 && (
        <EmptyState type="done" title="Vše splněno!" description="Skvělá práce!" />
      )}

      {rawActive.length > 0 && active.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px 20px", color: "var(--text-3)", fontSize: 13 }}>
          Žádné položky neodpovídají filtru.
          <button onClick={() => setFilterPrio(null)} style={{ marginLeft: 8, background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 13 }}>Zrušit filtr</button>
        </div>
      )}

      {isMobile && showSwipeHint && active.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 12px", borderRadius: 8, marginBottom: 8,
          background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)",
          fontSize: 12, color: "#22c55e", fontWeight: 600,
          animation: "fadeIn .3s ease-out",
        }}>
          <Icon name="arrow-left" size={13} color="#22c55e" strokeWidth={2.5} />
          Přejeď doleva pro splnění
        </div>
      )}

      {!loaded ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[...Array(5)].map((_, i) => {
            const skVars = { "--sk-base": "var(--bg-2)", "--sk-hl": "var(--surface)" };
            return (
              <div key={i} style={{ padding: "11px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", gap: 12, ...skVars }}>
                <div className="skeleton" style={{ width: 18, height: 18, borderRadius: "50%" }} />
                <div className="skeleton" style={{ height: 13, width: `${55 + (i * 7) % 30}%`, borderRadius: 6 }} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="tcards">
          {active.map((todo, idx) => (
            <div
              key={todo.id}
              className={`list-item-enter${todo.id === newestTodoId ? " task-slide-in" : ""}`}
              style={{
                "--item-index": Math.min(idx, 7),
                ...(todo.id === newestTodoId ? { animationDelay: "0ms" } : {}),
              }}
            >
              <QuickTodoCard
                todo={todo}
                onArchive={archiveQuickTodo}
                onDelete={deleteQuickTodo}
                isMobile={isMobile}
                hintOffset={idx === 0 && showSwipeHint ? hintOffset : 0}
              />
            </div>
          ))}
        </div>
      )}

      {/* Archived section */}
      {archived.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <button
              onClick={() => setArchiveOpen((v) => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                background: "none", border: "none", color: "var(--text-3)",
                fontSize: 13, fontWeight: 700, letterSpacing: ".06em",
                textTransform: "uppercase", cursor: "pointer", padding: "2px 0",
              }}
            >
              <Icon name={archiveOpen ? "chevron-down" : "chevron-right"} size={13} color="var(--text-3)" strokeWidth={2} />
              Archiv
              <span style={{ background: "var(--bg-2)", border: "1px solid var(--border-soft)", borderRadius: 6, padding: "1px 7px", fontSize: 12, fontWeight: 500 }}>
                {archived.length}
              </span>
            </button>
            {archiveOpen && (
              <button
                onClick={async () => {
                  const ok = await confirm(`Smazat všech ${archived.length} archivovaných položek?`);
                  if (ok) clearArchivedQuickTodos();
                }}
                style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-3)", fontSize: 13, cursor: "pointer", padding: "2px 0" }}
              >
                Smazat vše
              </button>
            )}
          </div>

          {archiveOpen && (
            <div className="tcards">
              {archived.map((todo) => (
                <ArchivedRow key={todo.id} todo={todo} onRestore={restoreQuickTodo} onDelete={deleteQuickTodo} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
