import React, { useMemo, useState } from "react";
import { AI_CONSOLE_ACTIONS, runAiConsoleAction } from "../../services/aiService.js";
import { getAiErrorMessage } from "../../utils/aiErrors.js";
import { useApp } from "../../context/AppContext.jsx";
import { useToast } from "../Toast.jsx";

const DEFAULT_INPUT = "Připravit redesign poznámek v Zentero, zlepšit přehlednost na mobilu a otestovat ukládání.";

function stringify(value) {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function StatusPill({ meta, error }) {
  if (error) return <span style={pillStyle("var(--red)", "var(--red-soft)")}>error</span>;
  if (!meta) return <span style={pillStyle("var(--text-3)", "var(--bg-2)")}>bez meta</span>;
  const color = meta.source === "primary" ? "var(--green)" : meta.source === "secondary" ? "var(--orange)" : "var(--red)";
  const bg = meta.source === "primary" ? "var(--green-soft)" : meta.source === "secondary" ? "var(--orange-soft)" : "var(--red-soft)";
  return <span style={pillStyle(color, bg)}>{meta.source}</span>;
}

function pillStyle(color, bg) {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 8px",
    borderRadius: 999,
    border: "1px solid var(--border-soft)",
    color,
    background: bg,
    fontFamily: "var(--mono)",
    fontSize: 11,
    fontWeight: 850,
  };
}

export default function AiTestConsolePanel({ embedded = false }) {
  const { tags, projects, activeWorkspaceId } = useApp();
  const toast = useToast();
  const [open, setOpen] = useState(embedded);
  const [actionId, setActionId] = useState("draft_task");
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const selectedAction = useMemo(
    () => AI_CONSOLE_ACTIONS.find((action) => action.id === actionId) || AI_CONSOLE_ACTIONS[0],
    [actionId]
  );

  const runTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const output = await runAiConsoleAction(actionId, input, {
        workspaceId: activeWorkspaceId,
        availableTags: tags.map((tag) => tag.name),
        availableProjects: projects.map((project) => project.name),
      });

      setResult(output);
      if (output.error || output.data?.error) {
        const info = getAiErrorMessage(output.error || new Error(output.data?.error), output.data || {});
        toast(`${info.title}: ${info.message}`, info.severity === "warning" ? "warning" : "error");
      } else {
        const metaLabel = output.meta?.source ? ` (${output.meta.source}${output.meta.model ? ` / ${output.meta.model}` : ""})` : "";
        toast(`AI test dokončen${metaLabel}`, "success");
      }
    } catch (error) {
      const info = getAiErrorMessage(error);
      setResult({ error, data: null, durationMs: null, meta: null, parsedResult: null, rawResult: null, body: null, action: selectedAction });
      toast(`${info.title}: ${info.message}`, info.severity === "warning" ? "warning" : "error");
    } finally {
      setLoading(false);
    }
  };

  const panelContent = (
    <div style={{
      borderRadius: embedded ? "var(--r-lg)" : 18,
      border: "1px solid var(--border-soft)",
      background: embedded ? "var(--surface)" : "color-mix(in srgb, var(--surface) 98%, transparent)",
      boxShadow: embedded ? "none" : "0 22px 70px rgba(0,0,0,.34)",
      backdropFilter: embedded ? "none" : "blur(18px)",
      WebkitBackdropFilter: embedded ? "none" : "blur(18px)",
      overflow: "hidden",
    }}>
      <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ fontSize: 16 }}>🧪</span>
            <h3 style={{ margin: 0, color: "var(--text)", fontSize: 16, fontWeight: 850 }}>AI testovací konzole</h3>
            {result && <StatusPill meta={result.meta} error={result.error || result.data?.error} />}
          </div>
          <p style={{ margin: "5px 0 0", color: "var(--text-3)", fontSize: 12.5 }}>
            Otestuj Edge Function, raw odpověď, parsovaný výsledek a meta.source bez vytváření reálných dat.
          </p>
        </div>
        {!embedded && (
          <button type="button" onClick={() => setOpen(false)} style={{ border: 0, background: "transparent", color: "var(--text-3)", fontSize: 22, lineHeight: 1 }} aria-label="Zavřít AI konzoli">
            ×
          </button>
        )}
      </div>

      <div style={{ padding: 16, display: "grid", gap: 12, maxHeight: embedded ? "none" : "calc(100vh - 250px)", overflowY: embedded ? "visible" : "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(200px, 260px) 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Akce</label>
            <select value={actionId} onChange={(event) => setActionId(event.target.value)} style={inputStyle}>
              {AI_CONSOLE_ACTIONS.map((action) => (
                <option key={action.id} value={action.id}>{action.label}</option>
              ))}
            </select>
            <div style={{ marginTop: 7, color: "var(--text-3)", fontSize: 11.5, lineHeight: 1.45 }}>
              {selectedAction.description}<br />
              <span style={{ fontFamily: "var(--mono)" }}>{selectedAction.functionName}</span>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Testovací vstup</label>
            <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={5} style={{ ...inputStyle, minHeight: 112, resize: "vertical", lineHeight: 1.5 }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap" }}>
          <div style={{ color: "var(--text-3)", fontSize: 11.5, fontFamily: "var(--mono)" }}>
            Kontext: {tags.length} tagů · {projects.length} projektů · workspace {activeWorkspaceId ? "OK" : "—"}
          </div>
          <button type="button" onClick={runTest} disabled={loading} style={{ ...smallButtonStyle, color: "var(--accent)", background: "var(--accent-soft)" }}>
            {loading ? "Testuji…" : "Spustit AI test"}
          </button>
        </div>

        {result && (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span style={pillStyle("var(--text-2)", "var(--bg-2)")}>{result.durationMs ?? "—"} ms</span>
              {result.meta?.model && <span style={pillStyle("var(--accent)", "var(--accent-soft)")}>{result.meta.model}</span>}
              {result.meta?.provider && <span style={pillStyle("var(--text-2)", "var(--bg-2)")}>{result.meta.provider}</span>}
              {result.meta?.fallback && <span style={pillStyle("var(--orange)", "var(--orange-soft)")}>fallback</span>}
            </div>

            {(result.error || result.data?.error) && (
              <pre style={errorBoxStyle}>{stringify(result.error?.message || result.data?.error || result.error)}</pre>
            )}

            <ResultBlock title="Request body" value={result.body} />
            <ResultBlock title="Meta" value={result.meta} />
            <ResultBlock title="Parsed result" value={result.parsedResult} />
            <ResultBlock title="Raw response" value={result.data} />
          </div>
        )}
      </div>
    </div>
  );

  if (embedded) return panelContent;

  return (
    <div style={{ position: "fixed", right: 20, top: 140, zIndex: 10049, width: open ? "min(780px, calc(100vw - 32px))" : "auto", maxHeight: "min(780px, calc(100vh - 150px))", fontFamily: "var(--font-ui)" }}>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 999, border: "1px solid var(--border-soft)", background: "color-mix(in srgb, var(--surface) 96%, transparent)", color: "var(--text)", boxShadow: "0 18px 48px rgba(0,0,0,.26)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }} title="AI testovací konzole">
          <span style={{ fontSize: 15 }}>🧪</span>
          <span style={{ fontSize: 13, fontWeight: 850 }}>AI konzole</span>
          {result && <StatusPill meta={result.meta} error={result.error || result.data?.error} />}
        </button>
      ) : panelContent}
    </div>
  );
}

