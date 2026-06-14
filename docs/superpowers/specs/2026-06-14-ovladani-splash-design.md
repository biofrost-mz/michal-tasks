# Design spec: Ovládání (swipe gesta) + Splash screen

**Datum:** 2026-06-14  
**Status:** schváleno k implementaci

---

## 1. Swipe gesta na task kartách

### Co se builduje
Obousměrné swipe gesto na kartách úkolů v `TasksPage` a `ProjectDetailPage`. Inspirace a základ v existující implementaci `QuickTodoCard` v `QuickTodosPage.jsx`.

### Gesta

| Směr | Akce | Barva pozadí | Ikona |
|------|------|--------------|-------|
| Swipe vpravo | Mark as done (hotovo) | Zelená (`#047857` → `#0f766e`) | check |
| Swipe vlevo | Snooze (odložit) | Ambrová (`#92400e` → `#b45309`) | clock |

### Snooze bottom sheet
Po dokončení levého swipe (přes threshold) se zobrazí bottom sheet se třemi volbami:

- **Zítra** — nastaví `dueDate` na dnešní datum + 1 den
- **+3 dny** — nastaví `dueDate` na dnešní datum + 3 dny  
- **Příští týden** — nastaví `dueDate` na dnešní datum + 7 dní

Sheet se zavře po výběru nebo kliknutím mimo. Pokud úkol nemá `dueDate`, nastaví se nová hodnota (datum snooze).

### Technická architektura

**Nová sdílená komponenta:** `src/hooks/useSwipeGesture.js`
- Extrahuje pointer-event logiku z `QuickTodoCard`
- Parametry: `onSwipeLeft`, `onSwipeRight`, `threshold` (default 92px), `maxSwipe` (default 132px)
- Vrací: `{ offsetX, swiping, handlers }` kde `handlers` = `{ onPointerDown, onPointerMove, onPointerUp, onPointerCancel }`
- Detekce osy (x vs y) zachována z původní implementace — zabraňuje konfliktu se scroll gestem

**Nová sdílená komponenta:** `src/components/SwipeTaskCard.jsx`  
- Wrappuje existující `AtlasTaskCard` / `.tcard` shell
- Používá `useSwipeGesture` hook
- Renderuje zelené i ambrové pozadí (skryté za kartou, odkrývají se přes `opacity` a `transform`)
- Při swipe vpravo: volá `onStatusChange(taskId, "done")` + `triggerConfettiBurst` + toast "Hotovo · Zpět"
- Při swipe vlevo: otevře `SnoozeSheet`

**Nová komponenta:** `src/components/SnoozeSheet.jsx`
- Bottom sheet s pevnou výškou (~160px)
- Tři tlačítka: Zítra / +3 dny / Příští týden
- Animace: slide-up (`.su` CSS třída již existuje)
- Volá `updateTask(taskId, { dueDate: newDate })`
- Overlay pozadí zabraňuje kliknutí mimo

**Swipe hint:**
- Jednou při prvním zobrazení `TasksPage` (key `mt:swipe-hint-shown` v localStorage)
- Jemný "nudge" animace (karta se posune o 24px doleva a vrátí)

### CSS
Nové třídy v `atlas-shell.css`:
- `.swipe-shell` — container s `overflow: hidden`, CSS proměnné `--drag-x`, `--swipe-progress`
- `.swipe-bg-right` — zelené pozadí (vpravo)
- `.swipe-bg-left` — ambrové pozadí (vlevo)
- Animace shodné s existujícími `.quick-todo-swipe-*` třídami

---

## 2. Splash screen

### Co se builduje
React komponenta zobrazující se na cold startu aplikace (každé otevření z home screen ikony). Overlay přes celou obrazovku, zmizí fade-outem jakmile je app ready.

### Vizuální design

**Tmavý režim:**
- Pozadí: `#0a0c12` (shodné s `--bg`)
- Logo: `<img src="/icon-zentero.svg">` — 80×80px, se drop-shadow efektem přes CSS filter
- Pulse rings: dva kruhy animované od loga ven, barva `#e3a850` (accent), opacity 0 → fade
- Brand text: `Zentero` — font Satoshi 600, 28px, bílá s amber akcentem na "tero"
- Slogan: `Focus. Organize. Achieve.` — 10px, letter-spacing 0.12em, barva `#4e5161`

