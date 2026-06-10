// Centralizovaný vzor pro optimistické mutace.
//
// Dnešní stav: vzor "snapshot → setState → async DB write → catch + rollback +
// error report" je v AppContextu duplikovaný ~20× s drobnými nekonzistencemi
// (snapshot z closure vs. z refu, rollback chirurgický vs. celé pole, míchání
// toast/reportError). Tahle funkce ho sjednocuje na jedno místo, takže každá
// mutace vypadá stejně a chová se stejně.
//
// Helper je záměrně čistý (bez Reactu), aby šel testovat izolovaně. Volající
// dodá tři closury:
//   - apply():    provede optimistické setState (synchronně, hned)
//   - persist():  async zápis do DB; jeho návratová hodnota se vrací volajícímu
//   - rollback(): vrátí stav zpět, když persist selže
// a sjednocené hlášení chyby (onError + errorMessage).

/**
 * Spustí optimistickou mutaci: nejdřív optimisticky upraví UI, pak se pokusí
 * zapsat do DB, a při chybě stav vrátí zpět a nahlásí ji na jednom místě.
 *
 * @template T
 * @param {object} opts
 * @param {() => void} [opts.apply]      Optimistická úprava stavu (běží synchronně, před persist).
 * @param {() => Promise<T>} opts.persist Async zápis do DB. Návratová hodnota se propaguje volajícímu.
 * @param {() => void} [opts.rollback]   Vrácení stavu zpět, pokud persist selže.
 * @param {(message: string, error: unknown) => void} [opts.onError] Jednotné hlášení chyby.
 * @param {string} [opts.errorMessage]   Text chyby předaný do onError.
 * @returns {Promise<{ ok: true, data: T } | { ok: false, error: unknown }>}
 */
export async function runOptimisticMutation({
  apply,
  persist,
  rollback,
  onError,
  errorMessage = "Operaci se nepodařilo dokončit",
}) {
  if (typeof persist !== "function") {
    throw new TypeError("runOptimisticMutation: 'persist' musí být funkce vracející Promise");
  }

  // 1) Optimistická úprava UI — synchronně a před zápisem, ať je odezva okamžitá.
  apply?.();

  try {
    // 2) Zápis do DB. Výsledek vracíme, aby volající mohl použít např. vložený řádek.
    const data = await persist();
    return { ok: true, data };
  } catch (error) {
    // 3) Při chybě nejdřív rollback (UI zpět), pak jedno hlášení chyby.
    // Případnou výjimku z rollbacku spolkneme, aby nepřebila původní chybu
    // a aby onError vždy proběhl a mutace vrátila čistý výsledek.
    try {
      rollback?.();
    } catch {
      /* rollback selhal — původní chyba je důležitější, pokračujeme */
    }
    onError?.(errorMessage, error);
    return { ok: false, error };
  }
}

/**
 * Pomocník pro snapshot + nahrazení celého pole přes setState updater.
 * Vrací { snapshot, restore }, kde restore() vrátí pole na původní hodnotu.
 * Hodí se tam, kde dnes mutace rollbackuje celé pole (deleteTag apod.).
 *
 * @template T
 * @param {(updater: (prev: T) => T) => void} setState  React setter (např. setTags).
 * @returns {{ snapshot: () => void, restore: () => void }}
 */
export function snapshotArray(setState) {
  let saved;
  let captured = false;
  return {
    snapshot() {
      setState((prev) => {
        saved = prev;
        captured = true;
        return prev; // nic nemění, jen si zapamatuje aktuální hodnotu
      });
    },
    restore() {
      if (captured) setState(() => saved);
    },
  };
}
