export const APP_LANGUAGE = "cs";
export const APP_LOCALE = "cs-CZ";

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const formatterCache = new Map();
const collatorCache = new Map();

function toDate(value) {
  if (value == null || value === "") return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string") {
    const match = value.match(YMD_RE);
    if (match) {
      const [, y, m, d] = match;
      return new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
    }
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getFormatter(options) {
  const key = JSON.stringify(options);
  if (!formatterCache.has(key)) {
    formatterCache.set(key, new Intl.DateTimeFormat(APP_LOCALE, options));
  }
  return formatterCache.get(key);
}

function getCollator(options) {
  const key = JSON.stringify(options);
  if (!collatorCache.has(key)) {
    collatorCache.set(
      key,
      new Intl.Collator(APP_LOCALE, {
        usage: "sort",
        sensitivity: "base",
        numeric: true,
        ...options,
      })
    );
  }
  return collatorCache.get(key);
}

export function formatDate(value, options = { day: "numeric", month: "numeric" }) {
  const date = toDate(value);
  if (!date) return "";
  return getFormatter(options).format(date);
}

export function formatDateKey(value) {
  const date = toDate(value);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateTime(
  value,
  options = {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }
) {
  return formatDate(value, options);
}

export function compareText(a = "", b = "", options = {}) {
  return getCollator(options).compare(String(a ?? ""), String(b ?? ""));
}

export function applyDocumentLanguage(doc = globalThis.document) {
  if (!doc?.documentElement) return;
  doc.documentElement.lang = APP_LANGUAGE;
}
