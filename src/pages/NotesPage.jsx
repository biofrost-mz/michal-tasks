import React, { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { useConfirm } from '../components/Confirm.jsx'
import Icon from '../components/Icon.jsx'
import { NOTE_TEMPLATES } from '../constants.js'
import { projectColor, relTime, renderMarkdown, useDebouncedEffect } from '../utils.js'
import { supabase } from '../supabase.js'

function TemplatePickerModal({ onSelect, onClose }) {
  const { t } = useApp();
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 400, background: "#0006", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: t.bg2, borderRadius: 16, padding: 24, maxWidth: 520, width: "calc(100% - 32px)", maxHeight: "90vh", overflowY: "auto", boxShadow: t.shadow }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.4px", color: t.text }}>Vybrat šablonu</div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", padding: 4, display: "flex", borderRadius: 6 }}
          >
            <Icon name="x" size={18} color={t.text3} strokeWidth={2} />
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {NOTE_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => onSelect(tpl)}
              style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, padding: "14px 16px", borderRadius: 10, border: `1px solid ${t.border}`, background: t.bg, color: t.text, cursor: "pointer", textAlign: "left", transition: "border-color .15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.background = t.accentBg; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.background = t.bg; }}
            >
              <Icon name={tpl.icon} size={18} color={t.accent} strokeWidth={1.8} />
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{tpl.label}</div>
              <div style={{ fontSize: 11.5, color: t.text3, lineHeight: 1.4 }}>{tpl.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function NoteDetail({ note, onDelete }) {
  const { t, updateNote, projects, tasks, isMobile, uploadAttachment } = useApp();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [showMeta, setShowMeta] = useState(false);
  const [preview, setPreview] = useState(false);
  const contentRef = useRef(null);
  const titleRef = useRef(null);
  const imgInputRef = useRef(null);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
  }, [note.id]);

  useEffect(() => {
    if (!preview && contentRef.current) {
      contentRef.current.style.height = "auto";
      contentRef.current.style.height = contentRef.current.scrollHeight + "px";
    }
  }, [content, preview]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useDebouncedEffect(() => { updateNote(note.id, { title, content }); }, [title, content], 600);

  const linkedProject = note.primaryProjectId ? projects.find((p) => p.id === note.primaryProjectId) : null;
  const linkedTask = note.primaryTaskId ? tasks.find((tk) => tk.id === note.primaryTaskId) : null;
  const projColor = linkedProject ? projectColor(linkedProject.id) : null;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readMin = Math.max(1, Math.round(wordCount / 200));

  const insertMd = (before, after = "", placeholder = "text") => {
    const el = contentRef.current;
    if (!el) return;
    const start = el.selectionStart, end = el.selectionEnd;
    const selected = el.value.slice(start, end) || placeholder;
    const newVal = el.value.slice(0, start) + before + selected + after + el.value.slice(end);
    setContent(newVal);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + before.length + selected.length + after.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleImgUpload = async (file) => {
    if (!file) return;
    try {
      const att = await uploadAttachment(file, { noteId: note.id });
      const { data } = supabase.storage.from("attachments").getPublicUrl(att.storagePath);
      insertMd(`![${file.name}](${data.publicUrl})`, "", "");
    } catch (e) { /* silent */ }
  };

  const tbBtn = (label, onClick, title) => (
    <button
      key={label}
      onClick={onClick}
      title={title || label}
      style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${t.border}`, background: "transparent", color: t.text2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
    >{label}</button>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Hidden image input */}
      <input
        ref={imgInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => { handleImgUpload(e.target.files[0]); e.target.value = ""; }}
      />

      {/* Top action bar */}
      {!isMobile && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 32px 0", flexShrink: 0 }}>
          {/* Project / task badge */}
          {linkedProject && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20, border: `1.5px solid ${projColor}55`, background: projColor + "12", color: projColor, display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Icon name="folder" size={9} color={projColor} strokeWidth={2} />
              {linkedProject.name}
            </span>
          )}
          {linkedTask && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20, border: `1.5px solid #3b82f655`, background: "#3b82f612", color: "#3b82f6", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Icon name="check-square" size={9} color="#3b82f6" strokeWidth={2} />
              {linkedTask.title || "Úkol"}
            </span>
          )}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
            <button
              onClick={() => setPreview((v) => !v)}
              title={preview ? "Upravit" : "Náhled"}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, border: `1px solid ${preview ? t.accent : t.border}`, background: preview ? t.accentBg : "transparent", color: preview ? t.accent : t.text3, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}
            >
              <Icon name={preview ? "edit-2" : "eye"} size={12} color="currentColor" strokeWidth={2} />
              {preview ? "Upravit" : "Náhled"}
            </button>
            <button
              onClick={() => updateNote(note.id, { pinned: !note.pinned })}
              title={note.pinned ? "Odepnout" : "Připnout"}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, border: `1px solid ${note.pinned ? "#f59e0b" : t.border}`, background: note.pinned ? "#f59e0b18" : "transparent", color: note.pinned ? "#f59e0b" : t.text3, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}
            >
              <Icon name="pin" size={12} color="currentColor" strokeWidth={2} />
              {note.pinned ? "Připnuto" : "Připnout"}
            </button>
            <button
              onClick={() => setShowMeta((v) => !v)}
              title="Vlastnosti"
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, border: `1px solid ${showMeta ? t.accent : t.border}`, background: showMeta ? t.accentBg : "transparent", color: showMeta ? t.accent : t.text3, fontSize: 11.5, cursor: "pointer" }}
            >
              <Icon name="list" size={12} color="currentColor" strokeWidth={2} />
              Vlastnosti
            </button>
            {onDelete && (
              <button
                onClick={onDelete}
                title="Smazat"
                style={{ display: "flex", alignItems: "center", padding: "5px 8px", borderRadius: 7, border: `1px solid transparent`, background: "transparent", color: t.text3, cursor: "pointer" }}
              >
                <Icon name="trash" size={13} color="#ef4444" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Markdown toolbar (edit mode only) */}
      {!preview && (
        <div style={{ display: "flex", gap: 2, padding: "8px 10px", borderBottom: `1px solid ${t.border}`, flexShrink: 0, flexWrap: "wrap", background: t.bg2 }}>
          {tbBtn("B", () => insertMd("**", "**", "bold"), "Bold")}
          {tbBtn("I", () => insertMd("*", "*", "italic"), "Italic")}
          {tbBtn("H2", () => insertMd("## ", "", "Nadpis"), "Nadpis H2")}
          {tbBtn("H3", () => insertMd("### ", "", "Nadpis"), "Nadpis H3")}
          {tbBtn("🔗", () => insertMd("[", "](url)", "text"), "Odkaz")}
          {tbBtn("•", () => insertMd("- ", "", "položka"), "Odrážka")}
          {tbBtn("1.", () => insertMd("1. ", "", "položka"), "Číslovaný seznam")}
          {tbBtn("</>", () => insertMd("\n```\n", "\n```\n", "kód"), "Blok kódu")}
          {tbBtn("—", () => insertMd("\n---\n", "", ""), "Oddělovač")}
          <button
            onClick={() => imgInputRef.current && imgInputRef.current.click()}
            title="Vložit obrázek"
            style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${t.border}`, background: "transparent", color: t.text2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >📷</button>
        </div>
      )}

      {/* Scrollable content */}
      <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "20px 18px 32px" : "20px 40px 40px", maxWidth: isMobile ? "100%" : 860 }}>
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Název poznámky…"
          style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.6px", border: "none", background: "transparent", color: t.text, outline: "none", width: "100%", fontFamily: "'Outfit',sans-serif", marginBottom: 16, display: "block" }}
        />

        {preview ? (
          <div
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            style={{ fontSize: 15, lineHeight: 1.8, color: t.text }}
          />
        ) : (
          <textarea
            ref={contentRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={"Začni psát…"}
            style={{ width: "100%", minHeight: 200, border: "none", background: "transparent", color: t.text, outline: "none", resize: "none", fontSize: 15, lineHeight: 1.8, fontFamily: "'Figtree',sans-serif", overflow: "hidden", display: "block" }}
          />
        )}

        {/* Properties panel (collapsible) */}
        {(showMeta || isMobile) && (
          <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: t.text3, marginBottom: 10 }}>Vazba na projekt nebo úkol</div>
            <select
              value={
                note.primaryProjectId ? `project:${note.primaryProjectId}` :
                note.primaryTaskId ? `task:${note.primaryTaskId}` : ""
              }
              onChange={(e) => {
                const v = e.target.value;
                if (!v) updateNote(note.id, { primaryProjectId: null, primaryTaskId: null });
                else if (v.startsWith("project:")) updateNote(note.id, { primaryProjectId: v.slice(8), primaryTaskId: null });
                else if (v.startsWith("task:")) updateNote(note.id, { primaryProjectId: null, primaryTaskId: v.slice(5) });
              }}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 13, outline: "none", marginBottom: 14 }}
            >
              <option value="">— Bez vazby</option>
              <optgroup label="Projekty">
                {projects.map((p) => <option key={p.id} value={`project:${p.id}`}>{p.name}</option>)}
              </optgroup>
              <optgroup label="Úkoly">
                {tasks.map((tk) => <option key={tk.id} value={`task:${tk.id}`}>{tk.title || "Bez názvu"}</option>)}
              </optgroup>
            </select>
            {isMobile && (
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <button onClick={() => updateNote(note.id, { pinned: !note.pinned })} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 7, border: `1.5px solid ${note.pinned ? "#f59e0b" : t.border}`, background: note.pinned ? "#f59e0b18" : "transparent", color: note.pinned ? "#f59e0b" : t.text2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  <Icon name="pin" size={12} color="currentColor" strokeWidth={2} />
                  {note.pinned ? "Připnuto" : "Připnout"}
                </button>
                {onDelete && (
                  <button onClick={onDelete} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 7, border: "none", background: "transparent", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    <Icon name="trash" size={12} color="currentColor" strokeWidth={2} />
                    Smazat
                  </button>
                )}
              </div>
            )}
            <div style={{ fontSize: 11, color: t.text3, lineHeight: 1.7 }}>
              <div>Vytvořeno: {new Date(note.createdAt).toLocaleString("cs-CZ")}</div>
              <div>Upraveno: {new Date(note.updatedAt).toLocaleString("cs-CZ")}</div>
            </div>
          </div>
        )}
      </div>

      {/* Footer: word count + autosave indicator */}
      <div style={{ flexShrink: 0, padding: "6px 40px", borderTop: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, fontSize: 11, color: t.text3 }}>
        <span>{wordCount} slov · {readMin} min čtení</span>
        <span style={{ opacity: 0.5 }}>Automaticky uloženo</span>
      </div>
    </div>
  );
}

export default function NotesPage() {
  const { t, notes, addNote, deleteNote, projects, tasks, openNoteId, setOpenNoteId, isMobile } = useApp();
  const toast = useToast();
  const confirm = useConfirm();
  const [selId, setSelId] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("updated");
  const [mobileView, setMobileView] = useState("list");
  const [templatePicker, setTemplatePicker] = useState(false);

  useEffect(() => {
    if (openNoteId) {
      setSelId(openNoteId);
      setOpenNoteId(null);
      if (isMobile) setMobileView("detail");
    } else if (!selId && notes.length > 0 && !isMobile) {
      setSelId(notes[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNoteId]);

  useEffect(() => {
    const handler = (e) => {
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
    setTemplatePicker(false);
    if (isMobile) setMobileView("detail");
  };

  const handleDelete = async (id) => {
    if (!await confirm("Smazat poznámku?")) return;
    deleteNote(id);
    const remaining = sortedNotes.filter((n) => n.id !== id);
    setSelId(remaining.length > 0 ? remaining[0].id : null);
    if (isMobile) setMobileView("list");
    toast("Poznámka smazána", "success");
  };

  const s = search.toLowerCase();
  let filtered = notes.filter((n) => !search || n.title.toLowerCase().includes(s) || n.content.toLowerCase().includes(s));
  if (filter === "pinned") filtered = filtered.filter((n) => n.pinned);
  else if (filter === "project") filtered = filtered.filter((n) => !!n.primaryProjectId);
  else if (filter === "task") filtered = filtered.filter((n) => !!n.primaryTaskId);
  else if (filter === "unlinked") filtered = filtered.filter((n) => !n.primaryProjectId && !n.primaryTaskId);

  const sortedNotes = [...filtered].sort((a, b) => {
    if (sortBy === "updated") return b.updatedAt - a.updatedAt;
    if (sortBy === "created") return b.createdAt - a.createdAt;
    return a.title.localeCompare(b.title, "cs");
  });

  const selNote = notes.find((n) => n.id === selId) || null;

  const filterTabs = [
    { k: "all", l: "Vše", count: notes.length },
    { k: "pinned", l: "📌 Připnuto" },
    { k: "project", l: "Projekt" },
    { k: "task", l: "Úkol" },
    { k: "unlinked", l: "Volné" },
  ];

  const showList = !isMobile || mobileView === "list";
  const showDetail = !isMobile || mobileView === "detail";

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }} className="fi">
      {templatePicker && (
        <TemplatePickerModal
          onSelect={handleCreateFromTemplate}
          onClose={() => setTemplatePicker(false)}
        />
      )}

      {/* ── LEFT: list ── */}
      {showList && (
        <div style={{ width: isMobile ? "100%" : 300, minWidth: isMobile ? "auto" : 280, borderRight: isMobile ? "none" : `1px solid ${t.border}`, display: "flex", flexDirection: "column", background: t.bg2, overflow: "hidden", flex: isMobile ? 1 : "none" }}>

          {/* Header */}
          <div style={{ padding: "16px 14px 10px", borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.3px", display: "flex", alignItems: "center", gap: 7 }}>
                <Icon name="file-text" size={15} color={t.accent} strokeWidth={2} />
                Poznámky
                <span style={{ fontSize: 11, fontWeight: 500, color: t.text3, background: t.input, padding: "1px 7px", borderRadius: 8 }}>
                  {notes.length}
                </span>
              </div>
              <button
                onClick={handleCreate}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7, border: "none", background: t.accent, color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
              >
                <Icon name="plus" size={13} color="#fff" strokeWidth={2.5} />
                Nová
              </button>
            </div>

            {/* Search */}
            <div style={{ position: "relative" }}>
              <Icon name="search" size={13} color={t.text3} strokeWidth={2} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Hledat…"
                style={{ width: "100%", padding: "7px 11px 7px 30px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 12.5, outline: "none", boxSizing: "border-box" }}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: t.text3, cursor: "pointer", padding: 2, display: "flex" }}>
                  <Icon name="x" size={12} color={t.text3} strokeWidth={2} />
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 2, padding: "8px 10px 6px", overflowX: "auto", borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
            {filterTabs.map((tab) => (
              <button
                key={tab.k}
                onClick={() => setFilter(tab.k)}
                style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11.5, fontWeight: filter === tab.k ? 700 : 400, border: "none", background: filter === tab.k ? t.accentBg : "transparent", color: filter === tab.k ? t.accent : t.text3, whiteSpace: "nowrap", cursor: "pointer", flexShrink: 0 }}
              >
                {tab.l}
              </button>
            ))}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ marginLeft: "auto", padding: "3px 6px", borderRadius: 5, border: `1px solid ${t.border}`, background: t.input, color: t.text2, fontSize: 11, outline: "none", flexShrink: 0 }}
            >
              <option value="updated">Upravené</option>
              <option value="created">Vytvořené</option>
              <option value="title">A–Z</option>
            </select>
          </div>

          {/* Note list */}
          <div style={{ flex: 1, overflow: "auto", padding: "6px 8px" }}>
            {sortedNotes.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 16px", color: t.text3 }}>
                <div style={{ opacity: 0.15, marginBottom: 12, display: "flex", justifyContent: "center" }}>
                  <Icon name="file-text" size={48} color={t.text} strokeWidth={1} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 5, color: t.text2 }}>
                  {search ? `Nic pro „${search}"` : filter !== "all" ? "Žádné poznámky v tomto filtru" : "Zatím žádné poznámky"}
                </div>
                {!search && filter === "all" && (
                  <button onClick={handleCreate} style={{ marginTop: 10, padding: "7px 18px", borderRadius: 8, border: "none", background: t.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    + Nová poznámka
                  </button>
                )}
              </div>
            )}

            {sortedNotes.map((n) => {
              const proj = n.primaryProjectId ? projects.find((p) => p.id === n.primaryProjectId) : null;
              const task = n.primaryTaskId ? tasks.find((tk) => tk.id === n.primaryTaskId) : null;
              const isActive = n.id === selId;
              const pCol = proj ? projectColor(proj.id) : null;
              const preview = n.content.split("\n").find((l) => l.trim()) || "";
              return (
                <div
                  key={n.id}
                  onClick={() => { setSelId(n.id); if (isMobile) setMobileView("detail"); }}
                  style={{
                    padding: "10px 10px 10px 14px",
                    borderRadius: 9,
                    marginBottom: 3,
                    cursor: "pointer",
                    background: isActive ? t.accentBg : "transparent",
                    border: `1px solid ${isActive ? t.accent + "35" : "transparent"}`,
                    transition: "background .1s",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = t.cardH; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  {/* Project color strip */}
                  {pCol && (
                    <div style={{ position: "absolute", left: 0, top: 4, bottom: 4, width: 3, borderRadius: 2, background: pCol }} />
                  )}

                  {/* Title row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                    {n.pinned && (
                      <span style={{ fontSize: 10, background: "#f59e0b22", color: "#f59e0b", borderRadius: 4, padding: "1px 5px", fontWeight: 700, flexShrink: 0 }}>📌</span>
                    )}
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: isActive ? t.accent : t.text }}>
                      {n.title || <em style={{ fontWeight: 400, color: t.text3 }}>Bez názvu</em>}
                    </span>
                    <span className="mono" style={{ fontSize: 11.5, color: t.text3, flexShrink: 0 }}>{relTime(n.updatedAt)}</span>
                  </div>

                  {/* Preview */}
                  {preview && (
                    <div style={{ fontSize: 11.5, color: t.text3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.5, marginBottom: 5 }}>
                      {preview}
                    </div>
                  )}

                  {/* Badges */}
                  {(proj || task) && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                      {proj && (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: pCol + "20", color: pCol, display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <Icon name="folder" size={8} color={pCol} strokeWidth={2} />
                          {proj.name}
                        </span>
                      )}
                      {task && (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: t.accentBg, color: t.accent, display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <Icon name="check-square" size={8} color={t.accent} strokeWidth={2} />
                          {task.title}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ padding: "7px 14px", borderTop: `1px solid ${t.border}`, fontSize: 11, color: t.text3, flexShrink: 0 }}>
            {sortedNotes.length} {sortedNotes.length === 1 ? "poznámka" : sortedNotes.length < 5 ? "poznámky" : "poznámek"}
          </div>
        </div>
      )}

      {/* ── RIGHT: editor ── */}
      {showDetail && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: t.bg }}>
          {/* Mobile header */}
          {isMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${t.border}`, background: t.bg2, flexShrink: 0 }}>
              <button onClick={() => setMobileView("list")} style={{ background: "none", border: "none", color: t.accent, display: "flex", alignItems: "center", gap: 4, padding: "4px 0", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                <Icon name="chevron-left" size={16} color={t.accent} strokeWidth={2.5} />
                Zpět
              </button>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: "0 8px" }}>
                {selNote?.title || "Nová poznámka"}
              </span>
              {selNote && (
                <button onClick={() => handleDelete(selNote.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 4, display: "flex" }}>
                  <Icon name="trash" size={16} color="#ef4444" strokeWidth={2} />
                </button>
              )}
            </div>
          )}

          {selNote ? (
            <NoteDetail note={selNote} onDelete={() => handleDelete(selNote.id)} />
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: t.text3, gap: 12 }}>
              <div style={{ opacity: 0.12 }}>
                <Icon name="file-text" size={64} color={t.text} strokeWidth={1} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: t.text2 }}>Žádná poznámka vybrána</div>
              <div style={{ fontSize: 13, color: t.text3 }}>Vyber poznámku ze seznamu nebo vytvoř novou</div>
              <button onClick={handleCreate} style={{ marginTop: 4, padding: "8px 20px", borderRadius: 8, border: "none", background: t.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                + Nová poznámka
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
