import React from "react";

const ILLUSTRATIONS = {
  tasks: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="14" width="44" height="36" rx="6" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" opacity="0.35"/>
      <rect x="18" y="24" width="28" height="3" rx="1.5" fill="currentColor" opacity="0.25"/>
      <rect x="18" y="31" width="20" height="3" rx="1.5" fill="currentColor" opacity="0.18"/>
      <rect x="18" y="38" width="24" height="3" rx="1.5" fill="currentColor" opacity="0.14"/>
      <circle cx="56" cy="52" r="14" fill="var(--bg-2)" stroke="var(--accent)" strokeWidth="2.5"/>
      <path d="M50 52l4 4 7-7" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  projects: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="20" width="26" height="32" rx="5" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" opacity="0.3"/>
      <rect x="40" y="20" width="26" height="32" rx="5" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" opacity="0.2"/>
      <rect x="14" y="28" width="14" height="2.5" rx="1.25" fill="currentColor" opacity="0.3"/>
      <rect x="14" y="33" width="10" height="2.5" rx="1.25" fill="currentColor" opacity="0.22"/>
      <circle cx="55" cy="19" r="10" fill="var(--bg-2)" stroke="var(--accent)" strokeWidth="2.5"/>
      <path d="M55 14v5m0 0v5m0-5h-5m5 0h5" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  notes: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 10 C14 10 18 10 18 14 L18 50 C18 54 22 54 22 54 L50 54 C54 54 54 50 54 50 L54 18 L46 10 Z" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" fill="none" opacity="0.3"/>
      <path d="M46 10 L46 18 L54 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
      <rect x="25" y="24" width="20" height="2.5" rx="1.25" fill="currentColor" opacity="0.3"/>
      <rect x="25" y="30" width="15" height="2.5" rx="1.25" fill="currentColor" opacity="0.22"/>
      <path d="M25 39 L29 43 L37 35" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  filter: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 18 H56 L40 36 V52 L28 46 V36 Z" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" fill="none" opacity="0.3" strokeLinejoin="round"/>
      <circle cx="58" cy="54" r="12" fill="var(--bg-2)" stroke="var(--accent)" strokeWidth="2.5"/>
      <path d="M53 54h10M58 49v10" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  search: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="34" cy="34" r="18" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" opacity="0.35"/>
      <path d="M47 47L62 62" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.35"/>
      <path d="M26 34h16M34 26v16" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    </svg>
  ),
  todos: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="16" width="48" height="40" rx="6" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" opacity="0.3"/>
      <circle cx="22" cy="29" r="4" stroke="currentColor" strokeWidth="1.5" opacity="0.35"/>
      <circle cx="22" cy="41" r="4" stroke="currentColor" strokeWidth="1.5" opacity="0.28"/>
      <circle cx="22" cy="53" r="4" stroke="currentColor" strokeWidth="1.5" opacity="0.2"/>
      <rect x="30" y="27" width="20" height="2.5" rx="1.25" fill="currentColor" opacity="0.3"/>
      <rect x="30" y="39" width="16" height="2.5" rx="1.25" fill="currentColor" opacity="0.22"/>
      <rect x="30" y="51" width="18" height="2.5" rx="1.25" fill="currentColor" opacity="0.16"/>
      <path d="M55 22L58 25L64 19" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  timeline: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="12" y1="40" x2="68" y2="40" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" opacity="0.3"/>
      <circle cx="26" cy="40" r="6" stroke="currentColor" strokeWidth="2" opacity="0.35" fill="var(--bg-2)"/>
      <circle cx="44" cy="40" r="6" stroke="var(--accent)" strokeWidth="2.5" fill="var(--accent)" fillOpacity="0.15"/>
      <circle cx="62" cy="40" r="6" stroke="currentColor" strokeWidth="2" opacity="0.25" fill="var(--bg-2)"/>
    </svg>
  ),
};

export default function EmptyState({ type = "tasks", title, description, action, actionLabel }) {
  const illustration = ILLUSTRATIONS[type] || ILLUSTRATIONS.tasks;

  return (
    <div className="empty-state">
      {/* Glowing orb behind illustration */}
      <div className="empty-state-glow" />

      <div className="empty-state-illustration">
        {illustration}
      </div>

      <div className="empty-state-title">{title}</div>

      {description && (
        <div className="empty-state-desc">{description}</div>
      )}

      {action && (
        <button className="empty-state-cta" onClick={action}>
          {actionLabel || "Přidat"}
        </button>
      )}
    </div>
  );
}
