# Michal Tasks

Task management aplikace postavená na `React + Vite + Supabase`. Projekt je navržený jako jedna SPA bez routeru, se sdíleným aplikačním stavem v `AppContext` a s podporou workspace, projektů, úkolů, poznámek, tagů, příloh a připomínek.

## Spuštění

```bash
npm install
npm run dev
```

Další skripty:

```bash
npm run build
npm run lint
npm run preview
```

## Proměnné prostředí

V `*.local` souboru je potřeba mít:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Struktura projektu

- `src/App.jsx`: shell aplikace, layout a přepínání stránek podle `page`
- `src/context/AppContext.jsx`: hlavní stav aplikace, auth, načítání dat, CRUD a workspace akce
- `src/pages/`: jednotlivé obrazovky aplikace
- `src/components/`: sdílené UI bloky jako `QuickAdd`, `TaskDrawer`, `CommandPalette`
- `src/layout/`: sidebar, top bar a mobilní navigace
- `src/locale.js`: centrální locale vrstva pro formátování dat a textové řazení
- `src/appMeta.js`: názvy stránek, dokument title a základní metadata aplikace
- `supabase/`: SQL změny a edge funkce pro připomínky

## Locale vrstva

Projekt je uživatelsky psaný česky, ale dříve měl formátování dat a porovnávání textů rozhozené po komponentách přes natvrdo psané `cs-CZ`. Nově je to soustředěné v `src/locale.js`, odkud se používá:

- `formatDate(...)`
- `formatDateTime(...)`
- `compareText(...)`

Modul navíc bezpečně pracuje i s `YYYY-MM-DD` hodnotami z `<input type="date">`, aby se nevracely timezone posuny.

## Architektura dnes

- Navigace je řízená interním stavem místo React Routeru.
- Data jsou načítaná ze Supabase a velká část aplikační logiky je zatím soustředěná v `AppContext`.
- UI je převážně psané inline styly.

To je funkční a rychlé na vývoj, ale pro větší refaktory dává smysl rozdělovat logiku po feature blocích, například `tasks`, `projects`, `notes`, `workspace`.

## Doporučený další směr

- rozdělit `AppContext` na menší hooky nebo feature providery
- oddělit Supabase dotazy do vlastních modulů
- postupně přesunout opakující se UI patterny z inline stylů do sdílenější vrstvy
- přidat základní smoke testy pro klíčové flows
