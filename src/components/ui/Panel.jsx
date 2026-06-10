import React from "react";

/**
 * Panel — design-token-aware card/panel primitive
 *
 * @param {React.ReactNode} children
 * @param {object}  style       — container override
 * @param {string|number} padding — inner padding (default "var(--space-4)")
 * @param {string}  title
 * @param {React.ReactNode} headerRight
 * @param {string}  className
 */
export default function Panel({
  children,
  style,
  padding = "var(--space-4)",
  title,
  headerRight,
  className = "",
  // t prop přijat ale ignorován
  t: _t,
}) {
  const pad = typeof padding === "number" ? `${padding}px` : padding;

  return (
    <div className={`panel ${className}`.trim()} style={style}>
      {(title || headerRight) && (
        <div className="panel__header" style={{ padding: pad }}>
          {title && <div className="panel__title">{title}</div>}
          {headerRight && <div>{headerRight}</div>}
        </div>
      )}
      <div style={{ padding: pad }}>{children}</div>
    </div>
  );
}
