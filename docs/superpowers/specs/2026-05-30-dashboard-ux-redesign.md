# Dashboard UX Redesign — Design Spec
**Date:** 2026-05-30  
**Scope:** DashboardPage hero sekce, hl-stats, AI sekce, animační systém, komponenty

---

## 1. Cíl

Vylepšit UX/UI dashboardu na mobilu i desktopu:
- Odstranit horizontální scroll u hl-stats na mobilu → 2×3 grid
- Zmenšit/vyčistit AI sekci na mobilu
- Přidat animace, hover efekty a vizuální polish konzistentní s Atlas design systemem
- Přidat 6. statistiku "Dokončeno dnes"
- Vizuálně zpracovat ⚠ indikátor (alert-triangle ikona)

---

## 2. Mobile headline & hl-stats

### 2.1 Headline-top
- `hl-num` (číslo dne): zmenšit z 42px → 36px
- Přidat entrance animaci: `fadeSlideUp` 0.3s při načtení stránky
- `hl-mob-strip`: pill styl pro každý item (teplota, svátek, svítání/západ) — `background: var(--bg-2)`, `border-radius: var(--r-pill)`, `padding: 2px 8px`

### 2.2 hl-stats — 2×3 grid (mobile only)
Na mobilu přejít z `display: flex; overflow-x: auto` na `display: grid; grid-template-columns: repeat(3, 1fr)`:

```
┌────────────┬────────────┬────────────┐
│  Aktivní   │ Po termínu │  Streak 🔥  │
│     12     │     2      │   7 dní    │
│  z 34 cel  │ ⚠ icon    │ best 14    │
├────────────┼────────────┼────────────┤
│Hotovo/týden│  Projekty  │Dnes hotovo │
│     8      │     4      │     3      │
│+12% průměr │ z 6 celkem │  dnes      │
└────────────┴────────────┴────────────┘
```

- Grid buňky: `padding: 10px 8px`, `border-right: none`, `border-bottom: 1px dashed var(--border-soft)` pro první řadu
- Poslední řada bez border-bottom
- Separátory: dashed (existující styl zachován)
- Klik na každou buňku zachová navigaci (jako dnes)

### 2.3 Šestá statistika — "Dokončeno dnes"
- **Label:** `Dnes hotovo`
- **Hodnota:** počet úkolů se `status === "done"` a `updatedAt` dnes (stejná logika jako `buildStreak` dayMap)
- **Sub:** prostě `dnes` nebo `"dnes ↑"` pokud > 0
- Přidat do `Headline` props: `doneTodayCount`
- Přidat do `DashboardPage` výpočet: `doneTodayCount`

### 2.4 ⚠ Indikátor "Po termínu"
- Nahradit textový `⚠ vyřeš dnes` / `✓ vše ok` za:
  - Pokud `overdueCount > 0`: `<Icon name="alert-triangle" size={11} color="var(--red)">` + text `vyřeš dnes`, s `animation: pulseLive` v červené variantě
  - Pokud `overdueCount === 0`: `<Icon name="check-circle" size={11} color="var(--green)">` + text `vše ok`
- Přidat CSS třídu `.hl-live-dot-red` jako varianta `pulseLive` s červenou barvou

### 2.5 Desktop hl-stats
- Zachovat existující 5-sloupcový layout
- Přidat 6. sloupec "Dnes hotovo" → `grid-template-columns: repeat(6, 1fr)`
- Hover: přesunout z inline JS na CSS třídu `.hl-stat` s `transition` a `:hover` pravidly

---

## 3. AI sekce

### 3.1 Mobile
- `.aisug` → `display: none` na mobilu (media query `≤768px`)
- `AIDailyPlan` komponenta → nerendovat na mobilu: `{!isMobile && showDailyPlan && <AIDailyPlan />}`
- `ai-hero` collapsed state (existující button): vizuální upgrade na pill styl
  - `border-radius: var(--r-pill)` místo `var(--r)`
  - `padding: 10px 16px` (kompaktnější)
  - `grid-template-columns: 32px 1fr 20px` (menší orb)
  - Celková výška ~52px místo současných ~80px+

### 3.2 Desktop
- `ai-hero` banner beze změn — tlačítko "Vygenerovat plán" zůstává
- `.aisug-card` hover: `transform: translateY(-2px)`, `box-shadow: 0 4px 16px rgba(0,0,0,.2)`
- `.aisug-num` u prvního návrhu (i=0): přidat třídu `.aisug-num-top` s `box-shadow: 0 0 12px var(--accent-glow)`

