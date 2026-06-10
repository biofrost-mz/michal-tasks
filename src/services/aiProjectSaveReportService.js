import { saveAiHistoryEntry } from "./aiHistoryService.js";

const REPORT_KEY = "zentero:ai_project_save_report_pending";
const REPORT_EXPIRE_MS = 10 * 60 * 1000;
const FINALIZE_DELAY_MS = 1600;
let finalizeTimer = null;

function now() {
  return Date.now();
}

function safeParse(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function safeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTitle(value) {
  return safeString(value).toLowerCase().replace(/\s+/g, " ");
}

function uniqueCount(values) {
  return new Set((values || []).filter(Boolean)).size;
}

function getStorage() {
  if (typeof localStorage === "undefined") return null;
  return localStorage;
}

function readPendingReport() {
  const storage = getStorage();
  if (!storage) return null;
  const report = safeParse(storage.getItem(REPORT_KEY), null);
  if (!report) return null;
  if (report.expiresAt && report.expiresAt < now()) {
    storage.removeItem(REPORT_KEY);
    return null;
  }
  return report;
}

function writePendingReport(report) {
  const storage = getStorage();
  if (!storage) return null;
  storage.setItem(REPORT_KEY, JSON.stringify(report));
  window.dispatchEvent(new CustomEvent("zentero:ai_project_save_report_updated", { detail: report }));
  return report;
}

function clearPendingReport() {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(REPORT_KEY);
  window.dispatchEvent(new CustomEvent("zentero:ai_project_save_report_updated", { detail: null }));
}

function getTaskTagsCount(task) {
  return Array.isArray(task?.tags) ? uniqueCount(task.tags.map((tag) => safeString(tag).toLowerCase())) : 0;
}

export function startAiProjectSaveReport(plan, meta = null) {
  const tasks = Array.isArray(plan?.tasks) ? plan.tasks : [];
  if (!tasks.length) return null;

  const report = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    expiresAt: now() + REPORT_EXPIRE_MS,
    projectName: safeString(plan?.projectName) || "AI projekt",
    plannedTasks: tasks.length,
    expectedTitles: tasks.map((task) => normalizeTitle(task?.title)).filter(Boolean),
    matchedTitles: {},
    taskIds: {},
    createdTasks: 0,
    projectLinked: 0,
    projectUnlinked: 0,
    tagAssignmentsExpected: tasks.reduce((sum, task) => sum + getTaskTagsCount(task), 0),
    tagAssignmentsSaved: 0,
    tagAssignmentsSkipped: 0,
    meta: meta || null,
    finalized: false,
  };

  return writePendingReport(report);
}

function updateReport(updater) {
  const current = readPendingReport();
  if (!current || current.finalized) return null;
  const next = updater({ ...current });
  if (!next) return null;
  return writePendingReport(next);
}

function findExpectedTitle(report, taskTitle) {
  const normalized = normalizeTitle(taskTitle);
  if (!normalized) return null;
  if (!report.expectedTitles.includes(normalized)) return null;
  const usedCount = report.matchedTitles?.[normalized] || 0;
  const totalCount = report.expectedTitles.filter((title) => title === normalized).length;
  if (usedCount >= totalCount) return null;
  return normalized;
}

function scheduleFinalize() {
  if (typeof window === "undefined") return;
  if (finalizeTimer) window.clearTimeout(finalizeTimer);
  finalizeTimer = window.setTimeout(finalizeAiProjectSaveReport, FINALIZE_DELAY_MS);
}

export function recordAiProjectTaskPersisted(task, result = {}) {
  const updated = updateReport((report) => {
    const matchedTitle = findExpectedTitle(report, task?.title);
    if (!matchedTitle || !task?.id) return report;

    report.matchedTitles = {
      ...(report.matchedTitles || {}),
      [matchedTitle]: (report.matchedTitles?.[matchedTitle] || 0) + 1,
    };
    report.taskIds = {
      ...(report.taskIds || {}),
      [task.id]: matchedTitle,
    };
    report.createdTasks += 1;
    if (result.projectLinked === false) report.projectUnlinked += 1;
    else report.projectLinked += 1;
    return report;
  });

  if (updated) scheduleFinalize();
  return updated;
}

