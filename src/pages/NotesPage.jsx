import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { useConfirm } from '../components/Confirm.jsx'
import Icon from '../components/Icon.jsx'
import { NOTE_TEMPLATES, NOTE_STATUSES } from '../constants.js'
import { projectColor, relTime, useDebouncedEffect, sanitizeHtml } from '../utils.js'
import { supabase } from '../supabase.js'
import { compareText, formatDateTime } from '../locale.js'

/* ─────────────────────────────────────────────
   Notion-style markdown renderer
───────────────────────────────────────────── */
function renderNotionMarkdown(md, noteMap = null) {
  if (!md) return "";
  const lines = md.split("\n");
  let html = "";
  let inList = false, listType = "ul";
  let inBlockquote = false;

  const esc = (s) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  const safeUrl = (url) => {
    try {
      const u = new URL(url, location.href);
      return /^https?:$/.test(u.protocol) ? url : "#";
    } catch { return url.startsWith("/") || url.startsWith("#") ? url : "#"; }
  };

  const inline = (s) => {
    s = s.replace(/\[\[([^\]]+)\]\]/g, (_, title) => {
      const id = noteMap?.get(title.toLowerCase().trim());
      if (id) return `<a href="#" class="note-link" data-noteid="${id}" onclick="return false">${title}</a>`;
      return `<span class="note-link note-link-missing" title="Poznámka neexistuje">[[${title}]]</span>`;
    });
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_,alt,url) => `<img src="${safeUrl(url)}" alt="${esc(alt)}">`);
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_,text,url) => `<a href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer">${text}</a>`);
    s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    return s;
  };

  const closeList = () => { if (inList) { html += listType === "ul" ? "</ul>" : "</ol>"; inList = false; } };
  const closeBlockquote = () => { if (inBlockquote) { html += "</blockquote>"; inBlockquote = false; } };

  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];

    if (raw.trim().startsWith("```")) {
      closeList(); closeBlockquote();
      const lang = raw.trim().slice(3).trim();
      i++;
      let code = "";
      while (i < lines.length && !lines[i].trim().startsWith("```")) { code += esc(lines[i]) + "\n"; i++; }
      html += `<pre${lang ? ` data-lang="${esc(lang)}"` : ""}><code>${code.trimEnd()}</code></pre>`;
      i++; continue;
    }

    const line = esc(raw);

    if (line.startsWith("# "))        { closeList(); closeBlockquote(); html += `<h1>${inline(esc(raw.slice(2)))}</h1>`; }
    else if (line.startsWith("## "))  { closeList(); closeBlockquote(); html += `<h2>${inline(esc(raw.slice(3)))}</h2>`; }
    else if (line.startsWith("### ")) { closeList(); closeBlockquote(); html += `<h3>${inline(esc(raw.slice(4)))}</h3>`; }
    else if (line.trim() === "---")   { closeList(); closeBlockquote(); html += `<hr>`; }
    else if (raw.startsWith("> ")) {
      closeList();
      if (!inBlockquote) { html += "<blockquote>"; inBlockquote = true; }
      html += `<p>${inline(esc(raw.slice(2)))}</p>`;
    }
    else if (/^- \[x\] /i.test(raw)) {
      closeBlockquote();
      if (!inList || listType !== "ul") { closeList(); html += '<ul class="checklist">'; inList = true; listType = "ul"; }
      html += `<li class="checked"><span class="cb checked"></span><span>${inline(esc(raw.replace(/^- \[x\] /i,"")))}</span></li>`;
    }
    else if (/^- \[ \] /.test(raw)) {
      closeBlockquote();
      if (!inList || listType !== "ul") { closeList(); html += '<ul class="checklist">'; inList = true; listType = "ul"; }
      html += `<li class="unchecked"><span class="cb"></span><span>${inline(esc(raw.replace(/^- \[ \] /,"")))}</span></li>`;
    }
    else if (/^- /.test(raw)) {
      closeBlockquote();
      if (!inList || listType !== "ul") { closeList(); html += "<ul>"; inList = true; listType = "ul"; }
      html += `<li>${inline(esc(raw.slice(2)))}</li>`;
    }
    else if (/^\d+\. /.test(raw)) {
      closeBlockquote();
      if (!inList || listType !== "ol") { closeList(); html += "<ol>"; inList = true; listType = "ol"; }
      html += `<li>${inline(esc(raw.replace(/^\d+\. /,"")))}</li>`;
    }
    else if (line.trim() === "") { closeList(); closeBlockquote(); html += `<div class="spacer"></div>`; }
    else { closeList(); closeBlockquote(); html += `<p>${inline(line)}</p>`; }

    i++;
  }
  closeList(); closeBlockquote();
  return html;
}

/* ─────────────────────────────────────────────
   Notion preview CSS (injected once)
───────────────────────────────────────────── */
const NOTION_CSS_ID = "notion-preview-css";
function injectNotionCSS(dk) {
  let el = document.getElementById(NOTION_CSS_ID);
  if (!el) { el = document.createElement("style"); el.id = NOTION_CSS_ID; document.head.appendChild(el); }
  const textColor = dk ? "#e8ecf4" : "#1a1e2e";
  const text2     = dk ? "#8b95a5" : "#6b7280";
  const text3     = dk ? "#5a6375" : "#9ca3af";
  const border    = dk ? "#242838" : "#e5e7ec";
  const codeBg    = dk ? "#181b28" : "#f1f5f9";
  const bqBg      = dk ? "#1e2236" : "#f8fafc";
  const accent    = dk ? "#3b82f6" : "#3b6ef6";
  el.textContent = `
.notion-body { color: ${textColor}; font-size: 15px; line-height: 1.8; }
.notion-body h1 { font-family:'Outfit',sans-serif; font-size: 2em; font-weight: 800; margin: 1.4em 0 .4em; letter-spacing: -.02em; line-height: 1.2; }
.notion-body h2 { font-family:'Outfit',sans-serif; font-size: 1.4em; font-weight: 700; margin: 1.2em 0 .35em; letter-spacing: -.01em; }
.notion-body h3 { font-family:'Outfit',sans-serif; font-size: 1.15em; font-weight: 600; margin: 1em 0 .3em; color: ${text2}; }
.notion-body p  { margin: 0 0 .25em; }
.notion-body a  { color: ${accent}; text-decoration: underline; text-underline-offset: 2px; }
.notion-body strong { font-weight: 700; }
.notion-body em     { font-style: italic; }
.notion-body del    { text-decoration: line-through; color: ${text3}; }
.notion-body ul, .notion-body ol { padding-left: 1.6em; margin: .25em 0 .5em; }
.notion-body li { margin: .2em 0; line-height: 1.7; }
.notion-body ul.checklist { list-style: none; padding-left: .4em; }
.notion-body ul.checklist li { display: flex; align-items: flex-start; gap: 8px; }
.notion-body .cb { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 4px; border: 2px solid ${border}; flex-shrink: 0; margin-top: 3px; }
.notion-body .cb.checked { background: ${accent}; border-color: ${accent}; }
.notion-body .cb.checked::after { content:'✓'; color:#fff; font-size:10px; font-weight:700; }
.notion-body li.checked > span:last-child { text-decoration: line-through; color: ${text3}; }
.notion-body blockquote { border-left: 3px solid ${accent}; margin: .8em 0; padding: .4em 0 .4em 1.2em; background: ${bqBg}; border-radius: 0 8px 8px 0; color: ${text2}; }
.notion-body blockquote p { margin: 0; }
.notion-body hr { border: none; border-top: 1px solid ${border}; margin: 1.6em 0; }
.notion-body code { font-family: 'JetBrains Mono',monospace; font-size: .875em; background: ${codeBg}; border-radius: 4px; padding: 1px 6px; color: ${dk?"#f472b6":"#db2777"}; }
.notion-body pre { background: ${codeBg}; border-radius: 10px; padding: 16px 20px; overflow-x: auto; margin: .8em 0 1em; position: relative; border: 1px solid ${border}; }
.notion-body pre code { background: none; padding: 0; color: ${textColor}; font-size: 13px; line-height: 1.7; }
.notion-body pre[data-lang]::before { content: attr(data-lang); position: absolute; top: 8px; right: 12px; font-size: 10px; color: ${text3}; font-family: 'JetBrains Mono',monospace; text-transform: uppercase; letter-spacing: .06em; }
.notion-body img { max-width: 100%; border-radius: 8px; margin: .6em 0; display: block; }
.notion-body .spacer { height: 6px; }
.notion-body .note-link { color: ${accent}; text-decoration: none; background: ${accent}18; border-radius: 4px; padding: 1px 5px; font-size: .9em; cursor: pointer; transition: background .12s; }
.notion-body .note-link:hover { background: ${accent}30; }
.notion-body .note-link-missing { color: ${text3}; background: transparent; text-decoration: underline dotted; cursor: help; }
  `;
}

