import { describe, expect, it, vi } from "vitest";
import { runOptimisticMutation, snapshotArray } from "./optimistic.js";

describe("runOptimisticMutation — úspěšná cesta", () => {
  it("nejdřív aplikuje optimistickou změnu, pak zavolá persist", async () => {
    const order = [];
    const apply = vi.fn(() => order.push("apply"));
    const persist = vi.fn(async () => {
      order.push("persist");
      return "row";
    });

    await runOptimisticMutation({ apply, persist });

    expect(order).toEqual(["apply", "persist"]);
  });

  it("vrací { ok: true, data } s návratovou hodnotou persist", async () => {
    const result = await runOptimisticMutation({
      persist: async () => ({ id: "task-1" }),
    });

    expect(result).toEqual({ ok: true, data: { id: "task-1" } });
  });

  it("při úspěchu nevolá rollback ani onError", async () => {
    const rollback = vi.fn();
    const onError = vi.fn();

    await runOptimisticMutation({
      apply: () => {},
      persist: async () => "ok",
      rollback,
      onError,
    });

    expect(rollback).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("apply je volitelné — funguje i bez něj", async () => {
    const result = await runOptimisticMutation({ persist: async () => 42 });
    expect(result).toEqual({ ok: true, data: 42 });
  });
});

describe("runOptimisticMutation — chybová cesta", () => {
  it("při selhání persist zavolá rollback a vrátí { ok: false, error }", async () => {
    const rollback = vi.fn();
    const boom = new Error("DB down");

    const result = await runOptimisticMutation({
      apply: () => {},
      persist: async () => {
        throw boom;
      },
      rollback,
    });

    expect(rollback).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: false, error: boom });
  });

  it("rollback proběhne PŘED onError", async () => {
    const order = [];
    await runOptimisticMutation({
      persist: async () => {
        throw new Error("x");
      },
      rollback: () => order.push("rollback"),
      onError: () => order.push("onError"),
    });

    expect(order).toEqual(["rollback", "onError"]);
  });

  it("onError dostane errorMessage i původní error", async () => {
    const onError = vi.fn();
    const boom = new Error("network");

    await runOptimisticMutation({
      persist: async () => {
        throw boom;
      },
      onError,
      errorMessage: "Úkol se nepodařilo uložit",
    });

    expect(onError).toHaveBeenCalledWith("Úkol se nepodařilo uložit", boom);
  });

  it("použije výchozí errorMessage, pokud není předán", async () => {
    const onError = vi.fn();
    await runOptimisticMutation({
      persist: async () => {
        throw new Error("x");
      },
      onError,
    });

    expect(onError).toHaveBeenCalledWith("Operaci se nepodařilo dokončit", expect.any(Error));
  });

  it("onError se zavolá i když rollback sám hodí výjimku", async () => {
    const onError = vi.fn();
    await runOptimisticMutation({
      persist: async () => {
        throw new Error("persist");
      },
      rollback: () => {
        throw new Error("rollback selhal");
      },
      onError,
    });

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("rollback i onError jsou volitelné — pád persist nevyhodí výjimku ven", async () => {
    const result = await runOptimisticMutation({
      persist: async () => {
        throw new Error("x");
      },
    });
    expect(result.ok).toBe(false);
  });
});

describe("runOptimisticMutation — validace vstupu", () => {
  it("vyhodí TypeError, pokud persist není funkce", async () => {
    await expect(
      runOptimisticMutation({ persist: undefined })
    ).rejects.toThrow(TypeError);
  });
});

describe("snapshotArray", () => {
  it("snapshot zachytí aktuální hodnotu a restore ji vrátí", () => {
    let state = [{ id: 1 }, { id: 2 }];
    const setState = (updater) => {
      state = updater(state);
    };

    const snap = snapshotArray(setState);
    snap.snapshot(); // zapamatuje [1,2], stav nemění

    expect(state).toEqual([{ id: 1 }, { id: 2 }]);

    // optimistická změna
    setState((prev) => prev.filter((x) => x.id !== 2));
    expect(state).toEqual([{ id: 1 }]);

    // rollback
    snap.restore();
    expect(state).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("restore bez předchozího snapshotu nic neudělá", () => {
    let state = [{ id: 1 }];
    const setState = (updater) => {
      state = updater(state);
    };

    const snap = snapshotArray(setState);
    snap.restore();
    expect(state).toEqual([{ id: 1 }]);
  });

  it("snapshot stav nemodifikuje (vrací stejnou referenci)", () => {
    const original = [{ id: 1 }];
    let state = original;
    const setState = (updater) => {
      state = updater(state);
    };

    snapshotArray(setState).snapshot();
    expect(state).toBe(original);
  });
});

describe("runOptimisticMutation — integrační scénář mutace úkolu", () => {
  it("simuluje deleteTask: optimistický odebrání + rollback při chybě DB", async () => {
    let tasks = [{ id: "a" }, { id: "b" }];
    const setTasks = (updater) => {
      tasks = updater(tasks);
    };
    const target = tasks.find((t) => t.id === "b");
    const onError = vi.fn();

    const result = await runOptimisticMutation({
      apply: () => setTasks((prev) => prev.filter((t) => t.id !== "b")),
      persist: async () => {
        throw new Error("update failed");
      },
      rollback: () => setTasks((prev) => [...prev, target]),
      onError,
      errorMessage: "Úkol se nepodařilo přesunout do koše",
    });

    expect(result.ok).toBe(false);
    expect(tasks).toEqual([{ id: "a" }, { id: "b" }]); // stav obnoven
    expect(onError).toHaveBeenCalledWith("Úkol se nepodařilo přesunout do koše", expect.any(Error));
  });
});
