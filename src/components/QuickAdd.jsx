import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from './Toast.jsx'
import Icon from './Icon.jsx'
import { STATUSES, PRIORITIES } from '../constants.js'

export default function QuickAdd({ defaultProjectId = null }) {
  const { t, dk, tasks, addTask, projects, tags, addProject, addTag, setTaskDetail, isMobile } = useApp();
  const toast = useToast();

  const [val, setVal] = useState("");
  const inputRef = useRef(null);

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [status, setStatus] = useState("todo");
  const [priority, setPriority] = useState(null);
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [dueDate, setDueDate] = useState("");
  const [tagIds, setTagIds] = useState([]);

  // Inline additions inside modal
  const [newProjOpen, setNewProjOpen] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjColor, setNewProjColor] = useState("#3b82f6");

  const [newTagOpen, setNewTagOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");

  // Triggered when clicking inline "Přidat" or pressing Enter
  const handleOpenModal = useCallback((initialTitle = "") => {
    const prefTitle = typeof initialTitle === "string" ? initialTitle.trim() : "";
    setModalTitle(prefTitle || val.trim());
    setStatus("todo");
    setPriority(null);
    setProjectId(defaultProjectId);
    setDueDate("");
    setTagIds([]);
    setNewProjOpen(false);
    setNewTagOpen(false);
    setModalOpen(true);
    setVal("");
  }, [defaultProjectId, val]);

  useEffect(() => {
    const focusHandler = () => inputRef.current?.focus();
    const modalHandler = (event) => {
      const title = event?.detail?.title || "";
      handleOpenModal(title);
    };
    window.addEventListener("focusQuickAdd", focusHandler);
    window.addEventListener("openQuickAddModal", modalHandler);
    return () => {
      window.removeEventListener("focusQuickAdd", focusHandler);
      window.removeEventListener("openQuickAddModal", modalHandler);
    };
  }, [handleOpenModal]);

  // Saves the task and closes modal
  const handleCreate = (openDetailAfter = false) => {
    const title = modalTitle.trim();
    if (!title) {
      toast("Název úkolu nesmí být prázdný", "error");
      return;
    }

    const tsk = addTask({
      title,
      status,
      priority,
      projectId,
      dueDate: dueDate || null,
      tagIds
    });

    setModalOpen(false);
    toast("Úkol úspěšně vytvořen", "success");

    if (openDetailAfter && tsk) {
      setTimeout(() => {
        setTaskDetail(tsk.id);
      }, 50);
    }
  };

  // Quick relative date setters
  const setRelativeDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    setDueDate(`${yyyy}-${mm}-${dd}`);
  };

  // Quick project creator inside modal
  const handleCreateProject = (e) => {
    e.preventDefault();
    const name = newProjName.trim();
    if (!name) return;
    const p = addProject({ name, color: newProjColor });
    setProjectId(p.id);
    setNewProjName("");
    setNewProjOpen(false);
    toast("Projekt vytvořen", "success");
  };

  // Quick tag creator inside modal
  const handleCreateTag = (e) => {
    e.preventDefault();
    const name = newTagName.trim();
    if (!name) return;
    const tg = addTag({ name, color: newTagColor });
    setTagIds((prev) => [...prev, tg.id]);
    setNewTagName("");
    setNewTagOpen(false);
    toast("Tag vytvořen", "success");
  };

  // Toggle tag ID in local array
  const toggleTag = (id) => {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Top 3 active projects + Inbox
  const quickProjects = [
    { id: null, name: "Inbox" },
    ...projects.filter((p) => p.status === "active").slice(0, 3)
  ];

  // Top 4 tags
  const quickTags = tags.slice(0, 4);

  return (
    <>
      {/* Inline QuickAdd input bar */}
      <div
        style={{
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: t.shadow,
          display: "flex",
          alignItems: "center",
          gap: 0,
          transition: "border-color .15s",
        }}
        className="quickadd-container"
      >
        <div style={{ display: "flex", alignItems: "center", padding: "0 14px", color: t.text3 }}>
          <span style={{ fontSize: 20, fontWeight: 300 }}>+</span>
        </div>

        <input
          ref={inputRef}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleOpenModal()}
          placeholder="Nový úkol… (N / Enter)"
          style={{
            flex: 1,
            border: "none",
            background: "transparent",
            outline: "none",
            color: t.text,
            fontSize: 14,
            padding: "13px 0",
          }}
        />

        <button
          onClick={handleOpenModal}
          style={{
            padding: "0 20px",
            border: "none",
            height: "44px",
            background: val.trim() ? t.accent : "transparent",
            color: val.trim() ? "#fff" : t.text3,
            fontSize: 13,
            fontWeight: 600,
            transition: "all .15s",
            cursor: "pointer"
          }}
        >
          Přidat
        </button>
      </div>

      {/* Modal Dialog */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 5000,
            display: "flex",
            alignItems: isMobile ? "flex-start" : "center",
            justifyContent: "center",
            padding: isMobile ? "calc(46px + env(safe-area-inset-top, 0px) + 10px) 14px calc(84px + env(safe-area-inset-bottom, 0px))" : 0,
            background: dk ? "rgba(10, 12, 18, 0.65)" : "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            animation: "fadeIn .2s ease-out",
            overflow: "hidden",
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="pop"
            style={{
              background: t.card,
              border: `1px solid ${dk ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)"}`,
              borderRadius: isMobile ? 16 : 16,
              boxShadow: isMobile
                ? "0 18px 48px rgba(0,0,0,0.48)"
                : t.shadow,
              padding: isMobile ? "16px" : "24px 28px",
              width: isMobile ? "100%" : "calc(100% - 32px)",
              maxWidth: isMobile ? 560 : 600,
              maxHeight: isMobile ? "calc(100svh - 150px)" : "90vh",
              overflowY: "auto",
              overscrollBehavior: "contain",
              display: "flex",
              flexDirection: "column",
              gap: isMobile ? 14 : 18,
              position: "relative"
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && e.target.tagName !== "TEXTAREA" && e.target.tagName !== "BUTTON" && handleCreate(false)}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: t.accent, fontWeight: 600, fontSize: 13, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                <Icon name="check-square" size={14} color="currentColor" strokeWidth={2.5} />
                Nový úkol
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: t.text3,
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                  borderRadius: 6,
                  transition: "background .12s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = dk ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "none"}
              >
                <Icon name="x" size={16} color="currentColor" strokeWidth={2.5} />
              </button>
            </div>

            {/* Task Title Input */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <input
                autoFocus={!isMobile}
                value={modalTitle}
                onChange={(e) => setModalTitle(e.target.value)}
                placeholder="Co je třeba udělat?"
                style={{
                  fontSize: isMobile ? 16 : 17,
                  fontWeight: 600,
                  padding: isMobile ? "11px 12px" : "12px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${t.border}`,
                  background: t.input,
                  color: t.text,
                  width: "100%",
                  outline: "none",
                  boxShadow: dk ? "inset 0 1px 2px rgba(0,0,0,0.2)" : "inset 0 1px 2px rgba(0,0,0,0.03)",
                  transition: "border-color .15s"
                }}
                onFocus={(e) => e.target.style.borderColor = t.accent}
                onBlur={(e) => e.target.style.borderColor = t.border}
              />
            </div>

            {/* SECTION 1: Základní nastavení (Status, Priorita) */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 12 : 20 }}>
              {/* Status Section */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, fontFamily: "var(--font-mono)" }}>
                  Status
                </div>
                <div style={{
                  display: isMobile ? "grid" : "flex",
                  gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : undefined,
                  flexDirection: isMobile ? undefined : "column",
                  flexWrap: isMobile ? undefined : "wrap",
                  gap: isMobile ? 6 : 4
                }}>
                  {Object.entries(STATUSES).map(([k, v]) => {
                    const isActive = status === k;
                    return (
                      <button
                        key={k}
                        onClick={() => setStatus(k)}
                        style={{
                          padding: isMobile ? "8px 10px" : "8px 12px",
                          borderRadius: 8,
                          fontSize: 12.5,
                          fontWeight: 600,
                          border: `1.5px solid ${isActive ? v.color : t.border}`,
                          background: isActive ? v.bg : "transparent",
                          color: isActive ? v.color : t.text2,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all .12s",
                          justifyContent: isMobile ? "center" : undefined,
                          flex: isMobile ? undefined : undefined,
                          minHeight: 40,
                        }}
                      >
                        <Icon name={v.icon} size={13} color="currentColor" strokeWidth={2} />
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priority Section */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, fontFamily: "var(--font-mono)" }}>
                  Priorita
                </div>
                <div style={{
                  display: isMobile ? "grid" : "flex",
                  gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : undefined,
                  flexDirection: isMobile ? undefined : "column",
                  gap: isMobile ? 6 : 4
                }}>
                  {/* Option: Žádná priorita */}
                  <button
                    onClick={() => setPriority(null)}
                    style={{
                      padding: isMobile ? "8px 8px" : "8px 12px",
                      borderRadius: 8,
                      fontSize: 12.5,
                      fontWeight: 600,
                      border: `1.5px solid ${priority === null ? t.text3 : t.border}`,
                      background: priority === null ? (dk ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)") : "transparent",
                      color: priority === null ? t.text : t.text2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: isMobile ? "center" : undefined,
                      gap: 8,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all .12s"
                    }}
                  >
                    <Icon name="circle" size={13} color="currentColor" strokeWidth={1.5} opacity={0.3} />
                    Žádná priorita
                  </button>

                  {Object.entries(PRIORITIES).map(([k, v]) => {
                    const isActive = priority === k;
                    return (
                      <button
                        key={k}
                        onClick={() => setPriority(k)}
                        style={{
                          padding: isMobile ? "8px 8px" : "8px 12px",
                          borderRadius: 8,
                          fontSize: 12.5,
                          fontWeight: 600,
                          border: `1.5px solid ${isActive ? v.color : t.border}`,
                          background: isActive ? v.bg : "transparent",
                          color: isActive ? v.color : t.text2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: isMobile ? "center" : undefined,
                          gap: 8,
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all .12s"
                        }}
                      >
                        <Icon name={v.icon} size={13} color="currentColor" strokeWidth={2.5} />
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SECTION 2: Projekt & Termín */}
            <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Project Line */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)" }}>
                    Projekt
                  </div>
                  {!newProjOpen && (
                    <button
                      onClick={() => setNewProjOpen(true)}
                      style={{ background: "none", border: "none", color: t.accent, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}
                    >
                      <Icon name="plus" size={10} color="currentColor" strokeWidth={2.5} /> Nový projekt
                    </button>
                  )}
                </div>

                {/* Inline New Project Form inside modal */}
                {newProjOpen ? (
                  <form
                    onSubmit={handleCreateProject}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: t.bg2,
                      border: `1px solid ${t.border}`,
                      padding: "6px 10px",
                      borderRadius: 8,
                      marginBottom: 8,
                      animation: "fadeIn .15s ease-out"
                    }}
                  >
                    <input
                      autoFocus
                      placeholder="Název nového projektu…"
                      value={newProjName}
                      onChange={(e) => setNewProjName(e.target.value)}
                      style={{
                        flex: 1,
                        background: "none",
                        border: "none",
                        outline: "none",
                        fontSize: 12.5,
                        color: t.text
                      }}
                    />
                    <input
                      type="color"
                      value={newProjColor}
                      onChange={(e) => setNewProjColor(e.target.value)}
                      style={{
                        width: 22,
                        height: 22,
                        border: "none",
                        padding: 0,
                        borderRadius: 4,
                        background: "none",
                        cursor: "pointer"
                      }}
                    />
                    <button type="submit" style={{ padding: "4px 10px", borderRadius: 5, border: "none", background: t.accent, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      Vytvořit
                    </button>
                    <button type="button" onClick={() => setNewProjOpen(false)} style={{ padding: "4px 8px", borderRadius: 5, border: `1px solid ${t.border}`, background: "transparent", color: t.text2, fontSize: 11, cursor: "pointer" }}>
                      Zrušit
                    </button>
                  </form>
                ) : null}

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {quickProjects.map((p) => {
                    const isActive = projectId === p.id;
                    return (
                      <button
                        key={p.id ?? "inbox"}
                        onClick={() => setProjectId(p.id)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 500,
                          border: `1.5px solid ${isActive ? t.accent : t.border}`,
                          background: isActive ? t.accentBg : "transparent",
                          color: isActive ? t.accent : t.text2,
                          cursor: "pointer",
                          transition: "all .12s"
                        }}
                      >
                        {p.name}
                      </button>
                    );
                  })}

                  {/* Dropdown for remaining projects */}
                  {projects.filter((p) => p.status === "active").length > 3 && (
                    <select
                      value={projectId || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProjectId(val === "" ? null : val);
                      }}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 500,
                        border: `1.5px solid ${!quickProjects.map(x=>x.id).includes(projectId) ? t.accent : t.border}`,
                        background: !quickProjects.map(x=>x.id).includes(projectId) ? t.accentBg : t.input,
                        color: !quickProjects.map(x=>x.id).includes(projectId) ? t.accent : t.text2,
                        outline: "none",
                        cursor: "pointer"
                      }}
                    >
                      <option value="">Ostatní projekty...</option>
                      {projects
                        .filter((p) => p.status === "active" && !quickProjects.map((x) => x.id).includes(p.id))
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Termín / Due Date */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, fontFamily: "var(--font-mono)" }}>
                  Termín
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }}
                    onFocus={(e) => { try { e.target.showPicker(); } catch(err) {} }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: `1.5px solid ${dueDate ? t.accent : t.border}`,
                      background: dueDate ? t.accentBg : t.input,
                      color: dueDate ? t.accent : t.text,
                      fontSize: 12,
                      outline: "none",
                      fontWeight: 500,
                      cursor: "pointer"
                    }}
                  />
                  <button
                    onClick={() => setRelativeDate(0)}
                    style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, border: `1.5px solid ${t.border}`, background: "transparent", color: t.text2, cursor: "pointer", transition: "background .12s" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = dk ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    Dnes
                  </button>
                  <button
                    onClick={() => setRelativeDate(1)}
                    style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, border: `1.5px solid ${t.border}`, background: "transparent", color: t.text2, cursor: "pointer", transition: "background .12s" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = dk ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    Zítra
                  </button>
                  {dueDate && (
                    <button
                      onClick={() => setDueDate("")}
                      style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, border: "none", background: "transparent", color: t.red, cursor: "pointer" }}
                    >
                      Smazat
                    </button>
                  )}
                </div>
              </div>

              {/* Tagy / Tags */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)" }}>
                    Tagy
                  </div>
                  {!newTagOpen && (
                    <button
                      onClick={() => setNewTagOpen(true)}
                      style={{ background: "none", border: "none", color: t.accent, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}
                    >
                      <Icon name="plus" size={10} color="currentColor" strokeWidth={2.5} /> Nový tag
                    </button>
                  )}
                </div>

                {/* Inline New Tag Form inside modal */}
                {newTagOpen ? (
                  <form
                    onSubmit={handleCreateTag}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: t.bg2,
                      border: `1px solid ${t.border}`,
                      padding: "6px 10px",
                      borderRadius: 8,
                      marginBottom: 8,
                      animation: "fadeIn .15s ease-out"
                    }}
                  >
                    <input
                      autoFocus
                      placeholder="Název nového tagu…"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      style={{
                        flex: 1,
                        background: "none",
                        border: "none",
                        outline: "none",
                        fontSize: 12.5,
                        color: t.text
                      }}
                    />
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      style={{
                        width: 22,
                        height: 22,
                        border: "none",
                        padding: 0,
                        borderRadius: 4,
                        background: "none",
                        cursor: "pointer"
                      }}
                    />
                    <button type="submit" style={{ padding: "4px 10px", borderRadius: 5, border: "none", background: t.accent, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      Vytvořit
                    </button>
                    <button type="button" onClick={() => setNewTagOpen(false)} style={{ padding: "4px 8px", borderRadius: 5, border: `1px solid ${t.border}`, background: "transparent", color: t.text2, fontSize: 11, cursor: "pointer" }}>
                      Zrušit
                    </button>
                  </form>
                ) : null}

                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                  {quickTags.map((tg) => {
                    const active = tagIds.includes(tg.id);
                    return (
                      <button
                        key={tg.id}
                        onClick={() => toggleTag(tg.id)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          border: `1.5px solid ${active ? tg.color : t.border}`,
                          background: active ? tg.color + "18" : "transparent",
                          color: active ? tg.color : t.text2,
                          cursor: "pointer",
                          transition: "all .12s"
                        }}
                      >
                        {tg.name}
                      </button>
                    );
                  })}

                  {/* Dropdown for remaining tags */}
                  {tags.length > 4 && (
                    <select
                      value=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) toggleTag(val);
                      }}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 500,
                        border: `1.5px solid ${tagIds.some(id => !quickTags.map(x=>x.id).includes(id)) ? t.accent : t.border}`,
                        background: tagIds.some(id => !quickTags.map(x=>x.id).includes(id)) ? t.accentBg : t.input,
                        color: tagIds.some(id => !quickTags.map(x=>x.id).includes(id)) ? t.accent : t.text2,
                        outline: "none",
                        cursor: "pointer"
                      }}
                    >
                      <option value="">Ostatní tagy...</option>
                      {tags
                        .filter((tg) => !quickTags.map((x) => x.id).includes(tg.id))
                        .map((tg) => (
                          <option key={tg.id} value={tg.id} style={{ color: tg.color }}>
                            {tagIds.includes(tg.id) ? `✓ ${tg.name}` : tg.name}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* MODAL FOOTER ACTIONS */}
            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                alignItems: isMobile ? "stretch" : "center",
                justifyContent: "space-between",
                borderTop: `1px solid ${t.border}`,
                paddingTop: 16,
                marginTop: 6,
                gap: isMobile ? 10 : 0,
              }}
            >
              {/* Primary action na mobilu — nahoře, full width */}
              <button
                onClick={() => handleCreate(false)}
                style={{
                  padding: "13px 22px",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 700,
                  border: "none",
                  background: t.accent,
                  color: "#fff",
                  cursor: "pointer",
                  boxShadow: `0 4px 14px ${t.accentGlow}`,
                  display: isMobile ? "block" : "none",
                  width: "100%",
                }}
              >
                Založit úkol
              </button>

              {/* Left Action: Open full drawer details */}
              <button
                onClick={() => handleCreate(true)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  fontSize: 12.5,
                  fontWeight: 600,
                  border: `1.5px solid ${t.border}`,
                  background: "transparent",
                  color: t.text2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: isMobile ? "center" : undefined,
                  gap: 6,
                  cursor: "pointer",
                  transition: "all .12s",
                  width: isMobile ? "100%" : undefined,
                }}
              >
                Další možnosti
                <Icon name="arrow-right" size={13} color="currentColor" strokeWidth={2.5} />
              </button>

              {/* Right Actions: Cancel / Submit — jen desktop */}
              {!isMobile && (
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setModalOpen(false)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 10,
                      fontSize: 12.5,
                      fontWeight: 600,
                      border: "none",
                      background: "transparent",
                      color: t.text3,
                      cursor: "pointer",
                      transition: "color .12s"
                    }}
                  >
                    Zrušit
                  </button>
                  <button
                    onClick={() => handleCreate(false)}
                    style={{
                      padding: "10px 22px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      border: "none",
                      background: t.accent,
                      color: "#fff",
                      cursor: "pointer",
                      boxShadow: `0 4px 14px ${t.accentGlow}`,
                      transition: "all .15s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
                    onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                  >
                    Založit úkol
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
