import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RECIPIENT = "mich.zich@gmail.com";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const PRIORITY_LABELS: Record<string, string> = {
  critical: "🔴 Kritická",
  high: "🟠 Vysoká",
  medium: "🟡 Střední",
  low: "🟢 Nízká",
};

function taskRow(task: Record<string, string>, projectName: string): string {
  return `
    <tr>
      <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0">
        <strong style="color:#1a1e2e;font-size:13px">${task.title}</strong>
        ${task.description ? `<br><span style="color:#6b7280;font-size:11px">${task.description}</span>` : ""}
      </td>
      <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:12px;white-space:nowrap">${projectName}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;font-size:12px;white-space:nowrap">${task.priority ? PRIORITY_LABELS[task.priority] ?? task.priority : "—"}</td>
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

Deno.serve(async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const tomorrow = new Date(today.getTime() + 86400000);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  // Fetch relevant tasks
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, title, description, due_date, priority, project_id, status")
    .neq("status", "done")
    .not("due_date", "is", null)
    .lte("due_date", tomorrowStr)
    .order("due_date", { ascending: true });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const overdue    = (tasks ?? []).filter((t) => t.due_date < todayStr);
  const dueToday   = (tasks ?? []).filter((t) => t.due_date === todayStr);
  const dueTomorrow = (tasks ?? []).filter((t) => t.due_date === tomorrowStr);

  if (!overdue.length && !dueToday.length && !dueTomorrow.length) {
    return new Response("No reminders — nothing to send", { status: 200 });
  }

  // Fetch project names
  const projectIds = [...new Set((tasks ?? []).map((t) => t.project_id).filter(Boolean))];
  const projectMap: Record<string, string> = {};
  if (projectIds.length) {
    const { data: projects } = await supabase.from("projects").select("id, name").in("id", projectIds);
    (projects ?? []).forEach((p) => { projectMap[p.id] = p.name; });
  }

  const dateLabel = today.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const subjectParts = [
    overdue.length    ? `${overdue.length} prošlých`  : "",
    dueToday.length   ? `${dueToday.length} dnes`     : "",
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
    ${overdue.length    ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 16px;color:#ef4444;font-weight:700;font-size:14px">🔴 ${overdue.length} prošlých</div>` : ""}
    ${dueToday.length   ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 16px;color:#d97706;font-weight:700;font-size:14px">🟡 ${dueToday.length} dnes</div>` : ""}
    ${dueTomorrow.length ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 16px;color:#3b82f6;font-weight:700;font-size:14px">🔵 ${dueTomorrow.length} zítra</div>` : ""}
  </div>

  ${section("🔴 Prošlé termíny", "#ef4444", overdue, projectMap)}
  ${section("🟡 Splatné dnes", "#d97706", dueToday, projectMap)}
  ${section("🔵 Splatné zítra", "#3b82f6", dueTomorrow, projectMap)}

  <div style="text-align:center;color:#9ca3af;font-size:12px;padding-top:16px;border-top:1px solid #e5e7ec">
    Michal Tasks &nbsp;·&nbsp; <a href="https://michal-tasks.vercel.app" style="color:#3b82f6;text-decoration:none">Otevřít aplikaci →</a>
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
      to: RECIPIENT,
      subject: `📋 ${subjectParts} · Michal Tasks`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return new Response(JSON.stringify({ error: err }), { status: 500 });
  }

  return new Response(
    JSON.stringify({ sent: true, overdue: overdue.length, today: dueToday.length, tomorrow: dueTomorrow.length }),
    { headers: { "Content-Type": "application/json" } }
  );
});
