import React from "react";
import Icon from "../Icon.jsx";

/**
 * Input — design-token-aware input primitive
 *
 * @param {"sm"|"md"|"lg"} size
 * @param {string}        icon      — left icon name
 * @param {React.ReactNode} suffix  — right slot
 * @param {boolean}       disabled
 * @param {object}        style     — wrapper override
 * @param {object}        inputStyle — <input> override
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
  className = "",
  // t prop přijat ale ignorován
  t: _t,
}) {
  const iconSize = size === "lg" ? 16 : 14;

  return (
    <div
      className={`input-wrap input-wrap--${size} ${disabled ? "input-wrap--disabled" : ""} ${className}`.trim()}
      style={style}
    >
      {icon && (
        <span className="input-wrap__icon">
          <Icon name={icon} size={iconSize} strokeWidth={2} />
        </span>
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
        className="input-wrap__field"
        style={inputStyle}
      />

      {suffix && <div className="input-wrap__suffix">{suffix}</div>}
    </div>
  );
}
