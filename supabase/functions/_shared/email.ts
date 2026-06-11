// Sdílený render modul pro informační e-maily (Zentero).
// Čisté funkce vstup→string. HTML odpovídá schváleným mockupům
// email-mockups/daily-C-combined.html a task-reminder-combined.html.
// Bulletproof: tabulky, inline styly, gradient s bgcolor fallbackem,
// media queries jen jako vylepšení pro mobil.

export function escHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type ChipTone = "neutral" | "red" | "amber" | "green";

const CHIP_TONES: Record<ChipTone, { bg: string; bd: string; fg: string; weight: number }> = {
  neutral: { bg: "#f4f5f7", bd: "#e7e7ea", fg: "#475467", weight: 600 },
  red: { bg: "#fff1f0", bd: "#ffd0cc", fg: "#b42318", weight: 700 },
  amber: { bg: "#fffaeb", bd: "#fedf89", fg: "#b54708", weight: 700 },
  green: { bg: "#f0fdf4", bd: "#bbf7d0", fg: "#15803d", weight: 700 },
};

export interface Chip {
  text: string;
  tone?: ChipTone;
}

export function chip(c: Chip): string {
  return chipWithPad(c, "4px 9px");
}

function chipWithPad(c: Chip, pad: string): string {
  const t = CHIP_TONES[c.tone ?? "neutral"];
  return `<span style="display:inline-block;background:${t.bg};border:1px solid ${t.bd};border-radius:999px;color:${t.fg};font-size:12px;font-weight:${t.weight};padding:${pad};margin:0 5px 5px 0">${escHtml(c.text)}</span>`;
}

export interface StatItem {
  label: string;
  value: number;
  color: string; // hex barva tečky (#ef4444 / #f59e0b / #22c55e)
}

function statCellsDesktop(items: StatItem[]): string {
  const pads = ["padding-right:5px", "padding:0 3px", "padding-left:5px"];
  const cell = (it: StatItem, pad: string) =>
    `<td width="33%" valign="top" style="${pad}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.22);border-radius:14px"><tr><td style="padding:15px 17px">
        <div style="color:#ffffff;font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${it.color};vertical-align:middle;margin-right:7px"></span>${escHtml(it.label)}</div>
        <div style="margin-top:9px;color:#ffffff;font-size:42px;line-height:1;font-weight:900;letter-spacing:-.045em">${it.value}</div>
      </td></tr></table>
    </td>`;
  return `<table class="em-desk-stats" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px"><tr>${items
    .map((it, i) => cell(it, pads[i] ?? "padding:0 3px"))
    .join("")}</tr></table>`;
}

function statRowMobile(items: StatItem[]): string {
  const sep = `<span style="color:rgba(255,255,255,.45);padding:0 7px">·</span>`;
  const parts = items.map(
    (it) =>
      `<span style="white-space:nowrap"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${it.color};vertical-align:middle;margin-right:6px"></span>${it.value}&nbsp;<span style="color:rgba(255,255,255,.82);font-weight:600">${escHtml(it.label.toLowerCase())}</span></span>`,
  );
  return `<div class="em-mob-stats" style="margin-top:16px;color:#ffffff;font-size:13px;font-weight:700">${parts.join(sep)}</div>`;
}

export interface HeroOpts {
  dateLabel: string;
  title: string;
  countBadge?: string;
  subtitle: string;
  stats?: StatItem[];
  extraLine?: string;
}

