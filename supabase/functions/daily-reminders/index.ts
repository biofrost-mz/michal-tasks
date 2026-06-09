import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
const LOGO_PATH = "/icon.svg";

function escHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function priorityColor(priority?: string): string {
  if (priority === "critical") return "#dc2626";
  if (priority === "high") return "#ea580c";
  if (priority === "low") return "#16a34a";
  return "#d97706";
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "Bez termínu";
  return new Date(dateStr + "T00:00:00Z").toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
  });
}

function metricCard(label: string, value: number, color: string, note: string): string {
  if (!value) return "";
  return `
    <td style="width:33.33%;padding:0 6px 0 0;vertical-align:top">
      <div style="min-height:92px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.26);border-radius:20px;padding:15px 15px 14px;box-shadow:inset 0 1px 0 rgba(255,255,255,.18)">
        <div style="font-size:11px;line-height:1.2;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.88)">
          <span style="display:inline-block;width:8px;height:8px;border-radius:999px;background:${color};box-shadow:0 0 0 4px rgba(255,255,255,.16);vertical-align:1px;margin-right:7px"></span>${label}
        </div>
        <div style="display:block;margin-top:12px;color:#ffffff;font-size:40px;line-height:.9;font-weight:900;letter-spacing:-.07em">${value}</div>
        <div style="display:block;margin-top:8px;color:rgba(255,255,255,.82);font-size:12px;font-weight:720">${note}</div>
      </div>
    </td>`;
}

function taskCard(task: Record<string, string>, projectName: string, dueLabel: string, tone: string): string {
  const priority = task.priority ? PRIORITY_LABELS[task.priority] ?? task.priority : "Normální";
  const priorityTone = priorityColor(task.priority);
  return `
    <div style="background:#ffffff;border:1px solid #e7eaf2;border-radius:18px;padding:16px 18px;margin:0 0 10px;box-shadow:0 12px 30px rgba(15,23,42,.055)">
      <div style="display:block">
        <div style="font-size:15px;line-height:1.4;font-weight:850;color:#111827">${escHtml(task.title || "Bez názvu")}</div>
        ${task.description ? `<div style="margin-top:6px;font-size:12px;line-height:1.55;color:#667085">${escHtml(task.description)}</div>` : ""}
      </div>
      <div style="margin-top:12px">
        <span style="display:inline-block;margin:0 6px 6px 0;padding:5px 9px;border-radius:999px;background:#f6f7fb;border:1px solid #e7eaf2;color:#4b5565;font-size:11px;font-weight:750">${escHtml(projectName || "Bez projektu")}</span>
        <span style="display:inline-block;margin:0 6px 6px 0;padding:5px 9px;border-radius:999px;background:${tone}14;border:1px solid ${tone}35;color:${tone};font-size:11px;font-weight:800">${escHtml(dueLabel)}</span>
        <span style="display:inline-block;margin:0 0 6px 0;padding:5px 9px;border-radius:999px;background:${priorityTone}12;border:1px solid ${priorityTone}30;color:${priorityTone};font-size:11px;font-weight:800">${escHtml(priority)}</span>
      </div>
    </div>`;
}

function section(title: string, color: string, items: Record<string, string>[], projectMap: Record<string, string>, dueLabel: string): string {
  if (!items.length) return "";
  return `
    <div style="margin:0 0 28px">
      <div style="margin:0 0 10px;font-size:12px;font-weight:850;color:${color};text-transform:uppercase;letter-spacing:.08em">${title} <span style="color:#98a2b3">/ ${items.length}</span></div>
      ${items.map((t) => taskCard(t, projectMap[t.project_id] ?? "Bez projektu", dueLabel === "date" ? formatDate(t.due_date) : dueLabel, color)).join("")}
    </div>`;
}

function textTaskLines(title: string, tasks: Record<string, string>[], projectMap: Record<string, string>, dueLabel: string): string {
  if (!tasks.length) return "";
  return [
    title,
    ...tasks.map((task) => {
      const project = projectMap[task.project_id] ?? "Bez projektu";
      const priority = task.priority ? PRIORITY_LABELS[task.priority] ?? task.priority : "Normální";
      const date = dueLabel === "date" ? formatDate(task.due_date) : dueLabel;
      return `- ${task.title || "Bez názvu"} (${project}, ${date}, ${priority})`;
    }),
    "",
  ].join("\n");
}

