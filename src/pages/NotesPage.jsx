import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { useConfirm } from '../components/Confirm.jsx'
import Icon from '../components/Icon.jsx'
import { NOTE_TEMPLATES } from '../constants.js'
import { projectColor, relTime, useDebouncedEffect, sanitizeHtml } from '../utils.js'
import { supabase } from '../supabase.js'
import { compareText, formatDateTime, formatDate } from '../locale.js'

/* ─────────────────────────────────────────────
   Notion-style markdown renderer
   Produkuje hezčí HTML než generický renderMarkdown
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
    // Note links [[title]] — before standard markdown
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
  const textColor  = dk ? "#e8ecf4" : "#1a1e2e";
  const text2      = dk ? "#8b95a5" : "#6b7280";
  const text3      = dk ? "#5a6375" : "#9ca3af";
  const border     = dk ? "#242838" : "#e5e7ec";
  const codeBg     = dk ? "#181b28" : "#f1f5f9";
  const bqBg       = dk ? "#1e2236" : "#f8fafc";
  const accent     = dk ? "#3b82f6" : "#3b6ef6";
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
  { id:"h1",       icon:"type",      label:"Nadpis 1",         insert:"# "           },
  { id:"h2",       icon:"type",      label:"Nadpis 2",         insert:"## "          },
  { id:"h3",       icon:"type",      label:"Nadpis 3",         insert:"### "         },
  { id:"bullet",   icon:"list",      label:"Odrážkový seznam", insert:"- "           },
  { id:"numbered", icon:"list",      label:"Číslovaný seznam", insert:"1. "          },
  { id:"todo",     icon:"check-square",label:"Úkol / checkbox",insert:"- [ ] "      },
  { id:"quote",    icon:"message-square",label:"Citace",       insert:"> "           },
  { id:"code",     icon:"code",      label:"Blok kódu",        insert:"```\n\n```",  cursor:-4 },
  { id:"divider",  icon:"minus",     label:"Oddělovač",        insert:"\n---\n"      },
  { id:"bold",     icon:"bold",      label:"Tučný text",       insert:"**tučně**",   cursor:-2 },
];

function SlashMenu({ query, onSelect, onClose, t }) {
  const filtered = SLASH_COMMANDS.filter(c =>
    !query || c.label.toLowerCase().includes(query.toLowerCase()) || c.id.includes(query.toLowerCase())
  );
  const [cursor, setCursor] = useState(0);
  const listRef = useRef(null);

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
      borderRadius: 10, boxShadow: t.shadow,
      overflow: "hidden",
    }}>
      <div style={{ padding: "5px 8px 4px", fontSize: 12, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em" }}>
        Příkazy
      </div>
      {filtered.map((cmd, i) => (
        <button
          key={cmd.id}
          onClick={() => onSelect(cmd)}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            padding: "7px 10px", border: "none",
            background: i === cursor ? t.accentBg : "transparent",
            color: i === cursor ? t.accent : t.text,
            fontSize: 13, cursor: "pointer", textAlign: "left",
          }}
          onMouseEnter={() => setCursor(i)}
        >
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
      if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
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
      <div style={{ padding: "5px 8px 4px", fontSize: 12, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em" }}>
        Propojit poznámku
      </div>
      {filtered.map((note, i) => (
        <button
          key={note.id}
          onClick={() => onSelect(note)}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            padding: "7px 10px", border: "none",
            background: i === cursor ? t.accentBg : "transparent",
            color: i === cursor ? t.accent : t.text,
            fontSize: 13, cursor: "pointer", textAlign: "left",
          }}
          onMouseEnter={() => setCursor(i)}
        >
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
   NoteAIPanel — AI actions for notes
───────────────────────────────────────────── */
const NOTE_AI_ACTIONS = [
  { id: "note_summary",       icon: "align-left",   label: "Shrnutí"   },
  { id: "note_continue",      icon: "edit-2",        label: "Pokračovat" },
  { id: "note_extract_tasks", icon: "check-square",  label: "Úkoly"     },
];

