import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit: max 10 daily-plan generations per user per hour (heavy model call).
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

const STATUS_LABELS: Record<string, string> = {
  todo: "To do",
  doing: "Rozpracováno",
  waiting: "Čekám",
  done: "Hotovo",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "🔴 Vysoká",
  medium: "🟡 Střední",
  low: "🟢 Nízká",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Auth — vyber user z JWT
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Ověř JWT přes Supabase
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Parsuj tělo
  let workspaceId: string;
  try {
    const body = await req.json();
    workspaceId = body.workspaceId;
    if (!workspaceId) throw new Error("Missing workspaceId");
  } catch {
    return new Response(JSON.stringify({ error: "workspaceId required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Ověř, že user je členem workspace
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { count } = await db
    .from("workspace_members")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id);
  if (!count) {
    return new Response(JSON.stringify({ error: "Not a workspace member" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!checkRateLimit(user.id)) {
    return new Response(
      JSON.stringify({ error: `Rate limit exceeded — max ${RATE_LIMIT_MAX} daily plans per hour.` }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "3600" } }
    );
  }

  // Načti data
  const [{ data: tasks }, { data: projects }] = await Promise.all([
    db.from("tasks")
      .select("title, description, status, priority, due_date, project_id, starred")
      .eq("workspace_id", workspaceId)
      .neq("status", "done")
      .order("due_date", { ascending: true, nullsFirst: false }),
    db.from("projects")
      .select("id, name, status")
      .eq("workspace_id", workspaceId)
      .eq("status", "active"),
  ]);

  const projMap: Record<string, string> = {};
  (projects ?? []).forEach((p: { id: string; name: string }) => { projMap[p.id] = p.name; });

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const dateLabel = today.toLocaleString("cs-CZ", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // Sestav přehled úkolů pro prompt
  const taskList = (tasks ?? []).map((t: Record<string, string | boolean | null>) => {
    const proj = t.project_id ? projMap[t.project_id as string] : null;
    const dueDate = t.due_date as string | null;
    let dueMark = "";
    if (dueDate) {
      if (dueDate < todayStr) dueMark = " ⚠️ PROŠLÝ TERMÍN";
      else if (dueDate === todayStr) dueMark = " 📅 TERMÍN DNES";
      else dueMark = ` (termín ${dueDate})`;
    }
    const priority = t.priority ? PRIORITY_LABELS[t.priority as string] || "" : "";
    const status = STATUS_LABELS[t.status as string] || t.status;
    const star = t.starred ? " ⭐" : "";
    const projLabel = proj ? ` [${proj}]` : "";
    return `- ${t.title}${star}${projLabel} | ${status}${priority ? ` | ${priority}` : ""}${dueMark}`;
  }).join("\n");

  if (!taskList) {
    return new Response(
      JSON.stringify({ plan: "## ✨ Žádné aktivní úkoly\n\nNemáš žádné aktivní úkoly. Uži si volný čas nebo přidej nové!", generatedAt: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const systemPrompt = `Jsi osobní asistent produktivity. Odpovídáš vždy v češtině. Jsi přímý, motivující a konkrétní. Nepiš zbytečné fráze. Tvoje odpovědi jsou strukturované, přehledné a actionable.`;

  const userPrompt = `Dnes je ${dateLabel}.

Zde jsou moje aktivní úkoly:
${taskList}

Připrav mi stručný denní plán v češtině. Strukturuj odpověď takto:

## 🔥 Musí se dnes udělat
(max 3 položky — prošlé termíny, termín dnes, kritické věci)

## 🎯 Na čem se soustředit
(max 3 položky — vysoká priorita nebo rozpracované)

## 💡 Co je dobré posunout
(max 2 položky — menší věci nebo příští kroky)

## ✨ Dnešní záměr
(1-2 věty motivačního shrnutí dne — co je klíčové a proč)

Pokud některá kategorie nemá žádné úkoly, vynech ji. Buď konkrétní — uváděj skutečné názvy úkolů. Nepiš žádné zbytečné úvody ani závěry mimo stanovenou strukturu.`;

  // Zavolej Claude API
  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!claudeRes.ok) {
    const errText = await claudeRes.text();
    console.error("Claude API error:", errText);
    return new Response(
      JSON.stringify({ error: "AI není dostupné. Zkontroluj ANTHROPIC_API_KEY v Supabase secrets." }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const claudeData = await claudeRes.json();
  const plan = claudeData.content?.[0]?.text ?? "";

  return new Response(
    JSON.stringify({ plan, generatedAt: new Date().toISOString() }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