/* ─────────────────────────────────────────────
   Slash command menu
───────────────────────────────────────────── */
const SLASH_COMMANDS = [
  { id:"h1",       icon:"type",          label:"Nadpis 1",          insert:"# "          },
  { id:"h2",       icon:"type",          label:"Nadpis 2",          insert:"## "         },
  { id:"h3",       icon:"type",          label:"Nadpis 3",          insert:"### "        },
  { id:"bullet",   icon:"list",          label:"Odrážkový seznam",  insert:"- "          },
  { id:"numbered", icon:"list",          label:"Číslovaný seznam",  insert:"1. "         },
  { id:"todo",     icon:"check-square",  label:"Úkol / checkbox",   insert:"- [ ] "      },
  { id:"quote",    icon:"message-square",label:"Citace",            insert:"> "          },
  { id:"code",     icon:"code",          label:"Blok kódu",         insert:"```\n\n```", cursor:-4 },
  { id:"divider",  icon:"minus",         label:"Oddělovač",         insert:"\n---\n"     },
  { id:"bold",     icon:"bold",          label:"Tučný text",        insert:"**tučně**",  cursor:-2 },
];

function SlashMenu({ query, onSelect, onClose, t }) {
  const filtered = SLASH_COMMANDS.filter(c =>
    !query || c.label.toLowerCase().includes(query.toLowerCase()) || c.id.includes(query.toLowerCase())
  );
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c+1, filtered.length-1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setCursor(c => Math.max(c-1, 0)); }
      else if (e.key === "Enter") { e.preventDefault(); if (filtered[cursor]) onSelect(filtered[cursor]); }
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cursor, filtered, onSelect, onClose]);

  useEffect(() => { setCursor(0); }, [query]);

  if (!filtered.length) return null;

  return (
    <div className="pop" style={{
      position: "absolute", zIndex: 500, width: 220,
      background: t.bg2, border: `1px solid ${t.border}`,
      borderRadius: 10, boxShadow: t.shadow, overflow: "hidden",
    }}>
      <div style={{ padding: "5px 8px 4px", fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em" }}>
        Příkazy
      </div>
      {filtered.map((cmd, i) => (
        <button key={cmd.id} onClick={() => onSelect(cmd)} style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%",
          padding: "7px 10px", border: "none",
          background: i === cursor ? t.accentBg : "transparent",
          color: i === cursor ? t.accent : t.text,
          fontSize: 13, cursor: "pointer", textAlign: "left",
        }} onMouseEnter={() => setCursor(i)}>
          <Icon name={cmd.icon} size={14} color={i === cursor ? t.accent : t.text3} strokeWidth={1.8} />
          {cmd.label}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   NoteLinkMenu — [[note]] autocomplete
───────────────────────────────────────────── */
function NoteLinkMenu({ query, notes, onSelect, onClose, t }) {
  const filtered = notes
    .filter(n => n.title && (!query || n.title.toLowerCase().includes(query.toLowerCase())))
    .slice(0, 8);
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c+1, filtered.length-1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setCursor(c => Math.max(c-1, 0)); }
      else if (e.key === "Enter") { e.preventDefault(); if (filtered[cursor]) onSelect(filtered[cursor]); }
      else if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cursor, filtered, onSelect, onClose]);

  useEffect(() => { setCursor(0); }, [query]);
  if (!filtered.length) return null;

  return (
    <div className="pop" style={{
      position: "absolute", zIndex: 500, width: 230,
      background: t.bg2, border: `1px solid ${t.border}`,
      borderRadius: 10, boxShadow: t.shadow, overflow: "hidden",
    }}>
      <div style={{ padding: "5px 8px 4px", fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em" }}>
        Propojit poznámku
      </div>
      {filtered.map((note, i) => (
        <button key={note.id} onClick={() => onSelect(note)} style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%",
          padding: "7px 10px", border: "none",
          background: i === cursor ? t.accentBg : "transparent",
          color: i === cursor ? t.accent : t.text,
          fontSize: 13, cursor: "pointer", textAlign: "left",
        }} onMouseEnter={() => setCursor(i)}>
          <Icon name="file-text" size={13} color={i === cursor ? t.accent : t.text3} strokeWidth={1.8} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {note.title || <em style={{ color: t.text3 }}>Bez názvu</em>}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   NoteAIPanel
───────────────────────────────────────────── */
const NOTE_AI_ACTIONS = [
  { id: "note_summary",       icon: "align-left",  label: "Shrnutí"    },
  { id: "note_continue",      icon: "edit-2",       label: "Pokračovat" },
  { id: "note_extract_tasks", icon: "check-square", label: "Úkoly"      },
];

function NoteAIPanel({ t, loading, result, action, onRun, onApply, onDismiss }) {
  return (
    <div style={{ borderBottom: `1px solid ${t.border}`, background: t.accentBg, padding: "8px 24px 10px", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13 }}>✨</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: t.accent }}>AI asistent</span>
        <div style={{ display: "flex", gap: 4 }}>
          {NOTE_AI_ACTIONS.map((a) => (
            <button key={a.id} onClick={() => onRun(a.id)} disabled={!!loading} title={a.label} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
              border: `1px solid ${action === a.id ? t.accent + "60" : t.border}`,
              background: action === a.id ? t.accent + "20" : t.input,
              color: action === a.id ? t.accent : t.text2,
              cursor: loading ? "wait" : "pointer",
              opacity: loading && loading !== a.id ? 0.5 : 1,
              transition: "all .12s",
            }}>
              {loading === a.id
                ? <span style={{ animation: "spin .7s linear infinite", display: "inline-block", fontSize: 12 }}>◌</span>
                : <Icon name={a.icon} size={11} color="currentColor" strokeWidth={2} />}
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {result !== null && (
        <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px 12px", marginTop: 8 }}>
          <NoteAIResult action={action} result={result} t={t} />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {action !== "note_summary" && (
              <button onClick={onApply} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: t.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {action === "note_extract_tasks" ? "Přidat jako úkoly" : "Přidat do poznámky"}
              </button>
            )}
            <button onClick={onDismiss} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${t.border}`, background: "transparent", color: t.text2, fontSize: 12, cursor: "pointer" }}>
              Zahodit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NoteAIResult({ action, result, t }) {
  if (action === "note_summary" && typeof result === "string") {
    return (
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 }}>Shrnutí</div>
        <div style={{ fontSize: 13, color: t.text, lineHeight: 1.6 }}>{result}</div>
      </div>
    );
  }
  if (action === "note_continue" && typeof result === "string") {
    return (
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 }}>Navrhované pokračování</div>
        <div style={{ fontSize: 13, color: t.text, lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 160, overflow: "auto" }}>{result}</div>
      </div>
    );
  }
  if (action === "note_extract_tasks" && Array.isArray(result)) {
    return (
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 }}>Nalezené úkoly ({result.length})</div>
        {result.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, padding: "2px 0", fontSize: 13, color: t.text }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: t.accent, flexShrink: 0 }} />
            {String(item)}
          </div>
        ))}
      </div>
    );
  }
  return <div style={{ fontSize: 13, color: t.text, whiteSpace: "pre-wrap" }}>{typeof result === "string" ? result : JSON.stringify(result, null, 2)}</div>;
}

/* ─────────────────────────────────────────────
   NoteEditor — edit mode
───────────────────────────────────────────── */
function NoteEditor({ note, onSave, onExitEdit, t, isMobile }) {
  const { notes } = useApp();
  const [title, setTitle]     = useState(note.title);
  const [content, setContent] = useState(note.content);
  const contentRef = useRef(null);
  const titleRef   = useRef(null);

  const [slashPos,   setSlashPos]   = useState(null);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashStart, setSlashStart] = useState(null);

  const [linkPos,   setLinkPos]   = useState(null);
  const [linkQuery, setLinkQuery] = useState("");
  const [linkStart, setLinkStart] = useState(null);

  useEffect(() => { setTitle(note.title); setContent(note.content); }, [note.id]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [content]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useDebouncedEffect(() => { onSave({ title, content }); }, [title, content], 600);

  const insertAtCursor = useCallback((before, after = "", placeholder = "text") => {
    const el = contentRef.current;
    if (!el) return;
    const s = el.selectionStart, e2 = el.selectionEnd;
    const sel = el.value.slice(s, e2) || placeholder;
    const newVal = el.value.slice(0, s) + before + sel + after + el.value.slice(e2);
    setContent(newVal);
    requestAnimationFrame(() => {
      el.focus();
      const pos = s + before.length + sel.length + after.length;
      el.setSelectionRange(pos, pos);
    });
  }, []);

  const handleContentChange = (e) => {
    const val = e.target.value;
    setContent(val);
    const pos = e.target.selectionStart;
    const lineStart = val.lastIndexOf("\n", pos - 1) + 1;
    const lineText  = val.slice(lineStart, pos);

    if (lineText.startsWith("/")) {
      setSlashQuery(lineText.slice(1));
      setSlashStart(lineStart);
      setSlashPos({ top: "100%", left: 0 });
      setLinkPos(null); setLinkStart(null);
      return;
    }
    setSlashPos(null); setSlashStart(null);

    const lastBracket = val.lastIndexOf("[[", pos - 1);
    if (lastBracket !== -1) {
      const between = val.slice(lastBracket + 2, pos);
      if (!between.includes("]]") && !between.includes("\n")) {
        setLinkQuery(between);
        setLinkStart(lastBracket);
        setLinkPos({ top: "100%", left: 0 });
        return;
      }
    }
    setLinkPos(null); setLinkStart(null);
  };

  const handleLinkSelect = (selectedNote) => {
    const el = contentRef.current;
    if (!el || linkStart == null) return;
    const pos = el.selectionStart;
    const inserted = `[[${selectedNote.title}]]`;
    const newContent = content.slice(0, linkStart) + inserted + content.slice(pos);
    setContent(newContent);
    setLinkPos(null); setLinkStart(null);
    requestAnimationFrame(() => {
      el.focus();
      const newPos = linkStart + inserted.length;
      el.setSelectionRange(newPos, newPos);
    });
  };

  const handleSlashSelect = (cmd) => {
    const el = contentRef.current;
    if (!el || slashStart == null) return;
    const pos = el.selectionStart;
    const newContent = content.slice(0, slashStart) + cmd.insert + content.slice(pos);
    setContent(newContent);
    setSlashPos(null); setSlashStart(null);
    requestAnimationFrame(() => {
      el.focus();
      const newPos = slashStart + cmd.insert.length + (cmd.cursor ?? 0);
      el.setSelectionRange(newPos, newPos);
    });
  };

  const tbBtn = (icon, label, onClick) => (
    <button key={label} onClick={onClick} title={label} style={{
      padding: "4px 7px", borderRadius: 5, border: "none",
      background: "transparent", color: t.text2, cursor: "pointer",
      display: "flex", alignItems: "center", transition: "background .1s",
    }}
      onMouseEnter={e => { e.currentTarget.style.background = t.input; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
    >
      <Icon name={icon} size={14} color={t.text2} strokeWidth={1.8} />
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 2,
        padding: "6px 20px", borderBottom: `1px solid ${t.border}`,
        flexShrink: 0, flexWrap: "wrap", background: t.bg2,
      }}>
        {tbBtn("bold",           "Tučné",      () => insertAtCursor("**","**","tučně"))}
        {tbBtn("italic",         "Kurzíva",    () => insertAtCursor("*","*","kurzíva"))}
        {tbBtn("type",           "Nadpis H2",  () => insertAtCursor("## ","","Nadpis"))}
        {tbBtn("link",           "Odkaz",      () => insertAtCursor("[","](url)","text"))}
        {tbBtn("list",           "Odrážka",    () => insertAtCursor("- ","","položka"))}
        {tbBtn("check-square",   "Checkbox",   () => insertAtCursor("- [ ] ","","úkol"))}
        {tbBtn("message-square", "Citace",     () => insertAtCursor("> ","","citace"))}
        {tbBtn("code",           "Kód",        () => insertAtCursor("`","`","kód"))}
        <div style={{ width: 1, height: 16, background: t.border, margin: "0 4px" }} />
        <span style={{ fontSize: 12, color: t.text3, padding: "2px 4px" }}>/ pro příkazy</span>
        <button onClick={onExitEdit} style={{
          marginLeft: "auto", display: "flex", alignItems: "center", gap: 5,
          padding: "4px 10px", borderRadius: 7, border: `1px solid ${t.border}`,
          background: "transparent", color: t.text3, fontSize: 12, cursor: "pointer",
        }}>
          <Icon name="eye" size={12} color={t.text3} strokeWidth={2} />
          Náhled
        </button>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "24px 20px" : "32px 48px 60px", maxWidth: 820, margin: "0 auto", width: "100%" }}>
        <input
          ref={titleRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Bez názvu"
          style={{
            width: "100%", border: "none", background: "transparent",
            color: t.text, outline: "none",
            fontFamily: "'Outfit', sans-serif",
            fontSize: isMobile ? 26 : 32, fontWeight: 800, letterSpacing: "-.03em",
            lineHeight: 1.2, marginBottom: 20, display: "block",
          }}
        />

        <div style={{ position: "relative" }}>
          <textarea
            ref={contentRef}
            value={content}
            onChange={handleContentChange}
            placeholder="Začni psát… nebo napiš / pro příkaz"
            autoFocus={!note.title}
            style={{
              width: "100%", minHeight: 300, border: "none",
              background: "transparent", color: t.text, outline: "none",
              resize: "none", overflow: "hidden",
              fontSize: 15, lineHeight: 1.8,
              fontFamily: "'Figtree', sans-serif",
              display: "block",
            }}
          />

          {slashPos && (
            <div style={{ position: "relative" }}>
              <SlashMenu query={slashQuery} onSelect={handleSlashSelect} onClose={() => { setSlashPos(null); setSlashStart(null); }} t={t} />
            </div>
          )}

          {linkPos && (
            <div style={{ position: "relative" }}>
              <NoteLinkMenu
                query={linkQuery}
                notes={notes.filter(n => n.id !== note.id)}
                onSelect={handleLinkSelect}
                onClose={() => { setLinkPos(null); setLinkStart(null); }}
                t={t}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   NotePropertiesPanel — right-side panel
───────────────────────────────────────────── */
function NotePropertiesPanel({ note, onClose, t, isMobile }) {
  const { updateNote, projects, tasks } = useApp();
  const [tagInput, setTagInput] = useState("");

  const statusInfo = NOTE_STATUSES[note.status] ?? NOTE_STATUSES.draft;

  const addTag = (raw) => {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (!tag || note.tags.includes(tag)) return;
    updateNote(note.id, { tags: [...note.tags, tag] });
  };

  const removeTag = (tag) => {
    updateNote(note.id, { tags: note.tags.filter(t => t !== tag) });
  };

  const handleTagKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      addTag(tagInput);
      setTagInput("");
    } else if (e.key === "Backspace" && !tagInput && note.tags.length > 0) {
      removeTag(note.tags[note.tags.length - 1]);
    }
  };

  const toggleExtraProject = (pid) => {
    const ids = note.extraProjectIds || [];
    updateNote(note.id, {
      extraProjectIds: ids.includes(pid) ? ids.filter(id => id !== pid) : [...ids, pid],
    });
  };

  const toggleExtraTask = (tid) => {
    const ids = note.extraTaskIds || [];
    updateNote(note.id, {
      extraTaskIds: ids.includes(tid) ? ids.filter(id => id !== tid) : [...ids, tid],
    });
  };

  const panelStyle = isMobile
    ? { position: "fixed", inset: 0, zIndex: 300, background: t.bg2, overflowY: "auto" }
    : { width: 260, minWidth: 260, borderLeft: `1px solid ${t.border}`, background: t.bg2, overflowY: "auto", flexShrink: 0 };

  const sectionLabel = (label) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6, marginTop: 16 }}>
      {label}
    </div>
  );

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px", borderBottom: `1px solid ${t.border}`, position: "sticky", top: 0, background: t.bg2, zIndex: 1 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Vlastnosti</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", color: t.text3, borderRadius: 6 }}>
          <Icon name="x" size={15} color={t.text3} strokeWidth={2} />
        </button>
      </div>

      <div style={{ padding: "4px 16px 24px" }}>

        {/* Status */}
        {sectionLabel("Stav")}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {Object.entries(NOTE_STATUSES).map(([k, v]) => (
            <button key={k} onClick={() => updateNote(note.id, { status: k })} style={{
              padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: `1.5px solid ${note.status === k ? v.color : t.border}`,
              background: note.status === k ? v.bg : "transparent",
              color: note.status === k ? v.color : t.text3,
              cursor: "pointer", transition: "all .12s",
            }}>
              {v.label}
            </button>
          ))}
        </div>

        {/* Icon */}
        {sectionLabel("Ikona / emoji")}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: t.input, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            {note.icon || <Icon name="file-text" size={16} color={t.text3} strokeWidth={1.5} />}
          </div>
          <input
            value={note.icon || ""}
            onChange={e => {
              const val = [...e.target.value].slice(-1).join("") || null;
              updateNote(note.id, { icon: val });
            }}
            placeholder="Emoji…"
            maxLength={4}
            style={{ flex: 1, padding: "7px 10px", borderRadius: 7, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 13, outline: "none" }}
          />
          {note.icon && (
            <button onClick={() => updateNote(note.id, { icon: null })} style={{ background: "none", border: "none", cursor: "pointer", color: t.text3, padding: 4, display: "flex" }}>
              <Icon name="x" size={13} color={t.text3} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Pin */}
        {sectionLabel("Připnutí")}
        <button onClick={() => updateNote(note.id, { pinned: !note.pinned })} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: 8, width: "100%",
          border: `1.5px solid ${note.pinned ? "#f59e0b" : t.border}`,
          background: note.pinned ? "#f59e0b15" : "transparent",
          color: note.pinned ? "#f59e0b" : t.text2,
          fontSize: 12.5, fontWeight: 600, cursor: "pointer", textAlign: "left",
        }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill={note.pinned ? "#f59e0b" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 17v5" /><path d="M9 10.5H5l1.5-2V4h11v4.5L16 10.5h-4z" /><path d="M9 10.5v3a3 3 0 006 0v-3" />
          </svg>
          {note.pinned ? "Připnuto" : "Připnout"}
        </button>

        {/* Archive */}
        {sectionLabel("Archiv")}
        <button onClick={() => updateNote(note.id, { archived: !note.archived })} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: 8, width: "100%",
          border: `1.5px solid ${note.archived ? t.accent + "60" : t.border}`,
          background: note.archived ? t.accentBg : "transparent",
          color: note.archived ? t.accent : t.text2,
          fontSize: 12.5, fontWeight: 600, cursor: "pointer", textAlign: "left",
        }}>
          <Icon name="archive" size={13} color="currentColor" strokeWidth={2} />
          {note.archived ? "V archivu (klikem obnovit)" : "Přesunout do archivu"}
        </button>

        {/* Tags */}
        {sectionLabel("Štítky")}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 6 }}>
          {note.tags.map(tag => (
            <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px 2px 6px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: t.accentBg, color: t.accent, border: `1px solid ${t.accent}30` }}>
              <span style={{ opacity: .6 }}>#</span>{tag}
              <button onClick={() => removeTag(tag)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: t.text3 }}>
                <Icon name="x" size={9} color={t.text3} strokeWidth={2.5} />
              </button>
            </span>
          ))}
        </div>
        <input
          value={tagInput}
          onChange={e => setTagInput(e.target.value)}
          onKeyDown={handleTagKeyDown}
          onBlur={() => { if (tagInput.trim()) { addTag(tagInput); setTagInput(""); } }}
          placeholder="Přidat štítek…"
          style={{ width: "100%", padding: "6px 10px", borderRadius: 7, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 12.5, outline: "none", boxSizing: "border-box" }}
        />
        <div style={{ fontSize: 11, color: t.text3, marginTop: 4 }}>Enter nebo čárka pro přidání</div>

        {/* Primary connection */}
        {sectionLabel("Hlavní vazba")}
        <select
          value={note.primaryProjectId ? `project:${note.primaryProjectId}` : note.primaryTaskId ? `task:${note.primaryTaskId}` : ""}
          onChange={e => {
            const v = e.target.value;
            if (!v) updateNote(note.id, { primaryProjectId: null, primaryTaskId: null });
            else if (v.startsWith("project:")) updateNote(note.id, { primaryProjectId: v.slice(8), primaryTaskId: null });
            else updateNote(note.id, { primaryProjectId: null, primaryTaskId: v.slice(5) });
          }}
          style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 12.5, outline: "none" }}
        >
          <option value="">— Bez hlavní vazby</option>
          <optgroup label="Projekty">
            {projects.map(p => <option key={p.id} value={`project:${p.id}`}>{p.name}</option>)}
          </optgroup>
          <optgroup label="Úkoly">
            {tasks.map(tk => <option key={tk.id} value={`task:${tk.id}`}>{tk.title || "Bez názvu"}</option>)}
          </optgroup>
        </select>

        {/* Extra project connections */}
        {projects.length > 0 && (
          <>
            {sectionLabel("Další projekty")}
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {projects.filter(p => p.id !== note.primaryProjectId).map(p => {
                const linked = (note.extraProjectIds || []).includes(p.id);
                const col = projectColor(p.id);
                return (
                  <button key={p.id} onClick={() => toggleExtraProject(p.id)} style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "5px 8px", borderRadius: 7, border: `1px solid ${linked ? col + "50" : t.border}`,
                    background: linked ? col + "12" : "transparent",
                    color: linked ? col : t.text2, fontSize: 12.5, cursor: "pointer", textAlign: "left",
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: col, flexShrink: 0 }} />
                    {p.name}
                    {linked && <Icon name="check" size={11} color={col} strokeWidth={2.5} style={{ marginLeft: "auto" }} />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Extra task connections */}
        {tasks.length > 0 && (
          <>
            {sectionLabel("Další úkoly")}
            <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 140, overflowY: "auto" }}>
              {tasks.filter(tk => tk.id !== note.primaryTaskId).map(tk => {
                const linked = (note.extraTaskIds || []).includes(tk.id);
                return (
                  <button key={tk.id} onClick={() => toggleExtraTask(tk.id)} style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "5px 8px", borderRadius: 7, border: `1px solid ${linked ? t.accent + "50" : t.border}`,
                    background: linked ? t.accentBg : "transparent",
                    color: linked ? t.accent : t.text2, fontSize: 12.5, cursor: "pointer", textAlign: "left",
                  }}>
                    <Icon name="check-square" size={11} color={linked ? t.accent : t.text3} strokeWidth={2} />
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tk.title || "Bez názvu"}</span>
                    {linked && <Icon name="check" size={11} color={t.accent} strokeWidth={2.5} />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Timestamps */}
        {sectionLabel("Časy")}
        <div style={{ fontSize: 12, color: t.text3, lineHeight: 2 }}>
          <div>Vytvořeno: {formatDateTime(note.createdAt)}</div>
          <div>Upraveno: {formatDateTime(note.updatedAt)}</div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   NotePreview — read mode
───────────────────────────────────────────── */
function NotePreview({ note, onEdit, onDelete, onTogglePin, t, isMobile, linkedProject, linkedTask, noteMap, onOpenNote, showProps, onToggleProps }) {
  const { addTask, updateNote, activeWorkspaceId, projects } = useApp();
  const wordCount = note.content.trim() ? note.content.trim().split(/\s+/).length : 0;
  const readMin   = Math.max(1, Math.round(wordCount / 200));
  const projColor = linkedProject ? projectColor(linkedProject.id) : null;
  const statusInfo = NOTE_STATUSES[note.status] ?? NOTE_STATUSES.draft;

  const [aiOpen, setAiOpen]       = useState(false);
  const [aiLoading, setAiLoading] = useState(null);
  const [aiResult, setAiResult]   = useState(null);
  const [aiAction, setAiAction]   = useState(null);

  const runAI = async (action) => {
    setAiLoading(action); setAiResult(null); setAiAction(action);
    try {
      const { data, error } = await supabase.functions.invoke("ai-task-assist", {
        body: { action, note: { title: note.title, content: note.content }, workspaceId: activeWorkspaceId },
      });
      if (error) throw error;
      const raw = data?.result ?? "";
      if (action === "note_extract_tasks") {
        try {
          const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "").trim();
          setAiResult(JSON.parse(cleaned));
        } catch { setAiResult([raw]); }
      } else {
        setAiResult(raw);
      }
    } catch (e) {
      setAiResult("Chyba: " + (e.message || String(e)));
    } finally {
      setAiLoading(null);
    }
  };

  const applyAI = () => {
    if (aiAction === "note_continue" && typeof aiResult === "string") {
      const sep = note.content?.endsWith("\n") ? "\n" : "\n\n";
      updateNote(note.id, { content: (note.content || "") + sep + aiResult });
    } else if (aiAction === "note_extract_tasks" && Array.isArray(aiResult)) {
      aiResult.forEach((text) => { if (typeof text === "string" && text.trim()) addTask({ title: text.trim() }); });
    }
    setAiResult(null); setAiAction(null);
  };

  const handleBodyClick = useCallback((e) => {
    const link = e.target.closest("[data-noteid]");
    if (link) { e.stopPropagation(); onOpenNote?.(link.dataset.noteid); return; }
    onEdit?.();
  }, [onEdit, onOpenNote]);

  // Collect all linked project/task badges
  const allLinkedProjects = [
    linkedProject,
    ...(note.extraProjectIds || []).map(id => projects?.find(p => p.id === id)).filter(Boolean),
  ].filter(Boolean);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Top bar */}
      {!isMobile && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 20px", flexShrink: 0,
          borderBottom: `1px solid ${t.border}`, background: t.bg2,
        }}>
          {/* Status badge */}
          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: statusInfo.bg, color: statusInfo.color, border: `1px solid ${statusInfo.color}40` }}>
            {statusInfo.label}
          </span>

          {/* Project/task badges */}
          {allLinkedProjects.map(proj => {
            const col = projectColor(proj.id);
            return (
              <span key={proj.id} style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, border: `1.5px solid ${col}55`, background: col+"12", color: col, display: "inline-flex", alignItems: "center", gap: 3 }}>
                <Icon name="folder" size={9} color={col} strokeWidth={2} />
                {proj.name}
              </span>
            );
          })}
          {linkedTask && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, border: `1.5px solid #3b82f655`, background: "#3b82f612", color: "#3b82f6", display: "inline-flex", alignItems: "center", gap: 3 }}>
              <Icon name="check-square" size={9} color="#3b82f6" strokeWidth={2} />
              {linkedTask.title || "Úkol"}
            </span>
          )}

          {/* Tags */}
          {note.tags?.slice(0, 3).map(tag => (
            <span key={tag} style={{ fontSize: 11, padding: "2px 7px", borderRadius: 20, background: t.accentBg, color: t.accent, border: `1px solid ${t.accent}30`, fontWeight: 600 }}>
              #{tag}
            </span>
          ))}

          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            <button onClick={() => setAiOpen(v => !v)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, border: `1px solid ${aiOpen ? t.accent+"60" : t.border}`, background: aiOpen ? t.accentBg : "transparent", color: aiOpen ? t.accent : t.text2, fontSize: 12, cursor: "pointer", transition: "all .12s" }}>
              <span>✨</span> AI
            </button>
            <button onClick={onEdit} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 7, border: `1px solid ${t.border}`, background: "transparent", color: t.text2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <Icon name="edit-2" size={12} color={t.text2} strokeWidth={2} />
              Upravit
            </button>
            <button onClick={onTogglePin} title={note.pinned ? "Odepnout" : "Připnout"} style={{ display: "flex", alignItems: "center", padding: "5px 8px", borderRadius: 7, border: `1px solid ${note.pinned ? "#f59e0b" : t.border}`, background: note.pinned ? "#f59e0b18" : "transparent", color: note.pinned ? "#f59e0b" : t.text3, fontSize: 12, cursor: "pointer" }}>
              <svg width={12} height={12} viewBox="0 0 24 24" fill={note.pinned ? "#f59e0b" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 17v5" /><path d="M9 10.5H5l1.5-2V4h11v4.5L16 10.5h-4z" /><path d="M9 10.5v3a3 3 0 006 0v-3" />
              </svg>
            </button>
            <button onClick={onToggleProps} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, border: `1px solid ${showProps ? t.accent+"60" : t.border}`, background: showProps ? t.accentBg : "transparent", color: showProps ? t.accent : t.text3, fontSize: 12, cursor: "pointer" }}>
              <Icon name="settings" size={12} color="currentColor" strokeWidth={2} />
            </button>
            {onDelete && (
              <button onClick={onDelete} style={{ display: "flex", alignItems: "center", padding: "5px 8px", borderRadius: 7, border: "none", background: "transparent", color: t.text3, cursor: "pointer" }}>
                <Icon name="trash" size={13} color="#ef4444" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
      )}

      {aiOpen && !isMobile && (
        <NoteAIPanel t={t} loading={aiLoading} result={aiResult} action={aiAction}
          onRun={runAI} onApply={applyAI}
          onDismiss={() => { setAiResult(null); setAiAction(null); }} />
      )}

      <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "24px 20px 32px" : "36px 48px 60px" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          {/* Note icon + title */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
            {note.icon && (
              <div style={{ fontSize: 36, lineHeight: 1, paddingTop: 4, flexShrink: 0 }}>{note.icon}</div>
            )}
            <h1
              style={{ fontFamily: "'Outfit', sans-serif", fontSize: isMobile ? 26 : 32, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.2, color: t.text, cursor: "text", margin: 0, flex: 1 }}
              onClick={onEdit}
            >
              {note.title || <span style={{ color: t.text3, fontWeight: 400, fontStyle: "italic" }}>Bez názvu</span>}
            </h1>
          </div>

          <div style={{ display: "flex", gap: 16, marginBottom: 28, paddingBottom: 18, borderBottom: `1px solid ${t.border}`, fontSize: 12, color: t.text3, flexWrap: "wrap" }}>
            <span>Upraveno {formatDateTime(note.updatedAt)}</span>
            {wordCount > 0 && <span>{wordCount} slov · {readMin} min čtení</span>}
            {note.archived && (
              <span style={{ color: t.accent, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Icon name="archive" size={11} color={t.accent} strokeWidth={2} /> Archivováno
              </span>
            )}
          </div>

          {note.content ? (
            <div
              className="notion-body"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderNotionMarkdown(note.content, noteMap)) }}
              style={{ cursor: "text" }}
              onClick={handleBodyClick}
            />
          ) : (
            <div onClick={onEdit} style={{ color: t.text3, fontSize: 15, cursor: "text", fontStyle: "italic", paddingTop: 8 }}>
              Klikni pro přidání obsahu…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TemplatePickerModal
───────────────────────────────────────────── */
function TemplatePickerModal({ onSelect, onClose }) {
  const { t } = useApp();
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 400, background: "#0007", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: t.bg2, borderRadius: 16, padding: 28, maxWidth: 560, width: "calc(100% - 32px)", maxHeight: "88vh", overflowY: "auto", boxShadow: t.shadow }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Outfit',sans-serif", marginBottom: 4 }}>Nová poznámka</div>
            <div style={{ fontSize: 12, color: t.text3 }}>Vyber šablonu nebo začni prázdnou stránkou</div>
          </div>
          <button onClick={onClose} style={{ background: t.input, border: `1px solid ${t.border}`, borderRadius: 8, padding: 6, cursor: "pointer", display: "flex" }}>
            <Icon name="x" size={16} color={t.text3} strokeWidth={2} />
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {NOTE_TEMPLATES.map(tpl => (
            <button key={tpl.id} onClick={() => onSelect(tpl)} style={{
              display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8,
              padding: "16px", borderRadius: 10, border: `1px solid ${t.border}`,
              background: t.bg, color: t.text, cursor: "pointer", textAlign: "left", transition: "all .12s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.background = t.accentBg; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.background = t.bg; }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: t.accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={tpl.icon} size={16} color={t.accent} strokeWidth={1.8} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{tpl.label}</div>
              <div style={{ fontSize: 12, color: t.text3, lineHeight: 1.5 }}>{tpl.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   NotesSidebar
───────────────────────────────────────────── */
function NotesSidebar({ notes, selId, onSelect, onCreate, t, isMobile, projects }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("updated");

  const s = search.toLowerCase();
  let filtered = notes.filter(n => !search || n.title.toLowerCase().includes(s) || n.content.toLowerCase().includes(s));

  // Archive tab shows only archived; other tabs hide archived
  if (filter === "archive") {
    filtered = filtered.filter(n => n.archived);
  } else {
    filtered = filtered.filter(n => !n.archived);
    if (filter === "pinned")  filtered = filtered.filter(n => n.pinned);
    else if (filter === "project") filtered = filtered.filter(n => !!n.primaryProjectId || (n.extraProjectIds?.length > 0));
    else if (filter === "task")    filtered = filtered.filter(n => !!n.primaryTaskId || (n.extraTaskIds?.length > 0));
    else if (filter === "free")    filtered = filtered.filter(n => !n.primaryProjectId && !n.primaryTaskId && !(n.extraProjectIds?.length) && !(n.extraTaskIds?.length));
  }

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "updated") return b.updatedAt - a.updatedAt;
    if (sortBy === "created") return b.createdAt - a.createdAt;
    return compareText(a.title, b.title);
  });

  const now = Date.now();
  const todayStart     = new Date(); todayStart.setHours(0,0,0,0);
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const weekStart      = new Date(todayStart.getTime() - 6*86400000);

  const groups = sortBy === "updated" && filter !== "archive" ? [
    { label: "Dnes",         items: sorted.filter(n => n.updatedAt >= todayStart.getTime()) },
    { label: "Včera",        items: sorted.filter(n => n.updatedAt >= yesterdayStart.getTime() && n.updatedAt < todayStart.getTime()) },
    { label: "Tento týden",  items: sorted.filter(n => n.updatedAt >= weekStart.getTime() && n.updatedAt < yesterdayStart.getTime()) },
    { label: "Starší",       items: sorted.filter(n => n.updatedAt < weekStart.getTime()) },
  ].filter(g => g.items.length > 0) : [{ label: null, items: sorted }];

  const activeCount  = notes.filter(n => !n.archived).length;
  const archiveCount = notes.filter(n => n.archived).length;

  const filterTabs = [
    { k: "all",     l: "Vše",       count: activeCount },
    { k: "pinned",  l: "Připnuto"                      },
    { k: "project", l: "Projekt"                       },
    { k: "task",    l: "Úkol"                          },
    { k: "free",    l: "Volné"                         },
    { k: "archive", l: "Archiv",    count: archiveCount, muted: true },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: t.bg2 }}>
      {/* Header */}
      <div style={{ padding: "16px 14px 10px", borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Icon name="file-text" size={16} color={t.accent} strokeWidth={2} />
            <span style={{ fontSize: 15, fontWeight: 800, fontFamily: "'Outfit',sans-serif", letterSpacing: "-.3px" }}>Poznámky</span>
            <span style={{ fontSize: 12, color: t.text3, background: t.input, padding: "1px 7px", borderRadius: 8 }}>{activeCount}</span>
          </div>
          <button onClick={onCreate} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: "none", background: t.accent, color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
            <Icon name="plus" size={13} color="#fff" strokeWidth={2.5} />
            Nová
          </button>
        </div>
        <div style={{ position: "relative" }}>
          <Icon name="search" size={13} color={t.text3} strokeWidth={2} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Hledat…"
            style={{ width: "100%", padding: "7px 30px 7px 30px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 12.5, outline: "none", boxSizing: "border-box" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: t.text3, cursor: "pointer", padding: 2, display: "flex" }}>
              <Icon name="x" size={12} color={t.text3} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 1, padding: "5px 8px", overflowX: "auto", borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
        {filterTabs.map(tab => {
          const isActive = filter === tab.k;
          return (
            <button key={tab.k} onClick={() => setFilter(tab.k)} style={{
              padding: "4px 8px", borderRadius: 6, fontSize: 11.5, whiteSpace: "nowrap",
              fontWeight: isActive ? 700 : 400, border: "none", flexShrink: 0,
              background: isActive ? (tab.muted ? t.input : t.accentBg) : "transparent",
              color: isActive ? (tab.muted ? t.text2 : t.accent) : (tab.muted ? t.text3 : t.text3),
              cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
            }}>
              {tab.k === "pinned" && (
                <svg width={10} height={10} viewBox="0 0 24 24" fill={isActive ? t.accent : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M12 17v5" /><path d="M9 10.5H5l1.5-2V4h11v4.5L16 10.5h-4z" /><path d="M9 10.5v3a3 3 0 006 0v-3" />
                </svg>
              )}
              {tab.k === "archive" && <Icon name="archive" size={10} color="currentColor" strokeWidth={2} />}
              {tab.l}
              {tab.count !== undefined && tab.count > 0 && (
                <span style={{ fontSize: 10, background: isActive ? (tab.muted ? t.text3+"30" : t.accent+"30") : t.input, color: isActive ? (tab.muted ? t.text2 : t.accent) : t.text3, padding: "0 5px", borderRadius: 8, fontWeight: 700 }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
          marginLeft: "auto", padding: "3px 6px", borderRadius: 5,
          border: `1px solid ${t.border}`, background: t.input, color: t.text2, fontSize: 11, outline: "none", flexShrink: 0,
        }}>
          <option value="updated">Upravené</option>
          <option value="created">Vytvořené</option>
          <option value="title">A–Z</option>
        </select>
      </div>

      {/* Note list */}
      <div style={{ flex: 1, overflow: "auto", padding: "4px 6px 8px" }}>
        {sorted.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 16px", color: t.text3 }}>
            <div style={{ opacity: .1, marginBottom: 12, display: "flex", justifyContent: "center" }}>
              <Icon name={filter === "archive" ? "archive" : "file-text"} size={48} color={t.text} strokeWidth={1} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 5, color: t.text2 }}>
              {search ? `Nic pro „${search}"` : filter !== "all" ? "Žádné poznámky" : "Zatím žádné poznámky"}
            </div>
            {!search && filter === "all" && (
              <button onClick={onCreate} style={{ marginTop: 10, padding: "7px 18px", borderRadius: 8, border: "none", background: t.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                + Nová poznámka
              </button>
            )}
          </div>
        )}

        {groups.map(group => (
          <div key={group.label ?? "all"}>
            {group.label && (
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: t.text3, padding: "10px 6px 4px" }}>
                {group.label}
              </div>
            )}
            {group.items.map(n => {
              const proj = n.primaryProjectId ? projects.find(p => p.id === n.primaryProjectId) : null;
              const pCol = proj ? projectColor(proj.id) : null;
              const isActive = n.id === selId;
              const preview  = n.content.split("\n").find(l => l.trim() && !l.startsWith("#")) || "";
              const statusInfo = NOTE_STATUSES[n.status] ?? NOTE_STATUSES.draft;

              return (
                <button key={n.id} onClick={() => onSelect(n.id)} style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "9px 10px 9px 14px", borderRadius: 9, marginBottom: 2,
                  background: isActive ? t.accentBg : "transparent",
                  border: `1px solid ${isActive ? t.accent+"35" : "transparent"}`,
                  cursor: "pointer", position: "relative", overflow: "hidden",
                  transition: "background .1s",
                  opacity: n.archived ? 0.6 : 1,
                }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = t.cardH; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  {pCol && <div style={{ position: "absolute", left: 0, top: 4, bottom: 4, width: 3, borderRadius: 2, background: pCol }} />}

                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                    {/* Icon or status dot */}
                    {n.icon ? (
                      <span style={{ fontSize: 13, flexShrink: 0 }}>{n.icon}</span>
                    ) : (
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusInfo.color, flexShrink: 0 }} />
                    )}
                    {n.pinned && (
                      <svg width={10} height={10} viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M12 17v5" /><path d="M9 10.5H5l1.5-2V4h11v4.5L16 10.5h-4z" /><path d="M9 10.5v3a3 3 0 006 0v-3" />
                      </svg>
                    )}
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: isActive ? t.accent : t.text }}>
                      {n.title || <em style={{ fontWeight: 400, color: t.text3 }}>Bez názvu</em>}
                    </span>
                    <span style={{ fontSize: 11, color: t.text3, flexShrink: 0 }}>{relTime(n.updatedAt)}</span>
                  </div>

                  {preview && (
                    <div style={{ fontSize: 11.5, color: t.text3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", lineHeight: 1.5, paddingLeft: n.icon ? 0 : 11 }}>
                      {preview.replace(/^#{1,3} /, "").replace(/\*\*/g,"").replace(/\*/g,"")}
                    </div>
                  )}

                  {/* Tags row */}
                  {n.tags?.length > 0 && (
                    <div style={{ display: "flex", gap: 3, marginTop: 4, paddingLeft: n.icon ? 0 : 11, flexWrap: "nowrap", overflow: "hidden" }}>
                      {n.tags.slice(0, 3).map(tag => (
                        <span key={tag} style={{ fontSize: 10, padding: "1px 5px", borderRadius: 20, background: t.accentBg, color: t.accent, fontWeight: 600, whiteSpace: "nowrap", border: `1px solid ${t.accent}25` }}>
                          #{tag}
                        </span>
                      ))}
                      {n.tags.length > 3 && <span style={{ fontSize: 10, color: t.text3 }}>+{n.tags.length - 3}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: "7px 14px", borderTop: `1px solid ${t.border}`, fontSize: 11.5, color: t.text3, flexShrink: 0 }}>
        {sorted.length} {sorted.length === 1 ? "poznámka" : sorted.length < 5 ? "poznámky" : "poznámek"}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   NotesPage — main
───────────────────────────────────────────── */
export default function NotesPage() {
  const { t, dk, notes, addNote, updateNote, deleteNote, projects, tasks, openNoteId, setOpenNoteId, isMobile } = useApp();
  const toast   = useToast();
  const confirm = useConfirm();

  const [selId,          setSelId]          = useState(null);
  const [editMode,       setEditMode]       = useState(false);
  const [mobileView,     setMobileView]     = useState("list");
  const [templatePicker, setTemplatePicker] = useState(false);
  const [showProps,      setShowProps]      = useState(false);

  useEffect(() => { injectNotionCSS(dk); }, [dk]);

  useEffect(() => {
    if (openNoteId) {
      setSelId(openNoteId);
      setOpenNoteId(null);
      setEditMode(false);
      if (isMobile) setMobileView("detail");
    } else if (!selId && notes.length > 0 && !isMobile) {
      setSelId(notes[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNoteId]);

  useEffect(() => {
    const handler = e => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.ctrlKey || e.metaKey) && e.key === "n") { e.preventDefault(); setTemplatePicker(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleCreate = () => setTemplatePicker(true);

  const handleCreateFromTemplate = (tpl) => {
    const n = addNote({ title: tpl.title, content: tpl.content });
    setSelId(n.id);
    setEditMode(true);
    setTemplatePicker(false);
    if (isMobile) setMobileView("detail");
  };

  const handleDelete = async (id) => {
    if (!await confirm("Smazat poznámku?")) return;
    deleteNote(id);
    const remaining = notes.filter(n => n.id !== id);
    setSelId(remaining.length > 0 ? remaining[0].id : null);
    setEditMode(false);
    if (isMobile) setMobileView("list");
    toast("Poznámka smazána", "success");
  };

  const selNote = notes.find(n => n.id === selId) || null;
  const linkedProject = selNote?.primaryProjectId ? projects.find(p => p.id === selNote.primaryProjectId) : null;
  const linkedTask    = selNote?.primaryTaskId    ? tasks.find(tk => tk.id === selNote.primaryTaskId)     : null;

  const noteMap = useMemo(() => {
    const m = new Map();
    notes.forEach(n => { if (n.title) m.set(n.title.toLowerCase().trim(), n.id); });
    return m;
  }, [notes]);

  const handleOpenNote = useCallback((id) => {
    setSelId(id);
    setEditMode(false);
    if (isMobile) setMobileView("detail");
  }, [isMobile]);

  const showList   = !isMobile || mobileView === "list";
  const showDetail = !isMobile || mobileView === "detail";

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }} className="fi">
      {templatePicker && (
        <TemplatePickerModal onSelect={handleCreateFromTemplate} onClose={() => setTemplatePicker(false)} />
      )}

      {/* LEFT: sidebar */}
      {showList && (
        <div style={{ width: isMobile ? "100%" : 280, minWidth: isMobile ? "auto" : 260, borderRight: isMobile ? "none" : `1px solid ${t.border}`, overflow: "hidden", flex: isMobile ? 1 : "none" }}>
          <NotesSidebar
            notes={notes}
            selId={selId}
            onSelect={id => { setSelId(id); setEditMode(false); if (isMobile) setMobileView("detail"); }}
            onCreate={handleCreate}
            t={t}
            isMobile={isMobile}
            projects={projects}
            tasks={tasks}
          />
        </div>
      )}

      {/* CENTER: editor / preview */}
      {showDetail && (
        <div style={{ flex: 1, display: "flex", overflow: "hidden", background: t.bg, minWidth: 0 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
            {/* Mobile header */}
            {isMobile && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${t.border}`, background: t.bg2, flexShrink: 0 }}>
                <button onClick={() => { setMobileView("list"); setEditMode(false); }} style={{ background: "none", border: "none", color: t.accent, display: "flex", alignItems: "center", gap: 4, padding: "4px 0", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                  <Icon name="chevron-left" size={16} color={t.accent} strokeWidth={2.5} />
                  Zpět
                </button>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: "0 8px" }}>
                  {selNote?.title || "Nová poznámka"}
                </span>
                {selNote && !editMode && (
                  <button onClick={() => setEditMode(true)} style={{ background: "none", border: `1px solid ${t.border}`, color: t.text2, borderRadius: 7, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>
                    Upravit
                  </button>
                )}
                {editMode && (
                  <button onClick={() => setEditMode(false)} style={{ background: "none", border: `1px solid ${t.border}`, color: t.accent, borderRadius: 7, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>
                    Hotovo
                  </button>
                )}
                {selNote && (
                  <>
                    <button onClick={() => setShowProps(v => !v)} style={{ background: showProps ? t.accentBg : "none", border: `1px solid ${showProps ? t.accent+"60" : t.border}`, color: showProps ? t.accent : t.text3, borderRadius: 7, padding: "5px 8px", cursor: "pointer", display: "flex" }}>
                      <Icon name="settings" size={15} color="currentColor" strokeWidth={2} />
                    </button>
                    <button onClick={() => handleDelete(selNote.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 4, display: "flex" }}>
                      <Icon name="trash" size={16} color="#ef4444" strokeWidth={2} />
                    </button>
                  </>
                )}
              </div>
            )}

            {selNote ? (
              editMode ? (
                <NoteEditor
                  note={selNote}
                  onSave={upd => updateNote(selNote.id, upd)}
                  onExitEdit={() => setEditMode(false)}
                  t={t}
                  isMobile={isMobile}
                />
              ) : (
                <NotePreview
                  note={selNote}
                  onEdit={() => setEditMode(true)}
                  onDelete={() => handleDelete(selNote.id)}
                  onTogglePin={() => updateNote(selNote.id, { pinned: !selNote.pinned })}
                  t={t}
                  isMobile={isMobile}
                  linkedProject={linkedProject}
                  linkedTask={linkedTask}
                  noteMap={noteMap}
                  onOpenNote={handleOpenNote}
                  showProps={showProps}
                  onToggleProps={() => setShowProps(v => !v)}
                />
              )
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: t.text3, gap: 12 }}>
                <div style={{ opacity: .1 }}>
                  <Icon name="file-text" size={72} color={t.text} strokeWidth={.75} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: t.text2, fontFamily: "'Outfit',sans-serif" }}>Žádná poznámka vybrána</div>
                <div style={{ fontSize: 13 }}>Vyber ze seznamu nebo vytvoř novou</div>
                <button onClick={handleCreate} style={{ marginTop: 4, padding: "9px 22px", borderRadius: 10, border: "none", background: t.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  + Nová poznámka
                </button>
              </div>
            )}
          </div>

          {/* RIGHT: properties panel */}
          {showProps && selNote && (
            <NotePropertiesPanel
              note={selNote}
              onClose={() => setShowProps(false)}
              t={t}
              isMobile={isMobile}
            />
          )}
        </div>
      )}
    </div>
  );
}
