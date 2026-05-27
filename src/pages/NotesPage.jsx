import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { useConfirm } from '../components/Confirm.jsx'
import Icon from '../components/Icon.jsx'
import { NOTE_TEMPLATES, NOTE_STATUSES } from '../constants.js'
import { projectColor, relTime, sanitizeHtml } from '../utils.js'
import { supabase } from '../supabase.js'
import { compareText, formatDateTime } from '../locale.js'

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
  const accent= dk ? "#3b82f6" : "#3b6ef6";
  el.textContent = `
.note-ce { color: ${text}; font-size: 16px; line-height: 1.75; outline: none; min-height: 460px; }
.note-ce h1 { font-family:'Outfit',sans-serif; font-size: 2em; font-weight: 800; margin: 1.2em 0 .35em; letter-spacing: -.02em; }
.note-ce h2 { font-family:'Outfit',sans-serif; font-size: 1.35em; font-weight: 700; margin: 1.1em 0 .3em; letter-spacing: -.01em; color: ${text}; }
.note-ce h3 { font-family:'Outfit',sans-serif; font-size: 1.1em; font-weight: 600; margin: .9em 0 .25em; color: ${text2}; }
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
.note-ce [data-type="todo"] input[type="checkbox"] { margin-top:4px; accent-color:${accent}; transform:scale(1.1); cursor:pointer; }
.note-ce [data-type="todo"].done span { text-decoration:line-through; color:${text3}; }
  `;
}

/* ─── Markdown to HTML (for importing existing notes) ─── */
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

