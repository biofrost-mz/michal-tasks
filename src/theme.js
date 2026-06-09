const ACCENTS = {
  amber: {
    dark: { accent: "#e3a850", accentH: "#d4923a", accentBg: "#e3a85018", borderH: "#e3a85040" },
    light: { accent: "#c58a36", accentH: "#b07a2d", accentBg: "#c58a3618", borderH: "#c58a3640" },
  },
  emerald: {
    dark: { accent: "#34d399", accentH: "#10b981", accentBg: "#34d3991c", borderH: "#34d39940" },
    light: { accent: "#059669", accentH: "#047857", accentBg: "#05966918", borderH: "#05966936" },
  },
  sky: {
    dark: { accent: "#38bdf8", accentH: "#0ea5e9", accentBg: "#38bdf81c", borderH: "#38bdf840" },
    light: { accent: "#0284c7", accentH: "#0369a1", accentBg: "#0284c718", borderH: "#0284c736" },
  },
  rose: {
    dark: { accent: "#fb7185", accentH: "#f43f5e", accentBg: "#fb71851c", borderH: "#fb718540" },
    light: { accent: "#e11d48", accentH: "#be123c", accentBg: "#e11d4814", borderH: "#e11d4833" },
  },
  violet: {
    dark: { accent: "#a78bfa", accentH: "#8b5cf6", accentBg: "#a78bfa1c", borderH: "#a78bfa40" },
    light: { accent: "#7c3aed", accentH: "#6d28d9", accentBg: "#7c3aed14", borderH: "#7c3aed33" },
  },
  slate: {
    dark: { accent: "#cbd5e1", accentH: "#94a3b8", accentBg: "#cbd5e118", borderH: "#cbd5e136" },
    light: { accent: "#475569", accentH: "#334155", accentBg: "#47556912", borderH: "#47556930" },
  },
};

const theme = (dk, accentKey = "amber") => {
  const accent = ACCENTS[accentKey]?.[dk ? "dark" : "light"] || ACCENTS.amber[dk ? "dark" : "light"];
  return dk
    ? {
        bg: "#0c0e14",
        bg2: "#12141d",
        card: "#181b28",
        cardH: "#1e2236",
        input: "#1a1d2c",
        ...accent,
        text: "#e8ecf4",
        text2: "#8b95a5",
        text3: "#5a6375",
        border: "#242838",
        shadow: "0 2px 8px #0005",
        kanban: "#10121a",
        toast: "#1e2236",
      }
    : {
        bg: "#f5f6fa",
        bg2: "#ffffff",
        card: "#ffffff",
        cardH: "#f0f2f8",
        input: "#f0f2f8",
        ...accent,
        text: "#1a1e2e",
        text2: "#6b7280",
        text3: "#9ca3af",
        border: "#e5e7ec",
        shadow: "0 2px 8px #0001",
        kanban: "#eceef4",
        toast: "#1a1e2e",
      };
};

export default theme;
