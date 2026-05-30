import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import Icon from '../components/Icon.jsx'
import { PrioChip, TagPill } from '../components/atlas/AtlasTaskCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { triggerConfettiBurst } from '../utils.js'

const PRIORITY_CONFIG = {
  low:    { label: "Nízká",   color: "#22c55e", bg: "#22c55e18" },
  medium: { label: "Střední", color: "#f59e0b", bg: "#f59e0b18" },
  high:   { label: "Vysoká",  color: "#ef4444", bg: "#ef444418" },
};

/* ─────────────────────────────────────────────
   QuickTodoCard — Atlas .tcard design with swipe support
───────────────────────────────────────────── */
function QuickTodoCard({ todo, onArchive, onDelete, isMobile, hintOffset = 0 }) {
  const { updateQuickTodo } = useApp();
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [exiting, setExiting] = useState(false);
  const startXRef = useRef(null);
  const hasSwipedRef = useRef(false);
  const THRESHOLD = 80;

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text || "");
  const [editDesc, setEditDesc] = useState(todo.description || "");
  const [editPrio, setEditPrio] = useState(todo.priority || "");
  const [editDue, setEditDue] = useState(todo.dueDate || "");
  const [editTags, setEditTags] = useState(todo.tags ? todo.tags.join(", ") : "");

  const triggerArchive = useCallback(() => {
    setExiting(true);
    setTimeout(() => onArchive(todo.id), 260);
  }, [onArchive, todo.id]);

  const onTouchStart = (e) => {
    startXRef.current = e.touches[0].clientX;
    hasSwipedRef.current = false;
    setSwiping(true);
  };
  const onTouchMove = (e) => {
    if (startXRef.current == null) return;
    const dx = e.touches[0].clientX - startXRef.current;
    if (dx > 0) return;
    if (Math.abs(dx) > 15) {
      hasSwipedRef.current = true;
    }
    setOffsetX(Math.max(dx, -160));
  };
  const onTouchEnd = () => {
    setSwiping(false);
    if (offsetX < -THRESHOLD) triggerArchive();
    else setOffsetX(0);
    startXRef.current = null;
  };

  const bgOpacity = Math.min(Math.abs(offsetX) / THRESHOLD, 1);

  // Map quickTodo to a visual status — active items are "todo"
  const statusClass = "todo";

  const swipeWrap = isMobile ? {
    position: "relative",
    overflow: "hidden",
    borderRadius: "var(--r, 14px)",
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
          background: `rgba(34,197,94,${bgOpacity * 0.85})`,
          display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 20,
          transition: swiping ? "none" : "background .2s",
          borderRadius: "inherit",
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <Icon name="check" size={20} color="var(--bg)" strokeWidth={2.5} />
            <span style={{ fontSize: 12, color: "var(--bg)", fontWeight: 700 }}>Hotovo</span>
          </div>
        </div>
      )}

      <div
        className={`tcard ${statusClass}`}
        onTouchStart={isMobile ? onTouchStart : undefined}
        onTouchMove={isMobile ? onTouchMove : undefined}
        onTouchEnd={isMobile ? onTouchEnd : undefined}
        onClick={() => {
          if (hasSwipedRef.current) return;
          if (Math.abs(offsetX) > 5) return;
          setIsEditing(true);
        }}
        style={isMobile ? {
          transform: exiting ? "translateX(-110%)" : `translateX(${offsetX + hintOffset}px)`,
          opacity: exiting ? 0 : 1,
          transition: swiping ? "none" : "transform .5s cubic-bezier(.4,0,.2,1), opacity .22s",
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

  useEffect(() => { if (!isMobile) inputRef.current?.focus(); }, [isMobile]);

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
  const panelBorder = "var(--border-soft)";
  const inputBg = "var(--bg-2)";

  return (
    <div className="content">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Nakup · udělej · vyřiď</div>
          <h1 className="ph-title">Rychlý seznam</h1>
          <div className="ph-sub"><span>{active.length} položek</span><span className="dot" /><span>nejjednodušší capture</span></div>
        </div>
      </div>

      {/* QuickAdd — Atlas design */}
      <div className="quickadd">
        <span className="quickadd-plus">+</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !expanded) handleAdd(); }}
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

      {/* Active todos — Atlas .tcard cards */}
      {active.length === 0 && archived.length === 0 && (
        <EmptyState
          type="todos"
          title="Žádné položky"
          description="Napiš co potřebuješ a stiskni Enter nebo klikni na + Přidat."
          action={() => inputRef.current?.focus()}
          actionLabel="Vytvořit první úkol"
        />
      )}

      {active.length === 0 && archived.length > 0 && (
        <div style={{ textAlign: "center", padding: "32px 20px 24px", color: "var(--text-3)" }}>
          <Icon name="check-circle" size={36} color="#22c55e" strokeWidth={1.5} />
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-2)", marginTop: 8 }}>Vše hotovo!</div>
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
                onClick={clearArchivedQuickTodos}
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
