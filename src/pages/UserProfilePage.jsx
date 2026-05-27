import React, { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { useConfirm } from '../components/Confirm.jsx'
import Icon from '../components/Icon.jsx'
import { supabase } from '../supabase.js'

export default function UserProfilePage() {
  const { t, setPage, isMobile, userEmail, userId, workspaceMembers, logout } = useApp();
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

  return (
    <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "16px" : "28px 32px", maxWidth: 560 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
        <button onClick={() => setPage("dashboard")} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", padding: 4, borderRadius: 6, display: "flex" }}>
          <Icon name="chevron-left" size={18} color={t.text3} strokeWidth={2} />
        </button>
        <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Outfit',sans-serif" }}>Můj profil</div>
      </div>

      {/* Avatar + email */}
      <div style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 12, padding: "20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20, fontWeight: 800, flexShrink: 0 }}>
          {initials}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{me?.displayName || "—"}</div>
          <div style={{ fontSize: 13, color: t.text2 }}>{userEmail}</div>
          <div style={{ fontSize: 12, color: t.text3, marginTop: 2 }}>{me?.role ?? "owner"} · {workspaceMembers.length} členů</div>
        </div>
      </div>

      {/* Display name */}
      <div style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Zobrazované jméno</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
            placeholder="Tvoje jméno…"
            style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 14 }}
          />
          <button onClick={handleSaveName} disabled={!displayName.trim() || saving} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: t.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: !displayName.trim() || saving ? 0.6 : 1 }}>
            {saving ? "Ukládám…" : "Uložit"}
          </button>
        </div>
        <div style={{ fontSize: 12, color: t.text3, marginTop: 6 }}>Toto jméno vidí ostatní členové workspace.</div>
      </div>

      {/* Password reset */}
      <div style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Heslo</div>
        {resetSent ? (
          <div style={{ fontSize: 13, color: "#22c55e" }}>Odkaz pro reset hesla byl odeslán na {userEmail}</div>
        ) : (
          <button onClick={handleResetPassword} style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${t.border}`, background: "transparent", color: t.text, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
            Odeslat odkaz pro reset hesla
          </button>
        )}
      </div>

      {/* Logout */}
      <div style={{ background: t.bg2, border: `1px solid #ef444430`, borderRadius: 12, padding: "18px 20px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Odhlášení</div>
        <button onClick={handleLogout} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #ef444440", background: "transparent", color: "#ef4444", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Odhlásit se
        </button>
      </div>
    </div>
  );
}
