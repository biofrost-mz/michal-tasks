import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const PRIORITY_LABELS: Record<string, string> = {
  critical: "🔴 Kritická",
  high: "🟠 Vysoká",
  medium: "🟡 Střední",
  low: "🟢 Nízká",
};

function escHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function taskRow(task: Record<string, string>, projectName: string): string {
  return `
    <tr>
      <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0">
        <strong style="color:#1a1e2e;font-size:13px">${escHtml(task.title)}</strong>
        ${task.description ? `<br><span style="color:#6b7280;font-size:11px">${escHtml(task.description)}</span>` : ""}
      </td>
      <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:12px;white-space:nowrap">${escHtml(projectName)}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;font-size:12px;white-space:nowrap">${task.priority ? PRIORITY_LABELS[task.priority] ?? escHtml(task.priority) : "—"}</td>
    </tr>`;
}

function section(title: string, color: string, items: Record<string, string>[], projectMap: Record<string, string>): string {
  if (!items.length) return "";
  return `
    <div style="margin-bottom:28px">
      <h3 style="margin:0 0 10px;font-size:13px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:.06em">${title} &nbsp;<span style="background:${color}18;border-radius:6px;padding:2px 8px;font-size:12px">${items.length}</span></h3>
      <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e5e7ec">
        <thead>
          <tr style="background:#f5f6fa">
            <th style="padding:7px 12px;text-align:left;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em">Úkol</th>
            <th style="padding:7px 12px;text-align:left;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em">Projekt</th>
            <th style="padding:7px 12px;text-align:left;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em">Priorita</th>
          </tr>
        </thead>
        <tbody>${items.map((t) => taskRow(t, projectMap[t.project_id] ?? "—")).join("")}</tbody>
      </table>
    </div>`;
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

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f6fa;margin:0;padding:24px 16px">
<div style="max-width:600px;margin:0 auto">

  <div style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);border-radius:16px;padding:24px 28px;margin-bottom:24px;color:#fff">
    <div style="font-size:22px;font-weight:800;margin-bottom:4px">📋 Denní přehled úkolů</div>
    <div style="opacity:.85;font-size:14px">${dateLabel}</div>
  </div>

  <div style="display:flex;gap:10px;margin-bottom:24px;flex-wrap:wrap">
    ${overdue.length     ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 16px;color:#ef4444;font-weight:700;font-size:14px">🔴 ${overdue.length} prošlých</div>` : ""}
    ${dueToday.length    ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 16px;color:#d97706;font-weight:700;font-size:14px">🟡 ${dueToday.length} dnes</div>` : ""}
    ${dueTomorrow.length ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 16px;color:#3b82f6;font-weight:700;font-size:14px">🔵 ${dueTomorrow.length} zítra</div>` : ""}
  </div>

  ${section("🔴 Prošlé termíny", "#ef4444", overdue, projectMap)}
  ${section("🟡 Splatné dnes", "#d97706", dueToday, projectMap)}
  ${section("🔵 Splatné zítra", "#3b82f6", dueTomorrow, projectMap)}

  <div style="text-align:center;color:#9ca3af;font-size:12px;padding-top:16px;border-top:1px solid #e5e7ec">
    Michal Tasks &nbsp;·&nbsp; <a href="https://tasks.zichmichal.cz" style="color:#3b82f6;text-decoration:none">Otevřít aplikaci →</a>
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
      from: "Michal Tasks <onboarding@resend.dev>",
      to,
      subject: `📋 ${subjectParts} · Michal Tasks`,
      html,
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
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    console.warn("daily-reminders: unauthorized call from", req.headers.get("x-forwarded-for") ?? "unknown");
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
