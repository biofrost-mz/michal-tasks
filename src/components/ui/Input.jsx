import React, { useRef } from "react";
import { useApp } from "../../context/AppContext.jsx";
import Icon from "../Icon.jsx";

const HEIGHT = { sm: 36, md: 40, lg: 44 };
const FONT_SIZE = { sm: 13, md: 14, lg: 15 };

/**
 * Input — design-token-aware input primitive
 *
 * @param {string} value
 * @param {function} onChange
 * @param {string} placeholder
 * @param {string} type
 * @param {string} icon — left icon name
 * @param {React.ReactNode} suffix — right element
 * @param {"sm"|"md"|"lg"} size
 * @param {boolean} disabled
 * @param {object} style
 */
export default function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
  suffix,
  size = "md",
  disabled = false,
  style,
  inputStyle,
  onKeyDown,
  onFocus,
  onBlur,
  autoFocus,
  readOnly,
  t: tProp,
}) {
  const ctx = useApp();
  const t = tProp || ctx?.t;
  if (!t) return null;

  const h = HEIGHT[size] || HEIGHT.md;
  const fs = FONT_SIZE[size] || FONT_SIZE.md;
  const iconSize = size === "lg" ? 16 : 14;
  const hPad = size === "sm" ? 10 : 12;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: h,
        minHeight: h,
        padding: `0 ${hPad}px`,
        background: t.input,
        border: `1px solid ${t.border}`,
        borderRadius: 8,
        opacity: disabled ? 0.6 : 1,
        transition: "border-color .12s, box-shadow .12s",
        ...style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = t.accent;
        e.currentTarget.style.boxShadow = `0 0 0 2px ${t.accent}22`;
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = t.border;
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {icon && (
        <Icon name={icon} size={iconSize} color={t.text3} strokeWidth={2} style={{ flexShrink: 0 }} />
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        autoFocus={autoFocus}
        style={{
          flex: 1,
          border: "none",
          background: "transparent",
          outline: "none",
          color: t.text,
          fontSize: fs,
          fontFamily: "var(--font-ui)",
          minWidth: 0,
          ...inputStyle,
        }}
      />
      {suffix && <div style={{ flexShrink: 0 }}>{suffix}</div>}
    </div>
  );
}
