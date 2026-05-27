import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import Icon from '../components/Icon.jsx'

/* ─────────────────────────────────────────────
   SwipeableRow
   Swipe left → archive. Desktop: hover reveals archive button.
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

  // Touch handlers
  const onTouchStart = (e) => {
    startXRef.current = e.touches[0].clientX;
    setSwiping(true);
  };
  const onTouchMove = (e) => {
    if (startXRef.current == null) return;
    const dx = e.touches[0].clientX - startXRef.current;
    if (dx > 0) return; // only left swipe
    setOffsetX(Math.max(dx, -160));
  };
  const onTouchEnd = () => {
    setSwiping(false);
    if (offsetX < -THRESHOLD) {
      triggerArchive();
    } else {
      setOffsetX(0);
    }
    startXRef.current = null;
  };

  const bgOpacity = Math.min(Math.abs(offsetX) / THRESHOLD, 1);

  return (
    <div
      style={{ position: "relative", overflow: "hidden", borderRadius: 10, marginBottom: 5 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Red archive background revealed on swipe */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: 10,
        background: `rgba(239,68,68,${bgOpacity * 0.85})`,
        display: "flex", alignItems: "center", justifyContent: "flex-end",
        paddingRight: 20,
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
          display: "flex", alignItems: "center", gap: 10,
          padding: "11px 14px",
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: 10,
          userSelect: "none",
          transform: exiting
            ? "translateX(-110%)"
            : `translateX(${offsetX + hintOffset}px)`,
          opacity: exiting ? 0 : 1,
          transition: swiping ? "none" : "transform .5s cubic-bezier(.4,0,.2,1), opacity .22s",
          cursor: isMobile ? "default" : "default",
          willChange: "transform",
        }}
      >
        {/* Circle archive button */}
        <button
          onClick={triggerArchive}
          title="Označit jako hotové"
          style={{
            width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
            border: `2px solid ${t.border}`,
            background: "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            transition: "border-color .15s, background .15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#22c55e";
            e.currentTarget.style.background = "#22c55e18";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = t.border;
            e.currentTarget.style.background = "transparent";
          }}
        />

        {/* Text */}
        <span style={{ flex: 1, fontSize: 14.5, color: t.text, lineHeight: 1.4 }}>
          {todo.text}
        </span>

        {/* Desktop: delete button on hover */}
        {!isMobile && (
          <button
            onClick={() => onDelete(todo.id)}
            title="Smazat"
            style={{
              opacity: hovered ? 0.6 : 0,
              transition: "opacity .15s",
              background: "none", border: "none",
              color: t.text3, cursor: "pointer", padding: "2px 4px",
              display: "flex", alignItems: "center",
            }}
          >
            <Icon name="x" size={14} color={t.text3} strokeWidth={2} />
          </button>
        )}

        {/* Mobile: chevron hint, always subtle */}
        {isMobile && (
          <span style={{ opacity: Math.max(0.12, 0.25 - Math.abs(offsetX) / 200), flexShrink: 0, transition: "opacity .1s" }}>
            <Icon name="chevron-left" size={14} color={t.text3} strokeWidth={2} />
          </span>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ArchivedRow — done item with restore / delete
───────────────────────────────────────────── */
function ArchivedRow({ todo, onRestore, onDelete, t }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 14px",
        borderRadius: 9,
        background: "transparent",
        marginBottom: 3,
        transition: "background .1s",
      }}
    >
      {/* Done checkmark */}
      <div style={{
        width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
        background: "#22c55e18", border: "2px solid #22c55e50",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon name="check" size={11} color="#22c55e" strokeWidth={2.5} />
      </div>

      <span style={{ flex: 1, fontSize: 13.5, color: t.text3, textDecoration: "line-through", lineHeight: 1.4 }}>
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
          title="Smazat"
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
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [hintOffset, setHintOffset] = useState(0);
  const inputRef = useRef(null);

  const active = quickTodos.filter((q) => !q.done);
  const archived = quickTodos.filter((q) => q.done);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Jednorázová swipe animace pro první návštěvu na mobilu
  useEffect(() => {
    if (!isMobile) return;
    if (localStorage.getItem(SWIPE_HINT_KEY)) return;
    if (active.length === 0) return;
    const t1 = setTimeout(() => setShowSwipeHint(true), 800);
    return () => clearTimeout(t1);
  }, [isMobile, active.length]);

  useEffect(() => {
    if (!showSwipeHint) return;
    // Animace: posunout doleva, pak zpět
    const t1 = setTimeout(() => setHintOffset(-55), 100);
    const t2 = setTimeout(() => setHintOffset(0), 700);
    const t3 = setTimeout(() => {
      setShowSwipeHint(false);
      localStorage.setItem(SWIPE_HINT_KEY, "1");
    }, 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [showSwipeHint]);

  const handleAdd = () => {
    const text = input.trim();
    if (!text) return;
    addQuickTodo(text);
    setInput("");
    inputRef.current?.focus();
  };

  return (
    <div style={{ padding: isMobile ? "16px 14px 80px" : "24px 28px 40px", maxWidth: 620, margin: "0 auto" }} className="fi">

      {/* Header */}
      <div style={{ marginBottom: isMobile ? 18 : 24 }}>
        <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, letterSpacing: "-0.7px", marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: isMobile ? 22 : 26 }}>⚡</span>
          Rychlý seznam
        </h1>
        <p style={{ fontSize: 13, color: t.text3 }}>
          Nakup, udělej, vyřiď. Swipe doleva = hotovo.
        </p>
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 8, marginBottom: isMobile ? 20 : 24 }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder="Co potřebuješ udělat nebo koupit…"
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: 12,
            border: `1.5px solid ${t.border}`,
            background: t.input,
            color: t.text,
            fontSize: 15,
            outline: "none",
            transition: "border-color .15s",
            fontFamily: "'Figtree', sans-serif",
          }}
          onFocus={(e) => { e.target.style.borderColor = t.accent; }}
          onBlur={(e) => { e.target.style.borderColor = t.border; }}
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim()}
          style={{
            width: 48, height: 48, borderRadius: 12, border: "none", flexShrink: 0,
            background: input.trim() ? t.accent : t.input,
            color: input.trim() ? "#fff" : t.text3,
            fontSize: 22, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: input.trim() ? "pointer" : "default",
            transition: "background .15s",
          }}
        >
          <Icon name="plus" size={22} color={input.trim() ? "#fff" : t.text3} strokeWidth={2.5} />
        </button>
      </div>

      {/* Active todos */}
      {active.length === 0 && archived.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: t.text3 }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.2 }}>⚡</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: t.text2, marginBottom: 6 }}>Prázdno</div>
          <div style={{ fontSize: 13 }}>Napiš co potřebuješ a stiskni Enter</div>
        </div>
      )}

      {active.length === 0 && archived.length > 0 && (
        <div style={{ textAlign: "center", padding: "32px 20px 24px", color: t.text3 }}>
          <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.5 }}>✓</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text2 }}>Vše hotovo!</div>
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

      {/* Archived section */}
      {archived.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <button
              onClick={() => setArchiveOpen((v) => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                background: "none", border: "none", color: t.text3,
                fontSize: 12, fontWeight: 700, letterSpacing: ".06em",
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
                style={{ marginLeft: "auto", background: "none", border: "none", color: t.text3, fontSize: 12, cursor: "pointer", padding: "2px 0" }}
              >
                Smazat vše
              </button>
            )}
          </div>

          {archiveOpen && (
            <div className="fi">
              {archived.map((todo) => (
                <ArchivedRow
                  key={todo.id}
                  todo={todo}
                  onRestore={restoreQuickTodo}
                  onDelete={deleteQuickTodo}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
