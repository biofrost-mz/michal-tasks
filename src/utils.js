import { useEffect } from "react";
import { formatDate } from "./locale.js";
import DOMPurify from "dompurify";

// Sanitize HTML produced by markdown renderers before using dangerouslySetInnerHTML.
// Allows a safe subset of tags; strips event handlers and unsafe URIs.
export function sanitizeHtml(html) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "del", "code", "pre", "blockquote",
      "h1", "h2", "h3", "ul", "ol", "li", "a", "img",
      "hr", "div", "span", "table", "thead", "tbody", "tr", "th", "td",
    ],
    ALLOWED_ATTR: [
      "href", "target", "rel",       // links
      "src", "alt",                   // images
      "class", "style",              // styling (our own classes/inline)
      "data-lang", "data-noteid",    // our custom attributes
    ],
    ALLOW_DATA_ATTR: false,
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
    FORCE_BODY: false,
  });
}

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

export const PROJECT_COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444",
  "#06b6d4", "#ec4899", "#84cc16", "#6366f1", "#f97316",
];

let globalProjectsList = [];
export function setGlobalProjects(list) {
  globalProjectsList = list || [];
}

export function projectColor(projectId) {
  if (!projectId) return "#64748b";
  const gp = globalProjectsList.find((p) => p.id === projectId);
  if (gp && gp.color) return gp.color;
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
  return formatDate(ts);
}

export function renderMarkdown(md) {
  if (!md) return "";
  const lines = md.split("\n");
  let html = "";
  let inList = false;
  let listType = "ul";

  const escHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Escapování pro hodnotu HTML atributu (navíc uvozovky) — brání vylomení z
  // atributu (`alt`, `href`, `src`). Sanitizace DOMPurify běží až potom; tohle
  // je obrana u zdroje, aby se korektnost nespoléhala jen na ni.
  const escAttr = (s) => escHtml(String(s)).replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  const safeUrl = (url) => {
    try {
      const u = new URL(url, location.href);
      return /^https?:$/.test(u.protocol) ? url : "#";
    } catch {
      return url.startsWith("/") || url.startsWith("#") ? url : "#";
    }
  };

  const processInline = (s) => {
    // code blocks first to avoid processing their internals
    s = s.replace(/`([^`]+)`/g, '<code style="background:#1e293b22;padding:1px 5px;border-radius:4px;font-family:monospace;font-size:0.9em">$1</code>');
    s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => `<img src="${escAttr(safeUrl(url))}" alt="${escAttr(alt)}" style="max-width:100%;border-radius:8px;margin:6px 0;display:block">`);
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => `<a href="${escAttr(safeUrl(url))}" target="_blank" rel="noopener noreferrer" style="color:#3b82f6;text-decoration:underline">${escHtml(text)}</a>`);
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

// Particle micro-confetti burst animation for satisfying task completions
export function triggerConfettiBurst(e) {
  if (!e || !e.target) return;
  const rect = e.target.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7", "#ec4899"];
  const container = document.createElement("div");
  container.className = "confetti-container";
  container.style.position = "fixed";
  container.style.inset = "0";
  container.style.pointerEvents = "none";
  container.style.zIndex = "999999";
  document.body.appendChild(container);

  for (let i = 0; i < 20; i++) {
    const el = document.createElement("div");
    const size = Math.random() * 5 + 5; // size between 5px and 10px
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 55 + 20;
    const destX = Math.cos(angle) * distance;
    const destY = Math.sin(angle) * distance - (Math.random() * 25 + 5); // subtle gravity arc

    el.style.position = "absolute";
    el.style.left = `${centerX}px`;
    el.style.top = `${centerY}px`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.borderRadius = Math.random() > 0.45 ? "50%" : "2px";
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.transform = "translate(-50%, -50%) scale(1)";
    el.style.transition = "transform 0.55s cubic-bezier(0.12, 0.8, 0.32, 1), opacity 0.55s cubic-bezier(0.12, 0.8, 0.32, 1)";
    container.appendChild(el);

    // Force frame update to start transition
    requestAnimationFrame(() => {
      el.style.transform = `translate(calc(-50% + ${destX}px), calc(-50% + ${destY}px)) scale(0)`;
      el.style.opacity = "0";
    });
  }

  setTimeout(() => {
    container.remove();
  }, 650);
}
