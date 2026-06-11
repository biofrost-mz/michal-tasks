import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { useConfirm } from '../components/Confirm.jsx'
import Icon from '../components/Icon.jsx'
import { formatDate } from '../locale.js'
import { usePushNotifications } from '../hooks/usePushNotifications.js'
import { supabase } from '../supabase.js'

const roleColors = { owner: '#f59e0b', admin: '#3b82f6', member: '#22c55e', viewer: '#8b95a5' }

const defaultPages = [
  { id: 'dashboard', label: 'Přehled' },
  { id: 'tasks', label: 'Úkoly' },
  { id: 'quick-todos', label: 'Rychlý seznam' },
  { id: 'projects', label: 'Projekty' },
  { id: 'timeline', label: 'Plán' },
  { id: 'notes', label: 'Poznámky' },
]

const tabs = [
  { id: 'account', label: 'Účet', icon: 'user' },
  { id: 'workspace', label: 'Workspace', icon: 'settings' },
  { id: 'members', label: 'Členové', icon: 'users' },
  { id: 'notifications', label: 'Notifikace', icon: 'bell' },
  { id: 'app', label: 'Aplikace', icon: 'sliders-horizontal' },
]

const DEFAULT_NOTIF_PREFS = {
  email_task_reminders: true,
  email_daily_digest: true,
  push_task_reminders: true,
  push_daily_digest: true,
  digest_hour: 8,
}

function roleColor(role) {
  return roleColors[role] || roleColors.member
}

function Section({ label, title, description, icon, tone = 'default', children, action, className = '' }) {
  const toneStyles = tone === 'danger'
    ? { borderColor: 'rgba(239,68,68,.28)', background: 'linear-gradient(180deg, rgba(239,68,68,.045), var(--surface))' }
    : tone === 'accent'
      ? { borderColor: 'color-mix(in srgb, var(--accent) 28%, var(--border-soft))', background: 'linear-gradient(180deg, var(--accent-soft), var(--surface) 58%)' }
      : null

  return (
    <section className={`ws-card ${className}`} style={toneStyles || undefined}>
      <div className="ws-card-head">
        <div className="ws-card-title-wrap">
          {icon && <span className={`ws-card-icon ${tone}`}><Icon name={icon} size={15} color="currentColor" strokeWidth={2} /></span>}
          <div>
            {label && <div className={`ws-section-label ${tone}`}>{label}</div>}
            {title && <div className="ws-card-title">{title}</div>}
            {description && <div className="ws-card-desc">{description}</div>}
          </div>
        </div>
        {action}
      </div>
      {children && <div className="ws-card-body">{children}</div>}
    </section>
  )
}

function MetaPill({ children, tone = 'default' }) {
  return <span className={`ws-meta-pill ${tone}`}>{children}</span>
}

function FormHint({ children }) {
  return <div className="ws-form-hint">{children}</div>
}

