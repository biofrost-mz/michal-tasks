// Shared task / project data for both prototypes
// Modeled after the user's actual workspace screenshots

window.WORKSPACE = {
  name: "Avenier",
  user: { name: "Michal Zich", initials: "MZ" },
  today: { d: 27, m: 5, y: 2026, dow: "středa", fmt: "středa 27. května 2026" },
  streak: {
    current: 12,
    best: 28,
    // last 12 weeks of activity (0=none, 1=light, 2=med, 3=high, 4=peak)
    weeks: [
      [1,2,0,1,3,2,0],[2,1,2,3,1,0,1],[3,2,3,2,4,1,0],[1,0,2,2,1,3,0],
      [2,3,2,4,3,2,1],[3,4,3,2,4,3,2],[1,2,3,2,3,4,1],[2,3,4,3,2,1,0],
      [3,4,4,3,4,3,2],[4,3,3,4,2,3,1],[2,3,2,3,2,4,1],[3,4,3,4,3,0,0],
    ],
  },
};

window.PROJECTS = [
  { id: "oc", name: "Projekty OC", color: "#3b82f6", openTasks: 7, doneTasks: 0, total: 7, progress: 0, overdueCount: 1, status: "aktivní" },
  { id: "dc", name: "Projekty DC", color: "#ec4899", openTasks: 5, doneTasks: 1, total: 6, progress: 17, status: "aktivní" },
  { id: "ave", name: "Domény AVE", color: "#a855f7", openTasks: 0, doneTasks: 2, total: 2, progress: 100, status: "aktivní" },
  { id: "vmd", name: "Videomedailonky", color: "#06b6d4", openTasks: 1, doneTasks: 1, total: 2, progress: 50, status: "aktivní" },
  { id: "aiav", name: "AI Avenier", color: "#f97316", openTasks: 1, doneTasks: 2, total: 3, progress: 67, status: "aktivní" },
  { id: "adhoc", name: "Ad hoc", color: "#14b8a6", openTasks: 4, doneTasks: 9, total: 13, progress: 69, status: "aktivní" },
  { id: "poc", name: "Problémy OC", color: "#ef4444", openTasks: 1, doneTasks: 1, total: 2, progress: 50, status: "aktivní" },
  { id: "spolu", name: "Spolupráce", color: "#fb923c", openTasks: 1, doneTasks: 1, total: 2, progress: 50, overdueCount: 1, status: "aktivní" },
  { id: "pdc", name: "Problém DC", color: "#dc2626", openTasks: 1, doneTasks: 0, total: 1, progress: 0, status: "aktivní" },
  { id: "news", name: "Newslettery", color: "#eab308", openTasks: 0, doneTasks: 1, total: 1, progress: 100, status: "aktivní" },
  { id: "med", name: "Medevio", color: "#e11d48", openTasks: 3, doneTasks: 0, total: 3, progress: 0, status: "aktivní" },
  { id: "or", name: "Online reklama", color: "#f43f5e", openTasks: 5, doneTasks: 1, total: 6, progress: 17, status: "aktivní" },
  { id: "seo", name: "SEO", color: "#fb7185", openTasks: 0, doneTasks: 0, total: 0, progress: 0, status: "aktivní" },
  { id: "blog", name: "Články blog (OC)", color: "#8b5cf6", openTasks: 1, doneTasks: 0, total: 1, progress: 0, status: "aktivní" },
  { id: "icdc", name: "Individuální ceník - DC", color: "#22c55e", openTasks: 0, doneTasks: 2, total: 2, progress: 100, status: "hotový" },
];

