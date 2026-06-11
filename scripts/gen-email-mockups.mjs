// Generates the static email mockups in email-mockups/ from the same pure
// render primitives used by the deployed template (supabase/functions/_shared/email.ts).
// Keep this in sync with email.ts when the template changes:  node scripts/gen-email-mockups.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── primitives (mirror of _shared/email.ts) ──────────────────────────────────
function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const CHIP_TONES = {
  neutral: { bg: "#f4f5f7", bd: "#e7e7ea", fg: "#475467", weight: 600 },
  red: { bg: "#fff1f0", bd: "#ffd0cc", fg: "#b42318", weight: 700 },
  amber: { bg: "#fffaeb", bd: "#fedf89", fg: "#b54708", weight: 700 },
  green: { bg: "#f0fdf4", bd: "#bbf7d0", fg: "#15803d", weight: 700 },
};
const chipWithPad = (c, pad) => {
  const t = CHIP_TONES[c.tone ?? "neutral"];
  return `<span style="display:inline-block;background:${t.bg};border:1px solid ${t.bd};border-radius:999px;color:${t.fg};font-size:12px;font-weight:${t.weight};padding:${pad};margin:0 5px 5px 0">${escHtml(c.text)}</span>`;
};

function statCellsDesktop(items) {
  const pads = ["padding-right:5px", "padding:0 3px", "padding-left:5px"];
  const cell = (it, pad) =>
    `<td width="33%" valign="top" style="${pad}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.22);border-radius:14px"><tr><td style="padding:15px 17px">
        <div style="color:#ffffff;font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${it.color};vertical-align:middle;margin-right:7px"></span>${escHtml(it.label)}</div>
        <div style="margin-top:9px;color:#ffffff;font-size:42px;line-height:1;font-weight:900;letter-spacing:-.045em">${it.value}</div>
      </td></tr></table>
    </td>`;
  return `<table class="em-desk-stats" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px"><tr>${items.map((it, i) => cell(it, pads[i] ?? "padding:0 3px")).join("")}</tr></table>`;
}
function statRowMobile(items) {
  const sep = `<span style="color:rgba(255,255,255,.45);padding:0 7px">·</span>`;
  const parts = items.map((it) =>
    `<span style="white-space:nowrap"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${it.color};vertical-align:middle;margin-right:6px"></span>${it.value}&nbsp;<span style="color:rgba(255,255,255,.82);font-weight:600">${escHtml(it.label.toLowerCase())}</span></span>`);
  return `<div class="em-mob-stats" style="margin-top:16px;color:#ffffff;font-size:13px;font-weight:700">${parts.join(sep)}</div>`;
}

function heroBlock(o) {
  const badge = o.countBadge
    ? `<td valign="middle" style="padding-left:12px;white-space:nowrap"><span style="display:inline-block;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.26);border-radius:999px;color:#ffffff;font-size:13px;font-weight:800;padding:5px 12px">${escHtml(o.countBadge)}</span></td>`
    : "";
  const extra = o.extraLine
    ? `<div style="margin-top:16px;color:#ffffff;font-size:13px;font-weight:700"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#fbbf24;vertical-align:middle;margin-right:7px"></span>${escHtml(o.extraLine)}</div>`
    : "";
  const stats = o.stats && o.stats.length ? statCellsDesktop(o.stats) + statRowMobile(o.stats) : "";
  return `<tr><td bgcolor="#4f46e5" style="border-radius:20px 20px 0 0;background:#4f46e5;background:linear-gradient(135deg,#2563eb 0%,#4f46e5 48%,#7c3aed 100%)">
   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="em-hero-pad" style="padding:26px 30px 24px">
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
       <td valign="middle"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
         <td valign="middle" style="width:34px;height:34px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.28);border-radius:11px;text-align:center;color:#ffffff;font-size:16px;font-weight:800;line-height:34px">Z</td>
         <td valign="middle" style="padding-left:10px;color:#ffffff;font-size:15px;font-weight:800;letter-spacing:-.01em">Zentero</td>
       </tr></table></td>
       <td align="right" valign="middle" style="color:#ffffff;font-size:12px;font-weight:700;white-space:nowrap"><span style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.24);border-radius:999px;padding:7px 12px">${escHtml(o.dateLabel)}</span></td>
     </tr></table>
     <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px"><tr>
       <td valign="middle" class="em-title" style="color:#ffffff;font-size:28px;line-height:1.12;font-weight:800;letter-spacing:-.025em">${escHtml(o.title)}</td>${badge}
     </tr></table>
     <div style="margin-top:9px;color:rgba(255,255,255,.86);font-size:14px;line-height:1.55;max-width:430px">${escHtml(o.subtitle)}</div>
     ${extra}
     ${stats}
   </td></tr></table>
  </td></tr>`;
}

