import { APP_LANGUAGE } from "./locale.js";

export const APP_NAME = "Michal Tasks";
export const APP_VERSION = "1.0.0";
export const APP_RELEASE_DATE = "2026-03-11";

export const PAGE_TITLES = {
  dashboard: "Přehled",
  tasks: "Úkoly",
  projects: "Projekty",
  "project-detail": "Projekt",
  timeline: "Plán",
  tags: "Tagy",
  notes: "Poznámky",
  "workspace-settings": "Nastavení workspace",
  "user-profile": "Profil",
};

export function getDocumentTitle(page) {
  const pageTitle = PAGE_TITLES[page];
  return pageTitle ? `${pageTitle} | ${APP_NAME}` : APP_NAME;
}

export function applyDocumentMetadata(page, doc = globalThis.document) {
  if (!doc) return;
  doc.documentElement.lang = APP_LANGUAGE;
  doc.title = getDocumentTitle(page);
}
