import React, { useState, useEffect, useRef, useCallback } from 'react'
import { SkeletonLine } from '../components/Skeleton.jsx'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { useConfirm } from '../components/Confirm.jsx'
import Icon from '../components/Icon.jsx'
import { NOTE_TEMPLATES, NOTE_STATUSES } from '../constants.js'
import { projectColor, relTime } from '../utils.js'
import { compareText, formatDate, formatDateTime } from '../locale.js'
import DOMPurify from 'dompurify'


const CURATED_TAG_COLORS = ["#38bdf8", "#34d399", "#fb7185", "#f472b6", "#fbbf24", "#a78bfa", "#c084fc", "#60a5fa", "#2dd4bf", "#fb923c"];
const getRandomTagColor = () => CURATED_TAG_COLORS[Math.floor(Math.random() * CURATED_TAG_COLORS.length)];
const BLOCKNOTE_VENDOR_CSS_ID = "blocknote-vendor-css";
let blockNoteStylesPromise = null;

function ensureBlockNoteStyles() {
  if (typeof document === "undefined" || document.getElementById(BLOCKNOTE_VENDOR_CSS_ID)) {
    return Promise.resolve();
  }

  if (!blockNoteStylesPromise) {
    blockNoteStylesPromise = Promise.all([
      import('@blocknote/core/fonts/inter.css?inline'),
      import('@blocknote/mantine/style.css?inline'),
    ]).then((styles) => {
      if (document.getElementById(BLOCKNOTE_VENDOR_CSS_ID)) return;
      const el = document.createElement("style");
      el.id = BLOCKNOTE_VENDOR_CSS_ID;
      el.textContent = styles.map((style) => style.default || "").join("\n");
      document.head.appendChild(el);
    });
  }

  return blockNoteStylesPromise;
}

function useBlockNoteStyles() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    ensureBlockNoteStyles().then(() => {
      if (active) setReady(true);
    });
    return () => { active = false; };
  }, []);

  return ready;
}

const getTagColor = (tagName, globalTags) => {
  if (!tagName || !globalTags) return null;
  const match = globalTags.find(gt => gt.name.trim().toLowerCase() === tagName.trim().toLowerCase());
  return match ? match.color : null;
};

/* ─── Note CSS injected once ─────────────────── */
const NOTE_CSS_ID = "note-editor-css";
function injectNoteCSS(dk) {
  let el = document.getElementById(NOTE_CSS_ID);
  if (!el) { el = document.createElement("style"); el.id = NOTE_CSS_ID; document.head.appendChild(el); }
  const text  = dk ? "#e8ecf4" : "#1a1e2e";
  const text2 = dk ? "#8b95a5" : "#6b7280";
  const text3 = dk ? "#5a6375" : "#9ca3af";
  const bdr   = dk ? "rgba(255,255,255,.08)" : "#e5e7ec";
  const codeBg= dk ? "#181b28" : "#f1f5f9";
  const bqBg  = dk ? "#1e2236" : "#f8fafc";
  const accent= dk ? "#e3a850" : "#d4923a";
  el.textContent = `
.note-ce { color: ${text}; font-size: 16px; line-height: 1.75; outline: none; min-height: 460px; }
.note-ce h1 { font-family:var(--font-ui); font-size: 2em; font-weight: 700; margin: 1.2em 0 .35em; letter-spacing: -.02em; }
.note-ce h2 { font-family:var(--font-ui); font-size: 1.35em; font-weight: 600; margin: 1.1em 0 .3em; letter-spacing: -.01em; color: ${text}; }
.note-ce h3 { font-family:var(--font-ui); font-size: 1.1em; font-weight: 600; margin: .9em 0 .25em; color: ${text2}; }
.note-ce p  { margin: 8px 0; }
.note-ce a  { color: ${accent}; text-decoration: underline; }
.note-ce strong { font-weight: 700; }
.note-ce em     { font-style: italic; }
.note-ce del, .note-ce s { text-decoration: line-through; color: ${text3}; }
.note-ce ul, .note-ce ol { padding-left: 1.6em; margin: .25em 0 .5em; }
.note-ce li { margin: .25em 0; line-height: 1.7; }
.note-ce blockquote { border-left: 3px solid ${accent}; margin: .8em 0; padding: .4em 0 .4em 1.2em; background: ${bqBg}; border-radius: 0 10px 10px 0; color: ${text2}; }
.note-ce blockquote p { margin: 0; }
.note-ce hr { border: none; border-top: 1px solid ${bdr}; margin: 1.4em 0; }
.note-ce code { font-family:'JetBrains Mono',monospace; font-size:.875em; background:${codeBg}; border-radius:4px; padding:1px 6px; color:${dk?"#f472b6":"#db2777"}; }
.note-ce pre { background:${codeBg}; border-radius:10px; padding:14px 18px; overflow-x:auto; margin:.7em 0 .9em; border:1px solid ${bdr}; }
.note-ce pre code { background:none; padding:0; color:${text}; font-size:13px; line-height:1.7; }
.note-ce img { max-width:100%; border-radius:8px; margin:.5em 0; display:block; }
.note-ce table { width:100%; border-collapse:collapse; margin:16px 0; font-size:14px; }
.note-ce th, .note-ce td { border:1px solid ${bdr}; padding:8px 12px; text-align:left; }
.note-ce th { background:${bqBg}; font-weight:700; color:${text2}; }
.note-ce .callout { display:flex; gap:12px; padding:13px 15px; border:1px solid ${accent}25; background:${accent}0e; border-radius:14px; margin:16px 0; }
.note-ce .callout-icon { font-size:18px; flex-shrink:0; line-height:1.6; }
.note-ce [data-type="todo"] { display:flex; gap:9px; align-items:flex-start; margin:6px 0; }
.note-ce [data-type="todo"] input[type="checkbox"] { margin-top:4px; accent-color:${accent}; transform:scale(1.1); cursor:pointer; flex-shrink:0; }
.note-ce [data-type="todo"].done span { text-decoration:line-through; color:${text3}; }
.note-ce:empty:before { content: attr(data-placeholder); color: ${text3}; pointer-events:none; }
.note-blocknote {
  min-height: 460px;
  color: ${text};
  --bn-colors-editor-text: ${text};
  --bn-colors-editor-background: transparent;
}
.note-blocknote .bn-container,
.note-blocknote .bn-editor {
  background: transparent;
  color: ${text};
  font-family: var(--font-body);
}
.note-blocknote .bn-editor {
  padding-inline: 0;
  min-height: 420px;
}
.note-blocknote .bn-block-content {
  font-size: 16px;
  line-height: 1.75;
}
.note-blocknote .bn-block-content a {
  color: ${accent};
}
.notes-workspace {
  width: 100%;
  height: 100%;
  min-height: 0;
  border-radius: 0;
  overflow: hidden;
  border: 0;
  background: var(--bg);
  display: grid;
  grid-template-columns: 318px minmax(0, 1fr) 360px;
  box-shadow: none;
}
.notes-workspace.no-props { grid-template-columns: 318px minmax(0, 1fr); }
.notes-workspace-panel {
  border-right: 1px solid var(--border-soft);
  min-height: 0;
  overflow: hidden;
}
.notes-editor-shell { min-width: 0; min-height: 0; display:flex; overflow:hidden; background: var(--bg); }
.notes-page-empty {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  background: var(--bg);
}
.notes-page-empty .notes-grid-shell {
  width: min(1180px, calc(100% - 56px));
  margin: 0 auto;
  padding: 28px 0 60px;
}
.notes-toolbar-wrap {
  position: sticky;
  top: 0;
  z-index: 6;
  padding: 10px 28px 0;
  background: linear-gradient(180deg, var(--bg) 0%, color-mix(in srgb, var(--bg) 92%, transparent) 70%, transparent 100%);
  pointer-events: none;
}
.notes-toolbar {
  display: flex;
  flex-direction: column;
  gap: 7px;
  width: min(100%, 860px);
  padding: 8px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg-2) 92%, transparent);
  box-shadow: var(--card-shadow);
  pointer-events: all;
}
.notes-toolbar-main,
.notes-toolbar-sub,
.notes-inline-bubble {
  display: flex;
  align-items: center;
  gap: 5px;
  overflow-x: auto;
  scrollbar-width: none;
}
.notes-toolbar-main::-webkit-scrollbar,
.notes-toolbar-sub::-webkit-scrollbar,
.notes-inline-bubble::-webkit-scrollbar { display:none; }
.notes-toolbar-sub {
  padding-top: 7px;
  border-top: 1px solid var(--border-soft);
}
.notes-quick-label {
  flex: 0 0 auto;
  color: var(--text-4);
  font-size: 10.5px;
  font-weight: 900;
  letter-spacing: .08em;
  text-transform: uppercase;
  padding: 0 4px;
}
.notes-quick-chip {
  height: 29px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--border-soft);
  background: rgba(255,255,255,.035);
  color: var(--text-2);
  font-size: 12px;
  font-weight: 800;
}
.notes-quick-chip:hover {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 32%, transparent);
  background: var(--accent-soft);
  transform: translateY(-1px);
}
.notes-inline-bubble {
  width: max-content;
  max-width: 100%;
  margin: 0 0 14px 86px;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: 15px;
  background: var(--bg-2);
  box-shadow: var(--card-shadow);
}
.notes-linked-panel,
.notes-state-panel {
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  background: var(--surface);
}
.notes-linked-panel { margin-top: 34px; padding: 16px; }
.notes-linked-grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:10px; }
.notes-linked-item {
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  padding: 12px;
  background: var(--bg-2);
}
.notes-meta-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  background: rgba(255,255,255,.025);
  margin: 0 0 24px;
}
.notes-meta-item {
  min-width: 0;
  padding: 9px 10px;
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  background: var(--bg-2);
}
.notes-meta-item small {
  display: block;
  margin-bottom: 4px;
  color: var(--text-4);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.notes-meta-item span {
  display: block;
  color: var(--text-2);
  font-size: 12.5px;
  font-weight: 800;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.notes-state-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 14px;
  margin-top: 18px;
  border-style: dashed;
}
.notes-state-card {
  min-height: 104px;
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  background: var(--bg-2);
  padding: 12px;
}
.notes-skeleton { display:grid; gap:7px; }
.notes-skeleton span {
  height: 10px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(148,163,184,.08), rgba(148,163,184,.20), rgba(148,163,184,.08));
  background-size: 200% 100%;
  animation: notes-shimmer 1.5s linear infinite;
}
.notes-skeleton span:nth-child(2) { width: 72%; }
.notes-skeleton span:nth-child(3) { width: 46%; }
@keyframes notes-shimmer { to { background-position: -200% 0; } }
@media (max-width: 1180px) {
  .notes-workspace,
  .notes-workspace.no-props { grid-template-columns: 248px minmax(0, 1fr); }
  .notes-props-desktop { display:none !important; }
}
@media (max-width: 860px) {
  .notes-workspace,
  .notes-workspace.no-props {
    width: 100%;
    height: 100%;
    max-height: none;
    border: 0;
    border-radius: 0;
    grid-template-columns: minmax(0, 1fr);
  }
  .notes-workspace-panel { display:none; }
  .notes-toolbar-wrap { padding: 8px 14px 0; }
  .notes-toolbar { width: 100%; }
  .notes-toolbar-sub { display:none; }
  .notes-inline-bubble { display:none; }
  .notes-meta-strip,
  .notes-linked-grid,
  .notes-state-panel { grid-template-columns: 1fr; }
}
@keyframes spin { to { transform: rotate(360deg); } }
  `;
}

