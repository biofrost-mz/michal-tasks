import { useCallback } from "react";
import { uuid4 } from "../../utils.js";
import { runOptimisticMutation } from "../../utils/optimistic.js";
import * as tagService from "../../services/tagService.js";

// Mutace tagů, vyštěpené z AppContextu. Stav (tags, tasks) i settery zůstávají
// v AppContextu a předávají se parametrem.
export function useTagMutations({
  tags,
  tasks,
  setTags,
  setTasks,
  userId,
  activeWorkspaceId,
  reportError,
}) {
  const addTag = useCallback((tag) => {
    const tg = { id: uuid4(), name: (tag?.name || "").trim() || "tag", color: tag?.color || "#6366f1" };
    if (!userId) {
      setTags((p) => [...p, tg]);
      return tg;
    }
    runOptimisticMutation({
      apply: () => setTags((p) => [...p, tg]),
      persist: () => tagService.insertTag(tg, userId, activeWorkspaceId),
      rollback: () => setTags((p) => p.filter((x) => x.id !== tg.id)),
      onError: reportError,
      errorMessage: "Tag se nepodařilo uložit",
    });
    return tg;
  }, [userId, activeWorkspaceId, setTags, reportError]);

  const updateTag = useCallback((id, u) => {
    const prevTag = tags.find((x) => x.id === id) ?? null;
    setTags((p) => p.map((x) => (x.id === id ? { ...x, ...u } : x)));

    const payload = {};
    if (u.name !== undefined) payload.name = u.name;
    if (u.color !== undefined) payload.color = u.color;
    if (!Object.keys(payload).length) return;

    runOptimisticMutation({
      persist: () => tagService.updateTagDB(id, payload),
      rollback: () => { if (prevTag) setTags((p) => p.map((x) => x.id === id ? prevTag : x)); },
      onError: reportError,
      errorMessage: "Tag se nepodařilo aktualizovat",
    });
  }, [tags, setTags, reportError]);

  const deleteTag = useCallback((id) => {
    const prevTags = tags;
    const prevTasks = tasks;
    runOptimisticMutation({
      apply: () => {
        setTags((p) => p.filter((x) => x.id !== id));
        setTasks((p) => p.map((x) => ({ ...x, tagIds: (x.tagIds || []).filter((tid) => tid !== id) })));
      },
      persist: () => tagService.deleteTagDB(id),
      rollback: () => { setTags(prevTags); setTasks(prevTasks); },
      onError: reportError,
      errorMessage: "Tag se nepodařilo smazat",
    });
  }, [tags, tasks, setTags, setTasks, reportError]);

  return { addTag, updateTag, deleteTag };
}
