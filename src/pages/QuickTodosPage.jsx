import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from '../components/Toast.jsx'
import Icon from '../components/Icon.jsx'
import { PrioChip, TagPill } from '../components/atlas/AtlasTaskCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { triggerConfettiBurst } from '../utils.js'
import { useConfirm } from '../components/Confirm.jsx'

const PRIORITY_CONFIG = {
  low:    { label: "Nízká",   color: "#22c55e", bg: "#22c55e18" },
  medium: { label: "Střední", color: "#f59e0b", bg: "#f59e0b18" },
  high:   { label: "Vysoká",  color: "#ef4444", bg: "#ef444418" },
};

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
  const cardRef = useRef(null);
  const pointerIdRef = useRef(null);
  const maxSwipeRef = useRef(132);   // fixed max swipe (approx 120-140px)
  const thresholdRef = useRef(92);   // fixed complete threshold (approx 80-110px)

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text || "");
  const [editDesc, setEditDesc] = useState(todo.description || "");
  const [editPrio, setEditPrio] = useState(todo.priority || "");
  const [editDue, setEditDue] = useState(todo.dueDate || "");
  const [editTags, setEditTags] = useState(todo.tags ? todo.tags.join(", ") : "");

  const triggerArchive = useCallback(() => {
    navigator.vibrate?.([20, 30, 60]);
    setExiting(true);

    toast(
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span>Položka byla dokončena</span>
        <button 
          onClick={(e) => {
            e.stopPropagation();
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

    setTimeout(() => onArchive(todo.id), 320);
  }, [onArchive, todo.id, toast, restoreQuickTodo]);

  const onPointerDown = (e) => {
    if (!isMobile) return;
    if (exiting) return;
    startXRef.current = e.clientX;
    pointerIdRef.current = e.pointerId;
    offsetXRef.current = 0;
    setSwiping(true);
    hasSwipedRef.current = false;
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch(err) {}
  };

  const onPointerMove = (e) => {
    if (pointerIdRef.current !== e.pointerId) return;
    if (startXRef.current == null) return;

    const diff = e.clientX - startXRef.current;
    // ignore right swipe, use left swipe
    const currentX = Math.min(0, diff);
    const clamped = Math.max(-maxSwipeRef.current, currentX);

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
    
    if (finalX < -thresholdRef.current) {
      triggerArchive();
    } else {
      setOffsetX(0);
    }
    
    startXRef.current = null;
    pointerIdRef.current = null;
    try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch(err) {}
  };

  const onPointerCancel = (e) => {
    setSwiping(false);
    setOffsetX(0);
    startXRef.current = null;
    pointerIdRef.current = null;
    try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch(err) {}
  };

  const swipeFraction = Math.min(Math.abs(offsetX + hintOffset) / thresholdRef.current, 1);
  const bgOpacity = swipeFraction;
  const pastThreshold = (offsetX + hintOffset) < -thresholdRef.current;

  // Map quickTodo to a visual status — active items are "todo"
  const statusClass = "todo";

  const swipeWrap = isMobile ? {
    position: "relative",
    overflow: "hidden",
    borderRadius: "var(--r, 14px)",
    touchAction: "pan-y",
    userSelect: "none",
  } : {};

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
            <label style={{ fontSize: "11px", color: "var(--text-3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Název
            </label>
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
            <label style={{ fontSize: "11px", color: "var(--text-3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Popis
            </label>
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
              <label style={{ fontSize: "11px", color: "var(--text-3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Priorita
              </label>
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
              <label style={{ fontSize: "11px", color: "var(--text-3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Termín splnění
              </label>
              <input
                type="date"
                className="detail-input"
                value={editDue}
                onChange={(e) => setEditDue(e.target.value)}
                style={{ padding: "8px 12px", fontSize: "13px" }}
                onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }}
              />
            </div>
          </div>

          {/* Tags Field */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", color: "var(--text-3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Tagy
            </label>
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
    <div style={swipeWrap}>
      {/* Swipe background (mobile only) */}
      {isMobile && (
        <div style={{
          position: "absolute", inset: 0,
          background: pastThreshold
            ? `rgba(34,197,94,0.95)`
            : `rgba(34,197,94,${bgOpacity * 0.8})`,
          display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 24,
          transition: swiping ? "background .08s" : "background .25s",
          borderRadius: "inherit",
        }}>
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            transform: pastThreshold ? "scale(1.2) rotate(-8deg)" : `scale(${0.75 + swipeFraction * 0.25})`,
            transition: swiping ? "transform .08s" : "transform .25s cubic-bezier(0.34,1.56,0.64,1)",
            opacity: bgOpacity,
            color: "#ffffff"
          }}>
            <div style={{
              background: pastThreshold ? "rgba(255, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.15)",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              display: "grid",
              placeItems: "center",
              transition: "all 0.15s ease",
              boxShadow: pastThreshold ? "0 4px 12px rgba(0,0,0,0.12)" : "none"
            }}>
              <Icon name="check" size={20} color="#ffffff" strokeWidth={3} />
            </div>
            <span style={{ fontSize: 11, color: "#ffffff", fontWeight: 700, letterSpacing: "0.04em" }}>
              {pastThreshold ? "Pusť!" : "Hotovo"}
            </span>
          </div>
        </div>
      )}

      <div
        ref={cardRef}
        className={`tcard ${statusClass}`}
        onPointerDown={isMobile ? onPointerDown : undefined}
        onPointerMove={isMobile ? onPointerMove : undefined}
        onPointerUp={isMobile ? onPointerEnd : undefined}
        onPointerCancel={isMobile ? onPointerCancel : undefined}
        onClick={() => {
          if (hasSwipedRef.current) return;
          if (Math.abs(offsetX) > 5) return;
          setIsEditing(true);
        }}
        style={isMobile ? {
          transform: exiting ? "translateX(-115%) scale(0.95)" : `translateX(${offsetX + hintOffset}px)`,
          opacity: exiting ? 0 : 1,
          touchAction: "pan-y",
          cursor: swiping ? "grabbing" : "grab",
          transition: swiping
            ? "none"
            : exiting
              ? "transform .32s cubic-bezier(.4,0,.2,1), opacity .22s"
              : "transform .35s cubic-bezier(0.34,1.56,0.64,1), opacity .2s",
          willChange: "transform",
        } : undefined}
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
function ArchivedRow({ todo, onRestore, onDelete, t }) {
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
  const { t, isMobile, quickTodos, addQuickTodo, archiveQuickTodo, restoreQuickTodo, deleteQuickTodo, clearArchivedQuickTodos } = useApp();
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
  const inputBg = "var(--bg-2)";

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
            <Icon name="flag" size={13} color={t.text3} strokeWidth={2} />
            <span style={{ fontSize: 13, color: t.text3, width: 56 }}>Priorita</span>
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
            <Icon name="calendar" size={13} color={t.text3} strokeWidth={2} />
            <span style={{ fontSize: 13, color: t.text3, width: 56 }}>Datum</span>
            <input
              type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="detail-input" style={{ maxWidth: 180 }}
              onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }}
              onFocus={(e) => { try { e.target.showPicker(); } catch(err) {} }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="tag" size={13} color={t.text3} strokeWidth={2} />
            <span style={{ fontSize: 13, color: t.text3, width: 56 }}>Tagy</span>
            <input
              value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="nakup, práce, osobní…"
              className="detail-input" style={{ flex: 1 }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <Icon name="align-left" size={13} color={t.text3} strokeWidth={2} style={{ marginTop: 6 }} />
            <span style={{ fontSize: 13, color: t.text3, width: 56, paddingTop: 6 }}>Popisek</span>
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
      {rawActive.length === 0 && archived.length === 0 && (
        <EmptyState
          type="todos"
          title="Žádné položky"
          description="Napiš co potřebuješ a stiskni Enter nebo klikni na + Přidat."
          action={() => inputRef.current?.focus()}
          actionLabel="Vytvořit první úkol"
        />
      )}

      {rawActive.length === 0 && archived.length > 0 && (
        <div style={{ textAlign: "center", padding: "32px 20px 24px", color: "var(--text-3)" }}>
          <Icon name="check-circle" size={36} color="#22c55e" strokeWidth={1.5} />
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-2)", marginTop: 8 }}>Vše hotovo!</div>
        </div>
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

      <div className="tcards">
        {active.map((todo, idx) => (
          <QuickTodoCard
            key={todo.id}
            todo={todo}
            onArchive={archiveQuickTodo}
            onDelete={deleteQuickTodo}
            isMobile={isMobile}
            hintOffset={idx === 0 && showSwipeHint ? hintOffset : 0}
          />
        ))}
      </div>

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
                <ArchivedRow key={todo.id} todo={todo} onRestore={restoreQuickTodo} onDelete={deleteQuickTodo} t={t} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
