import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function cors(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, content-type",
    },
  });
}

async function assertAdmin(req: Request): Promise<string | null> {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from("app_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  return data ? user.id : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" } });

  const adminId = await assertAdmin(req);
  if (!adminId) return cors({ error: "Forbidden" }, 403);

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  // ── LIST ─────────────────────────────────────────────────────────────────
  if (req.method === "GET" && !action) {
    const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (authErr) return cors({ error: authErr.message }, 500);

    const userIds = authUsers.users.map((u) => u.id);

    const [profilesRes, taskCountsRes, wsCountsRes] = await Promise.all([
      supabase.from("user_profiles").select("id, display_name, email, last_seen_at").in("id", userIds),
      supabase.from("tasks").select("created_by").in("created_by", userIds),
      supabase.from("workspace_members").select("user_id").in("user_id", userIds),
    ]);

    const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
    const taskCounts = new Map<string, number>();
    for (const t of taskCountsRes.data ?? []) {
      taskCounts.set(t.created_by, (taskCounts.get(t.created_by) ?? 0) + 1);
    }
    const wsCounts = new Map<string, number>();
    for (const w of wsCountsRes.data ?? []) {
      wsCounts.set(w.user_id, (wsCounts.get(w.user_id) ?? 0) + 1);
    }

    const users = authUsers.users.map((u) => {
      const profile = profileMap.get(u.id);
      return {
        id: u.id,
        email: u.email ?? profile?.email ?? "",
        display_name: profile?.display_name ?? null,
        created_at: u.created_at,
        last_seen_at: profile?.last_seen_at ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,
        task_count: taskCounts.get(u.id) ?? 0,
        workspace_count: wsCounts.get(u.id) ?? 0,
        is_banned: u.banned_until ? new Date(u.banned_until) > new Date() : false,
      };
    });

    return cors({ users });
  }

  // ── ACTIONS ──────────────────────────────────────────────────────────────
  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const effectiveAction = action || body.action;
    const targetId: string = body.user_id;
    if (!targetId) return cors({ error: "user_id required" }, 400);
    if (targetId === adminId) return cors({ error: "Cannot act on yourself" }, 400);

    if (effectiveAction === "disable") {
      const { error } = await supabase.auth.admin.updateUserById(targetId, {
        ban_duration: "87600h", // 10 years = effectively permanent
      });
      if (error) return cors({ error: error.message }, 500);
      return cors({ ok: true });
    }

    if (effectiveAction === "enable") {
      const { error } = await supabase.auth.admin.updateUserById(targetId, {
        ban_duration: "none",
      });
      if (error) return cors({ error: error.message }, 500);
      return cors({ ok: true });
    }

    if (effectiveAction === "delete") {
      const { error } = await supabase.auth.admin.deleteUser(targetId);
      if (error) return cors({ error: error.message }, 500);
      return cors({ ok: true });
    }

    if (effectiveAction === "add_to_workspace") {
      const { workspace_id, role = "member" } = body;
      if (!workspace_id) return cors({ error: "workspace_id required" }, 400);
      const { error } = await supabase.from("workspace_members").upsert(
        { user_id: targetId, workspace_id, role },
        { onConflict: "user_id,workspace_id" }
      );
      if (error) return cors({ error: error.message }, 500);
      return cors({ ok: true });
    }

    return cors({ error: `Unknown action: ${effectiveAction}` }, 400);
  }

  return cors({ error: "Method not allowed" }, 405);
});
