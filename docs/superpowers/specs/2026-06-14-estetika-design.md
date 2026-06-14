# Estetika Sprint — Design Spec
**Datum:** 2026-06-14  
**Projekt:** Zentero (michal-tasks)  
**Styl animací:** Mix — jemné pro každodenní akce, výrazné jen pro emocionální momenty

---

## Přehled

5 fází vizuálního vylepšení aplikace bez změny funkční architektury:

1. **Skeleton Loading** — placeholdery místo prázdných obrazovek při načítání
2. **Empty States** — konzistentní zapojení + entrance animace
3. **Micro-interakce** — stagger listy, button feedback, task přidání animace
4. **Vizuální polish** — shadow systém, border-radius, typography, transitions, dark mode
5. **Mobile Settings Polish** — dotažení WorkspaceSettings, UserProfile a dalších secondary stránek pro mobilní zobrazení

---

## Fáze 1: Skeleton Loading

### Komponenty
- **`SkeletonLine`** — řádek textu (prop: `width`, default `"100%"`, `height` default `14px`)
- **`SkeletonCard`** — tvar odpovídající tcard (checkbox placeholder + 2 řádky textu + tag chips)

Obě sdílejí CSS třídu `.skeleton` se shimmer animací.

### CSS
```css
@keyframes skeleton-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--sk-base) 25%,
    var(--sk-hl)   50%,
    var(--sk-base) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.4s ease infinite;
  border-radius: 6px;
}
```

**Light mode:** `--sk-base: #e8e8ed`, `--sk-hl: #f5f5f7`  
**Dark mode:** `--sk-base: #1e2130`, `--sk-hl: #262b3d`

CSS proměnné definované v `:root` a přepsané v `[data-theme="dark"]` (nebo dle existujícího dark mode selektoru).

### Wire-up (podmínka: `!loaded` z AppContext)

| Stránka | Skeleton obsah |
|---|---|
| `TasksPage` | 5× `SkeletonCard` |
| `DashboardPage` | stats strip (4 čísla) + 3× `SkeletonCard` |
| `ProjectsPage` | 4× skeleton project card (širší, s progress barem) |
| `NotesPage` | 3× skeleton note card (vyšší, více řádků) |
| `QuickTodosPage` | 5× skeleton todo row |
| `ProjectDetailPage` | 4× `SkeletonCard` (seznam úkolů projektu) |

### Přechod na reálný obsah
Po `loaded → true`: reálný obsah nastoupí s `fade-in 200ms`. Skeleton jednoduše zmizí (bez animace ven — okamžité přepnutí).

---

## Fáze 2: Empty States

### Stávající stav
`EmptyState.jsx` existuje s SVG ilustracemi pro typy: `tasks`, `projects`, `notes`, `filter`, `search`, `todos`, `timeline`. Má `.empty-state-glow` ambient glow efekt.

### Změny

**1. Entrance animace**  
Přidat `fade-in + slide-up` na `.empty-state`:
```css
@keyframes empty-in {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.empty-state { animation: empty-in 300ms ease-out; }
```

**2. Wire-up audit**

| Stránka | Podmínka | Typ | Zpráva |
|---|---|---|---|
| `TasksPage` | 0 úkolů, aktivní filtr | `filter` | "Nic nenalezeno" |
| `TasksPage` | 0 úkolů, no filtr | `tasks` | "Žádné úkoly" + CTA |
| `TasksPage` | všechny úkoly done | speciální | "Vše hotovo!" (viz níže) |
| `ProjectsPage` | 0 projektů | `projects` | "Zatím žádné projekty" + CTA |
| `NotesPage` | 0 poznámek | `notes` | "Zatím žádné poznámky" + CTA |
| `QuickTodosPage` | 0 todos | `todos` | "Seznam je prázdný" + CTA |
| `QuickTodosPage` | všechny done | speciální | "Vše splněno!" |
| `TimelinePage` | 0 úkolů s termínem | `timeline` | "Žádné úkoly s termínem" |
| `TagsPage` | 0 tagů | `filter` | "Zatím žádné tagy" + CTA |

**3. "Vše hotovo" special case (TasksPage + QuickTodosPage)**  
Odlišná varianta EmptyState bez SVG ilustrace — místo toho velká checkmark ikona (zelená), nadpis "Vše hotovo!", subtext "Užij si chvíli klidu." Bez action buttonu. Jednorázový micro-confetti burst při přepnutí do tohoto stavu (stejný `triggerConfettiBurst` jako swipe-done, sessionStorage key `mt:all-done-confetti`).

---

## Fáze 3: Micro-interakce

### 3.1 Stagger animace list items
Když se seznam načte nebo změní filtr, položky nastupují postupně:
```css
@keyframes list-item-enter {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.list-item-enter {
  animation: list-item-enter 220ms ease-out both;
}
```
`animation-delay: calc(var(--item-index) * 40ms)` — max 8 položek (320ms).  
CSS proměnná `--item-index` nastavena inline stylem v JSX.  
Platí pro: `TasksPage`, `ProjectsPage`, `QuickTodosPage`.

### 3.2 Button press feedback
Všechna primární tlačítka (FAB, submit buttony, primary actions):
```css
.btn-press:active {
  transform: scale(0.96);
  transition: transform 80ms ease;
}
```
Přidat třídu `.btn-press` (nebo využít existující třídy FAB, primary-btn).