async function sendDailyEmail(
  to: string,
  tasks: Record<string, string>[],
  projectMap: Record<string, string>,
  todayStr: string,
  tomorrowStr: string,
) {
  const today = new Date(todayStr + "T00:00:00Z");
  const overdue     = tasks.filter((t) => t.due_date < todayStr);
  const dueToday    = tasks.filter((t) => t.due_date === todayStr);
  const dueTomorrow = tasks.filter((t) => t.due_date === tomorrowStr);

  if (!overdue.length && !dueToday.length && !dueTomorrow.length) return false;

  const dateLabel = today.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const subjectParts = [
    overdue.length     ? `${overdue.length} prošlých`  : "",
    dueToday.length    ? `${dueToday.length} dnes`     : "",
    dueTomorrow.length ? `${dueTomorrow.length} zítra` : "",
  ].filter(Boolean).join(", ");

  const text = [
    `Denní přehled úkolů - ${dateLabel}`,
    "",
    subjectParts,
    "",
    textTaskLines("Prošlé termíny", overdue, projectMap, "Po termínu"),
    textTaskLines("Splatné dnes", dueToday, projectMap, "Dnes"),
    textTaskLines("Splatné zítra", dueTomorrow, projectMap, "Zítra"),
    `Otevřít aplikaci: ${APP_URL}`,
  ].join("\n");
  const appUrl = escHtml(APP_URL);
  const appHost = escHtml(APP_URL.replace(/^https?:\/\//, ""));
  const logoUrl = escHtml(new URL(LOGO_PATH, APP_URL).toString());

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f5f0e5;margin:0;padding:0;color:#111827">
<div style="display:none;max-height:0;overflow:hidden;color:transparent">${escHtml(subjectParts)} čeká v dnešním plánu.</div>
<div style="padding:28px 14px">
  <div style="max-width:700px;margin:0 auto">
    <div style="border-radius:28px;overflow:hidden;box-shadow:0 24px 70px rgba(113,63,18,.16)">
      <div style="background:radial-gradient(circle at 18% 0%,rgba(255,255,255,.28),transparent 28%),radial-gradient(circle at 92% 12%,rgba(255,255,255,.18),transparent 24%),linear-gradient(135deg,#7c4a03 0%,#b7791f 48%,#f2b84b 100%);padding:30px 30px 28px;color:#ffffff">
        <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 25px">
          <tr>
            <td style="vertical-align:middle">
              <img src="${logoUrl}" width="36" height="36" alt="Zontero" style="display:inline-block;width:36px;height:36px;border-radius:14px;vertical-align:middle;margin-right:10px;background:rgba(17,24,39,.28);border:1px solid rgba(255,255,255,.22)">
              <span style="vertical-align:middle;font-size:14px;font-weight:850;letter-spacing:-.01em">Zontero</span>
            </td>
            <td style="text-align:right;vertical-align:middle">
              <span style="display:inline-block;padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.24);color:rgba(255,255,255,.92);font-size:12px;line-height:1;font-weight:750;white-space:nowrap">${dateLabel}</span>
            </td>
          </tr>
        </table>
        <div style="max-width:560px;font-size:30px;line-height:1.12;letter-spacing:-.045em;font-weight:900">Denní přehled úkolů</div>
        <div style="max-width:555px;margin-top:11px;color:rgba(255,255,255,.86);font-size:15px;line-height:1.58">Rychlý přehled toho, co hoří, co patří na dnešek a co se blíží.</div>
        <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:24px">
          <tr>
            ${metricCard("Po termínu", overdue.length, "#ef4444", "vyžaduje pozornost")}
            ${metricCard("Dnes", dueToday.length, "#f59e0b", "na dnešní plán")}
            ${metricCard("Blíží se", dueTomorrow.length, "#22c55e", "na přípravu")}
          </tr>
        </table>
      </div>

      <div style="background:#ffffff;border-left:1px solid #e8dcc5;border-right:1px solid #e8dcc5;padding:24px">
        ${section("Po termínu", "#dc2626", overdue, projectMap, "Po termínu")}
        ${section("Splatné dnes", "#d97706", dueToday, projectMap, "Dnes")}
        ${section("Blíží se", "#16a34a", dueTomorrow, projectMap, "Zítra")}

        <div style="margin-top:24px;border-radius:22px;background:linear-gradient(135deg,#fffbeb,#fff7d6);border:1px solid #f2d69b;padding:19px">
          <div style="font-size:16px;line-height:1.35;font-weight:860;letter-spacing:-.02em;color:#111827">Pokračuj přímo v aplikaci</div>
          <div style="margin-top:5px;color:#667085;font-size:13px;line-height:1.5">Otevři úkoly, doplň priority a odškrtni hotové věci.</div>
          <div style="margin-top:15px">
            <a href="${appUrl}" style="display:inline-block;background:linear-gradient(135deg,#8a5a08,#f2b84b);color:#ffffff;text-decoration:none;border-radius:15px;padding:13px 17px;font-size:14px;line-height:1;font-weight:850;box-shadow:0 13px 28px rgba(180,120,28,.25)">Otevřít úkoly</a>
          </div>
        </div>
      </div>

      <div style="background:#ffffff;border:1px solid #e8dcc5;border-top:0;border-radius:0 0 28px 28px;overflow:hidden">
        <div style="height:5px;background:linear-gradient(90deg,#ef4444,#f59e0b,#22c55e,#f2b84b)"></div>
        <div style="padding:20px 24px 22px;color:#667085;font-size:12px;line-height:1.55">
          <img src="${logoUrl}" width="30" height="30" alt="Zontero" style="display:inline-block;width:30px;height:30px;border-radius:11px;vertical-align:middle;margin-right:9px;background:#111827">
          <strong style="vertical-align:middle;color:#1f2937;font-size:13px">Zontero</strong>
          <div style="margin-top:10px">Automatický souhrn z aplikace Zontero. <a href="${appUrl}" style="color:#8a5a08;text-decoration:none">${appHost}</a></div>
        </div>
      </div>
    </div>
  </div>
</div>
</body></html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Zontero <notifikace@tasks.zichmichal.cz>",
      to,
      subject: `📋 ${subjectParts} · Michal Tasks`,
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
      runtimeCronSecretLength: cronSecret?.length ?? 0,
      runtimeCronSecretSuffix: cronSecret ? cronSecret.slice(-4) : null,
      hasRequestCronSecret: Boolean(providedCronSecret),
      requestCronSecretLength: providedCronSecret?.length ?? 0,
      requestCronSecretSuffix: providedCronSecret ? providedCronSecret.slice(-4) : null,
      headerKeys: [...req.headers.keys()],
    });
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayStr    = today.toISOString().slice(0, 10);
  const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().slice(0, 10);

  // Fetch relevant tasks (all users, not done, due today or earlier or tomorrow)
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, title, description, due_date, priority, project_id, status, created_by")
    .neq("status", "done")
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

  // Fetch user emails
  const userIds = [...new Set(tasks.map((t) => t.created_by).filter(Boolean))];
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, email")
    .in("id", userIds);
  const emailMap: Record<string, string> = {};
  (profiles ?? []).forEach((p) => { if (p.email) emailMap[p.id] = p.email; });

  // Group tasks per user and send
  const byUser: Record<string, typeof tasks> = {};
  for (const task of tasks) {
    if (!task.created_by || !emailMap[task.created_by]) continue;
    if (!byUser[task.created_by]) byUser[task.created_by] = [];
    byUser[task.created_by].push(task);
  }

  let sent = 0;
  for (const [userId, userTasks] of Object.entries(byUser)) {
    const ok = await sendDailyEmail(emailMap[userId], userTasks, projectMap, todayStr, tomorrowStr);
    if (ok) sent++;
  }

  return new Response(
    JSON.stringify({ sent_emails: sent, users: Object.keys(byUser).length }),
    { headers: { "Content-Type": "application/json" } },
  );
});
