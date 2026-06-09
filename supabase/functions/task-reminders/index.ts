import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const APP_URL = Deno.env.get("APP_URL") ?? "https://tasks.zichmichal.cz";
const LOGO_PATH = "/icon.svg";

const PRIORITY_LABELS: Record<string, string> = {
  critical: "Kritická",
  high: "Vysoká",
  medium: "Střední",
  low: "Nízká",
};

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

function taskCard(task: Record<string, string>, projectName: string): string {
  const priority = task.priority ? PRIORITY_LABELS[task.priority] ?? task.priority : "Normální";
  const priorityTone = priorityColor(task.priority);
  return `
    <div style="background:#ffffff;border:1px solid #e8dcc5;border-left:4px solid #f59e0b;border-radius:18px;padding:16px 18px;margin:0 0 10px;box-shadow:0 12px 30px rgba(113,63,18,.07)">
      <div style="font-size:15px;line-height:1.4;font-weight:850;color:#111827;letter-spacing:-.015em">${escHtml(task.title || "Bez názvu")}</div>
      ${task.description ? `<div style="margin-top:6px;font-size:13px;line-height:1.5;color:#667085">${escHtml(task.description)}</div>` : ""}
      <div style="margin-top:12px">
        <span style="display:inline-block;margin:0 6px 6px 0;padding:5px 9px;border-radius:999px;background:#f8fafc;border:1px solid #e5eaf3;color:#475467;font-size:12px;font-weight:720">${escHtml(projectName || "Bez projektu")}</span>
        <span style="display:inline-block;margin:0 6px 6px 0;padding:5px 9px;border-radius:999px;background:#fffaeb;border:1px solid #fedf89;color:#b54708;font-size:12px;font-weight:800">${escHtml(formatDate(task.due_date))}</span>
        <span style="display:inline-block;margin:0 0 6px 0;padding:5px 9px;border-radius:999px;background:${priorityTone}12;border:1px solid ${priorityTone}30;color:${priorityTone};font-size:11px;font-weight:800">${escHtml(priority)}</span>
      </div>
    </div>`;
}

function reminderHeroCard(taskLabel: string, remindAt?: string): string {
  return `
    <div style="margin-top:24px;min-height:92px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.26);border-radius:20px;padding:15px 16px 14px;box-shadow:inset 0 1px 0 rgba(255,255,255,.18)">
      <div style="font-size:11px;line-height:1.2;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.88)">
        <span style="display:inline-block;width:8px;height:8px;border-radius:999px;background:#f59e0b;box-shadow:0 0 0 4px rgba(255,255,255,.16);vertical-align:1px;margin-right:7px"></span>Připomínka úkolu
      </div>
      <div style="display:block;margin-top:12px;color:#ffffff;font-size:40px;line-height:.9;font-weight:900;letter-spacing:-.07em">${escHtml(taskLabel.startsWith("1 ") ? "1" : taskLabel.replace(/\D+/g, "") || "1")}</div>
      <div style="display:block;margin-top:8px;color:rgba(255,255,255,.82);font-size:12px;font-weight:720">nastaveno na ${formatDateTime(remindAt)}</div>
    </div>`;
}

