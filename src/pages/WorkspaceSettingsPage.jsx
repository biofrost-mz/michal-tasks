import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { useConfirm } from '../components/Confirm.jsx'
import Icon from '../components/Icon.jsx'
import { formatDate } from '../locale.js'

export default function WorkspaceSettingsPage() {
  const { workspaces, activeWorkspaceId, workspaceMembers, workspaceRole, userId,
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
    <div className="content" style={{ maxWidth: 980 }}>
      <div className="ph">
        <div>
          <button className="ph-eyebrow" style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }} onClick={() => setPage("dashboard")}>
            ← Workspace
          </button>
          <h1 className="ph-title">Nastavení</h1>
          <div className="ph-sub">
            <span>{active?.name || "Workspace"} · role {workspaceRole}</span>
            <span className="dot" />
            <span>{workspaceMembers.length} členů</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        <section style={panel}>
          <div style={sectionLabel}>Název Workspace</div>
          {editingName ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                autoFocus
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setEditingName(false); }}
                style={{ ...inputStyle, flex: 1, minWidth: 220 }}
              />
              <button className="btn primary" onClick={handleRename}>Uložit</button>
              <button className="btn" onClick={() => setEditingName(false)}>Zrušit</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 30, lineHeight: 1.05 }}>{active?.name || "Bez názvu"}</div>
              {isOwner && <button className="btn" onClick={() => { setEditingName(true); setNewWsName(active?.name ?? ""); }}>Přejmenovat</button>}
            </div>
          )}
        </section>

        <section style={panel}>
          <div style={sectionLabel}>Členové ({workspaceMembers.length})</div>
          <div style={{ border: "1px solid var(--border-soft)", borderRadius: 10, overflow: "hidden" }}>
            {workspaceMembers.map((m, idx) => (
              <div key={m.userId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: idx === workspaceMembers.length - 1 ? "none" : "1px solid var(--border-soft)", background: idx % 2 ? "var(--bg-2)" : "transparent" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: roleColors[m.role] + "22", border: `1px solid ${roleColors[m.role]}55`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 11.5, color: roleColors[m.role], flexShrink: 0 }}>
                  {getInitials(m)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{getMemberLabel(m)}</div>
                  {m.email && m.displayName && <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>{m.email}</div>}
                </div>

                {canManage && m.userId !== userId && m.role !== "owner" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                      style={{ ...inputStyle, width: 90, padding: "6px 8px", fontSize: 12 }}
                    >
                      <option value="admin">admin</option>
                      <option value="member">member</option>
                      <option value="viewer">viewer</option>
                    </select>
                    <button className="btn danger" style={{ padding: "7px 10px" }} onClick={() => handleRemove(m)}>
                      <Icon name="trash" size={12} color="currentColor" strokeWidth={2} />
                    </button>
                  </div>
                ) : (
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, padding: "3px 8px", borderRadius: 999, border: `1px solid ${roleColors[m.role]}44`, color: roleColors[m.role], background: roleColors[m.role] + "18", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {m.role}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        {canManage && (
          <section style={panel}>
            <div style={sectionLabel}>Pozvat Člena</div>
            <div className="chips" style={{ marginBottom: 12 }}>
              {["member", "viewer", "admin"].map((r) => (
                <button key={r} className={`chip ${inviteRole === r ? "active" : ""}`} onClick={() => { setInviteRole(r); setInviteLink(""); }}>
                  {r}
                </button>
              ))}
            </div>

            {inviteLink ? (
              <div>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 8 }}>Odkaz platí 7 dní.</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input readOnly value={inviteLink} style={{ ...inputStyle, flex: 1, minWidth: 240 }} onClick={(e) => e.target.select()} />
                  <button className="btn primary" onClick={() => { navigator.clipboard.writeText(inviteLink); toast("Zkopírováno", "success"); }}>Kopírovat</button>
                  <button className="btn" onClick={() => { setInviteLink(""); }}>Nový</button>
                </div>
              </div>
            ) : (
              <button className="btn primary" onClick={handleGenerateLink}>Vygenerovat odkaz</button>
            )}

            <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-3)" }}>
              {loadingInvites ? "Načítám pozvánky..." : `Čekající pozvánky: ${invites.length}`}
            </div>
            {invites.length > 0 && (
              <div style={{ marginTop: 8, border: "1px solid var(--border-soft)", borderRadius: 10, overflow: "hidden" }}>
                {invites.map((inv, idx) => (
                  <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderBottom: idx === invites.length - 1 ? "none" : "1px solid var(--border-soft)", background: idx % 2 ? "var(--bg-2)" : "transparent" }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text)" }}>{inv.role}</span>
                    <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>vyprší {formatDate(inv.expires_at, { day: "numeric", month: "numeric", year: "numeric" })}</span>
                    <span style={{ flex: 1 }} />
                    <button className="btn danger" style={{ padding: "5px 9px" }} onClick={() => handleRevoke(inv.id)}>Zrušit</button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section style={{ ...panel, borderColor: "rgba(239,68,68,.28)" }}>
          <div style={{ ...sectionLabel, color: "var(--red)" }}>Nebezpečná Zóna</div>
          {!isOwner && (
            <button className="btn danger" onClick={handleLeave}>Opustit workspace</button>
          )}
          {isOwner && workspaceMembers.length === 1 && (
            <div style={{ fontSize: 12, color: "var(--text-3)" }}>Workspace nelze opustit, jsi jediný člen.</div>
          )}
          {isOwner && workspaceMembers.length > 1 && (
            <div style={{ fontSize: 12, color: "var(--text-3)" }}>Jako owner nemůžeš workspace opustit. Nejprve předej ownership.</div>
          )}
        </section>
      </div>
    </div>
  );
}
