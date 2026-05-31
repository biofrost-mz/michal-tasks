import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@zentero.app";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function b64urlDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(s.length + (4 - s.length % 4) % 4, "=");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf instanceof Uint8Array ? buf.buffer : buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function makeVapidJwt(audience: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const enc = (obj: unknown) => b64urlEncode(new TextEncoder().encode(JSON.stringify(obj)));
  const header = enc({ typ: "JWT", alg: "ES256" });
  const payload = enc({ aud: audience, exp: now + 43200, sub: VAPID_SUBJECT });
  const sigInput = `${header}.${payload}`;

  // Import private key via JWK (d = raw private, x+y from uncompressed public key)
  const pubBytes = b64urlDecode(VAPID_PUBLIC_KEY); // 65 bytes: 04 || x || y
  const jwk = {
    kty: "EC", crv: "P-256",
    x: b64urlEncode(pubBytes.slice(1, 33).buffer),
    y: b64urlEncode(pubBytes.slice(33, 65).buffer),
    d: VAPID_PRIVATE_KEY,
    ext: true,
  };
  const key = await crypto.subtle.importKey(
    "jwk", jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false, ["sign"],
  );
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(sigInput),
  );
  return `${sigInput}.${b64urlEncode(sig)}`;
}

async function sendEmptyPush(endpoint: string): Promise<number> {
  const url = new URL(endpoint);
  const jwt = await makeVapidJwt(`${url.protocol}//${url.host}`);
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
      "TTL": "86400",
      "Urgency": "normal",
    },
  });
  return res.status;
}

Deno.serve(async (req) => {
  // Authorization check — allow only service role or cron invocations
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.includes(SUPABASE_SERVICE_ROLE_KEY) && !authHeader.includes("Bearer")) {
    // Allow unauthenticated only from localhost / internal cron
    const host = req.headers.get("host") ?? "";
    if (!host.includes("localhost") && !host.includes("supabase")) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const windowStart = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const windowEnd = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // Tasks with remind_at in current ±5-minute window
  const { data: remindTasks } = await supabase
    .from("tasks")
    .select("workspace_id")
    .gte("remind_at", windowStart)
    .lte("remind_at", windowEnd)
    .neq("status", "done");

  // Tasks due today (for daily digest push)
  const url = new URL(req.url);
  const isDailyRun = url.searchParams.get("daily") === "1";
  const dueTodayWs: string[] = [];

  if (isDailyRun) {
    const { data: dueTasks } = await supabase
      .from("tasks")
      .select("workspace_id")
      .eq("due_date", today)
      .neq("status", "done");
    (dueTasks ?? []).forEach((t: { workspace_id: string }) => dueTodayWs.push(t.workspace_id));
  }

  const workspaceIds = [
    ...new Set([
      ...(remindTasks ?? []).map((t: { workspace_id: string }) => t.workspace_id),
      ...dueTodayWs,
    ]),
  ];

  let sent = 0;
  for (const wsId of workspaceIds) {
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint")
      .eq("workspace_id", wsId);

    for (const sub of subs ?? []) {
      try {
        const status = await sendEmptyPush(sub.endpoint);
        if (status === 200 || status === 201) sent++;
        if (status === 410 || status === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      } catch (_) { /* ignore */ }
    }
  }

  return new Response(JSON.stringify({ sent, workspaces: workspaceIds.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
