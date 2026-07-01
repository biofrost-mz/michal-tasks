import { supabase } from "../supabase.js";

export const DEFAULT_NOTIFICATION_PREFS = {
  email_task_reminders: true,
  email_daily_digest: true,
  push_task_reminders: true,
  push_daily_digest: true,
  digest_hour: 8,
};

const ALLOWED_PREF_FIELDS = [
  "email_task_reminders",
  "email_daily_digest",
  "push_task_reminders",
  "push_daily_digest",
  "digest_hour",
];

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj ?? {}, key);
}

export function toNotificationPreferencesPayload(userId, prefs = {}) {
  const payload = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  ALLOWED_PREF_FIELDS.forEach((field) => {
    if (hasOwn(prefs, field)) payload[field] = prefs[field];
  });

  if (hasOwn(payload, "digest_hour")) {
    const hour = Number(payload.digest_hour);
    payload.digest_hour = Number.isFinite(hour) ? Math.min(23, Math.max(0, Math.round(hour))) : 8;
  }

  return payload;
}

export async function fetchNotificationPreferences(userId) {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return { ...DEFAULT_NOTIFICATION_PREFS, ...(data || {}) };
}

export async function saveNotificationPreferences(userId, prefs) {
  const { error } = await supabase
    .from("notification_preferences")
    .upsert(toNotificationPreferencesPayload(userId, prefs), { onConflict: "user_id" });

  if (error) throw error;
}
