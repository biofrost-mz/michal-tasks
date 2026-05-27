# Chat s projektem — Design Spec

**Datum:** 2026-05-27  
**Status:** Schváleno, připraveno k implementaci

---

## Co stavíme

Interaktivní chatovací panel v detailu projektu. Uživatel může položit otázky jako "Co v tomto projektu hoří?" nebo "Navrhni prioritu na zítřek" a AI odpoví s plnou znalostí projektu — všech úkolů, stavů, deadlinů a poznámek.

---

## Architektura

### Backend — `gemini-project-chat` (Supabase Edge Function, Deno)

**Vstup:**
```typescript
{
  currentMessage: string,
  messages: Array<{ role: "user" | "assistant", content: string }>,
  projectContext: {
    project: { name, description, status },
    tasks: Array<{ title, status, priority, dueDate, subtasks }>,
    notes: Array<{ title, content }>
  }
}
```

**Zpracování:**
1. Auth check (Supabase JWT)
2. Rate limit: 30 zpráv/user/hodinu (in-memory)
3. Sestavení promptu: systémový prompt + `projectContext` jako JSON + historie konverzace + nová zpráva
4. Volání Gemini 2.0 Flash REST API (`gemini-2.0-flash`, `v1beta`)
5. Vrácení odpovědi

**Výstup:** `{ reply: string }`

**Poznámka k architektuře:** Frontend posílá `projectContext` přímo z app state — žádná extra DB query v edge function. Gemini 2.0 Flash má 1M token okno, takže celý projekt projede bez komprese.

---

### Frontend — `ProjectChatPanel.jsx`

**Trigger:** Tlačítko "💬 Chat" v headeru `ProjectDetailPage`

**Layout:**
- **Desktop:** Sliding panel zprava, šířka 360px, plná výška, překryje obsah projektu
- **Mobil:** Full-screen overlay, tlačítko "← Zpět" v headeru

**UI struktura panelu:**
```
┌─────────────────────────┐
│ 💬 Chat s projektem  ✕  │  ← header s názvem projektu + close
├─────────────────────────┤
│                         │
│  [AI zpráva]            │  ← levá strana, card background
│          [Uživatel] →   │  ← pravá strana, accent color
│                         │
│  ┌─────────────────┐    │  ← starter suggestions (prázdný chat)
│  │ Co hoří?        │    │
│  │ Co jsem nestihl?│    │
│  └─────────────────┘    │
├─────────────────────────┤
│ [Napiš zprávu...] [→]   │  ← input + send
└─────────────────────────┘
```

**Starter suggestions (zobrazí se v prázdném chatu):**
- "Co v tomto projektu hoří?"
- "Co jsem tento týden nestihl?"
- "Navrhni priority na zítřek"

**localStorage persistence:**
```javascript
// Klíč: `mt3:chat:${projectId}`
{
  messages: [
    { role: "user", content: "Co hoří?", ts: 1748000000000 },
    { role: "assistant", content: "Urgentní je...", ts: 1748000001000 }
  ]
}
```
Maximum 50 zpráv — starší se ořežou automaticky.

---

### Integrace do ProjectsPage.jsx

- Tlačítko "💬 Chat" přidáno do headeru `ProjectDetailPage` (vedle Edit/Delete tlačítek)
- `<ProjectChatPanel>` renderován v `ProjectDetailPage` — dostane `project`, `pTasks`, `notes` jako props

---

## Soubory

| Akce | Soubor | Odpovědnost |
|------|--------|-------------|
| CREATE | `supabase/functions/gemini-project-chat/index.ts` | Deno edge function, Gemini API, auth, rate limit |
| CREATE | `src/components/ProjectChatPanel.jsx` | Chat UI panel, localStorage, zprávy |
| MODIFY | `src/pages/ProjectsPage.jsx` | Tlačítko + panel v ProjectDetailPage |

---

## Rozhodnutí a důvody

| Otázka | Rozhodnutí | Důvod |
|--------|-----------|-------|
| Layout | Sliding panel zprava (A) | Standard pro chat, mobilní UX zná tento vzor |
| Mobil | Full-screen overlay | Panel 360px by byl na mobilu nečitelný |
| Persistence | localStorage (B) | Jednoduché, bez DB migrace, pro personal app dostačující |
| Architektura | Single-turn, stateless edge fn | Jednoduchá implementace, Gemini 1M okno to zvládne |
| Kontext | Frontend pošle data | Data jsou v app state, žádná extra DB query |
| Model | `gemini-2.0-flash` | Rychlý, Free Tier, velké context window |
| Streaming | Ne | Zbytečná komplexita pro personal app |
