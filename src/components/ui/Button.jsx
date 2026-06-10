import React from "react";
import Icon from "../Icon.jsx";

/**
 * Button — design-token-aware button primitive
 *
 * @param {"primary"|"secondary"|"ghost"|"danger"} variant
 * @param {"sm"|"md"|"lg"} size
 * @param {string}  icon      — left icon name
 * @param {string}  iconRight — right icon name
 * @param {boolean} loading
 * @param {boolean} disabled
 * @param {object}  style     — inline override (pro edge-casy)
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
  className = "",
  // t prop přijat ale ignorován — zachování zpětné kompatibility
  t: _t,
}) {
  const isDisabled = disabled || loading;
  const iconSize = size === "sm" ? 13 : size === "lg" ? 16 : 14;

  return (
    <button
      type={type}
      title={title}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
      className={`btn btn--${variant} btn--${size} ${className}`.trim()}
      style={style}
    >
      {loading ? (
        <span className="btn__spinner">
          <Icon name="loader" size={iconSize} strokeWidth={2} />
        </span>
      ) : icon ? (
        <Icon name={icon} size={iconSize} strokeWidth={2} />
      ) : null}

      {children}

      {!loading && iconRight && (
        <Icon name={iconRight} size={iconSize} strokeWidth={2} />
      )}
    </button>
  );
}