function taskRowHtml(t, isFirst) {
  const topBorder = isFirst ? "" : "border-top:1px solid #eef0f4;";
  const titleSize = t.prominent ? "17px" : "15px";
  const titleSpacing = t.prominent ? "-.015em" : "-.01em";
  const descSize = t.prominent ? "13.5px" : "13px";
  const descTop = t.prominent ? "6px" : "5px";
  const descLine = t.prominent ? "1.5" : "1.45";
  const chipPad = t.prominent ? "5px 10px" : "4px 9px";
  const chipsTop = t.prominent ? "12px" : "10px";
  const desc = t.desc
    ? `<div class="em-muted" style="margin-top:${descTop};color:#667085;font-size:${descSize};line-height:${descLine}">${escHtml(t.desc)}</div>`
    : "";
  const chipsHtml = t.chips.length
    ? `<div style="margin-top:${chipsTop}">${t.chips.map((c) => chipWithPad(c, chipPad)).join("")}</div>`
    : "";
  return `<tr><td style="border-left:4px solid ${t.accent};padding:${t.prominent ? "16px 17px" : "15px 16px"};${topBorder}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td valign="top">
        <a class="em-link em-strong" href="${t.url}" style="display:block;font-size:${titleSize};font-weight:800;color:#18181b;letter-spacing:${titleSpacing};text-decoration:none">${escHtml(t.title)}</a>
        ${desc}
        ${chipsHtml}
      </td>
      <td valign="middle" align="right" class="em-hide" style="white-space:nowrap;padding-left:12px"><a class="em-link" href="${t.url}" style="display:inline-block;background:#eef2ff;color:#4338ca;border-radius:10px;padding:${t.prominent ? "9px 13px" : "8px 12px"};font-size:12px;font-weight:800;text-decoration:none">Otevřít</a></td>
    </tr></table>
  </td></tr>`;
}

const PILL_TONES = {
  red: { bg: "#fee4e2", bd: "#fecdca", fg: "#b42318" },
  amber: { bg: "#fef0c7", bd: "#fedf89", fg: "#b54708" },
  green: { bg: "#dcfce7", bd: "#bbf7d0", fg: "#15803d" },
};
function section(o) {
  if (!o.tasks.length) return "";
  const pill = o.countPill
    ? (() => { const p = PILL_TONES[o.countPill.tone]; return `<td align="right" style="font-size:12px;font-weight:800;color:${p.fg}"><span style="background:${p.bg};border:1px solid ${p.bd};border-radius:999px;padding:2px 9px">${escHtml(o.countPill.text)}</span></td>`; })()
    : `<td></td>`;
  const rows = o.tasks.map((t, i) => taskRowHtml(t, i === 0)).join("");
  const more = o.moreHref && o.moreText
    ? `<tr><td style="padding:12px 16px;border-top:1px solid #eef0f4;text-align:center"><a class="em-link" href="${o.moreHref}" style="color:#4f46e5;font-size:12.5px;font-weight:700;text-decoration:none">${escHtml(o.moreText)} →</a></td></tr>`
    : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px"><tr>
     <td class="em-strong" style="font-size:13px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#18181b"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${o.dotColor};vertical-align:middle;margin-right:8px"></span>${escHtml(o.label)}</td>${pill}
   </tr></table>
   <table role="presentation" class="em-bd" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;border:1px solid #eef0f4;border-radius:14px">${rows}${more}</table>`;
}

const intro = (text) =>
  `<table role="presentation" class="em-soft em-bd" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #eef0f4;border-radius:14px"><tr><td class="em-muted" style="padding:14px 16px;color:#667085;font-size:13.5px;line-height:1.55">${escHtml(text)}</td></tr></table>`;

const ctaCard = (o) =>
  `<table role="presentation" class="em-soft em-bd" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;background:#f6f6ff;border:1px solid #e6e6fb;border-radius:16px"><tr><td style="padding:18px 20px">
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
       <td valign="middle">
         <div class="em-strong" style="font-size:16px;font-weight:800;color:#18181b;letter-spacing:-.01em">${escHtml(o.title)}</div>
         <div class="em-muted" style="margin-top:4px;color:#667085;font-size:13px;line-height:1.5">${escHtml(o.text)}</div>
       </td>
       <td valign="middle" align="right" class="em-btn-full" style="padding-left:14px">
         <a class="em-link" href="${o.url}" style="display:inline-block;background:#4f46e5;color:#ffffff;border-radius:12px;padding:13px 18px;font-size:14px;font-weight:800;text-decoration:none;white-space:nowrap">${escHtml(o.buttonText)}</a>
       </td>
     </tr></table>
   </td></tr></table>`;

