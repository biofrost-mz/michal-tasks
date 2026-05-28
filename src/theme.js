const theme = (dk) =>
  dk
    ? {
        bg: "#0c0e14",
        bg2: "#12141d",
        card: "#181b28",
        cardH: "#1e2236",
        input: "#1a1d2c",
        accent: "#e3a850",
        accentH: "#d4923a",
        accentBg: "#e3a85018",
        text: "#e8ecf4",
        text2: "#8b95a5",
        text3: "#5a6375",
        border: "#242838",
        borderH: "#e3a85040",
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
        accent: "#c58a36",
        accentH: "#b07a2d",
        accentBg: "#c58a3618",
        text: "#1a1e2e",
        text2: "#6b7280",
        text3: "#9ca3af",
        border: "#e5e7ec",
        borderH: "#c58a3640",
        shadow: "0 2px 8px #0001",
        kanban: "#eceef4",
        toast: "#1a1e2e",
      };

export default theme;
