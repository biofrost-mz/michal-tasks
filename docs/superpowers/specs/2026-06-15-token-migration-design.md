# Token Migration — `t.xxx` → CSS proměnné

**Goal:** Odstranit `theme.js` závislost ze všech komponent — inline styly přestanou používat JS objekt `t` a přejdou na CSS proměnné z `atlas-shell.css` / `tokens.css`.

**Přístup:** Normalizace na atlas-shell jako canonical systém. Drobné vizuální odchylky (temnější card, světlejší text-2) jsou záměrné — atlas-shell je vyladěnější než původní `theme.js`. Migrace probíhá soubor po souboru, od nejmenšího po největší (přístup A).

---

## Mapping tabulka

| `t.xxx` | CSS proměnná | Poznámka |
|---------|-------------|---------|
| `t.bg` | `var(--bg)` | |
| `t.bg2` | `var(--bg-2)` | |
| `t.card` | `var(--surface)` | atlas-shell: `--surface`, ne `--card` |
| `t.cardH` | `var(--surface-h)` | |
| `t.input` | `var(--input)` | z tokens.css |
| `t.text` | `var(--text)` | atlas-shell: `--text`, ne `--text-1` |
| `t.text2` | `var(--text-2)` | normalizace: #8b95a5 → #b3b5be (světlejší) |
| `t.text3` | `var(--text-3)` | |
| `t.accent` | `var(--accent)` | AppContext nastavuje dynamicky |
| `t.accentH` | `var(--accent-2)` | AppContext nastavuje dynamicky |
| `t.accentBg` | `var(--accent-soft)` | AppContext nastavuje dynamicky |
| `t.borderH` | `var(--border-h)` | AppContext nastavuje dynamicky |
| `t.border` | `var(--border)` | |
| `t.shadow` | `var(--shadow-sm)` | z tokens.css |
| `t.kanban` | `var(--kanban)` | z tokens.css |
| `t.toast` | `var(--toast-bg)` | z tokens.css |

---

## Migrace — pravidla

### Co nahradit

Všechny výskyty `t.xxx` v `style={{ ... }}` inline stylech.

```jsx
// PŘED:
<div style={{ color: t.text3, background: t.card, border: `1px solid ${t.border}` }}>

// PO:
<div style={{ color: "var(--text-3)", background: "var(--surface)", border: "1px solid var(--border)" }}>
```

### Template literals s t.xxx

```jsx
// PŘED:
style={{ boxShadow: `0 2px 8px ${t.shadow}` }}
// t.shadow je hex hodnota, ne CSS var — proto:
// PO:
style={{ boxShadow: "var(--shadow-sm)" }}

// PŘED:
border: `1px solid ${t.border}`
// PO:
border: "1px solid var(--border)"

// PŘED:
background: `${t.accentBg}`
// PO:
background: "var(--accent-soft)"
```

### Odstranění `t` z destructuringu

Po nahrazení všech `t.xxx` v souboru:

```js
// PŘED:
const { userId, t, projects, tasks } = useApp();

// PO (t odstraněno):
const { userId, projects, tasks } = useApp();
```

Pokud byl `t` jediný import z `useApp()`, odstraní se celý řádek.

### `t` jako prop

Některé komponenty přijímají `t` jako prop od rodiče (`t={t}`). Po migraci obou stran (volající i přijímající) se `t` prop odstraní:

```jsx
// PŘED (volající):
<NotesMiniList t={t} notes={notes} />

// PO:
<NotesMiniList notes={notes} />

// PŘED (příjemce):
function NotesMiniList({ t, notes }) { ... }

// PO:
function NotesMiniList({ notes }) { ... }
```

### Co NEMIGROVAT

- Dynamicky sestavené barvy kde `t.accent` vstupuje do výpočtu (napr. `rgba(${t.accentRgb}, 0.3)`) — ty nahradit `var(--accent-soft)` nebo `var(--accent-glow)` dle kontextu
- Komentáře a console.log — ty ignorovat
- Admin soubory (`src/components/admin/`, `src/pages/Admin*.jsx`) — out of scope

---

## Pořadí souborů (malé → velké)

### Batch 1 — triviální (≤ 10 výskytů)
1. `src/components/Skeleton.jsx` — 2
2. `src/components/Confirm.jsx` — 5
3. `src/components/SnoozeSheet.jsx` — 6
4. `src/components/NotesMiniList.jsx` — 6
5. `src/components/AttachmentsMiniList.jsx` — 10

### Batch 2 — střední (10–30 výskytů)
6. `src/pages/QuickTodosPage.jsx` — 12
7. `src/components/TaskContextSheet.jsx` — 17
8. `src/components/AIDailyPlan.jsx` — 19
9. `src/components/NotificationBell.jsx` — 21
10. `src/components/ProjectChatPanel.jsx` — 25
11. `src/components/AITaskAssist.jsx` — 26

### Batch 3 — velké (30–100 výskytů)
12. `src/components/CommandPalette.jsx` — 39
13. `src/layout/MobileNav.jsx` — 65
14. `src/components/QuickAdd.jsx` — 99

### Batch 4 — největší
15. `src/layout/Sidebar.jsx` — 102
16. `src/pages/NotesPage.jsx` — 157

---

## Po dokončení všech souborů

1. Ověřit že `t` není destrukturován v žádném souboru:
   ```bash
   grep -rn "const.*\bt\b.*useApp\|{ t }" src/ --include="*.jsx" --include="*.js"
   ```
2. Ověřit že `t` není předáván jako prop:
   ```bash
   grep -rn "\bt={t}\b\|t={t}" src/ --include="*.jsx"
   ```
3. Zvážit smazání `src/theme.js` (pokud ho nikdo neimportuje)

---

## Testování po každém souboru

```bash
cd "/Users/michalzich/Desktop/Hero projekty/michal-tasks" && npm run lint
```

Vizuální ověření: dark/light mode toggle — barvy musí být konzistentní.
