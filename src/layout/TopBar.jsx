import React, { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useConfirm } from '../components/Confirm.jsx'
import NotificationBell from '../components/NotificationBell.jsx'
import Icon from '../components/Icon.jsx'
import { PAGE_TITLES } from '../appMeta.js'

function UserButton() {
  const { t, userEmail, userId, workspaceMembers, logout, setPage } = useApp();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const me = workspaceMembers.find((m) => m.userId === userId);
  const displayName = me?.displayName || me?.email || userEmail || "Uživatel";
  const initials = displayName.slice(0, 2).toUpperCase();

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleLogout = async () => {
    if (!await confirm("Odhlásit se?")) return;
    await logout();
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "4px 8px 4px 4px", borderRadius: 20,
          border: `1px solid ${open ? t.borderH : t.border}`,
          background: open ? t.accentBg : t.input,
          cursor: "pointer", transition: "all .12s",
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "linear-gradient(135deg,#3b82f6,#8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0,
        }}>
          {initials}
        </div>
        <span style={{ fontSize: 13, fontWeight: 500, color: t.text, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {displayName}
        </span>
        <Icon name="chevron-down" size={12} color={t.text3} strokeWidth={2} />
      </button>

      {open && (
        <div
          className="pop"
          style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 500,
            background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 12,
            boxShadow: t.shadow, minWidth: 180, overflow: "hidden",
          }}
        >
          <div style={{ padding: "12px 14px 8px", borderBottom: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{displayName}</div>
            <div style={{ fontSize: 12, color: t.text3, marginTop: 2 }}>{userEmail}</div>
          </div>
          <div style={{ padding: "6px 6px" }}>
            <button
              onClick={() => { setPage("user-profile"); setOpen(false); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 8, border: "none", background: "transparent", color: t.text2, fontSize: 13, cursor: "pointer", textAlign: "left" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = t.card; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <Icon name="user" size={14} color={t.text3} strokeWidth={2} />
              Profil a nastavení
            </button>
            <button
              onClick={handleLogout}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 8, border: "none", background: "transparent", color: "#ef4444", fontSize: 13, cursor: "pointer", textAlign: "left" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#ef444410"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <Icon name="log-out" size={14} color="#ef4444" strokeWidth={2} />
              Odhlásit se
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TopBar() {
  const { t, page } = useApp();
  const title = PAGE_TITLES[page] || "";

  return (
    <div style={{
      height: 48, flexShrink: 0,
      borderBottom: `1px solid ${t.border}`,
      background: t.bg2,
      display: "flex", alignItems: "center",
      padding: "0 20px",
      gap: 12,
    }}>
      <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: t.text2 }}>
        {title}
      </div>
      <NotificationBell compact={true} />
      <UserButton />
    </div>
  );
}