export function heroBlock(o: HeroOpts): string {
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

export interface TaskRow {
  title: string;
  url: string;
  desc?: string;
  chips: Chip[];
  accent: string; // hex levého proužku
  prominent?: boolean; // větší karta pro single-task reminder
}

function taskRowHtml(t: TaskRow, isFirst: boolean): string {
  const topBorder = isFirst ? "" : "border-top:1px solid #eef0f4;";
  const titleSize = t.prominent ? "17px" : "15px";
  const titleSpacing = t.prominent ? "-.015em" : "-.01em";
  const descSize = t.prominent ? "13.5px" : "13px";
  const descTop = t.prominent ? "6px" : "5px";
  const descLine = t.prominent ? "1.5" : "1.45";
  const chipPad = t.prominent ? "5px 10px" : "4px 9px";
  const chipsTop = t.prominent ? "12px" : "10px";
  const desc = t.desc
    ? `<div style="margin-top:${descTop};color:#667085;font-size:${descSize};line-height:${descLine}">${escHtml(t.desc)}</div>`
    : "";
  const chipsHtml = t.chips.length
    ? `<div style="margin-top:${chipsTop}">${t.chips.map((c) => chipWithPad(c, chipPad)).join("")}</div>`
    : "";
  return `<tr><td style="border-left:4px solid ${t.accent};padding:${t.prominent ? "16px 17px" : "15px 16px"};${topBorder}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td valign="top">
        <a class="em-link" href="${t.url}" style="display:block;font-size:${titleSize};font-weight:800;color:#18181b;letter-spacing:${titleSpacing};text-decoration:none">${escHtml(t.title)}</a>
        ${desc}
        ${chipsHtml}
      </td>
      <td valign="middle" align="right" class="em-hide" style="white-space:nowrap;padding-left:12px"><a class="em-link" href="${t.url}" style="display:inline-block;background:#eef2ff;color:#4338ca;border-radius:10px;padding:${t.prominent ? "9px 13px" : "8px 12px"};font-size:12px;font-weight:800;text-decoration:none">Otevřít</a></td>
    </tr></table>
  </td></tr>`;
}

export interface SectionOpts {
  label: string;
  dotColor: string;
  countPill?: { text: string; tone: "red" | "amber" | "green" };
  tasks: TaskRow[];
  moreHref?: string;
  moreText?: string;
}

const PILL_TONES = {
  red: { bg: "#fee4e2", bd: "#fecdca", fg: "#b42318" },
  amber: { bg: "#fef0c7", bd: "#fedf89", fg: "#b54708" },
  green: { bg: "#dcfce7", bd: "#bbf7d0", fg: "#15803d" },
};

export function section(o: SectionOpts): string {
  if (!o.tasks.length) return "";
  const pill = o.countPill
    ? (() => {
        const p = PILL_TONES[o.countPill!.tone];
        return `<td align="right" style="font-size:12px;font-weight:800;color:${p.fg}"><span style="background:${p.bg};border:1px solid ${p.bd};border-radius:999px;padding:2px 9px">${escHtml(o.countPill!.text)}</span></td>`;
      })()
    : `<td></td>`;
  const rows = o.tasks.map((t, i) => taskRowHtml(t, i === 0)).join("");
  const more =
    o.moreHref && o.moreText
      ? `<tr><td style="padding:12px 16px;border-top:1px solid #eef0f4;text-align:center"><a class="em-link" href="${o.moreHref}" style="color:#4f46e5;font-size:12.5px;font-weight:700;text-decoration:none">${escHtml(o.moreText)} →</a></td></tr>`
      : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px"><tr>
     <td style="font-size:13px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#18181b"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${o.dotColor};vertical-align:middle;margin-right:8px"></span>${escHtml(o.label)}</td>${pill}
   </tr></table>
   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;border:1px solid #eef0f4;border-radius:14px">${rows}${more}</table>`;
}

export function intro(text: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #eef0f4;border-radius:14px"><tr><td style="padding:14px 16px;color:#667085;font-size:13.5px;line-height:1.55">${escHtml(text)}</td></tr></table>`;
}

export interface CtaOpts {
  title: string;
  text: string;
  buttonText: string;
  url: string;
}

export function ctaCard(o: CtaOpts): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;background:#f6f6ff;border:1px solid #e6e6fb;border-radius:16px"><tr><td style="padding:18px 20px">
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
       <td valign="middle">
         <div style="font-size:16px;font-weight:800;color:#18181b;letter-spacing:-.01em">${escHtml(o.title)}</div>
         <div style="margin-top:4px;color:#667085;font-size:13px;line-height:1.5">${escHtml(o.text)}</div>
       </td>
       <td valign="middle" align="right" class="em-btn-full" style="padding-left:14px">
         <a class="em-link" href="${o.url}" style="display:inline-block;background:#4f46e5;color:#ffffff;border-radius:12px;padding:13px 18px;font-size:14px;font-weight:800;text-decoration:none;white-space:nowrap">${escHtml(o.buttonText)}</a>
       </td>
     </tr></table>
   </td></tr></table>`;
}

// Obsahový bílý blok (intro + sekce + cta jdou dovnitř).
export function contentRow(innerHtml: string): string {
  return `<tr><td bgcolor="#ffffff" class="em-pad" style="background:#ffffff;border-left:1px solid #e7e7ea;border-right:1px solid #e7e7ea;padding:24px 30px">${innerHtml}</td></tr>`;
}

export interface FooterOpts {
  note: string;
  settingsUrl: string;
  unsubscribeText?: string;
  unsubscribeUrl?: string;
  host?: string;
}

export function footer(o: FooterOpts): string {
  const bottom = o.unsubscribeText && o.unsubscribeUrl
    ? `Nechceš už tyto e-maily dostávat? <a href="${o.unsubscribeUrl}" style="color:#667085;text-decoration:underline">${escHtml(o.unsubscribeText)}</a>${o.host ? ` · ${escHtml(o.host)}` : ""}`
    : escHtml(o.host ?? "");
  return `<tr><td style="height:5px;line-height:5px;font-size:0;background:#4f46e5;background:linear-gradient(90deg,#2563eb,#7c3aed)">&nbsp;</td></tr>
   <tr><td bgcolor="#ffffff" class="em-pad" style="background:#ffffff;border:1px solid #e7e7ea;border-top:0;border-radius:0 0 20px 20px;padding:20px 30px 22px">
     <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
       <td valign="middle" style="width:30px;height:30px;background:#4f46e5;border-radius:9px;text-align:center;color:#fff;font-weight:800;font-size:14px;line-height:30px">Z</td>
       <td valign="middle" style="padding-left:9px;font-size:13px;font-weight:800;color:#1f2937">Zentero</td>
     </tr></table>
     <div style="margin-top:11px;color:#667085;font-size:12px;line-height:1.55">${escHtml(o.note)} <a href="${o.settingsUrl}" style="color:#4f46e5;text-decoration:none">nastavení notifikací</a>.</div>
     <div style="margin-top:13px;color:#98a2b3;font-size:11px;line-height:1.5">${bottom}</div>
   </td></tr>`;
}

export interface ShellOpts {
  preheader: string;
  title: string;
  body: string; // <tr> bloky (hero + contentRow + footer)
}

export function emailShell(o: ShellOpts): string {
  return `<!doctype html>
<html lang="cs" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${escHtml(o.title)}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<style>
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
</style>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escHtml(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f5f7">
 <tr><td align="center" style="padding:30px 14px">
  <table role="presentation" class="em-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
   ${o.body}
  </table>
 </td></tr>
</table>
</body>
</html>`;
}