**Světlý režim:**
- Pozadí: `#f5f5f7`
- Logo: stejné
- Brand text: tmavá barva `#0a0c12`
- Slogan: `#8e8e93`

**Layout (vertikálně centrovaný):**
```
[pulse rings + logo 80×80]
[mezera 18px]
[Zentero  ← brand text]
[mezera 5px]
[FOCUS. ORGANIZE. ACHIEVE.]
```

### Animace

1. **Při zobrazení** (0ms): logo + text se fade-in + scale-in (`opacity 0→1`, `scale 0.85→1`), trvání 500ms, ease-out
2. **Pulse rings**: dvě vlny, každá trvá 2.4s, druhá s 0.8s zpožděním, animace se opakuje (`opacity 0.5→0`, `scale 1→2.5`)
3. **Při schovávání** (kdy je app ready): celý overlay fade-out, trvání 350ms, ease-in

### Kdy se zobrazuje / schovává

- **Zobrazí se** ihned při mountování `App.jsx`, před vyhodnocením auth stavu
- **Schová se** jakmile platí všechny podmínky:
  - `loaded === true` (AppContext data načtena)
  - Minimální doba zobrazení: **1200ms** (aby animace proběhla aspoň jednou i na rychlém připojení)
- **Nikdy** se nezobrazuje při navigaci mezi stránkami uvnitř aplikace

### Technická architektura

**Nová komponenta:** `src/components/SplashScreen.jsx`
- Props: `visible: boolean`
- Při `visible=false` spustí fade-out (350ms) a pak se unmountuje
- Čte `dk` z AppContext pro dark/light mode barvy

**Integrace v `App.jsx`:**
```jsx
const [splashDone, setSplashDone] = useState(false);
const [minTimePassed, setMinTimePassed] = useState(false);

useEffect(() => {
  const t = setTimeout(() => setMinTimePassed(true), 1200);
  return () => clearTimeout(t);
}, []);

const showSplash = !splashDone;
const shouldHideSplash = loaded && minTimePassed;

useEffect(() => {
  if (shouldHideSplash) setSplashDone(true); // triggers fade-out
}, [shouldHideSplash]);
```

**Optimalizace SVG ikony:**
- `icon-zentero.svg` je 1.1MB — před nasazením optimalizovat přes `npx svgo --multipass`
- Cíl: pod 100KB
- Alternativa: použít `icon-zentero.png` (PNG export 512×512) pokud SVG nelze optimalizovat

---

## 3. Ostatní Ovládání položky (v rozsahu plánu)

### Pull-to-refresh
- Pouze mobile, detekce přetažení > 64px dolů na začátku scrollu
- Volá `refetchAll()` z AppContext
- Vizuální indikátor: spinner pod top barem
- Detekce pouze pokud `scrollTop === 0`

### Haptic feedback
- Vibrace `navigator.vibrate?.([20, 30, 60])` již existuje v QuickTodos
- Rozšíření na: task done, task created, snooze confirm
- Krátké vzory: done = `[20,30,60]`, snooze = `[15,20]`, error = `[50,30,50]`

### Long-press kontextové menu
- Po 500ms držení na task kartě: bottom sheet s rychlými akcemi
- Akce: Upravit / Odložit / Přesunout projekt / Smazat
- Detekce: `onPointerDown` + `setTimeout(500)`, zrušení pokud `onPointerMove` > 8px

---

## Soubory k vytvoření/úpravě

| Soubor | Akce |
|--------|------|
| `src/hooks/useSwipeGesture.js` | Nový — shared swipe hook |
| `src/components/SwipeTaskCard.jsx` | Nový — swipeable task card wrapper |
| `src/components/SnoozeSheet.jsx` | Nový — snooze bottom sheet |
| `src/components/SplashScreen.jsx` | Nový — splash overlay |
| `src/pages/TasksPage.jsx` | Úprava — použít SwipeTaskCard |
| `src/pages/ProjectsPage.jsx` | Úprava — použít SwipeTaskCard v ProjectDetailPage |
| `src/App.jsx` | Úprava — integrace SplashScreen, pull-to-refresh |
| `src/styles/atlas-shell.css` | Úprava — swipe CSS třídy, splash animace |
| `public/icon-zentero.svg` | Optimalizovat (svgo) |
