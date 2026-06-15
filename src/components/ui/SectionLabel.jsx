import React from "react";

export default function SectionLabel({ children, style, className = "" }) {
  return (
    <div className={`section-label ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}
