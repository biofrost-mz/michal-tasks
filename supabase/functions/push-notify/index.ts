import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@tasks.zichmichal.cz";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function b64urlDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(s.length + (4 - s.length % 4) % 4, "=");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf instanceof Uint8Array ? buf.buffer : buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

// Deno's newer lib types `Uint8Array` as `Uint8Array<ArrayBufferLike>`, which TS
// no longer accepts where an ArrayBuffer-backed `BufferSource`/`BodyInit` is
// required (Web Crypto, fetch). These arrays are always ArrayBuffer-backed at
// runtime, so coerce to the concrete generic.
function bs(u: Uint8Array): Uint8Array<ArrayBuffer> {
  return u as Uint8Array<ArrayBuffer>;
}

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  const saltKey = await crypto.subtle.importKey("raw", bs(salt), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", saltKey, bs(ikm)));
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const prkKey = await crypto.subtle.importKey("raw", bs(prk), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const result = new Uint8Array(length);
  let t = new Uint8Array(0);
  let offset = 0;
  for (let i = 1; offset < length; i++) {
    const block = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, bs(concat(t, info, new Uint8Array([i])))));
    const take = Math.min(block.length, length - offset);
    result.set(block.slice(0, take), offset);
    t = block;
    offset += take;
  }
  return result;
}

async function makeVapidJwt(audience: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const enc = (obj: unknown) => b64urlEncode(new TextEncoder().encode(JSON.stringify(obj)));
  const header = enc({ typ: "JWT", alg: "ES256" });
  const payload = enc({ aud: audience, exp: now + 43200, sub: VAPID_SUBJECT });
  const sigInput = `${header}.${payload}`;
  const pubBytes = b64urlDecode(VAPID_PUBLIC_KEY);
  const jwk = {
    kty: "EC", crv: "P-256",
    x: b64urlEncode(pubBytes.slice(1, 33).buffer),
    y: b64urlEncode(pubBytes.slice(33, 65).buffer),
    d: VAPID_PRIVATE_KEY,
    ext: true,
  };
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(sigInput));
  return `${sigInput}.${b64urlEncode(sig)}`;
}

interface PushPayload {
  title: string;
  body: string;
  tag: string;
  data?: Record<string, string>;
}