function NoteAIPanel({ t, loading, result, action, onRun, onApply, onDismiss }) {
  return (
    <div style={{
      borderBottom: `1px solid ${t.border}`,
      background: t.accentBg,
      padding: "8px 40px 10px",
      flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13 }}>✨</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: t.accent }}>AI asistent</span>
        <div style={{ display: "flex", gap: 4 }}>
          {NOTE_AI_ACTIONS.map((a) => (
            <button
              key={a.id}
              onClick={() => onRun(a.id)}
              disabled={!!loading}
              title={a.label}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: `1px solid ${action === a.id ? t.accent + "60" : t.border}`,
                background: action === a.id ? t.accent + "20" : t.input,
                color: action === a.id ? t.accent : t.text2,
                cursor: loading ? "wait" : "pointer",
                opacity: loading && loading !== a.id ? 0.5 : 1,
                transition: "all .12s",
              }}
            >
              {loading === a.id
                ? <span style={{ animation: "spin .7s linear infinite", display: "inline-block", fontSize: 12 }}>◌</span>
                : <Icon name={a.icon} size={11} color="currentColor" strokeWidth={2} />
              }
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {result !== null && (
        <div style={{
          background: t.bg, border: `1px solid ${t.border}`,
          borderRadius: 8, padding: "10px 12px", marginTop: 8,
        }}>
          <NoteAIResult action={action} result={result} t={t} />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {action !== "note_summary" && (
              <button
                onClick={onApply}
                style={{
                  padding: "6px 14px", borderRadius: 6, border: "none",
                  background: t.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}
              >
                {action === "note_extract_tasks" ? "Přidat jako úkoly" : "Přidat do poznámky"}
              </button>
            )}
            <button
              onClick={onDismiss}
              style={{
                padding: "6px 12px", borderRadius: 6,
                border: `1px solid ${t.border}`, background: "transparent",
                color: t.text2, fontSize: 12, cursor: "pointer",
              }}
            >
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
        <div style={{ fontSize: 12, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 }}>Shrnutí</div>
        <div style={{ fontSize: 13, color: t.text, lineHeight: 1.6 }}>{result}</div>
      </div>
    );
  }
  if (action === "note_continue" && typeof result === "string") {
    return (
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 }}>Navrhované pokračování</div>
        <div style={{ fontSize: 13, color: t.text, lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 160, overflow: "auto" }}>{result}</div>
      </div>
    );
  }
  if (action === "note_extract_tasks" && Array.isArray(result)) {
    return (
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 }}>Nalezené úkoly ({result.length})</div>
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
  const [title, setTitle]   = useState(note.title);
  const [content, setContent] = useState(note.content);
  const contentRef = useRef(null);
  const titleRef   = useRef(null);
  const slashRef   = useRef(null);

  // Slash command state
  const [slashPos,   setSlashPos]   = useState(null);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashStart, setSlashStart] = useState(null);

  // Note-link autocomplete state [[
  const [linkPos,   setLinkPos]   = useState(null);
  const [linkQuery, setLinkQuery] = useState("");
  const [linkStart, setLinkStart] = useState(null);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
  }, [note.id]);

  // Auto-grow textarea
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [content]);

  // Auto-save
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
    const lineText = val.slice(lineStart, pos);

    // Slash command detection (line must start with /)
    if (lineText.startsWith("/")) {
      setSlashQuery(lineText.slice(1));
      setSlashStart(lineStart);
      setSlashPos({ top: "100%", left: 0 });
      setLinkPos(null);
      setLinkStart(null);
      return;
    }
    setSlashPos(null);
    setSlashStart(null);

    // Note-link detection: [[ ... without closing ]]
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
    setLinkPos(null);
    setLinkStart(null);
  };

  const handleLinkSelect = (selectedNote) => {
    const el = contentRef.current;
    if (!el || linkStart == null) return;
    const pos = el.selectionStart;
    const before = content.slice(0, linkStart);
    const after  = content.slice(pos);
    const inserted = `[[${selectedNote.title}]]`;
    const newContent = before + inserted + after;
    setContent(newContent);
    setLinkPos(null);
    setLinkStart(null);
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
    const before = content.slice(0, slashStart);
    const after  = content.slice(pos);
    const newContent = before + cmd.insert + after;
    setContent(newContent);
    setSlashPos(null);
    setSlashStart(null);
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
      display: "flex", alignItems: "center",
      transition: "background .1s",
    }}
      onMouseEnter={e => { e.currentTarget.style.background = t.input; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
    >
      <Icon name={icon} size={14} color={t.text2} strokeWidth={1.8} />
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Minimal toolbar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 2,
        padding: "6px 40px", borderBottom: `1px solid ${t.border}`,
        flexShrink: 0, flexWrap: "wrap", background: t.bg2,
      }}>
        {tbBtn("bold",           "Tučné (Ctrl+B)",  () => insertAtCursor("**","**","tučně"))}
        {tbBtn("italic",         "Kurzíva",         () => insertAtCursor("*","*","kurzíva"))}
        {tbBtn("type",           "Nadpis H2",       () => insertAtCursor("## ","","Nadpis"))}
        {tbBtn("link",           "Odkaz",           () => insertAtCursor("[","](url)","text"))}
        {tbBtn("list",           "Odrážka",         () => insertAtCursor("- ","","položka"))}
        {tbBtn("check-square",   "Checkbox",        () => insertAtCursor("- [ ] ","","úkol"))}
        {tbBtn("message-square", "Citace",          () => insertAtCursor("> ","","citace"))}
        {tbBtn("code",           "Kód",             () => insertAtCursor("`","`","kód"))}
        <div style={{ width: 1, height: 16, background: t.border, margin: "0 4px" }} />
        <span style={{ fontSize: 12, color: t.text3, padding: "2px 4px" }}>/ pro příkazy</span>
        <button
          onClick={onExitEdit}
          style={{
            marginLeft: "auto", display: "flex", alignItems: "center", gap: 5,
            padding: "4px 10px", borderRadius: 7, border: `1px solid ${t.border}`,
            background: "transparent", color: t.text3, fontSize: 12, cursor: "pointer",
          }}
        >
          <Icon name="eye" size={12} color={t.text3} strokeWidth={2} />
          Náhled
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "24px 20px" : "32px 60px 60px", maxWidth: 860, margin: "0 auto", width: "100%" }}>
        {/* Title */}
        <input
          ref={titleRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Bez názvu"
          style={{
            width: "100%", border: "none", background: "transparent",
            color: t.text, outline: "none",
            fontFamily: "'Outfit', sans-serif",
            fontSize: isMobile ? 26 : 34,
            fontWeight: 800, letterSpacing: "-.03em",
            lineHeight: 1.2, marginBottom: 24,
            display: "block",
          }}
        />

        {/* Content textarea */}
        <div style={{ position: "relative" }}>
          <textarea
            ref={contentRef}
            value={content}
            onChange={handleContentChange}
            placeholder={"Začni psát… nebo napiš / pro příkaz"}
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

          {/* Slash command menu */}
          {slashPos && (
            <div style={{ position: "relative" }}>
              <SlashMenu
                query={slashQuery}
                onSelect={handleSlashSelect}
                onClose={() => { setSlashPos(null); setSlashStart(null); }}
                t={t}
              />
            </div>
          )}

          {/* Note-link autocomplete */}
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
   NotePreview — read mode (default)
───────────────────────────────────────────── */
function NotePreview({ note, onEdit, onDelete, onTogglePin, t, isMobile, linkedProject, linkedTask, noteMap, onOpenNote }) {
  const { addTask, updateNote, activeWorkspaceId } = useApp();
  const wordCount = note.content.trim() ? note.content.trim().split(/\s+/).length : 0;
  const readMin   = Math.max(1, Math.round(wordCount / 200));
  const projColor = linkedProject ? projectColor(linkedProject.id) : null;

  // AI state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiAction, setAiAction] = useState(null);

  const runAI = async (action) => {
    setAiLoading(action);
    setAiResult(null);
    setAiAction(action);
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
      aiResult.forEach((text) => {
        if (typeof text === "string" && text.trim()) addTask({ title: text.trim() });
      });
    }
    setAiResult(null); setAiAction(null);
  };

  // Click delegation for [[note-links]]
  const handleBodyClick = useCallback((e) => {
    const link = e.target.closest("[data-noteid]");
    if (link) { e.stopPropagation(); onOpenNote?.(link.dataset.noteid); return; }
    onEdit?.();
  }, [onEdit, onOpenNote]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Top bar */}
      {!isMobile && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 60px 8px 40px", flexShrink: 0,
          borderBottom: `1px solid ${t.border}`, background: t.bg2,
        }}>
          {linkedProject && (
            <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 9px", borderRadius: 20, border: `1.5px solid ${projColor}55`, background: projColor+"12", color: projColor, display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Icon name="folder" size={9} color={projColor} strokeWidth={2} />
              {linkedProject.name}
            </span>
          )}
          {linkedTask && (
            <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 9px", borderRadius: 20, border: `1.5px solid #3b82f655`, background: "#3b82f612", color: "#3b82f6", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Icon name="check-square" size={9} color="#3b82f6" strokeWidth={2} />
              {linkedTask.title || "Úkol"}
            </span>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            {/* AI button */}
            <button
              onClick={() => setAiOpen((v) => !v)}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, border: `1px solid ${aiOpen ? t.accent+"60" : t.border}`, background: aiOpen ? t.accentBg : "transparent", color: aiOpen ? t.accent : t.text2, fontSize: 12, cursor: "pointer", transition: "all .12s" }}
            >
              <span>✨</span> AI
            </button>
            <button onClick={onEdit} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 7, border: `1px solid ${t.border}`, background: "transparent", color: t.text2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <Icon name="edit-2" size={12} color={t.text2} strokeWidth={2} />
              Upravit
            </button>
            <button onClick={onTogglePin} title={note.pinned ? "Odepnout" : "Připnout"} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, border: `1px solid ${note.pinned ? "#f59e0b" : t.border}`, background: note.pinned ? "#f59e0b18" : "transparent", color: note.pinned ? "#f59e0b" : t.text3, fontSize: 12, cursor: "pointer" }}>
              <Icon name="pin" size={12} color="currentColor" strokeWidth={2} />
            </button>
            {onDelete && (
              <button onClick={onDelete} style={{ display: "flex", alignItems: "center", padding: "5px 8px", borderRadius: 7, border: "none", background: "transparent", color: t.text3, cursor: "pointer" }}>
                <Icon name="trash" size={13} color="#ef4444" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* AI Panel */}
      {aiOpen && !isMobile && (
        <NoteAIPanel
          note={note} t={t} loading={aiLoading} result={aiResult} action={aiAction}
          onRun={runAI} onApply={applyAI}
          onDismiss={() => { setAiResult(null); setAiAction(null); }}
        />
      )}

      {/* Content */}
      <div
        style={{ flex: 1, overflow: "auto", padding: isMobile ? "24px 20px 32px" : "40px 60px 60px" }}
      >
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <h1
            style={{ fontFamily: "'Outfit', sans-serif", fontSize: isMobile ? 26 : 34, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.2, marginBottom: 28, color: t.text, cursor: "text" }}
            onClick={onEdit}
          >
            {note.title || <span style={{ color: t.text3, fontWeight: 400, fontStyle: "italic" }}>Bez názvu</span>}
          </h1>

          <div style={{ display: "flex", gap: 16, marginBottom: 32, paddingBottom: 20, borderBottom: `1px solid ${t.border}`, fontSize: 12, color: t.text3 }}>
            <span>Upraveno {formatDateTime(note.updatedAt)}</span>
            {wordCount > 0 && <span>{wordCount} slov · {readMin} min čtení</span>}
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

      <NoteProperties note={note} t={t} isMobile={isMobile} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   NoteProperties — collapsible metadata panel
───────────────────────────────────────────── */
function NoteProperties({ note, t, isMobile }) {
  const { updateNote, projects, tasks } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ flexShrink: 0, borderTop: `1px solid ${t.border}`, background: t.bg2 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8,
          padding: "9px 20px", border: "none", background: "transparent",
          color: t.text3, fontSize: 12, cursor: "pointer", fontWeight: 500,
        }}
      >
        <Icon name={open ? "chevron-down" : "chevron-right"} size={12} color={t.text3} strokeWidth={2} />
        Vlastnosti
        <span style={{ marginLeft: "auto", fontSize: 12, opacity: .6 }}>
          {formatDateTime(note.updatedAt)}
        </span>
      </button>
      {open && (
        <div style={{ padding: "8px 20px 16px" }} className="fi">
          <div style={{ fontSize: 12, fontWeight: 600, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Vazba</div>
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
            <option value="">— Bez vazby</option>
            <optgroup label="Projekty">
              {projects.map(p => <option key={p.id} value={`project:${p.id}`}>{p.name}</option>)}
            </optgroup>
            <optgroup label="Úkoly">
              {tasks.map(tk => <option key={tk.id} value={`task:${tk.id}`}>{tk.title || "Bez názvu"}</option>)}
            </optgroup>
          </select>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={() => updateNote(note.id, { pinned: !note.pinned })} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 7, border: `1.5px solid ${note.pinned ? "#f59e0b" : t.border}`, background: note.pinned ? "#f59e0b18" : "transparent", color: note.pinned ? "#f59e0b" : t.text2, fontSize: 12, cursor: "pointer" }}>
              <Icon name="pin" size={12} color="currentColor" strokeWidth={2} />
              {note.pinned ? "Připnuto" : "Připnout"}
            </button>
          </div>
          <div style={{ fontSize: 12, color: t.text3, marginTop: 10, lineHeight: 1.7 }}>
            <div>Vytvořeno: {formatDateTime(note.createdAt)}</div>
            <div>Upraveno: {formatDateTime(note.updatedAt)}</div>
          </div>
        </div>
      )}
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
      <div onClick={e => e.stopPropagation()} style={{ background: t.bg2, borderRadius: 16, padding: 28, maxWidth: 540, width: "calc(100% - 32px)", maxHeight: "88vh", overflowY: "auto", boxShadow: t.shadow }}>
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
            <button
              key={tpl.id}
              onClick={() => onSelect(tpl)}
              style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, padding: "16px", borderRadius: 10, border: `1px solid ${t.border}`, background: t.bg, color: t.text, cursor: "pointer", textAlign: "left", transition: "all .12s" }}
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
function NotesSidebar({ notes, selId, onSelect, onCreate, t, isMobile, projects, tasks }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("updated");

  const s = search.toLowerCase();
  let filtered = notes.filter(n => !search || n.title.toLowerCase().includes(s) || n.content.toLowerCase().includes(s));
  if (filter === "pinned")   filtered = filtered.filter(n => n.pinned);
  else if (filter === "project") filtered = filtered.filter(n => !!n.primaryProjectId);
  else if (filter === "task")    filtered = filtered.filter(n => !!n.primaryTaskId);
  else if (filter === "free")    filtered = filtered.filter(n => !n.primaryProjectId && !n.primaryTaskId);

  const sorted = [...filtered].sort((a,b) => {
    if (sortBy === "updated") return b.updatedAt - a.updatedAt;
    if (sortBy === "created") return b.createdAt - a.createdAt;
    return compareText(a.title, b.title);
  });

  // Grouping by time
  const now = Date.now();
  const todayStart    = new Date(); todayStart.setHours(0,0,0,0);
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const weekStart      = new Date(todayStart.getTime() - 6*86400000);

  const groups = sortBy === "updated" ? [
    { label: "Dnes",    items: sorted.filter(n => n.updatedAt >= todayStart.getTime()) },
    { label: "Včera",   items: sorted.filter(n => n.updatedAt >= yesterdayStart.getTime() && n.updatedAt < todayStart.getTime()) },
    { label: "Tento týden", items: sorted.filter(n => n.updatedAt >= weekStart.getTime() && n.updatedAt < yesterdayStart.getTime()) },
    { label: "Starší",  items: sorted.filter(n => n.updatedAt < weekStart.getTime()) },
  ].filter(g => g.items.length > 0) : [{ label: null, items: sorted }];

  const filterTabs = [
    { k:"all",     l:"Vše",       count: notes.length },
    { k:"pinned",  l:"📌 Připnuto" },
    { k:"project", l:"Projekt" },
    { k:"free",    l:"Volné" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: t.bg2 }}>
      {/* Header */}
      <div style={{ padding: "16px 14px 10px", borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Icon name="file-text" size={16} color={t.accent} strokeWidth={2} />
            <span style={{ fontSize: 15, fontWeight: 800, fontFamily: "'Outfit',sans-serif", letterSpacing: "-.3px" }}>Poznámky</span>
            <span style={{ fontSize: 12, color: t.text3, background: t.input, padding: "1px 7px", borderRadius: 8 }}>{notes.length}</span>
          </div>
          <button
            onClick={onCreate}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: "none", background: t.accent, color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
          >
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

      {/* Filters + sort */}
      <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "6px 10px", overflowX: "auto", borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
        {filterTabs.map(tab => (
          <button key={tab.k} onClick={() => setFilter(tab.k)} style={{
            padding: "4px 10px", borderRadius: 6, fontSize: 12, whiteSpace: "nowrap",
            fontWeight: filter === tab.k ? 700 : 400, border: "none", flexShrink: 0,
            background: filter === tab.k ? t.accentBg : "transparent",
            color: filter === tab.k ? t.accent : t.text3, cursor: "pointer",
          }}>
            {tab.l}
          </button>
        ))}
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
          marginLeft: "auto", padding: "3px 6px", borderRadius: 5,
          border: `1px solid ${t.border}`, background: t.input, color: t.text2, fontSize: 12, outline: "none", flexShrink: 0,
        }}>
          <option value="updated">Upravené</option>
          <option value="created">Vytvořené</option>
          <option value="title">A–Z</option>
        </select>
      </div>

      {/* Note list */}
      <div style={{ flex: 1, overflow: "auto", padding: "4px 8px 8px" }}>
        {sorted.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 16px", color: t.text3 }}>
            <div style={{ opacity: .12, marginBottom: 12, display: "flex", justifyContent: "center" }}>
              <Icon name="file-text" size={48} color={t.text} strokeWidth={1} />
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
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: t.text3, padding: "10px 6px 4px" }}>
                {group.label}
              </div>
            )}
            {group.items.map(n => {
              const proj = n.primaryProjectId ? projects.find(p => p.id === n.primaryProjectId) : null;
              const pCol = proj ? projectColor(proj.id) : null;
              const isActive = n.id === selId;
              const preview = n.content.split("\n").find(l => l.trim() && !l.startsWith("#")) || "";

              return (
                <button
                  key={n.id}
                  onClick={() => onSelect(n.id)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "10px 12px 10px 14px", borderRadius: 9, marginBottom: 2,
                    background: isActive ? t.accentBg : "transparent",
                    border: `1px solid ${isActive ? t.accent+"35" : "transparent"}`,
                    cursor: "pointer", position: "relative", overflow: "hidden",
                    transition: "background .1s",
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = t.cardH; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  {pCol && <div style={{ position: "absolute", left: 0, top: 4, bottom: 4, width: 3, borderRadius: 2, background: pCol }} />}

                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                    {n.pinned && <span style={{ fontSize: 12 }}>📌</span>}
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: isActive ? t.accent : t.text }}>
                      {n.title || <em style={{ fontWeight: 400, color: t.text3 }}>Bez názvu</em>}
                    </span>
                    <span style={{ fontSize: 12, color: t.text3, flexShrink: 0 }}>{relTime(n.updatedAt)}</span>
                  </div>
                  {preview && (
                    <div style={{ fontSize: 12, color: t.text3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", lineHeight: 1.5 }}>
                      {preview.replace(/^#{1,3} /, "").replace(/\*\*/g,"").replace(/\*/g,"")}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: "7px 14px", borderTop: `1px solid ${t.border}`, fontSize: 12, color: t.text3, flexShrink: 0 }}>
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
  const [mobileView,     setMobileView]     = useState("list");  // list | detail
  const [templatePicker, setTemplatePicker] = useState(false);

  // Inject Notion CSS whenever dk changes
  useEffect(() => { injectNotionCSS(dk); }, [dk]);

  // openNoteId from context (e.g. from dashboard)
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

  // ⌘N shortcut
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
        <TemplatePickerModal
          onSelect={handleCreateFromTemplate}
          onClose={() => setTemplatePicker(false)}
        />
      )}

      {/* ── LEFT: sidebar ── */}
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

      {/* ── RIGHT: editor / preview ── */}
      {showDetail && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: t.bg }}>
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
                <button onClick={() => handleDelete(selNote.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 4, display: "flex" }}>
                  <Icon name="trash" size={16} color="#ef4444" strokeWidth={2} />
                </button>
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
      )}
    </div>
  );
}
