import { startOfToday } from "../utils.js";
import { formatDateKey } from "../locale.js";

// Length-preserving Czech→ASCII normalizer — keeps string indices valid
const CZECH_MAP = {
  'á':'a','č':'c','ď':'d','é':'e','ě':'e','í':'i',
  'ň':'n','ó':'o','ř':'r','š':'s','ť':'t','ú':'u',
  'ů':'u','ý':'y','ž':'z',
};
function normCS(s) {
  return s.toLowerCase().replace(/[áčďéěíňóřšťúůýž]/g, c => CZECH_MAP[c] || c);
}

function addDays(base, n) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function nextWeekday(today, dow) {
  const d = new Date(today);
  let diff = dow - d.getDay();
  if (diff <= 0) diff += 7;
  d.setDate(d.getDate() + diff);
  return d;
}

// Patterns run against normCS(text) so \b word boundaries work on pure ASCII
const PATTERNS = [
  // "příšti X" — must come before "v X" to take priority
  { re: /\bpristi\s+tyden\b/,   fn: (_, t) => nextWeekday(t, 1) },
  { re: /\bpristi\s+pondeli\b/, fn: (_, t) => addDays(nextWeekday(t, 1), 7) },
  { re: /\bpristi\s+utery\b/,   fn: (_, t) => addDays(nextWeekday(t, 2), 7) },
  { re: /\bpristi\s+stredu\b/,  fn: (_, t) => addDays(nextWeekday(t, 3), 7) },
  { re: /\bpristi\s+ctvrtek\b/, fn: (_, t) => addDays(nextWeekday(t, 4), 7) },
  { re: /\bpristi\s+patek\b/,   fn: (_, t) => addDays(nextWeekday(t, 5), 7) },
  { re: /\bpristi\s+sobotu\b/,  fn: (_, t) => addDays(nextWeekday(t, 6), 7) },
  { re: /\bpristi\s+nedeli\b/,  fn: (_, t) => addDays(nextWeekday(t, 0), 7) },
  // Simple keywords
  { re: /\bdneska?\b/,          fn: (_, t) => t },
  { re: /\bzitra\b/,            fn: (_, t) => addDays(t, 1) },
  { re: /\bpozitri\b/,          fn: (_, t) => addDays(t, 2) },
  { re: /\bza\s+tyden\b/,       fn: (_, t) => addDays(t, 7) },
  { re: /\bza\s+mesic\b/,       fn: (_, t) => addDays(t, 30) },
  { re: /\bza\s+(\d+)\s*(?:dn[iy]|den)\b/, fn: (m, t) => addDays(t, parseInt(m[1])) },
  // Weekdays with "v/ve"
  { re: /\bve?\s+pondeli\b/,    fn: (_, t) => nextWeekday(t, 1) },
  { re: /\bve?\s+utery\b/,      fn: (_, t) => nextWeekday(t, 2) },
  { re: /\bve?\s+stredu\b/,     fn: (_, t) => nextWeekday(t, 3) },
  { re: /\bve?\s+ctvrtek\b/,    fn: (_, t) => nextWeekday(t, 4) },
  { re: /\bve?\s+patek\b/,      fn: (_, t) => nextWeekday(t, 5) },
  { re: /\bve?\s+sobotu\b/,     fn: (_, t) => nextWeekday(t, 6) },
  { re: /\bve?\s+nedeli\b/,     fn: (_, t) => nextWeekday(t, 0) },
];

const DAYS_CS = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];

export function naturalDateLabel(dateKey) {
  if (!dateKey) return "";
  const today = startOfToday();
  const d = new Date(dateKey + "T12:00:00");
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return "dnes";
  if (diff === 1) return "zítra";
  if (diff === 2) return "pozítří";
  return `${DAYS_CS[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}.`;
}

export function parseNaturalDate(text) {
  if (!text?.trim()) return { date: null, cleaned: text || "" };
  const today = startOfToday();
  const n = normCS(text);

  for (const { re, fn } of PATTERNS) {
    const m = n.match(re);
    if (!m) continue;
    const date = fn(m, today);
    // Indices in n == indices in text because normCS is length-preserving
    const cleaned = (text.slice(0, m.index) + text.slice(m.index + m[0].length))
      .replace(/\s{2,}/g, " ").trim();
    return { date: formatDateKey(date), cleaned };
  }

  return { date: null, cleaned: text };
}
