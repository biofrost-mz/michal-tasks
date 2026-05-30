import React from "react";

const ILLUSTRATIONS = {
  tasks: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="14" width="44" height="36" rx="6" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" opacity="0.35"/>
      <rect x="18" y="24" width="28" height="3" rx="1.5" fill="currentColor" opacity="0.25"/>
      <rect x="18" y="31" width="20" height="3" rx="1.5" fill="currentColor" opacity="0.18"/>
      <rect x="18" y="38" width="24" height="3" rx="1.5" fill="currentColor" opacity="0.14"/>
      <circle cx="48" cy="44" r="10" fill="var(--bg-2)" stroke="var(--accent)" strokeWidth="2"/>
      <path d="M44 44l3 3 5-5" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  projects: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="20" width="22" height="28" rx="5" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" opacity="0.3"/>
      <rect x="34" y="20" width="22" height="28" rx="5" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" opacity="0.2"/>
      <rect x="14" y="28" width="10" height="2.5" rx="1.25" fill="currentColor" opacity="0.3"/>
      <rect x="14" y="33" width="7" height="2.5" rx="1.25" fill="currentColor" opacity="0.22"/>
      <circle cx="45" cy="19" r="8" fill="var(--bg-2)" stroke="var(--accent)" strokeWidth="2"/>
      <path d="M45 15v4m0 0v4m0-4h-4m4 0h4" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  notes: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 10 C14 10 18 10 18 14 L18 50 C18 54 22 54 22 54 L50 54 C54 54 54 50 54 50 L54 18 L46 10 Z" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" fill="none" opacity="0.3"/>
      <path d="M46 10 L46 18 L54 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
      <rect x="25" y="24" width="20" height="2.5" rx="1.25" fill="currentColor" opacity="0.3"/>
      <rect x="25" y="30" width="15" height="2.5" rx="1.25" fill="currentColor" opacity="0.22"/>
      <path d="M25 39 L29 43 L37 35" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  filter: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 18 H52 L38 34 V50 L26 44 V34 Z" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" fill="none" opacity="0.3" strokeLinejoin="round"/>
      <circle cx="48" cy="46" r="9" fill="var(--bg-2)" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" opacity="0.5"/>
      <path d="M44 46 L53 46M48 42 L48 50" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    </svg>
  ),
  search: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="28" r="14" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" opacity="0.35"/>
      <path d="M38 38 L52 52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.35"/>
      <path d="M22 28 h12 M28 22 v12" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    </svg>
  ),
  todos: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="16" width="44" height="34" rx="6" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" opacity="0.3"/>
      <circle cx="20" cy="27" r="3.5" stroke="currentColor" strokeWidth="1.5" opacity="0.35"/>
      <circle cx="20" cy="37" r="3.5" stroke="currentColor" strokeWidth="1.5" opacity="0.28"/>
      <circle cx="20" cy="47" r="3.5" stroke="currentColor" strokeWidth="1.5" opacity="0.2"/>
      <rect x="28" y="25" width="18" height="2.5" rx="1.25" fill="currentColor" opacity="0.3"/>
      <rect x="28" y="35" width="14" height="2.5" rx="1.25" fill="currentColor" opacity="0.22"/>
      <rect x="28" y="45" width="16" height="2.5" rx="1.25" fill="currentColor" opacity="0.16"/>
      <path d="M47 22 L50 25 L55 19" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  timeline: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="12" y1="32" x2="52" y2="32" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" opacity="0.3"/>
      <circle cx="22" cy="32" r="4" stroke="currentColor" strokeWidth="2" opacity="0.35" fill="var(--bg-2)"/>
      <circle cx="36" cy="32" r="4" stroke="var(--accent)" strokeWidth="2" fill="var(--accent)" fillOpacity="0.15"/>
      <circle cx="50" cy="32" r="4" stroke="currentColor" strokeWidth="2" opacity="0.25" fill="var(--bg-2)"/>
    </svg>
  ),
};

export default function EmptyState({ type = "tasks", title, description, action, actionLabel }) {
  const illustration = ILLUSTRATIONS[type] || ILLUSTRATIONS.tasks;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "60px 24px",
      gap: 16,
      textAlign: "center",
      color: "var(--text-3)",
    }}>
      <div style={{ color: "var(--text-3)", opacity: 0.9 }}>
        {illustration}
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-2)", marginBottom: 6 }}>
          {title}
        </div>
        {description && (
          <div style={{ fontSize: 13, color: "var(--text-3)", maxWidth: 280, lineHeight: 1.6 }}>
            {description}
          </div>
        )}
      </div>
      {action && (
        <button
          className="btn primary"
          onClick={action}
          style={{ marginTop: 4, fontSize: 13 }}
        >
          {actionLabel || "Přidat"}
        </button>
      )}
    </div>
  );
}
