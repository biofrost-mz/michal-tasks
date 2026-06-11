import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  heroBlock,
  section,
  ctaCard,
  contentRow,
  footer,
  emailShell,
  type Chip,
  type ChipTone,
  type TaskRow,
} from "../_shared/email.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const APP_URL = Deno.env.get("APP_URL") ?? "https://tasks.zichmichal.cz";

const PRIORITY_LABELS: Record<string, string> = {
  critical: "Kritická",
  high: "Vysoká",
  medium: "Střední",
  low: "Nízká",
};

function formatDateTime(value?: string): string {
  if (!value) return "Bez termínu";
  return new Date(value).toLocaleString("cs-CZ", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value?: string): string {
  if (!value) return "Bez termínu";
  return new Date(value + "T00:00:00Z").toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
  });
}

function prioChip(priority?: string): Chip | null {
  if (!priority) return null;
  const label = PRIORITY_LABELS[priority] ?? priority;
  const tone: ChipTone = priority === "critical" || priority === "high" ? "red" : priority === "low" ? "green" : "amber";
  return { text: label, tone };
}

function toRow(t: Record<string, string>, projectMap: Record<string, string>): TaskRow {
  const chips: Chip[] = [{ text: projectMap[t.project_id] ?? "Bez projektu", tone: "neutral" }];
  if (t.due_date) chips.push({ text: `Termín: ${formatDate(t.due_date)}`, tone: "amber" });
  const p = prioChip(t.priority);
  if (p) chips.push(p);
  return {
    title: t.title || "Bez názvu",
    url: `${APP_URL}/?task=${t.id}`,
    desc: t.description || undefined,
    chips,
    accent: "#f59e0b",
    prominent: true,
  };
}

async function sendReminderEmail(to: string, tasks: Record<string, string>[], projectMap: Record<string, string>) {
  const now = new Date();
  const dateLabel = now.toLocaleString("cs-CZ", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

  const taskLabel = tasks.length === 1 ? "1 připomínaný úkol" : `${tasks.length} připomínaných úkolů`;
  const single = tasks.length === 1;

  const text = [
    `Připomínka úkolů - ${dateLabel}`,
    "",
    taskLabel,
    "",
    ...tasks.map((task) => {
      const project = projectMap[task.project_id] ?? "Bez projektu";
      const priority = task.priority ? PRIORITY_LABELS[task.priority] ?? task.priority : "Normální";
      return `- ${task.title || "Bez názvu"} (${project}, termín: ${formatDate(task.due_date)}, priorita: ${priority})`;
    }),
    "",
    `Otevřít aplikaci: ${APP_URL}`,
  ].join("\n");

  const body =
    heroBlock({
      dateLabel,
      title: single ? "Připomínka úkolu" : "Připomínka úkolů",
      subtitle: "Tuhle připomínku sis nastavil u konkrétního úkolu.",
      extraLine: `Nastaveno na ${formatDateTime(tasks[0]?.remind_at)}`,
    }) +
    contentRow(
      section({
        label: single ? "Připomínaný úkol" : "Připomínané úkoly",
        dotColor: "#f59e0b",
        countPill: { text: String(tasks.length), tone: "amber" },
        tasks: tasks.map((t) => toRow(t, projectMap)),
      }) +
        ctaCard({
          title: "Otevřít připomínaný úkol",
          text: "Zkontroluj detail, posuň termín, nebo úkol rovnou dokonči.",
          buttonText: "Otevřít úkol",
          url: single ? `${APP_URL}/?task=${tasks[0].id}` : APP_URL,
        }),
    ) +
    footer({
      note: "Automatická připomínka ze Zentero — chodí podle času, který sis nastavil u úkolu. Upravíš ji v",
      settingsUrl: APP_URL,
      host: APP_URL.replace(/^https?:\/\//, ""),
    });

  const html = emailShell({ preheader: `${taskLabel} čeká na kontrolu.`, title: "Připomínka úkolu — Zentero", body });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Zentero <notifikace@tasks.zichmichal.cz>",
      to,
      subject: `Připomínka: ${single ? tasks[0].title : `${tasks.length} úkolů`} · Zentero`,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Failed to send to ${to}:`, err);
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  // Only the internal scheduler may trigger this — verify shared secret.
  const cronSecret = Deno.env.get("CRON_SECRET");
  const providedCronSecret = req.headers.get("x-cron-secret");
  if (!cronSecret || providedCronSecret !== cronSecret) {
    console.warn("task-reminders: unauthorized call", {
      ip: req.headers.get("x-forwarded-for") ?? "unknown",
      hasRuntimeCronSecret: Boolean(cronSecret),
      runtimeCronSecretLength: cronSecret?.length ?? 0,
      runtimeCronSecretSuffix: cronSecret ? cronSecret.slice(-4) : null,
      hasRequestCronSecret: Boolean(providedCronSecret),
      requestCronSecretLength: providedCronSecret?.length ?? 0,
      requestCronSecretSuffix: providedCronSecret ? providedCronSecret.slice(-4) : null,
      headerKeys: [...req.headers.keys()],
    });
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Najdi úkoly s remind_at v uplynulé hodině (přeskočí dokončené)
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, title, description, due_date, priority, project_id, created_by, remind_at")
    .not("remind_at", "is", null)
    .neq("status", "done")
    .lte("remind_at", now.toISOString())
    .gte("remind_at", oneHourAgo.toISOString());

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  if (!tasks || tasks.length === 0) return new Response("No reminders due", { status: 200 });

  // Načti jména projektů
  const projectIds = [...new Set(tasks.map((t) => t.project_id).filter(Boolean))];
  const projectMap: Record<string, string> = {};
  if (projectIds.length) {
    const { data: projects } = await supabase.from("projects").select("id, name").in("id", projectIds);
    (projects ?? []).forEach((p) => { projectMap[p.id] = p.name; });
  }

  // Načti e-maily uživatelů
  const userIds = [...new Set(tasks.map((t) => t.created_by).filter(Boolean))];
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, email")
    .in("id", userIds);
  const emailMap: Record<string, string> = {};
  (profiles ?? []).forEach((p) => { if (p.email) emailMap[p.id] = p.email; });

  // Načti notifikační preference
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("user_id, email_task_reminders")
    .in("user_id", userIds);
  const prefsMap: Record<string, boolean> = {};
  (prefs ?? []).forEach((p) => { prefsMap[p.user_id] = p.email_task_reminders; });

  // Seskup úkoly per uživatel a odešli
  const byUser: Record<string, typeof tasks> = {};
  for (const task of tasks) {
    if (!task.created_by || !emailMap[task.created_by]) continue;
    // Výchozí hodnota: true (pokud záznam neexistuje, pošli)
    if (prefsMap[task.created_by] === false) continue;
    if (!byUser[task.created_by]) byUser[task.created_by] = [];
    byUser[task.created_by].push(task);
  }

  let sent = 0;
  const taskIdsToReset: string[] = [];

  for (const [userId, userTasks] of Object.entries(byUser)) {
    const email = emailMap[userId];
    const ok = await sendReminderEmail(email, userTasks, projectMap);
    if (ok) {
      sent++;
      taskIdsToReset.push(...userTasks.map((t) => t.id));
    }
  }

  // Vynuluj remind_at u odeslaných úkolů
  if (taskIdsToReset.length) {
    await supabase.from("tasks").update({ remind_at: null }).in("id", taskIdsToReset);
  }

  return new Response(
    JSON.stringify({ sent_emails: sent, reminded_tasks: taskIdsToReset.length }),
    { headers: { "Content-Type": "application/json" } },
  );
});