/* ─── Markdown to HTML ─── */
function mdToHtml(md) {
  if (!md) return "";
  const esc = s => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const inline = s => {
    s = s.replace(/`([^`]+)`/g,'<code>$1</code>');
    s = s.replace(/\*\*\*([^*]+)\*\*\*/g,'<strong><em>$1</em></strong>');
    s = s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
    s = s.replace(/\*([^*\n]+)\*/g,'<em>$1</em>');
    s = s.replace(/~~([^~]+)~~/g,'<del>$1</del>');
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
    return s;
  };
  const lines = md.split("\n");
  let html = ""; let inUl = false; let inOl = false;
  const closeUl = () => { if (inUl) { html += "</ul>"; inUl = false; } };
  const closeOl = () => { if (inOl) { html += "</ol>"; inOl = false; } };
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (/^- \[x\] /i.test(raw)) { closeUl(); closeOl(); html += `<div data-type="todo" class="done"><input type="checkbox" checked><span>${inline(esc(raw.replace(/^- \[x\] /i,"")))}</span></div>`; continue; }
    if (/^- \[ \] /.test(raw))  { closeUl(); closeOl(); html += `<div data-type="todo"><input type="checkbox"><span>${inline(esc(raw.replace(/^- \[ \] /,"")))}</span></div>`; continue; }
    if (raw.trim().startsWith("```")) { closeUl(); closeOl(); i++; let code = ""; while (i < lines.length && !lines[i].trim().startsWith("```")) { code += esc(lines[i]) + "\n"; i++; } html += `<pre><code>${code.trimEnd()}</code></pre>`; continue; }
    const e = esc(raw);
    if (e.startsWith("# "))       { closeUl(); closeOl(); html += `<h1>${inline(esc(raw.slice(2)))}</h1>`; }
    else if (e.startsWith("## ")) { closeUl(); closeOl(); html += `<h2>${inline(esc(raw.slice(3)))}</h2>`; }
    else if (e.startsWith("### ")){ closeUl(); closeOl(); html += `<h3>${inline(esc(raw.slice(4)))}</h3>`; }
    else if (e.trim() === "---")  { closeUl(); closeOl(); html += "<hr>"; }
    else if (/^> /.test(raw))     { closeUl(); closeOl(); html += `<blockquote><p>${inline(esc(raw.slice(2)))}</p></blockquote>`; }
    else if (/^- /.test(raw))     { closeOl(); if (!inUl) { html += "<ul>"; inUl = true; } html += `<li>${inline(esc(raw.slice(2)))}</li>`; }
    else if (/^\d+\. /.test(raw)) { closeUl(); if (!inOl) { html += "<ol>"; inOl = true; } html += `<li>${inline(esc(raw.replace(/^\d+\. /,"")))}</li>`; }
    else if (e.trim() === "")     { closeUl(); closeOl(); html += "<p><br></p>"; }
    else                          { closeUl(); closeOl(); html += `<p>${inline(e)}</p>`; }
  }
  closeUl(); closeOl();
  return html;
}

function initEditorContent(content) {
  if (!content) return "";
  const html = /<[a-z]/i.test(content) ? content : mdToHtml(content);
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "del", "s", "code", "pre", "blockquote",
      "h1", "h2", "h3", "h4", "ul", "ol", "li", "a", "img", "hr", "div", "span",
      "table", "thead", "tbody", "tr", "th", "td", "input"
    ],
    ALLOWED_ATTR: [
      "href", "target", "rel", "src", "alt", "class", "style", "data-type", "data-noteid",
      "type", "checked", "colspan", "rowspan"
    ],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
  });
}

/* ─── Pin SVG icon ─────────────────────────── */
function PinIcon({ size = 14, filled = false, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
    </svg>
  );
}

/* ─── Module-level panel helpers (avoid remount on parent render) ─── */
function PRow({ t, label, children }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"90px 1fr", gap:10, alignItems:"flex-start", padding:"7px 0", borderBottom:`1px solid rgba(255,255,255,.055)`, fontSize:12 }}>
      <div style={{ color:t.text3, fontWeight:700, paddingTop:2 }}>{label}</div>
      <div style={{ color:t.text2 }}>{children}</div>
    </div>
  );
}

function PropCard({ t, title: ctitle, children, noPad }) {
  return (
    <div style={{ border:"1px solid var(--border-soft)", borderRadius:14, background:"var(--surface)", padding:noPad?"0":"12px", marginBottom:10 }}>
      {ctitle && <div style={{ fontSize:12, fontWeight:750, color:t.text, marginBottom:8, padding:noPad?"12px 12px 0":"0" }}>{ctitle}</div>}
      {children}
    </div>
  );
}

function MiniItem({ t, left, right, onClick }) {
  return (
    <div onClick={onClick} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, padding:"8px 10px", borderRadius:10, background:"var(--bg-2)", border:"1px solid var(--border-soft)", fontSize:12, color:t.text2, cursor:onClick?"pointer":"default", transition:"background .1s" }}
      onMouseEnter={e=>{ if(onClick) e.currentTarget.style.background="var(--surface-2)"; }}
      onMouseLeave={e=>{ e.currentTarget.style.background="var(--bg-2)"; }}
    >
      <span style={{ display:"flex", alignItems:"center", gap:6 }}>{left}</span>
      <span style={{ color:t.text3, fontSize:11, flexShrink:0 }}>{right}</span>
    </div>
  );
}

/* ─── TemplatePickerModal ───────────────────── */
function TemplatePickerModal({ onSelect, onClose }) {
  const { t } = useApp();
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:400, background:"#0007", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"var(--surface)", border:"1px solid var(--border-soft)", borderRadius:16, padding:28, maxWidth:560, width:"calc(100% - 32px)", maxHeight:"88vh", overflowY:"auto", boxShadow:t.shadow }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:28, fontWeight:700, fontFamily:"var(--font-ui)", marginBottom:4, lineHeight:1 }}>Nová poznámka</div>
            <div style={{ fontSize:12, color:t.text3 }}>Vyber šablonu nebo začni prázdnou stránkou</div>
          </div>
          <button onClick={onClose} style={{ background:"var(--bg-2)", border:"1px solid var(--border-soft)", borderRadius:8, padding:6, cursor:"pointer", display:"flex" }}>
            <Icon name="x" size={16} color={t.text3} strokeWidth={2} />
          </button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10 }}>
          {NOTE_TEMPLATES.map(tpl => (
            <button key={tpl.id} onClick={()=>onSelect(tpl)} style={{
              display:"flex", flexDirection:"column", alignItems:"flex-start", gap:8,
              padding:16, borderRadius:10, border:"1px solid var(--border-soft)",
              background:"var(--bg-2)", color:t.text, cursor:"pointer", textAlign:"left", transition:"all .12s",
            }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--accent-2)"; e.currentTarget.style.background="var(--accent-soft)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border-soft)"; e.currentTarget.style.background="var(--bg-2)";}}
            >
              <div style={{ width:32, height:32, borderRadius:8, background:t.accentBg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon name={tpl.icon} size={16} color={t.accent} strokeWidth={1.8} />
              </div>
              <div style={{ fontSize:13, fontWeight:700 }}>{tpl.label}</div>
              <div style={{ fontSize:12, color:t.text3, lineHeight:1.5 }}>{tpl.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── AI Panel actions ──────────────────────── */
const NOTE_AI_ACTIONS = [
  { id:"note_summary",        icon:"align-left",   label:"Shrnutí" },
  { id:"note_summary_bullet", icon:"list",         label:"Do odrážek" },
  { id:"note_fix_tone",       icon:"check",        label:"Gramatika a tón" },
  { id:"note_continue",       icon:"edit-2",       label:"Pokračovat" },
  { id:"note_extract_tasks",  icon:"check-square", label:"Úkoly" },
];

const NOTE_AI_MOCK_ACTIONS = [
  "Shrnout poznámku",
  "Vytáhnout úkoly",
  "Navrhnout hooky",
  "Zkontrolovat tón",
  "Přepsat jako LinkedIn post",
  "Zkrátit",
  "Vytvořit checklist",
  "Navrhnout štítky",
];

const NOTE_PRIORITIES = {
  low: "Nízká",
  medium: "Normální",
  high: "Vysoká",
};

function stripHtmlText(value = "") {
  if (!value) return "";
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function blockContentText(content) {
  if (!Array.isArray(content)) return "";
  return content.map(item => {
    if (typeof item === "string") return item;
    if (item?.type === "text") return item.text || "";
    if (Array.isArray(item?.content)) return blockContentText(item.content);
    return "";
  }).join("");
}

function blocksToPlainText(blocks = []) {
  return blocks
    .map(block => [blockContentText(block.content), blocksToPlainText(block.children || [])].filter(Boolean).join("\n"))
    .filter(Boolean)
    .join("\n");
}

function noteTemplateLabel(note) {
  const content = `${note.title || ""} ${stripHtmlText(note.content || "")}`.toLowerCase();
  if (content.includes("linkedin")) return "LinkedIn post";
  if (content.includes("meeting")) return "Meeting notes";
  if (content.includes("bug")) return "Bug report";
  if (content.includes("checklist")) return "Checklist";
  if (content.includes("rozhodnutí") || content.includes("decision")) return "Rozhodnutí";
  return "Prázdná poznámka";
}

function notePriority(note) {
  if (note.priority) return note.priority; // ručně nastavená priorita má přednost
  if (note.tags?.some(tag => tag.toLowerCase().includes("urgent") || tag.toLowerCase().includes("high"))) return "high";
  if (note.status === "idea" || note.status === "inbox") return "low";
  return "medium";
}

const PRIORITY_COLORS = { low: "#22c55e", medium: "#f59e0b", high: "#ef4444" };

function linkedItemsForNote(note, projects, tasks) {
  const items = [];
  const seen = new Set();
  const add = (type, id, title, meta) => {
    if (!id || seen.has(`${type}:${id}`)) return;
    seen.add(`${type}:${id}`);
    items.push({ type, id, title, meta });
  };
  const projectIds = [note.primaryProjectId, ...(note.extraProjectIds || [])].filter(Boolean);
  const taskIds = [note.primaryTaskId, ...(note.extraTaskIds || [])].filter(Boolean);
  projectIds.forEach(id => {
    const project = projects.find(p => p.id === id);
    if (project) add("project", id, project.name, "Projekt");
  });
  taskIds.forEach(id => {
    const task = tasks.find(tk => tk.id === id);
    if (task) add("task", id, task.title || "Bez názvu", "Úkol");
  });
  return items;
}

/* ─── NoteEditor ────────────────────────────── */
function NoteEditor({ note, onSave, t, dk, isMobile, showProps, onToggleProps, onDelete, onTogglePin, projects, tasks, addTask }) {
  const { tags: globalTags } = useApp();
  const blockNoteStylesReady = useBlockNoteStyles();
  const editor = useCreateBlockNote();
  const titleRef = useRef(null);
  const saveTimer = useRef(null);
  const loadingNoteRef = useRef(false);
  const latestContentRef = useRef(initEditorContent(note.content));

  const [title, setTitle] = useState(note.title);
  const [saveState, setSaveState] = useState("idle");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiAction, setAiAction] = useState(null);
  const [aiLoading, setAiLoading] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [statusMenu, setStatusMenu] = useState(false);

  const serializeEditor = useCallback(() => {
    const html = editor.blocksToHTMLLossy(editor.document);
    return initEditorContent(html || "");
  }, [editor]);

  const triggerSave = useCallback((data) => {
    setSaveState("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await onSave({ ...data, content: initEditorContent(data.content || "") });
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
      } catch {
        setSaveState("idle");
      }
    }, 700);
  }, [onSave]);

  useEffect(() => {
    loadingNoteRef.current = true;
    setTitle(note.title);
    if (titleRef.current) titleRef.current.value = note.title;
    latestContentRef.current = initEditorContent(note.content);
    const blocks = editor.tryParseHTMLToBlocks(latestContentRef.current || "<p></p>");
    editor.replaceBlocks(editor.document, blocks.length ? blocks : [{ type: "paragraph", content: "" }]);
    window.setTimeout(() => {
      loadingNoteRef.current = false;
    }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, note.id]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const handleTitleChange = (e) => {
    const nextTitle = e.target.value;
    setTitle(nextTitle);
    triggerSave({ title: nextTitle, content: latestContentRef.current });
  };

  const handleEditorChange = useCallback(() => {
    if (loadingNoteRef.current) return;
    const content = serializeEditor();
    latestContentRef.current = content;
    triggerSave({ title: titleRef.current?.value || title, content });
  }, [serializeEditor, title, triggerSave]);

  const getEditorText = useCallback(() => {
    const text = blocksToPlainText(editor.document).trim();
    return text || stripHtmlText(latestContentRef.current || note.content || "");
  }, [editor, note.content]);

  const appendParagraphs = useCallback((text) => {
    const blocks = String(text)
      .split(/\n+/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => ({ type: "paragraph", content: line }));
    if (!blocks.length) return;
    const reference = editor.document[editor.document.length - 1];
    editor.insertBlocks(blocks, reference, "after");
    editor.focus();
  }, [editor]);

  const runAI = async (action) => {
    setAiLoading(action);
    setAiResult(null);
    setAiAction(action);
    window.setTimeout(() => {
      const text = getEditorText();
      if (action === "note_extract_tasks") {
        const lines = text.split("\n").map(line => line.replace(/^[-\d. [\]x]+/i, "").trim()).filter(Boolean);
        setAiResult((lines.length ? lines : ["Doplnit hlavní myšlenku", "Připravit finální verzi"]).slice(0, 5));
      } else if (action === "note_fix_tone") {
        setAiResult("Mock návrh: tón působí věcně. Zkrať první odstavec, přidej konkrétní příklad a závěrečné CTA.");
      } else if (action === "note_continue") {
        setAiResult("Mock pokračování: doplň krátký příklad z praxe, vysvětli proč na tom záleží a zakonči jednou jasnou otázkou.");
      } else {
        setAiResult(`Mock AI výstup pro akci „${NOTE_AI_ACTIONS.find(a => a.id === action)?.label || action}“. Reálný backend je záměrně vypnutý, UI je připravené pro pozdější napojení.`);
      }
      setAiLoading(null);
    }, 550);
  };

  const applyAI = () => {
    if (typeof aiResult === "string" && aiResult.trim()) {
      appendParagraphs(aiResult);
    } else if (aiAction === "note_extract_tasks" && Array.isArray(aiResult)) {
      aiResult.forEach(text => { if (typeof text === "string" && text.trim()) addTask({ title: text.trim() }); });
    }
    setAiResult(null);
    setAiAction(null);
  };

  const statusInfo = NOTE_STATUSES[note.status] ?? NOTE_STATUSES.draft;
  const linkedProject = note.primaryProjectId ? projects.find(p => p.id === note.primaryProjectId) : null;
  const linkedTask = note.primaryTaskId ? tasks.find(tk => tk.id === note.primaryTaskId) : null;
  const linkedItems = linkedItemsForNote(note, projects, tasks);
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden", position:"relative" }}>
      {/* Topbar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:`1px solid ${t.border}`, padding:"0 20px", height:54, flexShrink:0, background:t.bg2 }}>
        <div style={{ display:"flex", alignItems:"center", gap:7, fontSize:13, color:t.text3, minWidth:0 }}>
          {isMobile && (
            <button onClick={() => window.dispatchEvent(new CustomEvent("notes:open-list"))} style={{ display:"flex", alignItems:"center", justifyContent:"center", width:30, height:30, borderRadius:9, border:`1px solid ${t.border}`, background:"transparent", color:t.text3, cursor:"pointer" }} aria-label="Otevřít seznam poznámek">
              <Icon name="menu" size={14} color="currentColor" strokeWidth={2} />
            </button>
          )}
          <span>Poznámky</span>
          <span style={{ opacity:.5 }}>›</span>
          <span style={{ color:t.text, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{note.title || "Bez názvu"}</span>
          <span style={{ width:7, height:7, borderRadius:"50%", background:saveState === "saving" ? "#f59e0b" : "#22c55e", boxShadow:"0 0 12px rgba(34,197,94,.5)", flexShrink:0 }} />
          {!isMobile && <span style={{ color:t.text3 }}>{saveState === "saving" ? "Ukládám…" : saveState === "saved" ? "Uloženo" : "Uloženo před 12 s"}</span>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
          {saveState === "saving" && (
            <span style={{ fontSize:11, color:t.text3, display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ animation:"spin .7s linear infinite", display:"inline-block" }}>◌</span> Ukládám
            </span>
          )}
          {saveState === "saved" && (
            <span style={{ fontSize:11, color:"#22c55e", display:"flex", alignItems:"center", gap:4 }}>
              <Icon name="check" size={11} color="#22c55e" strokeWidth={2.5} /> Uloženo
            </span>
          )}
          <button onClick={()=>setAiOpen(v=>!v)} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:8, border:`1px solid ${aiOpen ? t.accent+"60" : t.border}`, background:aiOpen ? `${t.accent}18` : "rgba(245,158,11,.1)", color:"#fde68a", fontSize:12, fontWeight:700, cursor:"pointer" }}>
            ✨ AI
          </button>
          {!isMobile && (
            <>
              <button style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:8, border:`1px solid ${t.border}`, background:"transparent", color:t.text3, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                Sdílet
              </button>
              <button onClick={() => window.dispatchEvent(new CustomEvent("notes:export-md"))} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:8, border:`1px solid ${t.border}`, background:"transparent", color:t.text3, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                Export
              </button>
            </>
          )}
          <button onClick={onTogglePin} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:8, border:`1px solid ${note.pinned ? "#f59e0b" : t.border}`, background:note.pinned ? "#f59e0b18" : "transparent", color:note.pinned ? "#f59e0b" : t.text3, fontSize:12, fontWeight:700, cursor:"pointer" }}>
            <PinIcon size={13} filled={note.pinned} color="currentColor" />
          </button>
          <button onClick={onToggleProps} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:8, border:`1px solid ${showProps ? t.accent+"60" : t.border}`, background:showProps ? t.accentBg : "transparent", color:showProps ? t.accent : t.text3, fontSize:12, fontWeight:700, cursor:"pointer" }}>
            <Icon name="settings" size={13} color="currentColor" strokeWidth={2} />
            {isMobile ? "Vlastnosti" : ""}
          </button>
          {onDelete && (
            <button onClick={onDelete} style={{ display:"flex", alignItems:"center", padding:"5px 8px", borderRadius:8, border:"none", background:"transparent", color:t.text3, cursor:"pointer" }}>
              <Icon name="trash" size={13} color="#ef4444" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* AI Panel */}
      {aiOpen && (
        <div style={{ borderBottom:`1px solid ${t.border}`, background:`${t.accent}0d`, padding:"8px 20px 10px", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ fontSize:12, fontWeight:700, color:t.accent }}>✨ AI asistent</span>
            <div style={{ display:"flex", gap:4 }}>
              {NOTE_AI_ACTIONS.map(a => (
                <button key={a.id} onClick={()=>runAI(a.id)} disabled={!!aiLoading} style={{
                  display:"flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:6, fontSize:12, fontWeight:600,
                  border:`1px solid ${aiAction===a.id ? t.accent+"60" : t.border}`,
                  background:aiAction===a.id ? `${t.accent}20` : t.input,
                  color:aiAction===a.id ? t.accent : t.text2, cursor:aiLoading?"wait":"pointer",
                }}>
                  {aiLoading===a.id ? <span style={{animation:"spin .7s linear infinite"}}>◌</span> : <Icon name={a.icon} size={11} color="currentColor" strokeWidth={2} />}
                  {a.label}
                </button>
              ))}
            </div>
          </div>
          {aiResult !== null && (
            <div style={{ background:t.bg, border:`1px solid ${t.border}`, borderRadius:8, padding:"10px 12px", marginTop:8 }}>
              {typeof aiResult === "string" ? (
                <div style={{ fontSize:13, color:t.text, lineHeight:1.6, whiteSpace:"pre-wrap", maxHeight:140, overflow:"auto" }}>{aiResult}</div>
              ) : (
                <div>
                  {aiResult.map((item,i) => <div key={i} style={{ fontSize:13, color:t.text, padding:"2px 0", display:"flex", gap:7, alignItems:"center" }}><div style={{ width:5,height:5,borderRadius:"50%",background:t.accent,flexShrink:0 }}/>{String(item)}</div>)}
                </div>
              )}
              <div style={{ display:"flex", gap:6, marginTop:8 }}>
                <button onClick={applyAI} style={{ padding:"5px 14px", borderRadius:6, border:"none", background:t.accent, color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                  {aiAction==="note_extract_tasks" ? "Přidat jako úkoly" : "Přidat do poznámky"}
                </button>
                <button onClick={()=>{setAiResult(null);setAiAction(null);}} style={{ padding:"5px 12px", borderRadius:6, border:`1px solid ${t.border}`, background:"transparent", color:t.text2, fontSize:12, cursor:"pointer" }}>Zahodit</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scrollable editor area */}
      <div style={{ flex:1, overflow:"auto", position:"relative" }}>
        {/* Page content */}
        <div style={{ width:"min(1040px, calc(100% - 72px))", margin:"0 auto", padding:"24px 0 100px" }}>
          {/* Page icon */}
          <div
            style={{ width:44, height:44, borderRadius:12, display:"grid", placeItems:"center", fontSize:23, background:"rgba(255,255,255,.045)", border:`1px solid ${t.border}`, marginBottom:16, cursor:"text" }}
            title="Klikni pro změnu ikony / emoji"
            onClick={() => {
              const em = prompt("Emoji nebo ikona:", note.icon || "📝");
              if (em !== null) onSave({ icon: em.trim().slice(0, 2) || null });
            }}
          >
            {note.icon || "📝"}
          </div>

          {/* Title */}
          <input
            ref={titleRef}
            defaultValue={note.title}
            onChange={handleTitleChange}
            placeholder="Nová poznámka"
            style={{
              width:"100%", border:"none", background:"transparent", color:t.text, outline:"none",
              fontFamily:"var(--font-ui)",
              fontSize:"clamp(32px, 4vw, 50px)", fontWeight:900, letterSpacing:"-.04em", lineHeight:1.04,
              marginBottom:14, display:"block",
            }}
          />

          {/* Meta-line */}
          <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", color:t.text3, fontSize:12, paddingBottom:20, borderBottom:`1px solid ${t.border}`, marginBottom:26 }}>
            <span>Upraveno {formatDateTime(note.updatedAt)}</span>
            {linkedProject && (
              <span style={{ color:"var(--accent)", background:"var(--accent-soft)", border:"1px solid color-mix(in srgb, var(--accent) 28%, transparent)", padding:"3px 9px", borderRadius:999, fontWeight:700, fontSize:12 }}>
                Projekt: {linkedProject.name}
              </span>
            )}
            {linkedTask && (
              <span style={{ color:"#bbf7d0", background:"rgba(34,197,94,.12)", border:"1px solid rgba(34,197,94,.2)", padding:"3px 9px", borderRadius:999, fontWeight:700, fontSize:12 }}>
                Úkol: {linkedTask.title || "Bez názvu"}
              </span>
            )}
            <span style={{ position:"relative", display:"inline-flex" }}>
              <button onClick={() => setStatusMenu(v => !v)} title="Změnit stav" style={{ display:"inline-flex", alignItems:"center", gap:5, background:statusInfo.bg, color:statusInfo.color, border:`1px solid ${statusInfo.color}40`, padding:"3px 9px", borderRadius:999, fontWeight:700, fontSize:12, cursor:"pointer" }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:statusInfo.color }} />
                {statusInfo.label}
                <span style={{ opacity:.7, fontSize:9 }}>▾</span>
              </button>
              {statusMenu && (
                <>
                  <div onClick={() => setStatusMenu(false)} style={{ position:"fixed", inset:0, zIndex:40 }} />
                  <div style={{ position:"absolute", top:"calc(100% + 5px)", left:0, zIndex:41, background:t.bg2, border:`1px solid ${t.border}`, borderRadius:10, boxShadow:"0 12px 30px rgba(0,0,0,.3)", padding:5, minWidth:150 }}>
                    {Object.entries(NOTE_STATUSES).map(([k, v]) => (
                      <button key={k} onClick={() => { onSave({ status:k }); setStatusMenu(false); }} style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"7px 9px", borderRadius:7, border:"none", background:note.status===k ? "var(--accent-soft)" : "transparent", color:note.status===k ? "var(--accent)" : t.text2, fontSize:12.5, fontWeight:note.status===k?700:500, cursor:"pointer", textAlign:"left" }}>
                        <span style={{ width:8, height:8, borderRadius:"50%", background:v.color, flexShrink:0 }} />
                        {v.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </span>
              {note.tags?.length > 0 && note.tags.slice(0, 4).map(tag => {
              const col = getTagColor(tag, globalTags) || t.text3;
              return (
                <span key={tag} style={{ color:col, background:`${col}15`, border:`1px solid ${col}25`, padding:"3px 7px", borderRadius:999, fontSize:11.5, fontWeight:600 }}>
                  #{tag}
                </span>
              );
            })}
          </div>

          <div className="note-blocknote">
            {blockNoteStylesReady ? (
              <BlockNoteView
                editor={editor}
                onChange={handleEditorChange}
                theme={dk ? "dark" : "light"}
              />
            ) : (
              <div style={{ minHeight: 260, display: "grid", placeItems: "center", color: t.text3, fontSize: 13, fontWeight: 700 }}>
                Načítám editor...
              </div>
            )}
          </div>

          <div className="notes-linked-panel">
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginBottom:12 }}>
              <b style={{ fontSize:14, color:t.text }}>Navázané položky</b>
              <small style={{ color:t.text3 }}>{linkedItems.length} aktivní vazby</small>
            </div>
            {linkedItems.length > 0 ? (
              <div className="notes-linked-grid">
                {linkedItems.map(item => (
                  <div key={`${item.type}:${item.id}`} className="notes-linked-item">
                    <small style={{ display:"block", color:t.text3, fontSize:11, marginBottom:5 }}>{item.meta}</small>
                    <span style={{ display:"block", color:t.text, fontSize:13, fontWeight:850, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.title}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color:t.text3, fontSize:13 }}>Poznámka zatím není připojená k úkolu ani projektu.</div>
            )}
            <button onClick={onToggleProps} style={{ width:"100%", marginTop:12, height:34, borderRadius:10, border:`1px solid ${t.border}`, background:"transparent", color:t.text2, fontWeight:800, fontSize:12 }}>
              + Připojit další vazbu
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}

/* ─── NotePropertiesPanel ───────────────────── */
function NotePropertiesPanel({ note, onClose, t, isMobile, onExportMD, projects, tasks, addTask }) {
  const { updateNote, tags: globalTags, addTag: createGlobalTag } = useApp();
  const toast = useToast();
  const [tagSearch,       setTagSearch]       = useState("");
  const [showAllProjects, setShowAllProjects] = useState(true);
  const [showAllTasks,    setShowAllTasks]    = useState(false);
  const [taskSearch,      setTaskSearch]      = useState("");
  const [iconPicker,      setIconPicker]      = useState(false);

  const linkedItems   = linkedItemsForNote(note, projects, tasks);
  const priorityKey   = notePriority(note);
  const templateLabel = noteTemplateLabel(note);

  const addTagByName = (raw) => {
    const name = raw.trim().replace(/\s+/g, "-");
    if (!name) return;
    if (note.tags?.some(t2 => t2.toLowerCase() === name.toLowerCase())) return;
    const matched = globalTags?.find(gt => gt.name.toLowerCase() === name.toLowerCase());
    const tagName = matched ? matched.name : name;
    if (!matched) createGlobalTag({ name, color: getRandomTagColor() });
    updateNote(note.id, { tags: [...(note.tags || []), tagName] });
    setTagSearch("");
  };

  const removeTag = (tag) => updateNote(note.id, { tags: note.tags.filter(t2 => t2 !== tag) });

  const toggleGlobalTag = (gt) => {
    const already = note.tags?.some(t2 => t2.toLowerCase() === gt.name.toLowerCase());
    if (already) {
      updateNote(note.id, { tags: (note.tags || []).filter(t2 => t2.toLowerCase() !== gt.name.toLowerCase()) });
    } else {
      updateNote(note.id, { tags: [...(note.tags || []), gt.name] });
    }
  };

  const filteredGlobalTags = tagSearch.trim()
    ? (globalTags || []).filter(gt => gt.name.toLowerCase().includes(tagSearch.toLowerCase()))
    : (globalTags || []);

  const runAIExtract = async () => {
    const content = document.querySelector('.note-blocknote')?.innerText || stripHtmlText(note.content || "");
    const candidates = content
      .split("\n")
      .map(line => line.replace(/^[-\d. [\]x]+/i, "").trim())
      .filter(line => line.length > 4)
      .slice(0, 5);
    const created = (candidates.length ? candidates : [note.title || "Nový úkol z poznámky"])
      .map(title => addTask({ title, projectId: note.primaryProjectId || null }));
    if (created.length) toast(`Vytvořeno ${created.length} úkolů z poznámky`, "success");
  };

  const toggleExtraProject = (id) => {
    const cur = note.extraProjectIds || [];
    updateNote(note.id, { extraProjectIds: cur.includes(id) ? cur.filter(x=>x!==id) : [...cur, id] });
  };

  const toggleExtraTask = (id) => {
    const cur = note.extraTaskIds || [];
    updateNote(note.id, { extraTaskIds: cur.includes(id) ? cur.filter(x=>x!==id) : [...cur, id] });
  };

  const panelStyle = isMobile
    ? { position:"fixed", left:0, right:0, bottom:0, top:"12vh", zIndex:300, background:t.bg2, overflowY:"auto", borderTop:`1px solid ${t.border}`, borderRadius:"18px 18px 0 0", boxShadow:"0 -24px 70px rgba(0,0,0,.45)" }
    : { position:"fixed", right:0, top:64, bottom:0, width:310, zIndex:100, borderLeft:`1px solid ${t.border}`, background:t.bg2, overflowY:"auto", boxShadow:"-4px 0 24px rgba(0,0,0,.18)" };

  const filteredTasks = tasks.filter(tk =>
    !taskSearch || (tk.title || "").toLowerCase().includes(taskSearch.toLowerCase())
  );

  const sh = (label) => (
    <div style={{ fontSize:11, fontWeight:750, textTransform:"uppercase", letterSpacing:".07em", color:t.text3, marginBottom:8 }}>{label}</div>
  );
  const sep = <div style={{ height:1, background:"var(--border-soft)", margin:"4px 0" }} />;

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px 12px", borderBottom:`1px solid ${t.border}`, position:"sticky", top:0, background:t.bg2, zIndex:1 }}>
        <span style={{ fontSize:13, fontWeight:800, color:t.text, letterSpacing:"-.2px" }}>Vlastnosti</span>
        <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", padding:4, display:"flex", color:t.text3 }}>
          <Icon name="x" size={15} color={t.text3} strokeWidth={2} />
        </button>
      </div>

      <div style={{ padding:"16px 16px 24px", display:"flex", flexDirection:"column", gap:20 }}>

        {/* ── Stav ── */}
        <div>
          {sh("Stav")}
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            {Object.entries(NOTE_STATUSES).map(([k, v]) => {
              const isActive = (note.status || "draft") === k;
              return (
                <button key={k} onClick={() => updateNote(note.id, { status:k })} style={{
                  padding:"4px 11px", borderRadius:999, fontSize:12, fontWeight:700,
                  border:`1px solid ${isActive ? v.color+"60" : "var(--border-soft)"}`,
                  background: isActive ? v.color+"18" : "transparent",
                  color: isActive ? v.color : t.text3,
                  cursor:"pointer", transition:"all .15s",
                }}>
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Štítky ── */}
        <div>
          {sh("Štítky")}
          {note.tags?.length > 0 && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:8 }}>
              {note.tags.map(tag => {
                const col = getTagColor(tag, globalTags) || t.accent;
                return (
                  <span key={tag} style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 8px 3px 6px", borderRadius:999, fontSize:11.5, fontWeight:600, background:`${col}18`, color:col, border:`1px solid ${col}30` }}>
                    <span style={{ width:6, height:6, borderRadius:"50%", background:col, flexShrink:0 }} />
                    {tag}
                    <button onClick={()=>removeTag(tag)} style={{ background:"none", border:"none", cursor:"pointer", padding:0, display:"flex", color:col, opacity:.7 }}>
                      <Icon name="x" size={9} color="currentColor" strokeWidth={2.5} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          <div style={{ position:"relative", marginBottom:6 }}>
            <Icon name="search" size={12} color={t.text3} strokeWidth={2} style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} />
            <input
              value={tagSearch}
              onChange={e=>setTagSearch(e.target.value)}
              onKeyDown={e=>{
                if ((e.key==="Enter"||e.key===",") && tagSearch.trim()) { e.preventDefault(); addTagByName(tagSearch); }
                else if (e.key==="Backspace" && !tagSearch && note.tags?.length) removeTag(note.tags[note.tags.length-1]);
              }}
              placeholder="Hledat nebo přidat štítek…"
              style={{ width:"100%", padding:"6px 10px 6px 28px", borderRadius:8, border:"1px solid var(--border-soft)", background:"var(--bg)", color:t.text, fontSize:12, outline:"none", boxSizing:"border-box" }}
            />
          </div>
          {filteredGlobalTags.length > 0 && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:5, maxHeight:100, overflowY:"auto", padding:"6px 8px", border:"1px solid var(--border-soft)", borderRadius:8, background:"var(--bg)" }}>
              {filteredGlobalTags.map(gt => {
                const active = note.tags?.some(t2 => t2.toLowerCase() === gt.name.toLowerCase());
                return (
                  <span key={gt.id} onClick={()=>toggleGlobalTag(gt)} style={{
                    display:"inline-flex", alignItems:"center", gap:5, padding:"3px 9px", borderRadius:8, fontSize:11.5, fontWeight:600,
                    background: active ? "var(--accent-soft)" : "transparent",
                    color: active ? "var(--accent)" : t.text2,
                    border:`1px solid ${active ? "color-mix(in srgb, var(--accent) 30%, transparent)" : "var(--border-soft)"}`,
                    cursor:"pointer", transition:"all .12s",
                  }}>
                    <span style={{ width:7, height:7, borderRadius:"50%", background:gt.color||"var(--accent)", flexShrink:0 }} />
                    {gt.name}
                    {active ? " ✓" : " +"}
                  </span>
                );
              })}
            </div>
          )}
          {tagSearch.trim() && !(globalTags||[]).some(gt=>gt.name.toLowerCase()===tagSearch.trim().toLowerCase()) && (
            <button onClick={()=>addTagByName(tagSearch)} style={{ marginTop:7, display:"inline-flex", alignItems:"center", gap:5, padding:"5px 12px", borderRadius:8, border:"none", background:"var(--accent)", color:"var(--bg)", fontSize:11.5, fontWeight:700, cursor:"pointer" }}>
              <Icon name="plus" size={11} color="currentColor" strokeWidth={2.5} />
              Vytvořit „{tagSearch.trim()}"
            </button>
          )}
        </div>

        {/* ── Nastavení poznámky ── */}
        <div>
          {sh("Nastavení poznámky")}
          <div style={{ display:"grid", gap:7 }}>
            {/* Ikona — picker místo prompt() */}
            <div style={{ position:"relative" }}>
              <button onClick={() => setIconPicker(v => !v)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, padding:"8px 10px", borderRadius:9, border:`1px solid ${iconPicker ? "color-mix(in srgb, var(--accent) 40%, transparent)" : "var(--border-soft)"}`, background:"var(--bg)", color:t.text2, fontSize:12.5, cursor:"pointer" }}>
                <span style={{ display:"flex", alignItems:"center", gap:8 }}><span style={{ fontSize:16 }}>{note.icon || "📝"}</span> Ikona</span>
                <span style={{ color:t.text3 }}>{iconPicker ? "▲" : "▼"}</span>
              </button>
              {iconPicker && (
                <div style={{ marginTop:6, padding:"8px", border:"1px solid var(--border-soft)", borderRadius:10, background:"var(--bg)", display:"flex", flexWrap:"wrap", gap:4 }}>
                  {["📝","📌","💡","✅","🔥","⭐","📅","🎯","🐞","📊","📣","🧠","🔖","📁","💬","⚙️","🚀","❗","🧩","🗂️"].map(em => (
                    <button key={em} onClick={() => { updateNote(note.id, { icon: em }); setIconPicker(false); }} style={{ width:32, height:32, borderRadius:8, border:`1px solid ${note.icon===em ? "color-mix(in srgb, var(--accent) 45%, transparent)" : "transparent"}`, background:note.icon===em ? "var(--accent-soft)" : "transparent", fontSize:17, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>{em}</button>
                  ))}
                  <button onClick={() => { updateNote(note.id, { icon: null }); setIconPicker(false); }} style={{ marginLeft:"auto", padding:"0 10px", height:32, borderRadius:8, border:"1px solid var(--border-soft)", background:"transparent", color:t.text3, fontSize:11.5, cursor:"pointer" }}>Bez ikony</button>
                </div>
              )}
            </div>

            {/* Priorita — editovatelná */}
            <div style={{ padding:"8px 10px", borderRadius:9, border:"1px solid var(--border-soft)", background:"var(--bg)" }}>
              <div style={{ fontSize:12.5, color:t.text2, marginBottom:7 }}>Priorita</div>
              <div style={{ display:"flex", gap:5 }}>
                {["low","medium","high"].map(p => {
                  const isActive = priorityKey === p;
                  const col = PRIORITY_COLORS[p];
                  return (
                    <button key={p} onClick={() => updateNote(note.id, { priority: p })} style={{ flex:1, padding:"5px 0", borderRadius:8, fontSize:11.5, fontWeight:700, cursor:"pointer", border:`1px solid ${isActive ? col+"66" : "var(--border-soft)"}`, background:isActive ? col+"1c" : "transparent", color:isActive ? col : t.text3 }}>
                      {NOTE_PRIORITIES[p]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ padding:"8px 10px", borderRadius:9, border:"1px solid var(--border-soft)", background:"var(--bg)", color:t.text3, fontSize:12.5, display:"flex", justifyContent:"space-between" }}><span>Šablona</span><span style={{ color:t.text2 }}>{templateLabel}</span></div>
            <button onClick={()=>updateNote(note.id,{archived:!note.archived})} style={{ textAlign:"left", display:"flex", justifyContent:"space-between", padding:"8px 10px", borderRadius:9, border:"1px solid var(--border-soft)", background:"var(--bg)", color:t.text2, fontSize:12.5, cursor:"pointer" }}>
              <span>Archivace</span><span style={{ color:note.archived ? t.accent : t.text3 }}>{note.archived ? "zapnuto" : "vypnuto"}</span>
            </button>
          </div>
        </div>

        {sep}

        {/* ── Projekt ── */}
        <div>
          {sh("Napojení")}
          {linkedItems.length > 0 && (
            <div style={{ display:"grid", gap:6, marginBottom:10 }}>
              {linkedItems.map(item => (
                <div key={`${item.type}:${item.id}`} style={{ display:"flex", alignItems:"center", gap:9, padding:"9px 10px", borderRadius:12, border:"1px solid var(--border-soft)", background:"var(--surface)" }}>
                  <div style={{ width:28, height:28, borderRadius:9, display:"grid", placeItems:"center", background:"rgba(255,255,255,.05)" }}>
                    <Icon name={item.type === "task" ? "check-square" : "folder"} size={13} color={item.type === "task" ? "#22c55e" : "var(--accent)"} strokeWidth={2} />
                  </div>
                  <div style={{ minWidth:0 }}>
                    <b style={{ display:"block", color:t.text, fontSize:12.5, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.title}</b>
                    <small style={{ color:t.text3 }}>{item.meta}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize:11, fontWeight:750, textTransform:"uppercase", letterSpacing:".07em", color:t.text3, margin:"8px 0 6px" }}>Projekt</div>
          <select
            value={note.primaryProjectId || ""}
            onChange={e => {
              const v = e.target.value;
              updateNote(note.id, { primaryProjectId: v || null, primaryTaskId: v ? null : note.primaryTaskId });
            }}
            style={{ width:"100%", background:"var(--bg)", border:"1px solid var(--border-soft)", borderRadius:8, color:t.text2, fontSize:12, padding:"6px 8px", outline:"none", cursor:"pointer", boxSizing:"border-box" }}
          >
            <option value="">— Bez projektu</option>
            {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {projects.length > 0 && (
            <div style={{ marginTop:8 }}>
              <button onClick={()=>setShowAllProjects(v=>!v)} style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:"none", color:t.text3, fontSize:11, cursor:"pointer", padding:"2px 0", fontWeight:600 }}>
                <Icon name={showAllProjects?"chevron-up":"chevron-down"} size={11} color={t.text3} strokeWidth={2} />
                Propojit více projektů
              </button>
              {showAllProjects && (
                <div style={{ display:"flex", flexDirection:"column", gap:3, marginTop:6, maxHeight:160, overflowY:"auto" }}>
                  {projects.map(p => {
                    const isPrimary = p.id === note.primaryProjectId;
                    const isExtra   = (note.extraProjectIds||[]).includes(p.id);
                    const col = projectColor(p.id);
                    return (
                      <button key={p.id} onClick={()=>{ if(!isPrimary) toggleExtraProject(p.id); }} style={{
                        display:"flex", alignItems:"center", gap:7, padding:"5px 8px", borderRadius:7,
                        border:`1px solid ${isPrimary?col+"60":isExtra?col+"40":"var(--border-soft)"}`,
                        background: isPrimary?col+"18":isExtra?col+"10":"transparent",
                        color: isPrimary||isExtra?col:t.text2,
                        fontSize:12, cursor:isPrimary?"default":"pointer", textAlign:"left",
                      }}>
                        <div style={{ width:7, height:7, borderRadius:"50%", background:col, flexShrink:0 }} />
                        <span style={{ flex:1 }}>{p.name}</span>
                        {isPrimary && <span style={{ fontSize:10, fontWeight:700 }}>primární</span>}
                        {isExtra   && <Icon name="check" size={10} color={col} strokeWidth={2.5} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Úkol ── */}
        <div>
          <div style={{ fontSize:11, fontWeight:750, textTransform:"uppercase", letterSpacing:".07em", color:t.text3, marginBottom:8 }}>Úkol</div>
          <select
            value={note.primaryTaskId || ""}
            onChange={e => updateNote(note.id, { primaryTaskId: e.target.value || null })}
            style={{ width:"100%", background:"var(--bg)", border:"1px solid var(--border-soft)", borderRadius:8, color:t.text2, fontSize:12, padding:"6px 8px", outline:"none", cursor:"pointer", boxSizing:"border-box" }}
          >
            <option value="">— Bez úkolu</option>
            {tasks.map(tk=><option key={tk.id} value={tk.id}>{tk.title||"Bez názvu"}</option>)}
          </select>
          {tasks.length > 0 && (
            <div style={{ marginTop:8 }}>
              <button onClick={()=>setShowAllTasks(v=>!v)} style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:"none", color:t.text3, fontSize:11, cursor:"pointer", padding:"2px 0", fontWeight:600 }}>
                <Icon name={showAllTasks?"chevron-up":"chevron-down"} size={11} color={t.text3} strokeWidth={2} />
                Propojit více úkolů
              </button>
              {showAllTasks && (
                <div style={{ marginTop:6 }}>
                  <input value={taskSearch} onChange={e=>setTaskSearch(e.target.value)} placeholder="Hledat úkol…"
                    style={{ width:"100%", padding:"5px 8px", borderRadius:7, border:"1px solid var(--border-soft)", background:"var(--bg)", color:t.text, fontSize:11, outline:"none", boxSizing:"border-box", marginBottom:5 }}
                  />
                  <div style={{ display:"flex", flexDirection:"column", gap:3, maxHeight:160, overflowY:"auto" }}>
                    {filteredTasks.length===0 && <div style={{ fontSize:11, color:t.text3 }}>Žádné úkoly</div>}
                    {filteredTasks.map(tk => {
                      const isPrimary = tk.id===note.primaryTaskId;
                      const isExtra   = (note.extraTaskIds||[]).includes(tk.id);
                      return (
                        <button key={tk.id} onClick={()=>{ if(!isPrimary) toggleExtraTask(tk.id); }} style={{
                          display:"flex", alignItems:"center", gap:7, padding:"5px 8px", borderRadius:7,
                          border:`1px solid ${isPrimary||isExtra?"color-mix(in srgb, var(--accent) 35%, transparent)":"var(--border-soft)"}`,
                          background: isPrimary||isExtra?"var(--accent-soft)":"transparent",
                          color: isPrimary||isExtra?"var(--accent)":t.text2,
                          fontSize:12, cursor:isPrimary?"default":"pointer", textAlign:"left",
                        }}>
                          <Icon name="check-square" size={11} color={isPrimary||isExtra?"var(--accent)":t.text3} strokeWidth={2} />
                          <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tk.title||"Bez názvu"}</span>
                          {isPrimary && <span style={{ fontSize:10, fontWeight:700 }}>primární</span>}
                          {isExtra   && <Icon name="check" size={10} color="var(--accent)" strokeWidth={2.5} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          <button onClick={() => addTask({ title: note.title || "Úkol z poznámky", projectId: note.primaryProjectId || null })} style={{ width:"100%", marginTop:8, padding:"8px 10px", borderRadius:9, border:"1px solid var(--border-soft)", background:"var(--accent-soft)", color:"var(--accent)", fontSize:12, fontWeight:850 }}>
            Vytvořit úkol z poznámky
          </button>
        </div>

        {sep}

        {/* ── AI pomocník ── */}
        <div style={{ border:"1px solid color-mix(in srgb, var(--accent) 24%, transparent)", borderRadius:14, padding:13, background:"linear-gradient(160deg, var(--accent-soft), rgba(59,130,246,.05))", boxShadow:"0 0 28px rgba(var(--accent-rgb), .08)" }}>
          <div style={{ fontSize:13, fontWeight:900, color:t.text, marginBottom:6 }}>✨ AI pomocník</div>
          <div style={{ fontSize:12, color:t.text3, lineHeight:1.45, marginBottom:10 }}>Mock akce připravené pro pozdější napojení. Reálný backend se teď nespouští.</div>
          <div style={{ display:"grid", gap:6 }}>
            {NOTE_AI_MOCK_ACTIONS.map(action => (
              <button key={action} onClick={() => toast(`${action}: mock akce připravena`, "info")} style={{ height:31, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 10px", borderRadius:9, border:"1px solid var(--border-soft)", background:"rgba(0,0,0,.12)", color:t.text2, fontSize:12 }}>
                {action}<span>↵</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Historie ── */}
        <div>
          {sh("Historie")}
          <div style={{ display:"grid", gap:6, fontSize:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", color:t.text3 }}><span>Vytvořeno</span><b style={{ color:t.text2 }}>{formatDateTime(note.createdAt)}</b></div>
            <div style={{ display:"flex", justifyContent:"space-between", color:t.text3 }}><span>Naposledy upraveno</span><b style={{ color:t.text2 }}>{formatDateTime(note.updatedAt)}</b></div>
            <div style={{ display:"flex", justifyContent:"space-between", color:t.text3 }}><span>Poslední editor</span><b style={{ color:t.text2 }}>Michal</b></div>
          </div>
          <button style={{ width:"100%", marginTop:10, padding:"8px 10px", borderRadius:9, border:"1px solid var(--border-soft)", color:t.text2, fontSize:12, fontWeight:750 }}>Zobrazit historii</button>
        </div>

        {/* ── Rychlé akce ── */}
        <div>
          {sh("Akce")}
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <MiniItem t={t} left={<><PinIcon size={11} filled={note.pinned} color="#f59e0b" /> {note.pinned?"Odepnout":"Připnout poznámku"}</>} right="⌥P" onClick={()=>updateNote(note.id,{pinned:!note.pinned})} />
            <MiniItem t={t} left="🧠 Vytáhnout úkoly z textu" right="AI" onClick={runAIExtract} />
            <MiniItem t={t} left={note.archived?"🗄️ Obnovit z archivu":"🗄️ Archivovat poznámku"} right="" onClick={()=>updateNote(note.id,{archived:!note.archived})} />
            <MiniItem t={t} left="📤 Export jako .md" right=".md" onClick={onExportMD} />
          </div>
        </div>

      </div>
    </div>
  );
}

/* ─── Note sidebar card color ─────────────────── */
function noteAccentColor(note, projects) {
  if (note.primaryProjectId) {
    const proj = projects.find(p => p.id === note.primaryProjectId);
    if (proj) return projectColor(proj.id);
  }
  return NOTE_STATUSES[note.status]?.color ?? "#64748b";
}

function NoteProjectPill({ projectId, projectsById }) {
  if (!projectId) return null;
  const p = projectsById[projectId];
  if (!p) return null;
  return (
    <span className="proj-pill" style={{ "--proj-color": projectColor(projectId) }}>
      <span className="pp-dot" />
      <span>{p.name}</span>
    </span>
  );
}

function NotesAtlasGrid({ notes, onOpenNote, onCreate, projects }) {
  const { tags: globalTags } = useApp();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("updated");
  const [tagFilter, setTagFilter] = useState(null);
  const projectsById = Object.fromEntries(projects.map(p => [p.id, p]));

  const activeNotes = notes.filter(n => !n.archived);
  const archivedNotes = notes.filter(n => n.archived);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = todayStart - (6 * 86400000);
  const todayCount = activeNotes.filter(n => n.updatedAt >= todayStart).length;
  const weekCount = activeNotes.filter(n => n.updatedAt >= weekStart).length;
  const lastUpdated = activeNotes.reduce((max, n) => Math.max(max, n.updatedAt || 0), 0);
  const lastUpdatedLabel = lastUpdated ? relTime(lastUpdated) : "zatím žádná aktivita";

  const term = search.trim().toLowerCase();
  let filtered = notes.filter((n) => {
    if (!term) return true;
    const plain = (n.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    return (n.title || "").toLowerCase().includes(term) || plain.toLowerCase().includes(term);
  });

  if (filter === "all") {
    filtered = filtered.filter(n => !n.archived);
  } else if (filter === "archive") {
    filtered = filtered.filter(n => n.archived);
  } else if (filter === "pinned") {
    filtered = filtered.filter(n => !n.archived && n.pinned);
  } else if (filter === "free") {
    filtered = filtered.filter(n => !n.archived && !n.primaryProjectId && !n.primaryTaskId && !(n.extraProjectIds || []).length && !(n.extraTaskIds || []).length);
  } else if (filter === "today") {
    filtered = filtered.filter(n => !n.archived && n.updatedAt >= todayStart);
  } else if (filter === "week") {
    filtered = filtered.filter(n => !n.archived && n.updatedAt >= weekStart);
  }

  if (tagFilter) {
    filtered = filtered.filter(n => n.tags?.some(tag => tag.toLowerCase() === tagFilter.toLowerCase()));
  }

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "updated") return b.updatedAt - a.updatedAt;
    if (sortBy === "created") return b.createdAt - a.createdAt;
    return compareText(a.title, b.title);
  });

  const chips = [
    { key: "all", label: "Všechny", count: activeNotes.length },
    { key: "pinned", label: "Připnuté", count: activeNotes.filter(n => n.pinned).length },
    { key: "free", label: "Bez projektu", count: activeNotes.filter(n => !n.primaryProjectId && !n.primaryTaskId).length },
    { key: "today", label: "Dnes", count: todayCount },
    { key: "week", label: "Tento týden", count: weekCount },
    { key: "archive", label: "Archiv", count: archivedNotes.length },
  ];

  return (
    <div className="content">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">{activeNotes.length} poznámek · {todayCount} nové dnes</div>
          <h1 className="ph-title">Poznámky</h1>
          <div className="ph-sub">
            <span>{search ? `výsledek pro "${search}"` : "poslední úprava: " + lastUpdatedLabel}</span>
          </div>
        </div>
        <button className="btn primary" onClick={onCreate}>
          <Icon name="plus" size={14} color="currentColor" strokeWidth={2.4} />
          Nová poznámka
        </button>
      </div>

      <div className="chips">
        {chips.map((chip) => (
          <button key={chip.key} className={`chip ${filter === chip.key ? "active" : ""}`} onClick={() => setFilter(chip.key)}>
            {chip.label}
            <span className="chip-count">{chip.count}</span>
          </button>
        ))}
        {tagFilter && (
          <button className="chip active" onClick={() => setTagFilter(null)} style={{ gap: 5 }}>
            <span style={{ opacity: .7 }}>#</span>{tagFilter}
            <Icon name="x" size={10} color="currentColor" strokeWidth={2.5} />
          </button>
        )}
        <span className="chips-sep" />
        <label className="chip" style={{ gap: 8, cursor: "default" }}>
          Seřadit
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ background: "transparent", border: "none", color: "inherit", fontSize: 12.5, outline: "none", cursor: "pointer" }}
          >
            <option value="updated">Upravené</option>
            <option value="created">Vytvořené</option>
            <option value="title">A-Z</option>
          </select>
        </label>
        <div style={{ marginLeft: "auto", minWidth: 220, maxWidth: "100%" }}>
          <div style={{ position: "relative" }}>
            <Icon name="search" size={13} color="var(--text-4)" strokeWidth={2} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hledat v poznámkách..."
              style={{ width: "100%", background: "var(--bg-2)", border: "1px solid var(--border-soft)", borderRadius: 999, padding: "7px 12px 7px 31px", color: "var(--text)", fontSize: 13 }}
            />
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div style={{ padding: "48px 18px", textAlign: "center", color: "var(--text-3)", border: "1px dashed var(--border)", borderRadius: 14, background: "var(--surface)" }}>
          {search ? `Nic nenalezeno pro "${search}".` : "Zatím tu nejsou žádné poznámky."}
        </div>
      ) : (
        <div className="ngrid">
          {sorted.map((n) => {
            const rawExcerpt = (n.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
            const excerpt = rawExcerpt.length > 100 ? rawExcerpt.slice(0, 100) + "…" : rawExcerpt;
            return (
              <button
                key={n.id}
                className="ncard"
                style={{ "--proj-color": noteAccentColor(n, projects), textAlign: "left" }}
                onClick={() => onOpenNote(n.id)}
              >
                <div className="ncard-top">
                  <span className="ncard-date">
                    {formatDate(n.updatedAt, { day: "numeric", month: "short" })} · {relTime(n.updatedAt)}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {n.pinned && <PinIcon size={11} filled color="var(--accent)" />}
                    <NoteProjectPill projectId={n.primaryProjectId} projectsById={projectsById} />
                  </div>
                </div>
                <div className="ncard-t">
                  {n.icon ? `${n.icon} ` : ""}{n.title || "Bez názvu"}
                </div>
                <div className="ncard-x">{excerpt || "Prázdná poznámka..."}</div>
                {n.tags?.length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 12 }}>
                    {n.tags.slice(0, 4).map(tag => {
                      const col = getTagColor(tag, globalTags) || "var(--text-3)";
                      const isFiltered = tagFilter?.toLowerCase() === tag.toLowerCase();
                      return (
                        <span key={tag}
                          onClick={e => { e.stopPropagation(); setTagFilter(isFiltered ? null : tag); }}
                          style={{
                            fontFamily: "var(--mono)", fontSize: 10.5, color: col,
                            border: `1px solid ${isFiltered ? col+"80" : col+"30"}`,
                            background: isFiltered ? `${col}28` : `${col}12`,
                            borderRadius: 999, padding: "3px 7px", fontWeight: 600,
                            cursor: "pointer", transition: "all .12s",
                          }}
                        >
                          #{tag}
                        </span>
                      );
                    })}
                    {n.tags.length > 4 && (
                      <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--text-4)" }}>+{n.tags.length - 4}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── NotesSidebar ──────────────────────────── */
function NotesSidebar({ notes, selId, onSelect, onCreate, t, projects, view = "editor", onSetView }) {
  const { tags: globalTags, updateNote, uiSettings } = useApp();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("updated");
  const [hoveredId, setHoveredId] = useState(null);

  const compact = uiSettings?.density === "compact";
  const togglePin = (n) => updateNote(n.id, { pinned: !n.pinned });
  const toggleArchive = (n) => updateNote(n.id, { archived: !n.archived });

  const s = search.toLowerCase();
  // Hledání kryje název, obsah, štítky i názvy navázaných projektů (jak slibuje placeholder).
  const matchesSearch = (n) => {
    if (!s) return true;
    if (n.title.toLowerCase().includes(s) || n.content.toLowerCase().includes(s)) return true;
    if ((n.tags || []).some(tag => tag.toLowerCase().includes(s))) return true;
    const projIds = [n.primaryProjectId, ...(n.extraProjectIds || [])].filter(Boolean);
    return projIds.some(pid => projects.find(p => p.id === pid)?.name?.toLowerCase().includes(s));
  };
  let filtered = notes.filter(matchesSearch);

  if (filter === "archive") {
    filtered = filtered.filter(n => n.archived);
  } else {
    filtered = filtered.filter(n => !n.archived);
    if      (filter === "pinned")  filtered = filtered.filter(n => n.pinned);
    else if (filter === "active")  filtered = filtered.filter(n => n.status === "active");
    else if (filter === "templates") filtered = filtered.filter(n => noteTemplateLabel(n) !== "Prázdná poznámka");
    else if (filter === "project") filtered = filtered.filter(n => !!n.primaryProjectId || n.extraProjectIds?.length > 0);
    else if (filter === "task")    filtered = filtered.filter(n => !!n.primaryTaskId    || n.extraTaskIds?.length > 0);
    else if (filter === "free")    filtered = filtered.filter(n => !n.primaryProjectId && !n.primaryTaskId && !n.extraProjectIds?.length && !n.extraTaskIds?.length);
  }

  if (statusFilter !== "all" && filter !== "archive") {
    filtered = filtered.filter(n => (n.status || "draft") === statusFilter);
  }

  const sorted = [...filtered].sort((a,b) => {
    if (sortBy==="updated") return b.updatedAt - a.updatedAt;
    if (sortBy==="created") return b.createdAt - a.createdAt;
    return compareText(a.title, b.title);
  });

  const todayStart     = new Date(); todayStart.setHours(0,0,0,0);
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const weekStart      = new Date(todayStart.getTime() - 6*86400000);

  // Připnuté drž vždy nahoře (kromě filtrů Připnuté / Archiv, kde by se duplikovaly).
  const pinSection  = filter !== "pinned" && filter !== "archive";
  const pinnedItems = pinSection ? sorted.filter(n => n.pinned)  : [];
  const restItems   = pinSection ? sorted.filter(n => !n.pinned) : sorted;

  const dateGroups = (sortBy==="updated" && filter!=="archive") ? [
    { label:"Dnes",        items:restItems.filter(n=>n.updatedAt>=todayStart.getTime()) },
    { label:"Včera",       items:restItems.filter(n=>n.updatedAt>=yesterdayStart.getTime()&&n.updatedAt<todayStart.getTime()) },
    { label:"Tento týden", items:restItems.filter(n=>n.updatedAt>=weekStart.getTime()&&n.updatedAt<yesterdayStart.getTime()) },
    { label:"Starší",      items:restItems.filter(n=>n.updatedAt<weekStart.getTime()) },
  ] : [{ label:null, items:restItems }];

  const groups = [
    ...(pinnedItems.length ? [{ label:"Připnuté", pinned:true, items:pinnedItems }] : []),
    ...dateGroups,
  ].filter(g => g.items.length > 0);

  const activeCount  = notes.filter(n=>!n.archived).length;
  const archiveCount = notes.filter(n=>n.archived).length;

  const filterTabs = [
    { k:"all",       l:"Vše",       count:activeCount },
    { k:"pinned",    l:"Připnuté"                     },
    { k:"project",   l:"U projektu"                   },
    { k:"free",      l:"Volné"                        },
    { k:"templates", l:"Šablony"                      },
    { k:"archive",   l:"Archiv",    count:archiveCount, muted:true },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:t.bg2 }}>
      <div style={{ padding:"16px 14px 10px", borderBottom:`1px solid ${t.border}`, flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
              <Icon name="file-text" size={16} color={t.accent} strokeWidth={2} />
            <div style={{ minWidth:0 }}>
              <span style={{ display:"block", fontSize:15, fontWeight:850, fontFamily:"var(--font-ui)", letterSpacing:"-.3px" }}>Poznámky</span>
</div>
            <span style={{ fontSize:11, color:t.text3, background:"rgba(255,255,255,.07)", padding:"1px 7px", borderRadius:99, fontWeight:700 }}>{activeCount}</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {onSetView && (
              <div style={{ display:"flex", gap:2, background:"var(--bg-2)", border:`1px solid ${t.border}`, borderRadius:8, padding:2 }}>
                <button onClick={()=>onSetView("editor")} title="Zobrazení: seznam" aria-label="Zobrazení seznam" style={{ display:"flex", padding:"4px 6px", borderRadius:6, border:"none", cursor:"pointer", background:view!=="gallery"?"var(--accent-soft)":"transparent", color:view!=="gallery"?"var(--accent)":t.text3 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="8" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="8" y1="18" x2="20" y2="18"/><line x1="3.5" y1="6" x2="3.6" y2="6"/><line x1="3.5" y1="12" x2="3.6" y2="12"/><line x1="3.5" y1="18" x2="3.6" y2="18"/></svg>
                </button>
                <button onClick={()=>onSetView("gallery")} title="Zobrazení: galerie" aria-label="Zobrazení galerie" style={{ display:"flex", padding:"4px 6px", borderRadius:6, border:"none", cursor:"pointer", background:view==="gallery"?"var(--accent-soft)":"transparent", color:view==="gallery"?"var(--accent)":t.text3 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
                </button>
              </div>
            )}
            <button onClick={onCreate} style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 12px", borderRadius:9, border:"none", background:`linear-gradient(135deg, var(--accent), var(--accent-2))`, color:"var(--bg)", fontSize:12, fontWeight:800, cursor:"pointer", boxShadow:"0 6px 16px var(--accent-glow)" }}>
              <Icon name="plus" size={13} color="var(--bg)" strokeWidth={2.5} />
              Nová
            </button>
          </div>
        </div>
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", display:"flex" }}><Icon name="search" size={13} color={t.text3} strokeWidth={2} /></span>
          <input
            value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Hledat poznámku, štítek, projekt…"
            style={{ width:"100%", padding:"7px 28px 7px 30px", borderRadius:9, border:"1px solid var(--border-soft)", background:"var(--bg-2)", color:"var(--text)", fontSize:12.5, outline:"none", boxSizing:"border-box" }}
          />
          {search && (
            <button onClick={()=>setSearch("")} style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:t.text3, cursor:"pointer", padding:2, display:"flex" }}>
              <Icon name="x" size={12} color={t.text3} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:4, padding:"6px 10px", overflowX:"auto", borderBottom:`1px solid ${t.border}`, flexShrink:0 }}>
        {filterTabs.map(tab => {
          const isActive = filter === tab.k;
          return (
            <button key={tab.k} onClick={()=>setFilter(tab.k)} style={{
              padding:"5px 9px", borderRadius:999, fontSize:12, whiteSpace:"nowrap", fontWeight:isActive?700:400,
              border:`1px solid ${isActive && !tab.muted ? "color-mix(in srgb, var(--accent) 28%, transparent)" : "transparent"}`,
              flexShrink:0,
              background:isActive ? (tab.muted ? "rgba(255,255,255,.06)" : "var(--accent-soft)") : "transparent",
              color:isActive ? (tab.muted ? t.text2 : "var(--accent)") : t.text3, cursor:"pointer",
              display:"flex", alignItems:"center", gap:4,
            }}>
              {tab.k === "pinned" && <PinIcon size={10} filled={isActive} color="currentColor" />}
              {tab.k === "archive" && <Icon name="archive" size={10} color="currentColor" strokeWidth={2} />}
              {tab.l}
              {tab.count !== undefined && tab.count > 0 && (
                <span style={{ fontSize:10, background:"rgba(255,255,255,.07)", color:t.text3, padding:"0 4px", borderRadius:99, fontWeight:700 }}>{tab.count}</span>
              )}
            </button>
          );
        })}
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{ marginLeft:"auto", padding:"3px 6px", borderRadius:6, border:`1px solid ${statusFilter!=="all" ? "color-mix(in srgb, var(--accent) 40%, transparent)" : "var(--border-soft)"}`, background:"var(--bg-2)", color:statusFilter!=="all" ? "var(--accent)" : "var(--text-2)", fontSize:11, outline:"none", flexShrink:0 }} aria-label="Filtr podle stavu">
          <option value="all">Stav: vše</option>
          <option value="inbox">Inbox</option>
          <option value="idea">Nápad</option>
          <option value="draft">Koncept</option>
          <option value="active">Aktivní</option>
          <option value="done">Hotovo</option>
        </select>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ padding:"3px 6px", borderRadius:6, border:"1px solid var(--border-soft)", background:"var(--bg-2)", color:"var(--text-2)", fontSize:11, outline:"none", flexShrink:0 }} aria-label="Seřazení poznámek">
          <option value="updated">Upravené</option>
          <option value="created">Vytvořené</option>
          <option value="title">A–Z</option>
        </select>
      </div>

      <div style={{ flex:1, overflow:"auto", padding:"6px 8px 8px" }}>
        {sorted.length === 0 && (
          <div style={{ textAlign:"center", padding:"40px 16px", color:t.text3 }}>
            <div style={{ opacity:.1, marginBottom:12, display:"flex", justifyContent:"center" }}>
              <Icon name={filter==="archive" ? "archive" : "file-text"} size={44} color={t.text} strokeWidth={1} />
            </div>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:5, color:t.text2 }}>
              {search ? `Nic pro „${search}"` : "Žádné poznámky"}
            </div>
            {!search && filter==="all" && (
              <button onClick={onCreate} style={{ marginTop:10, padding:"7px 18px", borderRadius:8, border:"none", background:"var(--accent)", color:"var(--bg)", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                + Nová poznámka
              </button>
            )}
          </div>
        )}

        {groups.map(group => (
          <div key={group.label ?? "all"}>
            {group.label && (
              <div style={{ fontSize:11, fontWeight:850, textTransform:"uppercase", letterSpacing:".07em", color:t.text3, padding:"10px 6px 5px" }}>
                {group.label}
              </div>
            )}
            {group.items.map(n => {
              const accentCol = noteAccentColor(n, projects);
              const isActive  = n.id === selId;
              const rawPreview = (n.content || "").replace(/<[^>]+>/g," ").replace(/#{1,3} /g,"").replace(/\*\*/g,"").replace(/\*/g,"").trim();
              const preview   = rawPreview.length > 100 ? rawPreview.slice(0, 100) + "…" : rawPreview;

              const status = NOTE_STATUSES[n.status] ?? NOTE_STATUSES.draft;
              const showActs = hoveredId === n.id || isActive;
              return (
                <div key={n.id} role="button" tabIndex={0}
                  onClick={()=>onSelect(n.id)}
                  onKeyDown={e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); onSelect(n.id); } }}
                  onMouseEnter={e=>{ setHoveredId(n.id); if(!isActive) e.currentTarget.style.background="rgba(255,255,255,.04)"; }}
                  onMouseLeave={e=>{ setHoveredId(id=>id===n.id?null:id); if(!isActive) e.currentTarget.style.background="transparent"; }}
                  style={{
                  display:"block", width:"100%", textAlign:"left",
                  padding:compact ? "7px 8px 7px 12px" : "11px 10px 11px 14px", borderRadius:compact ? 11 : 13, marginBottom:compact ? 3 : 6,
                  background:isActive ? "var(--accent-soft)" : "transparent",
                  border:`1px solid ${isActive ? "color-mix(in srgb, var(--accent) 38%, transparent)" : "transparent"}`,
                  cursor:"pointer", position:"relative", overflow:"hidden",
                  transition:"background .15s", opacity:n.archived ? 0.6 : 1,
                }}>
                  <div style={{ position:"absolute", left:0, top:11, bottom:11, width:3, borderRadius:4, background:accentCol, opacity:.95 }} />
                  <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"flex-start", marginBottom:4 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:5, minWidth:0 }}>
                      <span title={status.label} style={{ width:7, height:7, borderRadius:"50%", background:status.color, flexShrink:0 }} />
                      {n.icon && <span style={{ fontSize:13, flexShrink:0 }}>{n.icon}</span>}
                      {n.pinned && <PinIcon size={10} filled color="#f59e0b" />}
                      <span style={{ fontSize:13, fontWeight:800, color:isActive?"var(--accent)":t.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {n.title || <em style={{ fontWeight:400, color:t.text3 }}>Bez názvu</em>}
                      </span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:2, flexShrink:0 }}>
                      {showActs ? (
                        <>
                          <button onClick={e=>{ e.stopPropagation(); togglePin(n); }} title={n.pinned?"Odepnout":"Připnout"} aria-label="Připnout poznámku" style={{ display:"flex", padding:3, borderRadius:6, border:"none", background:"transparent", color:n.pinned?"#f59e0b":t.text3, cursor:"pointer" }}>
                            <PinIcon size={12} filled={n.pinned} color="currentColor" />
                          </button>
                          <button onClick={e=>{ e.stopPropagation(); toggleArchive(n); }} title={n.archived?"Obnovit z archivu":"Archivovat"} aria-label="Archivovat poznámku" style={{ display:"flex", padding:3, borderRadius:6, border:"none", background:"transparent", color:t.text3, cursor:"pointer" }}>
                            <Icon name="archive" size={12} color="currentColor" strokeWidth={2} />
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize:11, color:t.text3, whiteSpace:"nowrap" }}>{relTime(n.updatedAt)}</span>
                      )}
                    </div>
                  </div>
                  {preview && (
                    <div style={{ fontSize:12, color:t.text3, display:"-webkit-box", WebkitLineClamp:compact ? 1 : 2, WebkitBoxOrient:"vertical", overflow:"hidden", lineHeight:1.45, marginBottom:n.tags?.length ? 6 : 0 }}>
                      {preview}
                    </div>
                  )}
                  {n.tags?.length > 0 && (
                    <div style={{ display:"flex", gap:4, flexWrap:"nowrap", overflow:"hidden" }}>
                      {n.tags.slice(0,3).map(tag => {
                        const col = getTagColor(tag, globalTags) || "#aeb9d2";
                        return (
                          <button key={tag} onClick={e=>{ e.stopPropagation(); setSearch(tag); }} title={`Filtrovat: ${tag}`} style={{ fontSize:10.5, padding:"2px 6px", borderRadius:999, background:`${col}15`, color:col, border:`1px solid ${col}25`, whiteSpace:"nowrap", cursor:"pointer" }}>
                            {tag}
                          </button>
                        );
                      })}
                      {n.tags.length>3 && <span style={{ fontSize:10, color:t.text3 }}>+{n.tags.length-3}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{ padding:"7px 14px", borderTop:`1px solid ${t.border}`, fontSize:11.5, color:t.text3, flexShrink:0 }}>
        <button onClick={onCreate} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", height:38, borderRadius:11, border:"none", background:"linear-gradient(135deg, var(--accent), var(--accent-2))", color:"var(--bg)", fontWeight:900, fontSize:13, cursor:"pointer" }}>
          <Icon name="plus" size={14} color="currentColor" strokeWidth={2.6} /> Nová poznámka
        </button>
      </div>
    </div>
  );
}

/* ─── NotesPage ─────────────────────────────── */
export default function NotesPage() {
  const { t, dk, notes, addNote, updateNote, deleteNote, projects, tasks, addTask, openNoteId, setOpenNoteId, isMobile, loaded } = useApp();
  const toast   = useToast();
  const confirm = useConfirm();

  const [selId,          setSelId]          = useState(null);
  const [mobileView,     setMobileView]     = useState("list");
  const [templatePicker, setTemplatePicker] = useState(false);
  const [showProps,      setShowProps]      = useState(false);
  const [notesView,      setNotesView]      = useState("editor"); // "editor" | "gallery"

  useEffect(() => { injectNoteCSS(dk); }, [dk]);

  useEffect(() => {
    if (openNoteId) {
      setSelId(openNoteId);
      setOpenNoteId(null);
      if (isMobile) {
        setMobileView("detail");
        setShowProps(false);
      }
      else setShowProps(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNoteId]);

  useEffect(() => {
    if (!selId) return;
    if (!notes.some(n => n.id === selId)) setSelId(null);
  }, [notes, selId]);

  useEffect(() => {
    const handler = e => {
      const tag = document.activeElement?.tagName;
      if (tag==="INPUT"||tag==="TEXTAREA") return;
      if ((e.ctrlKey||e.metaKey)&&e.key==="n") { e.preventDefault(); setTemplatePicker(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleCreate = () => setTemplatePicker(true);

  const handleCreateFromTemplate = (tpl) => {
    const n = addNote({ title: tpl.title, content: mdToHtml(tpl.content) });
    setSelId(n.id);
    setTemplatePicker(false);
    if (isMobile) {
      setMobileView("detail");
      setShowProps(false);
    }
  };

  const handleDelete = async (id) => {
    if (!await confirm("Smazat poznámku?")) return;
    deleteNote(id);
    const remaining = notes.filter(n => n.id !== id);
    if (isMobile) {
      setSelId(remaining.length > 0 ? remaining[0].id : null);
      setMobileView("list");
    } else {
      setSelId(null);
    }
    toast("Poznámka smazána", "success");
  };

  const selNote = notes.find(n => n.id === selId) || null;

  const handleExportMD = useCallback(() => {
    if (!selNote) return;
    const content = document.querySelector('.note-blocknote')?.innerText || stripHtmlText(selNote.content || "");
    const blob = new Blob([`# ${selNote.title}\n\n${content}`], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: `${selNote.title || "poznamka"}.md` });
    a.click(); URL.revokeObjectURL(url);
  }, [selNote]);

  useEffect(() => {
    const createHandler = () => setTemplatePicker(true);
    const exportHandler = () => handleExportMD();
    const listHandler = () => setMobileView("list");
    window.addEventListener("notes:create", createHandler);
    window.addEventListener("notes:export-md", exportHandler);
    window.addEventListener("notes:open-list", listHandler);
    return () => {
      window.removeEventListener("notes:create", createHandler);
      window.removeEventListener("notes:export-md", exportHandler);
      window.removeEventListener("notes:open-list", listHandler);
    };
  }, [handleExportMD]);

  const showList = mobileView === "list";
  const showDetail = mobileView === "detail";

  if (!loaded) {
    return (
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {[...Array(3)].map((_, i) => {
          const skVars = dk ? { "--sk-base": "#1e2130", "--sk-hl": "#262b3d" } : { "--sk-base": "#e8e8ed", "--sk-hl": "#f5f5f7" };
          return (
            <div key={i} style={{ padding: "16px", borderRadius: 14, border: `1px solid ${t.border}`, background: t.card, ...skVars }}>
              <div className="skeleton" style={{ height: 16, width: "60%", borderRadius: 6, marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 11, width: "100%", borderRadius: 6, marginBottom: 6 }} />
              <div className="skeleton" style={{ height: 11, width: "80%", borderRadius: 6, marginBottom: 6 }} />
              <div className="skeleton" style={{ height: 10, width: 80, borderRadius: 6, marginTop: 12 }} />
            </div>
          );
        })}
      </div>
    );
  }

  if (!isMobile) {
    return (
      <div style={{ height: "100%", minHeight: 0, position: "relative" }}>
        {templatePicker && (
          <TemplatePickerModal onSelect={handleCreateFromTemplate} onClose={() => setTemplatePicker(false)} />
        )}

        <div className={`notes-workspace ${showProps && selNote && notesView !== "gallery" ? "" : "no-props"}`}>
          <div className="notes-workspace-panel">
            <NotesSidebar
              notes={notes}
              selId={selId}
              onSelect={(id) => { setSelId(id); setShowProps(true); setNotesView("editor"); }}
              onCreate={handleCreate}
              t={t}
              projects={projects}
              view={notesView}
              onSetView={setNotesView}
            />
          </div>

          {notesView === "gallery" ? (
            <div className="notes-page-empty">
              <div className="notes-grid-shell">
                <NotesAtlasGrid
                  notes={notes}
                  projects={projects}
                  onCreate={handleCreate}
                  onOpenNote={(id) => { setSelId(id); setShowProps(true); setNotesView("editor"); }}
                />
              </div>
            </div>
          ) : selNote ? (
            <div className="notes-editor-shell">
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, background: t.bg }}>
                <NoteEditor
                  key={selNote.id}
                  note={selNote}
                  onSave={upd => updateNote(selNote.id, upd)}
                  t={t}
                  dk={dk}
                  isMobile={false}
                  showProps={showProps}
                  onToggleProps={() => setShowProps(v => !v)}
                  onDelete={() => handleDelete(selNote.id)}
                  onTogglePin={() => updateNote(selNote.id, { pinned: !selNote.pinned })}
                  projects={projects}
                  tasks={tasks}
                  addTask={addTask}
                />
              </div>
              {showProps && (
                <div className="notes-props-desktop" style={{ display:"contents" }}>
                  <NotePropertiesPanel
                    note={selNote}
                    onClose={() => setShowProps(false)}
                    t={t}
                    isMobile={false}
                    onExportMD={handleExportMD}
                    projects={projects}
                    tasks={tasks}
                    addTask={addTask}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="notes-page-empty">
              <div className="notes-grid-shell">
                <NotesAtlasGrid
                  notes={notes}
                  projects={projects}
                  onCreate={handleCreate}
                  onOpenNote={(id) => { setSelId(id); setShowProps(true); }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {templatePicker && (
        <TemplatePickerModal onSelect={handleCreateFromTemplate} onClose={() => setTemplatePicker(false)} />
      )}

      {showList && (
        <div style={{ width: "100%", minWidth: "auto", overflow: "hidden", flex: 1 }}>
          <NotesSidebar
            notes={notes}
            selId={selId}
            onSelect={(id) => { setSelId(id); setShowProps(false); setMobileView("detail"); }}
            onCreate={handleCreate}
            t={t}
            projects={projects}
          />
        </div>
      )}

      {showDetail && (
        <div style={{ flex: 1, display: "flex", overflow: "hidden", minWidth: 0 }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "none", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${t.border}`, background: t.bg2, zIndex: 50 }}>
            <button onClick={() => setMobileView("list")} style={{ background: "none", border: "none", color: t.accent, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              <Icon name="chevron-left" size={16} color={t.accent} strokeWidth={2.5} />
              Zpět
            </button>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selNote?.title || "Nová poznámka"}
            </span>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, background: t.bg }}>
            {selNote ? (
              <NoteEditor
                key={selNote.id}
                note={selNote}
                onSave={upd => updateNote(selNote.id, upd)}
                t={t}
                dk={dk}
                isMobile
                showProps={showProps}
                onToggleProps={() => setShowProps(v => !v)}
                onDelete={() => handleDelete(selNote.id)}
                onTogglePin={() => updateNote(selNote.id, { pinned: !selNote.pinned })}
                    projects={projects}
                    tasks={tasks}
                    addTask={addTask}
                  />
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: t.text3, gap: 12 }}>
                <div style={{ opacity: 0.08 }}><Icon name="file-text" size={72} color={t.text} strokeWidth={0.75} /></div>
                <div style={{ fontSize: 16, fontWeight: 700, color: t.text2, fontFamily: "var(--font-ui)" }}>Žádná poznámka vybrána</div>
                <div style={{ fontSize: 13 }}>Vyber ze seznamu nebo vytvoř novou</div>
                <button onClick={handleCreate} style={{ marginTop: 4, padding: "9px 22px", borderRadius: 10, border: "none", background: "var(--accent)", color: "var(--bg)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  + Nová poznámka
                </button>
              </div>
            )}
          </div>

          {showProps && selNote && (
            <NotePropertiesPanel
              note={selNote}
              onClose={() => setShowProps(false)}
              t={t}
              isMobile
              onExportMD={handleExportMD}
              projects={projects}
              tasks={tasks}
              addTask={addTask}
            />
          )}
        </div>
      )}
    </div>
  );
}
