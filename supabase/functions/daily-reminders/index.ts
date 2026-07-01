import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  heroBlock,
  section,
  intro,
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

const PRIORITY_LABELS: Record<string, string> = {
  critical: "Kritická",
  high: "Vysoká",
  medium: "Střední",
  low: "Nízká",
};

const APP_URL = Deno.env.get("APP_URL") ?? "https://tasks.zichmichal.cz";
const EMAIL_LOGO_URL = Deno.env.get("EMAIL_LOGO_URL") ?? `${APP_URL}/icon-zentero.png`;
const SECTION_LIMIT = 5;

function recipientUserId(t: Record<string, string>): string | null {
  return t.assignee_user_id || t.created_by || null;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "Bez termínu";
  return new Date(dateStr + "T00:00:00Z").toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
  });
}

function plUkol(n: number): string {
  return n === 1 ? "úkol" : n >= 2 && n <= 4 ? "úkoly" : "úkolů";
}
function plDni(n: number): string {
  return n === 1 ? "den" : n >= 2 && n <= 4 ? "dny" : "dní";
}

function prioChip(priority?: string): Chip | null {
  if (!priority) return null;
  const label = PRIORITY_LABELS[priority] ?? priority;
  const tone: ChipTone = priority === "critical" || priority === "high" ? "red" : priority === "low" ? "green" : "amber";
  return { text: label, tone };
}

function daysOverdue(due: string, todayStr: string): number {
  const diff = (new Date(todayStr + "T00:00:00Z").getTime() - new Date(due + "T00:00:00Z").getTime()) / 86400000;
  return Math.max(1, Math.round(diff));
}

function toRow(
  t: Record<string, string>,
  projectMap: Record<string, string>,
  workspaceMap: Record<string, string>,
  kind: "overdue" | "today" | "tomorrow",
  todayStr: string,
): TaskRow {
  const accent = kind === "overdue" ? "#ef4444" : kind === "today" ? "#f59e0b" : "#22c55e";
  const chips: Chip[] = [
    { text: workspaceMap[t.workspace_id] ?? "Workspace", tone: "neutral" },
    { text: projectMap[t.project_id] ?? "Bez projektu", tone: "neutral" },
  ];
  if (kind === "overdue") {
    const n = daysOverdue(t.due_date, todayStr);
    chips.push({ text: `${n} ${plDni(n)} po termínu`, tone: "red" });
  } else if (kind === "today") {
    chips.push({ text: "Dnes", tone: "amber" });
  } else {
    chips.push({ text: "Zítra", tone: "green" });
  }
  const p = prioChip(t.priority);
  if (p) chips.push(p);
  return {
    title: t.title || "Bez názvu",
    url: `${APP_URL}/?task=${t.id}`,
    desc: t.description || undefined,
    chips,
    accent,
  };
}

function buildSection(
  label: string,
  dotColor: string,
  pillTone: "red" | "amber" | "green",
  items: Record<string, string>[],
  kind: "overdue" | "today" | "tomorrow",
  projectMap: Record<string, string>,
  workspaceMap: Record<string, string>,
  todayStr: string,
): string {
  if (!items.length) return "";
  const rows = items.slice(0, SECTION_LIMIT).map((t) => toRow(t, projectMap, workspaceMap, kind, todayStr));
  const extra = items.length - SECTION_LIMIT;
  return section({
    label,
    dotColor,
    countPill: { text: String(items.length), tone: pillTone },
    tasks: rows,
    moreHref: extra > 0 ? APP_URL : undefined,
    moreText: extra > 0 ? `Zobrazit další ${extra} ${plUkol(extra)}` : undefined,
  });
}

function textTaskLines(
  title: string,
  tasks: Record<string, string>[],
  projectMap: Record<string, string>,
  workspaceMap: Record<string, string>,
  dueLabel: string,
): string {
  if (!tasks.length) return "";
  return [
    title,
    ...tasks.map((task) => {
      const workspace = workspaceMap[task.workspace_id] ?? "Workspace";
      const project = projectMap[task.project_id] ?? "Bez projektu";
      const priority = task.priority ? PRIORITY_LABELS[task.priority] ?? task.priority : "Normální";
      const date = dueLabel === "date" ? formatDate(task.due_date) : dueLabel;
      return `- ${task.title || "Bez názvu"} (${workspace}, ${project}, ${date}, ${priority})`;
    }),
    "",
  ].join("\n");
}