export default function WorkspaceSettingsPage({ initialTab = 'workspace' }) {
  const { workspaces, activeWorkspaceId, workspaceMembers, workspaceRole, userId,
    renameWorkspace, updateMemberRole, removeMember, leaveWorkspace,
    generateInviteLink, fetchWorkspaceInvites, revokeInvite, setPage, isMobile,
    userEmail, logout, updateProfileDisplayName, dk, setDk,
    uiSettings, updateUiSettings, accentThemes, isSystemAdmin } = useApp()
  const toast = useToast()
  const confirm = useConfirm()
  const push = usePushNotifications()

  const active = workspaces.find((w) => w.id === activeWorkspaceId)
  const me = workspaceMembers.find((m) => m.userId === userId)
  const [activeTab, setActiveTab] = useState(initialTab)
  const [editingName, setEditingName] = useState(false)
  const [newWsName, setNewWsName] = useState(active?.name ?? '')
  const [invites, setInvites] = useState([])
  const [inviteRole, setInviteRole] = useState('member')
  const [inviteLink, setInviteLink] = useState('')
  const [loadingInvites, setLoadingInvites] = useState(false)
  const [displayName, setDisplayName] = useState(me?.displayName || '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const [notifPrefs, setNotifPrefs] = useState(DEFAULT_NOTIF_PREFS)
  const [savingNotif, setSavingNotif] = useState(false)

  const canManage = workspaceRole === 'owner' || workspaceRole === 'admin'
  const isOwner = workspaceRole === 'owner'

  useEffect(() => {
    if (!canManage) return
    setLoadingInvites(true)
    fetchWorkspaceInvites().then(setInvites).catch(() => {}).finally(() => setLoadingInvites(false))
  }, [activeWorkspaceId, canManage, fetchWorkspaceInvites])

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  useEffect(() => {
    setNewWsName(active?.name ?? '')
  }, [active?.name])

  useEffect(() => {
    setDisplayName(me?.displayName || '')
  }, [me?.displayName])

  useEffect(() => {
    if (!userId) return;
    supabase.from("notification_preferences").select("*").eq("user_id", userId).single()
      .then(({ data }) => { if (data) setNotifPrefs({ ...DEFAULT_NOTIF_PREFS, ...data }); });
  }, [userId]);

  const handleSaveNotifPrefs = async (patch) => {
    const updated = { ...notifPrefs, ...patch };
    setNotifPrefs(updated);
    setSavingNotif(true);
    const { error } = await supabase.from("notification_preferences").upsert({ user_id: userId, ...updated, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    setSavingNotif(false);
    if (error) toast("Nepodařilo se uložit nastavení", "error");
  };

  const handleSaveName = async () => {
    if (!displayName.trim()) return
    setSavingProfile(true)
    try {
      await updateProfileDisplayName(displayName.trim())
      toast('Jméno uloženo', 'success')
    } catch (e) {
      toast(e.message || 'Chyba', 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleResetPassword = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: `${window.location.origin}?reset=1`,
    })
    if (error) { toast(error.message || 'Chyba', 'error'); return }
    setResetSent(true)
    toast('Odkaz pro reset hesla odeslán na email', 'success')
  }

  const handleLogout = async () => {
    if (!await confirm('Odhlásit se?')) return
    await logout()
  }

  const handleRename = async () => {
    if (!newWsName.trim()) return
    try {
      await renameWorkspace(newWsName.trim())
      setEditingName(false)
      toast('Přejmenováno', 'success')
    } catch (e) {
      toast(e.message || 'Chyba', 'error')
    }
  }

  const handleRoleChange = async (memberUserId, role) => {
    try {
      await updateMemberRole(memberUserId, role)
      toast('Role aktualizována', 'success')
    } catch (e) {
      toast(e.message || 'Chyba', 'error')
    }
  }

  const handleRemove = async (member) => {
    if (!await confirm(`Odebrat ${member.email || member.userId.slice(0, 8)} z workspace?`)) return
    try {
      await removeMember(member.userId)
      toast('Člen odebrán', 'success')
    } catch (e) {
      toast(e.message || 'Chyba', 'error')
    }
  }

  const handleLeave = async () => {
    if (!await confirm('Opravdu chceš opustit tento workspace?')) return
    try {
      await leaveWorkspace()
      setPage('dashboard')
      toast('Opustil jsi workspace', 'success')
    } catch (e) {
      toast(e.message || 'Chyba', 'error')
    }
  }

  const handleGenerateLink = async () => {
    try {
      const link = await generateInviteLink(inviteRole)
      setInviteLink(link)
      const updated = await fetchWorkspaceInvites()
      setInvites(updated)
      toast('Odkaz vygenerován', 'success')
    } catch (e) {
      toast(e.message || 'Chyba', 'error')
    }
  }

  const handleRevoke = async (inviteId) => {
    try {
      await revokeInvite(inviteId)
      setInvites((prev) => prev.filter((i) => i.id !== inviteId))
      toast('Pozvánka zrušena', 'success')
    } catch (e) {
      toast(e.message || 'Chyba', 'error')
    }
  }

  const getMemberLabel = (m) => m.displayName || m.email || `${m.userId.slice(0, 8)}…`
  const getInitials = (m) => (m.displayName || m.email || m.userId || '?').slice(0, 2).toUpperCase()
  const profileInitials = (me?.displayName || userEmail || '?').slice(0, 2).toUpperCase()

  const inputStyle = {
    width: '100%',
    padding: isMobile ? '11px 12px' : '9px 12px',
    borderRadius: 11,
    border: '1px solid var(--border-soft)',
    background: 'var(--bg-2)',
    color: 'var(--text)',
    fontSize: isMobile ? 16 : 13,
    outline: 'none',
  }

  const mutedText = { fontSize: 13, color: 'var(--text-3)', lineHeight: 1.55 }
  const segmentedButton = (active) => ({
    padding: isMobile ? '9px 11px' : '8px 11px',
    borderRadius: 10,
    border: `1px solid ${active ? 'color-mix(in srgb, var(--accent) 38%, transparent)' : 'var(--border-soft)'}`,
    background: active ? 'var(--accent-soft)' : 'var(--bg-2)',
    color: active ? 'var(--accent)' : 'var(--text-2)',
    fontSize: 12,
    fontWeight: active ? 850 : 650,
  })
  const toggleStyle = (on) => ({
    width: 46,
    height: 26,
    borderRadius: 999,
    border: `1px solid ${on ? 'color-mix(in srgb, var(--accent) 36%, transparent)' : 'var(--border-soft)'}`,
    background: on ? 'var(--accent-soft)' : 'var(--bg-2)',
    position: 'relative',
    padding: 0,
    flexShrink: 0,
  })
  const toggleKnobStyle = (on) => ({
    position: 'absolute',
    top: 3,
    left: on ? 23 : 3,
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: on ? 'var(--accent)' : 'var(--text-3)',
    transition: 'left .16s ease, background .16s ease',
  })

  return (
    <div className="content workspace-settings-page">
      <style>{`
        body:has(.workspace-settings-page) .fab{display:none!important;}
        .workspace-settings-page{max-width:880px;margin:0 auto;box-sizing:border-box;}
        .workspace-settings-page *{box-sizing:border-box;}
        .ws-settings-hero{margin-bottom:20px;}
        .ws-back{border:0;background:none;padding:0;cursor:pointer;color:var(--accent);font-family:var(--mono);font-size:11px;font-weight:850;text-transform:uppercase;letter-spacing:.12em;}
        .ws-settings-title{margin:10px 0 9px;font-family:var(--font-ui);font-size:30px;line-height:1.05;color:var(--text);letter-spacing:-.03em;font-weight:720;}
        .ws-settings-meta{display:flex;align-items:center;gap:7px;flex-wrap:wrap;color:var(--text-3);font-family:var(--mono);font-size:11.5px;}
        .ws-meta-pill{display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:999px;border:1px solid var(--border-soft);background:var(--surface);color:var(--text-2);font-family:var(--mono);font-size:11px;font-weight:750;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .ws-meta-pill.role{color:var(--accent);background:var(--accent-soft);border-color:color-mix(in srgb,var(--accent) 28%,var(--border-soft));text-transform:uppercase;}
        .ws-settings-layout{display:grid;grid-template-columns:200px minmax(0,1fr);gap:18px;align-items:start;}
        .ws-settings-tabs{position:sticky;top:16px;background:var(--surface);border:1px solid var(--border-soft);border-radius:14px;padding:6px;}
        .ws-settings-tabs-inner{display:grid;gap:3px;}
        .ws-tab{display:flex;align-items:center;gap:9px;width:100%;padding:9px 11px;border-radius:10px;border:1px solid transparent;background:transparent;color:var(--text-2);font-size:13px;font-weight:600;text-align:left;cursor:pointer;}
        .ws-tab:hover{background:var(--bg-2);}
        .ws-tab.active{background:var(--accent-soft);color:var(--accent);font-weight:800;border-color:color-mix(in srgb,var(--accent) 22%,transparent);}
        .ws-settings-panels{display:grid;gap:10px;min-width:0;}
        .ws-card{background:var(--surface);border:1px solid var(--border-soft);border-radius:14px;padding:16px;min-width:0;}
        .ws-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;}
        .ws-card-title-wrap{display:flex;gap:11px;align-items:flex-start;min-width:0;flex:1;}
        .ws-card-icon{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;color:var(--accent);background:var(--accent-soft);flex:0 0 auto;}
        .ws-card-icon.danger{color:var(--red);background:var(--red-soft);}
        .ws-section-label{font-family:var(--mono);font-size:10px;color:var(--text-4);text-transform:uppercase;letter-spacing:.1em;margin-bottom:5px;font-weight:850;}
        .ws-section-label.danger{color:var(--red);}
        .ws-card-title{font-size:14.5px;color:var(--text);font-weight:800;line-height:1.3;}
        .ws-card-desc{font-size:12.5px;color:var(--text-3);line-height:1.5;margin-top:4px;}
        .ws-card-body{margin-top:14px;}
        .ws-profile-card{display:flex;align-items:center;gap:14px;}
        .ws-avatar{width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent-2));color:var(--bg);display:grid;place-items:center;font-family:var(--mono);font-size:17px;font-weight:850;flex:0 0 auto;}
        .ws-profile-name{font-family:var(--font-ui);font-size:18px;font-weight:650;line-height:1.2;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.01em;}
        .ws-profile-mail{font-size:13px;color:var(--text-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:1px;}
        .ws-profile-role{display:inline-flex;margin-top:7px;padding:3px 8px;border-radius:999px;border:1px solid var(--border-soft);background:var(--bg-2);font-family:var(--mono);font-size:10px;color:var(--text-3);text-transform:uppercase;font-weight:850;}
        .ws-form-row{display:flex;gap:8px;flex-wrap:wrap;}
        .ws-form-hint{font-size:12px;color:var(--text-3);margin-top:8px;line-height:1.45;}
        .ws-danger-button{width:auto;}
        .ws-system-action{display:flex;align-items:center;gap:6px;flex:0 0 auto;}
        .ws-member-list,.ws-invite-list{border:1px solid var(--border-soft);border-radius:11px;overflow:hidden;}
        .ws-member-row,.ws-invite-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--border-soft);background:var(--surface);}
        .ws-member-row:nth-child(even),.ws-invite-row:nth-child(even){background:var(--bg-2);}
        .ws-member-row:last-child,.ws-invite-row:last-child{border-bottom:0;}
        .ws-member-avatar{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-family:var(--mono);font-size:11.5px;font-weight:850;flex:0 0 auto;}
        .ws-role-badge{font-family:var(--mono);font-size:10.5px;padding:3px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:.06em;font-weight:850;}
        .ws-mobile-break{display:flex;align-items:center;justify-content:space-between;gap:14px;}
        @media(max-width:767px){
          .workspace-settings-page{padding:16px 16px 96px!important;max-width:none!important;overflow-x:clip;}
          .ws-card{max-width:100%;overflow-wrap:break-word;padding:15px;border-radius:14px;}
          .ws-card-head{flex-direction:column;align-items:stretch;gap:13px;}
          .ws-form-row input,.ws-form-row .ws-input,.ws-card input,.ws-card select,.ws-card textarea{min-width:0!important;max-width:100%;}
          .ws-settings-hero{margin-bottom:14px;}
          .ws-settings-title{font-size:25px;margin:9px 0 9px;}
          .ws-settings-meta{gap:6px;font-size:11px;}
          .ws-meta-pill{padding:4px 8px;font-size:10.5px;}
          .ws-settings-layout{grid-template-columns:1fr;gap:14px;}
          .ws-settings-tabs{position:sticky;top:0;z-index:20;margin:0 -16px;padding:8px 16px;border:0;border-radius:0;border-bottom:1px solid var(--border-soft);background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);}
          .ws-settings-tabs-inner{display:flex;gap:7px;overflow-x:auto;padding-bottom:1px;scroll-snap-type:x mandatory;scrollbar-width:none;}
          .ws-settings-tabs-inner::-webkit-scrollbar{display:none;}
          .ws-tab{flex:0 0 auto;min-width:96px;justify-content:center;padding:8px 12px;border-radius:999px;border:1px solid var(--border-soft);background:var(--surface);font-size:12px;scroll-snap-align:start;}
          .ws-tab.active{background:var(--accent-soft);border-color:color-mix(in srgb,var(--accent) 40%,var(--border-soft));}
          .ws-settings-panels{gap:10px;}
          .ws-card-title-wrap{gap:10px;}
          .ws-card-body{margin-top:13px;}
          .ws-profile-card{gap:13px;padding:15px;}
          .ws-avatar{width:46px;height:46px;font-size:15px;}
          .ws-profile-name{font-size:17px;}
          .ws-profile-mail{font-size:12.5px;}
          .ws-form-row{display:grid;grid-template-columns:1fr;gap:8px;}
          .ws-form-row .btn,.ws-card .btn{width:100%;justify-content:center;padding:11px 14px;}
          .ws-system-action{width:100%;justify-content:center;margin-top:2px;}
          .ws-danger-button{width:100%;}
          .ws-mobile-break{align-items:flex-start;flex-direction:column;gap:10px;}
          .ws-member-row{align-items:flex-start;flex-wrap:wrap;padding:11px 10px;}
          .ws-member-row select{width:100%!important;}
          .ws-member-actions{display:grid!important;grid-template-columns:1fr auto;width:100%;gap:7px!important;margin-left:40px;}
          .ws-invite-row{flex-wrap:wrap;}
        }
      `}</style>

      <div className="ws-settings-hero">
        <button className="ws-back" onClick={() => setPage('dashboard')}>← Workspace</button>
        <h1 className="ws-settings-title">Nastavení</h1>
        <div className="ws-settings-meta">
          <MetaPill>{active?.name || 'Workspace'}</MetaPill>
          <MetaPill tone="role">role {workspaceRole}</MetaPill>
          <span>{userEmail}</span>
        </div>
      </div>

      <div className="ws-settings-layout">
        <aside className="ws-settings-tabs">
          <div className="ws-settings-tabs-inner">
            {tabs.map((tab) => {
              const selected = activeTab === tab.id
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`ws-tab ${selected ? 'active' : ''}`}>
                  <Icon name={tab.icon} size={15} color="currentColor" strokeWidth={1.9} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </aside>

        <div className="ws-settings-panels">
          {activeTab === 'account' && (
            <>
              <section className="ws-card ws-profile-card">
                <div className="ws-avatar">{profileInitials}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="ws-profile-name">{me?.displayName || 'Bez jména'}</div>
                  <div className="ws-profile-mail">{userEmail}</div>
                  <span className="ws-profile-role">role {me?.role ?? workspaceRole}</span>
                </div>
              </section>

              <Section label="Zobrazované jméno" description="Tohle jméno vidí ostatní členové workspace." icon="user">
                <div className="ws-form-row">
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    placeholder="Tvoje jméno..."
                    style={{ ...inputStyle, flex: 1, minWidth: 220 }}
                  />
                  <button className="btn primary" onClick={handleSaveName} disabled={!displayName.trim() || savingProfile} style={{ opacity: !displayName.trim() || savingProfile ? 0.6 : 1 }}>
                    {savingProfile ? 'Ukládám...' : 'Uložit'}
                  </button>
                </div>
              </Section>

              {isSystemAdmin && (
                <Section label="Správa systému" title="Administrace systému Zentero" description="Globální správa uživatelů, monitoring, logy a obnovení smazaných dat z koše." icon="settings" tone="accent" action={
                  <button className="btn primary ws-system-action" onClick={() => setPage('admin')}>
                    <Icon name="settings" size={14} color="currentColor" /> Otevřít
                  </button>
                } />
              )}

              <Section label="Heslo" title="Obnova hesla" description="Pošleme odkaz pro bezpečný reset hesla na e-mail účtu." icon="key-round">
                {resetSent ? (
                  <div style={{ fontSize: 13, color: 'var(--green)' }}>Odkaz pro reset hesla byl odeslán na {userEmail}.</div>
                ) : (
                  <button className="btn" onClick={handleResetPassword}>Odeslat odkaz pro reset hesla</button>
                )}
              </Section>

              <Section label="Odhlášení" title="Odhlásit se z aplikace" description="Ukončí aktuální relaci na tomto zařízení." icon="log-out" tone="danger">
                <button className="btn danger ws-danger-button" onClick={handleLogout}>Odhlásit se</button>
              </Section>
            </>
          )}

          {activeTab === 'workspace' && (
            <>
              <Section label="Název workspace" icon="briefcase">
                {editingName ? (
                  <div className="ws-form-row">
                    <input
                      autoFocus
                      value={newWsName}
                      onChange={(e) => setNewWsName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingName(false) }}
                      style={{ ...inputStyle, flex: 1, minWidth: 220 }}
                    />
                    <button className="btn primary" onClick={handleRename}>Uložit</button>
                    <button className="btn" onClick={() => setEditingName(false)}>Zrušit</button>
                  </div>
                ) : (
                  <div className="ws-mobile-break">
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: isMobile ? 19 : 21, fontWeight: 650, lineHeight: 1.2, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{active?.name || 'Bez názvu'}</div>
                      <FormHint>{workspaceMembers.length} členů · tvoje role {workspaceRole}</FormHint>
                    </div>
                    {isOwner && <button className="btn" onClick={() => { setEditingName(true); setNewWsName(active?.name ?? '') }}>Přejmenovat</button>}
                  </div>
                )}
              </Section>

              <Section label="Nebezpečná zóna" title="Opustit workspace" description="Akce se týká jen tvého členství v tomto workspace." icon="alert-triangle" tone="danger">
                {!isOwner && <button className="btn danger ws-danger-button" onClick={handleLeave}>Opustit workspace</button>}
                {isOwner && workspaceMembers.length === 1 && <div style={mutedText}>Workspace nelze opustit, jsi jediný člen.</div>}
                {isOwner && workspaceMembers.length > 1 && <div style={mutedText}>Jako owner nemůžeš workspace opustit. Nejprve předej ownership.</div>}
              </Section>
            </>
          )}

          {activeTab === 'members' && (
            <>
              <Section label={`Členové (${workspaceMembers.length})`} title="Tým workspace" description="Správa rolí a přístupů v aktuálním workspace." icon="users">
                <div className="ws-member-list">
                  {workspaceMembers.map((m) => {
                    const color = roleColor(m.role)
                    return (
                      <div key={m.userId} className="ws-member-row">
                        <div className="ws-member-avatar" style={{ background: `${color}22`, border: `1px solid ${color}55`, color }}>
                          {getInitials(m)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 750, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getMemberLabel(m)}</div>
                          {m.email && m.displayName && <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{m.email}</div>}
                        </div>
                        {canManage && m.userId !== userId && m.role !== 'owner' ? (
                          <div className="ws-member-actions" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <select value={m.role} onChange={(e) => handleRoleChange(m.userId, e.target.value)} style={{ ...inputStyle, width: 90, padding: '6px 8px', fontSize: 12 }}>
                              <option value="admin">admin</option>
                              <option value="member">member</option>
                              <option value="viewer">viewer</option>
                            </select>
                            <button className="btn danger" style={{ padding: '7px 10px' }} onClick={() => handleRemove(m)}>
                              <Icon name="trash" size={12} color="currentColor" strokeWidth={2} />
                            </button>
                          </div>
                        ) : (
                          <span className="ws-role-badge" style={{ border: `1px solid ${color}44`, color, background: `${color}18` }}>{m.role}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Section>

              {canManage && (
                <Section label="Pozvat člena" title="Pozvánka do workspace" description="Vygeneruj odkaz s rolí a pošli ho novému členovi." icon="user-plus">
                  <div className="chips" style={{ marginBottom: 12 }}>
                    {['member', 'viewer', 'admin'].map((r) => (
                      <button key={r} className={`chip ${inviteRole === r ? 'active' : ''}`} onClick={() => { setInviteRole(r); setInviteLink('') }}>
                        {r}
                      </button>
                    ))}
                  </div>

                  {inviteLink ? (
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>Odkaz platí 7 dní.</div>
                      <div className="ws-form-row">
                        <input readOnly value={inviteLink} style={{ ...inputStyle, flex: 1, minWidth: 240 }} onClick={(e) => e.target.select()} />
                        <button className="btn primary" onClick={() => { navigator.clipboard.writeText(inviteLink); toast('Zkopírováno', 'success') }}>Kopírovat</button>
                        <button className="btn" onClick={() => { setInviteLink('') }}>Nový</button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn primary" onClick={handleGenerateLink}>Vygenerovat odkaz</button>
                  )}

                  <FormHint>{loadingInvites ? 'Načítám pozvánky...' : `Čekající pozvánky: ${invites.length}`}</FormHint>
                  {invites.length > 0 && (
                    <div className="ws-invite-list" style={{ marginTop: 8 }}>
                      {invites.map((inv) => (
                        <div key={inv.id} className="ws-invite-row">
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text)' }}>{inv.role}</span>
                          <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>vyprší {formatDate(inv.expires_at, { day: 'numeric', month: 'numeric', year: 'numeric' })}</span>
                          <span style={{ flex: 1 }} />
                          <button className="btn danger" style={{ padding: '5px 9px' }} onClick={() => handleRevoke(inv.id)}>Zrušit</button>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              )}
            </>
          )}

          {activeTab === 'notifications' && (
            <>
              <Section label="Notifikace" title="Push upozornění" description="Upozornění na blížící se termíny a připomínky." icon="bell">
                {!push.supported ? (
                  <div style={mutedText}>Push notifikace nejsou v tomto prohlížeči podporovány nebo není nastaven VAPID klíč.</div>
                ) : push.permission === 'denied' ? (
                  <div style={mutedText}>Notifikace jsou blokovány. Povol je v nastavení prohlížeče a stránku obnov.</div>
                ) : (
                  <div className="ws-mobile-break">
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>{push.subscribed ? 'Notifikace jsou zapnuté' : 'Push notifikace'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                        {push.subscribed ? 'Upozorníme tě na blížící se termíny a připomínky.' : 'Dostávej upozornění i když je app zavřená.'}
                      </div>
                    </div>
                    <button className={`btn${push.subscribed ? '' : ' primary'}`} onClick={push.subscribed ? push.unsubscribe : push.subscribe} disabled={push.loading} style={{ flexShrink: 0, minWidth: 120 }}>
                      {push.loading ? '…' : push.subscribed ? 'Vypnout' : 'Zapnout'}
                    </button>
                  </div>
                )}
              </Section>

              <Section label="Preference" title="Typy upozornění" description="Vyber si, které typy notifikací chceš dostávat." icon="sliders-horizontal">
                <div style={{ display: 'grid', gap: 12 }}>
                  {[
                    { key: 'push_task_reminders', label: 'Push připomínky úkolů', desc: 'Upozornění v čas nastavené připomínky', disabled: !push.subscribed },
                    { key: 'push_daily_digest', label: 'Push denní souhrn', desc: 'Ranní přehled úkolů na dnes', disabled: !push.subscribed },
                    { key: 'email_task_reminders', label: 'E-mailové připomínky úkolů', desc: 'E-mail v čas nastavené připomínky' },
                    { key: 'email_daily_digest', label: 'E-mailový denní souhrn', desc: 'Ranní přehled úkolů, termínů a projektů' },
                  ].map(({ key, label, desc, disabled }) => (
                    <div key={key} className="ws-mobile-break" style={{ alignItems: 'center', opacity: disabled ? 0.56 : 1 }}>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>{label}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{desc}</div>
                      </div>
                      <button
                        className={`btn${notifPrefs[key] ? ' primary' : ''}`}
                        onClick={() => handleSaveNotifPrefs({ [key]: !notifPrefs[key] })}
                        disabled={savingNotif || disabled}
                        style={{ flexShrink: 0, minWidth: 88 }}
                      >
                        {notifPrefs[key] ? 'Zapnuto' : 'Vypnuto'}
                      </button>
                    </div>
                  ))}

                  <div className="ws-mobile-break" style={{ alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>Čas denního souhrnu</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Ve kolik hodin chceš ranní souhrn dostat.</div>
                    </div>
                    <select
                      value={notifPrefs.digest_hour}
                      onChange={(e) => handleSaveNotifPrefs({ digest_hour: Number(e.target.value) })}
                      disabled={savingNotif || (!notifPrefs.email_daily_digest && !notifPrefs.push_daily_digest)}
                      style={{ ...inputStyle, width: 112, flexShrink: 0 }}
                    >
                      {Array.from({ length: 24 }, (_, h) => (
                        <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </div>
                </div>
              </Section>
            </>
          )}

          {activeTab === 'app' && (
            <>
              <Section label="Vzhled" title="Vizuální režim aplikace" icon="palette">
                <div style={{ display: 'grid', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Režim</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[
                        { id: 'dark', label: 'Tmavý' },
                        { id: 'light', label: 'Světlý' },
                        { id: 'system', label: 'Systém' },
                      ].map((mode) => (
                        <button key={mode.id} onClick={() => { updateUiSettings({ themeMode: mode.id }); if (mode.id !== 'system') setDk(mode.id === 'dark') }} style={segmentedButton(uiSettings.themeMode === mode.id)}>
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Accent barva</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))', gap: 8 }}>
                      {Object.entries(accentThemes || {}).map(([key, preset]) => {
                        const palette = preset[dk ? 'dark' : 'light']
                        const activePreset = uiSettings.accent === key
                        return (
                          <button key={key} onClick={() => updateUiSettings({ accent: key })} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 10, border: `1px solid ${activePreset ? palette.accent : 'var(--border-soft)'}`, background: activePreset ? 'var(--accent-soft)' : 'var(--bg-2)', color: activePreset ? 'var(--accent)' : 'var(--text-2)', fontWeight: 800, fontSize: 12, textAlign: 'left' }}>
                            <span style={{ width: 18, height: 18, borderRadius: '50%', background: `linear-gradient(135deg, ${palette.accent}, ${palette.accent2})`, boxShadow: activePreset ? '0 0 0 3px var(--accent-soft)' : 'none', flexShrink: 0 }} />
                            {preset.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </Section>

              <Section label="Rozhraní" title="Hustota a animace" icon="sliders-horizontal">
                <div style={{ display: 'grid', gap: 14 }}>
                  <div className="ws-mobile-break">
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>Hustota UI</div>
                      <div style={{ ...mutedText, fontSize: 12 }}>Kompaktní režim zmenší mezery a zrychlí skenování delších seznamů.</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => updateUiSettings({ density: 'comfortable' })} style={segmentedButton(uiSettings.density === 'comfortable')}>Pohodlná</button>
                      <button onClick={() => updateUiSettings({ density: 'compact' })} style={segmentedButton(uiSettings.density === 'compact')}>Kompaktní</button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>Omezit animace</div>
                      <div style={{ ...mutedText, fontSize: 12 }}>Vypne většinu přechodů a animací v rozhraní.</div>
                    </div>
                    <button onClick={() => updateUiSettings((prev) => ({ reducedMotion: !prev.reducedMotion }))} style={toggleStyle(uiSettings.reducedMotion)} aria-label="Omezit animace">
                      <span style={toggleKnobStyle(uiSettings.reducedMotion)} />
                    </button>
                  </div>
                </div>
              </Section>

              <Section label="Start aplikace" title="Výchozí stránka" description="Tahle stránka se otevře po dalším načtení aplikace." icon="home">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {defaultPages.map((item) => (
                    <button key={item.id} onClick={() => updateUiSettings({ defaultPage: item.id })} style={segmentedButton(uiSettings.defaultPage === item.id)}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </Section>

              <Section label="Workspace branding" title="Sdílené barvy workspace" icon="sparkles">
                <div style={mutedText}>Sdílené barvy workspace, ikona a logo patří do dalšího kroku s uložením do backendu. Osobní accent výše je lokální preference a nijak nemění vzhled ostatním členům týmu.</div>
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
