import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteRemoteErrorLogsByIds,
  deleteRemoteErrorLogsOlderThan,
  fetchRemoteErrorLogs,
} from "../../services/errorLogsService.js";
import { useToast } from "../Toast.jsx";

const SEVERITY_COLORS = {
  debug: "var(--text-3)",
  info: "var(--blue)",
  warning: "var(--orange)",
  error: "var(--red)",
  fatal: "var(--red)",
};

function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("cs-CZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

function downloadJson(filename, payload) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
  const link = document.createElement("a");
  link.setAttribute("href", dataStr);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function RemoteErrorLogsPanel({ embedded = false }) {
  const toast = useToast();
  const [open, setOpen] = useState(embedded);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [lastLoadedAt, setLastLoadedAt] = useState(null);

  const loadLogs = useCallback(async ({ silent = false } = {}) => {
    setLoading(true);
    try {
      const data = await fetchRemoteErrorLogs(50);
      setLogs(data || []);
      setLastLoadedAt(new Date().toISOString());
      if (!silent) toast("Produkční logy byly načteny", "success");
    } catch (error) {
      console.warn("Remote error logs loading failed:", error);
      if (!silent) toast("Nepodařilo se načíst produkční logy: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadLogs({ silent: true });
  }, [loadLogs]);

  const severityCounts = useMemo(() => logs.reduce((acc, log) => {
    const key = log.severity || "error";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {}), [logs]);

  const handleExport = () => {
    if (!logs.length) {
      toast("Nejsou dostupné žádné produkční logy k exportu", "warning");
      return;
    }
    downloadJson(`zentero_remote_error_logs_${new Date().toISOString().slice(0, 10)}.json`, logs);
    toast("Produkční logy byly exportovány", "success");
  };

  const handleClear = async () => {
    if (!logs.length) return;
    const confirmed = window.confirm("Opravdu vymazat zobrazené vzdálené produkční logy? Lokální logy v prohlížeči tím zůstanou nedotčené.");
    if (!confirmed) return;

    try {
      const ids = logs.map((log) => log.id).filter(Boolean);
      await deleteRemoteErrorLogsByIds(ids);
      setLogs([]);
      setExpandedId(null);
      toast("Vzdálené produkční logy byly vymazány", "success");
    } catch (error) {
      console.warn("Remote error logs cleanup failed:", error);
      toast("Nepodařilo se vymazat vzdálené logy: " + error.message, "error");
    }
  };

  const handleClearOld = async () => {
    const confirmed = window.confirm("Vymazat produkční logy starší než 30 dní? Aktuální chyby zůstanou zachované.");
    if (!confirmed) return;

    try {
      await deleteRemoteErrorLogsOlderThan(30);
      toast("Staré produkční logy byly vymazány", "success");
      loadLogs({ silent: true });
    } catch (error) {
      console.warn("Old remote error logs cleanup failed:", error);
      toast("Nepodařilo se vymazat staré logy: " + error.message, "error");
    }
  };

  const worstSeverity = logs.some((log) => log.severity === "fatal")
    ? "fatal"
    : logs.some((log) => log.severity === "error")
      ? "error"
      : logs.some((log) => log.severity === "warning")
        ? "warning"
        : "info";

  const panel = (
    <div style={{
      borderRadius: embedded ? "var(--r-lg)" : 18,
      border: "1px solid var(--border-soft)",
      background: embedded ? "var(--surface)" : "color-mix(in srgb, var(--surface) 96%, transparent)",
      boxShadow: embedded ? "none" : "0 22px 70px rgba(0,0,0,.34)",
      backdropFilter: embedded ? "none" : "blur(18px)",
      WebkitBackdropFilter: embedded ? "none" : "blur(18px)",
      overflow: "hidden",
    }}>
      <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ fontSize: 16 }}>🧭</span>
            <h3 style={{ margin: 0, color: "var(--text)", fontSize: 16, fontWeight: 850 }}>Produkční chyby</h3>
            <span style={{ color: "var(--text-3)", fontFamily: "var(--mono)", fontSize: 12 }}>Supabase</span>
          </div>
          <p style={{ margin: "5px 0 0", color: "var(--text-3)", fontSize: 12.5 }}>
            Posledních 50 vzdálených chyb uložených přes client-error-log.
          </p>
        </div>
        {!embedded && (
          <button type="button" onClick={() => setOpen(false)} style={{ border: 0, background: "transparent", color: "var(--text-3)", fontSize: 22, lineHeight: 1 }} aria-label="Zavřít produkční chyby">
            ×
          </button>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: "1px solid var(--border-soft)", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {["fatal", "error", "warning", "info"].map((severity) => (
            <span key={severity} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 999, border: "1px solid var(--border-soft)", background: "var(--bg-2)", color: severityCounts[severity] ? SEVERITY_COLORS[severity] : "var(--text-4)", fontSize: 11.5, fontWeight: 750, fontFamily: "var(--mono)" }}>
              {severity}: {severityCounts[severity] || 0}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => loadLogs()} disabled={loading} style={smallButtonStyle}>{loading ? "Načítám…" : "Obnovit"}</button>
          <button type="button" onClick={handleExport} style={smallButtonStyle}>Export</button>
          <button type="button" onClick={handleClearOld} style={smallButtonStyle}>Vymazat &gt; 30 dní</button>
          <button type="button" onClick={handleClear} style={{ ...smallButtonStyle, color: "var(--red)", background: "var(--red-soft)" }}>Vymazat zobrazené</button>
        </div>
      </div>

      <div style={{ maxHeight: embedded ? "520px" : "440px", overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {!logs.length ? (
          <div style={{ padding: "42px 20px", textAlign: "center", color: "var(--text-3)" }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>✅</div>
            <div style={{ color: "var(--text-2)", fontWeight: 800, fontSize: 14 }}>Žádné produkční chyby</div>
            <div style={{ fontSize: 12.5, marginTop: 4 }}>Buď zatím nevznikly, nebo byly vymazány.</div>
          </div>
        ) : logs.map((log) => {
          const expanded = expandedId === log.id;
          const color = SEVERITY_COLORS[log.severity] || SEVERITY_COLORS.error;
          return (
            <div key={log.id} onClick={() => setExpandedId(expanded ? null : log.id)} style={{ cursor: "pointer", padding: "11px 12px", borderRadius: 13, border: "1px solid var(--border-soft)", background: "var(--bg-2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flex: "0 0 auto" }} />
                    <span style={{ color: "var(--text)", fontSize: 13, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.message}</span>
                  </div>
                  <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: "6px 12px", paddingLeft: 15, color: "var(--text-3)", fontSize: 11.5, fontFamily: "var(--mono)" }}>
                    <span>{log.severity || "error"}</span>
                    <span>{log.type || "client_error"}</span>
                    <span>{log.filename || "unknown"}{log.lineno ? `:${log.lineno}` : ""}</span>
                  </div>
                </div>
                <span style={{ color: "var(--text-3)", fontSize: 11.5, fontFamily: "var(--mono)", flex: "0 0 auto" }}>{formatDateTime(log.created_at)}</span>
              </div>
              {expanded && (
                <div style={{ marginTop: 10, paddingLeft: 15 }}>
                  {log.url && <div style={detailLineStyle}><strong>URL:</strong> {log.url}</div>}
                  {log.app_version && <div style={detailLineStyle}><strong>Verze:</strong> {log.app_version}</div>}
                  {log.user_agent && <div style={detailLineStyle}><strong>User agent:</strong> {log.user_agent}</div>}
                  {log.stack && <pre style={{ margin: "10px 0 0", padding: 10, background: "var(--bg)", border: "1px solid var(--border-strong)", borderRadius: 10, color, fontFamily: "var(--mono)", fontSize: 11, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.45 }}>{log.stack}</pre>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ padding: "9px 18px", borderTop: "1px solid var(--border-soft)", color: "var(--text-4)", fontSize: 11.5, fontFamily: "var(--mono)", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span>RLS: zobrazují se pouze tvoje logy</span>
        <span>{lastLoadedAt ? `Načteno ${formatDateTime(lastLoadedAt)}` : "Zatím nenačteno"}</span>
      </div>
    </div>
  );

  if (embedded) return panel;

  return (
    <div style={{ position: "fixed", right: 20, bottom: 72, zIndex: 9997, width: open ? "min(680px, calc(100vw - 32px))" : "auto", maxHeight: "min(720px, calc(100vh - 120px))", fontFamily: "var(--font-ui)" }}>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 999, border: "1px solid var(--border-soft)", background: "color-mix(in srgb, var(--surface) 94%, transparent)", color: "var(--text)", boxShadow: "0 18px 48px rgba(0,0,0,.26)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }} title="Produkční chyby ze Supabase">
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: logs.length ? SEVERITY_COLORS[worstSeverity] : "var(--green)", boxShadow: logs.length ? `0 0 12px ${SEVERITY_COLORS[worstSeverity]}` : "0 0 12px var(--green)" }} />
          <span style={{ fontSize: 13, fontWeight: 800 }}>Produkční chyby</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-3)" }}>{logs.length}</span>
        </button>
      ) : panel}
    </div>
  );
}

const smallButtonStyle = { padding: "6px 9px", borderRadius: 9, border: "1px solid var(--border-soft)", background: "var(--bg-2)", color: "var(--text-2)", fontSize: 11.5, fontWeight: 750 };
const detailLineStyle = { color: "var(--text-3)", fontSize: 11.5, lineHeight: 1.5, fontFamily: "var(--mono)", wordBreak: "break-word" };
