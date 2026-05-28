import React, { useEffect, useState } from "react";
import { useApp, AppProvider } from "./context/AppContext.jsx";
import { ToastProvider, useToast } from "./components/Toast.jsx";
import { ConfirmProvider } from "./components/Confirm.jsx";
import ErrorBoundary, { PageErrorBoundary } from "./components/ErrorBoundary.jsx";
import AuthGate from "./components/AuthGate.jsx";
import MobileNav from "./layout/MobileNav.jsx";
import AtlasSidebar from "./layout/atlas/AtlasSidebar.jsx";
import AtlasTopBar from "./layout/atlas/AtlasTopBar.jsx";
import TaskDrawer from "./components/TaskDrawer.jsx";
import CommandPalette from "./components/CommandPalette.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import TasksPage from "./pages/TasksPage.jsx";
import NotesPage from "./pages/NotesPage.jsx";
import ProjectsPage, { ProjectDetailPage } from "./pages/ProjectsPage.jsx";
import TimelinePage from "./pages/TimelinePage.jsx";
import TagsPage from "./pages/TagsPage.jsx";
import WorkspaceSettingsPage from "./pages/WorkspaceSettingsPage.jsx";
import UserProfilePage from "./pages/UserProfilePage.jsx";
import QuickTodosPage from "./pages/QuickTodosPage.jsx";
import { applyDocumentMetadata } from "./appMeta.js";
import "./styles/atlas-shell.css";

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

function AppShell() {
  const { dk, setDk, isMobile, page, taskDetail, cmdOpen, setCmdOpen } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    applyDocumentMetadata(page);
  }, [page]);

  return (
    <>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box}
        html,body,#root{width:100%;height:100%}
        html{overscroll-behavior:none;overflow-x:hidden}
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
        .fi{animation:fadeIn .2s ease-out}
        .sr{animation:slideRight .2s ease-out}
        .su{animation:slideUp .28s cubic-bezier(.32,1,.4,1)}
        .pop{animation:pop .2s ease-out}
        .mobile-nav-bar{padding-bottom:env(safe-area-inset-bottom,0px)}
      `}</style>

      <AppErrorReporter />
      <div className={!isMobile ? `app ${collapsed ? "collapsed" : ""}` : undefined} style={isMobile ? { display: "flex", width: "100%", height: "100vh", overflow: "hidden" } : undefined}>
        {!isMobile && <AtlasSidebar collapsed={collapsed} setCollapsed={setCollapsed} />}
        <div className={!isMobile ? "main" : undefined} style={isMobile ? { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" } : undefined}>
          {!isMobile && <AtlasTopBar />}
          <main style={isMobile ? { flex: 1, minWidth: 0, width: "100%", overflow: "auto", position: "relative", paddingBottom: 66 } : undefined}>
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
        </div>
        {isMobile && <MobileNav toggleDk={() => setDk(!dk)} />}
      </div>
    </>
  );
}

export default function MichalTasks() {
  return (
    // Vnější boundary zachytí chyby v AppProvider, AuthGate, atd.
    <ErrorBoundary label="Aplikace">
      <AppProvider>
        <ToastProvider>
          <ConfirmProvider>
            <AuthGate>
              {/* Vnitřní boundary zachytí chyby v samotném shellu */}
              <ErrorBoundary>
                <AppShell />
              </ErrorBoundary>
            </AuthGate>
          </ConfirmProvider>
        </ToastProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}
