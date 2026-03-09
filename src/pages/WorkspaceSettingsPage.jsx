import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { useConfirm } from '../components/Confirm.jsx'
import Icon from '../components/Icon.jsx'

export default function WorkspaceSettingsPage() {
  const { t, workspaces, activeWorkspaceId, workspaceMembers, workspaceRole, userId,
    renameWorkspace, updateMemberRole, removeMember, leaveWorkspace,
    generateInviteLink, fetchWorkspaceInvites, revokeInvite, setPage, isMobile } = useApp();
  const toast = useToast();
  const confirm = useConfirm();

  const active = workspaces.find((w) => w.id === activeWorkspaceId);
  const [editingName, setEditingName] = useState(false);
  const [newWsName, setNewWsName] = useState(active?.name ?? "");
  const [invites, setInvites] = useState([]);
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteLink, setInviteLink] = useState("");
  const [loadingInvites, setLoadingInvites] = useState(false);

  const canManage = workspaceRole === "owner" || workspaceRole === "admin";
  const isOwner = workspaceRole === "owner";

  useEffect(() => {
    if (!canManage) return;
    setLoadingInvites(true);
    fetchWorkspaceInvites().then(setInvites).catch(() => {}).finally(() => setLoadingInvites(false));
  }, [activeWorkspaceId, canManage]);

  const handleRename = async () => {
    if (!newWsName.trim()) return;
    try {
      await renameWorkspace(newWsName);
      setEditingName(false);
      toast("Přejmenováno", "success");
    } catch (e) {
      toast(e.message || "Chyba", "error");
    }
  };

  const handleRoleChange = async (memberUserId, role) => {
    try {
      await updateMemberRole(memberUserId, role);
      toast("Role aktualizována", "success");
    } catch (e) {
      toast(e.message || "Chyba", "error");
    }
  };

  const handleRemove = async (member) => {
    if (!await confirm(`Odebrat ${member.email || member.userId.slice(0, 8)} z workspace?`)) return;
    try {
      await removeMember(member.userId);
      toast("Člen odebrán", "success");
    } catch (e) {
      toast(e.message || "Chyba", "error");
    }
  };

  const handleLeave = async () => {
    if (!await confirm("Opravdu chceš opustit tento workspace?")) return;
    try {
      await leaveWorkspace();
      setPage("dashboard");
      toast("Opustil jsi workspace", "success");
    } catch (e) {
      toast(e.message || "Chyba", "error");
    }
  };

  const handleGenerateLink = async () => {
    try {
      const link = await generateInviteLink(inviteRole);
      setInviteLink(link);
      const updated = await fetchWorkspaceInvites();
      setInvites(updated);
      toast("Odkaz vygenerován", "success");
    } catch (e) {
      toast(e.message || "Chyba", "error");
    }
  };

  const handleRevoke = async (inviteId) => {
    try {
      await revokeInvite(inviteId);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      toast("Pozvánka zrušena", "success");
    } catch (e) {
      toast(e.message || "Chyba", "error");
    }
  };

  const getMemberLabel = (m) => m.displayName || m.email || `${m.userId.slice(0, 8)}…`;
  const getInitials = (m) => (m.email || m.userId).slice(0, 2).toUpperCase();

  const roleColors = { owner: "#f59e0b", admin: "#3b82f6", member: "#22c55e", viewer: "#8b95a5" };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "16px" : "28px 32px", maxWidth: 700 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
        <button onClick={() => setPage("dashboard")} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", padding: 4, borderRadius: 6, display: "flex" }}>
          <Icon name="chevron-left" size={18} color={t.text3} strokeWidth={2} />
        </button>
        <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Outfit',sans-serif" }}>Nastavení workspace</div>
      </div>

      {/* Workspace name */}
      <div style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Název workspace</div>
        {editingName ? (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              autoFocus
              value={newWsName}
              onChange={(e) => setNewWsName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setEditingName(false); }}
              style={{ flex: 1, padding: "7px 10px", borderRadius: 7, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 14, fontWeight: 600 }}
            />
            <button onClick={handleRename} style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: t.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Uložit</button>
            <button onClick={() => setEditingName(false)} style={{ padding: "7px 12px", borderRadius: 7, border: `1px solid ${t.border}`, background: "transparent", color: t.text2, fontSize: 13, cursor: "pointer" }}>Zrušit</button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{active?.name}</div>
            {isOwner && (
              <button onClick={() => { setEditingName(true); setNewWsName(active?.name ?? ""); }} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", fontSize: 12, padding: "3px 8px", borderRadius: 5, border: `1px solid ${t.border}` }}>
                Přejmenovat
              </button>
            )}
          </div>
        )}
      </div>

      {/* Members */}
      <div style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
          Členové ({workspaceMembers.length})
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {workspaceMembers.map((m) => (
            <div key={m.userId} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: roleColors[m.role] + "22", border: `2px solid ${roleColors[m.role]}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: roleColors[m.role], flexShrink: 0 }}>
                {getInitials(m)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getMemberLabel(m)}</div>
                {m.email && m.displayName && <div style={{ fontSize: 11, color: t.text3 }}>{m.email}</div>}
              </div>
              {canManage && m.userId !== userId && m.role !== "owner" ? (
                <>
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                    style={{ padding: "4px 6px", borderRadius: 6, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 12, cursor: "pointer" }}
                  >
                    <option value="admin">admin</option>
                    <option value="member">member</option>
                    <option value="viewer">viewer</option>
                  </select>
                  <button onClick={() => handleRemove(m)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 4, borderRadius: 4, display: "flex" }}>
                    <Icon name="trash" size={13} color="#ef4444" strokeWidth={2} />
                  </button>
                </>
              ) : (
                <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, background: roleColors[m.role] + "18", color: roleColors[m.role], fontWeight: 600 }}>
                  {m.role}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invite link */}
      {canManage && (
        <div style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Pozvat člena</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {["member", "viewer", "admin"].map((r) => (
              <button key={r} onClick={() => { setInviteRole(r); setInviteLink(""); }} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${inviteRole === r ? t.accent : t.border}`, background: inviteRole === r ? t.accentBg : "transparent", color: inviteRole === r ? t.accent : t.text2, fontSize: 12, fontWeight: inviteRole === r ? 600 : 400, cursor: "pointer" }}>
                {r}
              </button>
            ))}
          </div>
          {inviteLink ? (
            <div>
              <div style={{ fontSize: 11, color: t.text2, marginBottom: 6 }}>Zkopíruj a pošli odkaz (platí 7 dní):</div>
              <div style={{ display: "flex", gap: 6 }}>
                <input readOnly value={inviteLink} style={{ flex: 1, padding: "7px 10px", borderRadius: 7, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 11 }} onClick={(e) => e.target.select()} />
                <button onClick={() => { navigator.clipboard.writeText(inviteLink); toast("Zkopírováno", "success"); }} style={{ padding: "7px 14px", borderRadius: 7, border: "none", background: t.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Kopírovat</button>
              </div>
              <button onClick={() => { setInviteLink(""); }} style={{ marginTop: 8, background: "none", border: "none", color: t.text3, fontSize: 11, cursor: "pointer", padding: 0 }}>Vygenerovat nový</button>
            </div>
          ) : (
            <button onClick={handleGenerateLink} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: t.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Vygenerovat pozvánkový odkaz
            </button>
          )}

          {/* Pending invites */}
          {invites.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: t.text3, marginBottom: 8 }}>Čekající pozvánky:</div>
              {invites.map((inv) => (
                <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: `1px solid ${t.border}` }}>
                  <div style={{ flex: 1, fontSize: 12 }}>
                    <span style={{ color: t.text2 }}>{inv.role}</span>
                    <span style={{ color: t.text3, fontSize: 10, marginLeft: 8 }}>vyprší {new Date(inv.expires_at).toLocaleDateString("cs-CZ")}</span>
                  </div>
                  <button onClick={() => handleRevoke(inv.id)} style={{ background: "none", border: "none", color: "#ef4444", fontSize: 11, cursor: "pointer" }}>Zrušit</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Leave / Danger zone */}
      <div style={{ background: t.bg2, border: `1px solid #ef444430`, borderRadius: 12, padding: "18px 20px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Nebezpečná zóna</div>
        {!isOwner && (
          <button onClick={handleLeave} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #ef444440", background: "transparent", color: "#ef4444", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Opustit workspace
          </button>
        )}
        {isOwner && workspaceMembers.length === 1 && (
          <div style={{ fontSize: 12, color: t.text3 }}>Workspace nelze opustit — jsi jediný člen. Nejdřív přidej dalšího ownera nebo workspace smaž.</div>
        )}
        {isOwner && workspaceMembers.length > 1 && (
          <div style={{ fontSize: 12, color: t.text3 }}>Jako owner nemůžeš workspace opustit. Předej ownership jinému členovi.</div>
        )}
      </div>
    </div>
  );
}
