import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { useToast } from "../components/Toast.jsx";
import Icon from "../components/Icon.jsx";
import AiTestConsolePanel from "../components/admin/AiTestConsolePanel.jsx";
import RemoteErrorLogsPanel from "../components/admin/RemoteErrorLogsPanel.jsx";
import SystemHealthPanel from "../components/admin/SystemHealthPanel.jsx";
import { APP_RELEASE_DATE, APP_VERSION } from "../appMeta.js";
import { getErrorLogs, clearErrorLogs } from "../utils/errorLogger.js";
import { supabase } from "../supabase.js";

const TAB_DEFS = [
  { id: "overview", label: "Přehled & Statistiky", icon: "bar-chart-3" },
  { id: "health", label: "Health check", icon: "activity", statusKey: "health" },
  { id: "diagnostics", label: "Diagnostika systému", icon: "settings" },
  { id: "ai", label: "AI konzole", icon: "sparkles", statusKey: "ai" },
  { id: "logs", label: "Logy & Bug report", icon: "file-warning", statusKey: "logsCombined" },
  { id: "users", label: "Členové týmu", icon: "users" },
  { id: "trash", label: "Koš", icon: "trash-2" },
];

const STATUS_COLORS = {
  ok: "var(--green)",
  warning: "var(--orange)",
  error: "var(--red)",
  neutral: "var(--text-3)",
};

function formatBytes(bytes) {
  if (!bytes || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("cs-CZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(value);
  }
}

function sinceIso(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

async function clearCachesAndReload() {
  if ("caches" in window) {
    const keys = await window.caches.keys();
    await Promise.all(keys.map((key) => window.caches.delete(key)));
  }
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }
  window.location.reload();
}

function Card({ title, subtitle, icon, children, action }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border-soft)", borderRadius: "var(--r-lg)", padding: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: children ? 16 : 0 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          {icon && <Icon name={icon} size={18} color="var(--accent)" />}
          <div>
            <h3 style={{ margin: 0, color: "var(--text)", fontSize: 16, fontWeight: 800 }}>{title}</h3>
            {subtitle && <p style={{ margin: "5px 0 0", color: "var(--text-3)", fontSize: 12.5, lineHeight: 1.45 }}>{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function MetricCard({ label, value, hint, icon, color = "var(--accent)" }) {
  return (
    <Card title={label} icon={icon}>
      <div style={{ fontSize: 30, fontWeight: 850, fontFamily: "var(--mono)", color, lineHeight: 1 }}>{value}</div>
      {hint && <div style={{ color: "var(--text-3)", fontSize: 12.5, marginTop: 8 }}>{hint}</div>}
    </Card>
  );
}

function SmallButton({ children, onClick, tone = "default", disabled = false }) {
  const color = tone === "danger" ? "var(--red)" : tone === "accent" ? "var(--accent)" : "var(--text-2)";
  const background = tone === "danger" ? "var(--red-soft)" : tone === "accent" ? "var(--accent-soft)" : "var(--bg-2)";
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{ padding: "7px 10px", borderRadius: 9, border: "1px solid var(--border-soft)", background, color, fontSize: 12, fontWeight: 750, opacity: disabled ? 0.55 : 1 }}>
      {children}
    </button>
  );
}

function StatusDot({ status = "neutral" }) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.neutral;
  return (
    <span style={{ position: "relative", width: 9, height: 9, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
      <span style={{ position: "absolute", inset: -4, borderRadius: "50%", background: color, opacity: status === "neutral" ? 0 : 0.16, animation: status === "neutral" ? "none" : "adminPulse 1.8s ease-out infinite" }} />
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: status === "neutral" ? "none" : `0 0 10px ${color}` }} />
    </span>
  );
}

function TabStatus({ status, value }) {
  if (!status || value == null) return null;
  const color = STATUS_COLORS[status] || STATUS_COLORS.neutral;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 6px", borderRadius: 999, border: "1px solid var(--border-soft)", background: "var(--bg-2)", color, fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 900 }}>
      <StatusDot status={status} />
      {value}
    </span>
  );
}