/* ─── TemplatePickerModal ───────────────────── */
function TemplatePickerModal({ onSelect, onClose }) {
  const { t } = useApp();
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:400, background:"#0007", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:t.bg2, borderRadius:16, padding:28, maxWidth:560, width:"calc(100% - 32px)", maxHeight:"88vh", overflowY:"auto", boxShadow:t.shadow }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:800, fontFamily:"'Outfit',sans-serif", marginBottom:4 }}>Nová poznámka</div>
            <div style={{ fontSize:12, color:t.text3 }}>Vyber šablonu nebo začni prázdnou stránkou</div>
          </div>
          <button onClick={onClose} style={{ background:t.input, border:`1px solid ${t.border}`, borderRadius:8, padding:6, cursor:"pointer", display:"flex" }}>
            <Icon name="x" size={16} color={t.text3} strokeWidth={2} />
          </button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10 }}>
          {NOTE_TEMPLATES.map(tpl => (
            <button key={tpl.id} onClick={()=>onSelect(tpl)} style={{
              display:"flex", flexDirection:"column", alignItems:"flex-start", gap:8,
              padding:16, borderRadius:10, border:`1px solid ${t.border}`,
              background:t.bg, color:t.text, cursor:"pointer", textAlign:"left", transition:"all .12s",
            }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=t.accent; e.currentTarget.style.background=t.accentBg;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=t.border; e.currentTarget.style.background=t.bg;}}
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

/* ─── NoteAI Panel ──────────────────────────── */
const NOTE_AI_ACTIONS = [
  { id:"note_summary",       icon:"align-left",  label:"Shrnutí"    },
  { id:"note_continue",      icon:"edit-2",       label:"Pokračovat" },
  { id:"note_extract_tasks", icon:"check-square", label:"Úkoly"      },
];

/* ─── NoteEditor (contenteditable WYSIWYG) ──── */
function NoteEditor({ note, onSave, t, isMobile, showProps, onToggleProps, onDelete, onTogglePin, projects, tasks, addTask, activeWorkspaceId }) {
  const editorRef  = useRef(null);
  const titleRef   = useRef(null);
  const saveTimer  = useRef(null);
  const [title,    setTitle]    = useState(note.title);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved
  const [aiOpen,   setAiOpen]   = useState(false);
  const [aiAction, setAiAction] = useState(null);
  const [aiLoading,setAiLoading]= useState(null);
  const [aiResult, setAiResult] = useState(null);

  // Load new note content into contenteditable
  useEffect(() => {
    setTitle(note.title);
    if (titleRef.current) titleRef.current.value = note.title;
    if (editorRef.current) {
      editorRef.current.innerHTML = initEditorContent(note.content);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  const triggerSave = useCallback((data) => {
    setSaveState("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await onSave(data);
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
      } catch {
        setSaveState("idle");
      }
    }, 700);
  }, [onSave]);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    triggerSave({ title: e.target.value, content: editorRef.current?.innerHTML || "" });
  };

  const handleContentInput = () => {
    triggerSave({ title: titleRef.current?.value || title, content: editorRef.current?.innerHTML || "" });
  };

  // Keep selection to restore after formatbar click
  const savedRange = useRef(null);
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
    editorRef.current?.focus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const insertHtml = useCallback((html) => {
    editorRef.current?.focus();
    restoreRange();
    document.execCommand("insertHTML", false, html);
    editorRef.current?.focus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const insertCallout = () => insertHtml(`<div class="callout"><span class="callout-icon">💡</span><div><strong>Poznámka:</strong> doplň obsah callout bloku.</div></div><p><br></p>`);
  const insertTodo    = () => insertHtml(`<div data-type="todo"><input type="checkbox"><span>Nový akční bod</span></div>`);
  const insertTable   = () => insertHtml(`<table><tr><th>Věc</th><th>Stav</th></tr><tr><td>Položka 1</td><td>Přidat</td></tr></table><p><br></p>`);

  const exportMD = () => {
    const content = editorRef.current?.innerText || "";
    const blob = new Blob([`# ${note.title}\n\n${content}`], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: `${note.title || "poznamka"}.md` });
    a.click(); URL.revokeObjectURL(url);
  };

  // AI
  const runAI = async (action) => {
    setAiLoading(action); setAiResult(null); setAiAction(action);
    try {
      const { data, error } = await supabase.functions.invoke("ai-task-assist", {
        body: { action, note: { title: note.title, content: editorRef.current?.innerText || "" }, workspaceId: activeWorkspaceId },
      });
      if (error) throw error;
      const raw = data?.result ?? "";
      if (action === "note_extract_tasks") {
        try { const c = raw.replace(/^```[a-z]*\n?/i,"").replace(/```$/,"").trim(); setAiResult(JSON.parse(c)); }
        catch { setAiResult([raw]); }
      } else setAiResult(raw);
    } catch (e) { setAiResult("Chyba: " + (e.message || String(e))); }
    finally { setAiLoading(null); }
  };

  const applyAI = () => {
    if (aiAction === "note_continue" && typeof aiResult === "string") {
      insertHtml("<p>" + aiResult.replace(/\n/g, "<br>") + "</p>");
    } else if (aiAction === "note_extract_tasks" && Array.isArray(aiResult)) {
      aiResult.forEach(text => { if (typeof text === "string" && text.trim()) addTask({ title: text.trim() }); });
    }
    setAiResult(null); setAiAction(null);
  };

  const statusInfo = NOTE_STATUSES[note.status] ?? NOTE_STATUSES.draft;
  const linkedProject = note.primaryProjectId ? projects.find(p => p.id === note.primaryProjectId) : null;
  const linkedTask    = note.primaryTaskId    ? tasks.find(tk => tk.id === note.primaryTaskId)     : null;
  const wordCount = editorRef.current ? (editorRef.current.innerText.trim().split(/\s+/).filter(Boolean).length) : 0;

  const FmtBtn = ({ label, title: ttl, onClick, mono }) => (
    <button
      onMouseDown={e => { e.preventDefault(); saveRange(); onClick(); }}
      title={ttl}
      style={{
        height:30, border:"none", borderRadius:8, background:"transparent", color:t.text2,
        padding:"0 9px", fontWeight:700, fontSize:13, cursor:"pointer", whiteSpace:"nowrap",
        fontFamily: mono ? "'JetBrains Mono',monospace" : "inherit",
        transition:"background .1s",
      }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.07)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >{label}</button>
  );

  const FmtDivider = () => <div style={{ width:1, height:18, background:t.border, flexShrink:0, margin:"0 2px" }} />;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden", position:"relative" }}>
      {/* Topbar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:`1px solid ${t.border}`, padding:"0 20px", height:52, flexShrink:0, background:t.bg2 }}>
        <div style={{ display:"flex", alignItems:"center", gap:7, fontSize:13, color:t.text3, minWidth:0 }}>
          <span>Poznámky</span>
          <span style={{ opacity:.5 }}>›</span>
          <span style={{ color:t.text, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{note.title || "Bez názvu"}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
          {/* Save indicator */}
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
                {aiAction !== "note_summary" && (
                  <button onClick={applyAI} style={{ padding:"5px 14px", borderRadius:6, border:"none", background:t.accent, color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                    {aiAction==="note_extract_tasks" ? "Přidat jako úkoly" : "Přidat do poznámky"}
                  </button>
                )}
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
            display:"flex", alignItems:"center", gap:5, flexWrap:"nowrap", overflowX:"auto",
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
            <FmtBtn label={<em style={{fontStyle:"italic"}}>I</em>} ttl="Kurzíva" onClick={()=>exec("italic")} />
            <FmtBtn label={<u>U</u>} ttl="Podtržení" onClick={()=>exec("underline")} />
            <FmtBtn label={<s>S</s>} ttl="Přeškrtnutí" onClick={()=>exec("strikeThrough")} />
            <FmtDivider />
            <FmtBtn label="• List" ttl="Odrážky" onClick={()=>exec("insertUnorderedList")} />
            <FmtBtn label="1. List" ttl="Číslování" onClick={()=>exec("insertOrderedList")} />
            <FmtBtn label="☑ To-do" ttl="Checkbox" onClick={insertTodo} />
            <FmtDivider />
            <FmtBtn label="🔗 Odkaz" ttl="Vložit odkaz" onClick={()=>{ saveRange(); const url=prompt("URL:","https://"); if(url) exec("createLink",url); }} />
            <FmtBtn label="💡 Callout" ttl="Callout blok" onClick={insertCallout} />
            <FmtBtn label="▦ Tabulka" ttl="Vložit tabulku" onClick={insertTable} />
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
              fontFamily:"'Outfit',sans-serif",
              fontSize:"clamp(32px, 4vw, 50px)", fontWeight:900, letterSpacing:"-.04em", lineHeight:1.04,
              marginBottom:12, display:"block",
            }}
          />

          {/* Meta-line: time · words · project · status */}
          <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", color:t.text3, fontSize:12, paddingBottom:18, borderBottom:`1px solid ${t.border}`, marginBottom:22 }}>
            <span>Upraveno {formatDateTime(note.updatedAt)}</span>
            <span style={{ opacity:.4 }}>·</span>
            <span>{wordCount} slov</span>
            {linkedProject && (
              <span style={{ color:"#dbeafe", background:"rgba(59,130,246,.16)", border:"1px solid rgba(59,130,246,.22)", padding:"3px 9px", borderRadius:999, fontWeight:700, fontSize:12 }}>
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
            {note.tags?.length > 0 && note.tags.slice(0, 4).map(tag => (
              <span key={tag} style={{ color:t.text3, background:"rgba(255,255,255,.06)", border:`1px solid rgba(255,255,255,.06)`, padding:"3px 7px", borderRadius:999, fontSize:11.5 }}>
                #{tag}
              </span>
            ))}
          </div>

          {/* Contenteditable content */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="note-ce"
            onInput={handleContentInput}
            onBlur={saveRange}
            data-placeholder="Začni psát… nebo použij formátovací lištu nahoře"
            style={{ outline:"none" }}
          />
        </div>

        {/* Bottom slash quick commands */}
        <div style={{
          position:"sticky", bottom:16,
          display:"flex", justifyContent:"center",
          pointerEvents:"none",
          zIndex:10,
        }}>
          <div style={{
            display:"flex", alignItems:"center", gap:6, padding:"8px 10px",
            border:`1px solid ${t.border}`, borderRadius:16,
            background:t.bg2, boxShadow:t.shadow,
            pointerEvents:"all",
          }}>
            {[
              { label:"/nadpis", fn:()=>{ exec("formatBlock","h2"); } },
              { label:"/todo",   fn:insertTodo },
              { label:"/citace", fn:()=>exec("formatBlock","blockquote") },
              { label:"/callout",fn:insertCallout },
              { label:"/tabulka",fn:insertTable },
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
  const { updateNote } = useApp();
  const [tagInput, setTagInput] = useState("");

  const statusInfo = NOTE_STATUSES[note.status] ?? NOTE_STATUSES.draft;
  const linkedProject = note.primaryProjectId ? projects.find(p => p.id === note.primaryProjectId) : null;
  const linkedTask    = note.primaryTaskId    ? tasks.find(tk => tk.id === note.primaryTaskId)     : null;
  const allLinkedProjects = [linkedProject, ...(note.extraProjectIds||[]).map(id => projects.find(p=>p.id===id)).filter(Boolean)].filter(Boolean);
  const allLinkedTasks    = [linkedTask,    ...(note.extraTaskIds   ||[]).map(id => tasks.find(t=>t.id===id)).filter(Boolean)   ].filter(Boolean);

  const addTag = (raw) => {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (!tag || note.tags.includes(tag)) return;
    updateNote(note.id, { tags: [...note.tags, tag] });
  };
  const removeTag = (tag) => updateNote(note.id, { tags: note.tags.filter(t => t !== tag) });

  const handleTagKey = (e) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) { e.preventDefault(); addTag(tagInput); setTagInput(""); }
    else if (e.key === "Backspace" && !tagInput && note.tags.length) removeTag(note.tags[note.tags.length-1]);
  };

  // Quick AI action from panel
  const runAIExtract = async () => {
    try {
      const content = document.querySelector('.note-ce')?.innerText || "";
      const { data, error } = await supabase.functions.invoke("ai-task-assist", {
        body: { action:"note_extract_tasks", note:{ title:note.title, content }, workspaceId: activeWorkspaceId },
      });
      if (error) throw error;
      const raw = data?.result ?? "";
      try {
        const c = raw.replace(/^```[a-z]*\n?/i,"").replace(/```$/,"").trim();
        const tasks = JSON.parse(c);
        tasks.forEach(text => { if (typeof text==="string"&&text.trim()) addTask({ title:text.trim() }); });
      } catch { if (raw.trim()) addTask({ title: raw.trim() }); }
    } catch {}
  };

  const PRow = ({ label, children }) => (
    <div style={{ display:"grid", gridTemplateColumns:"88px 1fr", gap:10, alignItems:"center", padding:"7px 0", borderBottom:`1px solid rgba(255,255,255,.055)`, fontSize:12 }}>
      <div style={{ color:t.text3, fontWeight:700 }}>{label}</div>
      <div style={{ color:t.text2 }}>{children}</div>
    </div>
  );

  const PropCard = ({ title: ctitle, children, noPad }) => (
    <div style={{ border:`1px solid ${t.border}`, borderRadius:14, background:"rgba(255,255,255,.03)", padding:noPad?"0":"12px", marginBottom:10 }}>
      {ctitle && <div style={{ fontSize:12, fontWeight:750, color:t.text, marginBottom:8, padding: noPad?"12px 12px 0":"0" }}>{ctitle}</div>}
      {children}
    </div>
  );

  const MiniItem = ({ left, right, onClick }) => (
    <div onClick={onClick} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, padding:"8px 10px", borderRadius:10, background:"rgba(255,255,255,.03)", border:`1px solid rgba(255,255,255,.045)`, fontSize:12, color:t.text2, cursor:onClick?"pointer":"default", transition:"background .1s" }}
      onMouseEnter={e=>{ if(onClick) e.currentTarget.style.background="rgba(255,255,255,.065)"; }}
      onMouseLeave={e=>{ e.currentTarget.style.background="rgba(255,255,255,.03)"; }}
    >
      <span>{left}</span>
      <span style={{ color:t.text3, fontSize:11 }}>{right}</span>
    </div>
  );

  const panelStyle = isMobile
    ? { position:"fixed", inset:0, zIndex:300, background:t.bg2, overflowY:"auto" }
    : { width:300, minWidth:300, borderLeft:`1px solid ${t.border}`, background:t.bg2, overflowY:"auto", flexShrink:0 };

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

        {/* Properties card */}
        <PropCard>
          <PRow label="Projekt">
            <select
              value={note.primaryProjectId ? `project:${note.primaryProjectId}` : note.primaryTaskId ? `task:${note.primaryTaskId}` : ""}
              onChange={e => {
                const v = e.target.value;
                if (!v) updateNote(note.id, { primaryProjectId:null, primaryTaskId:null });
                else if (v.startsWith("project:")) updateNote(note.id, { primaryProjectId:v.slice(8), primaryTaskId:null });
                else updateNote(note.id, { primaryProjectId:null, primaryTaskId:v.slice(5) });
              }}
              style={{ width:"100%", background:"transparent", border:"none", color:t.text2, fontSize:12, outline:"none", cursor:"pointer" }}
            >
              <option value="">— Bez vazby</option>
              <optgroup label="Projekty">{projects.map(p=><option key={p.id} value={`project:${p.id}`}>{p.name}</option>)}</optgroup>
              <optgroup label="Úkoly">{tasks.map(tk=><option key={tk.id} value={`task:${tk.id}`}>{tk.title||"Bez názvu"}</option>)}</optgroup>
            </select>
          </PRow>
          {(allLinkedTasks.length > 0 || linkedTask) && (
            <PRow label="Vazba">{linkedTask?.title || "—"}</PRow>
          )}
          <PRow label="Stav">
            <select value={note.status||"draft"} onChange={e=>updateNote(note.id,{status:e.target.value})} style={{ background:"transparent", border:"none", color:statusInfo.color, fontSize:12, fontWeight:700, outline:"none", cursor:"pointer" }}>
              {Object.entries(NOTE_STATUSES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
          </PRow>
          <PRow label="Štítky">
            <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
              {note.tags.map(tag=>(
                <span key={tag} style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"1px 6px", borderRadius:20, fontSize:11, fontWeight:600, background:t.accentBg, color:t.accent, border:`1px solid ${t.accent}30` }}>
                  #{tag}
                  <button onClick={()=>removeTag(tag)} style={{ background:"none", border:"none", cursor:"pointer", padding:0, display:"flex", color:t.text3 }}>
                    <Icon name="x" size={8} color={t.text3} strokeWidth={2.5} />
                  </button>
                </span>
              ))}
              <input
                value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={handleTagKey}
                onBlur={()=>{ if(tagInput.trim()){addTag(tagInput);setTagInput("");} }}
                placeholder={note.tags.length ? "+" : "Přidat…"}
                style={{ background:"none", border:"none", color:t.text, fontSize:11, outline:"none", width:60, minWidth:40 }}
              />
            </div>
          </PRow>
          <div style={{ padding:"7px 0", fontSize:11, color:t.text3, borderBottom:"none" }}>
            <div>Vytvořeno: {formatDateTime(note.createdAt)}</div>
            <div>Upraveno: {formatDateTime(note.updatedAt)}</div>
          </div>
        </PropCard>

        {/* Quick actions */}
        <PropCard title="Rychlé akce">
          <div style={{ display:"grid", gap:6 }}>
            <MiniItem left={<span><PinIcon size={11} filled={note.pinned} color="#f59e0b" /> {note.pinned ? "Odepnout poznámku" : "Připnout poznámku"}</span>} right="⌥P" onClick={()=>updateNote(note.id,{pinned:!note.pinned})} />
            <MiniItem left="🧠 Vytáhnout úkoly z textu" right="AI" onClick={runAIExtract} />
            <MiniItem left={<span>🗄️ {note.archived ? "Obnovit z archivu" : "Archivovat poznámku"}</span>} right="" onClick={()=>updateNote(note.id,{archived:!note.archived})} />
            <MiniItem left="📤 Export jako .md" right=".md" onClick={onExportMD} />
          </div>
        </PropCard>

        {/* Related items */}
        {(allLinkedProjects.length > 0 || allLinkedTasks.length > 0) && (
          <PropCard title="Související">
            <div style={{ display:"grid", gap:6 }}>
              {allLinkedProjects.map(p=>{
                const col = projectColor(p.id);
                return <MiniItem key={p.id} left={<span style={{ display:"flex", alignItems:"center", gap:6 }}><div style={{ width:8,height:8,borderRadius:"50%",background:col }}/>{p.name}</span>} right="projekt" />;
              })}
              {allLinkedTasks.map(tk=>(
                <MiniItem key={tk.id} left={<span style={{ display:"flex", alignItems:"center", gap:6 }}><Icon name="check-square" size={11} color={t.accent} strokeWidth={2}/>{tk.title||"Bez názvu"}</span>} right="úkol" />
              ))}
            </div>
          </PropCard>
        )}

        {/* Extra connections */}
        <PropCard title="Přidat propojení" noPad>
          <div style={{ padding:"0 12px 12px" }}>
            <div style={{ fontSize:11, color:t.text3, marginBottom:8, marginTop:8 }}>Další projekty</div>
            <div style={{ display:"flex", flexDirection:"column", gap:3, maxHeight:120, overflowY:"auto" }}>
              {projects.filter(p=>p.id!==note.primaryProjectId).map(p=>{
                const linked = (note.extraProjectIds||[]).includes(p.id);
                const col = projectColor(p.id);
                return (
                  <button key={p.id} onClick={()=>updateNote(note.id,{extraProjectIds:linked?(note.extraProjectIds||[]).filter(id=>id!==p.id):[...(note.extraProjectIds||[]),p.id]})} style={{
                    display:"flex", alignItems:"center", gap:7, padding:"5px 8px", borderRadius:7,
                    border:`1px solid ${linked?col+"50":t.border}`, background:linked?col+"12":"transparent",
                    color:linked?col:t.text2, fontSize:12, cursor:"pointer", textAlign:"left",
                  }}>
                    <div style={{ width:7,height:7,borderRadius:"50%",background:col,flexShrink:0 }}/>
                    {p.name}
                    {linked && <Icon name="check" size={10} color={col} strokeWidth={2.5} style={{ marginLeft:"auto" }}/>}
                  </button>
                );
              })}
            </div>
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
  const sc = NOTE_STATUSES[note.status]?.color;
  if (sc) return sc;
  return "#64748b";
}

/* ─── NotesSidebar ──────────────────────────── */
function NotesSidebar({ notes, selId, onSelect, onCreate, t, projects }) {
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
      {/* Header */}
      <div style={{ padding:"16px 14px 10px", borderBottom:`1px solid ${t.border}`, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <Icon name="file-text" size={16} color={t.accent} strokeWidth={2} />
            <span style={{ fontSize:15, fontWeight:850, fontFamily:"'Outfit',sans-serif", letterSpacing:"-.3px" }}>Poznámky</span>
            <span style={{ fontSize:11, color:t.text3, background:"rgba(255,255,255,.07)", padding:"1px 7px", borderRadius:99, fontWeight:700 }}>{activeCount}</span>
          </div>
          <button onClick={onCreate} style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 12px", borderRadius:9, border:"none", background:`linear-gradient(135deg, #2563eb, #60a5fa)`, color:"#fff", fontSize:12, fontWeight:800, cursor:"pointer", boxShadow:"0 6px 16px rgba(37,99,235,.28)" }}>
            <Icon name="plus" size={13} color="#fff" strokeWidth={2.5} />
            Nová
          </button>
        </div>
        <div style={{ position:"relative" }}>
          <Icon name="search" size={13} color={t.text3} strokeWidth={2} style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} />
          <input
            value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Hledat v poznámkách…"
            style={{ width:"100%", padding:"7px 28px 7px 30px", borderRadius:9, border:`1px solid ${t.border}`, background:"rgba(255,255,255,.045)", color:t.text, fontSize:12.5, outline:"none", boxSizing:"border-box" }}
          />
          {search && (
            <button onClick={()=>setSearch("")} style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:t.text3, cursor:"pointer", padding:2, display:"flex" }}>
              <Icon name="x" size={12} color={t.text3} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display:"flex", alignItems:"center", gap:4, padding:"6px 10px", overflowX:"auto", borderBottom:`1px solid ${t.border}`, flexShrink:0 }}>
        {filterTabs.map(tab => {
          const isActive = filter === tab.k;
          return (
            <button key={tab.k} onClick={()=>setFilter(tab.k)} style={{
              padding:"5px 9px", borderRadius:999, fontSize:12, whiteSpace:"nowrap", fontWeight:isActive?700:400,
              border:`1px solid ${isActive && !tab.muted ? "rgba(59,130,246,.22)" : "transparent"}`,
              flexShrink:0,
              background:isActive ? (tab.muted ? "rgba(255,255,255,.06)" : "rgba(59,130,246,.16)") : "transparent",
              color:isActive ? (tab.muted ? t.text2 : "#dbeafe") : t.text3, cursor:"pointer",
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
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ marginLeft:"auto", padding:"3px 6px", borderRadius:6, border:`1px solid ${t.border}`, background:t.input, color:t.text2, fontSize:11, outline:"none", flexShrink:0 }}>
          <option value="updated">Upravené</option>
          <option value="created">Vytvořené</option>
          <option value="title">A–Z</option>
        </select>
      </div>

      {/* Note list */}
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
              <button onClick={onCreate} style={{ marginTop:10, padding:"7px 18px", borderRadius:8, border:"none", background:t.accent, color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer" }}>
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
              const preview   = n.content
                .replace(/<[^>]+>/g, " ")
                .replace(/#{1,3} /g,"")
                .replace(/\*\*/g,"").replace(/\*/g,"")
                .trim()
                .slice(0, 120);

              return (
                <button key={n.id} onClick={()=>onSelect(n.id)} style={{
                  display:"block", width:"100%", textAlign:"left",
                  padding:"11px 10px 11px 14px", borderRadius:13, marginBottom:6,
                  background:isActive ? "rgba(59,130,246,.12)" : "transparent",
                  border:`1px solid ${isActive ? "rgba(59,130,246,.45)" : "transparent"}`,
                  cursor:"pointer", position:"relative", overflow:"hidden",
                  transition:"background .15s", opacity:n.archived ? 0.6 : 1,
                }}
                  onMouseEnter={e=>{ if(!isActive) e.currentTarget.style.background="rgba(255,255,255,.04)"; }}
                  onMouseLeave={e=>{ if(!isActive) e.currentTarget.style.background="transparent"; }}
                >
                  {/* Accent bar */}
                  <div style={{ position:"absolute", left:0, top:11, bottom:11, width:3, borderRadius:4, background:accentCol, opacity:.95 }} />

                  <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"flex-start", marginBottom:4 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:5, minWidth:0 }}>
                      {n.icon && <span style={{ fontSize:13, flexShrink:0 }}>{n.icon}</span>}
                      {n.pinned && <PinIcon size={10} filled color="#f59e0b" />}
                      <span style={{ fontSize:13, fontWeight:800, color:isActive?"#dbeafe":t.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
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
                      {n.tags.slice(0,3).map(tag=>(
                        <span key={tag} style={{ fontSize:10.5, padding:"3px 6px", borderRadius:999, background:"rgba(255,255,255,.065)", color:"#aeb9d2", border:"1px solid rgba(255,255,255,.04)", whiteSpace:"nowrap" }}>
                          {tag}
                        </span>
                      ))}
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
  const { t, dk, notes, addNote, updateNote, deleteNote, projects, tasks, addTask, openNoteId, setOpenNoteId, isMobile, activeWorkspaceId } = useApp();
  const toast   = useToast();
  const confirm = useConfirm();

  const [selId,          setSelId]          = useState(null);
  const [mobileView,     setMobileView]     = useState("list");
  const [templatePicker, setTemplatePicker] = useState(false);
  const [showProps,      setShowProps]      = useState(true); // default open

  useEffect(() => { injectNoteCSS(dk); }, [dk]);

  useEffect(() => {
    if (openNoteId) {
      setSelId(openNoteId);
      setOpenNoteId(null);
      if (isMobile) setMobileView("detail");
    } else if (!selId && notes.length > 0 && !isMobile) {
      setSelId(notes.filter(n=>!n.archived)[0]?.id ?? notes[0]?.id ?? null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNoteId]);

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
    setSelId(remaining.length > 0 ? remaining[0].id : null);
    if (isMobile) setMobileView("list");
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

  const showList   = !isMobile || mobileView === "list";
  const showDetail = !isMobile || mobileView === "detail";

  return (
    <div style={{ display:"flex", height:"100%", overflow:"hidden" }}>
      {templatePicker && (
        <TemplatePickerModal onSelect={handleCreateFromTemplate} onClose={()=>setTemplatePicker(false)} />
      )}

      {/* LEFT: notes list */}
      {showList && (
        <div style={{ width:isMobile?"100%":300, minWidth:isMobile?"auto":280, borderRight:isMobile?"none":`1px solid ${t.border}`, overflow:"hidden", flex:isMobile?1:"none" }}>
          <NotesSidebar
            notes={notes}
            selId={selId}
            onSelect={id=>{ setSelId(id); if(isMobile) setMobileView("detail"); }}
            onCreate={handleCreate}
            t={t}
            projects={projects}
          />
        </div>
      )}

      {/* CENTER + RIGHT */}
      {showDetail && (
        <div style={{ flex:1, display:"flex", overflow:"hidden", minWidth:0 }}>

          {/* Mobile header */}
          {isMobile && (
            <div style={{ position:"absolute", top:0, left:0, right:0, display:"flex", alignItems:"center", gap:8, padding:"12px 16px", borderBottom:`1px solid ${t.border}`, background:t.bg2, zIndex:50 }}>
              <button onClick={()=>{ setMobileView("list"); }} style={{ background:"none", border:"none", color:t.accent, display:"flex", alignItems:"center", gap:4, cursor:"pointer", fontSize:13, fontWeight:600 }}>
                <Icon name="chevron-left" size={16} color={t.accent} strokeWidth={2.5} />
                Zpět
              </button>
              <span style={{ flex:1, fontSize:13, fontWeight:600, color:t.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {selNote?.title || "Nová poznámka"}
              </span>
            </div>
          )}

          {/* Editor */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0, background:t.bg }}>
            {selNote ? (
              <NoteEditor
                key={selNote.id}
                note={selNote}
                onSave={upd => updateNote(selNote.id, upd)}
                t={t}
                isMobile={isMobile}
                showProps={showProps}
                onToggleProps={()=>setShowProps(v=>!v)}
                onDelete={()=>handleDelete(selNote.id)}
                onTogglePin={()=>updateNote(selNote.id,{pinned:!selNote.pinned})}
                projects={projects}
                tasks={tasks}
                addTask={addTask}
                activeWorkspaceId={activeWorkspaceId}
              />
            ) : (
              <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:t.text3, gap:12 }}>
                <div style={{ opacity:.08 }}><Icon name="file-text" size={72} color={t.text} strokeWidth={.75} /></div>
                <div style={{ fontSize:16, fontWeight:700, color:t.text2, fontFamily:"'Outfit',sans-serif" }}>Žádná poznámka vybrána</div>
                <div style={{ fontSize:13 }}>Vyber ze seznamu nebo vytvoř novou</div>
                <button onClick={handleCreate} style={{ marginTop:4, padding:"9px 22px", borderRadius:10, border:"none", background:t.accent, color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                  + Nová poznámka
                </button>
              </div>
            )}
          </div>

          {/* Properties panel */}
          {showProps && selNote && !isMobile && (
            <NotePropertiesPanel
              note={selNote}
              onClose={()=>setShowProps(false)}
              t={t}
              isMobile={false}
              onExportMD={handleExportMD}
              projects={projects}
              tasks={tasks}
              addTask={addTask}
              activeWorkspaceId={activeWorkspaceId}
            />
          )}
          {showProps && selNote && isMobile && (
            <NotePropertiesPanel
              note={selNote}
              onClose={()=>setShowProps(false)}
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
