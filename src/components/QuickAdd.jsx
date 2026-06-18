import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from './Toast.jsx'
import Icon from './Icon.jsx'
import { STATUSES, PRIORITIES } from '../constants.js'
import { supabase } from '../supabase.js'
import { SectionLabel } from "./ui/index.js";

export default function QuickAdd({ defaultProjectId = null }) {
  const { dk, addTask, projects, tags, addProject, addTag, setTaskDetail, isMobile } = useApp();
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

  // AI Drafting States
  const [showAiDraft, setShowAiDraft] = useState(false);
  const [aiInputText, setAiInputText] = useState("");
  const [aiLength, setAiLength] = useState("short"); // "short" or "long"
  const [aiLoading, setAiLoading] = useState(false);
  const [description, setDescription] = useState(""); // Description state for manual preview and edit

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
    setDescription("");
    setShowAiDraft(false);
    setAiInputText("");
    setAiLength("short");
    setAiLoading(false);
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
    const aiHandler = () => {
      handleOpenModal();
      setShowAiDraft(true);
    };
    window.addEventListener("focusQuickAdd", focusHandler);
    window.addEventListener("openQuickAddModal", modalHandler);
    window.addEventListener("openQuickAddAI", aiHandler);
    return () => {
      window.removeEventListener("focusQuickAdd", focusHandler);
      window.removeEventListener("openQuickAddModal", modalHandler);
      window.removeEventListener("openQuickAddAI", aiHandler);
    };
  }, [handleOpenModal]);

  // Robust scroll lock for iOS and general mobile devices
  useEffect(() => {
    if (!modalOpen) return;

    const scrollY = window.scrollY;

    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;
    const originalOverflow = document.body.style.overflow;

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      document.body.style.overflow = originalOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [modalOpen]);

  // AI draft generation
  const handleGenerateAiDraft = async () => {
    const text = aiInputText.trim();
    if (!text) {
      toast("Zadej text pro návrh úkolu", "error");
      return;
    }

    setAiLoading(true);
    try {
      const todayDate = new Date().toISOString().slice(0, 10);
      const availableProjects = projects.map(p => p.name);
      const availableTags = tags.map(t => t.name);

      const { data, error } = await supabase.functions.invoke("ai-task-assist", {
        body: {
          action: "draft_task",
          text,
          length: aiLength,
          todayDate,
          availableProjects,
          availableTags,
        }
      });

      if (error || data?.error) {
        const msg = data?.error || error?.message || String(error);
        if (msg.includes("non-2xx")) {
          toast("Chyba: AI služba není nasazená v Supabase (použij: supabase functions deploy ai-task-assist)", "error");
        } else if (msg.includes("Unauthorized") || error?.status === 401) {
          toast("Chyba přihlášení k AI službám.", "error");
        } else if (error?.status === 429 || msg.includes("Rate limit")) {
          toast("Příliš mnoho AI dotazů — zkus to za hodinu.", "error");
        } else {
          toast(`Chyba AI: ${msg || "neznámá chyba"}`, "error");
        }
        return;
      }

      const raw = data?.result ?? "";
      if (!raw) {
        toast("AI neposkytlo žádný návrh.", "error");
        return;
      }

      localStorage.setItem("mt3:ai_tried", "1");
      window.dispatchEvent(new Event("mt3:ai_tried"));

      const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "").trim();
      const parsed = JSON.parse(cleaned);

      if (parsed.title) setModalTitle(parsed.title);
      if (parsed.description) setDescription(parsed.description);
      
      if (parsed.suggestedProject) {
        const matchedProj = projects.find(
          (p) => p.name.toLowerCase() === parsed.suggestedProject.toLowerCase()
        );
        if (matchedProj) {
          setProjectId(matchedProj.id);
        }
      }

      if (Array.isArray(parsed.suggestedTags)) {
        const matchedTagIds = [];
        parsed.suggestedTags.forEach((name) => {
          const matchedTag = tags.find(
            (t) => t.name.toLowerCase() === name.toLowerCase()
          );
          if (matchedTag) {
            matchedTagIds.push(matchedTag.id);
          }
        });
        setTagIds((prev) => {
          const merged = [...prev, ...matchedTagIds];
          return [...new Set(merged)];
        });
      }

      if (parsed.priority && ["high", "medium", "low"].includes(parsed.priority)) {
        setPriority(parsed.priority);
      }

      if (parsed.dueDate) {
        setDueDate(parsed.dueDate);
      }

      toast("Návrh vytvořen ✨", "success");
    } catch (err) {
      console.error("AI draft generation failed:", err);
      toast("Chyba při parsování návrhu z AI.", "error");
    } finally {
      setAiLoading(false);
    }
  };

  // Saves the task and closes modal
  const handleCreate = (openDetailAfter = false) => {
    const title = modalTitle.trim();
    if (!title) {
      toast("Název úkolu nesmí být prázdný", "error");
      return;
    }

    const tsk = addTask({
      title,
      description: description.trim(),
      status,
      priority,
      projectId,
      dueDate: dueDate || null,
      tagIds
    });
    navigator.vibrate?.([20, 30, 60]);

    setModalOpen(false);

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

  const openNativeDatePicker = (event) => {
    try {
      event.currentTarget.showPicker?.();
    } catch {
      // Some browsers only allow the native picker from direct pointer input.
    }
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
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "var(--shadow-sm)",
          display: "flex",
          alignItems: "center",
          gap: 0,
          transition: "border-color .15s",
        }}
        className="quickadd-container"
      >
        <div style={{ display: "flex", alignItems: "center", padding: "0 14px", color: "var(--text-3)" }}>
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
            color: "var(--text)",
            fontSize: 14,
            padding: "13px 0",
          }}
        />

        <button
          onClick={handleOpenModal}
          className="btn-press"
          style={{
            padding: "0 20px",
            border: "none",
            height: "44px",
            background: val.trim() ? "var(--accent)" : "transparent",
            color: val.trim() ? "#fff" : "var(--text-3)",
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
      {modalOpen && createPortal(
        <div
          className="modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: isMobile ? "flex-end" : "center",
            justifyContent: "center",
            padding: isMobile ? "env(safe-area-inset-top, 16px) 16px var(--safe-area-inset-bottom, 16px)" : 0,
            background: dk ? "rgba(10, 12, 18, 0.45)" : "rgba(15, 18, 28, 0.45)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            animation: "fadeIn .2s ease-out",
            overflow: "hidden",
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="pop modal-dialog"
            style={{
              background: "var(--surface)",
              border: `1px solid ${dk ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)"}`,
              borderRadius: isMobile ? 24 : 16,
              boxShadow: isMobile
                ? "0 18px 48px rgba(0,0,0,0.48)"
                : "0 18px 42px rgba(20, 28, 45, .10)",
              padding: isMobile ? "16px" : "24px 28px",
              width: "100%",
              maxWidth: isMobile ? 420 : 600,
              maxHeight: isMobile ? "calc(100svh - 32px - env(safe-area-inset-top, 0px) - var(--safe-area-inset-bottom, 0px))" : "90vh",
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
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--accent)", fontWeight: 600, fontSize: 13, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                <Icon name="check-square" size={14} color="currentColor" strokeWidth={2.5} />
                Nový úkol
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-3)",
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
                  border: "1.5px solid var(--border)",
                  background: "var(--input)",
                  color: "var(--text)",
                  width: "100%",
                  outline: "none",
                  boxShadow: dk ? "inset 0 1px 2px rgba(0,0,0,0.2)" : "inset 0 1px 2px rgba(0,0,0,0.03)",
                  transition: "border-color .15s"
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--accent)"}
                onBlur={(e) => e.target.style.borderColor = "var(--border)"}
              />
            </div>

            {/* AI Draft Section */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowAiDraft(!showAiDraft)}
                style={{
                  background: showAiDraft ? "var(--accent-soft)" : "transparent",
                  border: `1.5px dashed ${showAiDraft ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 10,
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  color: showAiDraft ? "var(--accent)" : "var(--text-2)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  width: "100%",
                  transition: "all 0.15s ease",
                  outline: "none",
                }}
              >
                <Icon name="zap" size={14} color="currentColor" strokeWidth={2} />
                {showAiDraft ? "Zavřít AI návrh" : "Návrh pomocí AI ✨"}
              </button>

              {showAiDraft && (
                <div
                  style={{
                    background: "var(--bg-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    animation: "fadeIn .2s ease-out",
                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)"
                  }}
                >
                  <SectionLabel>
                    Napište, co je potřeba udělat (AI navrhne parametry)
                  </SectionLabel>

                  <textarea
                    value={aiInputText}
                    onChange={(e) => setAiInputText(e.target.value)}
                    placeholder="Napiš např.: Do zítra musím naprogramovat novou komponentu pro web, dej to do projektu Web a označ jako vysoká priorita..."
                    rows={3}
                    style={{
                      fontSize: 13,
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1.5px solid var(--border)",
                      background: "var(--input)",
                      color: "var(--text)",
                      width: "100%",
                      outline: "none",
                      resize: "vertical",
                      fontFamily: "inherit",
                      boxShadow: dk ? "inset 0 1px 2px rgba(0,0,0,0.2)" : "inset 0 1px 2px rgba(0,0,0,0.03)",
                      transition: "border-color .15s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "var(--accent)"}
                    onBlur={(e) => e.target.style.borderColor = "var(--border)"}
                  />

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    {/* Length toggler */}
                    <div style={{ display: "flex", gap: 4, background: "var(--border)", padding: 3, borderRadius: 8 }}>
                      <button
                        type="button"
                        onClick={() => setAiLength("short")}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 6,
                          fontSize: 11.5,
                          fontWeight: 600,
                          border: "none",
                          background: aiLength === "short" ? "var(--surface)" : "transparent",
                          color: aiLength === "short" ? "var(--text)" : "var(--text-3)",
                          cursor: "pointer",
                          transition: "all .12s"
                        }}
                      >
                        Kratší
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiLength("long")}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 6,
                          fontSize: 11.5,
                          fontWeight: 600,
                          border: "none",
                          background: aiLength === "long" ? "var(--surface)" : "transparent",
                          color: aiLength === "long" ? "var(--text)" : "var(--text-3)",
                          cursor: "pointer",
                          transition: "all .12s"
                        }}
                      >
                        Delší
                      </button>
                    </div>

                    {/* Generate button */}
                    <button
                      type="button"
                      onClick={handleGenerateAiDraft}
                      disabled={aiLoading}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 8,
                        fontSize: 12.5,
                        fontWeight: 700,
                        border: "none",
                        background: "var(--accent)",
                        color: "#fff",
                        cursor: aiLoading ? "not-allowed" : "pointer",
                        boxShadow: "0 4px 10px var(--accent-glow)",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        opacity: aiLoading ? 0.7 : 1,
                        transition: "all .15s"
                      }}
                    >
                      {aiLoading ? (
                        <>
                          <div className="spinner" style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                          Navrhuji...
                        </>
                      ) : (
                        <>
                          <Icon name="zap" size={12} color="currentColor" strokeWidth={2.5} />
                          Generovat
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Description Input */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <SectionLabel>
                  Popis úkolu (volitelný)
                </SectionLabel>
                {!description && (
                  <button
                    type="button"
                    onClick={() => setDescription(" ")}
                    style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                  >
                    + Přidat popis
                  </button>
                )}
              </div>
              {(description || description === " ") && (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Zadej podrobnosti k úkolu..."
                  rows={description.split('\n').length > 5 ? 6 : 3}
                  style={{
                    fontSize: 13,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1.5px solid var(--border)",
                    background: "var(--input)",
                    color: "var(--text)",
                    width: "100%",
                    outline: "none",
                    resize: "vertical",
                    fontFamily: "inherit",
                    boxShadow: dk ? "inset 0 1px 2px rgba(0,0,0,0.2)" : "inset 0 1px 2px rgba(0,0,0,0.03)",
                    transition: "border-color .15s"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "var(--accent)"}
                  onBlur={(e) => e.target.style.borderColor = "var(--border)"}
                />
              )}
            </div>

            {/* SECTION 1: Základní nastavení (Status, Priorita) */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 12 : 20 }}>
              {/* Status Section */}
              <div>
                <SectionLabel style={{ marginBottom: 6 }}>
                  Status
                </SectionLabel>
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
                          border: `1.5px solid ${isActive ? v.color : "var(--border)"}`,
                          background: isActive ? v.bg : "transparent",
                          color: isActive ? v.color : "var(--text-2)",
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
                <SectionLabel style={{ marginBottom: 6 }}>
                  Priorita
                </SectionLabel>
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
                      border: `1.5px solid ${priority === null ? "var(--text-3)" : "var(--border)"}`,
                      background: priority === null ? (dk ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)") : "transparent",
                      color: priority === null ? "var(--text)" : "var(--text-2)",
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
                          border: `1.5px solid ${isActive ? v.color : "var(--border)"}`,
                          background: isActive ? v.bg : "transparent",
                          color: isActive ? v.color : "var(--text-2)",
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
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Project Line */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <SectionLabel>
                    Projekt
                  </SectionLabel>
                  {!newProjOpen && (
                    <button
                      onClick={() => setNewProjOpen(true)}
                      style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}
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
                      background: "var(--bg-2)",
                      border: "1px solid var(--border)",
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
                        color: "var(--text)"
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
                    <button type="submit" style={{ padding: "4px 10px", borderRadius: 5, border: "none", background: "var(--accent)", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      Vytvořit
                    </button>
                    <button type="button" onClick={() => setNewProjOpen(false)} style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid var(--border)", background: "transparent", color: "var(--text-2)", fontSize: 11, cursor: "pointer" }}>
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
                          border: `1.5px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                          background: isActive ? "var(--accent-soft)" : "transparent",
                          color: isActive ? "var(--accent)" : "var(--text-2)",
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
                        border: `1.5px solid ${!quickProjects.map(x=>x.id).includes(projectId) ? "var(--accent)" : "var(--border)"}`,
                        background: !quickProjects.map(x=>x.id).includes(projectId) ? "var(--accent-soft)" : "var(--input)",
                        color: !quickProjects.map(x=>x.id).includes(projectId) ? "var(--accent)" : "var(--text-2)",
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
                <SectionLabel style={{ marginBottom: 6 }}>
                  Termín
                </SectionLabel>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    onClick={openNativeDatePicker}
                    onFocus={openNativeDatePicker}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: `1.5px solid ${dueDate ? "var(--accent)" : "var(--border)"}`,
                      background: dueDate ? "var(--accent-soft)" : "var(--input)",
                      color: dueDate ? "var(--accent)" : "var(--text)",
                      fontSize: 12,
                      outline: "none",
                      fontWeight: 500,
                      cursor: "pointer"
                    }}
                  />
                  <button
                    onClick={() => setRelativeDate(0)}
                    style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, border: "1.5px solid var(--border)", background: "transparent", color: "var(--text-2)", cursor: "pointer", transition: "background .12s" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = dk ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    Dnes
                  </button>
                  <button
                    onClick={() => setRelativeDate(1)}
                    style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, border: "1.5px solid var(--border)", background: "transparent", color: "var(--text-2)", cursor: "pointer", transition: "background .12s" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = dk ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    Zítra
                  </button>
                  {dueDate && (
                    <button
                      onClick={() => setDueDate("")}
                      style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, border: "none", background: "transparent", color: "#ef4444", cursor: "pointer" }}
                    >
                      Smazat
                    </button>
                  )}
                </div>
              </div>

              {/* Tagy / Tags */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <SectionLabel>
                    Tagy
                  </SectionLabel>
                  {!newTagOpen && (
                    <button
                      onClick={() => setNewTagOpen(true)}
                      style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}
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
                      background: "var(--bg-2)",
                      border: "1px solid var(--border)",
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
                        color: "var(--text)"
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
                    <button type="submit" style={{ padding: "4px 10px", borderRadius: 5, border: "none", background: "var(--accent)", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      Vytvořit
                    </button>
                    <button type="button" onClick={() => setNewTagOpen(false)} style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid var(--border)", background: "transparent", color: "var(--text-2)", fontSize: 11, cursor: "pointer" }}>
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
                          border: `1.5px solid ${active ? tg.color : "var(--border)"}`,
                          background: active ? tg.color + "18" : "transparent",
                          color: active ? tg.color : "var(--text-2)",
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
                        border: `1.5px solid ${tagIds.some(id => !quickTags.map(x=>x.id).includes(id)) ? "var(--accent)" : "var(--border)"}`,
                        background: tagIds.some(id => !quickTags.map(x=>x.id).includes(id)) ? "var(--accent-soft)" : "var(--input)",
                        color: tagIds.some(id => !quickTags.map(x=>x.id).includes(id)) ? "var(--accent)" : "var(--text-2)",
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
                borderTop: "1px solid var(--border)",
                paddingTop: 16,
                marginTop: 6,
                gap: isMobile ? 10 : 0,
              }}
            >
              {/* Primary action na mobilu — nahoře, full width */}
              <button
                onClick={() => handleCreate(false)}
                className="btn-press"
                style={{
                  padding: "13px 22px",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 700,
                  border: "none",
                  background: "var(--accent)",
                  color: "#fff",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px var(--accent-glow)",
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
                  border: "1.5px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-2)",
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
                      color: "var(--text-3)",
                      cursor: "pointer",
                      transition: "color .12s"
                    }}
                  >
                    Zrušit
                  </button>
                  <button
                    onClick={() => handleCreate(false)}
                    className="btn-press"
                    style={{
                      padding: "10px 22px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      border: "none",
                      background: "var(--accent)",
                      color: "#fff",
                      cursor: "pointer",
                      boxShadow: "0 4px 14px var(--accent-glow)",
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
      , document.getElementById("root") || document.body)}
    </>
  );
}
