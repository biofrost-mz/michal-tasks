export function getAiErrorMessage(error, data = {}) {
  const raw = [
    data?.error,
    error?.message,
    error?.details,
    error?.hint,
    typeof error === "string" ? error : "",
  ]
    .filter(Boolean)
    .map(String)
    .join(" ");

  const message = raw || "Neznámá chyba AI služby.";
  const lower = message.toLowerCase();
  const status = error?.status || data?.status;

  if (status === 401 || lower.includes("unauthorized") || lower.includes("invalid token") || lower.includes("jwt")) {
    return {
      type: "auth",
      severity: "error",
      title: "AI vyžaduje nové přihlášení",
      message: "Tvoje relace pravděpodobně vypršela. Odhlas se a znovu přihlas, potom akci spusť znovu.",
      raw: message,
    };
  }

  if (status === 404 || lower.includes("not found") || lower.includes("function not found") || lower.includes("není nasazena") || lower.includes("neni nasazena")) {
    return {
      type: "not_deployed",
      severity: "error",
      title: "AI funkce není dostupná",
      message: "Edge Function pro tuto AI akci není nasazená nebo má jiný název. Zkontroluj Supabase Functions.",
      raw: message,
    };
  }

  if (status === 429 || lower.includes("rate limit") || lower.includes("quota") || lower.includes("too many")) {
    return {
      type: "rate_limit",
      severity: "warning",
      title: "AI limit je dočasně vyčerpaný",
      message: "Proběhlo příliš mnoho AI dotazů. Zkus akci znovu později.",
      raw: message,
    };
  }

  if (
    status === 503 ||
    lower.includes("503") ||
    lower.includes("unavailable") ||
    lower.includes("high demand") ||
    lower.includes("přetížen") ||
    lower.includes("pretizen") ||
    lower.includes("model is currently experiencing high demand")
  ) {
    return {
      type: "model_overloaded",
      severity: "warning",
      title: "AI model je přetížený",
      message: "Model je momentálně přetížený. Pokud je dostupný fallback, aplikace použije jednodušší návrh; jinak to zkus za chvíli.",
      raw: message,
    };
  }

  if (lower.includes("api key") || lower.includes("invalid x-api-key") || lower.includes("chybí") || lower.includes("chybi") || lower.includes("server configuration")) {
    return {
      type: "configuration",
      severity: "error",
      title: "Chyba konfigurace AI",
      message: "Na serveru pravděpodobně chybí nebo neplatí API klíč. Zkontroluj Supabase Secrets.",
      raw: message,
    };
  }

  if (lower.includes("validní json") || lower.includes("validni json") || lower.includes("json") || lower.includes("parse")) {
    return {
      type: "parse",
      severity: "warning",
      title: "AI vrátila nečekaný formát",
      message: "AI odpověď se nepodařilo bezpečně zpracovat. Zkus akci znovu nebo použij jednodušší zadání.",
      raw: message,
    };
  }

  if (lower.includes("non-2xx") || status >= 500 || lower.includes("internal")) {
    return {
      type: "server",
      severity: "error",
      title: "AI služba vrátila serverovou chybu",
      message: "AI funkce je nasazená, ale při zpracování požadavku spadla. Detail je uložený v logu.",
      raw: message,
    };
  }

  return {
    type: "unknown",
    severity: "error",
    title: "AI akce selhala",
    message: message.length > 220 ? `${message.slice(0, 220)}…` : message,
    raw: message,
  };
}

export function formatAiToast(error, data = {}) {
  const info = getAiErrorMessage(error, data);
  return `${info.title}: ${info.message}`;
}

export function parseAiJsonResult(raw) {
  if (typeof raw !== "string") return raw;
  const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const enhanced = new Error("AI odpověď není validní JSON.");
    enhanced.cause = error;
    enhanced.raw = raw;
    throw enhanced;
  }
}
