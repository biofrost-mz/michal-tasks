import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import Icon from '../components/Icon.jsx'

const PRIORITY_CONFIG = {
  low:    { label: "Nízká",   color: "#22c55e", bg: "#22c55e18" },
  medium: { label: "Střední", color: "#f59e0b", bg: "#f59e0b18" },
  high:   { label: "Vysoká",  color: "#ef4444", bg: "#ef444418" },
};

/* ─────────────────────────────────────────────
   SwipeableRow
───────────────────────────────────────────── */
function SwipeableRow({ todo, onArchive, onDelete, t, isMobile, hintOffset = 0 }) {
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [exiting, setExiting] = useState(false);
  const startXRef = useRef(null);
  const rowRef = useRef(null);
  const [hovered, setHovered] = useState(false);
  const THRESHOLD = 80;

  const triggerArchive = useCallback(() => {
    setExiting(true);
    setTimeout(() => onArchive(todo.id), 260);
  }, [onArchive, todo.id]);

  const onTouchStart = (e) => { startXRef.current = e.touches[0].clientX; setSwiping(true); };
  const onTouchMove = (e) => {
    if (startXRef.current == null) return;
    const dx = e.touches[0].clientX - startXRef.current;
    if (dx > 0) return;
    setOffsetX(Math.max(dx, -160));
  };
  const onTouchEnd = () => {
    setSwiping(false);
    if (offsetX < -THRESHOLD) triggerArchive();
    else setOffsetX(0);
    startXRef.current = null;
  };

  const bgOpacity = Math.min(Math.abs(offsetX) / THRESHOLD, 1);
  const pri = todo.priority ? PRIORITY_CONFIG[todo.priority] : null;

  return (
    <div
      style={{ position: "relative", overflow: "hidden", borderRadius: 12, marginBottom: 6 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Swipe background */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: 12,
        background: `rgba(239,68,68,${bgOpacity * 0.85})`,
        display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 20,
        transition: swiping ? "none" : "background .2s",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <Icon name="check" size={20} color="#fff" strokeWidth={2.5} />
          <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>Hotovo</span>
        </div>
      </div>

      {/* Main row */}
      <div
        ref={rowRef}
        onTouchStart={isMobile ? onTouchStart : undefined}
        onTouchMove={isMobile ? onTouchMove : undefined}
        onTouchEnd={isMobile ? onTouchEnd : undefined}
        style={{
          display: "flex", alignItems: "flex-start", gap: 12,
          padding: "13px 14px",
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: 12,
          userSelect: "none",
          transform: exiting ? "translateX(-110%)" : `translateX(${offsetX + hintOffset}px)`,
          opacity: exiting ? 0 : 1,
          transition: swiping ? "none" : "transform .5s cubic-bezier(.4,0,.2,1), opacity .22s",
          willChange: "transform",
        }}
      >
        {/* Circle archive button */}
        <button
          onClick={triggerArchive}
          title="Označit jako hotové"
          style={{
            width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginTop: 1,
            border: `2px solid ${pri ? pri.color + "80" : t.border}`,
            background: pri ? pri.bg : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "border-color .15s, background .15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#22c55e"; e.currentTarget.style.background = "#22c55e18"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = pri ? pri.color + "80" : t.border; e.currentTarget.style.background = pri ? pri.bg : "transparent"; }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Text */}
          <span style={{ fontSize: 15, color: t.text, lineHeight: 1.4, display: "block" }}>
            {todo.text}
          </span>

          {/* Meta row */}
          {(todo.priority || todo.dueDate || todo.tags?.length || todo.description) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6, alignItems: "center" }}>
              {todo.priority && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 5, background: PRIORITY_CONFIG[todo.priority].bg, color: PRIORITY_CONFIG[todo.priority].color }}>
                  {PRIORITY_CONFIG[todo.priority].label}
                </span>
              )}
              {todo.dueDate && (
                <span style={{ fontSize: 11, color: t.text3, display: "flex", alignItems: "center", gap: 3 }}>
                  <Icon name="calendar" size={10} color={t.text3} strokeWidth={2} />
                  {todo.dueDate}
                </span>
              )}
              {todo.tags?.map((tag, i) => (
                <span key={i} style={{ fontSize: 11, color: t.accent, fontWeight: 600 }}>#{tag}</span>
              ))}
              {todo.description && (
                <span style={{ fontSize: 11, color: t.text3, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
                  {todo.description}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Desktop delete */}
        {!isMobile && (
          <button
            onClick={() => onDelete(todo.id)}
            title="Smazat"
            style={{
              opacity: hovered ? 0.5 : 0, transition: "opacity .15s",
              background: "none", border: "none", color: t.text3,
              cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center", flexShrink: 0,
            }}
          >
            <Icon name="x" size={14} color={t.text3} strokeWidth={2} />
          </button>
        )}
        {isMobile && (
          <span style={{ opacity: Math.max(0.12, 0.25 - Math.abs(offsetX) / 200), flexShrink: 0, transition: "opacity .1s", marginTop: 2 }}>
            <Icon name="chevron-left" size={14} color={t.text3} strokeWidth={2} />
          </span>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ArchivedRow
───────────────────────────────────────────── */
function ArchivedRow({ todo, onRestore, onDelete, t }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 14px", borderRadius: 9,
        background: "transparent", marginBottom: 3, transition: "background .1s",
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
        background: "#22c55e18", border: "2px solid #22c55e50",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon name="check" size={11} color="#22c55e" strokeWidth={2.5} />
      </div>
      <span style={{ flex: 1, fontSize: 14, color: t.text3, textDecoration: "line-through", lineHeight: 1.4 }}>
        {todo.text}
      </span>
      <div style={{ display: "flex", gap: 4, opacity: hovered ? 1 : 0, transition: "opacity .15s" }}>
        <button
          onClick={() => onRestore(todo.id)}
          title="Obnovit"
          style={{ background: "none", border: `1px solid ${t.border}`, color: t.text2, borderRadius: 5, padding: "3px 8px", fontSize: 12, cursor: "pointer" }}
        >
          Obnovit
        </button>
        <button
          onClick={() => onDelete(todo.id)}
          style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", padding: "3px 4px", display: "flex", alignItems: "center" }}
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

export default function QuickTodosPage() {
  const { t, isMobile, quickTodos, addQuickTodo, archiveQuickTodo, restoreQuickTodo, deleteQuickTodo, clearArchivedQuickTodos } = useApp();
  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [priority, setPriority] = useState(null);
  const [dueDate, setDueDate] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [description, setDescription] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [hintOffset, setHintOffset] = useState(0);
  const inputRef = useRef(null);

  const active = quickTodos.filter((q) => !q.done);
  const archived = quickTodos.filter((q) => q.done);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!isMobile) return;
    if (localStorage.getItem(SWIPE_HINT_KEY)) return;
    if (active.length === 0) return;
    const t1 = setTimeout(() => setShowSwipeHint(true), 800);
    return () => clearTimeout(t1);
  }, [isMobile, active.length]);

  useEffect(() => {
    if (!showSwipeHint) return;
    const t1 = setTimeout(() => setHintOffset(-55), 100);
    const t2 = setTimeout(() => setHintOffset(0), 700);
    const t3 = setTimeout(() => { setShowSwipeHint(false); localStorage.setItem(SWIPE_HINT_KEY, "1"); }, 1200);
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

  return (
    <div style={{ padding: isMobile ? "16px 14px 100px" : "28px 32px 48px", maxWidth: 640, margin: "0 auto" }} className="fi">

      {/* Header */}
      <div style={{ marginBottom: isMobile ? 20 : 28 }}>
        <h1 style={{ fontSize: isMobile ? 24 : 30, fontWeight: 800, letterSpacing: "-0.7px", marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="zap" size={isMobile ? 24 : 28} color="#f59e0b" strokeWidth={2} />
          Rychlý seznam
        </h1>
        <p style={{ fontSize: 14, color: t.text3 }}>
          Nakup, udělej, vyřiď.{isMobile ? " Swipe doleva = hotovo." : ""}
        </p>
      </div>

      {/* Input card */}
      <div style={{
        background: t.card,
        border: `1.5px solid ${t.border}`,
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 24,
        boxShadow: "0 2px 12px #0001",
      }}>
        {/* Main text row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px 12px" }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: input.trim() ? "#f59e0b20" : t.input,
            border: `1.5px solid ${input.trim() ? "#f59e0b50" : t.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all .15s",
          }}>
            <Icon name="zap" size={14} color={input.trim() ? "#f59e0b" : t.text3} strokeWidth={2} />
          </div>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            placeholder="Co potřebuješ udělat nebo koupit…"
            style={{
              flex: 1, border: "none", background: "transparent",
              color: t.text, fontSize: 16, outline: "none",
              fontFamily: "'Figtree', sans-serif",
            }}
          />
        </div>

        {/* Expanded extras */}
        {expanded && (
          <div style={{ borderTop: `1px solid ${t.border}`, padding: "12px 16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Priority */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="flag" size={13} color={t.text3} strokeWidth={2} />
              <span style={{ fontSize: 13, color: t.text3, width: 56 }}>Priorita</span>
              <div style={{ display: "flex", gap: 6 }}>
                {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setPriority(priority === key ? null : key)}
                    style={{
                      padding: "4px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      border: `1.5px solid ${priority === key ? cfg.color : t.border}`,
                      background: priority === key ? cfg.bg : "transparent",
                      color: priority === key ? cfg.color : t.text2,
                      transition: "all .12s",
                    }}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Due date */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="calendar" size={13} color={t.text3} strokeWidth={2} />
              <span style={{ fontSize: 13, color: t.text3, width: 56 }}>Datum</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{
                  padding: "5px 10px", borderRadius: 7, border: `1px solid ${t.border}`,
                  background: t.input, color: t.text, fontSize: 13, outline: "none",
                }}
              />
            </div>

            {/* Tags */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="tag" size={13} color={t.text3} strokeWidth={2} />
              <span style={{ fontSize: 13, color: t.text3, width: 56 }}>Tagy</span>
              <input
                value={tagsRaw}
                onChange={(e) => setTagsRaw(e.target.value)}
                placeholder="nakup, práce, osobní…"
                style={{
                  flex: 1, padding: "5px 10px", borderRadius: 7, border: `1px solid ${t.border}`,
                  background: t.input, color: t.text, fontSize: 13, outline: "none",
                  fontFamily: "'Figtree', sans-serif",
                }}
              />
            </div>

            {/* Description */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <Icon name="align-left" size={13} color={t.text3} strokeWidth={2} style={{ marginTop: 6 }} />
              <span style={{ fontSize: 13, color: t.text3, width: 56, paddingTop: 6 }}>Popisek</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Krátká poznámka…"
                rows={2}
                style={{
                  flex: 1, padding: "6px 10px", borderRadius: 7, border: `1px solid ${t.border}`,
                  background: t.input, color: t.text, fontSize: 13, outline: "none", resize: "vertical",
                  fontFamily: "'Figtree', sans-serif", lineHeight: 1.5,
                }}
              />
            </div>
          </div>
        )}

        {/* Bottom action bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 16px 14px",
          borderTop: expanded ? "none" : `1px solid ${t.border}`,
        }}>
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "7px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500,
              border: `1px solid ${expanded || hasExtras ? t.accent + "60" : t.border}`,
              background: expanded || hasExtras ? t.accentBg : "transparent",
              color: expanded || hasExtras ? t.accent : t.text3,
              cursor: "pointer", transition: "all .12s",
            }}
          >
            <Icon name={expanded ? "chevron-up" : "chevron-down"} size={13} color="currentColor" strokeWidth={2} />
            {hasExtras ? "Podrobnosti" : "Přidat podrobnosti"}
          </button>

          <div style={{ flex: 1 }} />

          <button
            onClick={handleAdd}
            disabled={!input.trim()}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "9px 20px", borderRadius: 10, border: "none",
              background: input.trim() ? t.accent : t.input,
              color: input.trim() ? "#fff" : t.text3,
              fontSize: 14, fontWeight: 700,
              cursor: input.trim() ? "pointer" : "default",
              transition: "background .15s",
            }}
          >
            <Icon name="plus" size={16} color="currentColor" strokeWidth={2.5} />
            Přidat
          </button>
        </div>
      </div>

      {/* Active todos */}
      {active.length === 0 && archived.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: t.text3 }}>
          <div style={{ marginBottom: 14, opacity: 0.2 }}>
            <Icon name="zap" size={48} color={t.text3} strokeWidth={1.5} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: t.text2, marginBottom: 6 }}>Prázdno</div>
          <div style={{ fontSize: 14 }}>Napiš co potřebuješ a stiskni Enter</div>
        </div>
      )}

      {active.length === 0 && archived.length > 0 && (
        <div style={{ textAlign: "center", padding: "32px 20px 24px", color: t.text3 }}>
          <Icon name="check-circle" size={36} color="#22c55e" strokeWidth={1.5} />
          <div style={{ fontSize: 15, fontWeight: 600, color: t.text2, marginTop: 8 }}>Vše hotovo!</div>
        </div>
      )}

      <div>
        {active.map((todo, idx) => (
          <SwipeableRow
            key={todo.id}
            todo={todo}
            onArchive={archiveQuickTodo}
            onDelete={deleteQuickTodo}
            t={t}
            isMobile={isMobile}
            hintOffset={idx === 0 && showSwipeHint ? hintOffset : 0}
          />
        ))}
      </div>

      {/* Archived */}
      {archived.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <button
              onClick={() => setArchiveOpen((v) => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                background: "none", border: "none", color: t.text3,
                fontSize: 13, fontWeight: 700, letterSpacing: ".06em",
                textTransform: "uppercase", cursor: "pointer", padding: "2px 0",
              }}
            >
              <Icon name={archiveOpen ? "chevron-down" : "chevron-right"} size={13} color={t.text3} strokeWidth={2} />
              Archiv
              <span style={{ background: t.input, borderRadius: 6, padding: "1px 7px", fontSize: 12, fontWeight: 500 }}>
                {archived.length}
              </span>
            </button>
            {archiveOpen && (
              <button
                onClick={clearArchivedQuickTodos}
                style={{ marginLeft: "auto", background: "none", border: "none", color: t.text3, fontSize: 13, cursor: "pointer", padding: "2px 0" }}
              >
                Smazat vše
              </button>
            )}
          </div>

          {archiveOpen && (
            <div className="fi">
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
