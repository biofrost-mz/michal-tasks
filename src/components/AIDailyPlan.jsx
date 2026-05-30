import React, { useState, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { supabase } from '../supabase.js'
import { renderMarkdown, sanitizeHtml } from '../utils.js'
import Icon from './Icon.jsx'

/* ─────────────────────────────────────────────
   Cache helpers — plan se ukládá per user+datum
───────────────────────────────────────────── */
function getCacheKey(userId, workspaceId) {
  const today = new Date().toISOString().slice(0, 10);
  return `ai-plan:${userId}:${workspaceId}:${today}`;
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

function savePlanToCache(userId, workspaceId, plan, generatedAt) {
  try {
    localStorage.setItem(getCacheKey(userId, workspaceId), JSON.stringify({ plan, generatedAt }));
  } catch { /* ignore storage errors */ }
}

/* ─────────────────────────────────────────────
   Skeleton loader — pulsující řádky
───────────────────────────────────────────── */
function PlanSkeleton({ t }) {
  const line = (w, mb = 8) => (
    <div style={{
      height: 14, width: w, borderRadius: 6,
      background: `linear-gradient(90deg, ${t.border} 25%, ${t.borderH} 50%, ${t.border} 75%)`,
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
  const { t, userId, activeWorkspaceId, tasks } = useApp();

  const [plan, setPlan] = useState(null);       // string | null
  const [generatedAt, setGeneratedAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(true);

  const activeTasks = tasks.filter((x) => x.status !== "done");

  // Načti cache při mountu
  useEffect(() => {
    if (!userId || !activeWorkspaceId) return;
    const cached = loadCachedPlan(userId, activeWorkspaceId);
    if (cached) {
      setPlan(cached.plan);
      setGeneratedAt(cached.generatedAt);
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
        const msg = fnErr.message || "";
        if (msg.includes("Rate limit") || fnErr.status === 429) {
          setError("Příliš mnoho generování — zkus to za hodinu.");
        } else if (msg.includes("non-2xx") || fnErr.status === 401) {
          setError("AI služba je momentálně nedostupná (problém s přihlášením nebo vypršela relace). Zkus se odhlásit a znovu přihlásit.");
        } else {
          setError("Nepodařilo se vygenerovat plán: " + msg);
        }
        return;
      }
      if (data?.error) {
        const dErr = data.error;
        if (dErr.includes("Rate limit")) {
          setError("Příliš mnoho generování — zkus to za hodinu.");
        } else if (dErr.includes("non-2xx") || dErr.includes("Unauthorized")) {
          setError("AI služba je momentálně nedostupná (problém s přihlášením nebo vypršela relace). Zkus se odhlásit a znovu přihlásit.");
        } else {
          setError(`Chyba: ${dErr}`);
        }
        return;
      }
      setPlan(data.plan);
      setGeneratedAt(data.generatedAt);
      savePlanToCache(userId, activeWorkspaceId, data.plan, data.generatedAt);
    } catch (e) {
      setError("Nepodařilo se vygenerovat plán");
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
      border: `1px solid ${t.border}`,
      background: t.card,
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
          borderBottom: open ? `1px solid ${t.border}` : "none",
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
          <div style={{ fontSize: 13.5, fontWeight: 700, color: t.text, display: "flex", alignItems: "center", gap: 6 }}>
            AI Denní plán
            <span style={{
              fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
              background: "linear-gradient(90deg,var(--accent),var(--accent-2))",
              color: "var(--bg)", letterSpacing: ".04em",
            }}>AI</span>
          </div>
          <div style={{ fontSize: 12, color: t.text3, marginTop: 1 }}>
            {loading ? "Přemýšlím…" : plan ? `Vygenerováno v ${timeLabel}` : "Co dnes udělat jako první?"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {plan && !loading && (
            <button
              onClick={(e) => { e.stopPropagation(); generate(); }}
              title="Obnovit plán"
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "4px 9px", borderRadius: 6, border: `1px solid ${t.border}`,
                background: t.input, color: t.text3, fontSize: 12, cursor: "pointer",
                fontWeight: 500,
              }}
            >
              <Icon name="refresh-cw" size={11} color={t.text3} strokeWidth={2} />
              Obnovit
            </button>
          )}
          <Icon
            name={open ? "chevron-up" : "chevron-down"}
            size={15} color={t.text3} strokeWidth={2}
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
              background: "#ef444410", border: "1px solid #ef444430",
              marginBottom: 14,
            }}>
              <div style={{ fontSize: 13, color: "#ef4444", fontWeight: 600, marginBottom: 4 }}>
                Chyba
              </div>
              <div style={{ fontSize: 12, color: t.text2 }}>{error}</div>
              {error.includes("ANTHROPIC_API_KEY") && (
                <div style={{ fontSize: 12, color: t.text3, marginTop: 8, lineHeight: 1.6 }}>
                  Přidej <code style={{ background: t.input, padding: "1px 5px", borderRadius: 4 }}>ANTHROPIC_API_KEY</code> do{" "}
                  Supabase → Project Settings → Edge Functions → Secrets.
                </div>
              )}
            </div>
          )}

          {/* Loading skeleton */}
          {loading && <PlanSkeleton t={t} />}

          {/* Plan content */}
          {plan && !loading && (
            <div
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMarkdown(plan)) }}
              style={{ fontSize: 13.5, lineHeight: 1.75, color: t.text }}
            />
          )}

          {/* Empty / CTA */}
          {!plan && !loading && !error && (
            <div style={{ textAlign: "center", padding: "10px 0 4px" }}>
              <div style={{ fontSize: 13, color: t.text3, marginBottom: 14 }}>
                {activeTasks.length > 0
                  ? `Mám ${activeTasks.length} aktivních úkolů. Claude je prohlédne a navrhne, na co se soustředit.`
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
                    : t.input,
                  color: activeTasks.length > 0 ? "var(--bg)" : t.text3,
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
