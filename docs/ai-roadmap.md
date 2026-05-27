# AI Roadmapa — Michal Tasks

## 1. Detail úkolu — AI Asistent ✅ HOTOVO

**Model:** `gemini-2.0-flash` přes Supabase Edge Function `gemini-task-optimize`
**API:** 100% Google Gemini (`generativelanguage.googleapis.com`) — žádný Anthropic

### Funkce:
- **Optimalizace názvu** — vágní vstup → akční věta začínající slovesem
- **Auto-kategorizace** — předvýběr existujícího projektu ze Supabase
- **Inteligentní tagování** — návrh 1–3 tagů z workspace
- **Odhad délky** — časový rámec od 15 min do celého dne
- **Návrh podúkolů** — 3–6 konkrétních subtasků

### Architektura:
```
TaskDrawer.jsx
  └── AITaskAssist.jsx  →  supabase.functions.invoke("gemini-task-optimize")
                               └── Gemini 2.0 Flash REST API (JSON mode + responseSchema)
                                   └── Zod validace odpovědi
```

---

## 2. AI Denní plán — Dashboard 🔜 KRÁTKODOBÝ CÍL

**Model:** `gemini-1.5-pro` (hlubší logika, více kontextu)
**Edge Function:** nová `gemini-daily-plan` (nebo upgrade stávající `ai-daily-plan`)

### Funkce:
- Načte všechny aktivní úkoly z workspace z DB
- Sestaví strukturovaný plán na dnešní den
- **Focus úkol dne** — jeden nejdůležitější úkol k dotažení
- **Detekce přemotivovanosti** — AI upozorní pokud je toho moc naloženo, navrhne co odložit

### Stávající stav:
`ai-daily-plan` edge function existuje a volá Claude Sonnet 4.6. Pro Gemini verzi vytvořit novou nebo přepsat s přepínačem modelu.

---

## 3. Chat s projektem — Sidebar 📅 STŘEDNĚDOBÝ CÍL

**Model:** `gemini-2.0-flash` nebo `gemini-1.5-flash`
**Edge Function:** nová `gemini-project-chat`

### Funkce:
- Interaktivní chat přímo v detailu projektu
- Dotazy jako: "Co v tomto projektu hoří?", "Co jsem nestihl tento týden?"

### Architektura (bez RAG):
```
Otevření chatu
  └── Supabase: SELECT všechny úkoly projektu (title, status, priority, due_date, subtasks, notes)
  └── Převod na JSON text → vložení přímo do promptu jako kontext
  └── Gemini 1.5/2.0 Flash (1M token okno) → odpověď
```
Gemini zvládne celý projekt v jednom promptu — RAG databáze není potřeba.

---

## Přehled API klíčů

| Funkce | Model | API klíč |
|--------|-------|----------|
| AI Asistent (optimize) | `gemini-2.0-flash` | `GOOGLE_GENERATIVE_AI_API_KEY` |
| AI Asistent (ostatní akce) | `claude-haiku-4-5` | `ANTHROPIC_API_KEY` |
| AI Denní plán (současný) | `claude-sonnet-4-6` | `ANTHROPIC_API_KEY` |
| AI Denní plán (plánovaný) | `gemini-1.5-pro` | `GOOGLE_GENERATIVE_AI_API_KEY` |
| Chat s projektem (plánovaný) | `gemini-2.0-flash` | `GOOGLE_GENERATIVE_AI_API_KEY` |
