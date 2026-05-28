import React, { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { useConfirm } from '../components/Confirm.jsx'
import Icon from '../components/Icon.jsx'
import { supabase } from '../supabase.js'

export default function UserProfilePage() {
  const { setPage, isMobile, userEmail, userId, workspaceMembers, logout } = useApp();
  const toast = useToast();
  const confirm = useConfirm();

  const me = workspaceMembers.find((m) => m.userId === userId);
  const [displayName, setDisplayName] = useState(me?.displayName || "");
  const [saving, setSaving] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("user_profiles").upsert(
        { id: userId, display_name: displayName.trim(), email: userEmail },
        { onConflict: "id" }
      );
      if (error) throw error;
      toast("Jméno uloženo", "success");
    } catch (e) {
      toast(e.message || "Chyba", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: `${window.location.origin}?reset=1`,
    });
    if (error) { toast(error.message || "Chyba", "error"); return; }
    setResetSent(true);
    toast("Odkaz pro reset hesla odeslán na email", "success");
  };

  const handleLogout = async () => {
    if (!await confirm("Odhlásit se?")) return;
    await logout();
  };

  const initials = (me?.displayName || userEmail || "?").slice(0, 2).toUpperCase();

  const panel = {
    background: "var(--surface)",
    border: "1px solid var(--border-soft)",
    borderRadius: 14,
    padding: isMobile ? "14px" : "16px 18px",
  };
  const inputStyle = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 9,
    border: "1px solid var(--border-soft)",
    background: "var(--bg-2)",
    color: "var(--text)",
    fontSize: 13,
    outline: "none",
  };
  const sectionLabel = {
    fontFamily: "var(--mono)",
    fontSize: 10.5,
    color: "var(--text-4)",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: 10,
  };

  return (
    <div className="content" style={{ maxWidth: 900 }}>
      <div className="ph">
        <div>
          <button className="ph-eyebrow" style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }} onClick={() => setPage("dashboard")}>
            ← Workspace
          </button>
          <h1 className="ph-title">Profil</h1>
          <div className="ph-sub">
            <span>{userEmail}</span>
            <span className="dot" />
            <span>{workspaceMembers.length} členů v týmu</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        <section style={{ ...panel, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,var(--accent),var(--accent-2))", color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 20, fontWeight: 700, boxShadow: "0 0 12px var(--accent-glow)", flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 30, fontStyle: "italic", lineHeight: 1.05, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {me?.displayName || "Bez jména"}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-2)" }}>{userEmail}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--text-4)", marginTop: 2 }}>
              role {me?.role ?? "owner"}
            </div>
          </div>
        </section>

        <section style={panel}>
          <div style={sectionLabel}>Zobrazované Jméno</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              placeholder="Tvoje jméno..."
              style={{ ...inputStyle, flex: 1, minWidth: 220 }}
            />
            <button className="btn primary" onClick={handleSaveName} disabled={!displayName.trim() || saving} style={{ opacity: !displayName.trim() || saving ? 0.6 : 1 }}>
              {saving ? "Ukládám..." : "Uložit"}
            </button>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 7 }}>Tohle jméno vidí ostatní členové workspace.</div>
        </section>

        <section style={panel}>
          <div style={sectionLabel}>Heslo</div>
          {resetSent ? (
            <div style={{ fontSize: 13, color: "var(--green)" }}>Odkaz pro reset hesla byl odeslán na {userEmail}.</div>
          ) : (
            <button className="btn" onClick={handleResetPassword}>Odeslat odkaz pro reset hesla</button>
          )}
        </section>

        <section style={{ ...panel, borderColor: "rgba(239,68,68,.28)" }}>
          <div style={{ ...sectionLabel, color: "var(--red)" }}>Odhlášení</div>
          <button className="btn danger" onClick={handleLogout}>Odhlásit se</button>
        </section>
      </div>
    </div>
  );
}
