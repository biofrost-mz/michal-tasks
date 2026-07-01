import { useCallback } from "react";
import { uuid4 } from "../../utils.js";
import { runOptimisticMutation } from "../../utils/optimistic.js";
import * as quickTodoService from "../../services/quickTodoService.js";

// Mutace rychlých úkolů (Quick Todos), vyštěpené z AppContextu.
// Stav (quickTodos) i jeho setter zůstávají v AppContextu a předávají se sem
// parametrem — vlastnictví stavu se nemění, jen se sem přesouvá logika mutací.
//
// Každá mutace jede přes runOptimisticMutation: optimistický update → perzistence
// → rollback + jednotné hlášení chyby.
export function useQuickTodoMutations({
  quickTodos,
  setQuickTodos,
  userId,
  activeWorkspaceId,
  supabase,
  reportError,
  toast,
  guardContentEdit = () => true,
}) {
  const addQuickTodo = useCallback((text, extras = {}) => {
    if (!guardContentEdit()) return null;
    const qt = {
      id: uuid4(),
      text: (text || "").trim(),
      done: false,
      createdAt: Date.now(),
      priority: extras.priority ?? null,
      dueDate: extras.dueDate ?? null,
      tags: extras.tags ?? null,
      description: extras.description ?? null,
    };
    toast("Položka byla přidána", "success");
    if (!userId) {
      setQuickTodos((prev) => [qt, ...prev]);
      return qt;
    }
    runOptimisticMutation({
      apply: () => setQuickTodos((prev) => [qt, ...prev]),
      persist: () => quickTodoService.insertQuickTodo(qt, userId, activeWorkspaceId),
      rollback: () => setQuickTodos((prev) => prev.filter((q) => q.id !== qt.id)),
      onError: reportError,
      errorMessage: "Rychlý úkol se nepodařilo uložit",
    });
    return qt;
  }, [userId, activeWorkspaceId, setQuickTodos, reportError, toast, guardContentEdit]);

  const archiveQuickTodo = useCallback((id, options = {}) => {
    if (!guardContentEdit()) return;
    const prevTodos = quickTodos;
    if (!options.silent) toast("Položka byla dokončena", "success");
    runOptimisticMutation({
      apply: () => setQuickTodos((prev) => prev.map((q) => q.id === id ? { ...q, done: true } : q)),
      persist: () => quickTodoService.updateQuickTodoDB(id, { done: true }),
      rollback: () => setQuickTodos(prevTodos),
      onError: reportError,
      errorMessage: "Rychlý úkol se nepodařilo archivovat",
    });
  }, [quickTodos, setQuickTodos, reportError, toast, guardContentEdit]);

  const restoreQuickTodo = useCallback((id) => {
    if (!guardContentEdit()) return;
    const prevTodos = quickTodos;
    toast("Položka byla obnovena", "success");
    runOptimisticMutation({
      apply: () => setQuickTodos((prev) => prev.map((q) => q.id === id ? { ...q, done: false } : q)),
      persist: () => quickTodoService.updateQuickTodoDB(id, { done: false }),
      rollback: () => setQuickTodos(prevTodos),
      onError: reportError,
      errorMessage: "Rychlý úkol se nepodařilo obnovit",
    });
  }, [quickTodos, setQuickTodos, reportError, toast, guardContentEdit]);

  const deleteQuickTodo = useCallback((id) => {
    if (!guardContentEdit()) return;
    const prevTodo = quickTodos.find((q) => q.id === id) ?? null;
    toast("Položka byla smazána", "success");
    runOptimisticMutation({
      apply: () => setQuickTodos((prev) => prev.filter((q) => q.id !== id)),
      persist: () => quickTodoService.deleteQuickTodoDB(id),
      rollback: () => { if (prevTodo) setQuickTodos((prev) => [...prev, prevTodo]); },
      onError: reportError,
      errorMessage: "Rychlý úkol se nepodařilo smazat",
    });
  }, [quickTodos, setQuickTodos, reportError, toast, guardContentEdit]);

  const updateQuickTodo = useCallback((id, payload) => {
    if (!guardContentEdit()) return;
    const prevTodos = quickTodos;
    toast("Změny uloženy", "success");
    runOptimisticMutation({
      apply: () => setQuickTodos((prev) => prev.map((q) => q.id === id ? { ...q, ...payload } : q)),
      persist: () => quickTodoService.updateQuickTodoDB(id, payload),
      rollback: () => setQuickTodos(prevTodos),
      onError: reportError,
      errorMessage: "Rychlý úkol se nepodařilo aktualizovat",
    });
  }, [quickTodos, setQuickTodos, reportError, toast, guardContentEdit]);

  const clearArchivedQuickTodos = useCallback(() => {
    if (!guardContentEdit()) return;
    const ids = quickTodos.filter((q) => q.done).map((q) => q.id);
    if (!ids.length) return;
    const prevTodos = quickTodos;
    runOptimisticMutation({
      apply: () => setQuickTodos((prev) => prev.filter((q) => !q.done)),
      persist: async () => {
        const { error } = await supabase.from("quick_todos").delete().in("id", ids);
        if (error) throw error;
      },
      rollback: () => setQuickTodos(prevTodos),
      onError: reportError,
      errorMessage: "Archivované úkoly se nepodařilo smazat",
    });
  }, [quickTodos, setQuickTodos, supabase, reportError, guardContentEdit]);

  return {
    addQuickTodo,
    archiveQuickTodo,
    restoreQuickTodo,
    deleteQuickTodo,
    updateQuickTodo,
    clearArchivedQuickTodos,
  };
}
