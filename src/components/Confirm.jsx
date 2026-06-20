import React, { useState, useContext, createContext, useCallback } from 'react'

export const ConfirmCtx = createContext(null);
export const useConfirm = () => useContext(ConfirmCtx);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { msg, resolve }
  const confirm = useCallback((msg) => new Promise((resolve) => {
    setState((current) => {
      if (current) { resolve(false); return current; } // dialog already open — reject duplicate
      return { msg, resolve };
    });
  }), []);
  const handle = (ok) => { state?.resolve(ok); setState(null); };
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {state && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "#0006", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div className="pop" style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: "24px 28px", maxWidth: 360, width: "100%", boxShadow: "0 20px 60px #0005" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 20, lineHeight: 1.45 }}>{state.msg}</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => handle(false)} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-2)", fontSize: 13, fontWeight: 500 }}>
                Zrušit
              </button>
              <button onClick={() => handle(true)} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 600 }}>
                Smazat
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}
