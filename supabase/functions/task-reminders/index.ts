import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
      <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0">
        <strong style="color:#1a1e2e;font-size:13px">${escHtml(task.title)}</strong>
        ${task.description ? `<br><span style="color:#6b7280;font-size:11px">${escHtml(task.description)}</span>` : ""}
      </td>
      <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:12px;white-space:nowrap">${escHtml(projectName)}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:12px;white-space:nowrap">${task.due_date ?? "—"}</td>
    </tr>`;
}

async function sendReminderEmail(to: string, tasks: Record<string, string>[], projectMap: Record<string, string>) {
  const now = new Date();
  const dateLabel = now.toLocaleString("cs-CZ", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

  const rows = tasks.map((t) => taskRow(t, projectMap[t.project_id] ?? "—")).join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f6fa;margin:0;padding:24px 16px">
<div style="max-width:600px;margin:0 auto">

  <div style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);border-radius:16px;padding:24px 28px;margin-bottom:24px;color:#fff">
    <div style="font-size:22px;font-weight:800;margin-bottom:4px">🔔 Připomínka úkolů</div>
    <div style="opacity:.85;font-size:14px">${dateLabel}</div>
  </div>

  <div style="background:#fff;border-radius:12px;border:1px solid #e5e7ec;overflow:hidden;margin-bottom:24px">
    <div style="padding:12px 14px;background:#f5f6fa;border-bottom:1px solid #e5e7ec">
      <span style="font-size:13px;font-weight:700;color:#374151">
        ${tasks.length === 1 ? "1 připomínaný úkol" : `${tasks.length} připomínané úkoly`}
      </span>
    </div>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#fafafa">
          <th style="padding:7px 14px;text-align:left;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em">Úkol</th>
          <th style="padding:7px 14px;text-align:left;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em">Projekt</th>
          <th style="padding:7px 14px;text-align:left;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em">Termín</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

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
      from: "Zontero <notifikace@tasks.zichmichal.cz>",
      to,
      subject: `🔔 Připomínka: ${tasks.length === 1 ? tasks[0].title : `${tasks.length} úkolů`} · Michal Tasks`,
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
    console.warn("task-reminders: unauthorized call from", req.headers.get("x-forwarded-for") ?? "unknown");
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

  // Seskup úkoly per uživatel a odešli
  const byUser: Record<string, typeof tasks> = {};
  for (const task of tasks) {
    if (!task.created_by || !emailMap[task.created_by]) continue;
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
    { headers: { "Content-Type": "application/json" } }
  );
});
