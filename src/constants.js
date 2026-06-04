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

export const NOTE_STATUSES = {
  inbox:  { label: "Inbox",   color: "#94a3b8", bg: "#94a3b815" },
  idea:   { label: "Nápad",   color: "#8b5cf6", bg: "#8b5cf615" },
  draft:  { label: "Koncept", color: "#64748b", bg: "#64748b15" },
  active: { label: "Aktivní", color: "#3b82f6", bg: "#3b82f615" },
  done:   { label: "Hotovo",  color: "#22c55e", bg: "#22c55e15" },
  archived: { label: "Archiv", color: "#64748b", bg: "#64748b15" },
};

export const NOTE_STATUS_KEYS = Object.keys(NOTE_STATUSES);

export const PROJ_STATUS = {
  idea:     { label: "Nápad",   color: "#94a3b8" },
  active:   { label: "Aktivní", color: "#3b82f6" },
  done:     { label: "Hotový",  color: "#22c55e" },
  archived: { label: "Archiv",  color: "#64748b" },
};

export const NOTE_TEMPLATES = [
  { id: "blank", label: "Prázdná poznámka", icon: "file-text", desc: "Začni od nuly", title: "", content: "" },
  { id: "meeting", label: "Meeting notes", icon: "users", desc: "Agenda, zápis, akční body",
    title: "Meeting notes",
    content: "## Datum\n\n## Účastníci\n- \n\n## Agenda\n1. \n\n## Zápis\n\n\n## Akční body\n- [ ] " },
  { id: "checklist", label: "Checklist", icon: "check-square", desc: "Rychlý kontrolní seznam",
    title: "Checklist",
    content: "## Checklist\n- [ ] První krok\n- [ ] Druhý krok\n- [ ] Finální kontrola" },
  { id: "bug", label: "Bug report", icon: "alert-circle", desc: "Popis chyby, kroky, dopad",
    title: "Bug report",
    content: "## Problém\n\n## Kroky k reprodukci\n1. \n2. \n\n## Očekávané chování\n\n## Dopad\n" },
  { id: "decision", label: "Decision log", icon: "check-circle", desc: "Zaznamenej rozhodnutí",
    title: "Decision log",
    content: "## Kontext\n\n\n## Možnosti\n1. \n2. \n\n## Rozhodnutí\n\n\n## Důvody\n- \n\n## Dopady\n- " },
  { id: "retro", label: "Retrospektiva", icon: "refresh-cw", desc: "Co šlo dobře, co zlepšit",
    title: "Retrospektiva",
    content: "## Co šlo dobře ✅\n- \n\n## Co šlo špatně ❌\n- \n\n## Co zlepšit 💡\n- \n\n## Akce na příště\n- [ ] " },
  { id: "brief", label: "Brief", icon: "clipboard", desc: "Cíl, rozsah, deadline, výstupy",
    title: "Brief",
    content: "## Cíl\n\n\n## Cílová skupina\n\n\n## Rozsah\n\n\n## Deadline\n\n\n## Výstupy\n- " },
  { id: "project-brief", label: "Projektový brief", icon: "clipboard", desc: "Cíl, rozsah, rizika a výstupy",
    title: "Projektový brief",
    content: "## Cíl\n\n## Kontext\n\n## Rozsah\n- \n\n## Rizika\n- \n\n## Další kroky\n- [ ] " },
  { id: "linkedin", label: "LinkedIn post", icon: "send", desc: "Hook, body, CTA, tagy",
    title: "LinkedIn post",
    content: "## Hook\n_První věta, která zaujme před '...více'_\n\n---\n\n## Hlavní myšlenka\n\n\n## Klíčové body\n1. \n2. \n3. \n\n---\n\n## CTA\n\n\n**Tagy:** #" },
  { id: "article", label: "Článek / LI long", icon: "edit-3", desc: "Titulek, sekce, závěr, zdroje",
    title: "Článek",
    content: "# Titulek\n\n_Perex_\n\n---\n\n## Sekce 1\n\n\n## Sekce 2\n\n\n## Závěr\n\n\n---\n\n_Zdroje:_\n- " },
  { id: "dev-prompt", label: "Prompt pro vývoj", icon: "code", desc: "Kontext, požadavek, akceptační kritéria",
    title: "Prompt pro vývoj",
    content: "## Kontext\n\n## Cíl\n\n## Požadavky\n- \n\n## Akceptační kritéria\n- [ ] " },
  { id: "idea", label: "Nápad", icon: "lightbulb", desc: "Rychlý záznam myšlenky",
    title: "Nápad",
    content: "## Nápad\n\n## Proč to stojí za pozornost\n\n## Další krok\n- [ ] " },
];
