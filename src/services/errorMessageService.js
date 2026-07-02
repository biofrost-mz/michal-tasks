const PERMISSION_PATTERNS = [
  /permission denied/i,
  /row-level security/i,
  /violates row-level security/i,
  /new row violates row-level security/i,
  /42501/i,
];

const AUTH_PATTERNS = [
  /jwt/i,
  /invalid token/i,
  /expired token/i,
  /not authenticated/i,
  /auth session missing/i,
];

function collectErrorText(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  return [
    error.code,
    error.message,
    error.details,
    error.hint,
    error.error_description,
    error.status,
  ].filter(Boolean).join(" · ");
}

export function isPermissionError(error) {
  const text = collectErrorText(error);
  return PERMISSION_PATTERNS.some((pattern) => pattern.test(text));
}

export function getFriendlyErrorMessage(error, fallback = "Operaci se nepodařilo dokončit") {
  const text = collectErrorText(error);
  if (!text) return fallback;

  if (isPermissionError(error)) {
    return "Na tuto akci nemáš v aktuálním workspace oprávnění.";
  }
  if (AUTH_PATTERNS.some((pattern) => pattern.test(text)) || error?.status === 401) {
    return "Přihlášení vypršelo. Odhlas se a přihlas znovu.";
  }
  if (error?.code === "23505" || /duplicate key/i.test(text)) {
    return "Tento záznam už existuje.";
  }
  if (error?.code === "23503" || /foreign key/i.test(text)) {
    return "Navazující záznam už neexistuje nebo není dostupný.";
  }
  if (typeof error?.message === "string" && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

export function appendFriendlyError(baseMessage, error) {
  const friendly = getFriendlyErrorMessage(error, "");
  if (!friendly || friendly === baseMessage) return baseMessage;
  if (typeof error?.message === "string" && friendly === error.message) return baseMessage;
  if (typeof error === "string" && friendly === error) return baseMessage;
  return `${baseMessage}: ${friendly}`;
}
