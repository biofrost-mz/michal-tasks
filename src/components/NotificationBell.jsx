import React, { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import Icon from './Icon.jsx'
import { parseYMD, startOfToday } from '../utils.js'
import { PRIORITIES } from '../constants.js'

function fmt(d) {
  return d.toISOString().slice(0, 10);
}

export default function NotificationBell({ compact = false }) {
  const { t, tasks, projects, setTaskDetail } = useApp();
  const [open, setOpen] = useState(false);
  const [fixedPos, setFixedPos] = useState({ top: 0, right: 0 });
  const ref = useRef(null);
  const btnRef = useRef(null);

  const today = startOfToday();
  const todayStr = fmt(today);
  const tomorrowStr = fmt(new Date(today.getTime() + 86400000));

  const active = tasks.filter((tk) => tk.status !== "done");

  const overdue  = active.filter((tk) => tk.dueDate && tk.dueDate < todayStr);
  const dueToday = active.filter((tk) => tk.dueDate === todayStr);
  const dueTomorrow = active.filter((tk) => tk.dueDate === tomorrowStr);

  const urgentCount = overdue.length + dueToday.length;

  const handleToggle = () => {
    if (!open && compact) {
      const rect = btnRef.current?.getBoundingClientRect();
      if (rect) setFixedPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const Section = ({ label, color, items, icon }) => {
    if (!items.length) return null;
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
          <Icon name={icon} size={10} color={color} strokeWidth={2.5} />
          {label}
          <span style={{ fontWeight: 500, color: t.text3, background: t.input, borderRadius: 6, padding: "0px 5px", fontSize: 10 }}>{items.length}</span>
        </div>
        {items.map((task) => {
          const proj = projects.find((p) => p.id === task.projectId);
          const pr = task.priority ? PRIORITIES[task.priority] : null;
          return (
            <div
              key={task.id}
              onClick={() => { setTaskDetail(task.id); setOpen(false); }}
              style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                padding: "7px 10px", borderRadius: 8, cursor: "pointer",
                border: `1px solid transparent`,
                transition: "background .1s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = t.card; e.currentTarget.style.borderColor = t.border; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
            >
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 5 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {task.title || "Bez názvu"}
                </div>
                <div style={{ display: "flex", gap: 5, marginTop: 2, alignItems: "center" }}>
                  {proj && (
                    <span style={{ fontSize: 11, color: t.text3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {proj.name}
                    </span>
                  )}
                  {pr && (
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: pr.color, background: pr.bg, padding: "0px 5px", borderRadius: 3, flexShrink: 0 }}>
                      {pr.label}
                    </span>
                  )}
                </div>
              </div>
              <Icon name="chevron-right" size={12} color={t.text3} strokeWidth={2} style={{ flexShrink: 0, marginTop: 3 }} />
            </div>
          );
        })}
      </div>
    );
  };

  const isEmpty = overdue.length === 0 && dueToday.length === 0 && dueTomorrow.length === 0;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        ref={btnRef}
        onClick={handleToggle}
        title="Připomínky"
        style={{
          position: "relative",
          display: "flex", alignItems: "center", gap: compact ? 0 : 9,
          padding: compact ? "7px 8px" : "9px 10px",
          borderRadius: 7, border: "none",
          background: open ? t.accentBg : "transparent",
          color: open ? t.accent : urgentCount > 0 ? "#f59e0b" : t.text2,
          fontSize: 14, fontWeight: open ? 600 : 400,
          width: compact ? "auto" : "100%",
          cursor: "pointer", transition: "all .12s",
        }}
      >
        <Icon name="bell" size={17} color={open ? t.accent : urgentCount > 0 ? "#f59e0b" : t.text2} strokeWidth={open ? 2.25 : 1.75} />
        {!compact && <span>Připomínky</span>}
        {urgentCount > 0 && (
          <span style={{
            position: compact ? "absolute" : "relative",
            top: compact ? 4 : "auto",
            right: compact ? 4 : "auto",
            marginLeft: compact ? 0 : "auto",
            minWidth: 18, height: 18, borderRadius: 9,
            background: "#ef4444", color: "#fff",
            fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 4px",
          }}>
            {urgentCount > 99 ? "99+" : urgentCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="pop"
          style={{
            position: compact ? "fixed" : "absolute",
            top: compact ? fixedPos.top : 0,
            right: compact ? fixedPos.right : "auto",
            left: compact ? "auto" : "calc(100% + 8px)",
            width: 320,
            background: t.bg2,
            border: `1px solid ${t.border}`,
            borderRadius: 14,
            boxShadow: t.shadow,
            zIndex: 500,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text, display: "flex", alignItems: "center", gap: 7 }}>
              <Icon name="bell" size={14} color={t.accent} strokeWidth={2} />
              Připomínky
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", padding: 2, display: "flex" }}>
              <Icon name="x" size={14} color={t.text3} strokeWidth={2} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: "12px 8px", maxHeight: 420, overflowY: "auto" }}>
            {isEmpty ? (
              <div style={{ textAlign: "center", padding: "28px 0", color: t.text3 }}>
                <div style={{ opacity: 0.2, display: "flex", justifyContent: "center", marginBottom: 10 }}>
                  <Icon name="check-circle" size={36} color={t.text} strokeWidth={0.75} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text2, marginBottom: 4 }}>Vše v pořádku</div>
                <div style={{ fontSize: 12 }}>Žádné blížící se ani prošlé termíny.</div>
              </div>
            ) : (
              <>
                <Section label="Prošlé termíny" color="#ef4444" items={overdue} icon="alert-circle" />
                <Section label="Dnes" color="#f59e0b" items={dueToday} icon="clock" />
                <Section label="Zítra" color="#3b82f6" items={dueTomorrow} icon="calendar" />
              </>
            )}
          </div>

          {!isEmpty && (
            <div style={{ padding: "8px 16px 12px", borderTop: `1px solid ${t.border}`, fontSize: 11, color: t.text3 }}>
              Celkem {urgentCount + dueTomorrow.length} blížících se termínů · Kliknutím otevřeš detail
            </div>
          )}
        </div>
      )}
    </div>
  );
}
