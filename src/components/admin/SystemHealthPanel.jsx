import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabase.js";
import { getErrorLogs } from "../../utils/errorLogger.js";
import { useToast } from "../Toast.jsx";

const STATUS_META = {
  ok: { label: "OK", color: "var(--green)", soft: "var(--green-soft)" },
  warning: { label: "Pozor", color: "var(--orange)", soft: "var(--orange-soft)" },
  error: { label: "Chyba", color: "var(--red)", soft: "var(--red-soft)" },
  idle: { label: "Netestováno", color: "var(--text-3)", soft: "var(--bg-2)" },
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

function sinceIso(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

async function withTimeout(promise, timeoutMs, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(`${label} timeout po ${timeoutMs} ms`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function HealthRow({ title, value, status = "idle", detail }) {
  const meta = STATUS_META[status] || STATUS_META.idle;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(120px, 1fr) auto",
        gap: 12,
        alignItems: "center",
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid var(--border-soft)",
        background: "var(--bg-2)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "var(--text)", fontSize: 13, fontWeight: 800 }}>{title}</div>
        {detail && <div style={{ color: "var(--text-3)", fontSize: 11.5, marginTop: 3, lineHeight: 1.35 }}>{detail}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "var(--text-2)", fontSize: 12, fontFamily: "var(--mono)", fontWeight: 750 }}>{value}</span>
        <span
          style={{
            padding: "4px 8px",
            borderRadius: 999,
            color: meta.color,
            background: meta.soft,
            border: "1px solid var(--border-soft)",
            fontSize: 10.5,
            fontFamily: "var(--mono)",
            fontWeight: 850,
            textTransform: "uppercase",
          }}
        >
          {meta.label}
        </span>
      </div>
    </div>
  );
}

export default function SystemHealthPanel() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState(null);
  const [health, setHealth] = useState({
    db: { status: "idle", latency: null, detail: "Databáze zatím nebyla otestována." },
    ai: { status: "idle", latency: null, detail: "AI test se spouští ručně, aby zbytečně nečerpal limit modelů." },
    pwa: { status: "idle", value: "—", detail: "Service Worker zatím nebyl zkontrolován." },
    remoteErrors24h: { status: "idle", value: 0, detail: "Produkční chyby za posledních 24 hodin." },
    remoteErrors7d: { status: "idle", value: 0, detail: "Produkční chyby za posledních 7 dní." },
    localErrors: { status: "idle", value: 0, detail: "Lokální chyby zachycené v tomto prohlížeči." },
  });

  const checkPwa = useCallback(async () => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return { status: "warning", value: "Nepodporováno", detail: "Prohlížeč nemá dostupný Service Worker." };
    }

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (!registrations.length) {
        return { status: "warning", value: "Neaktivní", detail: "Service Worker není registrovaný." };
      }
      return { status: "ok", value: `${registrations.length} registrací`, detail: "PWA Service Worker je aktivní." };
    } catch (error) {
      return { status: "error", value: "Chyba", detail: error.message };
    }
  }, []);

  const checkDb = useCallback(async () => {
    const start = performance.now();
    try {
      await withTimeout(
        supabase.from("projects").select("id", { count: "exact", head: true }),
        6000,
        "Supabase DB"
      );
      const latency = Math.round(performance.now() - start);
      return {
        status: latency < 350 ? "ok" : "warning",
        latency,
        detail: latency < 350 ? "Databáze odpovídá rychle." : "Databáze odpovídá, ale pomaleji než obvykle.",
      };
    } catch (error) {
      return { status: "error", latency: null, detail: error.message };
    }
  }, []);

  const checkRemoteErrorCounts = useCallback(async () => {
    const [last24h, last7d] = await Promise.all([
      supabase.from("app_error_logs").select("id", { count: "exact", head: true }).gte("created_at", sinceIso(24)),
      supabase.from("app_error_logs").select("id", { count: "exact", head: true }).gte("created_at", sinceIso(24 * 7)),
    ]);

    if (last24h.error) throw last24h.error;
    if (last7d.error) throw last7d.error;

    const count24 = last24h.count || 0;
    const count7 = last7d.count || 0;

    return {
      remoteErrors24h: {
        status: count24 === 0 ? "ok" : count24 <= 3 ? "warning" : "error",
        value: count24,
        detail: "Produkční chyby uložené v Supabase za posledních 24 hodin.",
      },
      remoteErrors7d: {
        status: count7 === 0 ? "ok" : count7 <= 10 ? "warning" : "error",
        value: count7,
        detail: "Produkční chyby uložené v Supabase za posledních 7 dní.",
      },
    };
  }, []);

  const runHealthCheck = useCallback(async ({ silent = false } = {}) => {
    setLoading(true);
    try {
      const localErrors = getErrorLogs().length;
      const [dbResult, pwaResult, remoteCounts] = await Promise.all([
        checkDb(),
        checkPwa(),
        checkRemoteErrorCounts().catch((error) => ({
          remoteErrors24h: { status: "error", value: "—", detail: error.message },
          remoteErrors7d: { status: "error", value: "—", detail: error.message },
        })),
      ]);

      setHealth((current) => ({
        ...current,
        db: dbResult,
        pwa: pwaResult,
        ...remoteCounts,
        localErrors: {
          status: localErrors === 0 ? "ok" : localErrors <= 5 ? "warning" : "error",
          value: localErrors,
          detail: "Lokální chyby zachycené v aktuálním prohlížeči.",
        },
      }));
      setLastCheckedAt(new Date().toISOString());
      if (!silent) toast("Health check dokončen", "success");
    } catch (error) {
      console.warn("System health check failed:", error);
      if (!silent) toast("Health check selhal: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  }, [checkDb, checkPwa, checkRemoteErrorCounts, toast]);

  const testAi = async () => {
    setTestingAi(true);
    const start = performance.now();
    try {
      const { data, error } = await withTimeout(
        supabase.functions.invoke("ai-task-assist", {
          body: {
            action: "priority",
            task: {
              title: "Health check AI služby",
              description: "Krátký test dostupnosti AI Edge Function a navazujícího modelu.",
            },
          },
        }),
        12000,
        "AI Edge Function"
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.result) throw new Error("AI služba nevrátila výsledek.");

      const latency = Math.round(performance.now() - start);
      setHealth((current) => ({
        ...current,
        ai: {
          status: latency < 8000 ? "ok" : "warning",
          latency,
          detail: latency < 8000
            ? "AI Edge Function odpověděla. Výsledek může v nouzi pocházet z lokálního fallbacku."
            : "AI odpověděla, ale pomaleji. Může jít o přetížení modelu.",
        },
      }));
      toast("AI test proběhl úspěšně", "success");
    } catch (error) {
      setHealth((current) => ({
        ...current,
        ai: { status: "error", latency: null, detail: error.message },
      }));
      toast("AI test selhal: " + error.message, "error");
    } finally {
      setTestingAi(false);
    }
  };

  useEffect(() => {
    runHealthCheck({ silent: true });
  }, [runHealthCheck]);

  const overallStatus = useMemo(() => {
    const values = Object.values(health).map((item) => item.status);
    if (values.includes("error")) return "error";
    if (values.includes("warning")) return "warning";
    return "ok";
  }, [health]);

  const overallMeta = STATUS_META[overallStatus];

  return (
    <div
      style={{
        position: "fixed",
        right: 20,
        bottom: 128,
        zIndex: 9996,
        width: open ? "min(720px, calc(100vw - 32px))" : "auto",
        maxHeight: "min(740px, calc(100vh - 120px))",
        fontFamily: "var(--font-ui)",
      }}
    >
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid var(--border-soft)",
            background: "color-mix(in srgb, var(--surface) 94%, transparent)",
            color: "var(--text)",
            boxShadow: "0 18px 48px rgba(0,0,0,.26)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
          title="Systémový health check"
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: overallMeta.color,
              boxShadow: `0 0 12px ${overallMeta.color}`,
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 850 }}>Health check</span>
          <span style={{ color: overallMeta.color, fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 850 }}>{overallMeta.label}</span>
        </button>
      ) : (
        <div
          style={{
            borderRadius: 18,
            border: "1px solid var(--border-soft)",
            background: "color-mix(in srgb, var(--surface) 96%, transparent)",
            boxShadow: "0 22px 70px rgba(0,0,0,.34)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ fontSize: 16 }}>🩺</span>
                <h3 style={{ margin: 0, color: "var(--text)", fontSize: 16, fontWeight: 850 }}>Systémový health check</h3>
                <span style={{ color: overallMeta.color, background: overallMeta.soft, border: "1px solid var(--border-soft)", borderRadius: 999, padding: "3px 8px", fontFamily: "var(--mono)", fontSize: 11, fontWeight: 850 }}>
                  {overallMeta.label}
                </span>
              </div>
              <p style={{ margin: "5px 0 0", color: "var(--text-3)", fontSize: 12.5 }}>
                Rychlý přehled dostupnosti Supabase, PWA, lokálních a produkčních chyb. AI test se spouští ručně.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ border: 0, background: "transparent", color: "var(--text-3)", fontSize: 22, lineHeight: 1 }}
              aria-label="Zavřít health check"
            >
              ×
            </button>
          </div>

          <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ color: "var(--text-3)", fontSize: 11.5, fontFamily: "var(--mono)" }}>
              {lastCheckedAt ? `Poslední kontrola: ${formatDateTime(lastCheckedAt)}` : "Kontrola zatím neproběhla"}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => runHealthCheck()} disabled={loading} style={smallButtonStyle}>
                {loading ? "Kontroluji…" : "Obnovit"}
              </button>
              <button type="button" onClick={testAi} disabled={testingAi} style={{ ...smallButtonStyle, color: "var(--accent)", background: "var(--accent-soft)" }}>
                {testingAi ? "Testuji AI…" : "Testovat AI"}
              </button>
            </div>
          </div>

          <div style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
            <HealthRow
              title="Supabase DB"
              value={health.db.latency !== null ? `${health.db.latency} ms` : "—"}
              status={health.db.status}
              detail={health.db.detail}
            />
            <HealthRow
              title="AI Edge Function"
              value={health.ai.latency !== null ? `${health.ai.latency} ms` : "ruční test"}
              status={health.ai.status}
              detail={health.ai.detail}
            />
            <HealthRow
              title="Produkční chyby 24 h"
              value={String(health.remoteErrors24h.value)}
              status={health.remoteErrors24h.status}
              detail={health.remoteErrors24h.detail}
            />
            <HealthRow
              title="Produkční chyby 7 dní"
              value={String(health.remoteErrors7d.value)}
              status={health.remoteErrors7d.status}
              detail={health.remoteErrors7d.detail}
            />
            <HealthRow
              title="Lokální chyby"
              value={String(health.localErrors.value)}
              status={health.localErrors.status}
              detail={health.localErrors.detail}
            />
            <HealthRow
              title="PWA Service Worker"
              value={health.pwa.value}
              status={health.pwa.status}
              detail={health.pwa.detail}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const smallButtonStyle = {
  padding: "6px 9px",
  borderRadius: 9,
  border: "1px solid var(--border-soft)",
  background: "var(--bg-2)",
  color: "var(--text-2)",
  fontSize: 11.5,
  fontWeight: 750,
};
