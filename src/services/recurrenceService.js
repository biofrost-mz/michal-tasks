import { parseYMD } from "../utils.js";

export const RECURRENCE_OPTIONS = ["daily", "weekly", "biweekly", "monthly"];
export const VALID_RECURRENCES = new Set(RECURRENCE_OPTIONS);

function formatLocalDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getBaseDate(dueDate, fallbackDate) {
  if (dueDate) {
    const parsed = parseYMD(dueDate);
    if (parsed && !Number.isNaN(parsed.getTime())) return new Date(parsed);
  }
  return new Date(fallbackDate);
}

export function shouldCreateRecurringTask(prevTask, nextTask, update) {
  return update?.status === "done"
    && prevTask?.status !== "done"
    && VALID_RECURRENCES.has(nextTask?.recurrence);
}

export function getNextRecurrenceDueDate(recurrence, dueDate, fallbackDate = new Date()) {
  if (!VALID_RECURRENCES.has(recurrence)) return null;

  const nextDate = getBaseDate(dueDate, fallbackDate);
  if (recurrence === "daily") nextDate.setDate(nextDate.getDate() + 1);
  if (recurrence === "weekly") nextDate.setDate(nextDate.getDate() + 7);
  if (recurrence === "biweekly") nextDate.setDate(nextDate.getDate() + 14);
  if (recurrence === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);

  return formatLocalDateKey(nextDate);
}