export default function AdminPage() {
  const {
    tasks,
    projects,
    tags,
    notes,
    quickTodos,
    trash,
    workspaceMembers,
    activeWorkspaceId,
    isSystemAdmin,
    setPage,
    addTask,
    restoreTask,
    restoreProject,
    restoreNote,
    permanentlyDeleteTask,
    permanentlyDeleteProject,
    permanentlyDeleteNote,
  } = useApp();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [errorLogs, setErrorLogs] = useState([]);
  const [dbLatency, setDbLatency] = useState(null);
  const [pinging, setPinging] = useState(false);
  const [swStatus, setSwStatus] = useState("Kontroluji…");
  const [storageSize, setStorageSize] = useState(0);
  const [productionErrors24h, setProductionErrors24h] = useState(0);
  const [productionErrorsStatus, setProductionErrorsStatus] = useState("neutral");
  const [bugTitle, setBugTitle] = useState("");
  const [bugArea, setBugArea] = useState("Dashboard");
  const [bugSeverity, setBugSeverity] = useState("Střední");
  const [bugDescription, setBugDescription] = useState("");

  useEffect(() => {
    const loadLogs = () => setErrorLogs(getErrorLogs());
    loadLogs();
    window.addEventListener("mt3:error_logged", loadLogs);
    return () => window.removeEventListener("mt3:error_logged", loadLogs);
  }, []);

  useEffect(() => {
    const calculate = () => {
      try {
        let bytes = 0;
        for (const key in localStorage) {
          if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
            bytes += (key.length + String(localStorage[key]).length) * 2;
          }
        }
        setStorageSize(bytes);
      } catch (error) {
        console.warn("LocalStorage size calculation failed:", error);
      }
    };
    calculate();
    const timer = window.setInterval(calculate, 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      setSwStatus("Nepodporováno");
      return;
    }
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => setSwStatus(registrations.length ? `Aktivní (${registrations.length} registrací)` : "Neregistrován"))
      .catch((error) => setSwStatus(`Chyba detekce: ${error.message}`));
  }, []);

  const refreshProductionErrorStatus = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from("app_error_logs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sinceIso(24));
      if (error) throw error;
      const value = count || 0;
      setProductionErrors24h(value);
      setProductionErrorsStatus(value === 0 ? "ok" : value <= 3 ? "warning" : "error");
    } catch (error) {
      console.warn("Production error count failed:", error);
      setProductionErrorsStatus("error");
    }
  }, []);

  useEffect(() => {
    refreshProductionErrorStatus();
  }, [refreshProductionErrorStatus]);

  const measureLatency = useCallback(async () => {
    setPinging(true);
    const start = performance.now();
    try {
      const { error } = await supabase.from("tasks").select("id", { count: "exact", head: true }).limit(1);
      if (error) throw error;
      setDbLatency(Math.round(performance.now() - start));
      toast("Databázové spojení OK", "success");
    } catch (error) {
      toast(`Chyba spojení: ${error.message}`, "error");
    } finally {
      setPinging(false);
    }
  }, [toast]);

  useEffect(() => {
    measureLatency();
  }, [measureLatency]);

  const taskMetrics = useMemo(() => {
    const active = tasks.filter((task) => task.status !== "done");
    const done = tasks.filter((task) => task.status === "done");
    const overdue = active.filter((task) => task.dueDate && new Date(task.dueDate) < new Date()).length;
    const highPriority = active.filter((task) => task.priority === "high").length;
    return { total: tasks.length, active: active.length, done: done.length, overdue, highPriority };
  }, [tasks]);

  const projectMetrics = useMemo(() => {
    const active = projects.filter((project) => project.status !== "archived");
    return { total: projects.length, active: active.length, archived: projects.length - active.length };
  }, [projects]);

  const noteSize = useMemo(() => notes.reduce((sum, note) => sum + (note.content?.length || 0), 0), [notes]);
  const attachmentMetrics = useMemo(() => {
    const attachments = notes.flatMap((note) => note.attachments || []);
    const totalSize = attachments.reduce((sum, attachment) => sum + (attachment.size || 0), 0);
    return { count: attachments.length, size: totalSize };
  }, [notes]);
  const quickTodoMetrics = useMemo(() => ({
    total: quickTodos.length,
    open: quickTodos.filter((item) => !item.done).length,
    done: quickTodos.filter((item) => item.done).length,
  }), [quickTodos]);
  const trashMetrics = useMemo(() => ({
    tasks: trash?.tasks?.length || 0,
    projects: trash?.projects?.length || 0,
    notes: trash?.notes?.length || 0,
  }), [trash]);
  const trashTotal = trashMetrics.tasks + trashMetrics.projects + trashMetrics.notes;

  const statusByKey = useMemo(() => {
    const healthStatus = dbLatency == null
      ? "neutral"
      : dbLatency > 1500 || swStatus.startsWith("Chyba")
        ? "error"
        : dbLatency > 600 || swStatus === "Neregistrován"
          ? "warning"
          : "ok";
    const localLogsStatus = errorLogs.length === 0 ? "ok" : errorLogs.length <= 5 ? "warning" : "error";
    const combinedLogsCount = productionErrors24h + errorLogs.length;
    const combinedLogsStatus = productionErrorsStatus === "error" || localLogsStatus === "error"
      ? "error"
      : productionErrorsStatus === "warning" || localLogsStatus === "warning"
        ? "warning"
        : "ok";

    return {
      health: { status: healthStatus, value: healthStatus === "neutral" ? "—" : healthStatus === "ok" ? "OK" : healthStatus === "warning" ? "WARN" : "ERROR" },
      ai: { status: "ok", value: "OK" },
      logsCombined: { status: combinedLogsStatus, value: String(combinedLogsCount) },
    };
  }, [dbLatency, errorLogs.length, productionErrors24h, productionErrorsStatus, swStatus]);

  const exportDiagnostics = () => {
    const data = { exportedAt: new Date().toISOString(), workspaceId: activeWorkspaceId, appVersion: APP_VERSION, dbLatency, swStatus, storageSize, productionErrors24h, metrics: { taskMetrics, projectMetrics, notes: notes.length, noteSize, quickTodoMetrics, attachmentMetrics, trashMetrics }, errorLogs };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `zentero-admin-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast("Diagnostika exportována", "success");
  };

  const clearLocalLogs = () => {
    clearErrorLogs();
    setErrorLogs([]);
    toast("Lokální chybové logy vymazány", "success");
  };

  const simulateError = () => {
    const errorLog = { id: Date.now(), type: "simulated", message: "Testovací chyba vyvolaná z administrace", stack: "AdminPage.simulateError → test", timestamp: new Date().toISOString(), url: window.location.href };
    const updated = [errorLog, ...getErrorLogs()].slice(0, 50);
    localStorage.setItem("mt3:system_errors", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("mt3:error_logged", { detail: errorLog }));
    toast("Testovací chyba zaznamenána", "warning");
  };

  const submitBugReport = () => {
    const title = bugTitle.trim();
    if (!title) {
      toast("Doplň název chyby", "warning");
      return;
    }
    const description = [
      `Oblast: ${bugArea}`,
      `Závažnost: ${bugSeverity}`,
      `Verze aplikace: ${APP_VERSION}`,
      `Workspace: ${activeWorkspaceId || "—"}`,
      `Browser: ${navigator.userAgent}`,
      "",
      bugDescription.trim() || "Bez detailního popisu.",
    ].join("\n");
    addTask({ title: `[Bug] ${title}`, description, priority: bugSeverity === "Vysoká" ? "high" : bugSeverity === "Nízká" ? "low" : "medium", subtasks: [] });
    setBugTitle("");
    setBugDescription("");
    toast("Bug report byl založen jako úkol", "success");
  };

  if (!isSystemAdmin) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>
        <Icon name="lock" size={48} color="var(--text-3)" />
        <h2 style={{ marginTop: 16, color: "var(--text)" }}>Přístup odepřen</h2>
        <p>Tato stránka je dostupná pouze systémovým administrátorům.</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <style>{`
        @keyframes adminPulse{0%{transform:scale(.65);opacity:.45}70%{transform:scale(1.9);opacity:0}100%{transform:scale(1.9);opacity:0}}
        .admin-page{padding:32px;max-width:1400px;margin:0 auto;}
        .admin-header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-bottom:22px;}
        .admin-header-actions{display:flex;gap:8px;align-items:center;}
        .admin-tabs{display:flex;gap:8px;border-bottom:1px solid var(--border-soft);overflow-x:auto;}
        .admin-tab{display:flex;align-items:center;gap:8px;padding:12px 14px;border:0;background:transparent;color:var(--text-3);border-bottom:2px solid transparent;font-size:14px;font-weight:600;white-space:nowrap;}
        .admin-tab.active{color:var(--accent);border-bottom-color:var(--accent);font-weight:800;}
        .admin-card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;}
        .admin-diagnostics-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;}
        .admin-two-col{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(320px,.9fr);gap:18px;}
        @media(max-width:760px){
          .admin-page{padding:18px 12px 96px;}
          .admin-header{flex-direction:column;gap:14px;margin-bottom:18px;}
          .admin-header h1{font-size:26px!important;}
          .admin-header p{font-size:13px!important;line-height:1.45;}
          .admin-header-actions{width:100%;justify-content:space-between;align-items:stretch;}
          .admin-tabs{margin:0 -12px;padding:0 12px 10px;border-bottom:0;gap:7px;scroll-snap-type:x mandatory;}
          .admin-tab{padding:9px 11px;border:1px solid var(--border-soft);border-radius:999px;background:var(--surface);border-bottom:1px solid var(--border-soft);font-size:12px;scroll-snap-align:start;}
          .admin-tab.active{background:var(--accent-soft);border-color:color-mix(in srgb,var(--accent) 48%,var(--border-soft));}
          .admin-card-grid,.admin-diagnostics-grid,.admin-two-col{grid-template-columns:1fr!important;}
        }
      `}</style>
      <div style={{ marginBottom: 26 }}>
        <div className="admin-header">
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--text)", margin: "0 0 8px" }}>Systém & Administrace</h1>
            <p style={{ color: "var(--text-3)", fontSize: 15, margin: 0 }}>Technický dashboard, monitoring, AI diagnostika a správa aplikace Zentero.</p>
          </div>
          <div className="admin-header-actions">
            <SmallButton onClick={exportDiagnostics} tone="accent">Export diagnostiky</SmallButton>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 12, border: "1px solid var(--border-soft)", background: "var(--surface)", color: "var(--text-2)", fontFamily: "var(--mono)", fontSize: 12, fontWeight: 800 }}>
              <StatusDot status={statusByKey.health.status === "error" ? "error" : statusByKey.logsCombined.status === "error" ? "error" : statusByKey.health.status === "warning" || statusByKey.logsCombined.status === "warning" ? "warning" : "ok"} /> ONLINE
            </span>
          </div>
        </div>
        <div className="admin-tabs">
          {TAB_DEFS.map((tab) => {
            const dynamic = tab.statusKey ? statusByKey[tab.statusKey] : null;
            const badge = tab.id === "trash" ? trashTotal : 0;
            return (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`admin-tab ${activeTab === tab.id ? "active" : ""}`}>
                <Icon name={tab.icon} size={15} color="currentColor" />
                {tab.label}
                {dynamic && <TabStatus status={dynamic.status} value={dynamic.value} />}
                {badge > 0 && <span style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 10, background: "var(--accent)", color: "var(--bg)", fontSize: 11, display: "grid", placeItems: "center" }}>{badge}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "overview" && (
        <div style={{ display: "grid", gap: 20 }}>
          <div className="admin-card-grid">
            <MetricCard label="Úkoly" value={taskMetrics.total} hint={`${taskMetrics.active} aktivních · ${taskMetrics.done} hotovo`} icon="check-square" />
            <MetricCard label="Projekty" value={projectMetrics.total} hint={`${projectMetrics.active} aktivních · ${projectMetrics.archived} archiv`} icon="folder" color="var(--blue)" />
            <MetricCard label="Poznámky" value={notes.length} hint={`${tags.length} tagů · ${formatBytes(noteSize * 2)} textu`} icon="file-text" color="#a855f7" />
            <MetricCard label="Přílohy" value={attachmentMetrics.count} hint={formatBytes(attachmentMetrics.size)} icon="paperclip" color="var(--green)" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            <Card title="Stav plnění úkolů" icon="activity">
              <Progress label="Zpožděné úkoly" value={taskMetrics.overdue} total={Math.max(taskMetrics.total, 1)} color="var(--red)" />
              <Progress label="Vysoká priorita" value={taskMetrics.highPriority} total={Math.max(taskMetrics.total, 1)} color="var(--orange)" />
              <Progress label="Dokončeno" value={taskMetrics.done} total={Math.max(taskMetrics.total, 1)} color="var(--green)" />
            </Card>
            <Card title="Rychlý seznam" icon="zap">
              <Progress label="Otevřené položky" value={quickTodoMetrics.open} total={Math.max(quickTodoMetrics.total, 1)} color="var(--accent)" />
              <Progress label="Odbavené položky" value={quickTodoMetrics.done} total={Math.max(quickTodoMetrics.total, 1)} color="var(--green)" />
            </Card>
          </div>
        </div>
      )}

      {activeTab === "health" && <SystemHealthPanel embedded />}

      {activeTab === "diagnostics" && (
        <div className="admin-diagnostics-grid">
          <Card title="Latence databáze Supabase" subtitle="Rychlý test dostupnosti databáze." icon="database" action={<SmallButton onClick={measureLatency} disabled={pinging}>{pinging ? "Měřím…" : "Testovat"}</SmallButton>}>
            <div style={{ fontSize: 34, fontWeight: 850, fontFamily: "var(--mono)", color: dbLatency && dbLatency > 300 ? "var(--red)" : dbLatency && dbLatency > 120 ? "var(--orange)" : "var(--green)" }}>{dbLatency ?? "—"} <span style={{ fontSize: 13, color: "var(--text-3)" }}>ms</span></div>
          </Card>
          <Card title="PWA & prostředí" subtitle="Service Worker, verze aplikace a režim buildu." icon="smartphone">
            <KeyValue label="Service Worker" value={swStatus} />
            <KeyValue label="Verze" value={`${APP_VERSION} · ${APP_RELEASE_DATE}`} />
            <KeyValue label="Build režim" value={import.meta.env.MODE} />
          </Card>
          <Card title="PWA Safe reload" subtitle="Vymaže Cache Storage, odregistruje Service Worker a načte aktuální build bez zásahu do dat v Supabase." icon="refresh-cw">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <SmallButton onClick={() => clearCachesAndReload()} tone="accent">Spustit Safe reload</SmallButton>
            </div>
          </Card>
          <Card title="Úložiště & data" subtitle="Lokální cache, poznámky a přílohy v aktuálním workspace." icon="hard-drive">
            <KeyValue label="LocalStorage" value={formatBytes(storageSize)} />
            <KeyValue label="Poznámky" value={`${notes.length} položek`} />
            <KeyValue label="Text poznámek" value={formatBytes(noteSize * 2)} />
            <KeyValue label="Přílohy" value={`${attachmentMetrics.count} · ${formatBytes(attachmentMetrics.size)}`} />
          </Card>
        </div>
      )}

      {activeTab === "ai" && <AiTestConsolePanel embedded />}

      {activeTab === "logs" && (
        <div className="admin-two-col">
          <div style={{ display: "grid", gap: 18 }}>
            <RemoteErrorLogsPanel embedded />
            <Card title="Lokální chyby v prohlížeči" subtitle={`Zachyceno ${errorLogs.length} lokálních chyb v tomto zařízení.`} icon="alert-triangle" action={<div style={{ display: "flex", gap: 8 }}><SmallButton onClick={simulateError}>Simulovat</SmallButton><SmallButton onClick={clearLocalLogs} tone="danger" disabled={!errorLogs.length}>Vyčistit</SmallButton></div>}>
              {!errorLogs.length ? <EmptyState title="Systém běží hladce" text="Nebyly zachyceny žádné lokální chyby." /> : (
                <div style={{ display: "grid", gap: 8, maxHeight: 360, overflowY: "auto" }}>
                  {errorLogs.map((log, index) => <div key={log.id || index} style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border-soft)", background: "var(--bg-2)" }}><div style={{ color: "var(--text)", fontWeight: 800, fontSize: 13 }}>{log.message}</div><div style={{ color: "var(--text-3)", fontFamily: "var(--mono)", fontSize: 11.5, marginTop: 5 }}>{log.type || "client_error"} · {formatDate(log.timestamp)}</div></div>)}
                </div>
              )}
            </Card>
          </div>
          <Card title="Nahlásit chybu / bug report" subtitle="Založí úkol v aktuálním workspace a přibalí systémové údaje." icon="bug">
            <AdminField label="Název chyby"><input value={bugTitle} onChange={(e) => setBugTitle(e.target.value)} placeholder="Např. Pády při načítání AI asistenta…" style={fieldStyle} /></AdminField>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <AdminField label="Oblast"><select value={bugArea} onChange={(e) => setBugArea(e.target.value)} style={fieldStyle}>{["Dashboard", "Úkoly", "Projekty", "Poznámky", "AI", "Admin", "Mobil", "Jiné"].map((item) => <option key={item}>{item}</option>)}</select></AdminField>
              <AdminField label="Závažnost"><select value={bugSeverity} onChange={(e) => setBugSeverity(e.target.value)} style={fieldStyle}>{["Nízká", "Střední", "Vysoká"].map((item) => <option key={item}>{item}</option>)}</select></AdminField>
            </div>
            <AdminField label="Popis / kroky k vyvolání"><textarea value={bugDescription} onChange={(e) => setBugDescription(e.target.value)} rows={7} placeholder="Popiš, co se stalo a jak chybu zopakovat…" style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.5 }} /></AdminField>
            <button type="button" onClick={submitBugReport} style={{ width: "100%", marginTop: 10, padding: "12px 14px", border: 0, borderRadius: 12, background: "var(--accent)", color: "var(--bg)", fontWeight: 850 }}>Odeslat Bug Report</button>
          </Card>
        </div>
      )}

      {activeTab === "users" && (
        <div style={{ display: "grid", gap: 16 }}>
          <Card
            title="Globální správa uživatelů"
            subtitle="Přehled všech registrovaných uživatelů aplikace, analytika aktivity a akce (zakázat, smazat, přidat do workspace)."
            icon="shield"
            action={
              <SmallButton tone="accent" onClick={() => setPage("admin-users")}>
                Otevřít správu →
              </SmallButton>
            }
          />
          <Card title={`Členové workspace (${workspaceMembers.length})`} subtitle="Uživatelé aktuálního workspace." icon="users">
            <div style={{ display: "grid", gap: 10 }}>
              {workspaceMembers.map((member, index) => <UserRow key={member.id || member.userId || index} member={member} />)}
              {!workspaceMembers.length && <EmptyState title="Žádní členové" text="V aktuálním workspace nejsou načtení žádní členové." />}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "trash" && (
        <div style={{ display: "grid", gap: 16 }}>
          <Card title={`Koš (${trashTotal})`} subtitle="Obnova nebo trvalé odstranění smazaných položek." icon="trash-2" />
          <TrashSection title="Úkoly" items={trash?.tasks || []} onRestore={restoreTask} onDelete={permanentlyDeleteTask} />
          <TrashSection title="Projekty" items={trash?.projects || []} onRestore={restoreProject} onDelete={permanentlyDeleteProject} />
          <TrashSection title="Poznámky" items={trash?.notes || []} onRestore={restoreNote} onDelete={permanentlyDeleteNote} />
        </div>
      )}
    </div>
  );
}

function Progress({ label, value, total, color }) {
  const pct = total ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-2)", fontSize: 12.5, marginBottom: 5 }}><span>{label}</span><span style={{ color, fontFamily: "var(--mono)" }}>{value}</span></div>
      <div style={{ height: 7, borderRadius: 4, background: "var(--bg-2)", overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: color }} /></div>
    </div>
  );
}

function KeyValue({ label, value }) {
  return <div style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "8px 0", borderBottom: "1px solid var(--border-soft)", color: "var(--text-2)", fontSize: 12.5 }}><span>{label}</span><span style={{ color: "var(--text)", fontFamily: "var(--mono)", textAlign: "right" }}>{value}</span></div>;
}

function EmptyState({ title, text }) {
  return <div style={{ textAlign: "center", padding: 36, color: "var(--text-3)" }}><div style={{ fontSize: 24, marginBottom: 8 }}>✅</div><div style={{ color: "var(--text)", fontWeight: 800 }}>{title}</div><div style={{ fontSize: 12.5, marginTop: 5 }}>{text}</div></div>;
}

function AdminField({ label, children }) {
  return <label style={{ display: "grid", gap: 6, marginBottom: 10, color: "var(--text-2)", fontSize: 12.5, fontWeight: 700 }}>{label}{children}</label>;
}

function UserRow({ member }) {
  const roleColors = { owner: "var(--accent)", admin: "var(--blue)", member: "var(--green)", viewer: "var(--text-3)" };
  const color = roleColors[member.role] || "var(--text-3)";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, padding: "12px 14px", border: "1px solid var(--border-soft)", borderRadius: 12, background: "var(--bg-2)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: `${color}1a`, color, border: `1px solid ${color}44`, display: "grid", placeItems: "center", fontFamily: "var(--mono)", fontWeight: 900, fontSize: 12 }}>{(() => { const s = member.displayName || member.email || "U"; const p = s.trim().split(/\s+/); return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : s.slice(0, 2).toUpperCase(); })()}</div>
        <div style={{ minWidth: 0 }}><div style={{ color: "var(--text)", fontWeight: 800, fontSize: 13.5 }}>{member.displayName || "Bez jména"}</div><div style={{ color: "var(--text-3)", fontFamily: "var(--mono)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis" }}>{member.email || member.userId}</div></div>
      </div>
      <span style={{ color, background: `${color}12`, border: `1px solid ${color}33`, borderRadius: 999, padding: "4px 8px", fontSize: 10.5, fontFamily: "var(--mono)", fontWeight: 900, textTransform: "uppercase" }}>{member.role || "member"}</span>
    </div>
  );
}

function TrashSection({ title, items, onRestore, onDelete }) {
  return (
    <Card title={`${title} (${items.length})`}>
      {!items.length ? <div style={{ color: "var(--text-3)", fontSize: 13 }}>Žádné položky.</div> : <div style={{ display: "grid", gap: 8 }}>{items.map((item) => <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 12, border: "1px solid var(--border-soft)", borderRadius: 12, background: "var(--bg-2)" }}><div style={{ color: "var(--text)", fontWeight: 750 }}>{item.title || item.name || "Bez názvu"}</div><div style={{ display: "flex", gap: 8 }}><SmallButton onClick={() => onRestore(item.id)}>Obnovit</SmallButton><SmallButton onClick={() => onDelete(item.id)} tone="danger">Smazat</SmallButton></div></div>)}</div>}
    </Card>
  );
}

const fieldStyle = { width: "100%", border: "1px solid var(--border-soft)", borderRadius: 10, background: "var(--bg-2)", color: "var(--text)", padding: "10px 11px", fontFamily: "var(--font-ui)", fontSize: 13, outline: "none" };
