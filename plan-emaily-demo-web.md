# Michal Tasks — plán: oprava e-mailů, demo a prezentační web

*Připraveno na základě prohlídky repozitáře `biofrost-mz/michal-tasks` (větev main, 8. 6. 2026).*

---

## 1) Proč se neposílají souhrny — diagnóza

Prošel jsem obě edge funkce, které posílají e-maily přes Resend (`daily-reminders` a `task-reminders`, soubor `supabase/functions/.../index.ts`). Obě fungují na stejném principu: ověří `x-cron-secret`, vytáhnou úkoly ze Supabase, sestaví HTML a zavolají `https://api.resend.com/emails` s `from: "Zontero <notifikace@tasks.zichmichal.cz>"`.

To, že "Supabase ukazuje správné informace", znamená jen, že **dotaz na úkoly vrací správná data** — neznamená to, že funkce vůbec doběhne až k volání Resend API. Mezi tím je několik míst, kde se to může zaseknout potichu (bez chyby viditelné v appce):

**a) Nesedí ověřená doména vs. odesílací adresa**
Kód posílá z `notifikace@tasks.zichmichal.cz`. Resend ověřuje domény jednotlivě — pokud je v Resendu ověřená `zichmichal.cz`, ale subdoména `tasks.zichmichal.cz` nemá vlastní DKIM/SPF/DMARC záznamy (nebo není přidaná jako samostatná doména/subdoména v Resendu), API volání spadne s chybou typu „domain not found" / „from address not allowed". Tohle je nejpravděpodobnější příčina — **zkontroluj v Resend dashboardu přesně to, jaká doména/subdoména je ověřená, a porovnej s `tasks.zichmichal.cz`**.

**b) `x-cron-secret` / `CRON_SECRET` nesedí**
Obě funkce na začátku vrátí tiše `403 Forbidden`, pokud hlavička `x-cron-secret` neodpovídá `CRON_SECRET` (Supabase secret). Pokud plánovač (pg_cron / Supabase Scheduled Function / externí cron) posílá jiný secret nebo žádný, funkce se vůbec nedostane k Resend volání — Resend tedy nic neuvidí, zatímco databázový dotaz (spuštěný ručně) vypadá v pořádku.

**c) Chybí/neplatný `RESEND_API_KEY` jako Supabase secret**
Proměnná se čte přes `Deno.env.get("RESEND_API_KEY")!` — pokud secret není nastavený v Supabase (Project Settings → Edge Functions → Secrets), funkce spadne na runtime chybě hned na startu.

**d) Chybí e-mail u uživatele**
Funkce mapuje úkoly na uživatele přes `user_profiles.email`. Pokud je u `created_by` uživatele `email` `null`/prázdné, úkol se potichu přeskočí (`if (!task.created_by || !emailMap[task.created_by]) continue;`) — žádná chyba, žádný e-mail.

**e) Cron job vůbec neběží / běží na špatnou URL**
Pokud plánovač není nastavený (nebo míří na špatný endpoint), funkce se nikdy nezavolá.

### Doporučený postup ověření (od nejrychlejšího k nejpomalejšímu)
1. **Resend → Logs/Activity**: pokud tam nejsou žádné pokusy o odeslání z `notifikace@tasks.zichmichal.cz`, problém je „před" Resendem (b, c, e). Pokud tam pokusy jsou a jsou odmítnuté, Resend ti přímo ukáže důvod (typicky doména) → bod (a).
2. **Resend → Domains**: zkontroluj, že `tasks.zichmichal.cz` (ne jen `zichmichal.cz`) má status „Verified" se všemi DNS záznamy zelenými.
3. **Supabase Dashboard → Edge Functions → daily-reminders / task-reminders → Logs**: hledej `console.warn("...unauthorized call...")` (= problém b) nebo `console.error("Failed to send to ...")` (= problém a/c, s konkrétní chybou z Resend API v textu).
4. **Supabase → Database → Cron Jobs** (nebo `select * from cron.job;` v SQL editoru): ověř, že job existuje, je `active`, a že v `command` posílá správnou hlavičku `x-cron-secret` se stejnou hodnotou jako `CRON_SECRET` secret.
5. **Supabase → Table editor → user_profiles**: zkontroluj, že tvůj účet (a případně další uživatelé) má vyplněný `email`.

### Plán opravy
- [ ] Projít kroky 1–5 výše a najít konkrétní chybovou hlášku (to zúží opravu na jeden řádek/nastavení).
- [ ] Pokud je to doména: v Resendu přidat/ověřit `tasks.zichmichal.cz` jako samostatnou doménu (DKIM, SPF, případně DMARC záznamy do DNS u `zichmichal.cz`), nebo změnit `from` na adresu na již ověřené doméně.
- [ ] Pokud je to secret: sjednotit `CRON_SECRET` mezi Supabase secrets a definicí cron jobu.
- [ ] Zvážit přidání **fallback logování do DB** (např. tabulka `email_log` se stavem a chybovou zprávou) — ať příště nejsou potřeba tři dashboardy k diagnóze.
- [ ] Zvážit alert (třeba jen e-mail/Slack na tebe), pokud `daily-reminders` vrátí `sent_emails: 0` při neprázdné frontě úkolů — signalizace „něco je rozbité", ne jen ticho.
- [ ] Po opravě: ruční test přes `curl` na endpoint s platným `x-cron-secret` a kontrola, že e-mail dorazí (i do spam složky).

---

## 2) Demo ukázka — plán

Cíl: ukázat appku tak, aby byla srozumitelná za pár minut, bez nutnosti zakládat účet nebo čekat na reálná data.

