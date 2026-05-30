import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { useConfirm } from '../components/Confirm.jsx'
import Icon from '../components/Icon.jsx'
import { NOTE_TEMPLATES, NOTE_STATUSES } from '../constants.js'
import { projectColor, relTime } from '../utils.js'
import { supabase } from '../supabase.js'
import { compareText, formatDate, formatDateTime } from '../locale.js'


const CURATED_TAG_COLORS = ["#38bdf8", "#34d399", "#fb7185", "#f472b6", "#fbbf24", "#a78bfa", "#c084fc", "#60a5fa", "#2dd4bf", "#fb923c"];
const getRandomTagColor = () => CURATED_TAG_COLORS[Math.floor(Math.random() * CURATED_TAG_COLORS.length)];

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
  if (/<[a-z]/i.test(content)) return content;
  return mdToHtml(content);
}

/* ─── Pin SVG icon ─────────────────────────── */
function PinIcon({ size = 14, filled = false, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M12 17v5" />
      <path d="M9 10.5H5l1.5-2V4h11v4.5L16 10.5h-4z" />
      <path d="M9 10.5v3a3 3 0 006 0v-3" />
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

/* ─── Slash commands ────────────────────────── */
const SLASH_COMMANDS = [
  { id:"h1",      label:"Nadpis 1",  icon:"type",         desc:"Velký nadpis"      },
  { id:"h2",      label:"Nadpis 2",  icon:"type",         desc:"Střední nadpis"    },
  { id:"h3",      label:"Nadpis 3",  icon:"type",         desc:"Malý nadpis"       },
  { id:"ul",      label:"Odrážky",   icon:"list",         desc:"Odrážkový seznam"  },
  { id:"ol",      label:"Číslování", icon:"list",         desc:"Číslovaný seznam"  },
  { id:"todo",    label:"To-do",     icon:"check-square", desc:"Akční bod s checkboxem" },
  { id:"quote",   label:"Citace",    icon:"align-left",   desc:"Blok citace"       },
  { id:"callout", label:"Callout",   icon:"alert-circle", desc:"Zvýrazněný blok"   },
  { id:"table",   label:"Tabulka",   icon:"file-text",    desc:"Tabulka 2×2"       },
  { id:"code",    label:"Kód",       icon:"code",         desc:"Blok kódu"         },
  { id:"divider", label:"Oddělovač", icon:"minus",        desc:"Vodorovná linka"   },
];

const TEXT_COLORS = [
  { c:"#ef4444", l:"Červená" }, { c:"#f97316", l:"Oranžová" }, { c:"#eab308", l:"Žlutá" },
  { c:"#22c55e", l:"Zelená"  }, { c:"#3b82f6", l:"Modrá"    }, { c:"#8b5cf6", l:"Fialová"},
  { c:"#ec4899", l:"Růžová"  }, { c:"#94a3b8", l:"Šedá"     }, { c:"currentColor", l:"Výchozí" },
];
const BG_COLORS = [
  { c:"#fef2f2", l:"Červené" }, { c:"#fff7ed", l:"Oranžové" }, { c:"#fefce8", l:"Žluté" },
  { c:"#f0fdf4", l:"Zelené"  }, { c:"#eff6ff", l:"Modré"    }, { c:"#f5f3ff", l:"Fialové"},
  { c:"#fdf4ff", l:"Růžové"  }, { c:"rgba(255,255,255,.12)", l:"Bílé" }, { c:"transparent", l:"Žádné" },
];

/* ─── NoteEditor ────────────────────────────── */
function NoteEditor({ note, onSave, t, isMobile, showProps, onToggleProps, onDelete, onTogglePin, projects, tasks, addTask, activeWorkspaceId }) {
  const { tags: globalTags } = useApp();
  const editorRef   = useRef(null);
  const titleRef    = useRef(null);
  const saveTimer   = useRef(null);
  const savedRange  = useRef(null);
  const slashRangeRef = useRef(null);

  const [title,     setTitle]     = useState(note.title);
  const [saveState, setSaveState] = useState("idle");
  const [aiOpen,    setAiOpen]    = useState(false);
  const [aiAction,  setAiAction]  = useState(null);
  const [aiLoading, setAiLoading] = useState(null);
  const [aiResult,  setAiResult]  = useState(null);

  // Slash command menu
  const [slashMenu,  setSlashMenu]  = useState(null); // { x, y, query } | null
  const [slashIdx,   setSlashIdx]   = useState(0);

  // Color picker
  const [colorMenu,  setColorMenu]  = useState(null); // "text" | "bg" | null
  const [colorPos,   setColorPos]   = useState({ x:0, y:0 });

  useEffect(() => {
    setTitle(note.title);
    if (titleRef.current) titleRef.current.value = note.title;
    if (editorRef.current) editorRef.current.innerHTML = initEditorContent(note.content);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  // Close slash menu on outside click
  useEffect(() => {
    if (!slashMenu) return;
    const handler = (e) => {
      if (!editorRef.current?.contains(e.target)) setSlashMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [slashMenu]);

  // Close color menu on outside click
  useEffect(() => {
    if (!colorMenu) return;
    const handler = () => setColorMenu(null);
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [colorMenu]);

  const triggerSave = useCallback((data) => {
    setSaveState("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await onSave(data);
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
      } catch { setSaveState("idle"); }
    }, 700);
  }, [onSave]);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    triggerSave({ title: e.target.value, content: editorRef.current?.innerHTML || "" });
  };

  const handleContentInput = useCallback(() => {
    triggerSave({ title: titleRef.current?.value || title, content: editorRef.current?.innerHTML || "" });
  }, [triggerSave, title]);

  const saveRange = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.getRangeAt(0).startContainer)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreRange = () => {
    if (!savedRange.current) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange.current);
  };

  const exec = useCallback((cmd, value = null) => {
    editorRef.current?.focus();
    restoreRange();
    document.execCommand(cmd, false, value);
    handleContentInput();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleContentInput]);

  // Ensure cursor is at a new block line before inserting block elements
  const ensureNewLine = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    let node = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    const BLOCKS = ["P","H1","H2","H3","H4","H5","H6","LI","BLOCKQUOTE","DIV","PRE","TABLE"];
    let block = node;
    while (block && block !== editorRef.current && !BLOCKS.includes(block.tagName?.toUpperCase())) {
      block = block.parentNode;
    }
    if (block && block !== editorRef.current && (block.textContent || "").trim() !== "") {
      const endRange = document.createRange();
      endRange.selectNodeContents(block);
      endRange.collapse(false);
      sel.removeAllRanges();
      sel.addRange(endRange);
      document.execCommand("insertParagraph", false, null);
    }
  }, []);

  const insertHtml = useCallback((html) => {
    editorRef.current?.focus();
    restoreRange();
    document.execCommand("insertHTML", false, html);
    handleContentInput();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleContentInput]);

  // Todo uses direct DOM insertion so checkbox doesn't get stripped
  const insertTodo = useCallback(() => {
    editorRef.current?.focus();
    restoreRange();
    ensureNewLine();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    range.collapse(true);

    const wrap = document.createElement("div");
    wrap.setAttribute("data-type", "todo");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.addEventListener("change", (e) => {
      const parent = e.target.closest("[data-type='todo']");
      if (parent) parent.classList.toggle("done", e.target.checked);
      triggerSave({ title: titleRef.current?.value || "", content: editorRef.current?.innerHTML || "" });
    });
    const span = document.createElement("span");
    span.textContent = "Nový akční bod";
    wrap.appendChild(cb);
    wrap.appendChild(span);
    range.insertNode(wrap);

    // Place cursor inside span
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    newRange.collapse(false);
    sel.removeAllRanges();
    sel.addRange(newRange);
    handleContentInput();
  }, [ensureNewLine, handleContentInput, triggerSave]);

  const insertCallout = useCallback(() => {
    editorRef.current?.focus();
    restoreRange();
    ensureNewLine();
    document.execCommand("insertHTML", false, `<div class="callout"><span class="callout-icon">💡</span><div><strong>Poznámka:</strong> doplň obsah callout bloku.</div></div><p><br></p>`);
    handleContentInput();
  }, [ensureNewLine, handleContentInput]);

  const insertTable = useCallback(() => {
    editorRef.current?.focus();
    restoreRange();
    ensureNewLine();
    document.execCommand("insertHTML", false, `<table><tr><th>Věc</th><th>Stav</th></tr><tr><td>Položka 1</td><td>Přidat</td></tr></table><p><br></p>`);
    handleContentInput();
  }, [ensureNewLine, handleContentInput]);

  const insertCodeBlock = useCallback(() => {
    editorRef.current?.focus();
    restoreRange();
    ensureNewLine();
    document.execCommand("insertHTML", false, `<pre><code>// kód zde</code></pre><p><br></p>`);
    handleContentInput();
  }, [ensureNewLine, handleContentInput]);

  const insertDivider = useCallback(() => {
    editorRef.current?.focus();
    restoreRange();
    document.execCommand("insertHTML", false, `<hr><p><br></p>`);
    handleContentInput();
  }, [handleContentInput]);

  const insertInlineCode = useCallback(() => {
    editorRef.current?.focus();
    restoreRange();
    const sel = window.getSelection();
    if (sel && sel.toString().length > 0) {
      document.execCommand("insertHTML", false, `<code>${sel.toString()}</code>`);
    } else {
      document.execCommand("insertHTML", false, `<code>kód</code>`);
    }
    handleContentInput();
  }, [handleContentInput]);

  // ── Slash command detection ──────────────────
  const getSlashFiltered = (query) =>
    SLASH_COMMANDS.filter(c =>
      !query || c.label.toLowerCase().includes(query) || c.id.includes(query)
    );

  const checkSlashMenu = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) { setSlashMenu(null); return; }
    const range = sel.getRangeAt(0);
    if (!range.collapsed) { setSlashMenu(null); return; }
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) { setSlashMenu(null); return; }
    const text = node.textContent.slice(0, range.startOffset);
    const slashIdx = text.lastIndexOf("/");
    if (slashIdx === -1) { setSlashMenu(null); return; }
    const between = text.slice(slashIdx + 1);
    if (/\s/.test(between)) { setSlashMenu(null); return; }

    // Store range at slash for deletion
    const slashRange = range.cloneRange();
    slashRange.setStart(node, slashIdx);
    slashRangeRef.current = slashRange;

    const rect = slashRange.getBoundingClientRect();
    setSlashMenu({ x: rect.left, y: rect.bottom + 6, query: between.toLowerCase() });
    setSlashIdx(0);
  }, []);

  const executeSlashCommand = useCallback((cmdId) => {
    setSlashMenu(null);
    // Delete "/query" text
    if (slashRangeRef.current) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        const curRange = sel.getRangeAt(0);
        const delRange = slashRangeRef.current.cloneRange();
        delRange.setEnd(curRange.startContainer, curRange.startOffset);
        delRange.deleteContents();
        sel.removeAllRanges();
        sel.addRange(delRange);
        delRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(delRange);
      }
    }
    editorRef.current?.focus();
    switch (cmdId) {
      case "h1":      document.execCommand("formatBlock", false, "h1"); break;
      case "h2":      document.execCommand("formatBlock", false, "h2"); break;
      case "h3":      document.execCommand("formatBlock", false, "h3"); break;
      case "ul":      document.execCommand("insertUnorderedList", false, null); break;
      case "ol":      document.execCommand("insertOrderedList",   false, null); break;
      case "todo":    insertTodo(); return;
      case "quote":   document.execCommand("formatBlock", false, "blockquote"); break;
      case "callout": insertCallout(); return;
      case "table":   insertTable(); return;
      case "code":    insertCodeBlock(); return;
      case "divider": insertDivider(); return;
    }
    handleContentInput();
  }, [insertTodo, insertCallout, insertTable, insertCodeBlock, insertDivider, handleContentInput]);

  const handleEditorKeyDown = (e) => {
    if (slashMenu) {
      const filtered = getSlashFiltered(slashMenu.query);
      if (e.key === "ArrowDown") { e.preventDefault(); setSlashIdx(i => Math.min(i+1, filtered.length-1)); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSlashIdx(i => Math.max(i-1, 0)); return; }
      if (e.key === "Enter")     { e.preventDefault(); if (filtered[slashIdx]) executeSlashCommand(filtered[slashIdx].id); return; }
      if (e.key === "Escape")    { e.preventDefault(); setSlashMenu(null); return; }
    }
  };

  const handleEditorKeyUp = (e) => {
    if (e.key === "Escape") return;
    checkSlashMenu();
  };

  // AI
  const runAI = async (action) => {
    setAiLoading(action); setAiResult(null); setAiAction(action);
    try {
      const { data, error } = await supabase.functions.invoke("ai-task-assist", {
        body: { action, note: { title: note.title, content: editorRef.current?.innerText || "" }, workspaceId: activeWorkspaceId },
      });
      if (error) {
        const msg = error.message || String(error);
        if (msg.includes("non-2xx") || error.status === 401) {
          setAiResult("Chyba: AI služba je momentálně nedostupná (problém s přihlášením nebo vypršela relace). Zkus se odhlásit a znovu přihlásit.");
        } else if (error.status === 429 || msg.includes("Rate limit")) {
          setAiResult("Chyba: Příliš mnoho AI dotazů — zkus to za hodinu.");
        } else {
          setAiResult("Chyba: " + msg);
        }
        return;
      }
      if (data?.error) {
        const dErr = data.error;
        if (dErr.includes("non-2xx") || dErr.includes("Unauthorized")) {
          setAiResult("Chyba: AI služba je momentálně nedostupná (problém s přihlášením nebo vypršela relace). Zkus se odhlásit a znovu přihlásit.");
        } else if (dErr.includes("Rate limit") || dErr.includes("429")) {
          setAiResult("Chyba: Příliš mnoho AI dotazů — zkus to za hodinu.");
        } else {
          setAiResult("Chyba: " + dErr);
        }
        return;
      }
      const raw = data?.result ?? "";
      if (action === "note_extract_tasks") {
        try { const c = raw.replace(/^```[a-z]*\n?/i,"").replace(/```$/,"").trim(); setAiResult(JSON.parse(c)); }
        catch { setAiResult([raw]); }
      } else setAiResult(raw);
    } catch (e) {
      const msg = e.message || String(e);
      if (msg.includes("non-2xx")) {
        setAiResult("Chyba: AI služba je momentálně nedostupná (problém s přihlášením nebo vypršela relace). Zkus se odhlásit a znovu přihlásit.");
      } else {
        setAiResult("Chyba: " + msg);
      }
    }
    finally { setAiLoading(null); }
  };

  const applyAI = () => {
    if (typeof aiResult === "string" && aiResult.trim()) {
      insertHtml("<p>" + aiResult.replace(/\n/g, "<br>") + "</p>");
    } else if (aiAction === "note_extract_tasks" && Array.isArray(aiResult)) {
      aiResult.forEach(text => { if (typeof text === "string" && text.trim()) addTask({ title: text.trim() }); });
    }
    setAiResult(null); setAiAction(null);
  };

  const statusInfo    = NOTE_STATUSES[note.status] ?? NOTE_STATUSES.draft;
  const linkedProject = note.primaryProjectId ? projects.find(p => p.id === note.primaryProjectId) : null;
  const linkedTask    = note.primaryTaskId    ? tasks.find(tk => tk.id === note.primaryTaskId)     : null;

  // Format bar helpers
  const FmtBtn = ({ label, title: ttl, onClick, mono, active }) => (
    <button
      onMouseDown={e => { e.preventDefault(); saveRange(); onClick(); }}
      title={ttl}
      style={{
        height:30, border:"none", borderRadius:8,
        background: active ? `${t.accent}22` : "transparent",
        color: active ? t.accent : t.text2,
        padding:"0 9px", fontWeight:700, fontSize:13, cursor:"pointer", whiteSpace:"nowrap",
        fontFamily: mono ? "'JetBrains Mono',monospace" : "inherit",
        transition:"background .1s",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,.07)"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >{label}</button>
  );

  const FmtDivider = () => <div style={{ width:1, height:18, background:t.border, flexShrink:0, margin:"0 2px" }} />;

  const slashFiltered = slashMenu ? getSlashFiltered(slashMenu.query) : [];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden", position:"relative" }}>

      {/* Slash command popup */}
      {slashMenu && slashFiltered.length > 0 && (
        <div style={{
          position:"fixed", left:Math.min(slashMenu.x, window.innerWidth - 260), top:slashMenu.y,
          zIndex:500, width:240, background:t.bg2, border:`1px solid ${t.border}`,
          borderRadius:12, boxShadow:t.shadow, overflow:"hidden",
        }}>
          <div style={{ padding:"6px 10px 4px", fontSize:11, color:t.text3, fontWeight:700, borderBottom:`1px solid ${t.border}` }}>
            Příkazy{slashMenu.query ? ` · ${slashMenu.query}` : ""}
          </div>
          {slashFiltered.map((cmd, i) => (
            <div key={cmd.id}
              onMouseDown={e => { e.preventDefault(); executeSlashCommand(cmd.id); }}
              style={{
                display:"flex", alignItems:"center", gap:10, padding:"8px 12px",
                background: i === slashIdx ? t.accentBg : "transparent",
                color: i === slashIdx ? t.accent : t.text2,
                cursor:"pointer", transition:"background .08s",
              }}
              onMouseEnter={() => setSlashIdx(i)}
            >
              <div style={{ width:28, height:28, borderRadius:7, background: i===slashIdx ? `${t.accent}22` : "rgba(255,255,255,.06)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Icon name={cmd.icon} size={13} color={i===slashIdx ? t.accent : t.text3} strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:700 }}>{cmd.label}</div>
                <div style={{ fontSize:11, color:t.text3, marginTop:1 }}>{cmd.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Color picker popup */}
      {colorMenu && (
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{
            position:"fixed", left:colorPos.x, top:colorPos.y, zIndex:500,
            background:t.bg2, border:`1px solid ${t.border}`, borderRadius:12, boxShadow:t.shadow,
            padding:12, width:200,
          }}
        >
          <div style={{ fontSize:11, fontWeight:700, color:t.text3, marginBottom:8 }}>
            {colorMenu === "text" ? "Barva textu" : "Zvýraznění"}
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {(colorMenu === "text" ? TEXT_COLORS : BG_COLORS).map(({c,l}) => (
              <button key={c} title={l}
                onMouseDown={e => {
                  e.preventDefault();
                  setColorMenu(null);
                  editorRef.current?.focus();
                  restoreRange();
                  if (colorMenu === "text") {
                    document.execCommand("foreColor", false, c === "currentColor" ? "inherit" : c);
                  } else {
                    document.execCommand("hiliteColor", false, c);
                  }
                  handleContentInput();
                }}
                style={{
                  width:22, height:22, borderRadius:6, border:`2px solid ${t.border}`,
                  background: c, cursor:"pointer", flexShrink:0,
                  boxSizing:"border-box",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Topbar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:`1px solid ${t.border}`, padding:"0 20px", height:52, flexShrink:0, background:t.bg2 }}>
        <div style={{ display:"flex", alignItems:"center", gap:7, fontSize:13, color:t.text3, minWidth:0 }}>
          <span>Poznámky</span>
          <span style={{ opacity:.5 }}>›</span>
          <span style={{ color:t.text, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{note.title || "Bez názvu"}</span>
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
          <button onClick={onTogglePin} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:8, border:`1px solid ${note.pinned ? "#f59e0b" : t.border}`, background:note.pinned ? "#f59e0b18" : "transparent", color:note.pinned ? "#f59e0b" : t.text3, fontSize:12, fontWeight:700, cursor:"pointer" }}>
            <PinIcon size={13} filled={note.pinned} color="currentColor" />
          </button>
          <button onClick={onToggleProps} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:8, border:`1px solid ${showProps ? t.accent+"60" : t.border}`, background:showProps ? t.accentBg : "transparent", color:showProps ? t.accent : t.text3, fontSize:12, fontWeight:700, cursor:"pointer" }}>
            <Icon name="settings" size={13} color="currentColor" strokeWidth={2} />
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

        {/* Sticky formatbar */}
        <div style={{
          position:"sticky", top:0, zIndex:6,
          padding:"10px 28px 0",
          background:`linear-gradient(180deg, ${t.bg} 0%, ${t.bg}ec 70%, ${t.bg}00 100%)`,
          pointerEvents:"none",
        }}>
          <div style={{
            display:"flex", alignItems:"center", gap:3, flexWrap:"nowrap", overflowX:"auto",
            width:"fit-content", maxWidth:"100%",
            padding:"6px 8px",
            borderRadius:14, border:`1px solid ${t.border}`,
            background:t.bg2, boxShadow:t.shadow,
            pointerEvents:"all",
          }}>
            <select
              onChange={e => { saveRange(); exec("formatBlock", e.target.value); e.target.value = "p"; }}
              style={{ height:30, border:`1px solid ${t.border}`, borderRadius:8, background:t.input, color:t.text2, padding:"0 8px", fontSize:12, fontWeight:700, cursor:"pointer", outline:"none" }}
              defaultValue="p"
            >
              <option value="p">Text</option>
              <option value="h1">Nadpis 1</option>
              <option value="h2">Nadpis 2</option>
              <option value="h3">Nadpis 3</option>
              <option value="blockquote">Citace</option>
            </select>
            <FmtDivider />
            <FmtBtn label="B" ttl="Tučné (Ctrl+B)" onClick={()=>exec("bold")} />
            <FmtBtn label={<em style={{fontStyle:"italic"}}>I</em>} ttl="Kurzíva (Ctrl+I)" onClick={()=>exec("italic")} />
            <FmtBtn label={<u>U</u>} ttl="Podtržení (Ctrl+U)" onClick={()=>exec("underline")} />
            <FmtBtn label={<s>S</s>} ttl="Přeškrtnutí" onClick={()=>exec("strikeThrough")} />
            <FmtBtn label={<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12}}>{"<>"}</span>} ttl="Inline kód" onClick={insertInlineCode} mono />
            <FmtDivider />
            <FmtBtn label="• Odrážky" ttl="Odrážkový seznam" onClick={()=>exec("insertUnorderedList")} />
            <FmtBtn label="1. Číslování" ttl="Číslovaný seznam" onClick={()=>exec("insertOrderedList")} />
            <FmtBtn label="☑ To-do" ttl="Akční bod s checkboxem" onClick={insertTodo} />
            <FmtDivider />
            <FmtBtn label="🔗 Odkaz" ttl="Vložit odkaz" onClick={()=>{ saveRange(); const url=prompt("URL:","https://"); if(url) { restoreRange(); document.execCommand("createLink",false,url); handleContentInput(); } }} />
            <FmtBtn label="💡 Callout" ttl="Callout blok" onClick={insertCallout} />
            <FmtBtn label="▦ Tabulka" ttl="Vložit tabulku" onClick={insertTable} />
            <FmtBtn label="</> Kód" ttl="Blok kódu" onClick={insertCodeBlock} />
            <FmtBtn label="— Oddělovač" ttl="Vodorovná linka" onClick={insertDivider} />
            <FmtDivider />
            {/* Text color */}
            <button
              onMouseDown={e => {
                e.preventDefault();
                saveRange();
                const rect = e.currentTarget.getBoundingClientRect();
                setColorPos({ x: rect.left, y: rect.bottom + 4 });
                setColorMenu(v => v === "text" ? null : "text");
              }}
              title="Barva textu"
              style={{ height:30, border:"none", borderRadius:8, background: colorMenu==="text" ? `${t.accent}22` : "transparent", color:t.text2, padding:"0 8px", fontWeight:700, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}
            >
              <span style={{ fontWeight:900 }}>A</span>
              <div style={{ width:14, height:3, borderRadius:2, background:"#ef4444" }} />
            </button>
            {/* Highlight */}
            <button
              onMouseDown={e => {
                e.preventDefault();
                saveRange();
                const rect = e.currentTarget.getBoundingClientRect();
                setColorPos({ x: rect.left, y: rect.bottom + 4 });
                setColorMenu(v => v === "bg" ? null : "bg");
              }}
              title="Zvýraznění"
              style={{ height:30, border:"none", borderRadius:8, background: colorMenu==="bg" ? `${t.accent}22` : "transparent", color:t.text2, padding:"0 8px", fontWeight:700, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:3 }}
            >
              <span>Aa</span>
              <div style={{ width:14, height:10, borderRadius:2, background:"#eab308", opacity:.8 }} />
            </button>
            <FmtDivider />
            <FmtBtn label="✨ Zestručnit" ttl="AI shrnutí" onClick={()=>{ setAiOpen(true); runAI("note_summary"); }} />
          </div>
        </div>

        {/* Page content */}
        <div style={{ width:"min(740px, calc(100% - 56px))", margin:"0 auto", padding:"16px 0 100px" }}>
          {/* Page icon */}
          <div
            style={{ width:52, height:52, borderRadius:14, display:"grid", placeItems:"center", fontSize:26, background:"rgba(255,255,255,.055)", border:`1px solid ${t.border}`, marginBottom:14, cursor:"text" }}
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
            placeholder="Bez názvu"
            style={{
              width:"100%", border:"none", background:"transparent", color:t.text, outline:"none",
              fontFamily:"var(--font-ui)",
              fontSize:"clamp(32px, 4vw, 50px)", fontWeight:900, letterSpacing:"-.04em", lineHeight:1.04,
              marginBottom:12, display:"block",
            }}
          />

          {/* Meta-line */}
          <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", color:t.text3, fontSize:12, paddingBottom:18, borderBottom:`1px solid ${t.border}`, marginBottom:22 }}>
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
            <span style={{ background:statusInfo.bg, color:statusInfo.color, border:`1px solid ${statusInfo.color}40`, padding:"3px 9px", borderRadius:999, fontWeight:700, fontSize:12 }}>
              {statusInfo.label}
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

          {/* Contenteditable */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="note-ce"
            onInput={handleContentInput}
            onBlur={saveRange}
            onKeyDown={handleEditorKeyDown}
            onKeyUp={handleEditorKeyUp}
            data-placeholder="Začni psát… nebo napiš / pro příkazy"
            style={{ outline:"none" }}
          />
        </div>

        {/* Bottom slash quick commands */}
        <div style={{ position:"sticky", bottom:16, display:"flex", justifyContent:"center", pointerEvents:"none", zIndex:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 10px", border:`1px solid ${t.border}`, borderRadius:16, background:t.bg2, boxShadow:t.shadow, pointerEvents:"all" }}>
            {[
              { label:"/nadpis", fn:()=>exec("formatBlock","h2") },
              { label:"/todo",   fn:insertTodo },
              { label:"/citace", fn:()=>exec("formatBlock","blockquote") },
              { label:"/callout",fn:insertCallout },
              { label:"/tabulka",fn:insertTable },
              { label:"/kód",    fn:insertCodeBlock },
            ].map(cmd => (
              <button key={cmd.label} onMouseDown={e=>{ e.preventDefault(); saveRange(); cmd.fn(); }} style={{
                border:`1px solid rgba(255,255,255,.06)`, background:"rgba(255,255,255,.04)",
                color:t.text2, borderRadius:10, padding:"6px 10px", fontWeight:700, fontSize:12,
                cursor:"pointer", transition:"all .12s",
              }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor=`${t.accent}50`; e.currentTarget.style.background=t.accentBg; e.currentTarget.style.color=t.accent; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor="rgba(255,255,255,.06)"; e.currentTarget.style.background="rgba(255,255,255,.04)"; e.currentTarget.style.color=t.text2; }}
              >{cmd.label}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── NotePropertiesPanel ───────────────────── */
function NotePropertiesPanel({ note, onClose, t, isMobile, onExportMD, projects, tasks, addTask, activeWorkspaceId }) {
  const { updateNote, tags: globalTags, addTag: createGlobalTag } = useApp();
  const toast = useToast();
  const [tagInput,        setTagInput]        = useState("");
  const [showAllProjects, setShowAllProjects] = useState(true);
  const [showAllTasks,    setShowAllTasks]    = useState(false);
  const [taskSearch,      setTaskSearch]      = useState("");

  const statusInfo    = NOTE_STATUSES[note.status] ?? NOTE_STATUSES.draft;
  const linkedProject = note.primaryProjectId ? projects.find(p => p.id === note.primaryProjectId) : null;
  const linkedTask    = note.primaryTaskId    ? tasks.find(tk => tk.id === note.primaryTaskId)     : null;

  const addTag = (raw) => {
    const rawClean = raw.trim().replace(/\s+/g, "-");
    if (!rawClean) return;
    
    if (note.tags?.some(t2 => t2.trim().toLowerCase() === rawClean.toLowerCase())) return;

    const matchedGlobal = globalTags?.find(gt => gt.name.trim().toLowerCase() === rawClean.toLowerCase());
    
    let tagNameForNote = rawClean;
    if (matchedGlobal) {
      tagNameForNote = matchedGlobal.name;
    } else {
      const randomColor = getRandomTagColor();
      createGlobalTag({ name: rawClean, color: randomColor });
    }

    const nextTags = [...(note.tags || []), tagNameForNote];
    updateNote(note.id, { tags: nextTags });
  };
  const removeTag = (tag) => updateNote(note.id, { tags: note.tags.filter(t2 => t2 !== tag) });

  const handleTagKey = (e) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) { e.preventDefault(); addTag(tagInput); setTagInput(""); }
    else if (e.key === "Backspace" && !tagInput && note.tags.length) removeTag(note.tags[note.tags.length-1]);
  };

  const runAIExtract = async () => {
    try {
      const content = document.querySelector('.note-ce')?.innerText || "";
      const { data, error } = await supabase.functions.invoke("ai-task-assist", {
        body: { action:"note_extract_tasks", note:{ title:note.title, content }, workspaceId: activeWorkspaceId },
      });
      if (error) {
        const msg = error.message || String(error);
        if (msg.includes("non-2xx") || error.status === 401) {
          toast("AI služba je momentálně nedostupná (problém s přihlášením nebo vypršela relace). Zkus se odhlásit a znovu přihlásit.", "error");
        } else if (error.status === 429 || msg.includes("Rate limit")) {
          toast("Příliš mnoho AI dotazů — zkus to za hodinu.", "error");
        } else {
          toast(`Chyba AI extrakce: ${msg}`, "error");
        }
        return;
      }
      if (data?.error) {
        const msg = data.error;
        if (msg.includes("non-2xx") || msg.includes("Unauthorized")) {
          toast("AI služba je momentálně nedostupná (problém s přihlášením nebo vypršela relace). Zkus se odhlásit a znovu přihlásit.", "error");
        } else if (msg.includes("Rate limit") || msg.includes("429")) {
          toast("Příliš mnoho AI dotazů — zkus to za hodinu.", "error");
        } else {
          toast(`Chyba AI extrakce: ${msg}`, "error");
        }
        return;
      }
      const raw = data?.result ?? "";
      try {
        const c = raw.replace(/^```[a-z]*\n?/i,"").replace(/```$/,"").trim();
        const extracted = JSON.parse(c);
        let count = 0;
        extracted.forEach(text => {
          if (typeof text === "string" && text.trim()) {
            addTask({ title: text.trim() });
            count++;
          }
        });
        if (count > 0) {
          toast(`Úspěšně vytvořeno ${count} úkolů z textu ✨`, "success");
        } else {
          toast("V textu nebyly nalezeny žádné úkoly", "info");
        }
      } catch {
        if (raw.trim()) {
          addTask({ title: raw.trim() });
          toast("Vytvořen úkol z textu ✨", "success");
        } else {
          toast("V textu nebyly nalezeny žádné úkoly", "info");
        }
      }
    } catch (e) {
      const errMsg = e?.message || String(e);
      if (errMsg.includes("non-2xx")) {
        toast("Chyba přihlášení k AI službám. Odhlaste se a znovu přihlaste.", "error");
      } else {
        toast("Chyba extrakce úkolů — zkus to znovu", "error");
      }
    }
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
    ? { position:"fixed", inset:0, zIndex:300, background:t.bg2, overflowY:"auto" }
    : { width:310, minWidth:310, borderLeft:`1px solid ${t.border}`, background:t.bg2, overflowY:"auto", flexShrink:0 };

  const filteredTasks = tasks.filter(tk =>
    !taskSearch || (tk.title || "").toLowerCase().includes(taskSearch.toLowerCase())
  );

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 14px 10px", borderBottom:`1px solid ${t.border}`, position:"sticky", top:0, background:t.bg2, zIndex:1 }}>
        <span style={{ fontSize:13, fontWeight:850, color:t.text }}>Vlastnosti poznámky</span>
        <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", padding:4, display:"flex", color:t.text3 }}>
          <Icon name="x" size={15} color={t.text3} strokeWidth={2} />
        </button>
      </div>

      <div style={{ padding:"10px 12px 24px" }}>

        {/* Core properties */}
        <PropCard t={t}>
          <PRow t={t} label="Stav">
            <select value={note.status||"draft"} onChange={e=>updateNote(note.id,{status:e.target.value})} style={{ background:"transparent", border:"none", color:statusInfo.color, fontSize:12, fontWeight:700, outline:"none", cursor:"pointer", width:"100%" }}>
              {Object.entries(NOTE_STATUSES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
          </PRow>
          <PRow t={t} label="Ikona">
            <button onClick={() => {
              const em = prompt("Emoji nebo ikona:", note.icon || "📝");
              if (em !== null) updateNote(note.id, { icon: em.trim().slice(0,2) || null });
            }} style={{ background:"none", border:"none", padding:0, cursor:"pointer", color:t.text2, fontSize:13 }}>
              {note.icon || "📝"} <span style={{ color:t.text3, fontSize:11 }}>změnit</span>
            </button>
          </PRow>
          <PRow t={t} label="Štítky">
            <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
              {note.tags.map(tag => {
                const col = getTagColor(tag, globalTags) || t.accent;
                return (
                  <span key={tag} style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"1px 6px", borderRadius:20, fontSize:11, fontWeight:600, background:`${col}18`, color:col, border:`1px solid ${col}35` }}>
                    #{tag}
                    <button onClick={()=>removeTag(tag)} style={{ background:"none", border:"none", cursor:"pointer", padding:0, display:"flex", color:col }}>
                      <Icon name="x" size={8} color="currentColor" strokeWidth={2.5} />
                    </button>
                  </span>
                );
              })}
              <input
                value={tagInput}
                onChange={e=>setTagInput(e.target.value)}
                onKeyDown={handleTagKey}
                onBlur={()=>{ if(tagInput.trim()){addTag(tagInput);setTagInput("");} }}
                placeholder={note.tags.length ? "+" : "Přidat…"}
                style={{ background:"none", border:"none", color:t.text, fontSize:11, outline:"none", width:60, minWidth:40 }}
              />
            </div>
          </PRow>
          <div style={{ padding:"7px 0 0", fontSize:11, color:t.text3 }}>
            <div>Vytvořeno: {formatDateTime(note.createdAt)}</div>
            <div style={{ marginTop:2 }}>Upraveno: {formatDateTime(note.updatedAt)}</div>
          </div>
        </PropCard>

        {/* Projects */}
        <PropCard t={t} noPad>
          <div style={{ padding:"12px 12px 8px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ fontSize:12, fontWeight:750, color:t.text }}>Projekty</div>
            <button onClick={()=>setShowAllProjects(v=>!v)} style={{ background:"none", border:"none", cursor:"pointer", padding:2, display:"flex", color:t.text3 }}>
              <Icon name={showAllProjects?"chevron-up":"chevron-down"} size={13} color={t.text3} strokeWidth={2} />
            </button>
          </div>

          {/* Primary project selector */}
          <div style={{ padding:"0 12px 8px", borderBottom:`1px solid rgba(255,255,255,.055)` }}>
            <div style={{ fontSize:11, color:t.text3, marginBottom:5, fontWeight:700 }}>Primární projekt</div>
            <select
              value={note.primaryProjectId || ""}
              onChange={e => {
                const v = e.target.value;
                updateNote(note.id, { primaryProjectId: v || null, primaryTaskId: v ? null : note.primaryTaskId });
              }}
              style={{ width:"100%", background:"var(--bg-2)", border:"1px solid var(--border-soft)", borderRadius:7, color:"var(--text-2)", fontSize:12, padding:"5px 8px", outline:"none", cursor:"pointer" }}
            >
              <option value="">— Bez projektu</option>
              {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* All projects as toggleable */}
          {showAllProjects && (
            <div style={{ padding:"8px 12px 12px" }}>
              <div style={{ fontSize:11, color:t.text3, marginBottom:6, fontWeight:700 }}>Další propojené projekty</div>
              <div style={{ display:"flex", flexDirection:"column", gap:4, maxHeight:200, overflowY:"auto" }}>
                {projects.length === 0 && <div style={{ fontSize:11, color:t.text3 }}>Žádné projekty</div>}
                {projects.map(p => {
                  const isPrimary = p.id === note.primaryProjectId;
                  const isExtra   = (note.extraProjectIds || []).includes(p.id);
                  const col = projectColor(p.id);
                  return (
                    <button key={p.id}
                      onClick={() => {
                        if (isPrimary) return;
                        toggleExtraProject(p.id);
                      }}
                      style={{
                        display:"flex", alignItems:"center", gap:8, padding:"6px 9px", borderRadius:8,
                        border:`1px solid ${isPrimary ? col+"70" : isExtra ? col+"50" : t.border}`,
                        background: isPrimary ? col+"20" : isExtra ? col+"12" : "transparent",
                        color: isPrimary || isExtra ? col : t.text2,
                        fontSize:12, cursor:isPrimary?"default":"pointer", textAlign:"left",
                        opacity: isPrimary ? 1 : 1,
                      }}
                    >
                      <div style={{ width:7, height:7, borderRadius:"50%", background:col, flexShrink:0 }} />
                      <span style={{ flex:1 }}>{p.name}</span>
                      {isPrimary && <span style={{ fontSize:10, color:col, fontWeight:700 }}>primární</span>}
                      {isExtra   && <Icon name="check" size={10} color={col} strokeWidth={2.5} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </PropCard>

        {/* Tasks */}
        <PropCard t={t} noPad>
          <div style={{ padding:"12px 12px 8px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ fontSize:12, fontWeight:750, color:t.text }}>Úkoly</div>
            <button onClick={()=>setShowAllTasks(v=>!v)} style={{ background:"none", border:"none", cursor:"pointer", padding:2, display:"flex", color:t.text3 }}>
              <Icon name={showAllTasks?"chevron-up":"chevron-down"} size={13} color={t.text3} strokeWidth={2} />
            </button>
          </div>

          {/* Primary task selector */}
          <div style={{ padding:"0 12px 8px", borderBottom:`1px solid rgba(255,255,255,.055)` }}>
            <div style={{ fontSize:11, color:t.text3, marginBottom:5, fontWeight:700 }}>Primární úkol</div>
            <select
              value={note.primaryTaskId || ""}
              onChange={e => {
                const v = e.target.value;
                updateNote(note.id, { primaryTaskId: v || null });
              }}
              style={{ width:"100%", background:"var(--bg-2)", border:"1px solid var(--border-soft)", borderRadius:7, color:"var(--text-2)", fontSize:12, padding:"5px 8px", outline:"none", cursor:"pointer" }}
            >
              <option value="">— Bez úkolu</option>
              {tasks.map(tk=><option key={tk.id} value={tk.id}>{tk.title||"Bez názvu"}</option>)}
            </select>
          </div>

          {/* All tasks toggleable */}
          {showAllTasks && (
            <div style={{ padding:"8px 12px 12px" }}>
              <div style={{ fontSize:11, color:t.text3, marginBottom:6, fontWeight:700 }}>Další propojené úkoly</div>
              <input
                value={taskSearch}
                onChange={e=>setTaskSearch(e.target.value)}
                placeholder="Hledat úkol…"
                style={{ width:"100%", padding:"5px 8px", borderRadius:7, border:"1px solid var(--border-soft)", background:"var(--bg-2)", color:"var(--text)", fontSize:11, outline:"none", boxSizing:"border-box", marginBottom:6 }}
              />
              <div style={{ display:"flex", flexDirection:"column", gap:3, maxHeight:180, overflowY:"auto" }}>
                {filteredTasks.length === 0 && <div style={{ fontSize:11, color:t.text3 }}>Žádné úkoly</div>}
                {filteredTasks.map(tk => {
                  const isPrimary = tk.id === note.primaryTaskId;
                  const isExtra   = (note.extraTaskIds || []).includes(tk.id);
                  return (
                    <button key={tk.id}
                      onClick={() => { if (!isPrimary) toggleExtraTask(tk.id); }}
                      style={{
                        display:"flex", alignItems:"center", gap:8, padding:"5px 9px", borderRadius:8,
                        border:`1px solid ${isPrimary||isExtra ? t.accent+"50" : t.border}`,
                        background: isPrimary||isExtra ? t.accentBg : "transparent",
                        color: isPrimary||isExtra ? t.accent : t.text2,
                        fontSize:12, cursor:isPrimary?"default":"pointer", textAlign:"left",
                      }}
                    >
                      <Icon name="check-square" size={11} color={isPrimary||isExtra ? t.accent : t.text3} strokeWidth={2} />
                      <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tk.title || "Bez názvu"}</span>
                      {isPrimary && <span style={{ fontSize:10, color:t.accent, fontWeight:700 }}>primární</span>}
                      {isExtra   && <Icon name="check" size={10} color={t.accent} strokeWidth={2.5} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </PropCard>

        {/* Quick actions */}
        <PropCard t={t} title="Rychlé akce">
          <div style={{ display:"grid", gap:6 }}>
            <MiniItem t={t} left={<><PinIcon size={11} filled={note.pinned} color="#f59e0b" /> {note.pinned ? "Odepnout poznámku" : "Připnout poznámku"}</>} right="⌥P" onClick={()=>updateNote(note.id,{pinned:!note.pinned})} />
            <MiniItem t={t} left="🧠 Vytáhnout úkoly z textu" right="AI" onClick={runAIExtract} />
            <MiniItem t={t} left={<>{note.archived ? "🗄️ Obnovit z archivu" : "🗄️ Archivovat poznámku"}</>} right="" onClick={()=>updateNote(note.id,{archived:!note.archived})} />
            <MiniItem t={t} left="📤 Export jako .md" right=".md" onClick={onExportMD} />
          </div>
        </PropCard>

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
  const projectsById = Object.fromEntries(projects.map(p => [p.id, p]));

  const activeNotes = notes.filter(n => !n.archived);
  const archivedNotes = notes.filter(n => n.archived);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = todayStart - (6 * 86400000);
  const todayCount = activeNotes.filter(n => n.updatedAt >= todayStart).length;
  const weekCount = activeNotes.filter(n => n.updatedAt >= weekStart).length;
  const lastUpdated = activeNotes.reduce((max, n) => Math.max(max, n.updatedAt || 0), 0);

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
            <span>{search ? `výsledek pro "${search}"` : "poslední úprava: " + relTime(lastUpdated || Date.now())}</span>
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
                      return (
                        <span key={tag} style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: col, border: `1px solid ${col}30`, background: `${col}12`, borderRadius: 999, padding: "3px 7px", fontWeight: 600 }}>
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
function NotesSidebar({ notes, selId, onSelect, onCreate, t, projects }) {
  const { tags: globalTags } = useApp();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("updated");

  const s = search.toLowerCase();
  let filtered = notes.filter(n => !search || n.title.toLowerCase().includes(s) || n.content.toLowerCase().includes(s));

  if (filter === "archive") {
    filtered = filtered.filter(n => n.archived);
  } else {
    filtered = filtered.filter(n => !n.archived);
    if      (filter === "pinned")  filtered = filtered.filter(n => n.pinned);
    else if (filter === "project") filtered = filtered.filter(n => !!n.primaryProjectId || n.extraProjectIds?.length > 0);
    else if (filter === "task")    filtered = filtered.filter(n => !!n.primaryTaskId    || n.extraTaskIds?.length > 0);
    else if (filter === "free")    filtered = filtered.filter(n => !n.primaryProjectId && !n.primaryTaskId && !n.extraProjectIds?.length && !n.extraTaskIds?.length);
  }

  const sorted = [...filtered].sort((a,b) => {
    if (sortBy==="updated") return b.updatedAt - a.updatedAt;
    if (sortBy==="created") return b.createdAt - a.createdAt;
    return compareText(a.title, b.title);
  });

  const todayStart     = new Date(); todayStart.setHours(0,0,0,0);
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const weekStart      = new Date(todayStart.getTime() - 6*86400000);

  const groups = (sortBy==="updated" && filter!=="archive") ? [
    { label:"Dnes",        items:sorted.filter(n=>n.updatedAt>=todayStart.getTime()) },
    { label:"Včera",       items:sorted.filter(n=>n.updatedAt>=yesterdayStart.getTime()&&n.updatedAt<todayStart.getTime()) },
    { label:"Tento týden", items:sorted.filter(n=>n.updatedAt>=weekStart.getTime()&&n.updatedAt<yesterdayStart.getTime()) },
    { label:"Starší",      items:sorted.filter(n=>n.updatedAt<weekStart.getTime()) },
  ].filter(g=>g.items.length>0) : [{ label:null, items:sorted }];

  const activeCount  = notes.filter(n=>!n.archived).length;
  const archiveCount = notes.filter(n=>n.archived).length;

  const filterTabs = [
    { k:"all",     l:"Vše",     count:activeCount },
    { k:"pinned",  l:"Připnuto"                   },
    { k:"project", l:"Projekt"                    },
    { k:"task",    l:"Úkol"                       },
    { k:"free",    l:"Volné"                      },
    { k:"archive", l:"Archiv",  count:archiveCount, muted:true },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:t.bg2 }}>
      <div style={{ padding:"16px 14px 10px", borderBottom:`1px solid ${t.border}`, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <Icon name="file-text" size={16} color={t.accent} strokeWidth={2} />
            <span style={{ fontSize:15, fontWeight:850, fontFamily:"var(--font-ui)", letterSpacing:"-.3px" }}>Poznámky</span>
            <span style={{ fontSize:11, color:t.text3, background:"rgba(255,255,255,.07)", padding:"1px 7px", borderRadius:99, fontWeight:700 }}>{activeCount}</span>
          </div>
          <button onClick={onCreate} style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 12px", borderRadius:9, border:"none", background:`linear-gradient(135deg, var(--accent), var(--accent-2))`, color:"var(--bg)", fontSize:12, fontWeight:800, cursor:"pointer", boxShadow:"0 6px 16px var(--accent-glow)" }}>
            <Icon name="plus" size={13} color="var(--bg)" strokeWidth={2.5} />
            Nová
          </button>
        </div>
        <div style={{ position:"relative" }}>
          <Icon name="search" size={13} color={t.text3} strokeWidth={2} style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} />
          <input
            value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Hledat v poznámkách…"
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
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ marginLeft:"auto", padding:"3px 6px", borderRadius:6, border:"1px solid var(--border-soft)", background:"var(--bg-2)", color:"var(--text-2)", fontSize:11, outline:"none", flexShrink:0 }}>
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

              return (
                <button key={n.id} onClick={()=>onSelect(n.id)} style={{
                  display:"block", width:"100%", textAlign:"left",
                  padding:"11px 10px 11px 14px", borderRadius:13, marginBottom:6,
                  background:isActive ? "var(--accent-soft)" : "transparent",
                  border:`1px solid ${isActive ? "color-mix(in srgb, var(--accent) 38%, transparent)" : "transparent"}`,
                  cursor:"pointer", position:"relative", overflow:"hidden",
                  transition:"background .15s", opacity:n.archived ? 0.6 : 1,
                }}
                  onMouseEnter={e=>{ if(!isActive) e.currentTarget.style.background="rgba(255,255,255,.04)"; }}
                  onMouseLeave={e=>{ if(!isActive) e.currentTarget.style.background="transparent"; }}
                >
                  <div style={{ position:"absolute", left:0, top:11, bottom:11, width:3, borderRadius:4, background:accentCol, opacity:.95 }} />
                  <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"flex-start", marginBottom:4 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:5, minWidth:0 }}>
                      {n.icon && <span style={{ fontSize:13, flexShrink:0 }}>{n.icon}</span>}
                      {n.pinned && <PinIcon size={10} filled color="#f59e0b" />}
                      <span style={{ fontSize:13, fontWeight:800, color:isActive?"var(--accent)":t.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {n.title || <em style={{ fontWeight:400, color:t.text3 }}>Bez názvu</em>}
                      </span>
                    </div>
                    <span style={{ fontSize:11, color:t.text3, flexShrink:0, whiteSpace:"nowrap" }}>{relTime(n.updatedAt)}</span>
                  </div>
                  {preview && (
                    <div style={{ fontSize:12, color:t.text3, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden", lineHeight:1.45, marginBottom:n.tags?.length ? 6 : 0 }}>
                      {preview}
                    </div>
                  )}
                  {n.tags?.length > 0 && (
                    <div style={{ display:"flex", gap:4, flexWrap:"nowrap", overflow:"hidden" }}>
                      {n.tags.slice(0,3).map(tag => {
                        const col = getTagColor(tag, globalTags) || "#aeb9d2";
                        return (
                          <span key={tag} style={{ fontSize:10.5, padding:"2px 6px", borderRadius:999, background:`${col}15`, color:col, border:`1px solid ${col}25`, whiteSpace:"nowrap" }}>
                            {tag}
                          </span>
                        );
                      })}
                      {n.tags.length>3 && <span style={{ fontSize:10, color:t.text3 }}>+{n.tags.length-3}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{ padding:"7px 14px", borderTop:`1px solid ${t.border}`, fontSize:11.5, color:t.text3, flexShrink:0 }}>
        {sorted.length} {sorted.length===1?"poznámka":sorted.length<5?"poznámky":"poznámek"}
      </div>
    </div>
  );
}

/* ─── NotesPage ─────────────────────────────── */
export default function NotesPage() {
  const { t, dk, notes, addNote, updateNote, deleteNote, projects, tasks, addTask, openNoteId, setOpenNoteId, isMobile, activeWorkspaceId, tags: globalTags } = useApp();
  const toast   = useToast();
  const confirm = useConfirm();

  const [selId,          setSelId]          = useState(null);
  const [mobileView,     setMobileView]     = useState("list");
  const [templatePicker, setTemplatePicker] = useState(false);
  const [showProps,      setShowProps]      = useState(true);

  useEffect(() => { injectNoteCSS(dk); }, [dk]);

  useEffect(() => {
    if (openNoteId) {
      setSelId(openNoteId);
      setOpenNoteId(null);
      if (isMobile) setMobileView("detail");
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
    if (isMobile) setMobileView("detail");
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

  const handleExportMD = () => {
    if (!selNote) return;
    const content = document.querySelector('.note-ce')?.innerText || selNote.content;
    const blob = new Blob([`# ${selNote.title}\n\n${content}`], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: `${selNote.title || "poznamka"}.md` });
    a.click(); URL.revokeObjectURL(url);
  };

  const showList = mobileView === "list";
  const showDetail = mobileView === "detail";

  if (!isMobile) {
    return (
      <div style={{ minHeight: "100%", position: "relative" }}>
        {templatePicker && (
          <TemplatePickerModal onSelect={handleCreateFromTemplate} onClose={() => setTemplatePicker(false)} />
        )}

        <NotesAtlasGrid
          notes={notes}
          projects={projects}
          onCreate={handleCreate}
          onOpenNote={(id) => { setSelId(id); setShowProps(true); }}
        />

        {selNote && (
          <div className="overlay" onClick={() => setSelId(null)}>
            <div
              onClick={e => e.stopPropagation()}
              className="sr"
              style={{
                width: "min(1320px, 96vw)",
                height: "min(930px, 94vh)",
                margin: "auto",
                borderRadius: 16,
                overflow: "hidden",
                border: `1px solid ${t.border}`,
                background: t.bg,
                display: "flex",
                position: "relative",
              }}
            >
              <button
                onClick={() => setSelId(null)}
                className="btn"
                style={{ position: "absolute", top: 12, right: 12, zIndex: 10, padding: "6px 11px" }}
              >
                <Icon name="x" size={14} color="currentColor" strokeWidth={2} />
                Zavřít
              </button>
              <div style={{ flex: 1, display: "flex", overflow: "hidden", minWidth: 0 }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, background: t.bg }}>
                  <NoteEditor
                    key={selNote.id}
                    note={selNote}
                    onSave={upd => updateNote(selNote.id, upd)}
                    t={t}
                    isMobile={false}
                    showProps={showProps}
                    onToggleProps={() => setShowProps(v => !v)}
                    onDelete={() => handleDelete(selNote.id)}
                    onTogglePin={() => updateNote(selNote.id, { pinned: !selNote.pinned })}
                    projects={projects}
                    tasks={tasks}
                    addTask={addTask}
                    activeWorkspaceId={activeWorkspaceId}
                  />
                </div>
                {showProps && (
                  <NotePropertiesPanel
                    note={selNote}
                    onClose={() => setShowProps(false)}
                    t={t}
                    isMobile={false}
                    onExportMD={handleExportMD}
                    projects={projects}
                    tasks={tasks}
                    addTask={addTask}
                    activeWorkspaceId={activeWorkspaceId}
                  />
                )}
              </div>
            </div>
          </div>
        )}
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
            onSelect={(id) => { setSelId(id); setMobileView("detail"); }}
            onCreate={handleCreate}
            t={t}
            projects={projects}
          />
        </div>
      )}

      {showDetail && (
        <div style={{ flex: 1, display: "flex", overflow: "hidden", minWidth: 0 }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${t.border}`, background: t.bg2, zIndex: 50 }}>
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
                isMobile
                showProps={showProps}
                onToggleProps={() => setShowProps(v => !v)}
                onDelete={() => handleDelete(selNote.id)}
                onTogglePin={() => updateNote(selNote.id, { pinned: !selNote.pinned })}
                projects={projects}
                tasks={tasks}
                addTask={addTask}
                activeWorkspaceId={activeWorkspaceId}
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
              activeWorkspaceId={activeWorkspaceId}
            />
          )}
        </div>
      )}
    </div>
  );
}