---

## 4. Animační systém

### 4.1 useCountUp hook
```
src/hooks/useCountUp.js
```
- Props: `(target: number, duration = 600, enabled = true)`
- Výstup: aktuální zobrazovaná hodnota (číslo)
- Easing: `easeOutCubic` — `t => 1 - Math.pow(1 - t, 3)`
- Spouštění: pouze při prvním mount (ne při každém re-renderu)
- Respektuje `prefers-reduced-motion`: pokud je zapnuto, vrátí přímo `target` bez animace

### 4.2 Vstupní animace
Do `atlas-shell.css` přidat:
```css
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

- `.headline` → `animation: fadeSlideUp 0.3s cubic-bezier(.4,0,.2,1) both`
- `.hl-stat:nth-child(n)` → stagger přes `animation-delay: calc(n * 40ms)` (CSS proměnná `--i`)
  - V JSX přidat `style={{ "--i": index }}` na každý `.hl-stat`
  - CSS: `animation-delay: calc(var(--i, 0) * 40ms)`
- `.work > *` (sekce pod headline) → `animation: fadeSlideUp 0.3s ... delay: 150ms`

### 4.3 Hover efekty — přesun z inline JS na CSS
Aktuálně: `onMouseEnter/Leave` mění `style.opacity` a `style.transform` inline.  
Nově: přesunout do CSS třídy, odstranit inline JS handlery.

```css
.hl-stat {
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(.4,0,.2,1),
              box-shadow 0.2s cubic-bezier(.4,0,.2,1);
}
.hl-stat:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px color-mix(in srgb, var(--accent) 18%, transparent);
}
```

### 4.4 tcard hover (desktop)
```css
.tcard {
  transition: transform 0.18s cubic-bezier(.4,0,.2,1),
              border-color 0.18s,
              box-shadow 0.18s;
}
.tcard:hover {
  transform: translateY(-1px);
  border-color: var(--border);
  box-shadow: 0 4px 16px rgba(0,0,0,.15);
}
```

### 4.5 btn.primary — shine sweep
```css
.btn.primary {
  position: relative;
  overflow: hidden;
}
.btn.primary::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%);
  transform: translateX(-100%);
  transition: transform 0.4s cubic-bezier(.4,0,.2,1);
}
.btn.primary:hover::after {
  transform: translateX(100%);
}
```

### 4.6 chip.active pulse
CSS animace se spustí pouze při prvním přidání třídy `.active` (ne při re-renderech), takže není potřeba JS.
```css
@keyframes chipPop {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.06); }
  100% { transform: scale(1); }
}
.chip.active {
  animation: chipPop 0.25s cubic-bezier(.4,0,.2,1);
}
```

### 4.7 quickadd focus
```css
.quickadd {
  transition: border-color 0.2s, box-shadow 0.2s;
}
.quickadd:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
```

### 4.8 tcard-state (checkbox) hover
```css
.tcard-state {
  transition: transform 0.15s, background-color 0.15s;
}
.tcard-state:hover {
  transform: scale(1.15);
}
```

### 4.9 prefers-reduced-motion
Cílit jen na nové vstupní animace a counter hook, ne na všechny transitions (ty jsou funkční).
```css
@media (prefers-reduced-motion: reduce) {
  .headline,
  .hl-stat,
  .work > * {
    animation: none !important;
  }
}
```
`useCountUp` hook: pokud `window.matchMedia('(prefers-reduced-motion: reduce)').matches`, vrátí přímo `target` bez animace.

---

## 5. Soubory ke změně

| Soubor | Změny |
|--------|-------|
| `src/pages/DashboardPage.jsx` | Přidat `doneTodayCount`, upravit `Headline` props, použít `useCountUp`, přesunout hover z inline JS do CSS tříd, skrýt aisug/AIDailyPlan na mobilu, ikony pro overdue indikátor |
| `src/styles/atlas-shell.css` | Mobile hl-stats grid, nové animace, hover CSS pravidla, pill styl mob-strip, ai-hero mobile úpravy |
| `src/hooks/useCountUp.js` | Nový soubor |

---

## 6. Co se NEMĚNÍ

- Struktura `Headline` komponenty (props interface se jen rozšíří)
- `AIDailyPlan.jsx` — žádné změny
- Tlačítko "Vygenerovat plán" zůstává na desktopu
- Routing a navigace
- AppContext a datová vrstva
