import React, { lazy, Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useApp, AppProvider } from "./context/AppContext.jsx";
import Icon from "./components/Icon.jsx";
import { ToastProvider, useToast } from "./components/Toast.jsx";
import { ConfirmProvider } from "./components/Confirm.jsx";
import ErrorBoundary, { PageErrorBoundary } from "./components/ErrorBoundary.jsx";
import AuthGate from "./components/AuthGate.jsx";
import MobileNav from "./layout/MobileNav.jsx";
import AtlasSidebar from "./layout/atlas/AtlasSidebar.jsx";
import AtlasTopBar from "./layout/atlas/AtlasTopBar.jsx";
import TaskDrawer from "./components/TaskDrawer.jsx";
import CommandPalette from "./components/CommandPalette.jsx";
import ShortcutHelper from "./components/ShortcutHelper.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import TasksPage from "./pages/TasksPage.jsx";
import { applyDocumentMetadata } from "./appMeta.js";
import "./styles/atlas-shell.css";

const NotesPage            = lazy(() => import("./pages/NotesPage.jsx"));
const ProjectsPage         = lazy(() => import("./pages/ProjectsPage.jsx"));
const ProjectDetailPage    = lazy(() => import("./pages/ProjectsPage.jsx").then((m) => ({ default: m.ProjectDetailPage })));
const TimelinePage         = lazy(() => import("./pages/TimelinePage.jsx"));
const TagsPage             = lazy(() => import("./pages/TagsPage.jsx"));
const WorkspaceSettingsPage = lazy(() => import("./pages/WorkspaceSettingsPage.jsx"));
const UserProfilePage      = lazy(() => import("./pages/UserProfilePage.jsx"));
const QuickTodosPage       = lazy(() => import("./pages/QuickTodosPage.jsx"));
const AdminPage            = lazy(() => import("./pages/AdminPage.jsx"));

function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const dn = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", dn);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", dn); };
  }, []);
  if (online) return null;
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 99999,
      background: "var(--orange, #f97316)", color: "#fff",
      padding: "7px 16px", textAlign: "center",
      fontSize: 12.5, fontWeight: 600, letterSpacing: ".02em",
      fontFamily: "var(--font-ui)",
    }}>
      ⚡ Offline — zobrazují se naposledy načtená data
    </div>
  );
}

function AppErrorReporter() {
  const { errorQueue, clearErrors } = useApp();
  const toast = useToast();
  useEffect(() => {
    if (!errorQueue.length) return;
    errorQueue.forEach((msg) => toast(msg, "error"));
    clearErrors();
  }, [errorQueue]);
  return null;
}

function MobileFAB() {
  const { addTask, addQuickTodo, page } = useApp();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const inputRef = React.useRef(null);

  React.useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);

  const handleAdd = () => {
    const val = text.trim();
    if (!val) return;
    if (page === "quick-todos") {
      addQuickTodo(val);
    } else {
      addTask({ title: val });
    }
    setText("");
    setOpen(false);
  };

  return (
    <>
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 189 }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            position: "fixed", bottom: "calc(66px + env(safe-area-inset-bottom, 0px) + 76px)",
            left: 16, right: 16,
            background: "var(--surface)", border: "1px solid var(--border-soft)",
            borderRadius: "var(--r, 14px)", padding: "12px 14px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            display: "flex", gap: 8, zIndex: 191,
          }}>
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              placeholder={page === "quick-todos" ? "Nová položka…" : "Nový úkol…"}
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 10,
                border: "1px solid var(--border-soft)", background: "var(--bg-2)",
                color: "var(--text)", fontSize: 16, outline: "none",
              }}
            />
            <button onClick={handleAdd} disabled={!text.trim()} style={{
              width: 44, borderRadius: 10, border: "none",
              background: text.trim() ? "var(--accent)" : "var(--bg-2)",
              color: text.trim() ? "var(--bg)" : "var(--text-3)",
              fontWeight: 700, fontSize: 18,
            }}>+</button>
          </div>
        </div>
      )}
      <button className={`fab ${open ? "open" : ""}`} onClick={() => setOpen((v) => !v)}>
        <Icon name="plus" size={28} color="currentColor" strokeWidth={2.5} />
      </button>
    </>
  );
}

