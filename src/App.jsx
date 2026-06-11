import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
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
import { applyDocumentMetadata } from "./appMeta.js";
import "./styles/atlas-shell.css";

const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const TasksPage = lazy(() => import("./pages/TasksPage.jsx"));
const NotesPage = lazy(() => import("./pages/NotesPage.jsx"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage.jsx"));
const ProjectDetailPage = lazy(() => import("./pages/ProjectsPage.jsx").then((m) => ({ default: m.ProjectDetailPage })));
const TimelinePage = lazy(() => import("./pages/TimelinePage.jsx"));
const TagsPage = lazy(() => import("./pages/TagsPage.jsx"));
const WorkspaceSettingsPage = lazy(() => import("./pages/WorkspaceSettingsPage.jsx"));
const QuickTodosPage = lazy(() => import("./pages/QuickTodosPage.jsx"));
const AdminPage = lazy(() => import("./pages/AdminPage.jsx"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage.jsx"));
const OnboardingWizard = lazy(() => import("./components/OnboardingWizard.jsx"));

function OfflineBanner() {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  if (online) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        background: "var(--orange, #f97316)",
        color: "#fff",
        padding: "7px 16px",
        textAlign: "center",
        fontSize: 12.5,
        fontWeight: 600,
        letterSpacing: ".02em",
        fontFamily: "var(--font-ui)",
      }}
    >
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
  }, [errorQueue, toast, clearErrors]);

  return null;
}

function AppUpdatePrompt() {
  const toast = useToast();
  const [updateSW, setUpdateSW] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const handleUpdateReady = (event) => {
      if (event.detail?.updateSW) setUpdateSW(() => event.detail.updateSW);
    };
    const handleOfflineReady = () => toast("Aplikace je připravená offline.", "success");

    window.addEventListener("app:update-ready", handleUpdateReady);
    window.addEventListener("app:offline-ready", handleOfflineReady);
    return () => {
      window.removeEventListener("app:update-ready", handleUpdateReady);
      window.removeEventListener("app:offline-ready", handleOfflineReady);
    };
  }, [toast]);

  if (!updateSW) return null;

  const applyUpdate = async () => {
    if (updating) return;
    setUpdating(true);
    let fallbackTimer = null;
    try {
      fallbackTimer = window.setTimeout(() => {
        window.location.reload();
      }, 2500);
      navigator.serviceWorker?.addEventListener("controllerchange", () => {
        window.location.reload();
      }, { once: true });
      await updateSW(true);
      setTimeout(() => window.location.reload(), 3000);
      window.clearTimeout(fallbackTimer);
      window.setTimeout(() => window.location.reload(), 250);
    } catch (error) {
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      console.warn("SW update failed:", error);
      toast("Aktualizace se nepodařila spustit, načítám stránku znovu.", "error");
      window.setTimeout(() => window.location.reload(), 700);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: "calc(84px + env(safe-area-inset-bottom, 0px))",
        transform: "translateX(-50%)",
        zIndex: 99998,
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "min(440px, calc(100vw - 28px))",
        padding: "10px 12px",
        borderRadius: 14,
        border: "1px solid var(--border-soft)",
        background: "color-mix(in srgb, var(--surface) 94%, transparent)",
        boxShadow: "0 18px 48px rgba(0,0,0,.28)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        fontFamily: "var(--font-ui)",
      }}
    >
      <div style={{ width: 30, height: 30, borderRadius: 10, display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent)", flex: "0 0 auto" }}>
        <Icon name="refresh-cw" size={15} color="currentColor" strokeWidth={2.3} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ color: "var(--text)", fontWeight: 850, fontSize: 13 }}>Je dostupná nová verze</div>
        <div style={{ color: "var(--text-3)", fontSize: 11.5, marginTop: 2 }}>Aplikace se za chvíli načte v nové verzi.</div>
      </div>
      <button
        type="button"
        onClick={applyUpdate}
        disabled={updating}
        style={{ height: 32, borderRadius: 10, border: 0, background: "var(--accent)", color: "var(--bg)", padding: "0 12px", fontWeight: 900, fontSize: 12, flex: "0 0 auto", opacity: updating ? 0.72 : 1, cursor: updating ? "wait" : "pointer" }}
      >
        {updating ? "Aktualizuji..." : "Aktualizovat"}
      </button>
    </div>
  );
}

function MobileFAB() {
  const { page, setPage } = useApp();

  const openTaskModal = () => {
    const dispatchOpen = () => window.dispatchEvent(new CustomEvent("openQuickAddModal"));
    if (page === "dashboard" || page === "tasks") {
      dispatchOpen();
      return;
    }
    setPage("dashboard");
    window.setTimeout(dispatchOpen, 180);
  };

  return (
    <button className="fab" onClick={openTaskModal} aria-label="Nový úkol">
      <Icon name="plus" size={28} color="currentColor" strokeWidth={2.5} />
    </button>
  );
}

function PageTransition({ pageKey, children }) {
  return (
    <div key={pageKey} className="page-enter" style={{ height: "100%" }}>
      {children}
    </div>
  );
}

function PageLoader() {
  return (
    <div style={{ height: "100%", display: "grid", placeItems: "center", color: "var(--text-3)", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700 }}>
      Načítám...
    </div>
  );
}

