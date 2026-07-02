import { describe, expect, it } from "vitest";
import {
  appendFriendlyError,
  getFriendlyErrorMessage,
  isPermissionError,
} from "./errorMessageService.js";

describe("errorMessageService", () => {
  it("pozná Supabase RLS a permission denied chyby", () => {
    const error = { code: "42501", message: "new row violates row-level security policy" };

    expect(isPermissionError(error)).toBe(true);
    expect(getFriendlyErrorMessage(error)).toBe("Na tuto akci nemáš v aktuálním workspace oprávnění.");
  });

  it("překládá auth/session chyby do použitelné hlášky", () => {
    expect(getFriendlyErrorMessage({ status: 401, message: "JWT expired" })).toBe(
      "Přihlášení vypršelo. Odhlas se a přihlas znovu."
    );
  });

  it("zachová známé aplikační hlášky a fallback", () => {
    expect(getFriendlyErrorMessage({ message: "Workspace může přejmenovat jen owner." })).toBe(
      "Workspace může přejmenovat jen owner."
    );
    expect(getFriendlyErrorMessage(null, "Něco se nepovedlo")).toBe("Něco se nepovedlo");
  });

  it("připojí přátelskou část k obecnému textu optimistické mutace", () => {
    expect(appendFriendlyError("Úkol se nepodařilo uložit", { code: "42501", message: "permission denied" })).toBe(
      "Úkol se nepodařilo uložit: Na tuto akci nemáš v aktuálním workspace oprávnění."
    );
  });
});