async function sendPush(endpoint: string, p256dh: string, auth: string, payload: PushPayload): Promise<number> {
  const enc = new TextEncoder();
  const authBytes = b64urlDecode(auth);
  const subPubBytes = b64urlDecode(p256dh);

  const subscriberPubKey = await crypto.subtle.importKey(
    "raw", bs(subPubBytes), { name: "ECDH", namedCurve: "P-256" }, false, []
  );

  const ephemeral = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const ephPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", ephemeral.publicKey));

  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "ECDH", public: subscriberPubKey }, ephemeral.privateKey, 256
  ));

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // RFC 8291: IKM = HKDF-Expand(HKDF-Extract(auth, ecdh_secret), "WebPush: info\0" || ua_pub || as_pub, 32)
  const prkForIkm = await hkdfExtract(authBytes, ecdhSecret);
  const ikmInfo = concat(enc.encode("WebPush: info\0"), subPubBytes, ephPubRaw);
  const ikm = await hkdfExpand(prkForIkm, ikmInfo, 32);

  const prk2 = await hkdfExtract(salt, ikm);
  const cek = await hkdfExpand(prk2, concat(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])), 16);
  const nonce = await hkdfExpand(prk2, concat(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])), 12);

  const plaintext = enc.encode(JSON.stringify(payload));
  const padded = concat(plaintext, new Uint8Array([2])); // last-record delimiter

  const aesKey = await crypto.subtle.importKey("raw", bs(cek), { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: bs(nonce) }, aesKey, bs(padded)));

  // aes128gcm content header: salt(16) || rs_uint32be(4) || keyid_len(1) || keyid || ciphertext
  const rsBytes = new Uint8Array(4);
  new DataView(rsBytes.buffer).setUint32(0, 4096, false);
  const body = concat(salt, rsBytes, new Uint8Array([ephPubRaw.length]), ephPubRaw, ciphertext);

  const url = new URL(endpoint);
  const jwt = await makeVapidJwt(`${url.protocol}//${url.host}`);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      "TTL": "86400",
      "Urgency": "normal",
    },
    body: bs(body),
  });
  return res.status;
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const providedCronSecret = req.headers.get("x-cron-secret");
  if (!cronSecret || providedCronSecret !== cronSecret) {
    console.warn("push-notify: unauthorized call", {
      ip: req.headers.get("x-forwarded-for") ?? "unknown",
      hasRuntimeCronSecret: Boolean(cronSecret),
      hasRequestCronSecret: Boolean(providedCronSecret),
    });
    return new Response("Forbidden", { status: 403 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const windowStart = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const windowEnd = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const { data: remindTasks } = await supabase
    .from("tasks")
    .select("id, title, workspace_id")
    .gte("remind_at", windowStart)
    .lte("remind_at", windowEnd)
    .neq("status", "done")
    .neq("status", "deleted");

  const url = new URL(req.url);
  const isDailyRun = url.searchParams.get("daily") === "1";

  // Map workspace → notification payload (remind_at takes priority over daily digest)
  const wsNotif = new Map<string, PushPayload>();

  for (const task of remindTasks ?? []) {
    wsNotif.set(task.workspace_id, {
      title: "📌 Připomínka",
      body: task.title,
      tag: `remind-${task.id}`,
      data: { url: `/?task=${task.id}` },
    });
  }

  if (isDailyRun) {
    const { data: dueTasks } = await supabase
      .from("tasks")
      .select("workspace_id")
      .eq("due_date", today)
      .neq("status", "done")
      .neq("status", "deleted");

    const dueCounts = new Map<string, number>();
    for (const t of dueTasks ?? []) {
      dueCounts.set(t.workspace_id, (dueCounts.get(t.workspace_id) ?? 0) + 1);
    }
    for (const [wsId, count] of dueCounts) {
      if (!wsNotif.has(wsId)) {
        wsNotif.set(wsId, {
          title: "📋 Michal Tasks",
          body: count === 1 ? "1 úkol na dnes" : `${count} úkolů na dnes`,
          tag: "daily-digest",
        });
      }
    }
  }

  // Fetch push preferences for all subscribers
  const allSubUserIds = await (async () => {
    const allWsIds = [...wsNotif.keys()];
    if (!allWsIds.length) return [] as string[];
    const { data } = await supabase
      .from("push_subscriptions")
      .select("user_id")
      .in("workspace_id", allWsIds);
    return [...new Set((data ?? []).map((r: { user_id: string }) => r.user_id))];
  })();

  const { data: pushPrefs } = allSubUserIds.length
    ? await supabase
        .from("notification_preferences")
        .select("user_id, push_task_reminders, push_daily_digest")
        .in("user_id", allSubUserIds)
    : { data: [] };
  const pushPrefsMap = new Map(
    (pushPrefs ?? []).map((p: { user_id: string; push_task_reminders: boolean; push_daily_digest: boolean }) => [p.user_id, p])
  );

  let sent = 0;
  for (const [wsId, notifPayload] of wsNotif) {
    const isDaily = notifPayload.tag === "daily-digest";
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .eq("workspace_id", wsId);

    for (const sub of subs ?? []) {
      // Check preference — default true if no record
      const pref = pushPrefsMap.get(sub.user_id);
      if (pref) {
        if (isDaily && pref.push_daily_digest === false) continue;
        if (!isDaily && pref.push_task_reminders === false) continue;
      }
      try {
        const status = await sendPush(sub.endpoint, sub.p256dh, sub.auth, notifPayload);
        if (status === 200 || status === 201) sent++;
        if (status === 410 || status === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      } catch (err) {
        console.error("Push error:", err);
      }
    }
  }

  return new Response(JSON.stringify({ sent, workspaces: wsNotif.size }), {
    headers: { "Content-Type": "application/json" },
  });
});
