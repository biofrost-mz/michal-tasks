import { useEffect } from "react";

// UUID v4 (for Supabase primary keys). Uses crypto.randomUUID when available.
export function uuid4() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Avoid timezone shifts for YYYY-MM-DD (from <input type="date">)
export function parseYMD(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0); // local midnight
}

export function startOfToday() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

const PROJECT_COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444",
  "#06b6d4", "#ec4899", "#84cc16", "#6366f1", "#f97316",
];

export function projectColor(projectId) {
  if (!projectId) return "#64748b";
  let h = 0;
  for (let i = 0; i < projectId.length; i++) h = (h * 31 + projectId.charCodeAt(i)) >>> 0;
  return PROJECT_COLORS[h % PROJECT_COLORS.length];
}

export function relTime(ts) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 2) return "právě teď";
  if (min < 60) return `${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hod`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "včera";
  if (day < 7) return `${day} d`;
  return new Date(ts).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" });
}

export function renderMarkdown(md) {
  if (!md) return "";
  const lines = md.split("\n");
  let html = "";
  let inList = false;
  let listType = "ul";

  const escHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const processInline = (s) => {
    // code blocks first to avoid processing their internals
    s = s.replace(/`([^`]+)`/g, '<code style="background:#1e293b22;padding:1px 5px;border-radius:4px;font-family:monospace;font-size:0.9em">$1</code>');
    s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:6px 0;display:block">');
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#3b82f6;text-decoration:underline">$1</a>');
    s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return s;
  };

  const closeList = () => {
    if (inList) {
      html += listType === "ul" ? "</ul>" : "</ol>";
      inList = false;
    }
  };

  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];

    // Fenced code block
    if (raw.trim().startsWith("```")) {
      closeList();
      const lang = raw.trim().slice(3).trim();
      void lang;
      i++;
      let code = "";
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code += escHtml(lines[i]) + "\n";
        i++;
      }
      html += `<pre style="background:#1e293b18;border-radius:8px;padding:12px 16px;overflow-x:auto;font-family:monospace;font-size:13px;line-height:1.6;margin:0 0 12px"><code>${code.trimEnd()}</code></pre>`;
      i++;
      continue;
    }

    const line = escHtml(raw);

    // Headings
    if (line.startsWith("### ")) {
      closeList();
      html += `<h3 style="font-size:16px;font-weight:700;margin:16px 0 6px;line-height:1.4">${processInline(line.slice(4))}</h3>`;
    } else if (line.startsWith("## ")) {
      closeList();
      html += `<h2 style="font-size:19px;font-weight:700;margin:20px 0 8px;line-height:1.4">${processInline(line.slice(3))}</h2>`;
    } else if (line.startsWith("# ")) {
      closeList();
      html += `<h1 style="font-size:24px;font-weight:800;margin:24px 0 10px;line-height:1.3">${processInline(line.slice(2))}</h1>`;
    // Horizontal rule
    } else if (line.trim() === "---") {
      closeList();
      html += `<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">`;
    // Checkbox list
    } else if (/^- \[x\] /i.test(raw)) {
      if (!inList || listType !== "ul") { closeList(); html += '<ul style="margin:0 0 8px;padding-left:24px;list-style:none">'; inList = true; listType = "ul"; }
      html += `<li style="margin:2px 0;display:flex;align-items:flex-start;gap:6px"><span style="color:#22c55e;flex-shrink:0">☑</span><span style="text-decoration:line-through;color:#94a3b8">${processInline(escHtml(raw.replace(/^- \[x\] /i, "")))}</span></li>`;
    } else if (/^- \[ \] /.test(raw)) {
      if (!inList || listType !== "ul") { closeList(); html += '<ul style="margin:0 0 8px;padding-left:24px;list-style:none">'; inList = true; listType = "ul"; }
      html += `<li style="margin:2px 0;display:flex;align-items:flex-start;gap:6px"><span style="color:#94a3b8;flex-shrink:0">☐</span><span>${processInline(escHtml(raw.replace(/^- \[ \] /, "")))}</span></li>`;
    // Unordered list
    } else if (/^- /.test(raw)) {
      if (!inList || listType !== "ul") { closeList(); html += '<ul style="margin:0 0 8px;padding-left:24px">'; inList = true; listType = "ul"; }
      html += `<li style="margin:2px 0;line-height:1.7">${processInline(escHtml(raw.slice(2)))}</li>`;
    // Ordered list
    } else if (/^\d+\. /.test(raw)) {
      if (!inList || listType !== "ol") { closeList(); html += '<ol style="margin:0 0 8px;padding-left:24px">'; inList = true; listType = "ol"; }
      html += `<li style="margin:2px 0;line-height:1.7">${processInline(escHtml(raw.replace(/^\d+\. /, "")))}</li>`;
    // Empty line
    } else if (line.trim() === "") {
      closeList();
      html += `<div style="height:8px"></div>`;
    // Regular paragraph
    } else {
      closeList();
      html += `<p style="margin:0 0 6px;line-height:1.8">${processInline(line)}</p>`;
    }

    i++;
  }

  closeList();
  return html;
}

// Debounced effect helper (saves)
export function useDebouncedEffect(effect, deps, delay = 350) {
  useEffect(() => {
    const id = setTimeout(() => effect(), delay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