async function sendDailyEmail(
  to: string,
  tasks: Record<string, string>[],
  projectMap: Record<string, string>,
  workspaceMap: Record<string, string>,
  todayStr: string,
  tomorrowStr: string,
) {
  const today = new Date(todayStr + "T00:00:00Z");
  const overdue = tasks.filter((t) => t.due_date < todayStr);
  const dueToday = tasks.filter((t) => t.due_date === todayStr);
  const dueTomorrow = tasks.filter((t) => t.due_date === tomorrowStr);

  if (!overdue.length && !dueToday.length && !dueTomorrow.length) return false;

  const dateLabel = today.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const subjectParts = [
    overdue.length ? `${overdue.length} prošlých` : "",
    dueToday.length ? `${dueToday.length} dnes` : "",
    dueTomorrow.length ? `${dueTomorrow.length} zítra` : "",
  ].filter(Boolean).join(", ");

  const text = [
    `Denní přehled úkolů - ${dateLabel}`,
    "",
    subjectParts,
    "",
    textTaskLines("Prošlé termíny", overdue, projectMap, workspaceMap, "Po termínu"),
    textTaskLines("Splatné dnes", dueToday, projectMap, workspaceMap, "Dnes"),
    textTaskLines("Splatné zítra", dueTomorrow, projectMap, workspaceMap, "Zítra"),
    `Otevřít aplikaci: ${APP_URL}`,
  ].join("\n");

  const total = overdue.length + dueToday.length + dueTomorrow.length;
  const body =
    heroBlock({
      dateLabel,
      title: "Denní přehled úkolů",
      countBadge: `${total} ${plUkol(total)}`,
      subtitle: "Co už hoří, co je potřeba dnes a co se blíží v dalších dnech.",
      logoUrl: EMAIL_LOGO_URL,
      stats: [
        { label: "Po termínu", value: overdue.length, color: "#ef4444" },
        { label: "Dnes", value: dueToday.length, color: "#f59e0b" },
        { label: "Blíží se", value: dueTomorrow.length, color: "#22c55e" },
      ],
    }) +
    contentRow(
      intro("Ahoj, tady je stručný přehled úkolů, které potřebují pozornost — nejdřív po termínu, pak dnešní a blížící se.") +
        buildSection("Po termínu", "#ef4444", "red", overdue, "overdue", projectMap, workspaceMap, todayStr) +
        buildSection("Splatné dnes", "#f59e0b", "amber", dueToday, "today", projectMap, workspaceMap, todayStr) +
        buildSection("Blíží se termín", "#22c55e", "green", dueTomorrow, "tomorrow", projectMap, workspaceMap, todayStr) +
        ctaCard({
          title: "Chceš to rovnou odbavit?",
          text: "Otevři Zentero a projdi úkoly podle termínu, priority nebo projektu.",
          buttonText: "Otevřít aplikaci",
          url: APP_URL,
        }),
    ) +
    footer({
      note: "Automatický denní souhrn ze Zentero. Čas přehledu, projekty v e-mailu i typy upozornění upravíš v",
      settingsUrl: APP_URL,
      unsubscribeText: "Odhlásit denní přehled",
      unsubscribeUrl: APP_URL,
      host: APP_URL.replace(/^https?:\/\//, ""),
      logoUrl: EMAIL_LOGO_URL,
    });

  const html = emailShell({ preheader: `${subjectParts} čeká v dnešním plánu.`, title: "Denní přehled úkolů — Zentero", body });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Zentero <notifikace@tasks.zichmichal.cz>",
      to,
      subject: `${subjectParts} · Zentero`,
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
    console.warn("daily-reminders: unauthorized call", {
      ip: req.headers.get("x-forwarded-for") ?? "unknown",
      hasRuntimeCronSecret: Boolean(cronSecret),
      hasRequestCronSecret: Boolean(providedCronSecret),
      headerKeys: [...req.headers.keys()],
    });
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().slice(0, 10);

  // Fetch relevant tasks (all users, not done, due today or earlier or tomorrow)
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, title, description, due_date, priority, project_id, workspace_id, status, created_by, assignee_user_id")
    .neq("status", "done")
    .neq("status", "deleted")
    .not("due_date", "is", null)
    .not("created_by", "is", null)
    .lte("due_date", tomorrowStr)
    .order("due_date", { ascending: true });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  if (!tasks || tasks.length === 0) return new Response("No reminders — nothing to send", { status: 200 });

  // Fetch project names
  const projectIds = [...new Set(tasks.map((t) => t.project_id).filter(Boolean))];
  const projectMap: Record<string, string> = {};
  if (projectIds.length) {
    const { data: projects } = await supabase.from("projects").select("id, name").in("id", projectIds);
    (projects ?? []).forEach((p) => { projectMap[p.id] = p.name; });
  }

  // Fetch workspace names for cross-workspace digests
  const workspaceIds = [...new Set(tasks.map((t) => t.workspace_id).filter(Boolean))];
  const workspaceMap: Record<string, string> = {};
  if (workspaceIds.length) {
    const { data: workspaces } = await supabase.from("workspaces").select("id, name").in("id", workspaceIds);
    (workspaces ?? []).forEach((w) => { workspaceMap[w.id] = w.name; });
  }

  // Fetch user emails
  const userIds = [...new Set(tasks.map((t) => recipientUserId(t)).filter(Boolean))];
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, email")
    .in("id", userIds);
  const emailMap: Record<string, string> = {};
  (profiles ?? []).forEach((p) => { if (p.email) emailMap[p.id] = p.email; });

  // Fetch notification preferences
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("user_id, email_daily_digest")
    .in("user_id", userIds);
  const prefsMap: Record<string, boolean> = {};
  (prefs ?? []).forEach((p) => { prefsMap[p.user_id] = p.email_daily_digest; });

  // Group tasks per user and send
  const byUser: Record<string, typeof tasks> = {};
  for (const task of tasks) {
    const targetUserId = recipientUserId(task);
    if (!targetUserId || !emailMap[targetUserId]) continue;
    // Default: true (send if no preference record exists)
    if (prefsMap[targetUserId] === false) continue;
    if (!byUser[targetUserId]) byUser[targetUserId] = [];
    byUser[targetUserId].push(task);
  }

  let sent = 0;
  for (const [userId, userTasks] of Object.entries(byUser)) {
    const ok = await sendDailyEmail(emailMap[userId], userTasks, projectMap, workspaceMap, todayStr, tomorrowStr);
    if (ok) sent++;
  }

  return new Response(
    JSON.stringify({ sent_emails: sent, users: Object.keys(byUser).length }),
    { headers: { "Content-Type": "application/json" } },
  );
});
