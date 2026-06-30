import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  clampText,
  isPayloadTooLargeError,
  readJsonLimited,
} from "../_shared/validate.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JSON_HEADERS = { ...CORS, "Content-Type": "application/json" };
const SEVERITIES = new Set(["debug", "info", "warning", "error", "fatal"]);

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const json = JSON.stringify(value).slice(0, 2000);
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: JSON_HEADERS });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    console.warn("client-error-log unauthorized request:", { hasAuthError: Boolean(authErr), hasUser: Boolean(user) });
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: JSON_HEADERS },
    );
  }

  let body;
  try {
    body = await readJsonLimited(req);
  } catch (parseErr) {
    if (isPayloadTooLargeError(parseErr)) {
      return new Response(JSON.stringify({ error: "Payload too large" }), { status: 413, headers: JSON_HEADERS });
    }
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: JSON_HEADERS });
  }

  const severity = SEVERITIES.has(body?.severity) ? body.severity : "error";
  const message = clampText(body?.message, 1200).trim();
  if (!message) {
    return new Response(JSON.stringify({ error: "message is required" }), { status: 400, headers: JSON_HEADERS });
  }

  const payload = {
    user_id: user.id,
    severity,
    type: clampText(body?.type, 80) || "client_error",
    message,
    filename: clampText(body?.filename, 500) || null,
    lineno: numberOrNull(body?.lineno),
    colno: numberOrNull(body?.colno),
    stack: clampText(body?.stack, 6000) || null,
    url: clampText(body?.url, 1000) || null,
    user_agent: clampText(req.headers.get("user-agent"), 500) || null,
    app_version: clampText(body?.appVersion ?? body?.app_version, 80) || null,
    metadata: sanitizeMetadata(body?.metadata),
  };

  const { error } = await supabase.from("app_error_logs").insert(payload);
  if (error) {
    console.error("client-error-log insert failed:", error);
    return new Response(JSON.stringify({ error: "Failed to save error log" }), { status: 500, headers: JSON_HEADERS });
  }

  return new Response(JSON.stringify({ ok: true }), { headers: JSON_HEADERS });
});
