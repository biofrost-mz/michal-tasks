import { useApp } from "../context/AppContext.jsx";

function useSkVars() {
  const { dk } = useApp();
  return dk
    ? { "--sk-base": "#1e2130", "--sk-hl": "#262b3d" }
    : { "--sk-base": "#e8e8ed", "--sk-hl": "#f5f5f7" };
}

export function SkeletonLine({ width = "100%", height = 14 }) {
  const skVars = useSkVars();
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: 6, ...skVars }}
    />
  );
}

export function SkeletonCard() {
  const { t } = useApp();
  const skVars = useSkVars();
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 12,
        border: `1px solid ${t.border}`,
        background: t.card,
        display: "flex",
        alignItems: "center",
        gap: 12,
        ...skVars,
      }}
    >
      {/* checkbox placeholder */}
      <div className="skeleton" style={{ width: 20, height: 20, borderRadius: "50%" }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="skeleton" style={{ height: 14, width: "65%", borderRadius: 6 }} />
        <div style={{ display: "flex", gap: 6 }}>
          <div className="skeleton" style={{ height: 10, width: 48, borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 10, width: 64, borderRadius: 6 }} />
        </div>
      </div>
    </div>
  );
}