function AppShell() {
  const { dk, setDk, isMobile, page, setPage, taskDetail, cmdOpen, setCmdOpen, isSystemAdmin, loaded, tasks, setTaskDetail } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(
    () => Boolean(localStorage.getItem("mt3:onboarding_done"))
  );

  useEffect(() => {
    const handler = () => setOnboardingDone(true);
    window.addEventListener("mt3:onboarding_done", handler);
    return () => window.removeEventListener("mt3:onboarding_done", handler);
  }, []);
  const gPressedRef = useRef(false);
  const gTimerRef = useRef(null);
  const hideMobileFab = page === "workspace-settings" || page === "user-profile" || page === "admin";

  useEffect(() => {
    const handler = () => setShortcutsOpen(true);
    window.addEventListener("openShortcuts", handler);
    return () => window.removeEventListener("openShortcuts", handler);
  }, []);

  useEffect(() => {
    applyDocumentMetadata(page);
  }, [page]);

  useEffect(() => {
    if (!loaded) return;
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get("task");
    if (!taskId) return;
    if (tasks.some((t) => t.id === taskId)) setTaskDetail(taskId);
    params.delete("task");
    const q = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (q ? `?${q}` : ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  useEffect(() => {
    if ((page === "admin" || page === "admin-users") && !isSystemAdmin) {
      setPage("dashboard");
    }
  }, [page, isSystemAdmin, setPage]);

  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName;
      const editable = e.target.isContentEditable;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || editable) return;

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
        return;
      }

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

      if (e.key === "t" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setPage("tasks");
        return;
      }

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

      if (e.key === "Escape" && shortcutsOpen) {
        e.preventDefault();
        setShortcutsOpen(false);
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
      <AppUpdatePrompt />
      {loaded && !onboardingDone && (
        <Suspense fallback={null}>
          <OnboardingWizard />
        </Suspense>
      )}
      <button
        className="shortcuts-fab"
        onClick={() => window.dispatchEvent(new CustomEvent("openShortcuts"))}
        title="Klávesové zkratky"
        aria-label="Klávesové zkratky"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M8 13h.01M12 13h.01M16 13h.01M6 17h4M14 17h4" />
        </svg>
      </button>

      <div className={!isMobile ? `app ${collapsed ? "collapsed" : ""}` : undefined} style={isMobile ? { display: "flex", width: "100%", height: "100dvh", minHeight: "100svh", overflow: "hidden" } : undefined}>
        {!isMobile && <AtlasSidebar collapsed={collapsed} setCollapsed={setCollapsed} />}
        <div className={!isMobile ? "main" : undefined} style={isMobile ? { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" } : undefined}>
          {!isMobile && <AtlasTopBar />}
          {isMobile && (() => {
            const now = new Date();
            const days = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
            const months = ["ledna", "února", "března", "dubna", "května", "června", "července", "srpna", "září", "října", "listopadu", "prosince"];
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
          <main style={isMobile ? { flex: 1, minWidth: 0, width: "100%", overflowY: "auto", overflowX: "hidden", position: "relative", paddingBottom: "calc(58px + env(safe-area-inset-bottom, 0px))", overscrollBehaviorY: "contain" } : undefined}>
            <PageTransition pageKey={page}>
              <Suspense fallback={<PageLoader />}>
                {page === "dashboard" && <PageErrorBoundary label="Přehled"><DashboardPage /></PageErrorBoundary>}
                {page === "projects" && <PageErrorBoundary label="Projekty"><ProjectsPage /></PageErrorBoundary>}
                {page === "project-detail" && <PageErrorBoundary label="Detail projektu"><ProjectDetailPage /></PageErrorBoundary>}
                {page === "tasks" && <PageErrorBoundary label="Úkoly"><TasksPage /></PageErrorBoundary>}
                {page === "timeline" && <PageErrorBoundary label="Plán"><TimelinePage /></PageErrorBoundary>}
                {page === "tags" && <PageErrorBoundary label="Tagy"><TagsPage /></PageErrorBoundary>}
                {page === "notes" && <PageErrorBoundary label="Poznámky"><NotesPage /></PageErrorBoundary>}
                {page === "workspace-settings" && <PageErrorBoundary label="Nastavení"><WorkspaceSettingsPage initialTab="workspace" /></PageErrorBoundary>}
                {page === "user-profile" && <PageErrorBoundary label="Nastavení"><WorkspaceSettingsPage initialTab="account" /></PageErrorBoundary>}
                {page === "quick-todos" && <PageErrorBoundary label="Rychlý seznam"><QuickTodosPage /></PageErrorBoundary>}
                {page === "admin" && isSystemAdmin && <PageErrorBoundary label="Administrace"><AdminPage /></PageErrorBoundary>}
                {page === "admin-users" && isSystemAdmin && <PageErrorBoundary label="Uživatelé"><AdminUsersPage /></PageErrorBoundary>}
              </Suspense>
            </PageTransition>
          </main>

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
        </div>
        {isMobile && !hideMobileFab && <MobileFAB />}
        {isMobile && <MobileNav toggleDk={() => setDk(!dk)} />}
      </div>
    </>
  );
}

export default function MichalTasks() {
  return (
    <ErrorBoundary label="Aplikace">
      <ToastProvider>
        <AppProvider>
          <ConfirmProvider>
            <AuthGate>
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
