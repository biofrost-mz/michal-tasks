# Design Sprint: SectionLabel Component — Design Spec

**Goal:** Extrahovat nejčastěji duplikovaný UI vzor (sekce-label) do znovupoužitelné komponenty a nasadit ji do 4 nejpostiženějších souborů (29 z 59 výskytů).

**Approach:** Nová CSS třída v existujícím `ui.css` + minimální React wrapper `SectionLabel.jsx` v `src/components/ui/`. Žádné nové tokeny — `tokens.css` již obsahuje vše potřebné (`--text-xs`, `--font-mono`, `--text-3`). Componenta je přidána do `ui/index.js` exportu.

---

## Kontext

Appka má dvě paralelní vrstvy stylování:
- **Stará vrstva**: `t.xxx` z `useApp()` + inline JSX styly (používají stránky a většina komponent)
- **Nová vrstva**: `tokens.css` + `ui.css` + React komponenty v `src/components/ui/` (Button, Panel, Input, Badge)

Tento sprint rozšiřuje novou vrstvu o `SectionLabel`. Stará vrstva se zatím nerůší — migrace probíhá postupně.

---

## Duplikovaný vzor (co se extrahuje)

Pattern se vyskytuje **59× ve 18 souborech**. Vždy jde o sekci-label — uppercase nadpis pole nebo sekce uvnitř modalu/stránky:

```jsx
// PŘED — opakuje se doslova desítky krát:
<div style={{
  fontSize: 11,
  fontWeight: 700,
  color: t.text3,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontFamily: "var(--font-mono)"
}}>
  Status
</div>

// PO:
<SectionLabel>Status</SectionLabel>
```

Varianta s marginBottom (nejčastější modifier):
```jsx
// PŘED:
<div style={{
  fontSize: 11, fontWeight: 700, color: t.text3,
  textTransform: "uppercase", letterSpacing: "0.06em",
  fontFamily: "var(--font-mono)", marginBottom: 6
}}>
  Projekt
</div>

// PO:
<SectionLabel style={{ marginBottom: 6 }}>Projekt</SectionLabel>
```

---

## Soubory

- **Modify:** `src/styles/ui.css` — přidat `.section-label` třídu
- **Create:** `src/components/ui/SectionLabel.jsx` — React wrapper
- **Modify:** `src/components/ui/index.js` — přidat export
- **Modify:** `src/components/QuickAdd.jsx` — nahradit 8 výskytů
- **Modify:** `src/pages/QuickTodosPage.jsx` — nahradit 8 výskytů
- **Modify:** `src/pages/TimelinePage.jsx` — nahradit 7 výskytů
- **Modify:** `src/components/AITaskAssist.jsx` — nahradit 6 výskytů

---

## CSS třída

Přidat do `src/styles/ui.css` (za `.panel` sekci):

```css
/* ══════════════════════════════════════════════════════════════
   SECTION LABEL
   Uppercase mono nadpis sekce — nahrazuje 59× opakovaný inline vzor.
   ══════════════════════════════════════════════════════════════ */
.section-label {
  font-size: var(--text-xs);     /* 11px */
  font-weight: var(--weight-bold); /* 700 */
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-family: var(--font-mono);
}
```

Poznámka: `--text-xs: 11px`, `--weight-bold: 700`, `--text-3` je definován pro `.dark` i `.light` v `tokens.css`. Třída neobsahuje margin — caller přidá přes `style` prop.

**Barevná divergence (záměrná):** `var(--text-3)` z `tokens.css` se nepatrně liší od `t.text3` z `theme.js` v tmavém režimu (`#545e72` vs `#5a6375`; v světlém jsou shodné: `#9ca3af`). Oba jsou vizuálně nerozeznatelné desaturované šedé. Tuto drobnou změnu přijímáme — sjednocení barevných systémů proběhne v pozdější iniciativě.

---

## React komponenta

```jsx
// src/components/ui/SectionLabel.jsx
import React from "react";

export default function SectionLabel({ children, style, className = "" }) {
  return (
    <div className={`section-label${className ? ` ${className}` : ""}`} style={style}>
      {children}
    </div>
  );
}
```

---

## Export

```js
// src/components/ui/index.js — přidat:
export { default as SectionLabel } from "./SectionLabel.jsx";
```

---

## Wire-up pravidla

### Identifikace vzoru

Hledej bloky s **alespoň třemi** z těchto pěti vlastností najednou:
- `fontSize: 11` nebo `fontSize: "11px"`
- `fontWeight: 700`
- `textTransform: "uppercase"`
- `letterSpacing: "0.06em"` nebo `"0.05em"` nebo `"0.08em"`
- `fontFamily: "var(--font-mono)"`

### Co zachovat jako `style` prop

Po nahrazení: pokud původní `<div>` měl **navíc** `marginBottom`, `marginTop`, nebo jinou layout vlastnost, přenést do `style={{...}}` na `<SectionLabel>`.

Příklady:
```jsx
// Původní měl marginBottom: 6 → přenést:
<SectionLabel style={{ marginBottom: 6 }}>Termín</SectionLabel>

// Původní neměl nic navíc → čistý:
<SectionLabel>Status</SectionLabel>
```

### Co NEZAHRNOUT

- Případy kde je na stejném elementu `display: flex` + `justifyContent` (to jsou layout kontejnery, ne čisté section-label)
- Případy kde je `color` jiná než `t.text3` / `t.text2` (barevné varianty — ponechat inline)
- Komentáře, code-only elementy

### Import v každém souboru

Cesta závisí na umístění souboru:

```jsx
// src/components/QuickAdd.jsx a src/components/AITaskAssist.jsx:
import { SectionLabel } from "./ui/index.js";

// src/pages/QuickTodosPage.jsx a src/pages/TimelinePage.jsx:
import { SectionLabel } from "../components/ui/index.js";
```

---

## Co se NEŘEŠÍ

- Zbylých ~30 výskytů ve 14 dalších souborech (následující sprint)
- Migrace `t.xxx` barev na `var(--text-1)` etc. (separátní iniciativa)
- Přidávání nových tokenů (existující `tokens.css` je dostačující)
- `marginBottom: 6` jako výchozí v komponentě — caller ho musí explicitně dodat

---

## Testování

Po každém souboru:
```bash
cd "/Users/michalzich/Desktop/Hero projekty/michal-tasks" && npm run lint
```

Očekáváno: 0 errors, 0 warnings (SectionLabel nepoužívá `t` prop → žádné unused var warningy).

Vizuální kontrola: section labels musí vypadat identicky jako před migrací — stejná velikost, barva, spacing.
