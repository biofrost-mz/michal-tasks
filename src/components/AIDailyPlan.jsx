import React, { useState, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { supabase } from '../supabase.js'
import { renderMarkdown, sanitizeHtml, startOfToday } from '../utils.js'
import { formatDateKey } from '../locale.js'
import { getAiErrorMessage } from '../utils/aiErrors.js'
import Icon from './Icon.jsx'

/* ─────────────────────────────────────────────
   Cache helpers — plan se ukládá per user+datum
───────────────────────────────────────────── */
function getCacheKey(userId, workspaceId) {
  return `ai-plan:${userId}:${workspaceId}:${formatDateKey(startOfToday())}`;
}

function loadCachedPlan(userId, workspaceId) {
  try {
    const raw = localStorage.getItem(getCacheKey(userId, workspaceId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function savePlanToCache(userId, workspaceId, plan, generatedAt, activeModel) {
  try {
    localStorage.setItem(getCacheKey(userId, workspaceId), JSON.stringify({ plan, generatedAt, activeModel }));
  } catch { /* ignore storage errors */ }
}

function getDailyPlanError(error, data = {}) {
  const info = getAiErrorMessage(error, data);
  return {
    ...info,
    message: info.type === "model_overloaded"
      ? "AI model je momentálně přetížený. Zkus plán vygenerovat znovu za chvíli. Pokud máš cache, zůstane zobrazený poslední vygenerovaný plán."
      : info.message,
  };
}

/* ─────────────────────────────────────────────
   Skeleton loader — pulsující řádky
───────────────────────────────────────────── */
function PlanSkeleton() {
  const line = (w, mb = 8) => (
    <div style={{
      height: 14, width: w, borderRadius: 6,
      background: "linear-gradient(90deg, var(--border) 25%, var(--border-h) 50%, var(--border) 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
      marginBottom: mb,
    }} />
  );
  return (
    <>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ padding: "4px 0" }}>
        {line("70%", 16)}
        {line("90%")} 
        {line("60%")}
        {line("85%", 16)}
        {line("75%")}
        {line("50%")}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   AIDailyPlan
───────────────────────────────────────────── */
export default function AIDailyPlan() {
  const { userId, activeWorkspaceId, tasks } = useApp();

  const [plan, setPlan] = useState(null);       // string | null
  const [generatedAt, setGeneratedAt] = useState(null);
  const [activeModel, setActiveModel] = useState("Gemini 2.5 Pro");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback((e) => {
    e.stopPropagation();
    if (!plan) return;
    navigator.clipboard.writeText(plan).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [plan]);

  const activeTasks = tasks.filter((x) => x.status !== "done");

  // Načti cache při mountu
  useEffect(() => {
    if (!userId || !activeWorkspaceId) return;
    const cached = loadCachedPlan(userId, activeWorkspaceId);
    if (cached) {
      setPlan(cached.plan);
      setGeneratedAt(cached.generatedAt);
      if (cached.activeModel) {
        setActiveModel(cached.activeModel);
        window.dispatchEvent(new CustomEvent("zentero:daily_plan_updated", { detail: { activeModel: cached.activeModel } }));
      }
    }
  }, [userId, activeWorkspaceId]);

  const generate = useCallback(async () => {
    if (!userId || !activeWorkspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("ai-daily-plan", {
        body: { workspaceId: activeWorkspaceId },
      });

      if (fnErr) {
        setError(getDailyPlanError(fnErr, data));
        return;
      }

      if (data?.error) {
        setError(getDailyPlanError(new Error(data.error), data));
        return;
      }

      if (!data?.plan) {
        setError(getDailyPlanError(new Error("AI služba nevrátila denní plán."), data));
        return;
      }

      setPlan(data.plan);
      setGeneratedAt(data.generatedAt);
      const model = data.meta?.model || "Gemini 2.5 Pro";
      setActiveModel(model);
      savePlanToCache(userId, activeWorkspaceId, data.plan, data.generatedAt, model);
      window.dispatchEvent(new CustomEvent("zentero:daily_plan_updated", { detail: { activeModel: model } }));
    } catch (e) {
      setError(getDailyPlanError(e));
    } finally {
      setLoading(false);
    }
  }, [userId, activeWorkspaceId]);

  const timeLabel = generatedAt
    ? new Date(generatedAt).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div style={{
      borderRadius: 14,
      border: "1px solid var(--border)",
      background: "var(--surface)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "13px 16px",
          cursor: "pointer",
          background: open
            ? `linear-gradient(135deg, var(--accent-soft), transparent)`
            : "transparent",
          borderBottom: open ? "1px solid var(--border)" : "none",
          transition: "background .15s",
        }}
      >
        {/* Icon */}
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 15 }}>✨</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
            AI Denní plán
            <span style={{
              fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
              background: "linear-gradient(90deg,var(--accent),var(--accent-2))",
              color: "var(--bg)", letterSpacing: ".04em",
            }}>AI</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 1 }}>
            {loading ? "Přemýšlím…" : plan ? `Vygenerováno v ${timeLabel} pomocí ${activeModel}` : "Co dnes udělat jako první?"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {plan && !loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                onClick={handleCopy}
                title="Kopírovat plán jako Markdown"
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "4px 9px", borderRadius: 6, border: "1px solid var(--border)",
                  background: "var(--input)", color: copied ? "var(--accent)" : "var(--text-3)", fontSize: 12, cursor: "pointer",
                  fontWeight: 500, transition: "color .2s",
                }}
              >
                <Icon name={copied ? "check" : "copy"} size={11} color={copied ? "var(--accent)" : "var(--text-3)"} strokeWidth={1.8} />
                {copied ? "Zkopírováno" : "Kopírovat"}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); generate(); }}
                title="Obnovit plán"
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "4px 9px", borderRadius: 6, border: "1px solid var(--border)",
                  background: "var(--input)", color: "var(--text-3)", fontSize: 12, cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                <Icon name="refresh-cw" size={11} color="var(--text-3)" strokeWidth={2} />
                Obnovit
              </button>
            </div>
          )}
          <Icon
            name={open ? "chevron-up" : "chevron-down"}
            size={15} color="var(--text-3)" strokeWidth={2}
          />
        </div>
      </div>

      {/* Body */}
      {open && (
        <div style={{ padding: "16px 18px 18px" }}>
          {/* Error state */}
          {error && !loading && (
            <div style={{
              padding: "12px 14px", borderRadius: 8,
              background: error.severity === "warning" ? "#f59e0b12" : "#ef444410",
              border: error.severity === "warning" ? "1px solid #f59e0b40" : "1px solid #ef444430",
              marginBottom: 14,
            }}>
              <div style={{ fontSize: 13, color: error.severity === "warning" ? "#f59e0b" : "#ef4444", fontWeight: 700, marginBottom: 4 }}>
                {error.title || "Chyba AI"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.5 }}>{error.message}</div>
              {error.raw && (
                <details style={{ marginTop: 8, color: "var(--text-3)", fontSize: 11.5 }}>
                  <summary style={{ cursor: "pointer" }}>Technický detail</summary>
                  <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", marginTop: 6, fontFamily: "var(--mono)", fontSize: 11 }}>
                    {error.raw}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Loading skeleton */}
          {loading && <PlanSkeleton />}

          {/* Plan content */}
          {plan && !loading && (
            <div
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMarkdown(plan)) }}
              style={{ fontSize: 13.5, lineHeight: 1.75, color: "var(--text)" }}
            />
          )}

          {/* Empty / CTA */}
          {!plan && !loading && !error && (
            <div style={{ textAlign: "center", padding: "10px 0 4px" }}>
              <div style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 14 }}>
                {activeTasks.length > 0
                  ? `Mám ${activeTasks.length} aktivních úkolů. AI je projde a navrhne, na co se soustředit.`
                  : "Nemáš žádné aktivní úkoly — nejdřív je přidej."}
              </div>
              <button
                onClick={generate}
                disabled={activeTasks.length === 0}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "10px 22px", borderRadius: 10, border: "none",
                  background: activeTasks.length > 0
                    ? "linear-gradient(135deg, var(--accent), var(--accent-2))"
                    : "var(--input)",
                  color: activeTasks.length > 0 ? "var(--bg)" : "var(--text-3)",
                  fontSize: 13.5, fontWeight: 600, cursor: activeTasks.length > 0 ? "pointer" : "default",
                }}
              >
                <span style={{ fontSize: 16 }}>✨</span>
                Vygenerovat denní plán
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
