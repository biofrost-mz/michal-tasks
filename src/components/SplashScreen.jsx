import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext.jsx";

export default function SplashScreen({ visible }) {
  const { dk } = useApp();
  const [mounted, setMounted] = useState(true);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    if (!visible) {
      setTimeout(() => setHiding(true), 0);
      const t = setTimeout(() => setMounted(false), 360);
      return () => clearTimeout(t);
    } else {
      setTimeout(() => {
        setMounted(true);
        setHiding(false);
      }, 0);
    }
  }, [visible]);

  if (!mounted) return null;

  const bg = dk ? "#0a0c12" : "#f5f5f7";
  const textColor = dk ? "#e8ecf4" : "#0a0c12";
  const sloganColor = dk ? "#4e5161" : "#8e8e93";

  return (
    <div
      className={`splash-overlay${hiding ? " hiding" : ""}`}
      style={{ background: bg }}
    >
      <div className="splash-content">
        <div className="splash-logo-wrap">
          <div className="splash-pulse" />
          <div className="splash-pulse" />
          <img
            src="/icon-zentero.svg"
            alt="Zentero"
            width={80}
            height={80}
            style={{
              filter: "drop-shadow(0 4px 16px rgba(227,168,80,0.38))",
              position: "relative",
              zIndex: 1,
            }}
          />
        </div>
        <div className="splash-brand" style={{ color: textColor }}>
          Zen<span style={{ color: "#e3a850" }}>tero</span>
        </div>
        <div className="splash-slogan" style={{ color: sloganColor }}>
          Focus. Organize. Achieve.
        </div>
      </div>
    </div>
  );
}
