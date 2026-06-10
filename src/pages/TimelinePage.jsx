import React, { useMemo, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { parseYMD, projectColor, startOfToday } from "../utils.js";
import { formatDate, formatDateKey } from "../locale.js";

const DOW_CS = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];

function assignLanes(tasks, startDate) {
  const indexed = tasks
    .map((task) => {
      const d = parseYMD(task.dueDate);
      if (!d) return null;
      const idx = Math.floor((d - startDate) / 86400000);
      return { task, idx, span: 1 };
    })
    .filter(Boolean)
    .sort((a, b) => a.idx - b.idx);

  const laneEnds = [];
  return indexed.map((it) => {
    let lane = 0;
    while (laneEnds[lane] !== undefined && laneEnds[lane] >= it.idx) lane += 1;
    laneEnds[lane] = it.idx + it.span - 1;
    return { ...it, lane };
  });
}

function taskDue(task) {
  const d = parseYMD(task.dueDate);
  if (!d) return null;
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

function QuickAddPopover({ defaultDate, onAdd, onClose }) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(defaultDate);
  const [priority, setPriority] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    onAdd({ title: clean, dueDate: dueDate || null, priority: priority || null });
    onClose();
  };

  return (
    <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 20, width: 270, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 10, boxShadow: "0 8px 24px rgba(0,0,0,.35)" }}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Název úkolu…" className="detail-input" autoFocus />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <input type="date" value={dueDate || ""} onChange={(e) => setDueDate(e.target.value)} className="detail-input" onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }} onFocus={(e) => { try { e.target.showPicker(); } catch(err) {} }} />
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="detail-input">
            <option value="">Priorita</option>
            <option value="low">Nízká</option>
            <option value="medium">Střední</option>
            <option value="high">Vysoká</option>
          </select>
        </div>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn" onClick={onClose}>Zrušit</button>
          <button type="submit" className="btn primary">Přidat</button>
        </div>
      </form>
    </div>
  );
}

