import React, { useState, useContext, createContext, useCallback } from 'react'

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

function ToastList({ toasts }) {
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
        .toast-container {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 99999;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          pointer-events: none;
          width: max-content;
          max-width: 90vw;
        }
        .toast-item {
          padding: 12px 22px;
          border-radius: 12px;
          font-size: 13.5px;
          font-weight: 600;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          pointer-events: auto;
          animation: toastInCenter .36s cubic-bezier(0.16, 1, 0.3, 1) both;
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-ui);
        }
        
        /* Success Toast style */
        .toast-item.success {
          background: rgba(14, 22, 16, 0.94);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.4);
        }
        :root.light .toast-item.success {
          background: rgba(240, 253, 244, 0.96);
          color: #15803d;
          border: 1px solid rgba(21, 128, 61, 0.3);
        }
        
        /* Error Toast style */
        .toast-item.error {
          background: rgba(26, 14, 14, 0.94);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.4);
        }
        :root.light .toast-item.error {
          background: rgba(254, 242, 242, 0.96);
          color: #b91c1c;
          border: 1px solid rgba(185, 28, 28, 0.3);
        }
        
        /* Info/Default Toast style */
        .toast-item.info {
          background: rgba(18, 22, 33, 0.94);
          color: #ededf2;
          border: 1px solid rgba(38, 44, 60, 0.85);
        }
        :root.light .toast-item.info {
          background: rgba(255, 255, 255, 0.96);
          color: #1e293b;
          border: 1px solid rgba(226, 232, 240, 0.9);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
        }
        
        .toast-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          font-size: 11px;
          font-weight: 700;
        }
        .toast-icon.success {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }
        :root.light .toast-icon.success {
          background: rgba(21, 128, 61, 0.15);
          color: #15803d;
        }
      `}</style>
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-item ${toast.type || 'info'}`}>
            {toast.type === "success" && (
              <span className="toast-icon success">✓</span>
            )}
            {toast.type === "error" && (
              <span className="toast-icon error" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}>✕</span>
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
    const duration = type === "error" ? 5500 : 2800;
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), duration);
    if (type === "error") navigator.vibrate?.([50, 30, 50]);
  }, []);
  return (
    <ToastCtx.Provider value={add}>
      {children}
      <ToastList toasts={toasts} />
    </ToastCtx.Provider>
  );
}
