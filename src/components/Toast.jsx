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
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            background: t.toast,
            color:
              toast.type === "success"
                ? "#22c55e"
                : toast.type === "error"
                ? "#ef4444"
                : t.text,
            padding: "10px 18px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            border: `1px solid ${t.border}`,
            boxShadow: "0 4px 20px #0003",
            animation: "toastIn .25s ease-out",
          }}
        >
          {toast.type === "success" && "✓ "}
          {toast.msg}
        </div>
      ))}
    </div>
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
