import { createClient } from "@supabase/supabase-js";
import { saveAiHistoryEntry, summarizeAiResult } from "./services/aiHistoryService.js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  const message = "Missing Supabase env vars: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY";

  if (import.meta.env.DEV) {
    throw new Error(message);
  }

  console.error(message);
}

function parseMaybeJson(result) {
  if (typeof result !== "string") return result;
  const clean = result.trim();
  if (!clean) return clean;
  try {
    return JSON.parse(clean);
  } catch {
    return result;
  }
}

function getDuration(startedAt) {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  return Math.round(now - startedAt);
}

function shouldTrackFunction(functionName) {
  return typeof functionName === "string" && functionName.startsWith("ai-");
}

export const supabase = createClient(SUPABASE_URL || "", SUPABASE_ANON_KEY || "");

const originalInvoke = supabase.functions.invoke.bind(supabase.functions);

supabase.functions.invoke = async (functionName, options = {}) => {
  const shouldTrack = shouldTrackFunction(functionName);
  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  const response = await originalInvoke(functionName, options);

  if (shouldTrack) {
    const parsedResult = parseMaybeJson(response.data?.result);
    saveAiHistoryEntry({
      action: options?.body?.action || functionName,
      functionName,
      status: response.error || response.data?.error ? "error" : response.data?.warning ? "warning" : "success",
      durationMs: getDuration(startedAt),
      meta: response.data?.meta || null,
      summary: summarizeAiResult(parsedResult),
      error: response.error?.message || response.data?.error || response.data?.warning || null,
      metadata: {
        inputPreview: options?.body?.text || options?.body?.userPrompt || options?.body?.task?.title || options?.body?.note?.title || "",
      },
    });
  }

  return response;
};
