import React from "react";
import { useApp } from "../../context/AppContext.jsx";

/**
 * Panel — design-token-aware card/panel primitive
 *
 * @param {React.ReactNode} children
 * @param {object} style — extra container styles
 * @param {string|number} padding — inner padding (default "16px")
 * @param {string} title — optional header title
 * @param {React.ReactNode} headerRight — optional right slot in header
 */
export default function Panel({
  children,
  style,
  padding = "16px",
  title,
  headerRight,
  t: tProp,
}) {
  const ctx = useApp();
  const t = tProp || ctx?.t;
  if (!t) return null;

  return (
    <div
      style={{
        background: t.bg2,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        overflow: "hidden",
        ...style,
      }}
    >
      {(title || headerRight) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: typeof padding === "number" ? `${padding}px` : padding,
            borderBottom: `1px solid ${t.border}`,
          }}
        >
          {title && (
            <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{title}</div>
          )}
          {headerRight && <div>{headerRight}</div>}
        </div>
      )}
      <div style={{ padding: typeof padding === "number" ? `${padding}px` : padding }}>
        {children}
      </div>
    </div>
  );
}
