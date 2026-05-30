import React, { useState, useContext, createContext, useCallback } from 'react'
import { useApp } from '../context/AppContext.jsx'

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

function ToastList({ toasts }) {
  const ctx = useApp();
  if (!ctx) return null;
  const { t } = ctx;
  return (
    <>
      <style>{`
        @keyframes toastInCenter {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          pointerEvents: "none",
          width: "max-content",
          maxWidth: "90vw",
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              background: toast.type === "success"
                ? (ctx.dk ? "rgba(16, 185, 129, 0.16)" : "#e6fcf5")
                : (toast.type === "error" ? "rgba(239, 68, 68, 0.12)" : t.toast),
              color: toast.type === "success"
                ? (ctx.dk ? "#4ade80" : "#0f766e")
                : (toast.type === "error" ? "#ef4444" : t.text),
              padding: "12px 20px",
              borderRadius: 12,
              fontSize: 13.5,
              fontWeight: 550,
              border: toast.type === "success"
                ? (ctx.dk ? "1px solid rgba(74, 222, 128, 0.4)" : "1px solid #10b981")
                : (toast.type === "error" ? "1px solid rgba(239, 68, 68, 0.4)" : `1px solid ${t.border}`),
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              pointerEvents: "auto",
              animation: "toastInCenter .32s cubic-bezier(0.16, 1, 0.3, 1)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {toast.type === "success" && (
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: ctx.dk ? "rgba(74, 222, 128, 0.2)" : "#10b981",
                color: ctx.dk ? "#4ade80" : "#ffffff",
                fontSize: 11,
                fontWeight: 700,
              }}>✓</span>
            )}
            <span>{toast.msg}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "info") => {
    const id = uid();
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 2800);
  }, []);
  return (
    <ToastCtx.Provider value={add}>
      {children}
      <ToastList toasts={toasts} />
    </ToastCtx.Provider>
  );
}