**Doporučený přístup: scénářové demo s ukázkovými daty (ne živý účet)**
- Vytvořit dedikovaný „demo workspace" se zajímavě napěchovanými daty (rozpracované projekty, různé priority, blížící se termíny, pár poznámek se šablonami) — ať je vidět produkt v „žitém" stavu, ne prázdná appka.
- Připravit krátký scénář (5–7 kroků), který provede diváka klíčovými momenty: Dashboard přehled → rychlé přidání úkolu (QuickAdd) → Kanban na projektu → Timeline (Gantt) → Command Palette (⌘K) → AI asistent u úkolu → e-mailová připomínka.
- Natočit krátké GIFy/video klipy pro každý krok (10–20 s), které půjde vložit na web i do prezentace — živé klikání je na demo riskantní (lag, chyby, prázdná data).

**Formáty dema (doporučuji udělat oba, jsou levné na výrobu z jednoho scénáře):**
1. **Video walkthrough** (60–90 s) — pro web/sociální sítě, s hlasem nebo titulky.
2. **Interaktivní sandbox** — buď samostatný „demo mode" appky s read-only/reset daty (uživatel si může proklikat), nebo alespoň klikatelný prototyp z naskenovaných obrazovek.

**Co si připravit navíc:**
- Sadu kvalitních screenshotů (světlý i tmavý režim, desktop i mobil) — appka má podle analýzy hezký vizuál, vyplatí se ho ukázat.
- Jednu „hero" obrazovku (Dashboard nebo Timeline), která bude nosný vizuál webu i případné prezentace.

---

## 3) Prezentační web — plán

Cíl: jednostránkový web (landing page), který appku představí, ukáže demo a navede na vyzkoušení/kontakt.

**Návrh struktury (jedna stránka, sekce):**
1. **Hero** — název + jedna věta, co appka dělá a pro koho (osobní task management s AI asistencí), hero vizuál/GIF, CTA „Vyzkoušet" / „Zobrazit demo".
2. **Problém → řešení** — krátce, čím se liší od „dalšího to-do listu" (Timeline/Gantt pro jednotlivce, AI plánování, command palette, e-mailové připomínky...).
3. **Klíčové funkce** — 4–6 karet s krátkým popisem + screenshot/GIF ke každé (Projekty s Kanbanem, Timeline, Poznámky se šablonami, AI asistent, Připomínky e-mailem, Workspace/spolupráce).
4. **Demo sekce** — vložené video nebo interaktivní náhled z bodu 2.
5. **Tech/transparentnost (volitelné, ale sluší to osobním projektům)** — krátká zmínka o stacku (React, Supabase, AI), případně odkaz na GitHub.
6. **CTA / kontakt** — odkaz na appku (`tasks.zichmichal.cz`), případně formulář/e-mail pro zájemce nebo zpětnou vazbu.

**Technické poznámky:**
- Vzhledem k tomu, že appka už běží na `tasks.zichmichal.cz`, web by mohl žít na hlavní doméně `zichmichal.cz` (nebo `michaltasks.cz`/jiná samostatná značka, pokud appku chceš prezentovat jako produkt) s odkazem/CTA do appky.
- Statický web (např. jednoduchá Vite/Next stránka nebo i čisté HTML) stačí — žádný backend není potřeba, jen formulář na kontakt (lze přes Resend/jednoduchou edge funkci, když už infrastruktura existuje).
- Znovupoužít vizuální jazyk appky (fonty Outfit/Figtree, barvy z `theme.js`) — web bude díky tomu hned vypadat jako „z jedné dílny".

---

## 4) Další věci, které by stálo za to zvážit

Z analýzy v `ANALYZA.md` (kterou jste si zjevně už nechali udělat) vyplývá pár dalších bodů — vypíchnu ty, které dávají smysl udělat **souběžně nebo těsně před** demem a webem, protože zlepší dojem z produktu navenek:

- **Vlastní doména pro Resend** — i analýza to označuje jako quick win; vyřeší se zároveň s diagnózou výše.
- **Error boundary kolem appky** — pokud appku uvidí někdo nový (např. po kliknutí z webu), pád na bílou obrazovku je nejhorší první dojem. Tohle je levná pojistka před zveřejněním.
- **`remind_at` reset i při selhání e-mailu** — momentálně hrozí nekonečné opakované pokusy při dílčí chybě; stojí za malou úpravu logiky (např. počítadlo pokusů).
- **Demo/"guest" režim appky** — pokud chceš, aby si návštěvníci webu appku rovnou vyzkoušeli bez registrace, vyplatí se připravit izolovaný read-only nebo sandbox účet (s pravidelným resetem dat), aby si nikdo "nerozbil" tvá reálná data ani naopak.
- **Krátké "o projektu" / "proč jsem si appku postavil" vyprávění na webu** — osobní projekty dobře fungují s příběhem (proč vznikla, co řeší, co je v plánu) — dá webu lidskost, kterou čistě feature-list nemá.

---

## 5) Navrhované pořadí prací

1. **Oprava e-mailů** (1–3) — krátký diagnostický sprint podle bodu 1; bez funkčních e-mailů nemá smysl appku ukazovat navenek jako "hotovou".
2. **Demo příprava** — scénář, demo data, screenshoty/video (lze připravovat paralelně s bodem 1, jakmile je appka stabilní).
3. **Web** — postavit landing page kolem hotového dema a screenshotů (dává smysl dělat až jako poslední krok, protože těží z výstupů z bodu 2).
4. **Doplňkové vylepšení appky** (error boundary, demo režim) — ideálně před/při zveřejnění webu, podle kapacity.

---

*Dej vědět, na kterém bodu chceš začít — ráda/rád pomůžu jít hlouběji (např. konkrétně debugovat e-mailovou funkci, napsat scénář dema, nebo rovnou navrhnout/postavit web).*
