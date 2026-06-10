import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../context/AppContext.jsx";
import { useToast } from "../components/Toast.jsx";
import Icon from "../components/Icon.jsx";
import { getErrorLogs, clearErrorLogs } from "../utils/errorLogger.js";
import { supabase } from "../supabase.js";

// AdminPage — systémová diagnostika a správa aplikace
export default function AdminPage() {
  const { t, tasks, projects, tags, notes, quickTodos, trash, workspaceMembers, activeWorkspaceId, isSystemAdmin, restoreTask, restoreProject, restoreNote, permanentlyDeleteTask, permanentlyDeleteProject, permanentlyDeleteNote } = useApp();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [dbLatency, setDbLatency] = useState(null);
  const [pingStatus, setPingStatus] = useState("idle");
  const [errorLogs, setErrorLogs] = useState([]);
  const [swStatus, setSwStatus] = useState("checking");

  // Načtení chybových logů
  useEffect(() => {
    const loadLogs = () => setErrorLogs(getErrorLogs());
    loadLogs();
    window.addEventListener("mt3:error_logged", loadLogs);
    return () => window.removeEventListener("mt3:error_logged", loadLogs);
  }, []);

  // Měření latence DB
  const measureLatency = async () => {
    setPingStatus("pinging");
    const start = performance.now();
    try {
      const { error } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .limit(1);
      if (error) throw error;
      const end = performance.now();
      setDbLatency(Math.round(end - start));
      setPingStatus("success");
      toast("Databázové spojení OK", "success");
    } catch (err) {
      setPingStatus("error");
      toast("Chyba spojení: " + err.message, "error");
    }
  };

  useEffect(() => {
    measureLatency();
  }, []);

  // Service Worker status
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      setSwStatus("Nepodporováno");
      return;
    }
    navigator.serviceWorker.getRegistrations()
      .then((regs) => {
        if (regs && regs.length > 0) {
          setSwStatus(`Aktivní (${regs.length} registrací)`);
        } else {
          setSwStatus("Neregistrován / offline");
        }
      })
      .catch((err) => {
        setSwStatus("Chyba detekce: " + err.message);
      });
  }, []);

  // Výpočet obsazení LocalStorage
  const [localStorageSize, setLocalStorageSize] = useState(0);
  const calculateLocalStorageUsage = () => {
    if (typeof window === "undefined") return;
    let bytes = 0;
    try {
      for (let key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
          bytes += (key.length + localStorage[key].length) * 2; // UTF-16 char je 2 bajty
        }
      }
      setLocalStorageSize(bytes);
    } catch (e) {
      console.warn("Nepodařilo se spočítat LocalStorage:", e);
    }
  };

  useEffect(() => {
    calculateLocalStorageUsage();
    const interval = setInterval(calculateLocalStorageUsage, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("cs-CZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  // Data metrics
  const taskMetrics = useMemo(() => {
    const active = tasks.filter(t => t.status !== "done");
    const done = tasks.filter(t => t.status === "done");
    const overdue = active.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length;
    const highPriority = active.filter(t => t.priority === "high").length;
    return { total: tasks.length, active: active.length, done: done.length, overdue, highPriority };
  }, [tasks]);

  const projectMetrics = useMemo(() => {
    const active = projects.filter(p => p.status !== "archived");
    const archived = projects.filter(p => p.status === "archived");
    return { total: projects.length, active: active.length, archived: archived.length };
  }, [projects]);

  const noteMetrics = useMemo(() => {
    const totalSize = notes.reduce((sum, n) => sum + (n.content?.length || 0), 0);
    return { total: notes.length, totalSize };
  }, [notes]);

  const quickTodoMetrics = useMemo(() => {
    const open = quickTodos.filter(q => !q.done).length;
    const done = quickTodos.filter(q => q.done).length;
    return { total: quickTodos.length, open, done };
  }, [quickTodos]);

  const attachmentMetrics = useMemo(() => {
    const attachments = notes.flatMap(n => n.attachments || []);
    const totalSize = attachments.reduce((sum, a) => sum + (a.size || 0), 0);
    return { count: attachments.length, size: totalSize, sizeFormatted: formatBytes(totalSize) };
  }, [notes]);

  const trashMetrics = useMemo(() => {
    const taskTrash = trash?.tasks?.length || 0;
    const projectTrash = trash?.projects?.length || 0;
    const noteTrash = trash?.notes?.length || 0;
    return { total: taskTrash + projectTrash + noteTrash, tasks: taskTrash, projects: projectTrash, notes: noteTrash };
  }, [trash]);

  const handleClearLogs = () => {
    clearErrorLogs();
    setErrorLogs([]);
    toast("Chybové logy vymazány", "success");
  };

  const exportData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      workspaceId: activeWorkspaceId,
      metrics: { taskMetrics, projectMetrics, noteMetrics, quickTodoMetrics, attachmentMetrics, trashMetrics },
      errorLogs,
      localStorageSize,
      dbLatency,
      swStatus
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `michal-tasks-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Diagnostika exportována", "success");
  };

  const simulateError = () => {
    const errorLog = {
      id: Date.now(),
      type: "simulated",
      message: "Testovací chyba vyvolaná z administrace",
      stack: "AdminPage.simulateError → test",
      timestamp: new Date().toISOString(),
      url: window.location.href
    };
    const currentLogs = getErrorLogs();
    const updated = [errorLog, ...currentLogs].slice(0, 50);
    localStorage.setItem("mt3:system_errors", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("mt3:error_logged", { detail: errorLog }));
    toast("Testovací chyba zaznamenána", "warning");
  };

  const tabs = [
    { id: "overview", label: "Přehled", icon: "bar-chart-3" },
    { id: "diagnostics", label: "Diagnostika", icon: "activity" },
    { id: "logs", label: "Chyby", icon: "alert-triangle", badge: errorLogs.length },
    { id: "storage", label: "Úložiště", icon: "database" },
    { id: "trash", label: "Koš", icon: "trash-2", badge: trashMetrics.total },
  ];

  if (!isSystemAdmin) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-3)" }}>
        <Icon name="lock" size={48} color="var(--text-3)" />
        <h2 style={{ marginTop: "16px", color: "var(--text)" }}>Přístup odepřen</h2>
        <p>Tato stránka je dostupná pouze systémovým administrátorům.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "24px", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "32px", fontWeight: 700, color: "var(--text)", marginBottom: "8px" }}>
              Systém & Administrace
            </h1>
            <p style={{ color: "var(--text-3)", fontSize: "15px" }}>
              Diagnostika, metriky a správa aplikace Zentero
            </p>
          </div>
          <button
            onClick={exportData}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "10px 16px", borderRadius: "var(--r)",
              background: "var(--accent)", color: "white", border: "none",
              fontSize: "13px", fontWeight: 600, cursor: "pointer"
            }}
          >
            <Icon name="download" size={16} color="currentColor" />
            Export diagnostiky
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-soft)", overflowX: "auto" }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "12px 18px", border: "none", background: "transparent",
                color: activeTab === tab.id ? "var(--accent)" : "var(--text-3)",
                borderBottom: activeTab === tab.id ? "2px solid var(--accent)" : "2px solid transparent",
                fontSize: "14px", fontWeight: activeTab === tab.id ? 600 : 500,
                cursor: "pointer", whiteSpace: "nowrap"
              }}
            >
              <Icon name={tab.icon} size={16} color="currentColor" />
              {tab.label}
              {tab.badge > 0 && (
                <span style={{
                  minWidth: "20px", height: "20px", padding: "0 6px",
                  borderRadius: "10px", background: "var(--red)", color: "white",
                  fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 1. TAB: PŘEHLED */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gap: "24px" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "20px"
          }}>
            {/* Úkoly */}
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--border-soft)",
              borderRadius: "var(--r-lg)",
              padding: "20px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <span style={{ color: "var(--text-3)", fontSize: "13px", fontWeight: 500 }}>Úkoly</span>
                <div style={{ padding: "6px", borderRadius: "var(--r)", background: "var(--accent-soft)", color: "var(--accent)" }}>
                  <Icon name="check-square" size={18} color="currentColor" />
                </div>
              </div>
              <div style={{ fontSize: "28px", fontWeight: 700, fontFamily: "var(--mono)", color: "var(--text)", lineHeight: 1.1 }}>
                {taskMetrics.total}
              </div>
              <div style={{ display: "flex", gap: "10px", fontSize: "12px", color: "var(--text-3)", marginTop: "8px" }}>
                <span>{taskMetrics.active} aktivních</span>
                <span>·</span>
                <span style={{ color: "var(--green)" }}>{taskMetrics.done} hotovo</span>
              </div>
            </div>

            {/* Projekty */}
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--border-soft)",
              borderRadius: "var(--r-lg)",
              padding: "20px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <span style={{ color: "var(--text-3)", fontSize: "13px", fontWeight: 500 }}>Projekty</span>
                <div style={{ padding: "6px", borderRadius: "var(--r)", background: "rgba(59, 130, 246, 0.1)", color: "var(--blue)" }}>
                  <Icon name="folder" size={18} color="currentColor" />
                </div>
              </div>
              <div style={{ fontSize: "28px", fontWeight: 700, fontFamily: "var(--mono)", color: "var(--text)", lineHeight: 1.1 }}>
                {projectMetrics.total}
              </div>
              <div style={{ display: "flex", gap: "10px", fontSize: "12px", color: "var(--text-3)", marginTop: "8px" }}>
                <span>{projectMetrics.active} aktivních</span>
                <span>·</span>
                <span>{projectMetrics.archived} archiv</span>
              </div>
            </div>

            {/* Poznámky */}
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--border-soft)",
              borderRadius: "var(--r-lg)",
              padding: "20px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <span style={{ color: "var(--text-3)", fontSize: "13px", fontWeight: 500 }}>Poznámky</span>
                <div style={{ padding: "6px", borderRadius: "var(--r)", background: "rgba(168, 85, 247, 0.1)", color: "#a855f7" }}>
                  <Icon name="file-text" size={18} color="currentColor" />
                </div>
              </div>
              <div style={{ fontSize: "28px", fontWeight: 700, fontFamily: "var(--mono)", color: "var(--text)", lineHeight: 1.1 }}>
                {notes.length}
              </div>
              <div style={{ display: "flex", gap: "10px", fontSize: "12px", color: "var(--text-3)", marginTop: "8px" }}>
                <span>Poznámek</span>
                <span>·</span>
                <span style={{ color: "var(--accent)" }}>{tags.length} tagů</span>
              </div>
            </div>

            {/* Soubory & Přílohy */}
            <div style={{
              background: "rgba(20, 24, 34, 0.6)",
              backdropFilter: "blur(12px)",
              border: "1px solid var(--border-soft)",
              borderRadius: "var(--r-lg)",
              padding: "20px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <span style={{ color: "var(--text-3)", fontSize: "13px", fontWeight: 500 }}>Přílohy (Úložiště)</span>
                <div style={{ padding: "6px", borderRadius: "var(--r)", background: "rgba(34, 197, 94, 0.1)", color: "var(--green)" }}>
                  <Icon name="paperclip" size={18} color="currentColor" />
                </div>
              </div>
              <div style={{ fontSize: "28px", fontWeight: 700, fontFamily: "var(--mono)", color: "var(--text)", lineHeight: 1.1 }}>
                {attachmentMetrics.count}
              </div>
              <div style={{ display: "flex", gap: "10px", fontSize: "12px", color: "var(--text-3)", marginTop: "8px" }}>
                <span>Souborů</span>
                <span>·</span>
                <span style={{ color: "var(--green)", fontWeight: 600 }}>{attachmentMetrics.sizeFormatted}</span>
              </div>
            </div>
          </div>

          {/* Doplňující statistiky */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "20px"
          }}>
            {/* Rozpad stavu úkolů a Rychlý seznam */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "20px"
            }}>
              <div style={{
                background: "var(--surface)",
                border: "1px solid var(--border-soft)",
                borderRadius: "var(--r-lg)",
                padding: "24px"
              }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", marginBottom: "16px" }}>Stav plnění úkolů</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--text-2)", marginBottom: "4px" }}>
                      <span>Zpožděné úkoly (kritické)</span>
                      <span style={{ fontFamily: "var(--mono)", color: "var(--red)" }}>{taskMetrics.overdue}</span>
                    </div>
                    <div style={{ height: "6px", background: "var(--bg-2)", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{
                        width: `${taskMetrics.total > 0 ? (taskMetrics.overdue / taskMetrics.total) * 100 : 0}%`,
                        height: "100%",
                        background: "var(--red)"
                      }} />
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--text-2)", marginBottom: "4px" }}>
                      <span>Úkoly s vysokou prioritou</span>
                      <span style={{ fontFamily: "var(--mono)", color: "var(--orange)" }}>{taskMetrics.highPriority}</span>
                    </div>
                    <div style={{ height: "6px", background: "var(--bg-2)", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{
                        width: `${taskMetrics.total > 0 ? (taskMetrics.highPriority / taskMetrics.total) * 100 : 0}%`,
                        height: "100%",
                        background: "var(--orange)"
                      }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--text-2)", marginBottom: "4px" }}>
                      <span>Dokončené úkoly</span>
                      <span style={{ fontFamily: "var(--mono)", color: "var(--green)" }}>
                        {taskMetrics.done} z {taskMetrics.total} ({taskMetrics.total > 0 ? Math.round((taskMetrics.done / taskMetrics.total) * 100) : 0}%)
                      </span>
                    </div>
                    <div style={{ height: "6px", background: "var(--bg-2)", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{
                        width: `${taskMetrics.total > 0 ? (taskMetrics.done / taskMetrics.total) * 100 : 0}%`,
                        height: "100%",
                        background: "var(--green)"
                      }} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{
                background: "var(--surface)",
                border: "1px solid var(--border-soft)",
                borderRadius: "var(--r-lg)",
                padding: "24px"
              }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", marginBottom: "16px" }}>Rychlý seznam (Inbox)</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--text-2)", marginBottom: "4px" }}>
                      <span>Celkem položek</span>
                      <span style={{ fontFamily: "var(--mono)", color: "var(--text)" }}>{quickTodoMetrics.total}</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--text-2)", marginBottom: "4px" }}>
                      <span>Rozpracované rychlé položky</span>
                      <span style={{ fontFamily: "var(--mono)", color: "var(--accent)" }}>{quickTodoMetrics.open}</span>
                    </div>
                    <div style={{ height: "6px", background: "var(--bg-2)", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{
                        width: `${quickTodoMetrics.total > 0 ? (quickTodoMetrics.open / quickTodoMetrics.total) * 100 : 0}%`,
                        height: "100%",
                        background: "var(--accent)"
                      }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--text-2)", marginBottom: "4px" }}>
                      <span>Odbavené rychlé položky</span>
                      <span style={{ fontFamily: "var(--mono)", color: "var(--text-3)" }}>{quickTodoMetrics.done}</span>
                    </div>
                    <div style={{ height: "6px", background: "var(--bg-2)", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{
                        width: `${quickTodoMetrics.total > 0 ? (quickTodoMetrics.done / quickTodoMetrics.total) * 100 : 0}%`,
                        height: "100%",
                        background: "var(--text-4)"
                      }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Adresář členů workspace */}
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--border-soft)",
              borderRadius: "var(--r-lg)",
              padding: "24px"
            }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Icon name="users" size={18} color="var(--accent)" />
                Uživatelé a členové workspace ({workspaceMembers.length})
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {workspaceMembers.map((m, idx) => {
                  const roleColors = { owner: "var(--accent)", admin: "var(--blue)", member: "var(--green)", viewer: "var(--text-3)" };
                  return (
                    <div
                      key={m.id || idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        background: "var(--bg-2)",
                        border: "1px solid var(--border-soft)",
                        borderRadius: "var(--r)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: (roleColors[m.role] || "var(--accent)") + "1a",
                          border: `1px solid ${(roleColors[m.role] || "var(--accent)")}44`,
                          color: roleColors[m.role] || "var(--accent)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "12px",
                          fontFamily: "var(--mono)"
                        }}>
                          {(m.displayName || m.email || "U").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text)" }}>
                            {m.displayName || "Člen bez jména"}
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--text-3)", fontFamily: "var(--mono)" }}>
                            {m.email}
                          </div>
                        </div>
                      </div>
                      <span style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: roleColors[m.role] || "var(--text-3)",
                        background: (roleColors[m.role] || "var(--text-3)") + "12",
                        padding: "3px 8px",
                        borderRadius: "99px",
                        border: `1px solid ${(roleColors[m.role] || "var(--text-3)")}33`
                      }}>
                        {m.role || "member"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TAB: DIAGNOSTIKA SYSTÉMU */}
      {activeTab === "diagnostics" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
          {/* Karta: Ping & DB Spojení */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border-soft)",
            borderRadius: "var(--r-lg)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)" }}>Latence databáze Supabase</h3>
                <button
                  onClick={measureLatency}
                  disabled={pingStatus === "pinging"}
                  style={{
                    padding: "6px 12px",
                    background: "var(--bg-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text-2)",
                    borderRadius: "var(--r)",
                    fontSize: "12px",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <span style={{ animation: pingStatus === "pinging" ? "spin 1s linear infinite" : "none", display: "inline-block" }}>
                    <Icon name="refresh-cw" size={11} color="currentColor" />
                  </span>
                  Testovat
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", margin: "20px 0" }}>
                <span style={{
                  fontSize: "36px",
                  fontWeight: 700,
                  fontFamily: "var(--mono)",
                  color: dbLatency === null ? "var(--text-3)" : dbLatency < 120 ? "var(--green)" : dbLatency < 300 ? "var(--orange)" : "var(--red)"
                }}>
                  {dbLatency !== null ? `${dbLatency}` : "---"}
                </span>
                <span style={{ fontSize: "14px", color: "var(--text-3)", fontWeight: 500 }}>ms</span>
              </div>

              <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.4 }}>
                Měří se skutečná doba od odeslání asynchronního API požadavku do navrácení odpovědi. 
                Hodnoty pod 120 ms jsou výborné, do 300 ms přijatelné.
              </p>
            </div>
          </div>

          {/* Karta: PWA / Service Worker */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border-soft)",
            borderRadius: "var(--r-lg)",
            padding: "24px"
          }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", marginBottom: "16px" }}>PWA / Offline režim</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{
                width: "12px", height: "12px", borderRadius: "50%",
                background: swStatus.includes("Aktivní") ? "var(--green)" : "var(--orange)",
                boxShadow: swStatus.includes("Aktivní") ? "0 0 12px var(--green)" : "none"
              }} />
              <span style={{ fontSize: "15px", color: "var(--text)", fontWeight: 500 }}>{swStatus}</span>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.4 }}>
              Service Worker zajišťuje offline dostupnost aplikace a cachování statických souborů.
            </p>
          </div>

          {/* Karta: LocalStorage */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border-soft)",
            borderRadius: "var(--r-lg)",
            padding: "24px"
          }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", marginBottom: "16px" }}>LocalStorage</h3>
            <div style={{ fontSize: "32px", fontWeight: 700, fontFamily: "var(--mono)", color: "var(--accent)", marginBottom: "8px" }}>
              {formatBytes(localStorageSize)}
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.4 }}>
              Přibližné využití lokálního úložiště pro cache, nastavení a diagnostické logy.
            </p>
          </div>
        </div>
      )}

      {/* 3. TAB: CHYBY */}
      {activeTab === "logs" && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border-soft)", borderRadius: "var(--r-lg)", overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}>Chybové logy</h3>
              <p style={{ fontSize: "13px", color: "var(--text-3)" }}>Posledních {errorLogs.length} zachycených chyb v prohlížeči</p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={simulateError}
                style={{
                  padding: "8px 12px", borderRadius: "var(--r)", border: "1px solid var(--border-soft)",
                  background: "var(--bg-2)", color: "var(--text-2)", fontSize: "12px", cursor: "pointer"
                }}
              >
                Simulovat chybu
              </button>
              <button
                onClick={handleClearLogs}
                disabled={errorLogs.length === 0}
                style={{
                  padding: "8px 12px", borderRadius: "var(--r)", border: "1px solid var(--border-soft)",
                  background: errorLogs.length > 0 ? "var(--red-soft)" : "var(--bg-2)",
                  color: errorLogs.length > 0 ? "var(--red)" : "var(--text-4)",
                  fontSize: "12px", cursor: errorLogs.length > 0 ? "pointer" : "default"
                }}
              >
                Vymazat logy
              </button>
            </div>
          </div>

          {errorLogs.length === 0 ? (
            <div style={{ padding: "60px", textAlign: "center", color: "var(--text-3)" }}>
              <Icon name="check-circle" size={48} color="var(--green)" />
              <h3 style={{ marginTop: "16px", color: "var(--text)", fontSize: "18px" }}>Žádné chyby</h3>
              <p style={{ marginTop: "8px" }}>Aplikace běží bez zaznamenaných chyb.</p>
            </div>
          ) : (
            <div style={{ maxHeight: "500px", overflowY: "auto" }}>
              {errorLogs.map((log, idx) => (
                <div
                  key={log.id || idx}
                  style={{
                    padding: "16px 24px",
                    borderBottom: idx < errorLogs.length - 1 ? "1px solid var(--border-soft)" : "none",
                    background: idx % 2 === 0 ? "transparent" : "var(--bg-2)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "8px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: "99px", fontSize: "10px", fontWeight: 700,
                          background: log.type === "promise_rejection" ? "var(--orange-soft)" : "var(--red-soft)",
                          color: log.type === "promise_rejection" ? "var(--orange)" : "var(--red)",
                          textTransform: "uppercase"
                        }}>
                          {log.type}
                        </span>
                        <span style={{ fontSize: "12px", color: "var(--text-3)", fontFamily: "var(--mono)" }}>{formatDate(log.timestamp)}</span>
                      </div>
                      <div style={{ fontSize: "14px", color: "var(--text)", fontWeight: 500 }}>{log.message}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "4px", fontFamily: "var(--mono)" }}>
                        {log.filename}:{log.lineno}:{log.colno}
                      </div>
                    </div>
                  </div>
                  {log.stack && (
                    <pre style={{
                      marginTop: "10px", padding: "12px", borderRadius: "var(--r)",
                      background: "var(--bg)", color: "var(--text-2)", fontSize: "11px",
                      fontFamily: "var(--mono)", overflowX: "auto", whiteSpace: "pre-wrap", lineHeight: 1.5
                    }}>
                      {log.stack}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. TAB: ÚLOŽIŠTĚ */}
      {activeTab === "storage" && (
        <div style={{ display: "grid", gap: "20px" }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-soft)", borderRadius: "var(--r-lg)", padding: "24px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text)", marginBottom: "20px" }}>Využití úložiště</h3>
            <div style={{ display: "grid", gap: "16px" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                  <span style={{ color: "var(--text-2)" }}>LocalStorage</span>
                  <span style={{ color: "var(--text)", fontFamily: "var(--mono)" }}>{formatBytes(localStorageSize)} / ~5 MB</span>
                </div>
                <div style={{ height: "8px", background: "var(--bg-2)", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{
                    width: `${Math.min((localStorageSize / (5 * 1024 * 1024)) * 100, 100)}%`,
                    height: "100%",
                    background: localStorageSize > 4 * 1024 * 1024 ? "var(--red)" : "var(--accent)",
                    transition: "width 0.3s"
                  }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginTop: "16px" }}>
                <div style={{ padding: "16px", background: "var(--bg-2)", borderRadius: "var(--r)", border: "1px solid var(--border-soft)" }}>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--accent)", fontFamily: "var(--mono)" }}>{notes.length}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "4px" }}>Poznámek</div>
                </div>
                <div style={{ padding: "16px", background: "var(--bg-2)", borderRadius: "var(--r)", border: "1px solid var(--border-soft)" }}>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--accent)", fontFamily: "var(--mono)" }}>{formatBytes(noteMetrics.totalSize)}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "4px" }}>Text v poznámkách</div>
                </div>
                <div style={{ padding: "16px", background: "var(--bg-2)", borderRadius: "var(--r)", border: "1px solid var(--border-soft)" }}>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--green)", fontFamily: "var(--mono)" }}>{attachmentMetrics.sizeFormatted}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "4px" }}>Přílohy celkem</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB: KOŠ */}
      {activeTab === "trash" && (
        <div style={{ display: "grid", gap: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border-soft)", borderRadius: "var(--r-lg)", padding: "20px" }}>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--red)", fontFamily: "var(--mono)" }}>{trashMetrics.total}</div>
              <div style={{ fontSize: "13px", color: "var(--text-3)", marginTop: "4px" }}>Celkem v koši</div>
            </div>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border-soft)", borderRadius: "var(--r-lg)", padding: "20px" }}>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--text)", fontFamily: "var(--mono)" }}>{trashMetrics.tasks}</div>
              <div style={{ fontSize: "13px", color: "var(--text-3)", marginTop: "4px" }}>Úkoly</div>
            </div>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border-soft)", borderRadius: "var(--r-lg)", padding: "20px" }}>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--text)", fontFamily: "var(--mono)" }}>{trashMetrics.projects}</div>
              <div style={{ fontSize: "13px", color: "var(--text-3)", marginTop: "4px" }}>Projekty</div>
            </div>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border-soft)", borderRadius: "var(--r-lg)", padding: "20px" }}>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--text)", fontFamily: "var(--mono)" }}>{trashMetrics.notes}</div>
              <div style={{ fontSize: "13px", color: "var(--text-3)", marginTop: "4px" }}>Poznámky</div>
            </div>
          </div>

          {trashMetrics.total === 0 ? (
            <div style={{ padding: "60px", textAlign: "center", color: "var(--text-3)", background: "var(--surface)", border: "1px solid var(--border-soft)", borderRadius: "var(--r-lg)" }}>
              <Icon name="trash-2" size={48} color="var(--text-4)" />
              <h3 style={{ marginTop: "16px", color: "var(--text)", fontSize: "18px" }}>Koš je prázdný</h3>
              <p style={{ marginTop: "8px" }}>Smazané položky se zde zobrazí.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "20px" }}>
              {/* Smazané úkoly */}
              {trash?.tasks?.length > 0 && (
                <div style={{ background: "var(--surface)", border: "1px solid var(--border-soft)", borderRadius: "var(--r-lg)", overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-soft)", fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Icon name="check-square" size={16} color="var(--text-3)" />
                    Smazané úkoly ({trash.tasks.length})
                  </div>
                  {trash.tasks.map(task => (
                    <div key={task.id} style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)" }}>{task.title}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "2px" }}>Smazáno: {formatDate(task.deletedAt)}</div>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => { restoreTask(task.id); toast("Úkol obnoven", "success"); }}
                          style={{ padding: "6px 12px", borderRadius: "var(--r)", border: "1px solid var(--border-soft)", background: "var(--green-soft)", color: "var(--green)", fontSize: "12px", cursor: "pointer" }}
                        >
                          Obnovit
                        </button>
                        <button
                          onClick={() => { if (confirm("Opravdu trvale smazat?")) { permanentlyDeleteTask(task.id); toast("Úkol trvale smazán", "success"); } }}
                          style={{ padding: "6px 12px", borderRadius: "var(--r)", border: "1px solid var(--border-soft)", background: "var(--red-soft)", color: "var(--red)", fontSize: "12px", cursor: "pointer" }}
                        >
                          Smazat trvale
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Smazané projekty */}
              {trash?.projects?.length > 0 && (
                <div style={{ background: "var(--surface)", border: "1px solid var(--border-soft)", borderRadius: "var(--r-lg)", overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-soft)", fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Icon name="folder" size={16} color="var(--text-3)" />
                    Smazané projekty ({trash.projects.length})
                  </div>
                  {trash.projects.map(project => (
                    <div key={project.id} style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)" }}>{project.name}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "2px" }}>Smazáno: {formatDate(project.deletedAt)}</div>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => { restoreProject(project.id); toast("Projekt obnoven", "success"); }}
                          style={{ padding: "6px 12px", borderRadius: "var(--r)", border: "1px solid var(--border-soft)", background: "var(--green-soft)", color: "var(--green)", fontSize: "12px", cursor: "pointer" }}
                        >
                          Obnovit
                        </button>
                        <button
                          onClick={() => { if (confirm("Opravdu trvale smazat?")) { permanentlyDeleteProject(project.id); toast("Projekt trvale smazán", "success"); } }}
                          style={{ padding: "6px 12px", borderRadius: "var(--r)", border: "1px solid var(--border-soft)", background: "var(--red-soft)", color: "var(--red)", fontSize: "12px", cursor: "pointer" }}
                        >
                          Smazat trvale
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Smazané poznámky */}
              {trash?.notes?.length > 0 && (
                <div style={{ background: "var(--surface)", border: "1px solid var(--border-soft)", borderRadius: "var(--r-lg)", overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-soft)", fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Icon name="file-text" size={16} color="var(--text-3)" />
                    Smazané poznámky ({trash.notes.length})
                  </div>
                  {trash.notes.map(note => (
                    <div key={note.id} style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)" }}>{note.title}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "2px" }}>Smazáno: {formatDate(note.deletedAt)}</div>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => { restoreNote(note.id); toast("Poznámka obnovena", "success"); }}
                          style={{ padding: "6px 12px", borderRadius: "var(--r)", border: "1px solid var(--border-soft)", background: "var(--green-soft)", color: "var(--green)", fontSize: "12px", cursor: "pointer" }}
                        >
                          Obnovit
                        </button>
                        <button
                          onClick={() => { if (confirm("Opravdu trvale smazat?")) { permanentlyDeleteNote(note.id); toast("Poznámka trvale smazána", "success"); } }}
                          style={{ padding: "6px 12px", borderRadius: "var(--r)", border: "1px solid var(--border-soft)", background: "var(--red-soft)", color: "var(--red)", fontSize: "12px", cursor: "pointer" }}
                        >
                          Smazat trvale
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
