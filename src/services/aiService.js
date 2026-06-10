export const AI_CONSOLE_ACTIONS = [
  {
    id: "draft_task",
    label: "Návrh úkolu",
    functionName: "ai-task-assist",
    description: "Z volného textu vytvoří strukturovaný úkol.",
  },
  {
    id: "priority",
    label: "Priorita úkolu",
    functionName: "ai-task-assist",
    description: "Odhadne prioritu a důvod.",
  },
  {
    id: "subtasks",
    label: "Podúkoly",
    functionName: "ai-task-assist",
    description: "Navrhne konkrétní podúkoly.",
  },
  {
    id: "tags",
    label: "Tagy",
    functionName: "ai-task-assist",
    description: "Navrhne vhodné tagy.",
  },
  {
    id: "description",
    label: "Popis úkolu",
    functionName: "ai-task-assist",
    description: "Vytvoří strukturovaný Markdown popis.",
  },
  {
    id: "note_summary",
    label: "Shrnutí poznámky",
    functionName: "ai-task-assist",
    description: "Otestuje AI práci s poznámkami.",
  },
  {
    id: "note_extract_tasks",
    label: "Úkoly z poznámky",
    functionName: "ai-task-assist",
    description: "Extrahuje follow-up úkoly z poznámky.",
  },
  {
    id: "project_planner",
    label: "Projektový plán",
    functionName: "ai-project-planner",
    description: "Otestuje AI generátor projektů.",
  },
];

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function parseResult(result) {
  if (typeof result !== "string") return result;
  const clean = result.trim();
  if (!clean) return clean;
  try {
    return JSON.parse(clean);
  } catch {
    return result;
  }
}

async function getSupabaseClient() {
  const module = await import("../supabase.js");
  return module.supabase;
}

export function getAiConsoleAction(actionId) {
  return AI_CONSOLE_ACTIONS.find((item) => item.id === actionId) || AI_CONSOLE_ACTIONS[0];
}

export function buildAiConsoleBody(actionId, input, context = {}) {
  const text = input?.trim() || "Připravit testovací úkol v aplikaci Zentero";
  const availableTags = context.availableTags || [];
  const availableProjects = context.availableProjects || [];

  if (actionId === "project_planner") {
    return {
      userPrompt: text,
      availableTags,
    };
  }

  if (actionId === "draft_task") {
    return {
      action: "draft_task",
      text,
      length: "medium",
      todayDate: todayIsoDate(),
      availableProjects,
      availableTags,
    };
  }

  if (actionId.startsWith("note_")) {
    return {
      action: actionId,
      note: {
        title: "Testovací poznámka",
        content: text,
      },
      workspaceId: context.workspaceId,
    };
  }

  return {
    action: actionId,
    task: {
      title: text.slice(0, 90),
      description: text,
      dueDate: null,
      priority: null,
    },
    availableTags,
    workspaceId: context.workspaceId,
  };
}

export async function runAiConsoleAction(actionId, input, context = {}) {
  const action = getAiConsoleAction(actionId);
  const body = buildAiConsoleBody(action.id, input, context);
  const startedAt = performance.now();
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.functions.invoke(action.functionName, { body });
  const durationMs = Math.round(performance.now() - startedAt);

  return {
    action,
    body,
    data,
    error,
    durationMs,
    meta: data?.meta || null,
    parsedResult: parseResult(data?.result),
    rawResult: data?.result ?? null,
  };
}

export async function invokeAiTaskAssist(body) {
  const supabase = await getSupabaseClient();
  return supabase.functions.invoke("ai-task-assist", { body });
}

export async function invokeAiProjectPlanner(body) {
  const supabase = await getSupabaseClient();
  return supabase.functions.invoke("ai-project-planner", { body });
}
