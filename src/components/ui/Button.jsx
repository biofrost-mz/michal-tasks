import React from "react";
import { useApp } from "../../context/AppContext.jsx";
import Icon from "../Icon.jsx";

const HEIGHT = { sm: 36, md: 40, lg: 44 };
const FONT_SIZE = { sm: 12, md: 13, lg: 14 };
const PADDING = { sm: "0 12px", md: "0 16px", lg: "0 20px" };
const ICON_SIZE = { sm: 13, md: 14, lg: 16 };

/**
 * Button — design-token-aware button primitive
 *
 * @param {"primary"|"secondary"|"ghost"|"danger"} variant
 * @param {"sm"|"md"|"lg"} size
 * @param {string} icon — left icon name (from Icon.jsx)
 * @param {string} iconRight — right icon name
 * @param {boolean} loading
 * @param {boolean} disabled
 */
export default function Button({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  loading = false,
  disabled = false,
  children,
  onClick,
  style,
  title,
  type = "button",
  t: tProp,
}) {
  const ctx = useApp();
  const t = tProp || ctx?.t;
  if (!t) return null;

  const h = HEIGHT[size] || HEIGHT.md;
  const fs = FONT_SIZE[size] || FONT_SIZE.md;
  const pad = PADDING[size] || PADDING.md;
  const iconSz = ICON_SIZE[size] || ICON_SIZE.md;

  let bg, color, border, hoverBg;
  switch (variant) {
    case "primary":
      bg = `linear-gradient(135deg, var(--accent), var(--accent-2))`;
      color = "var(--bg)";
      border = "none";
      hoverBg = `linear-gradient(135deg, var(--accent-2), var(--accent))`;
      break;
    case "secondary":
      bg = "transparent";
      color = t.text;
      border = `1px solid ${t.border}`;
      hoverBg = t.input;
      break;
    case "ghost":
      bg = "transparent";
      color = t.text2;
      border = "none";
      hoverBg = t.input;
      break;
    case "danger":
      bg = "#ef444415";
      color = "#ef4444";
      border = `1px solid #ef444430`;
      hoverBg = "#ef444425";
      break;
    default:
      bg = t.input;
      color = t.text;
      border = `1px solid ${t.border}`;
      hoverBg = t.card;
  }

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      title={title}
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
      style={{
        height: h,
        minHeight: h,
        padding: pad,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        borderRadius: 8,
        border,
        background: bg,
        color,
        fontSize: fs,
        fontWeight: 600,
        fontFamily: "var(--font-ui)",
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.55 : 1,
        transition: "all .12s",
        whiteSpace: "nowrap",
        flexShrink: 0,
        ...style,
      }}
      onMouseEnter={(e) => { if (!isDisabled) e.currentTarget.style.background = hoverBg; }}
      onMouseLeave={(e) => { if (!isDisabled) e.currentTarget.style.background = bg; }}
    >
      {loading ? (
        <span style={{ animation: "spin 1s linear infinite", display: "inline-flex" }}>
          <Icon name="loader" size={iconSz} color={color} strokeWidth={2} />
        </span>
      ) : icon ? (
        <Icon name={icon} size={iconSz} color={color} strokeWidth={2} />
      ) : null}
      {children}
      {!loading && iconRight && <Icon name={iconRight} size={iconSz} color={color} strokeWidth={2} />}
    </button>
  );
}
