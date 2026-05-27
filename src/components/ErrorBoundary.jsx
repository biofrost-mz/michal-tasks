import React from 'react'

/* ─────────────────────────────────────────────
   ErrorBoundary — zachytí JS chyby v podstromu.
   Zobrazí fallback UI místo prázdné bílé stránky.

   Použití:
     <ErrorBoundary>               — základní, jen reload
     <ErrorBoundary label="Notes"> — označí odkud chyba pochází
     <ErrorBoundary inline>        — malý inline box místo fullscreen
───────────────────────────────────────────── */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error("[ErrorBoundary]", this.props.label ?? "", error, info?.componentStack);
  }

  handleReset() {
    this.setState({ hasError: false, error: null, info: null });
  }

  render() {
    const { hasError, error } = this.state;
    const { children, inline, label, fallback } = this.props;

    if (!hasError) return children;

    // Custom fallback prop
    if (typeof fallback === "function") {
      return fallback({ error, reset: () => this.handleReset() });
    }

    const title = label ? `Chyba v sekci „${label}"` : "Nastala neočekávaná chyba";
    const msg = error?.message || String(error);

    // Inline varianta — malý box uvnitř stránky
    if (inline) {
      return (
        <div style={{
          padding: "14px 16px", borderRadius: 10,
          background: "#ef444410", border: "1px solid #ef444430",
          display: "flex", alignItems: "flex-start", gap: 12,
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", fontFamily: "monospace", wordBreak: "break-all", marginBottom: 8 }}>{msg}</div>
            <button
              onClick={() => this.handleReset()}
              style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #ef444440", background: "transparent", color: "#ef4444", fontSize: 12, cursor: "pointer" }}
            >
              Zkusit znovu
            </button>
          </div>
        </div>
      );
    }

    // Fullscreen varianta
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "#0c0e14",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: 32, fontFamily: "'Figtree', sans-serif",
      }}>
        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: 18, marginBottom: 24,
          background: "#ef444418", border: "1px solid #ef444430",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 30,
        }}>
          ⚠️
        </div>

        <h1 style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 22, fontWeight: 800, color: "#e8ecf4",
          marginBottom: 8, textAlign: "center",
        }}>
          {title}
        </h1>

        <p style={{ fontSize: 14, color: "#8b95a5", textAlign: "center", maxWidth: 420, lineHeight: 1.6, marginBottom: 24 }}>
          Aplikace narazila na neočekávanou chybu. Zkus stránku obnovit — tvoje data jsou v bezpečí na serveru.
        </p>

        {/* Error detail (collapsible) */}
        <details style={{ marginBottom: 24, maxWidth: 500, width: "100%" }}>
          <summary style={{ fontSize: 12, color: "#5a6375", cursor: "pointer", userSelect: "none", marginBottom: 8 }}>
            Zobrazit technické detaily
          </summary>
          <pre style={{
            fontSize: 12, color: "#ef4444", background: "#ef444408",
            border: "1px solid #ef444420", borderRadius: 8,
            padding: 12, overflowX: "auto", lineHeight: 1.6,
            whiteSpace: "pre-wrap", wordBreak: "break-all",
          }}>
            {msg}
          </pre>
        </details>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={() => this.handleReset()}
            style={{
              padding: "10px 24px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg,#3b82f6,#8b5cf6)",
              color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            Zkusit znovu
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 24px", borderRadius: 10,
              border: "1px solid #242838", background: "transparent",
              color: "#8b95a5", fontSize: 14, cursor: "pointer",
            }}
          >
            Obnovit stránku
          </button>
        </div>

        <p style={{ fontSize: 12, color: "#5a6375", marginTop: 32 }}>
          Pokud se chyba opakuje, zkus vymazat cache prohlížeče (⌘⇧R).
        </p>
      </div>
    );
  }
}

/* ─────────────────────────────────────────────
   PageErrorBoundary — lehčí wrapper pro stránky.
   Zobrazí chybu uvnitř main layoutu (ne fullscreen).
───────────────────────────────────────────── */
export function PageErrorBoundary({ children, label }) {
  return (
    <ErrorBoundary inline label={label}>
      {children}
    </ErrorBoundary>
  );
}