### 3.3 Checkbox bounce (desktop)
Při kliknutí na checkbox (ne swipe) — bounce na ikoně zaškrtnutí:
```css
@keyframes check-bounce {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.2); }
  100% { transform: scale(1); }
}
```
150ms, aplikuje se po přepnutí do done stavu.

### 3.4 Task přidání animace
Nový úkol "sklouzne dovnitř" ze spoda:
```css
@keyframes task-slide-in {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
```
220ms. Platí pro QuickTodos i Tasks.

### 3.5 Toast vylepšení
Toast nastupuje `slide-up + fade-in` (240ms) a odchází `fade-out` (180ms). Zjemnit stávající animace.

### 3.6 FAB pulse hint
Jemný `box-shadow` pulse na FAB (+) při prvním načtení stránky:
- Jednorázové, `sessionStorage` key `mt:fab-hint-shown`
- 2× pulse animace, pak stop
- Stejný amber jako brand barva Zentero (`#e3a850`)

---

## Fáze 4: Vizuální polish

### 4.1 Shadow systém
Zavést 3 úrovně jako CSS proměnné v `:root`:
```css
--shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
--shadow-md: 0 4px 12px rgba(0,0,0,0.12);
--shadow-lg: 0 8px 32px rgba(0,0,0,0.22);
```
Nahradit inline `box-shadow` hodnoty na klíčových komponentách (karty, modály, drawery, bottom sheets).

### 4.2 Border-radius konzistence
Sjednotit na 4px grid:
- Karty (tcard, project card, note card): `12px`
- Inputy, buttony, rows: `10px`
- Chips, tagy: `6px`
- Bottom sheets: `16px 16px 0 0` (stávající, ponechat)

### 4.3 Typography hierarchy
Kontrola a sjednocení:
- Nadpis stránky (h1): `20px`, `font-weight: 700`
- Sekce header: `13px`, uppercase, `letter-spacing: 0.05em`, `font-weight: 600`
- Body text: `14px` (kompaktní), `15px` (reading)
- Metadata / timestamps: `12px`, `color: t.text3`

### 4.4 Transition na interaktivních prvcích
Přidat `transition: background 150ms ease, color 150ms ease` tam kde chybí (settings rows, context sheet rows, project items). Eliminuje "tvrdé" přepnutí na hover/active.

### 4.5 Dark mode audit
Projít dark mode na klíčových stránkách, opravit kontrastní nesrovnalosti:
- Text na šedém background
- Border viditelnost
- Input placeholder barvy

### 4.6 Spacing rytmus
Sjednotit na 4px grid (4, 8, 12, 16, 20, 24, 32px). Zásah jen tam kde jsou outliers (nestandardní hodnoty jako 7px, 11px, 18px apod.).

### 4.7 Reduced motion
Všechny nové CSS animace musí respektovat `prefers-reduced-motion`. Jeden blok v `atlas-shell.css`:
```css
@media (prefers-reduced-motion: reduce) {
  .skeleton,
  .list-item-enter,
  .empty-state,
  .swipe-card,
  .splash-overlay { animation: none !important; transition: none !important; }
}
```
Funkčnost zůstává nedotčena — pouze vizuální pohyb se vypne.

---

## Fáze 5: Mobile Settings Polish

### Cílové stránky
- `WorkspaceSettingsPage` (primární)
- `UserProfile` / `AccountSettings` (primární)
- Audit: `TagsPage`, `TimelinePage`, `AdminPage` — opravit pokud mají stejný problém

### Vzor: Grouped Card Layout (inspirace iOS Settings)
Každá sekce nastavení = zaoblená karta (`background: t.card`, `borderRadius: 12px`, `border: 1px solid t.border`).  
Uvnitř: řádky oddělené tenkým oddělovačem (`1px solid t.border`), bez vnějšího paddingu mezi řádky.

### Touch-friendly rows
- Min. výška řádku: `52px`
- Padding: `14px 16px`
- `chevron-right` ikona napravo (tam kde row naviguje dál)
- `WebkitTapHighlightColor: transparent`

### Destruktivní akce → Bottom Sheet
"Odejít z workspace", "Smazat účet", "Odebrat člena" → přesunout z inline confirm na bottom sheet vzor (stejný jako `TaskContextSheet`). Sheet obsahuje popis akce + červené confirm tlačítko + cancel.

### Konzistentní header
Stránky nastavení dostanou stejný styl header jako ostatní stránky (nadpis + případný subtitle, konzistentní topbar height).

### Formuláře
Form fieldy (rename workspace, change display name) jako inline edit — tap na label → input se zobrazí v bottom sheet (konzistentní s TaskContextSheet vzorem).

---

## Rozsah implementace

Neprovádíme:
- Žádné změny databázového schématu
- Žádné nové stránky nebo routy
- Žádné změny AppContext architektury
- Žádné nové Supabase Edge Functions

Provádíme:
- 2 nové React komponenty (SkeletonLine, SkeletonCard)
- CSS rozšíření atlas-shell.css (skeleton, empty-state, micro-interakce animace, shadow/spacing proměnné)
- Inline style úpravy na stávajících stránkách (wire-up skeleton, empty states, stagger delay)
- Refactor settings stránek pro mobile (grouped cards, touch rows, bottom sheets)
