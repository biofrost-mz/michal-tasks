# Swipe mezi taby — Design Spec

**Goal:** Přepínání primárních tabů horizontálním swipem od okraje obrazovky (edge swipe), bez konfliktu s existujícími gesty (SwipeTaskCard, pull-to-refresh).

**Approach:** Edge swipe — gesto se aktivuje pouze pokud začíná do 30px od levého nebo pravého okraje obrazovky. Žádný vizuální drag; stránka se přepne po dokončení gesta pomocí stávajícího PageTransition.

---

## Soubory

- **Create:** `src/hooks/useEdgeSwipe.js` — nový hook pro edge swipe detekci
- **Modify:** `src/App.jsx` — integrace hooků + handlery na `<main>` elementu

---

## Hook: useEdgeSwipe

```js
// src/hooks/useEdgeSwipe.js
export function useEdgeSwipe({
  onSwipeLeft,
  onSwipeRight,
  edgeThreshold = 30,  // px od okraje pro aktivaci
  swipeThreshold = 80, // px horizontálního pohybu pro trigger
} = {})
```

**Chování:**
1. `onPointerDown`: pokud `e.pointerType === "mouse"` → ignoruj. Pokud `e.clientX > edgeThreshold` AND `e.clientX < window.innerWidth - edgeThreshold` → ignoruj. Jinak ulož startX, startY, pointerId.
2. `onPointerMove`: po 6px pohybu zamkni osu — pokud `|dx| >= |dy|` → osa X, jinak osa Y (ignoruj).
3. `onPointerUp`: pokud osa X a `dx <= -swipeThreshold` → `onSwipeLeft()`. Pokud `dx >= swipeThreshold` → `onSwipeRight()`. Reset stavu.
4. `onPointerCancel` / `onLostPointerCapture`: reset stavu.

**Vrací:** `{ onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture }`

---

## Integrace v AppShell (App.jsx)

Module-level konstanta (mimo komponentu, aby se nealokovala při každém renderu):
```js
const PRIMARY_PAGES = ["dashboard", "quick-todos", "tasks", "projects"];
```

Dva `useCallback` handlery uvnitř `AppShell`:

```js
const handleSwipeLeft = useCallback(() => {
  if (!isMobile) return;
  const idx = PRIMARY_PAGES.indexOf(page);
  if (idx === -1 || idx === PRIMARY_PAGES.length - 1) return;
  navigator.vibrate?.([10]);
  setPage(PRIMARY_PAGES[idx + 1]);
}, [isMobile, page, setPage]);

const handleSwipeRight = useCallback(() => {
  if (!isMobile) return;
  const idx = PRIMARY_PAGES.indexOf(page);
  if (idx === -1 || idx === 0) return;
  navigator.vibrate?.([10]);
  setPage(PRIMARY_PAGES[idx - 1]);
}, [isMobile, page, setPage]);

const edgeSwipeHandlers = useEdgeSwipe({
  onSwipeLeft: handleSwipeLeft,
  onSwipeRight: handleSwipeRight,
});
```

Spread na `<main>`:
```jsx
<main {...edgeSwipeHandlers} style={...}>
```

---

## Co se NEřeší

- Vizuální drag preview (stránka se nepohybuje při geste — jen přejde po puštění)
- Secondary stránky (notes, timeline, tags, settings) — swipe na nich nedělá nic (nejsou v PRIMARY_PAGES)
- Desktop — `pointerType === "mouse"` guard v hoooku + `isMobile` guard v callbacku
- `project-detail` — není v PRIMARY_PAGES, swipe ignorován

---

## Konfliktní gesta

- **SwipeTaskCard:** chytá gesta od středu karty (ne od okraje) — žádný konflikt
- **Pull-to-refresh:** vertikální gesto — žádný konflikt (osa Y se ignoruje)
- **Android Chrome back gesture:** browser back gesta jsou na úrovni OS, ne pointer events — žádný konflikt