function ResultBlock({ title, value }) {
  return (
    <details open={title === "Parsed result" || title === "Meta"} style={{ border: "1px solid var(--border-soft)", borderRadius: 12, background: "var(--bg-2)", overflow: "hidden" }}>
      <summary style={{ cursor: "pointer", padding: "9px 12px", color: "var(--text)", fontSize: 12.5, fontWeight: 850 }}>{title}</summary>
      <pre style={{ margin: 0, padding: "10px 12px", borderTop: "1px solid var(--border-soft)", color: "var(--text-2)", fontFamily: "var(--mono)", fontSize: 11, lineHeight: 1.45, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{stringify(value)}</pre>
    </details>
  );
}

const labelStyle = { display: "block", color: "var(--text-3)", fontSize: 11.5, fontWeight: 850, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 };
const inputStyle = { width: "100%", border: "1px solid var(--border-soft)", borderRadius: 10, background: "var(--bg-2)", color: "var(--text)", padding: "9px 10px", fontFamily: "var(--font-ui)", fontSize: 13, outline: "none" };
const smallButtonStyle = { padding: "7px 10px", borderRadius: 9, border: "1px solid var(--border-soft)", background: "var(--bg-2)", color: "var(--text-2)", fontSize: 11.5, fontWeight: 800 };
const errorBoxStyle = { margin: 0, padding: 10, borderRadius: 10, border: "1px solid #ef444440", background: "#ef444410", color: "var(--red)", fontFamily: "var(--mono)", fontSize: 11, whiteSpace: "pre-wrap", wordBreak: "break-word" };
