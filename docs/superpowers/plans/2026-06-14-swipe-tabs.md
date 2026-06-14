# Swipe mezi taby Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Přidat edge-swipe navigaci mezi primárními taby (dashboard → quick-todos → tasks → projects) tak, aby gesto začínalo do 30px od okraje obrazovky a nedocházelo ke konfliktu se SwipeTaskCard.

**Architecture:** Nový hook `useEdgeSwipe` detekuje horizontální swipe začínající od okraje obrazovky. Hook je integrován do `AppShell` a jeho handlery jsou spreadnuty na `<main>` element. Žádný vizuální drag — stránka se přepne po dokončení gesta přes existující PageTransition.

**Tech Stack:** React 19, Pointer Events API, `navigator.vibrate`, existující `useApp()` hook (page, setPage, isMobile).

---

## Soubory

- **Create:** `src/hooks/useEdgeSwipe.js` — hook pro edge swipe detekci
- **Modify:** `src/App.jsx` — import useEdgeSwipe, useCallback, PRIMARY_PAGES konstanta, handlery na `<main>`

---

### Task 1: Hook useEdgeSwipe

**Files:**
- Create: `src/hooks/useEdgeSwipe.js`

- [ ] **Step 1: Vytvořit hook**

Vytvoř soubor `src/hooks/useEdgeSwipe.js` s tímto obsahem:

```js
import { useRef, useCallback } from "react";

const EDGE_THRESHOLD = 30;
const SWIPE_THRESHOLD = 80;

export function useEdgeSwipe({
  onSwipeLeft,
  onSwipeRight,
  edgeThreshold = EDGE_THRESHOLD,
  swipeThreshold = SWIPE_THRESHOLD,
} = {}) {
  const startXRef = useRef(null);
  const startYRef = useRef(null);
  const activeRef = useRef(false);
  const axisRef = useRef(null);
  const pointerIdRef = useRef(null);

  const reset = useCallback(() => {
    activeRef.current = false;
    startXRef.current = null;
    startYRef.current = null;
    axisRef.current = null;
    pointerIdRef.current = null;
  }, []);

  const onPointerDown = useCallback((e) => {
    if (e.pointerType === "mouse") return;
    const nearLeft = e.clientX <= edgeThreshold;
    const nearRight = e.clientX >= window.innerWidth - edgeThreshold;
    if (!nearLeft && !nearRight) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    activeRef.current = true;
    axisRef.current = null;
    pointerIdRef.current = e.pointerId;
  }, [edgeThreshold]);

  const onPointerMove = useCallback((e) => {
    if (!activeRef.current || pointerIdRef.current !== e.pointerId) return;
    if (startXRef.current == null) return;
    const dx = Math.abs(e.clientX - startXRef.current);
    const dy = Math.abs(e.clientY - startYRef.current);
    if (axisRef.current == null && (dx >= 6 || dy >= 6)) {
      axisRef.current = dx >= dy ? "x" : "y";
    }
  }, []);

  const onPointerUp = useCallback((e) => {
    if (!activeRef.current || pointerIdRef.current !== e.pointerId) return;
    if (axisRef.current === "x") {
      const dx = e.clientX - startXRef.current;
      if (dx <= -swipeThreshold && onSwipeLeft) onSwipeLeft();
      else if (dx >= swipeThreshold && onSwipeRight) onSwipeRight();
    }
    reset();
  }, [swipeThreshold, onSwipeLeft, onSwipeRight, reset]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: reset,
    onLostPointerCapture: reset,
  };
}
```

- [ ] **Step 2: Ověřit lint**

```bash
cd "/Users/michalzich/Desktop/Hero projekty/michal-tasks" && npm run lint
```

Očekáváno: žádné chyby (hook je prozatím nepoužitý, lint to toleruje).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useEdgeSwipe.js
git commit -m "feat: add useEdgeSwipe hook for edge-based tab swipe gesture"
```

---

### Task 2: Integrace v AppShell

**Files:**
- Modify: `src/App.jsx`

Kontext: `AppShell` je komponenta v `src/App.jsx` která renderuje celou appku. Má přístup k `page`, `setPage`, `isMobile` přes `useApp()`. `<main>` element je na řádku ~498.

- [ ] **Step 1: Přidat import useCallback a useEdgeSwipe**

V `src/App.jsx` řádek 1 má:
```js
import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
```

Nahraď za:
```js
import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
```

Přidej import hooků (za import SplashScreen, před import css):
```js
import { useEdgeSwipe } from "./hooks/useEdgeSwipe.js";
```

- [ ] **Step 2: Přidat PRIMARY_PAGES konstantu na module level**

Za posledním `import` řádkem (před prvním `const` nebo `function` v souboru) přidej:

```js
const PRIMARY_PAGES = ["dashboard", "quick-todos", "tasks", "projects"];
```

Tato konstanta musí být mimo komponentu (module-level), aby se nealokovala při každém renderu.

- [ ] **Step 3: Přidat handlery do AppShell**

V funkci `AppShell`, těsně za destrukturací z `useApp()` (řádek ~285):
```js
const { dk, setDk, isMobile, page, setPage, taskDetail, cmdOpen, setCmdOpen, isSystemAdmin, loaded, tasks, setTaskDetail, refetchAll } = useApp();
```

Přidej tři řádky — dva `useCallback` handlery a volání `useEdgeSwipe`:

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

- [ ] **Step 4: Spread handlery na `<main>` element**

Najdi `<main>` element (řádek ~498). Aktuálně vypadá takto:
```jsx
<main style={isMobile ? { flex: 1, minWidth: 0, width: "100%", overflow: "visible", position: "relative", paddingBottom: "calc(58px + env(safe-area-inset-bottom, 0px))", overscrollBehaviorY: "auto", WebkitOverflowScrolling: "touch" } : undefined}>
```

Nahraď za:
```jsx
<main
  {...edgeSwipeHandlers}
  style={isMobile ? { flex: 1, minWidth: 0, width: "100%", overflow: "visible", position: "relative", paddingBottom: "calc(58px + env(safe-area-inset-bottom, 0px))", overscrollBehaviorY: "auto", WebkitOverflowScrolling: "touch" } : undefined}
>
```

- [ ] **Step 5: Ověřit lint**

```bash
cd "/Users/michalzich/Desktop/Hero projekty/michal-tasks" && npm run lint
```

Očekáváno: 0 errors, 0 warnings.

- [ ] **Step 6: Ruční test (simulace na desktopu)**

Spusť dev server:
```bash
cd "/Users/michalzich/Desktop/Hero projekty/michal-tasks" && npm run dev
```

V Chrome DevTools přepni na mobilní simulaci (iPhone). Otevři appku. Zkus:
1. Swipe od levého okraje → přepne na předchozí tab (nebo nic, pokud jsi na prvním)
2. Swipe od pravého okraje → přepne na další tab
3. Swipe od středu obrazovky → NESMÍ nic udělat (ověř, že SwipeTaskCard na Tasks stránce stále funguje)
4. Swipe na stránce settings → nic se nestane (settings není v PRIMARY_PAGES)

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx
git commit -m "feat: edge swipe tab navigation between primary pages"
```