function CellAddModal({ addingForCell, onClose, onAdd }) {
  const { projects, tasks, tags: allTags, addProject, addTag } = useApp();
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(addingForCell?.projectId || "");
  const [dueDate, setDueDate] = useState(addingForCell?.dateKey || "");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("todo");
  const [description, setDescription] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Projects inline creator states
  const [newProjName, setNewProjName] = useState("");
  const [isCreatingProj, setIsCreatingProj] = useState(false);
  
  // Tags inline creator states
  const [tagQuery, setTagQuery] = useState("");
  const [isTagInputFocused, setIsTagInputFocused] = useState(false);

  // Top 3 most frequent projects
  const topProjects = useMemo(() => {
    const active = projects.filter((p) => p.status === "active");
    const counts = {};
    active.forEach((p) => { counts[p.id] = 0; });
    tasks.forEach((t) => {
      if (t.projectId && counts[t.projectId] !== undefined) {
        counts[t.projectId] += 1;
      }
    });
    return active
      .sort((a, b) => counts[b.id] - counts[a.id])
      .slice(0, 3);
  }, [projects, tasks]);

  // Top 4 most frequent tags
  const topTags = useMemo(() => {
    const counts = {};
    allTags.forEach((tg) => { counts[tg.id] = 0; });
    tasks.forEach((t) => {
      if (Array.isArray(t.tagIds)) {
        t.tagIds.forEach((id) => {
          if (counts[id] !== undefined) {
            counts[id] += 1;
          }
        });
      }
    });
    return [...allTags]
      .sort((a, b) => counts[b.id] - counts[a.id])
      .slice(0, 4);
  }, [allTags, tasks]);

  // Filter unselected tags matching query
  const filteredTags = useMemo(() => {
    const q = tagQuery.toLowerCase().trim();
    return allTags.filter((t) => {
      const notSelected = !selectedTagIds.includes(t.id);
      const matchesQuery = t.name.toLowerCase().includes(q);
      return notSelected && matchesQuery;
    });
  }, [allTags, selectedTagIds, tagQuery]);

  const handleProjKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const name = newProjName.trim();
      if (name) {
        const np = addProject({ name, status: "active" });
        if (np?.id) {
          setProjectId(np.id);
        }
      }
      setNewProjName("");
      setIsCreatingProj(false);
    } else if (e.key === "Escape") {
      setIsCreatingProj(false);
      setNewProjName("");
    }
  };

  const handleTagSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = tagQuery.trim();
      if (!val) return;
      
      if (filteredTags.length > 0 && filteredTags[0].name.toLowerCase() === val.toLowerCase()) {
        setSelectedTagIds((prev) => [...prev, filteredTags[0].id]);
        setTagQuery("");
      } else {
        const tagColors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];
        const randColor = tagColors[Math.floor(Math.random() * tagColors.length)];
        const nt = addTag({ name: val, color: randColor });
        if (nt?.id) {
          setSelectedTagIds((prev) => [...prev, nt.id]);
        }
        setTagQuery("");
      }
    }
  };

  const setPresetDate = (preset) => {
    const today = new Date();
    if (preset === "today") {
      setDueDate(formatDateKey(today));
    } else if (preset === "tomorrow") {
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);
      setDueDate(formatDateKey(tomorrow));
    } else if (preset === "nextWeek") {
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      setDueDate(formatDateKey(nextWeek));
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    onAdd({
      title: clean,
      projectId: projectId || null,
      dueDate: dueDate || null,
      priority: priority || null,
      status: status,
      description: description.trim() || "",
      tagIds: selectedTagIds,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ backdropFilter: "blur(8px)", background: "rgba(0,0,0,0.6)" }}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 500,
          maxWidth: "95%",
          background: "rgba(10, 10, 10, 0.8)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 16,
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.05)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 20,
          overflow: "visible",
        }}
      >
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
              <span>✨</span> Připravit nový úkol
            </h3>
            <button
              type="button"
              className="icon-btn"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "50%",
                width: 28,
                height: 22,
                color: "#999",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)"; e.currentTarget.style.color = "#999"; }}
            >
              ✕
            </button>
          </div>

          {/* Section 1: Základní */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", marginBottom: 6, fontWeight: 600 }}>
                Název úkolu
              </label>
              <input
                className="detail-input"
                style={{
                  width: "100%",
                  fontSize: 15,
                  padding: "10px 14px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 10,
                  color: "#fff",
                  outline: "none",
                  transition: "all 0.2s",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 2px var(--accent-soft)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Co máte v plánu udělat?…"
                autoFocus
                required
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", fontWeight: 600 }}>
                  Projekt
                </label>
                {isCreatingProj ? (
                  <span style={{ fontSize: 11, color: "var(--accent)", cursor: "pointer" }} onClick={() => setIsCreatingProj(false)}>Zrušit</span>
                ) : (
                  <span style={{ fontSize: 11, color: "var(--accent)", cursor: "pointer" }} onClick={() => setIsCreatingProj(true)}>+ Nový projekt</span>
                )}
              </div>

              {isCreatingProj ? (
                <input
                  className="detail-input"
                  style={{
                    width: "100%",
                    fontSize: 13,
                    padding: "8px 12px",
                    background: "rgba(255, 150, 0, 0.05)",
                    border: "1px solid var(--accent)",
                    borderRadius: 8,
                    color: "#fff",
                    outline: "none",
                  }}
                  autoFocus
                  placeholder="Zadejte název projektu a stiskněte Enter…"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  onKeyDown={handleProjKeyDown}
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <select
                    className="detail-input"
                    style={{
                      width: "100%",
                      fontSize: 13.5,
                      padding: "8px 12px",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: 10,
                      color: "#fff",
                    }}
                    value={projectId || ""}
                    onChange={(e) => setProjectId(e.target.value)}
                  >
                    <option value="" style={{ background: "#111" }}>Bez projektu</option>
                    {projects.filter(p => p.status === "active").map((p) => (
                      <option key={p.id} value={p.id} style={{ background: "#111" }}>{p.name}</option>
                    ))}
                  </select>

                  {/* Top Projects Pills */}
                  {topProjects.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "var(--text-4)" }}>Rychlá volba:</span>
                      {topProjects.map((p) => {
                        const isSel = projectId === p.id;
                        const col = projectColor(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setProjectId(p.id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "4px 10px",
                              borderRadius: "var(--r-pill)",
                              fontSize: 11,
                              fontWeight: isSel ? 600 : 400,
                              cursor: "pointer",
                              border: `1px solid ${isSel ? col : "rgba(255, 255, 255, 0.08)"}`,
                              background: isSel ? `${col}15` : "rgba(255, 255, 255, 0.02)",
                              color: isSel ? "#fff" : "var(--text-3)",
                              transition: "all 0.15s",
                            }}
                            onMouseEnter={(e) => { if (!isSel) { e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)"; e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"; } }}
                            onMouseLeave={(e) => { if (!isSel) { e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)"; e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)"; } }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: col }} />
                            {p.name}
                          </button>
                        );
                      })}
                      {projectId && (
                        <button
                          type="button"
                          onClick={() => setProjectId("")}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "var(--r-pill)",
                            fontSize: 11,
                            cursor: "pointer",
                            border: "1px solid transparent",
                            background: "transparent",
                            color: "var(--red)",
                          }}
                        >
                          odebrat
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Parametry */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: 16 }}>
            {/* Status (Stav) Selector as segment switch */}
            <div>
              <label style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", marginBottom: 6, fontWeight: 600 }}>
                Stav úkolu
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 10,
                  padding: 3,
                }}
              >
                {[
                  { id: "todo", label: "To do", col: "var(--text-2)" },
                  { id: "doing", label: "Doing", col: "var(--blue)" },
                  { id: "waiting", label: "Čekám", col: "var(--orange)" },
                  { id: "done", label: "Hotovo", col: "var(--green)" },
                ].map((st) => {
                  const isAct = status === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStatus(st.id)}
                      style={{
                        padding: "6px 2px",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: isAct ? 600 : 400,
                        cursor: "pointer",
                        background: isAct ? "rgba(255, 255, 255, 0.08)" : "transparent",
                        color: isAct ? st.col : "var(--text-3)",
                        boxShadow: isAct ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
                        transition: "all 0.15s",
                      }}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority Selector as segment switch */}
            <div>
              <label style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", marginBottom: 6, fontWeight: 600 }}>
                Priorita
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 10,
                  padding: 3,
                }}
              >
                {[
                  { id: "", label: "Žádná", bg: "transparent", borderCol: "transparent", txtCol: "var(--text-3)", actBg: "rgba(255, 255, 255, 0.08)" },
                  { id: "low", label: "Nízká", bg: "#22c55e15", borderCol: "#22c55e40", txtCol: "#22c55e", actBg: "#22c55e20" },
                  { id: "medium", label: "Střední", bg: "#f59e0b15", borderCol: "#f59e0b40", txtCol: "#f59e0b", actBg: "#f59e0b20" },
                  { id: "high", label: "Vysoká", bg: "#ef444415", borderCol: "#ef444440", txtCol: "#ef4444", actBg: "#ef444420" },
                ].map((pr) => {
                  const isAct = priority === pr.id;
                  return (
                    <button
                      key={pr.id}
                      type="button"
                      onClick={() => setPriority(pr.id)}
                      style={{
                        padding: "6px 2px",
                        border: isAct ? `1px solid ${pr.borderCol}` : "1px solid transparent",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: isAct ? 600 : 400,
                        cursor: "pointer",
                        background: isAct ? pr.actBg : "transparent",
                        color: isAct ? pr.txtCol : "var(--text-3)",
                        boxShadow: isAct ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                        transition: "all 0.15s",
                      }}
                    >
                      {pr.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Due date and preset shortcuts */}
            <div>
              <label style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", marginBottom: 6, fontWeight: 600 }}>
                Termín dokončení
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  type="date"
                  className="detail-input"
                  style={{
                    width: "100%",
                    fontSize: 13.5,
                    padding: "8px 12px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: 10,
                    color: "#fff",
                  }}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }}
                  onFocus={(e) => { try { e.target.showPicker(); } catch(err) {} }}
                />

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--text-4)" }}>Rychlé termíny:</span>
                  {[
                    { id: "today", label: "Dnes" },
                    { id: "tomorrow", label: "Zítra" },
                    { id: "nextWeek", label: "Příští týden" },
                  ].map((pres) => {
                    const todayDate = new Date();
                    let expectedVal = formatDateKey(todayDate);
                    if (pres.id === "tomorrow") {
                      todayDate.setDate(todayDate.getDate() + 1);
                      expectedVal = formatDateKey(todayDate);
                    } else if (pres.id === "nextWeek") {
                      todayDate.setDate(todayDate.getDate() + 7);
                      expectedVal = formatDateKey(todayDate);
                    }
                    const isSelected = dueDate === expectedVal;
                    return (
                      <button
                        key={pres.id}
                        type="button"
                        onClick={() => setPresetDate(pres.id)}
                        style={{
                          padding: "3px 8px",
                          borderRadius: "var(--r-pill)",
                          fontSize: 11,
                          cursor: "pointer",
                          border: `1px solid ${isSelected ? "var(--accent)" : "rgba(255, 255, 255, 0.08)"}`,
                          background: isSelected ? "var(--accent-soft)" : "rgba(255, 255, 255, 0.02)",
                          color: isSelected ? "var(--accent)" : "var(--text-3)",
                          transition: "all 0.1s",
                        }}
                      >
                        {pres.label}
                      </button>
                    );
                  })}
                  {dueDate && (
                    <button
                      type="button"
                      onClick={() => setDueDate("")}
                      style={{
                        padding: "3px 8px",
                        borderRadius: "var(--r-pill)",
                        fontSize: 11,
                        cursor: "pointer",
                        border: "1px solid transparent",
                        background: "transparent",
                        color: "var(--red)",
                      }}
                    >
                      zrušit
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Rozšiřující (Advanced) - Collapsible toggle */}
          <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: 12 }}>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-3)",
                fontSize: 12.5,
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 8px",
                marginLeft: -8,
                borderRadius: 6,
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-2)"}
              onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-3)"}
            >
              <span>{showAdvanced ? "▾" : "▸"}</span> Další možnosti (Popis, Tagy)
            </button>

            {showAdvanced && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12, padding: "4px 0" }}>
                {/* Description */}
                <div>
                  <label style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", marginBottom: 6, fontWeight: 600 }}>
                    Poznámky / Popis
                  </label>
                  <textarea
                    className="detail-input"
                    style={{
                      width: "100%",
                      fontSize: 13,
                      resize: "none",
                      height: 70,
                      padding: "8px 12px",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: 10,
                      color: "#fff",
                    }}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Bližší podrobnosti k úkolu…"
                  />
                </div>

                {/* Tags autocomplete selector */}
                <div style={{ position: "relative" }}>
                  <label style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", marginBottom: 6, fontWeight: 600 }}>
                    Tagy (Štítky)
                  </label>
                  
                  {/* Selected Tags Pills */}
                  {selectedTagIds.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                      {selectedTagIds.map((tid) => {
                        const tg = allTags.find(x => x.id === tid);
                        if (!tg) return null;
                        return (
                          <span
                            key={tid}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              background: `${tg.color}20`,
                              border: `1px solid ${tg.color}40`,
                              color: tg.color,
                              fontSize: 11.5,
                              padding: "2px 8px",
                              borderRadius: 6,
                              fontWeight: 500,
                            }}
                          >
                            #{tg.name}
                            <span
                              onClick={() => setSelectedTagIds((p) => p.filter(id => id !== tid))}
                              style={{ cursor: "pointer", opacity: 0.7, fontSize: 10, paddingLeft: 2 }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}
                            >
                              ✕
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Search / Create Input */}
                  <input
                    className="detail-input"
                    style={{
                      width: "100%",
                      fontSize: 13,
                      padding: "8px 12px",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: 10,
                      color: "#fff",
                    }}
                    placeholder="Vyhledat nebo napsat název štítku a stisknout Enter…"
                    value={tagQuery}
                    onChange={(e) => setTagQuery(e.target.value)}
                    onKeyDown={handleTagSearchKeyDown}
                    onFocus={() => setIsTagInputFocused(true)}
                    onBlur={() => setTimeout(() => setIsTagInputFocused(false), 200)} // delay to allow clicks
                  />

                  {/* Suggestions Dropdown */}
                  {isTagInputFocused && filteredTags.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        background: "#121212",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: 10,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                        maxHeight: 150,
                        overflowY: "auto",
                        zIndex: 100,
                        marginTop: 4,
                        padding: 4,
                      }}
                    >
                      {filteredTags.map((tg) => (
                        <div
                          key={tg.id}
                          onClick={() => {
                            setSelectedTagIds((p) => [...p, tg.id]);
                            setTagQuery("");
                          }}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 6,
                            cursor: "pointer",
                            fontSize: 12.5,
                            color: tg.color,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: tg.color }} />
                          #{tg.name}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tag Query Creation Info */}
                  {tagQuery.trim() && !allTags.some(t => t.name.toLowerCase() === tagQuery.trim().toLowerCase()) && (
                    <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 4 }}>
                      Stiskněte Enter pro vytvoření nového štítku: <strong style={{ color: "#fff" }}>#{tagQuery.trim()}</strong>
                    </div>
                  )}

                  {/* Top Tags Pills */}
                  {topTags.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
                      <span style={{ fontSize: 11, color: "var(--text-4)" }}>Časté štítky:</span>
                      {topTags.map((tg) => {
                        const isSelected = selectedTagIds.includes(tg.id);
                        if (isSelected) return null;
                        return (
                          <button
                            key={tg.id}
                            type="button"
                            onClick={() => setSelectedTagIds((p) => [...p, tg.id])}
                            style={{
                              padding: "2px 8px",
                              borderRadius: 6,
                              fontSize: 11,
                              cursor: "pointer",
                              border: `1px solid ${tg.color}30`,
                              background: `${tg.color}05`,
                              color: tg.color,
                              transition: "all 0.1s",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = `${tg.color}15`; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = `${tg.color}05`; }}
                          >
                            +# {tg.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid rgba(255, 255, 255, 0.06)",
              paddingTop: 16,
              marginTop: 4,
            }}
          >
            {/* Show Advanced Toggle as Secondary button if not expanded */}
            {!showAdvanced ? (
              <button
                type="button"
                className="btn"
                onClick={() => setShowAdvanced(true)}
                style={{ fontSize: 12.5, color: "var(--text-3)", borderColor: "rgba(255, 255, 255, 0.08)", background: "transparent" }}
              >
                ⚙️ Další možnosti
              </button>
            ) : (
              <div />
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn"
                onClick={onClose}
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  background: "transparent",
                  color: "var(--text-2)",
                }}
              >
                Zrušit
              </button>
              <button
                type="submit"
                className="btn primary"
                style={{
                  padding: "8px 20px",
                  fontSize: 13.5,
                  fontWeight: 600,
                  background: "var(--accent)",
                  borderColor: "var(--accent)",
                  boxShadow: "0 4px 12px var(--accent-soft)",
                }}
              >
                🚀 Založit úkol
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TimelinePage() {
  const {
    tasks,
    projects,
    addTask,
    setTaskDetail,
    isMobile,
    timelineOffsetDays: offsetDays,
    setTimelineOffsetDays: setOffsetDays,
  } = useApp();

  const [daysCount, setDaysCount] = useState(() => Number(localStorage.getItem("mt3:timeline_days") || 7));
  const [addingFor, setAddingFor] = useState(null);
  const [addingForCell, setAddingForCell] = useState(null);
  const [selectedDayKey, setSelectedDayKey] = useState(null);

  const handleSetDaysCount = (val) => {
    setDaysCount(val);
    setSelectedDayKey(null);
    localStorage.setItem("mt3:timeline_days", val);
  };

  const shiftRange = (delta) => {
    setSelectedDayKey(null);
    setOffsetDays((v) => v + delta);
  };

  const resetRange = () => {
    setSelectedDayKey(null);
    setOffsetDays(0);
  };

  const today = startOfToday();
  const startDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + offsetDays);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [today, offsetDays]);

  const days = useMemo(() => {
    return Array.from({ length: daysCount }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d;
    });
  }, [startDate, daysCount]);

  const todayKey = formatDateKey(today);
  const selectedDateKey = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + offsetDays);
    return formatDateKey(d);
  }, [today, offsetDays]);

  const activeProjects = projects.filter((p) => p.status === "active");
  const scheduled = tasks.filter((t) => t.dueDate && t.status !== "done");
  const overdueCount = scheduled.filter((t) => t.dueDate < todayKey).length;

  const rows = useMemo(() => {
    const pRows = activeProjects.map((p) => ({
      id: p.id,
      name: p.name,
      color: projectColor(p.id),
      tasks: scheduled.filter((t) => t.projectId === p.id),
      projectId: p.id,
    }));

    const inbox = scheduled.filter((t) => !t.projectId);
    if (inbox.length) {
      pRows.push({ id: "_inbox", name: "Bez projektu", color: "#8b95a5", tasks: inbox, projectId: null });
    }

    return pRows;
  }, [activeProjects, scheduled]);

  const laneData = useMemo(() => {
    const m = new Map();
    rows.forEach((r) => m.set(r.id, assignLanes(r.tasks, startDate)));
    return m;
  }, [rows, startDate]);

  const byDate = useMemo(() => {
    const m = new Map();
    days.forEach((d) => {
      const key = formatDateKey(d);
      m.set(key, scheduled
        .filter((t) => t.dueDate === key)
        .sort((a, b) => (a.priority === "high" ? -1 : b.priority === "high" ? 1 : 0)));
    });
    return m;
  }, [scheduled, days]);

  const overdueTasks = useMemo(() =>
    scheduled
      .filter((t) => t.dueDate < todayKey)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [scheduled, todayKey],
  );

  const handleAdd = (projectId, payload) => {
    addTask({
      title: payload.title,
      dueDate: payload.dueDate,
      priority: payload.priority,
      projectId,
      status: "todo",
    });
    setAddingFor(null);
  };

  const handleAddForCell = (payload) => {
    addTask({
      title: payload.title,
      dueDate: payload.dueDate,
      priority: payload.priority,
      projectId: payload.projectId,
      description: payload.description,
      status: payload.status || "todo",
      tagIds: payload.tagIds || [],
    });
    setAddingForCell(null);
  };

  const handleClickHeaderDay = (d) => {
    const diffTime = d.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / 86400000);
    setOffsetDays(diffDays);
  };

  const rangeLabel = `${formatDate(days[0], { day: "numeric", month: "long" })} → ${formatDate(days[daysCount - 1], { day: "numeric", month: "long", year: "numeric" })}`;

  if (isMobile) {
    const tomorrowKey = formatDateKey(new Date(today.getTime() + 86400000));
    const visibleDays = selectedDayKey
      ? days.filter((d) => formatDateKey(d) === selectedDayKey)
      : days.filter((d) => formatDateKey(d) >= todayKey);

    return (
      <div className="content">
        <div className="ph" style={{ marginBottom: 12 }}>
          <div>
            <div className="ph-eyebrow">{rangeLabel}</div>
            <h1 className="ph-title">Plán</h1>
            <div className="ph-sub">
              {overdueCount > 0 && <span style={{ color: "var(--red)" }}>{overdueCount} po termínu</span>}
              {overdueCount > 0 && <span className="dot" />}
              <span>{activeProjects.length} projektů</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 5, alignSelf: "flex-start", paddingTop: 4 }}>
            <button className="btn" style={{ padding: "6px 10px", fontSize: 13 }} onClick={() => shiftRange(-daysCount)}>←</button>
            <button className="btn primary" style={{ padding: "6px 10px", fontSize: 13 }} onClick={resetRange}>dnes</button>
            <button className="btn" style={{ padding: "6px 10px", fontSize: 13 }} onClick={() => shiftRange(daysCount)}>→</button>
          </div>
        </div>

        <div className="segmented-control" style={{ width: "100%", marginBottom: 12 }}>
          <button style={{ flex: 1 }} className={`sc-btn ${daysCount === 7 ? "active" : ""}`} onClick={() => handleSetDaysCount(7)}>7 dní</button>
          <button style={{ flex: 1 }} className={`sc-btn ${daysCount === 14 ? "active" : ""}`} onClick={() => handleSetDaysCount(14)}>14 dní</button>
          <button style={{ flex: 1 }} className={`sc-btn ${daysCount === 30 ? "active" : ""}`} onClick={() => handleSetDaysCount(30)}>30 dní</button>
        </div>

        {/* Date strip */}
        <div className="tl-mob-strip-wrap">
          <div className="tl-mob-strip">
            {days.map((d) => {
              const key = formatDateKey(d);
              const count = (byDate.get(key) || []).length;
              const isToday = key === todayKey;
              const isSelected = key === selectedDayKey;
              const isPast = key < todayKey;
              return (
                <button
                  key={key}
                  className={`tl-mob-day${isToday ? " today" : ""}${isSelected ? " sel" : ""}${isPast ? " past" : ""}`}
                  onClick={() => setSelectedDayKey(isSelected ? null : key)}
                >
                  <span className="tl-mob-dow">{DOW_CS[d.getDay()]}</span>
                  <span className="tl-mob-num">{d.getDate()}</span>
                  <span className="tl-mob-dot-row">
                    {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                      <span key={i} className="tl-mob-dot" />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Overdue section */}
        {!selectedDayKey && overdueTasks.length > 0 && (
          <div className="tl-mob-section">
            <div className="tl-mob-sh overdue">
              <span>Po termínu</span>
              <span className="tl-mob-cnt">{overdueTasks.length}</span>
            </div>
            {overdueTasks.map((t) => {
              const proj = projects.find((p) => p.id === t.projectId);
              return (
                <div key={t.id} className="tl-mob-task" onClick={() => setTaskDetail(t.id)}>
                  <span className="tl-mob-task-dot" style={{ background: proj ? projectColor(proj.id) : "var(--text-4)" }} />
                  <div className="tl-mob-task-info">
                    <div className="tl-mob-task-title">{t.title}</div>
                    {proj && <div className="tl-mob-task-proj">{proj.name}</div>}
                  </div>
                  <span className="tl-mob-task-date overdue">{taskDue(t)}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Day sections */}
        {visibleDays.map((d) => {
          const key = formatDateKey(d);
          const list = byDate.get(key) || [];
          const isToday = key === todayKey;
          const isTomorrow = key === tomorrowKey;
          if (!selectedDayKey && list.length === 0) return null;
          const label = isToday ? "Dnes" : isTomorrow ? "Zítra" : `${DOW_CS[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.`;

          return (
            <div key={key} className="tl-mob-section">
              <div className={`tl-mob-sh${isToday ? " today" : ""}`}>
                <span>{label}</span>
                <span className="tl-mob-cnt">{list.length}</span>
              </div>
              {list.length === 0 ? (
                <div style={{ padding: "10px 0 4px", fontSize: 12.5, color: "var(--text-4)" }}>Žádné úkoly</div>
              ) : (
                list.map((t) => {
                  const proj = projects.find((p) => p.id === t.projectId);
                  return (
                    <div key={t.id} className="tl-mob-task" onClick={() => setTaskDetail(t.id)}>
                      <span className="tl-mob-task-dot" style={{ background: proj ? projectColor(proj.id) : "var(--text-4)" }} />
                      <div className="tl-mob-task-info">
                        <div className="tl-mob-task-title">{t.title}</div>
                        {proj && <div className="tl-mob-task-proj">{proj.name}</div>}
                      </div>
                      {t.priority === "high" && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--red)", fontFamily: "var(--mono)" }}>HI</span>
                      )}
                    </div>
                  );
                })
              )}
              <button
                className="tl-mob-add-btn"
                onClick={() => setAddingForCell({ projectId: null, dateKey: key })}
              >
                + Přidat úkol
              </button>
            </div>
          );
        })}

        {addingForCell && (
          <CellAddModal
            addingForCell={addingForCell}
            projects={projects}
            onClose={() => setAddingForCell(null)}
            onAdd={handleAddForCell}
          />
        )}
      </div>
    );
  }

  return (
    <div className="content">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">{rangeLabel} · {daysCount} dní</div>
          <h1 className="ph-title">Plán</h1>
          <div className="ph-sub"><span>{overdueCount} po termínu</span><span className="dot" /><span>{activeProjects.length} projektů</span></div>
        </div>
        <div className="row" style={{ gap: 12, alignItems: "center" }}>
          <div className="segmented-control">
            <button className={`sc-btn ${daysCount === 7 ? "active" : ""}`} onClick={() => handleSetDaysCount(7)}>7 dní</button>
            <button className={`sc-btn ${daysCount === 14 ? "active" : ""}`} onClick={() => handleSetDaysCount(14)}>14 dní</button>
            <button className={`sc-btn ${daysCount === 30 ? "active" : ""}`} onClick={() => handleSetDaysCount(30)}>30 dní</button>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn" onClick={() => shiftRange(-daysCount)}>← zpět</button>
            <button className="btn primary" onClick={resetRange}>dnes</button>
            <button className="btn" onClick={() => shiftRange(daysCount)}>vpřed →</button>
          </div>
        </div>
      </div>

      <div className="tl">
        <div className="tl-head">
          <div className="tl-head-l">Projekt</div>
          <div className="tl-days" style={{ gridTemplateColumns: `repeat(${daysCount}, 1fr)` }}>
            {days.map((d, i) => {
              const dateKey = formatDateKey(d);
              const isToday = dateKey === todayKey;
              const isSelected = dateKey === selectedDateKey;
              const dow = d.getDay();
              const isWeekend = dow === 0 || dow === 6;
              return (
                <div
                  key={i}
                  className={`tl-day ${isToday ? "today" : ""} ${isSelected ? "selected" : ""} ${isWeekend ? "we" : ""}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => handleClickHeaderDay(d)}
                >
                  {d.getDate()}.{d.getMonth() + 1}
                </div>
              );
            })}
          </div>
        </div>

        {rows.map((row) => {
          const lanes = laneData.get(row.id) || [];
          const maxLane = lanes.reduce((m, x) => Math.max(m, x.lane), 0);
          const rowHeight = Math.max(50, 44 + maxLane * 30);

          return (
            <div key={row.id} className="tl-row" style={{ minHeight: rowHeight }}>
              <div className="tl-lab" style={{ position: "relative" }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: row.color, display: "inline-block" }} />
                <span style={{ flex: 1 }}>{row.name}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-4)" }}>{row.tasks.length}</span>
                <button className="icon-btn" style={{ width: 22, height: 22 }} onClick={() => setAddingFor(addingFor === row.id ? null : row.id)}>+</button>

                {addingFor === row.id ? (
                  <QuickAddPopover
                    defaultDate={todayKey}
                    onClose={() => setAddingFor(null)}
                    onAdd={(payload) => handleAdd(row.projectId, payload)}
                  />
                ) : null}
              </div>

              <div className="tl-grid" style={{ gridTemplateColumns: `repeat(${daysCount}, 1fr)` }}>
                {days.map((d, i) => {
                  const dateKey = formatDateKey(d);
                  const isToday = dateKey === todayKey;
                  const isSelected = dateKey === selectedDateKey;
                  return (
                    <div
                      key={i}
                      className={`tl-cell clickable ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        setAddingForCell({
                          projectId: row.projectId,
                          projectName: row.name,
                          dateKey: dateKey,
                        });
                      }}
                      title={`Připravit úkol pro ${row.name} na ${d.getDate()}.${d.getMonth() + 1}.`}
                    />
                  );
                })}

                {lanes.map(({ task, idx, span, lane }) => {
                  if (idx < 0 || idx > daysCount - 1) return null;
                  const d = parseYMD(task.dueDate);
                  const isOverdue = d && d < today;
                  return (
                    <div
                      key={task.id}
                      className={`tl-task ${isOverdue ? "overdue" : ""}`}
                      style={{
                        left: `calc(${(idx / daysCount) * 100}% + 3px)`,
                        width: `calc(${(span / daysCount) * 100}% - 6px)`,
                        top: 11 + lane * 30,
                        background: row.color,
                      }}
                      onClick={() => setTaskDetail(task.id)}
                      title={task.title}
                    >
                      {task.title}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {addingForCell ? (
        <CellAddModal
          addingForCell={addingForCell}
          projects={projects}
          onClose={() => setAddingForCell(null)}
          onAdd={handleAddForCell}
        />
      ) : null}
    </div>
  );
}
