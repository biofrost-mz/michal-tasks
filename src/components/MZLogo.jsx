import React from 'react'

export default function MZLogo({ size = 32, style = {} }) {
  const id = "mzg";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, borderRadius: "50%", ...style }}
    >
      <defs>
        <radialGradient id={id} cx="44%" cy="36%" r="60%" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor="#3dd4c5" />
          <stop offset="28%"  stopColor="#1a9aaa" />
          <stop offset="58%"  stopColor="#1060a0" />
          <stop offset="100%" stopColor="#050912" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill={`url(#${id})`} />
      <text
        x="50" y="65"
        fontFamily="'Outfit',system-ui,sans-serif"
        fontWeight="800"
        fontSize="38"
        fill="white"
        textAnchor="middle"
        letterSpacing="-1"
      >
        MZ
      </text>
    </svg>
  );
}