function PageTransition({ pageKey, children }) {
  return (
    <div key={pageKey} className="page-enter" style={{ height: "100%" }}>
      {children}
    </div>
  );
}

function AppShell() {
  const { dk, setDk, isMobile, page, setPage, taskDetail, setTaskDetail, cmdOpen, setCmdOpen } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const gPressedRef = useRef(false);
  const gTimerRef = useRef(null);

  useEffect(() => {
    applyDocumentMetadata(page);
  }, [page]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      // Skip if user is typing in an input/textarea/select
      const tag = e.target.tagName;
      const editable = e.target.isContentEditable;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || editable) return;

      // ? = open shortcut helper
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
        return;
      }

      // n = new task (focus quick add)
      if (e.key === "n" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (page !== "tasks" && page !== "quick-todos") {
          setPage("tasks");
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("focusQuickAdd"));
          }, 120);
        } else {
          window.dispatchEvent(new CustomEvent("focusQuickAdd"));
        }
        return;
      }

      // t = go to tasks directly
      if (e.key === "t" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setPage("tasks");
        return;
      }

      // g + key = go-to navigation
      if (e.key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        gPressedRef.current = true;
        clearTimeout(gTimerRef.current);
        gTimerRef.current = setTimeout(() => { gPressedRef.current = false; }, 800);
        return;
      }
      if (gPressedRef.current) {
        gPressedRef.current = false;
        clearTimeout(gTimerRef.current);
        switch (e.key) {
          case "h": e.preventDefault(); setPage("dashboard"); break;
          case "t": e.preventDefault(); setPage("tasks"); break;
          case "n": e.preventDefault(); setPage("notes"); break;
          case "p": e.preventDefault(); setPage("timeline"); break;
          default: break;
        }
        return;
      }

      // Escape = close shortcut helper
      if (e.key === "Escape" && shortcutsOpen) {
        e.preventDefault();
        setShortcutsOpen(false);
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcutsOpen, setPage, page]);

  return (
    <>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box}
        html,body,#root{width:100%;height:100%}
        html{overscroll-behavior-x:none;overflow-x:hidden}
        body{overflow-x:hidden}
        input,textarea,select{-webkit-appearance:none;border-radius:0}
        @media(max-width:767px){input,textarea,select{font-size:16px !important}}
        button{cursor:pointer}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideRight{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
        @keyframes toastIn{from{opacity:0;transform:translateY(12px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes pop{0%{transform:scale(.9);opacity:0}100%{transform:scale(1);opacity:1}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes logoIn{0%{opacity:0;transform:scale(0.7) translateY(12px)}100%{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes textIn{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes pageIn{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:translateY(0)}}
        .fi{animation:fadeIn .2s ease-out}
        .sr{animation:slideRight .2s ease-out}
        .su{animation:slideUp .28s cubic-bezier(.32,1,.4,1)}
        .pop{animation:pop .2s ease-out}
        .page-enter{animation:pageIn .18s cubic-bezier(.4,0,.2,1)}
        .mobile-nav-bar{padding-bottom:env(safe-area-inset-bottom,0px)}
      `}</style>

      <OfflineBanner />
      <AppErrorReporter />
      <div className={!isMobile ? `app ${collapsed ? "collapsed" : ""}` : undefined} style={isMobile ? { display: "flex", width: "100%", height: "100vh", overflow: "hidden" } : undefined}>
        {!isMobile && <AtlasSidebar collapsed={collapsed} setCollapsed={setCollapsed} />}
        <div className={!isMobile ? "main" : undefined} style={isMobile ? { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" } : undefined}>
          {!isMobile && <AtlasTopBar />}
          {isMobile && (() => {
            const now = new Date();
            const days = ["Ne","Po","Út","St","Čt","Pá","So"];
            const months = ["ledna","února","března","dubna","května","června","července","srpna","září","října","listopadu","prosince"];
            const dayLabel = `${days[now.getDay()]} ${now.getDate()}. ${months[now.getMonth()]}`;
            return (
              <div className="mob-topbar" onClick={() => { setPage("dashboard"); document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" }); }}>
                <span className="mob-topbar-brand">Zen<span>tero</span></span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-ui)", fontWeight: 500 }}>{dayLabel}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCmdOpen(true); }}
                    style={{ background: "none", border: "none", padding: "4px", display: "flex", alignItems: "center", color: "var(--text-3)", cursor: "pointer" }}
                  >
                    <Icon name="search" size={17} color="var(--text-3)" strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            );
          })()}
          <main style={isMobile ? { flex: 1, minWidth: 0, width: "100%", overflow: "auto", position: "relative", paddingBottom: 66, WebkitOverflowScrolling: "touch" } : undefined}>
            <PageTransition pageKey={page}>
              <Suspense fallback={null}>
                {page === "dashboard"          && <PageErrorBoundary label="Přehled">         <DashboardPage />         </PageErrorBoundary>}
                {page === "projects"           && <PageErrorBoundary label="Projekty">        <ProjectsPage />          </PageErrorBoundary>}
                {page === "project-detail"     && <PageErrorBoundary label="Detail projektu"> <ProjectDetailPage />     </PageErrorBoundary>}
                {page === "tasks"              && <PageErrorBoundary label="Úkoly">           <TasksPage />             </PageErrorBoundary>}
                {page === "timeline"           && <PageErrorBoundary label="Plán">            <TimelinePage />          </PageErrorBoundary>}
                {page === "tags"               && <PageErrorBoundary label="Tagy">            <TagsPage />              </PageErrorBoundary>}
                {page === "notes"              && <PageErrorBoundary label="Poznámky">        <NotesPage />             </PageErrorBoundary>}
                {page === "workspace-settings" && <PageErrorBoundary label="Nastavení">       <WorkspaceSettingsPage /> </PageErrorBoundary>}
                {page === "user-profile"       && <PageErrorBoundary label="Profil">          <UserProfilePage />       </PageErrorBoundary>}
                {page === "quick-todos"        && <PageErrorBoundary label="Rychlý seznam">   <QuickTodosPage />        </PageErrorBoundary>}
                {page === "admin"              && <PageErrorBoundary label="Administrace">    <AdminPage />             </PageErrorBoundary>}
              </Suspense>
            </PageTransition>
          </main>

          {/* TaskDrawer — vlastní boundary, chyba v draweru nerozhodí celou stránku */}
          {taskDetail && (
            <ErrorBoundary inline label="Task drawer">
              <TaskDrawer />
            </ErrorBoundary>
          )}

          {cmdOpen && (
            <ErrorBoundary inline label="Command palette">
              <CommandPalette onClose={() => setCmdOpen(false)} />
            </ErrorBoundary>
          )}

          {shortcutsOpen && (
            <ErrorBoundary inline label="Shortcut helper">
              <ShortcutHelper onClose={() => setShortcutsOpen(false)} />
            </ErrorBoundary>
          )}

          {/* Floating help trigger for keyboard shortcuts */}
          {!isMobile && (
            <button
              onClick={() => setShortcutsOpen(true)}
              style={{
                position: "fixed",
                bottom: "24px",
                right: "24px",
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                background: "var(--surface)",
                border: "1px solid var(--border-soft)",
                boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-2)",
                cursor: "pointer",
                zIndex: 9999,
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
              className="shortcut-trigger"
              title="Klávesové zkratky (?)"
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.1) translateY(-2px)";
                e.currentTarget.style.color = "var(--accent)";
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1) translateY(0)";
                e.currentTarget.style.color = "var(--text-2)";
                e.currentTarget.style.borderColor = "var(--border-soft)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.18)";
              }}
            >
              <span style={{ fontSize: "16px", fontWeight: "700", fontFamily: "var(--font-ui)" }}>?</span>
            </button>
          )}
        </div>
        {isMobile && <MobileFAB />}
        {isMobile && <MobileNav toggleDk={() => setDk(!dk)} />}
      </div>
    </>
  );
}

export default function MichalTasks() {
  return (
    // Vnější boundary zachytí chyby v AppProvider, AuthGate, atd.
    <ErrorBoundary label="Aplikace">
      <ToastProvider>
        <AppProvider>
          <ConfirmProvider>
            <AuthGate>
              {/* Vnitřní boundary zachytí chyby v samotném shellu */}
              <ErrorBoundary>
                <AppShell />
              </ErrorBoundary>
            </AuthGate>
          </ConfirmProvider>
        </AppProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
