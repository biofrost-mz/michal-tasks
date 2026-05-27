export const STATUSES = {
  todo:    { label: "To do",         color: "#8b95a5", icon: "circle",       bg: "#8b95a515" },
  doing:   { label: "Rozpracováno",  color: "#3b82f6", icon: "play-circle",  bg: "#3b82f615" },
  waiting: { label: "Čekám",         color: "#f59e0b", icon: "pause-circle", bg: "#f59e0b15" },
  done:    { label: "Hotovo",        color: "#22c55e", icon: "check-circle", bg: "#22c55e15" },
};

export const STATUS_KEYS = Object.keys(STATUSES);

export const STATUS_SHORT = { todo: "To do", doing: "Začít", waiting: "Čekám", done: "Hotovo" };

export const PRIORITIES = {
  low:    { label: "Nízká",   color: "#22c55e", bg: "#22c55e18", icon: "arrow-down"  },
  medium: { label: "Střední", color: "#f59e0b", bg: "#f59e0b18", icon: "minus"      },
  high:   { label: "Vysoká",  color: "#ef4444", bg: "#ef444418", icon: "arrow-up"   },
};

export const NOTE_TEMPLATES = [
  { id: "blank", label: "Prázdná", icon: "file-text", desc: "Začni od nuly", title: "", content: "" },
  { id: "meeting", label: "Meeting notes", icon: "users", desc: "Agenda, zápis, akční body",
    title: "Meeting notes",
    content: "## Datum\n\n## Účastníci\n- \n\n## Agenda\n1. \n\n## Zápis\n\n\n## Akční body\n- [ ] " },
  { id: "decision", label: "Decision log", icon: "check-circle", desc: "Zaznamenej rozhodnutí",
    title: "Decision log",
    content: "## Kontext\n\n\n## Možnosti\n1. \n2. \n\n## Rozhodnutí\n\n\n## Důvody\n- \n\n## Dopady\n- " },
  { id: "retro", label: "Retrospektiva", icon: "refresh-cw", desc: "Co šlo dobře, co zlepšit",
    title: "Retrospektiva",
    content: "## Co šlo dobře ✅\n- \n\n## Co šlo špatně ❌\n- \n\n## Co zlepšit 💡\n- \n\n## Akce na příště\n- [ ] " },
  { id: "brief", label: "Brief", icon: "clipboard", desc: "Cíl, rozsah, deadline, výstupy",
    title: "Brief",
    content: "## Cíl\n\n\n## Cílová skupina\n\n\n## Rozsah\n\n\n## Deadline\n\n\n## Výstupy\n- " },
  { id: "linkedin", label: "LinkedIn post", icon: "send", desc: "Hook, body, CTA, tagy",
    title: "LinkedIn post",
    content: "## Hook\n_První věta, která zaujme před '...více'_\n\n---\n\n## Hlavní myšlenka\n\n\n## Klíčové body\n1. \n2. \n3. \n\n---\n\n## CTA\n\n\n**Tagy:** #" },
  { id: "article", label: "Článek / LI long", icon: "edit-3", desc: "Titulek, sekce, závěr, zdroje",
    title: "Článek",
    content: "# Titulek\n\n_Perex_\n\n---\n\n## Sekce 1\n\n\n## Sekce 2\n\n\n## Závěr\n\n\n---\n\n_Zdroje:_\n- " },
];
