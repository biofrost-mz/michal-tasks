import React from 'react'

export default function MZLogo({ size = 32, style = {}, alt = "Zentero" }) {
  return (
    <img
      src="/icon-zentero.png"
      alt={alt}
      width={size}
      height={size}
      decoding="async"
      style={{
        flexShrink: 0,
        borderRadius: Math.max(8, Math.round(size * 0.22)),
        objectFit: "cover",
        display: "block",
        ...style,
      }}
    />
  );
}