const contentRow = (inner) =>
  `<tr><td bgcolor="#ffffff" class="em-pad em-card em-bd" style="background:#ffffff;border-left:1px solid #e7e7ea;border-right:1px solid #e7e7ea;padding:24px 30px">${inner}</td></tr>`;

function footer(o) {
  const bottom = o.unsubscribeText && o.unsubscribeUrl
    ? `Nechceš už tyto e-maily dostávat? <a href="${o.unsubscribeUrl}" style="color:#667085;text-decoration:underline">${escHtml(o.unsubscribeText)}</a>${o.host ? ` · ${escHtml(o.host)}` : ""}`
    : escHtml(o.host ?? "");
  return `<tr><td style="height:5px;line-height:5px;font-size:0;background:#4f46e5;background:linear-gradient(90deg,#2563eb,#7c3aed)">&nbsp;</td></tr>
   <tr><td bgcolor="#ffffff" class="em-pad em-card em-bd" style="background:#ffffff;border:1px solid #e7e7ea;border-top:0;border-radius:0 0 20px 20px;padding:20px 30px 22px">
     <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
       <td valign="middle" style="width:30px;height:30px;background:#4f46e5;border-radius:9px;text-align:center;color:#fff;font-weight:800;font-size:14px;line-height:30px">Z</td>
       <td valign="middle" class="em-strong" style="padding-left:9px;font-size:13px;font-weight:800;color:#1f2937">Zentero</td>
     </tr></table>
     <div class="em-muted" style="margin-top:11px;color:#667085;font-size:12px;line-height:1.55">${escHtml(o.note)} <a href="${o.settingsUrl}" style="color:#4f46e5;text-decoration:none">nastavení notifikací</a>.</div>
     <div class="em-muted" style="margin-top:13px;color:#98a2b3;font-size:11px;line-height:1.5">${bottom}</div>
   </td></tr>`;
}

const emailShell = (o) => `<!doctype html>
<html lang="cs" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escHtml(o.title)}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  .em-link:hover { opacity:.85; }
  .em-mob-stats { display:none; }
  @media only screen and (max-width:600px) {
    .em-container { width:100% !important; }
    .em-pad { padding-left:18px !important; padding-right:18px !important; }
    .em-hero-pad { padding:22px 18px 20px !important; }
    .em-title { font-size:23px !important; }
    .em-hide { display:none !important; }
    .em-btn-full a { display:block !important; text-align:center !important; }
    .em-desk-stats { display:none !important; }
    .em-mob-stats { display:block !important; }
  }
  @media (prefers-color-scheme: dark) {
    body, .em-bg { background:#0e1117 !important; }
    .em-card { background:#171b26 !important; }
    .em-soft { background:#1f2533 !important; }
    .em-card, .em-soft, .em-bd { border-color:#2a3142 !important; }
    .em-strong { color:#f1f5f9 !important; }
    .em-muted { color:#9aa7b8 !important; }
  }
</style>
</head>
<body class="em-bg" style="margin:0;padding:0;background:transparent;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escHtml(o.preheader)}</div>
<table role="presentation" class="em-bg" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:transparent">
 <tr><td align="center" style="padding:30px 14px">
  <table role="presentation" class="em-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
   ${o.body}
  </table>
 </td></tr>
</table>
</body>
</html>`;

const APP = "https://tasks.zichmichal.cz";

