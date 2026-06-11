import React, { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { useToast } from "../components/Toast.jsx";
import Icon from "../components/Icon.jsx";
import { supabase } from "../supabase.js";

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("cs-CZ", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function timeAgo(value) {
  if (!value) return "—";
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "teď";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} d`;
  return formatDate(value);
}

function Avatar({ name, email }) {
  const label = (name || email || "?")[0].toUpperCase();
  const hue = [...(name || email || "")].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: 34, height: 34, borderRadius: "50%",
      background: `hsl(${hue},50%,45%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 800, fontSize: 14, flexShrink: 0,
    }}>
      {label}
    </div>
  );
}

function StatusChip({ banned }) {
  return banned
    ? <span style={{ padding: "2px 8px", borderRadius: 20, background: "var(--red-soft)", color: "var(--red)", fontSize: 11, fontWeight: 700 }}>zakázán</span>
    : <span style={{ padding: "2px 8px", borderRadius: 20, background: "var(--green-soft)", color: "var(--green)", fontSize: 11, fontWeight: 700 }}>aktivní</span>;
}

function ActionMenu({ user, onAction }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6, color: "var(--text-3)" }}
        title="Akce"
      >
        <Icon name="more-horizontal" size={16} />
      </button>
      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 100,
          background: "var(--surface)", border: "1px solid var(--border-soft)",
          borderRadius: 10, minWidth: 180, boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          overflow: "hidden",
        }}>
          {user.is_banned
            ? <MenuItem icon="check-circle" label="Povolit účet" onClick={() => { onAction("enable", user); setOpen(false); }} />
            : <MenuItem icon="ban" label="Zakázat účet" onClick={() => { onAction("disable", user); setOpen(false); }} tone="warn" />}
          <MenuItem icon="user-plus" label="Přidat do workspace" onClick={() => { onAction("add_to_workspace", user); setOpen(false); }} />
          <div style={{ borderTop: "1px solid var(--border-soft)", margin: "4px 0" }} />
          <MenuItem icon="trash-2" label="Smazat uživatele" onClick={() => { onAction("delete", user); setOpen(false); }} tone="danger" />
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick, tone = "default" }) {
  const color = tone === "danger" ? "var(--red)" : tone === "warn" ? "var(--amber, #f59e0b)" : "var(--text)";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%",
        padding: "9px 14px", background: "none", border: "none", cursor: "pointer",
        color, fontSize: 13, fontWeight: 600, textAlign: "left",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
    >
      <Icon name={icon} size={14} />
      {label}
    </button>
  );
}

