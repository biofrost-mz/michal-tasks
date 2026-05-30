import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../context/AppContext.jsx";
import Icon from "../components/Icon.jsx";
import { useToast } from "../components/Toast.jsx";
import { supabase } from "../supabase.js";
import {
  getErrorLogs,
  clearErrorLogs,
  simulateError,
  simulatePromiseRejection,
} from "../utils/errorLogger.js";

export default function AdminPage() {
  const {
    projects = [],
    tasks = [],
    notes = [],
    tags = [],
    attachments = [],
    quickTodos = [],
    workspaceMembers = [],
    activeWorkspaceId,
    userEmail,
    addTask,
    deletedProjects = [],
    deletedTasks = [],
    deletedNotes = [],
    restoreProject,
    restoreTask,
    restoreNote,
    hardDeleteProject,
    hardDeleteTask,
    hardDeleteNote,
  } = useApp();

  const toast = useToast();

  const [activeTab, setActiveTab] = useState("overview");

  // Síťový stav v reálném čase
  const [isOnline, setIsOnline] = useState(
    () => typeof window !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Měření latence k databázi (Supabase Ping)
  const [dbLatency, setDbLatency] = useState(null);
  const [pingStatus, setPingStatus] = useState("idle"); // idle, pinging, error
  const [autoPing, setAutoPing] = useState(true);

  const measureLatency = async () => {
    if (!isOnline) {
      setDbLatency(null);
      setPingStatus("idle");
      return;
    }
    setPingStatus("pinging");
    const start = performance.now();
    try {
      // Provedeme minimální dotaz na tabulku projektů pro změření latence spojení
      await supabase.from("projects").select("id", { count: "exact", head: true });
      const duration = Math.round(performance.now() - start);
      setDbLatency(duration);
      setPingStatus("idle");
    } catch (e) {
      console.warn("DB Ping failed:", e);
      setPingStatus("error");
    }
  };

  useEffect(() => {
    measureLatency();
  }, [isOnline]);

  useEffect(() => {
    if (!autoPing) return;
    const timer = setInterval(measureLatency, 10000);
    return () => clearInterval(timer);
  }, [autoPing, isOnline]);

  // Stav Service Workera
  const [swStatus, setSwStatus] = useState("Zjišťuji…");
  useEffect(() => {
    if (typeof window === "undefined") return;
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
        if (localStorage.hasOwnProperty(key)) {
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
  }, []);

  // Chybové logy v reálném čase z errorLoggeru
  const [errorLogs, setErrorLogs] = useState(() => getErrorLogs());
  const [expandedErrorId, setExpandedErrorId] = useState(null);

  useEffect(() => {
    const handleNewError = () => {
      setErrorLogs(getErrorLogs());
      calculateLocalStorageUsage(); // aktualizace po uložení chyby
    };
    window.addEventListener("mt3:error_logged", handleNewError);
    return () => window.removeEventListener("mt3:error_logged", handleNewError);
  }, []);

  const handleClearLogs = () => {
    clearErrorLogs();
    toast("Konzole chyb byla vymazána", "success");
  };

  const handleExportLogs = () => {
    if (errorLogs.length === 0) {
      toast("Žádné chybové záznamy k exportu", "warning");
      return;
    }
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(errorLogs, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `mt3_system_errors_${new Date().toISOString().split("T")[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast("Logy úspěšně staženy", "success");
    } catch (e) {
      toast("Chyba při exportu: " + e.message, "error");
    }
  };

  // Výpočet metrik úkolů a příloh
  const taskMetrics = useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === "todo").length;
    const doing = tasks.filter((t) => t.status === "doing").length;
    const waiting = tasks.filter((t) => t.status === "waiting").length;
    const done = tasks.filter((t) => t.status === "done").length;
    
    const todayStr = new Date().toISOString().split("T")[0];
    const overdue = tasks.filter(
      (t) => t.status !== "done" && t.dueDate && t.dueDate < todayStr
    ).length;

    const highPriority = tasks.filter((t) => t.priority === "high" && t.status !== "done").length;

    return { total, todo, doing, waiting, done, overdue, highPriority };
  }, [tasks]);

  const attachmentMetrics = useMemo(() => {
    const totalCount = attachments.length;
    const totalBytes = attachments.reduce((sum, a) => sum + (a.size || 0), 0);
    
    // Formátování velikosti
    let formattedSize = "0 B";
    if (totalBytes > 0) {
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(totalBytes) / Math.log(k));
      formattedSize = parseFloat((totalBytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    }

    return { count: totalCount, sizeFormatted: formattedSize };
  }, [attachments]);

  const quickTodoMetrics = useMemo(() => {
    const total = quickTodos.length;
    const open = quickTodos.filter((q) => !q.done).length;
    const done = quickTodos.filter((q) => q.done).length;
    return { total, open, done };
  }, [quickTodos]);

  // Formulář hlášení chyb (Bug Report)
  const [bugForm, setBugForm] = useState({
    title: "",
    area: "Dashboard",
    severity: "Střední",
    description: "",
  });
  const [submittingBug, setSubmittingBug] = useState(false);

  const handleBugSubmit = async (e) => {
    e.preventDefault();
    if (!bugForm.title.trim() || !bugForm.description.trim()) {
      toast("Prosím vyplňte název a popis chyby", "warning");
      return;
    }

    setSubmittingBug(true);

    try {
      // Sestavení podrobné systémové diagnostiky
      const debugInfo = `
=== SYSTÉMOVÁ DIAGNOSTIKA ===
Čas hlášení: ${new Date().toLocaleString("cs-CZ")}
Stav připojení: ${isOnline ? "ONLINE" : "OFFLINE"}
Service Worker: ${swStatus}
LocalStorage využití: ${(localStorageSize / 1024).toFixed(1)} KB
Database Latency: ${dbLatency !== null ? dbLatency + " ms" : "Neznámo"}
Prohlížeč (User Agent): ${navigator.userAgent}
Aktivní Workspace: ${activeWorkspaceId || "Neznámo"}
Reportér: ${userEmail || "Neznámý uživatel"}

Poslední 3 chyby v logu:
${
  errorLogs.slice(0, 3).map(
    (err, i) => `${i + 1}. [${err.timestamp}] ${err.type}: ${err.message} v ${err.filename}:${err.lineno}`
  ).join("\n") || "Žádné zaznamenané chyby."
}
      `.trim();

      const taskTitle = `[BUG REPORT] ${bugForm.title.trim()}`;
      const taskDesc = `
Oblast: ${bugForm.area}
Závažnost: ${bugForm.severity}

=== POPIS CHYBY ===
${bugForm.description.trim()}

${debugInfo}
      `.trim();

      // Výběr prioritního příznaku pro nově tvořený úkol
      let taskPriority = null;
      if (bugForm.severity === "Vysoká (Kritická)") {
        taskPriority = "high";
      } else if (bugForm.severity === "Střední") {
        taskPriority = "medium";
      } else {
        taskPriority = "low";
      }

      // Vytvoření úkolu v systému
      await addTask({
        title: taskTitle,
        description: taskDesc,
        priority: taskPriority,
        status: "todo",
      });

      toast("Bug report úspěšně odeslán jako úkol!", "success");
      setBugForm({
        title: "",
        area: "Dashboard",
        severity: "Střední",
        description: "",
      });
    } catch (err) {
      toast("Selhalo odeslání hlášení: " + err.message, "error");
    } finally {
      setSubmittingBug(false);
    }
  };

  // --- GLOBÁLNÍ SPRÁVA UŽIVATELŮ ---
  const [globalProfiles, setGlobalProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  useEffect(() => {
    async function loadGlobalProfiles() {
      setLoadingProfiles(true);
      try {
        const [profilesRes, membersRes] = await Promise.all([
          supabase.from("user_profiles").select("*"),
          supabase.from("workspace_members").select("*")
        ]);
        
        if (profilesRes.error) throw profilesRes.error;
        if (membersRes.error) throw membersRes.error;

        const loadedProfiles = profilesRes.data || [];
        const loadedMembers = membersRes.data || [];

        const combined = loadedProfiles.map((p) => {
          let memberRecord = loadedMembers.find(
            (m) => m.user_id === p.id && m.workspace_id === activeWorkspaceId
          );
          if (!memberRecord) {
            memberRecord = loadedMembers.find((m) => m.user_id === p.id);
          }
          return {
            id: p.id,
            displayName: p.display_name || "Bez jména",
            email: p.email,
            role: memberRecord ? memberRecord.role : "member",
          };
        });

        setGlobalProfiles(combined);
      } catch (err) {
        console.error("Global profiles loading error:", err);
        toast("Chyba při načítání uživatelských profilů: " + err.message, "error");
      } finally {
        setLoadingProfiles(false);
      }
    }

    if (activeTab === "users") {
      loadGlobalProfiles();
    }
  }, [activeTab, activeWorkspaceId]);

  // --- SPRÁVA KOŠE ---
  const combinedTrash = useMemo(() => {
    const items = [];
    deletedProjects.forEach((p) => {
      items.push({ id: p.id, type: "project", title: p.name || "Bez názvu", updatedAt: p.updatedAt });
    });
    deletedTasks.forEach((t) => {
      items.push({ id: t.id, type: "task", title: t.title || "Bez názvu", updatedAt: t.updatedAt });
    });
    deletedNotes.forEach((n) => {
      items.push({ id: n.id, type: "note", title: n.title || "Bez názvu", updatedAt: n.updatedAt });
    });
    return items.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [deletedProjects, deletedTasks, deletedNotes]);

  const handleRestore = (item) => {
    try {
      if (item.type === "project") {
        restoreProject(item.id);
      } else if (item.type === "task") {
        restoreTask(item.id);
      } else if (item.type === "note") {
        restoreNote(item.id);
      }
      toast("Položka byla úspěšně obnovena", "success");
    } catch (err) {
      toast("Chyba při obnovení: " + err.message, "error");
    }
  };

  const handleHardDelete = (item) => {
    const confirm = window.confirm(
      `Opravdu chcete tuto položku (${item.title}) smazat natrvalo? Tato akce je zcela nevratná.`
    );
    if (!confirm) return;

    try {
      if (item.type === "project") {
        hardDeleteProject(item.id);
      } else if (item.type === "task") {
        hardDeleteTask(item.id);
      } else if (item.type === "note") {
        hardDeleteNote(item.id);
      }
      toast("Položka byla natrvalo smazána", "success");
    } catch (err) {
      toast("Chyba při mazání: " + err.message, "error");
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto", animation: "fadeIn .25s ease-out" }}>
      {/* Záhlaví */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)" }}>
            Systém & Administrace
          </h1>
          <p style={{ color: "var(--text-3)", fontSize: "14px", marginTop: "4px" }}>
            Technický dashboard, sledování stavu, správa výkonu a logování chyb v reálném čase.
          </p>
        </div>

        {/* Stav sítě */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 12px",
          borderRadius: "var(--r)",
          background: "var(--surface)",
          border: "1px solid var(--border-soft)"
        }}>
          <span style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: isOnline ? "var(--green)" : "var(--red)",
            boxShadow: isOnline ? "0 0 8px var(--green-glow)" : "0 0 8px var(--red-glow)",
            display: "inline-block",
            animation: "pulse 2s infinite"
          }} />
          <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-2)", fontFamily: "var(--mono)" }}>
            {isOnline ? "ONLINE" : "OFFLINE"}
          </span>
        </div>
      </div>

      {/* Navigace v tabech */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", gap: "16px", marginBottom: "28px", overflowX: "auto" }}>
        <button
          onClick={() => setActiveTab("overview")}
          style={{
            padding: "12px 6px",
            color: activeTab === "overview" ? "var(--accent)" : "var(--text-3)",
            borderBottom: activeTab === "overview" ? "2px solid var(--accent)" : "2px solid transparent",
            fontWeight: activeTab === "overview" ? 600 : 500,
            fontSize: "14.5px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            whiteSpace: "nowrap"
          }}
        >
          <Icon name="home" size={16} color="currentColor" />
          Přehled & Statistiky
        </button>
        <button
          onClick={() => setActiveTab("diagnostics")}
          style={{
            padding: "12px 6px",
            color: activeTab === "diagnostics" ? "var(--accent)" : "var(--text-3)",
            borderBottom: activeTab === "diagnostics" ? "2px solid var(--accent)" : "2px solid transparent",
            fontWeight: activeTab === "diagnostics" ? 600 : 500,
            fontSize: "14.5px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            whiteSpace: "nowrap"
          }}
        >
          <Icon name="alert-circle" size={16} color="currentColor" />
          Diagnostika Systému
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          style={{
            padding: "12px 6px",
            color: activeTab === "logs" ? "var(--accent)" : "var(--text-3)",
            borderBottom: activeTab === "logs" ? "2px solid var(--accent)" : "2px solid transparent",
            fontWeight: activeTab === "logs" ? 600 : 500,
            fontSize: "14.5px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            whiteSpace: "nowrap"
          }}
        >
          <Icon name="file-text" size={16} color="currentColor" />
          Log Chyb & Bug Report
          {errorLogs.length > 0 && (
            <span style={{
              background: "var(--red)",
              color: "#fff",
              fontSize: "11px",
              fontWeight: 700,
              borderRadius: "999px",
              padding: "1px 6px",
              marginLeft: "4px"
            }}>
              {errorLogs.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("users")}
          style={{
            padding: "12px 6px",
            color: activeTab === "users" ? "var(--accent)" : "var(--text-3)",
            borderBottom: activeTab === "users" ? "2px solid var(--accent)" : "2px solid transparent",
            fontWeight: activeTab === "users" ? 600 : 500,
            fontSize: "14.5px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            whiteSpace: "nowrap"
          }}
        >
          <Icon name="users" size={16} color="currentColor" />
          Všechny účty
        </button>
        <button
          onClick={() => setActiveTab("trash")}
          style={{
            padding: "12px 6px",
            color: activeTab === "trash" ? "var(--accent)" : "var(--text-3)",
            borderBottom: activeTab === "trash" ? "2px solid var(--accent)" : "2px solid transparent",
            fontWeight: activeTab === "trash" ? 600 : 500,
            fontSize: "14.5px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            whiteSpace: "nowrap"
          }}
        >
          <Icon name="trash" size={16} color="currentColor" />
          Koš
          {combinedTrash.length > 0 && (
            <span style={{
              background: "var(--accent)",
              color: "var(--bg)",
              fontSize: "11px",
              fontWeight: 700,
              borderRadius: "999px",
              padding: "1px 6px",
              marginLeft: "4px"
            }}>
              {combinedTrash.length}
            </span>
          )}
        </button>
      </div>

      {/* OBSAH TABŮ */}
      
      {/* 1. TAB: PŘEHLED & STATISTIKY */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {/* Karty s metrikami */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px"
          }}>
            {/* Projekty */}
            <div style={{
              background: "rgba(20, 24, 34, 0.6)",
              backdropFilter: "blur(12px)",
              border: "1px solid var(--border-soft)",
              borderRadius: "var(--r-lg)",
              padding: "20px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <span style={{ color: "var(--text-3)", fontSize: "13px", fontWeight: 500 }}>Projekty</span>
                <div style={{ padding: "6px", borderRadius: "var(--r)", background: "var(--accent-soft)", color: "var(--accent)" }}>
                  <Icon name="folder" size={18} color="currentColor" />
                </div>
              </div>
              <div style={{ fontSize: "28px", fontWeight: 700, fontFamily: "var(--mono)", color: "var(--text)", lineHeight: 1.1 }}>
                {projects.length}
              </div>
              <div style={{ display: "flex", gap: "10px", fontSize: "12px", color: "var(--text-3)", marginTop: "8px" }}>
                <span>Celkem</span>
                <span>·</span>
                <span style={{ color: "var(--green)" }}>{projects.filter((p) => p.status === "active").length} aktivní</span>
              </div>
            </div>

            {/* Úkoly */}
            <div style={{
              background: "rgba(20, 24, 34, 0.6)",
              backdropFilter: "blur(12px)",
              border: "1px solid var(--border-soft)",
              borderRadius: "var(--r-lg)",
              padding: "20px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <span style={{ color: "var(--text-3)", fontSize: "13px", fontWeight: 500 }}>Úkoly</span>
                <div style={{ padding: "6px", borderRadius: "var(--r)", background: "rgba(59, 130, 246, 0.12)", color: "var(--blue)" }}>
                  <Icon name="check-square" size={18} color="currentColor" />
                </div>
              </div>
              <div style={{ fontSize: "28px", fontWeight: 700, fontFamily: "var(--mono)", color: "var(--text)", lineHeight: 1.1 }}>
                {taskMetrics.total}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 10px", fontSize: "12px", color: "var(--text-3)", marginTop: "8px" }}>
                <span style={{ color: "var(--orange)" }}>{taskMetrics.todo} Todo</span>
                <span>·</span>
                <span style={{ color: "var(--blue)" }}>{taskMetrics.doing} Doing</span>
                <span>·</span>
                <span style={{ color: "var(--green)" }}>{taskMetrics.done} Hotovo</span>
              </div>
            </div>

            {/* Poznámky */}
            <div style={{
              background: "rgba(20, 24, 34, 0.6)",
              backdropFilter: "blur(12px)",
              border: "1px solid var(--border-soft)",
              borderRadius: "var(--r-lg)",
              padding: "20px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <span style={{ color: "var(--text-3)", fontSize: "13px", fontWeight: 500 }}>Poznámky & Tagy</span>
                <div style={{ padding: "6px", borderRadius: "var(--r)", background: "rgba(239, 68, 68, 0.1)", color: "var(--red)" }}>
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
                Měří se skutečná doba od odeslání asynchronního API požadavku do navrácení meta-odpovědi ze Supabase serveru.
              </p>
            </div>

            <div style={{
              marginTop: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "14px",
              borderTop: "1px solid var(--border-soft)"
            }}>
              <span style={{ fontSize: "13px", color: "var(--text-3)" }}>Automatický ping (každých 10 s)</span>
              <button
                onClick={() => setAutoPing(!autoPing)}
                style={{
                  width: "44px",
                  height: "22px",
                  borderRadius: "999px",
                  background: autoPing ? "var(--accent-soft)" : "var(--bg-2)",
                  border: "1px solid var(--border)",
                  position: "relative",
                  padding: 0
                }}
              >
                <span style={{
                  position: "absolute",
                  top: "2px",
                  left: autoPing ? "24px" : "2px",
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  background: autoPing ? "var(--accent)" : "var(--text-3)",
                  transition: "left .15s ease"
                }} />
              </button>
            </div>
          </div>

          {/* Karta: LocalStorage Využití */}
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
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", marginBottom: "16px" }}>
                Obsazení LocalStorage
              </h3>
              
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", margin: "20px 0" }}>
                <span style={{ fontSize: "36px", fontWeight: 700, fontFamily: "var(--mono)", color: "var(--text)" }}>
                  {(localStorageSize / 1024).toFixed(1)}
                </span>
                <span style={{ fontSize: "14px", color: "var(--text-3)", fontWeight: 500 }}>KB / 5120 KB</span>
              </div>

              {/* Progress bar využití */}
              <div style={{ height: "8px", background: "var(--bg-2)", borderRadius: "4px", overflow: "hidden", marginBottom: "12px" }}>
                <div style={{
                  width: `${Math.min(100, (localStorageSize / (5120 * 1024)) * 100)}%`,
                  height: "100%",
                  background: "var(--accent)"
                }} />
              </div>

              <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.4 }}>
                Lokální paměť slouží k rychlému ukládání stavů, chache dat z AI asistentů, nastavení a offline záloh systému Zentero.
              </p>
            </div>

            <div style={{
              marginTop: "20px",
              paddingTop: "14px",
              borderTop: "1px solid var(--border-soft)",
              display: "flex",
              justifyContent: "space-between"
            }}>
              <span style={{ fontSize: "12.5px", color: "var(--text-3)" }}>Aktuální počet klíčů</span>
              <span style={{ fontSize: "12.5px", color: "var(--text-2)", fontFamily: "var(--mono)", fontWeight: 600 }}>
                {typeof window !== "undefined" ? Object.keys(localStorage).length : 0}
              </span>
            </div>
          </div>

          {/* Karta: Informace o PWA & Prohlížeči */}
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
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", marginBottom: "16px" }}>
                PWA & Prostředí prohlížeče
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
                <div>
                  <span style={{ fontSize: "12px", color: "var(--text-3)", display: "block" }}>PWA Offline Service Worker</span>
                  <span style={{ fontSize: "13.5px", color: "var(--text-2)", fontWeight: 600, fontFamily: "var(--mono)" }}>
                    {swStatus}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: "12px", color: "var(--text-3)", display: "block" }}>Platforma</span>
                  <span style={{ fontSize: "13.5px", color: "var(--text-2)", fontWeight: 600 }}>
                    {typeof navigator !== "undefined" ? navigator.platform || "macOS" : "macOS"}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: "12px", color: "var(--text-3)", display: "block" }}>User Agent</span>
                  <span style={{
                    fontSize: "11px",
                    color: "var(--text-3)",
                    display: "block",
                    fontFamily: "var(--mono)",
                    background: "var(--bg-2)",
                    padding: "6px 8px",
                    borderRadius: "var(--r-sm)",
                    marginTop: "4px",
                    maxHeight: "52px",
                    overflowY: "auto",
                    lineHeight: 1.3
                  }}>
                    {typeof navigator !== "undefined" ? navigator.userAgent : "Neznámý"}
                  </span>
                </div>
              </div>
            </div>

            <div style={{
              marginTop: "20px",
              paddingTop: "14px",
              borderTop: "1px solid var(--border-soft)",
              display: "flex",
              gap: "10px"
            }}>
              {/* Tlačítka pro simulaci chyb - užitečné pro testování */}
              <button
                onClick={simulateError}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  background: "var(--red-soft)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  color: "var(--red)",
                  borderRadius: "var(--r)",
                  fontSize: "12px",
                  fontWeight: 500,
                  textAlign: "center"
                }}
              >
                Simulovat chybu
              </button>
              <button
                onClick={simulatePromiseRejection}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  background: "var(--orange-soft)",
                  border: "1px solid rgba(251, 146, 60, 0.2)",
                  color: "var(--orange)",
                  borderRadius: "var(--r)",
                  fontSize: "12px",
                  fontWeight: 500,
                  textAlign: "center"
                }}
              >
                Simulovat Promise pád
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB: LOG CHYB & BUG REPORT */}
      {activeTab === "logs" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* Levá strana: Konzole zachycených chyb */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border-soft)",
            borderRadius: "var(--r-lg)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            minHeight: "450px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)" }}>Konzole zachycených chyb</h3>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleExportLogs}
                  style={{
                    padding: "6px 10px",
                    background: "var(--bg-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r)",
                    fontSize: "11.5px",
                    color: "var(--text-2)",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <Icon name="upload" size={12} color="currentColor" />
                  Exportovat (.json)
                </button>
                <button
                  onClick={handleClearLogs}
                  style={{
                    padding: "6px 10px",
                    background: "var(--red-soft)",
                    border: "1px solid rgba(239, 68, 68, 0.15)",
                    borderRadius: "var(--r)",
                    fontSize: "11.5px",
                    color: "var(--red)",
                    fontWeight: 500
                  }}
                >
                  Vyčistit
                </button>
              </div>
            </div>

            {errorLogs.length === 0 ? (
              <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-3)",
                padding: "40px"
              }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "var(--green-soft)",
                  color: "var(--green)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px"
                }}>
                  <Icon name="check" size={24} color="currentColor" strokeWidth={3} />
                </div>
                <span style={{ fontSize: "14.5px", fontWeight: 600, color: "var(--text-2)" }}>Systém běží hladce</span>
                <span style={{ fontSize: "12.5px", color: "var(--text-3)", textAlign: "center", marginTop: "4px" }}>
                  Nebyly zachyceny žádné nezpracované výjimky ani selhání sítě.
                </span>
              </div>
            ) : (
              <div style={{
                flex: 1,
                overflowY: "auto",
                maxHeight: "500px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                paddingRight: "4px"
              }}>
                {errorLogs.map((log) => {
                  const isExpanded = expandedErrorId === log.id;
                  const isPromise = log.type === "promise_rejection";
                  return (
                    <div
                      key={log.id}
                      onClick={() => setExpandedErrorId(isExpanded ? null : log.id)}
                      style={{
                        background: "var(--bg-2)",
                        border: "1px solid var(--border-soft)",
                        borderRadius: "var(--r)",
                        padding: "10px 12px",
                        cursor: "pointer",
                        transition: "background .15s ease",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-h)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-2)"; }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <span style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: isPromise ? "var(--orange)" : "var(--red)",
                            flexShrink: 0
                          }} />
                          <span style={{
                            fontFamily: "var(--mono)",
                            fontSize: "12.5px",
                            color: "var(--text-2)",
                            fontWeight: 600,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }}>
                            {log.message}
                          </span>
                        </div>
                        <span style={{ fontFamily: "var(--mono)", fontSize: "10.5px", color: "var(--text-3)", flexShrink: 0 }}>
                          {new Date(log.timestamp).toLocaleTimeString("cs-CZ")}
                        </span>
                      </div>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", color: "var(--text-3)", marginTop: "6px", paddingLeft: "14px" }}>
                        <span>Typ: {log.type}</span>
                        <span>Soubor: {log.filename}{log.lineno > 0 ? `:${log.lineno}` : ""}</span>
                      </div>

                      {isExpanded && log.stack && (
                        <pre style={{
                          marginTop: "10px",
                          padding: "10px",
                          background: "var(--bg)",
                          border: "1px solid var(--border-strong)",
                          borderRadius: "var(--r-sm)",
                          color: "var(--red)",
                          fontFamily: "var(--mono)",
                          fontSize: "11px",
                          overflowX: "auto",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-all",
                          lineHeight: 1.4,
                          marginLeft: "14px"
                        }}>
                          {log.stack}
                        </pre>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pravá strana: Formulář hlášení chyb */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border-soft)",
            borderRadius: "var(--r-lg)",
            padding: "24px"
          }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", marginBottom: "6px" }}>
              Nahlásit chybu / bug
            </h3>
            <p style={{ color: "var(--text-3)", fontSize: "13px", marginBottom: "20px" }}>
              Nahlášením založíte úkol v aktuálním workspace, do kterého automaticky přibalíme systémové logy a diagnostiku.
            </p>

            <form onSubmit={handleBugSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: "6px" }}>
                  Název chyby / Stručný souhrn
                </label>
                <input
                  type="text"
                  placeholder="Např. Pády při načítání AI asistentů..."
                  value={bugForm.title}
                  onChange={(e) => setBugForm({ ...bugForm, title: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "var(--r)",
                    background: "var(--bg-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    fontSize: "14px"
                  }}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: "6px" }}>
                    Dotčená oblast
                  </label>
                  <select
                    value={bugForm.area}
                    onChange={(e) => setBugForm({ ...bugForm, area: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "var(--r)",
                      background: "var(--bg-2)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      fontSize: "14px"
                    }}
                  >
                    <option>Dashboard</option>
                    <option>Projekty</option>
                    <option>Úkoly</option>
                    <option>Plán / Kalendář</option>
                    <option>Poznámky</option>
                    <option>Rychlé úkoly</option>
                    <option>AI funkce</option>
                    <option>Jiné</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: "6px" }}>
                    Závažnost
                  </label>
                  <select
                    value={bugForm.severity}
                    onChange={(e) => setBugForm({ ...bugForm, severity: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "var(--r)",
                      background: "var(--bg-2)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      fontSize: "14px"
                    }}
                  >
                    <option>Nízká</option>
                    <option>Střední</option>
                    <option>Vysoká (Kritická)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: "6px" }}>
                  Podrobný popis / Jak chybu vyvolat
                </label>
                <textarea
                  placeholder="Zde popište kroky, které vedou k chybě..."
                  value={bugForm.description}
                  onChange={(e) => setBugForm({ ...bugForm, description: e.target.value })}
                  style={{
                    width: "100%",
                    minHeight: "120px",
                    padding: "10px 12px",
                    borderRadius: "var(--r)",
                    background: "var(--bg-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    fontSize: "14px",
                    lineHeight: 1.5,
                    resize: "vertical"
                  }}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submittingBug}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "var(--accent)",
                  color: "var(--bg)",
                  border: "none",
                  borderRadius: "var(--r)",
                  fontSize: "14px",
                  fontWeight: 700,
                  marginTop: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "opacity .15s ease"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = 0.9; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = 1; }}
              >
                {submittingBug ? "Odesílám..." : "Odeslat Bug Report"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. TAB: VŠECHNY ÚČTY */}
      {activeTab === "users" && (
        <div style={{
          background: "rgba(20, 24, 34, 0.6)",
          backdropFilter: "blur(12px)",
          border: "1px solid var(--border-soft)",
          borderRadius: "var(--r-lg)",
          padding: "24px",
          animation: "fadeIn .2s ease-out"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)" }}>
                Globální adresář účtů
              </h3>
              <p style={{ color: "var(--text-3)", fontSize: "13px", marginTop: "4px" }}>
                Přehled všech registrovaných uživatelských profilů a jejich přiřazených oprávnění v systému Zentero.
              </p>
            </div>
            {loadingProfiles && (
              <span style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-3)", fontSize: "13px" }}>
                <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>
                  <Icon name="refresh-cw" size={13} color="currentColor" />
                </span>
                Aktualizuji...
              </span>
            )}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "12px 16px", color: "var(--text-3)", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Uživatel</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", color: "var(--text-3)", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", color: "var(--text-3)", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Role (Active Workspace)</th>
                </tr>
              </thead>
              <tbody>
                {globalProfiles.length === 0 && !loadingProfiles ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: "center", padding: "40px", color: "var(--text-3)" }}>
                      Žádné účty nenalezeny.
                    </td>
                  </tr>
                ) : (
                  globalProfiles.map((p) => {
                    const roleColors = { owner: "var(--accent)", admin: "var(--blue)", member: "var(--green)", viewer: "var(--text-3)" };
                    return (
                      <tr key={p.id} style={{
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid var(--border-soft)",
                        borderRadius: "var(--r)",
                      }}>
                        {/* Uživatel */}
                        <td style={{ padding: "14px 16px", borderTopLeftRadius: "var(--r)", borderBottomLeftRadius: "var(--r)", borderTop: "1px solid var(--border-soft)", borderBottom: "1px solid var(--border-soft)", borderLeft: "1px solid var(--border-soft)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              background: (roleColors[p.role] || "var(--accent)") + "1a",
                              border: `1px solid ${(roleColors[p.role] || "var(--accent)")}44`,
                              color: roleColors[p.role] || "var(--accent)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: "13px",
                              fontFamily: "var(--mono)"
                            }}>
                              {(p.displayName || p.email || "U").slice(0, 2).toUpperCase()}
                            </div>
                            <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>
                              {p.displayName}
                            </span>
                          </div>
                        </td>
                        {/* Email */}
                        <td style={{ padding: "14px 16px", fontFamily: "var(--mono)", fontSize: "13px", color: "var(--text-2)", borderTop: "1px solid var(--border-soft)", borderBottom: "1px solid var(--border-soft)" }}>
                          {p.email}
                        </td>
                        {/* Role */}
                        <td style={{ padding: "14px 16px", borderTopRightRadius: "var(--r)", borderBottomRightRadius: "var(--r)", borderTop: "1px solid var(--border-soft)", borderBottom: "1px solid var(--border-soft)", borderRight: "1px solid var(--border-soft)" }}>
                          <span style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            color: roleColors[p.role] || "var(--text-3)",
                            background: (roleColors[p.role] || "var(--text-3)") + "12",
                            padding: "4px 10px",
                            borderRadius: "99px",
                            border: `1px solid ${(roleColors[p.role] || "var(--text-3)")}33`,
                            display: "inline-block"
                          }}>
                            {p.role || "member"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. TAB: KOŠ */}
      {activeTab === "trash" && (
        <div style={{
          background: "rgba(20, 24, 34, 0.6)",
          backdropFilter: "blur(12px)",
          border: "1px solid var(--border-soft)",
          borderRadius: "var(--r-lg)",
          padding: "24px",
          animation: "fadeIn .2s ease-out"
        }}>
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)" }}>
              Koš a obnovení dat
            </h3>
            <p style={{ color: "var(--text-3)", fontSize: "13px", marginTop: "4px" }}>
              Smazané úkoly, projekty a poznámky jsou zde bezpečně uchovány po dobu 30 dní, než dojde k jejich trvalému odstranění.
            </p>
          </div>

          {combinedTrash.length === 0 ? (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px 20px",
              color: "var(--text-3)"
            }}>
              <div style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.03)",
                color: "var(--text-4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
                border: "1px solid var(--border-soft)"
              }}>
                <Icon name="trash" size={24} color="currentColor" />
              </div>
              <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-2)" }}>Koš je prázdný</span>
              <span style={{ fontSize: "13px", color: "var(--text-3)", textAlign: "center", marginTop: "4px", maxWidth: "340px" }}>
                Smazáním projektů, úkolů nebo poznámek se zde objeví možnost jejich okamžitého obnovení.
              </span>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "12px 16px", color: "var(--text-3)", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Název a Typ</th>
                    <th style={{ textAlign: "left", padding: "12px 16px", color: "var(--text-3)", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Smazáno dne</th>
                    <th style={{ textAlign: "left", padding: "12px 16px", color: "var(--text-3)", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Zbývá dní</th>
                    <th style={{ textAlign: "right", padding: "12px 16px", color: "var(--text-3)", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {combinedTrash.map((item) => {
                    const daysRemaining = Math.max(1, 30 - Math.floor((Date.now() - item.updatedAt) / 86400000));
                    const isUrgent = daysRemaining <= 7;
                    const typeLabels = { project: "Projekt", task: "Úkol", note: "Poznámka" };
                    const typeIcons = { project: "folder", task: "check-square", note: "file-text" };
                    const typeColors = { project: "var(--accent)", task: "var(--blue)", note: "var(--red)" };

                    return (
                      <tr key={`${item.type}-${item.id}`} style={{
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid var(--border-soft)",
                        borderRadius: "var(--r)",
                      }}>
                        {/* Název a Typ */}
                        <td style={{ padding: "14px 16px", borderTopLeftRadius: "var(--r)", borderBottomLeftRadius: "var(--r)", borderTop: "1px solid var(--border-soft)", borderBottom: "1px solid var(--border-soft)", borderLeft: "1px solid var(--border-soft)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{
                              padding: "6px",
                              borderRadius: "var(--r-sm)",
                              background: typeColors[item.type] + "1a",
                              color: typeColors[item.type],
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}>
                              <Icon name={typeIcons[item.type]} size={16} color="currentColor" />
                            </div>
                            <div>
                              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", display: "block" }}>
                                {item.title}
                              </span>
                              <span style={{ fontSize: "11px", color: "var(--text-3)" }}>
                                {typeLabels[item.type]}
                              </span>
                            </div>
                          </div>
                        </td>
                        {/* Smazáno dne */}
                        <td style={{ padding: "14px 16px", fontSize: "13px", color: "var(--text-2)", borderTop: "1px solid var(--border-soft)", borderBottom: "1px solid var(--border-soft)" }}>
                          {new Date(item.updatedAt).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })}
                        </td>
                        {/* Zbývá dní */}
                        <td style={{ padding: "14px 16px", borderTop: "1px solid var(--border-soft)", borderBottom: "1px solid var(--border-soft)" }}>
                          <span style={{
                            fontSize: "12.5px",
                            fontWeight: 700,
                            color: isUrgent ? "var(--red)" : "var(--green)",
                            fontFamily: "var(--mono)"
                          }}>
                            {daysRemaining} {daysRemaining === 1 ? "den" : daysRemaining < 5 ? "dny" : "dní"}
                          </span>
                        </td>
                        {/* Akce */}
                        <td style={{ padding: "14px 16px", borderTopRightRadius: "var(--r)", borderBottomRightRadius: "var(--r)", borderTop: "1px solid var(--border-soft)", borderBottom: "1px solid var(--border-soft)", borderRight: "1px solid var(--border-soft)" }}>
                          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                            <button
                              onClick={() => handleRestore(item)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "6px 12px",
                                background: "rgba(255, 255, 255, 0.04)",
                                border: "1px solid var(--border-soft)",
                                borderRadius: "var(--r)",
                                color: "var(--text-2)",
                                fontSize: "12.5px",
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "var(--accent-soft)";
                                e.currentTarget.style.color = "var(--accent)";
                                e.currentTarget.style.borderColor = "rgba(var(--accent-rgb), 0.2)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                                e.currentTarget.style.color = "var(--text-2)";
                                e.currentTarget.style.borderColor = "var(--border-soft)";
                              }}
                            >
                              <Icon name="refresh-cw" size={12} color="currentColor" />
                              Obnovit
                            </button>
                            <button
                              onClick={() => handleHardDelete(item)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "6px 12px",
                                background: "var(--red-soft)",
                                border: "1px solid rgba(239, 68, 68, 0.15)",
                                borderRadius: "var(--r)",
                                color: "var(--red)",
                                fontSize: "12.5px",
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "var(--red)";
                                e.currentTarget.style.color = "#fff";
                                e.currentTarget.style.borderColor = "var(--red)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "var(--red-soft)";
                                e.currentTarget.style.color = "var(--red)";
                                e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.15)";
                              }}
                            >
                              <Icon name="trash" size={12} color="currentColor" />
                              Smazat natrvalo
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
