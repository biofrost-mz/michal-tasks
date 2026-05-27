import React from "react";
import { useApp } from "../../context/AppContext.jsx";
import Icon from "../Icon.jsx";

/**
 * Badge — design-token-aware badge primitive
 *
 * @param {string} color — text color
 * @param {string} bg — background color (defaults to color + "18")
 * @param {string} icon — icon name
 * @param {"sm"|"md"} size
 * @param {React.ReactNode} children
 */
export default function Badge({
  color,
  bg,
  icon,
  size = "md",
  children,
  style,
  t: tProp,
}) {
  const ctx = useApp();
  const t = tProp || ctx?.t;

  const fs = size === "sm" ? 12 : 12;
  const iconSz = size === "sm" ? 10 : 11;
  const pad = size === "sm" ? "2px 6px" : "3px 8px";

  const textColor = color || (t ? t.text2 : "#6b7280");
  const bgColor = bg || (color ? color + "18" : (t ? t.input : "#f3f4f6"));

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: pad,
        borderRadius: 5,
        background: bgColor,
        color: textColor,
        fontSize: fs,
        fontWeight: 600,
        whiteSpace: "nowrap",
        lineHeight: 1.4,
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={iconSz} color={textColor} strokeWidth={2} />}
      {children}
    </span>
  );
}