async function sendReminderEmail(to: string, tasks: Record<string, string>[], projectMap: Record<string, string>) {
  const now = new Date();
  const dateLabel = now.toLocaleString("cs-CZ", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

  const taskCards = tasks.map((t) => taskCard(t, projectMap[t.project_id] ?? "Bez projektu")).join("");
  const taskLabel = tasks.length === 1 ? "1 připomínaný úkol" : `${tasks.length} připomínaných úkolů`;
  const heroTitle = tasks.length === 1 ? "Připomínka úkolu" : "Připomínka úkolů";
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
  const appUrl = escHtml(APP_URL);
  const appHost = escHtml(APP_URL.replace(/^https?:\/\//, ""));
  const logoUrl = escHtml(new URL(LOGO_PATH, APP_URL).toString());

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#09090b;margin:0;padding:0;color:#111827">
<div style="display:none;max-height:0;overflow:hidden;color:transparent">${escHtml(taskLabel)} čeká na kontrolu.</div>
<div style="padding:28px 14px">
  <div style="max-width:700px;margin:0 auto">
    <div style="border-radius:28px;overflow:hidden;box-shadow:0 28px 80px rgba(0,0,0,.42)">
      <div style="background:radial-gradient(circle at 18% 0%,rgba(251,191,36,.34),transparent 30%),radial-gradient(circle at 92% 12%,rgba(168,85,247,.22),transparent 26%),linear-gradient(135deg,#111111 0%,#2a1c05 48%,#b7791f 100%);padding:30px 30px 28px;color:#ffffff">
        <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 25px">
          <tr>
            <td style="vertical-align:middle">
              <img src="${logoUrl}" width="36" height="36" alt="Zentero" style="display:inline-block;width:36px;height:36px;border-radius:14px;vertical-align:middle;margin-right:10px;background:rgba(17,24,39,.28);border:1px solid rgba(255,255,255,.22)">
              <span style="vertical-align:middle;font-size:14px;font-weight:850;letter-spacing:-.01em">Zentero</span>
            </td>
            <td style="text-align:right;vertical-align:middle">
              <span style="display:inline-block;padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.24);color:rgba(255,255,255,.92);font-size:12px;line-height:1;font-weight:750;white-space:nowrap">${dateLabel}</span>
            </td>
          </tr>
        </table>
        <div style="max-width:560px;font-size:30px;line-height:1.12;letter-spacing:-.045em;font-weight:900">${heroTitle}</div>
        <div style="max-width:555px;margin-top:11px;color:rgba(255,255,255,.86);font-size:15px;line-height:1.58">Tohle je připomínka, kterou sis nastavil u konkrétního úkolu.</div>

        ${reminderHeroCard(taskLabel, tasks[0]?.remind_at)}
      </div>

      <div style="background:#ffffff;border-left:1px solid #e8dcc5;border-right:1px solid #e8dcc5;padding:24px">
        <div style="margin:0 0 11px;font-size:12px;font-weight:850;color:#b54708;text-transform:uppercase;letter-spacing:.08em">
          <span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#f59e0b;box-shadow:0 0 0 4px rgba(245,158,11,.14);vertical-align:-1px;margin-right:8px"></span>${escHtml(tasks.length === 1 ? "Připomínaný úkol" : "Připomínané úkoly")}
          <span style="color:#98a2b3">/ ${tasks.length}</span>
        </div>
        ${taskCards}

        <div style="margin-top:24px;border-radius:22px;background:linear-gradient(135deg,#fffbeb,#fff7d6);border:1px solid #f2d69b;padding:19px">
          <div style="font-size:16px;line-height:1.35;font-weight:860;letter-spacing:-.02em;color:#111827">Otevřít připomínaný úkol</div>
          <div style="margin-top:5px;color:#667085;font-size:13px;line-height:1.5">Zkontroluj detail, změň termín nebo úkol rovnou dokonči.</div>
          <div style="margin-top:15px">
            <a href="${appUrl}" style="display:inline-block;background:linear-gradient(135deg,#8a5a08,#f2b84b);color:#ffffff;text-decoration:none;border-radius:15px;padding:13px 17px;font-size:14px;line-height:1;font-weight:850;box-shadow:0 13px 28px rgba(180,120,28,.25)">Otevřít úkoly</a>
          </div>
        </div>
      </div>

      <div style="background:#ffffff;border:1px solid #e8dcc5;border-top:0;border-radius:0 0 28px 28px;overflow:hidden">
        <div style="height:5px;background:linear-gradient(90deg,#f59e0b,#f2b84b,#22c55e)"></div>
        <div style="padding:20px 24px 22px;color:#667085;font-size:12px;line-height:1.55">
          <img src="${logoUrl}" width="30" height="30" alt="Zentero" style="display:inline-block;width:30px;height:30px;border-radius:11px;vertical-align:middle;margin-right:9px;background:#111827">
          <strong style="vertical-align:middle;color:#1f2937;font-size:13px">Zentero</strong>
          <div style="margin-top:10px">Automatická připomínka z aplikace Zentero. <a href="${appUrl}" style="color:#8a5a08;text-decoration:none">${appHost}</a></div>
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
      from: "Zentero <notifikace@tasks.zichmichal.cz>",
      to,
      subject: `Připomínka: ${tasks.length === 1 ? tasks[0].title : `${tasks.length} úkolů`} · Zentero`,
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
