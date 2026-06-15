import React from "react";

export default function SectionLabel({ children, style, className = "" }) {
  return (
    <div className={`section-label${className ? ` ${className}` : ""}`} style={style}>
      {children}
    </div>
  );
}