function AddToWorkspaceModal({ user, onConfirm, onClose }) {
  const [wsId, setWsId] = useState("");
  const [role, setRole] = useState("member");

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "var(--surface)", borderRadius: 16, padding: 28, width: 380,
        border: "1px solid var(--border-soft)", boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
      }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800, color: "var(--text)" }}>
          Přidat do workspace
        </h3>
        <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--text-3)" }}>
          {user.display_name || user.email}
        </p>

        <label style={{ display: "block", marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", marginBottom: 5 }}>Workspace ID</div>
          <input
            autoFocus
            value={wsId}
            onChange={(e) => setWsId(e.target.value)}
            placeholder="uuid workspace"
            style={{
              width: "100%", padding: "9px 12px", borderRadius: 9, fontSize: 13,
              background: "var(--surface-2)", border: "1px solid var(--border-soft)",
              color: "var(--text)", outline: "none", boxSizing: "border-box",
            }}
          />
        </label>

        <label style={{ display: "block", marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", marginBottom: 5 }}>Role</div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{
              width: "100%", padding: "9px 12px", borderRadius: 9, fontSize: 13,
              background: "var(--surface-2)", border: "1px solid var(--border-soft)",
              color: "var(--text)", outline: "none",
            }}
          >
            <option value="member">Člen</option>
            <option value="admin">Admin</option>
            <option value="owner">Vlastník</option>
          </select>
        </label>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} className="btn">Zrušit</button>
          <button type="button" onClick={() => onConfirm(wsId.trim(), role)} className="btn primary" disabled={!wsId.trim()}>
            Přidat
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ user, onConfirm, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "var(--surface)", borderRadius: 16, padding: 28, width: 360,
        border: "1px solid var(--border-soft)", boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
      }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
          <Icon name="alert-triangle" size={22} color="var(--red)" />
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--text)" }}>Smazat uživatele?</h3>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-3)", lineHeight: 1.5 }}>
              Tato akce je nevratná. Smaže účet <strong style={{ color: "var(--text)" }}>{user.display_name || user.email}</strong> včetně všech dat.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} className="btn">Zrušit</button>
          <button type="button" onClick={onConfirm} className="btn" style={{ background: "var(--red-soft)", color: "var(--red)", border: "1px solid var(--red-soft)" }}>
            Smazat
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const { isSystemAdmin, setPage } = useApp();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [wsModal, setWsModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [actionPending, setActionPending] = useState(null);

  useEffect(() => {
    if (!isSystemAdmin) { setPage("dashboard"); return; }
    loadUsers();
  }, [isSystemAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadUsers() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("admin-users", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      setUsers(data.users ?? []);
    } catch (err) {
      toast.error("Nepodařilo se načíst uživatele: " + (err.message ?? err));
    } finally {
      setLoading(false);
    }
  }

  const callAction = useCallback(async (action, userId, extra = {}) => {
    setActionPending(userId + action);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke("admin-users", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: { action, user_id: userId, ...extra },
      });
      if (error) throw error;
      toast.success("Hotovo");
      await loadUsers();
    } catch (err) {
      toast.error(err.message ?? String(err));
    } finally {
      setActionPending(null);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleAction(type, user) {
    if (type === "delete") { setDeleteModal(user); return; }
    if (type === "add_to_workspace") { setWsModal(user); return; }
    callAction(type, user.id);
  }

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.email ?? "").toLowerCase().includes(q) || (u.display_name ?? "").toLowerCase().includes(q);
  });

  const activeCount = users.filter((u) => !u.is_banned).length;
  const bannedCount = users.filter((u) => u.is_banned).length;
  const totalTasks = users.reduce((s, u) => s + u.task_count, 0);

  return (
    <div style={{ padding: "28px 24px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => setPage("admin")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: "4px 6px", borderRadius: 6 }}
          title="Zpět na admin"
        >
          <Icon name="arrow-left" size={18} />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 850, color: "var(--text)" }}>Správa uživatelů</h1>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--text-3)" }}>Všichni registrovaní uživatelé aplikace</p>
        </div>
      </div>

      {/* Summary chips */}
      <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
        {[
          { label: "Celkem", value: users.length, icon: "users" },
          { label: "Aktivních", value: activeCount, icon: "check-circle", color: "var(--green)" },
          { label: "Zakázaných", value: bannedCount, icon: "ban", color: "var(--red)" },
          { label: "Úkolů celkem", value: totalTasks, icon: "check-square" },
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "var(--surface)", border: "1px solid var(--border-soft)",
            borderRadius: 10, padding: "8px 14px",
          }}>
            <Icon name={icon} size={14} color={color ?? "var(--accent)"} />
            <span style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 600 }}>{label}</span>
            <span style={{ fontSize: 15, fontWeight: 850, color: color ?? "var(--text)" }}>{value}</span>
          </div>
        ))}

        <div style={{ marginLeft: "auto" }}>
          <button type="button" onClick={loadUsers} className="btn" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="refresh-cw" size={13} />
            Obnovit
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 14, position: "relative" }}>
        <Icon name="search" size={14} color="var(--text-3)" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hledat podle jména nebo e-mailu…"
          style={{
            width: "100%", padding: "9px 12px 9px 32px", borderRadius: 10, fontSize: 13,
            background: "var(--surface)", border: "1px solid var(--border-soft)",
            color: "var(--text)", outline: "none", boxSizing: "border-box",
          }}
        />
      </div>

      {/* Table */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border-soft)", borderRadius: 14, overflow: "hidden" }}>
        {/* Table header */}
        <div style={{
          display: "grid", gridTemplateColumns: "2fr 1fr 1fr 60px 60px 80px 44px",
          padding: "10px 16px", borderBottom: "1px solid var(--border-soft)",
          fontSize: 11, fontWeight: 750, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em",
          gap: 8,
        }}>
          <span>Uživatel</span>
          <span>Registrace</span>
          <span>Naposledy aktivní</span>
          <span style={{ textAlign: "center" }}>Úkoly</span>
          <span style={{ textAlign: "center" }}>WS</span>
          <span style={{ textAlign: "center" }}>Stav</span>
          <span />
        </div>

        {loading && (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-3)", fontSize: 14 }}>
            Načítám…
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-3)", fontSize: 14 }}>
            {search ? "Žádní uživatelé neodpovídají hledání." : "Žádní uživatelé."}
          </div>
        )}

        {!loading && filtered.map((user, i) => (
          <div
            key={user.id}
            style={{
              display: "grid", gridTemplateColumns: "2fr 1fr 1fr 60px 60px 80px 44px",
              padding: "12px 16px", gap: 8, alignItems: "center",
              borderBottom: i < filtered.length - 1 ? "1px solid var(--border-soft)" : "none",
              opacity: actionPending?.startsWith(user.id) ? 0.5 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {/* Identity */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <Avatar name={user.display_name} email={user.email} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.display_name || <span style={{ color: "var(--text-3)", fontStyle: "italic" }}>bez jména</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.email}
                </div>
              </div>
            </div>

            {/* Registered */}
            <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>
              {formatDate(user.created_at)}
            </div>

            {/* Last seen */}
            <div style={{ fontSize: 12.5, color: "var(--text-2)" }} title={formatDate(user.last_seen_at ?? user.last_sign_in_at)}>
              {timeAgo(user.last_seen_at ?? user.last_sign_in_at)}
            </div>

            {/* Task count */}
            <div style={{ textAlign: "center", fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
              {user.task_count}
            </div>

            {/* Workspace count */}
            <div style={{ textAlign: "center", fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
              {user.workspace_count}
            </div>

            {/* Status */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <StatusChip banned={user.is_banned} />
            </div>

            {/* Actions */}
            <ActionMenu user={user} onAction={handleAction} />
          </div>
        ))}
      </div>

      <p style={{ marginTop: 12, fontSize: 11.5, color: "var(--text-3)" }}>
        {filtered.length} / {users.length} uživatelů
      </p>

      {/* Modals */}
      {wsModal && (
        <AddToWorkspaceModal
          user={wsModal}
          onConfirm={(wsId, role) => {
            setWsModal(null);
            callAction("add_to_workspace", wsModal.id, { workspace_id: wsId, role });
          }}
          onClose={() => setWsModal(null)}
        />
      )}
      {deleteModal && (
        <DeleteConfirmModal
          user={deleteModal}
          onConfirm={() => {
            const u = deleteModal;
            setDeleteModal(null);
            callAction("delete", u.id);
          }}
          onClose={() => setDeleteModal(null)}
        />
      )}
    </div>
  );
}