// Status states: "todo" | "doing" | "wait" | "done"
window.TASKS = [
  { id: 1, title: "AI odpovědi na e-maily", desc: "Projít s Inkou automaticky předpřipravené odpovědi", project: "oc", status: "doing", priority: "medium", due: "26.5.", overdue: true, tags: [], starred: false, hasSubtasks: 3 },
  { id: 2, title: "Spolupráce: Cestujzababku.cz", desc: "Rozjedeme spolupráci?", project: "spolu", status: "doing", priority: "medium", due: "26.5.", overdue: true, tags: ["Nesrsta", "Ivana"], starred: false },
  { id: 3, title: "Anglický web", desc: "Komplikované", project: "oc", status: "doing", priority: "high", due: null, tags: [], starred: false, hasSubtasks: 2 },
  { id: 4, title: "Chatbot", desc: "", project: "oc", status: "doing", priority: "medium", due: null, tags: [], starred: false },
  { id: 5, title: "Domluvit se s Davidem na AI", desc: "Máme se pobavit o tom, jak zakryjeme důležité info v Diplomce.", project: "aiav", status: "wait", priority: "medium", due: null, tags: [], starred: false },
  { id: 6, title: "Zvýšení počtu klientů na OC TIT", desc: "", project: "or", status: "wait", priority: "medium", due: null, tags: ["Nesrsta", "Ivana"], starred: false },
  { id: 7, title: "Automatizace období a vakcín ve formulářích Clearing a FLU (DC-397)", desc: "Nasadili jsme na testovací web DC opravy. K založení nového období jsou tyto poznámky: výchozí Datum OD nastaveno na sysdate plus měsíc.", project: "dc", status: "wait", priority: "medium", due: null, tags: [], starred: false },
  { id: 8, title: "Agel LAB - objednání na očkování", desc: "kolik lidí je z Agelu přímo zjistit neumíme. Aktuálně máme 71 obj. Zkusila jsem vyzobat podle jmen, zda figurují v Agelu dle vyhledání v adresáři mailu.", project: "poc", status: "todo", priority: "medium", due: null, tags: [], starred: false },
  { id: 9, title: "Web s informacemi kdy a co očkovat", desc: "", project: "dc", status: "todo", priority: "low", due: null, tags: [], starred: false },
  { id: 10, title: "Informace o aktuální objednávce", desc: "", project: "dc", status: "todo", priority: "low", due: null, tags: ["Web DC", "Elischka"], starred: false },
  { id: 11, title: "Intervaly očkování", desc: "", project: "oc", status: "wait", priority: "high", due: null, tags: ["IT", "Web OC", "Elischka"], starred: false, hasSubtasks: 1 },
  { id: 12, title: "Web OC: Online rušení termínů vytvořených v NAV (OC-1382)", desc: "", project: "oc", status: "wait", priority: "medium", due: null, tags: [], starred: false, hasSubtasks: 3 },
  { id: 13, title: "Obnovení požadavku (OC-1313): kontrola kolidujících objednávek do plných termínů (OC-1372)", desc: "", project: "oc", status: "wait", priority: "medium", due: null, tags: ["Web OC", "Elischka"], starred: false, hasSubtasks: 1 },
  { id: 14, title: "Přidání druhé osoby do objednávky", desc: "", project: "oc", status: "todo", priority: "medium", due: null, tags: ["IT", "Web OC", "Elischka"], starred: true },
  { id: 15, title: "Faktury v Moje kancelář", desc: "", project: "dc", status: "doing", priority: "medium", due: null, tags: ["IT", "Web DC", "Elischka"], starred: false },
  { id: 16, title: "Článek MS Fotbal", desc: "", project: "blog", status: "doing", priority: "medium", due: "7.5.", tags: ["Web OC"], starred: false },
  { id: 17, title: "TEST BRIEF: Cestujzababku", desc: "", project: "spolu", status: "todo", priority: "low", due: null, tags: [], starred: false },
];

window.NOTES = [
  { id: 1, title: "Medevdasdio stav", excerpt: "19.3. se Martinovi se poslal e-mail s informacemi", date: "27. 5.", project: "med" },
  { id: 2, title: "TEST BRIEF", excerpt: "Cíl • Cílová skupina • Rozsah • Deadline • Výstupy …", date: "27. 5.", project: "oc" },
  { id: 3, title: "Decision log", excerpt: "1. asdasd", date: "1 hod", project: null },
  { id: 4, title: "Článek — _Perex_", excerpt: "První věta, která zaujme před '…více'", date: "3 hod", project: "blog" },
];

window.AI_SUGGESTIONS = [
  { id: "s1", taskId: 1, reason: "Prošvihl jsi termín a má rozjednané subtasky", weight: "Akce dnes" },
  { id: "s2", taskId: 11, reason: "Vysoká priorita, blokuje Web OC release", weight: "Vysoká priorita" },
  { id: "s3", taskId: 2, reason: "Mluvit s Nesrstou — má volno odpoledne", weight: "Lidé" },
  { id: "s4", taskId: 3, reason: "60 min v jednom bloku, ráno funguješ na komplikovaných nejlíp", weight: "Focus" },
];

// helper
window.findProject = (id) => window.PROJECTS.find(p => p.id === id);
window.findTask = (id) => window.TASKS.find(t => t.id === id);
window.tasksByProject = (id) => window.TASKS.filter(t => t.project === id);
window.tasksByStatus = (s) => window.TASKS.filter(t => t.status === s);

window.STATUS_META = {
  todo: { label: "To do", short: "Todo", color: "#9ca3af", glyph: "○" },
  doing: { label: "Rozpracováno", short: "Doing", color: "#60a5fa", glyph: "◐" },
  wait: { label: "Čekám", short: "Wait", color: "#fbbf24", glyph: "◑" },
  done: { label: "Hotovo", short: "Done", color: "#34d399", glyph: "●" },
};
window.STATUS_ORDER = ["todo", "doing", "wait", "done"];

window.PRIORITY_META = {
  none: { label: "Žádná", glyph: "—", color: "#6b7280" },
  low: { label: "Nízká", glyph: "↓", color: "#60a5fa" },
  medium: { label: "Střední", glyph: "—", color: "#fbbf24" },
  high: { label: "Vysoká", glyph: "↑", color: "#f87171" },
};