// ── daily digest mockup ──────────────────────────────────────────────────────
const dailyBody =
  heroBlock({
    dateLabel: "úterý 9. června 2026",
    title: "Denní přehled úkolů",
    countBadge: "9 úkolů",
    subtitle: "Co už hoří, co je potřeba dnes a co se blíží v dalších dnech.",
    stats: [
      { label: "Po termínu", value: 6, color: "#ef4444" },
      { label: "Dnes", value: 1, color: "#f59e0b" },
      { label: "Blíží se", value: 2, color: "#22c55e" },
    ],
  }) +
  contentRow(
    intro("Ahoj Michale, tady je stručný přehled úkolů, které potřebují pozornost — nejdřív po termínu, pak dnešní a blížící se.") +
    section({
      label: "Po termínu", dotColor: "#ef4444", countPill: { text: "6", tone: "red" },
      moreHref: APP, moreText: "Zobrazit další 3 po termínu",
      tasks: [
        { title: "AI odpovědi na e-maily", url: `${APP}/?task=t1`, desc: "Propojit s linkou předpřipravené odpovědi a sjednotit tón.", accent: "#ef4444", chips: [{ text: "Projekty OC", tone: "neutral" }, { text: "6 dní po termínu", tone: "red" }] },
        { title: "Spolupráce: Cestujzababku.cz", url: `${APP}/?task=t2`, desc: "Rozjedeme spolupráci? Čekáme na odpověď partnera.", accent: "#ef4444", chips: [{ text: "Spolupráce", tone: "neutral" }, { text: "4 dny po termínu", tone: "red" }] },
        { title: "Vytvořit medailonek", url: `${APP}/?task=t3`, desc: "Scénář, harmonogram natáčení a seznam rekvizit.", accent: "#ef4444", chips: [{ text: "Videomedailonky", tone: "neutral" }, { text: "2 dny po termínu", tone: "red" }, { text: "Nízká", tone: "green" }] },
      ],
    }) +
    section({
      label: "Splatné dnes", dotColor: "#f59e0b", countPill: { text: "1", tone: "amber" },
      tasks: [
        { title: "Zkontrolovat newsletter OCM", url: `${APP}/?task=t4`, desc: "Projít texty, odkazy a zobrazení na mobilu před odesláním.", accent: "#f59e0b", chips: [{ text: "Avenier Web", tone: "neutral" }, { text: "Dnes", tone: "amber" }] },
      ],
    }) +
    section({
      label: "Blíží se termín", dotColor: "#22c55e", countPill: { text: "2", tone: "green" },
      tasks: [
        { title: "Fotky z konference", url: `${APP}/?task=t5`, desc: "Vybrat fotky a doupravit je.", accent: "#22c55e", chips: [{ text: "Ad hoc", tone: "neutral" }, { text: "Zítra", tone: "neutral" }, { text: "Střední", tone: "amber" }] },
        { title: "Smazat fotky z článku", url: `${APP}/?task=t6`, desc: "Ponechat jen finální vizuály.", accent: "#22c55e", chips: [{ text: "Ad hoc", tone: "neutral" }, { text: "Za 3 dny", tone: "neutral" }] },
      ],
    }) +
    ctaCard({ title: "Chceš to rovnou odbavit?", text: "Otevři Zentero a projdi úkoly podle termínu, priority nebo projektu.", buttonText: "Otevřít aplikaci", url: APP })
  ) +
  footer({
    note: "Automatický denní souhrn ze Zentero. Čas přehledu, projekty v e-mailu i typy upozornění upravíš v",
    settingsUrl: APP, unsubscribeText: "Odhlásit denní přehled", unsubscribeUrl: APP, host: "tasks.zichmichal.cz",
  });

writeFileSync(
  join(ROOT, "email-mockups/daily-C-combined.html"),
  emailShell({ preheader: "9 úkolů potřebuje pozornost — 6 po termínu, 1 dnes, 2 se blíží.", title: "Denní přehled úkolů — Zentero", body: dailyBody })
);

// ── task reminder mockup ─────────────────────────────────────────────────────
const reminderBody =
  heroBlock({
    dateLabel: "úterý 9. června 2026",
    title: "Připomínka úkolu",
    subtitle: "Tuhle připomínku sis nastavil u konkrétního úkolu.",
    extraLine: "Nastaveno na úterý 9. června, 14:00",
  }) +
  contentRow(
    section({
      label: "Připomínaný úkol", dotColor: "#f59e0b", countPill: { text: "1", tone: "amber" },
      tasks: [
        { title: "Dokončit audit SEO pro klienta OC", url: `${APP}/?task=t1`, prominent: true, desc: "Technický a obsahový audit + doporučení na další čtvrtletí.", accent: "#f59e0b", chips: [{ text: "SEO", tone: "neutral" }, { text: "Termín zítra", tone: "amber" }, { text: "Vysoká priorita", tone: "red" }] },
      ],
    }) +
    ctaCard({ title: "Otevřít připomínaný úkol", text: "Zkontroluj detail, posuň termín, nebo úkol rovnou dokonči.", buttonText: "Otevřít úkol", url: `${APP}/?task=t1` })
  ) +
  footer({
    note: "Automatická připomínka ze Zentero — chodí podle času, který sis nastavil u úkolu. Upravíš ji v",
    settingsUrl: APP, host: "tasks.zichmichal.cz",
  });

writeFileSync(
  join(ROOT, "email-mockups/task-reminder-combined.html"),
  emailShell({ preheader: "Připomínka: Dokončit audit SEO pro klienta OC — nastaveno na dnes 14:00.", title: "Připomínka úkolu — Zentero", body: reminderBody })
);

console.log("Generated daily-C-combined.html and task-reminder-combined.html");