export function recordAiProjectTaskTagsPersisted(taskId, tagIds = [], ok = true) {
  const updated = updateReport((report) => {
    if (!taskId || !report.taskIds?.[taskId]) return report;
    const count = uniqueCount(tagIds);
    if (ok) report.tagAssignmentsSaved += count;
    else report.tagAssignmentsSkipped += count;
    return report;
  });

  if (updated) scheduleFinalize();
  return updated;
}

export function buildAiProjectSaveReportSummary(report) {
  const createdTasks = report?.createdTasks || 0;
  const plannedTasks = report?.plannedTasks || 0;
  const savedTags = report?.tagAssignmentsSaved || 0;
  const expectedTags = report?.tagAssignmentsExpected || 0;
  const linkedTasks = report?.projectLinked || 0;
  const model = report?.meta?.model || "lokální fallback";
  const source = report?.meta?.source || "—";
  const allTasksCreated = createdTasks === plannedTasks;
  const allProjectLinked = linkedTasks === createdTasks && !report?.projectUnlinked;
  const allTagsSaved = expectedTags === 0 || savedTags >= expectedTags;
  const status = allTasksCreated && allProjectLinked && allTagsSaved ? "success" : "warning";

  return {
    status,
    title: status === "success" ? "AI projekt vytvořen" : "AI projekt vytvořen s upozorněním",
    lines: [
      `Úkoly: ${createdTasks}/${plannedTasks}`,
      `Tagy: ${savedTags}/${expectedTags}`,
      `Projektová vazba: ${linkedTasks}/${createdTasks}`,
      `Model: ${model}`,
      `Zdroj: ${source}`,
    ],
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showReportNotification(report) {
  if (typeof document === "undefined") return;
  const summary = buildAiProjectSaveReportSummary(report);
  const wrap = document.createElement("div");
  wrap.setAttribute("role", "status");
  wrap.style.cssText = [
    "position:fixed",
    "right:20px",
    "bottom:24px",
    "z-index:10080",
    "width:min(390px,calc(100vw - 32px))",
    "padding:16px 17px",
    "border-radius:18px",
    "border:1px solid var(--border-soft)",
    "background:color-mix(in srgb,var(--surface) 96%,transparent)",
    "box-shadow:0 22px 70px rgba(0,0,0,.32)",
    "backdrop-filter:blur(18px)",
    "-webkit-backdrop-filter:blur(18px)",
    "font-family:var(--font-ui)",
    "color:var(--text)",
  ].join(";");

  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:10px">
      <div>
        <div style="font-size:15px;font-weight:900">${escapeHtml(summary.title)}</div>
        <div style="font-size:12px;color:var(--text-3);margin-top:3px">${escapeHtml(report.projectName || "AI projekt")}</div>
      </div>
      <button type="button" aria-label="Zavřít" style="border:0;background:transparent;color:var(--text-3);font-size:20px;line-height:1;cursor:pointer">×</button>
    </div>
    <div style="display:grid;gap:6px">
      ${summary.lines.map((line) => `<div style="font-size:12.5px;color:var(--text-2)">${escapeHtml(line)}</div>`).join("")}
    </div>
  `;

  const close = () => wrap.remove();
  wrap.querySelector("button")?.addEventListener("click", close);
  document.body.appendChild(wrap);
  window.setTimeout(close, 9000);
}

export function finalizeAiProjectSaveReport() {
  const report = readPendingReport();
  if (!report || report.finalized || report.createdTasks === 0) return null;
  const finalReport = { ...report, finalized: true, finalizedAt: new Date().toISOString() };
  const summary = buildAiProjectSaveReportSummary(finalReport);

  saveAiHistoryEntry({
    action: "project_save_report",
    functionName: "local-ai-project-save-report",
    status: summary.status,
    durationMs: null,
    meta: finalReport.meta,
    summary: `${summary.lines[0]} · ${summary.lines[1]}`,
    error: summary.status === "warning" ? summary.lines.join(" · ") : null,
    metadata: {
      projectName: finalReport.projectName,
      report: finalReport,
    },
  });

  showReportNotification(finalReport);
  clearPendingReport();
  return finalReport;
}
