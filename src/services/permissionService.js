const SYSTEM_ADMIN_TABS = new Set([
  "overview",
  "health",
  "diagnostics",
  "ai",
  "logs",
  "users",
  "trash",
]);

const WORKSPACE_ROLES = new Set(["owner", "admin", "member", "viewer"]);
const ROLE_RANK = {
  viewer: 1,
  member: 2,
  admin: 3,
  owner: 4,
};

export function normalizeWorkspaceRole(role) {
  return WORKSPACE_ROLES.has(role) ? role : "viewer";
}

export function isWorkspaceOwner(role) {
  return normalizeWorkspaceRole(role) === "owner";
}

export function isWorkspaceAdmin(role) {
  const normalized = normalizeWorkspaceRole(role);
  return normalized === "owner" || normalized === "admin";
}

export function canViewSystemAdmin({ isSystemAdmin } = {}) {
  return Boolean(isSystemAdmin);
}

export function canViewAdminTab(tabId, { isSystemAdmin } = {}) {
  return canViewSystemAdmin({ isSystemAdmin }) && SYSTEM_ADMIN_TABS.has(tabId);
}

export function canViewAdminDiagnostics({ isSystemAdmin } = {}) {
  return canViewSystemAdmin({ isSystemAdmin });
}

export function canViewProductionLogs({ isSystemAdmin } = {}) {
  return canViewSystemAdmin({ isSystemAdmin });
}

export function canRunAiDiagnostics({ isSystemAdmin } = {}) {
  return canViewSystemAdmin({ isSystemAdmin });
}

export function canExportDiagnostics({ isSystemAdmin } = {}) {
  return canViewSystemAdmin({ isSystemAdmin });
}

export function canViewTeamMembers(role) {
  return Boolean(role);
}

export function canManageWorkspace(role) {
  return isWorkspaceAdmin(role);
}

export function canEditWorkspace(role) {
  return isWorkspaceOwner(role);
}

export function canInviteMembers(role) {
  return isWorkspaceAdmin(role);
}

export function canChangeMemberRole(currentUserRole, targetRole) {
  const current = normalizeWorkspaceRole(currentUserRole);
  const target = normalizeWorkspaceRole(targetRole);

  if (current !== "owner" && current !== "admin") return false;
  if (target === "owner") return false;
  if (current === "admin" && ROLE_RANK[target] >= ROLE_RANK.admin) return false;
  return true;
}

export function canRemoveMember(currentUserRole, targetRole, { isSelf = false } = {}) {
  const current = normalizeWorkspaceRole(currentUserRole);
  const target = normalizeWorkspaceRole(targetRole);

  if (isSelf) return false;
  if (current !== "owner" && current !== "admin") return false;
  if (target === "owner") return false;
  if (current === "admin" && ROLE_RANK[target] >= ROLE_RANK.admin) return false;
  return true;
}

export function canLeaveWorkspace(role, memberCount = 0) {
  const normalized = normalizeWorkspaceRole(role);
  if (normalized !== "owner") return true;
  return false;
}

export function getLeaveWorkspaceBlockReason(role, memberCount = 0) {
  const normalized = normalizeWorkspaceRole(role);
  if (normalized !== "owner") return null;
  if (memberCount <= 1) return "Workspace nelze opustit, jsi jediný člen.";
  return "Jako owner nemůžeš workspace opustit. Nejprve předej ownership.";
}

export function canManageTrash({ isSystemAdmin, workspaceRole } = {}) {
  return canViewSystemAdmin({ isSystemAdmin }) || isWorkspaceAdmin(workspaceRole);
}

export function canCreateBugReport(role) {
  return Boolean(role);
}

export function getWorkspacePermissions({ workspaceRole, isSystemAdmin = false, memberCount = 0 } = {}) {
  const role = normalizeWorkspaceRole(workspaceRole);
  return {
    role,
    isSystemAdmin: Boolean(isSystemAdmin),
    canViewSystemAdmin: canViewSystemAdmin({ isSystemAdmin }),
    canViewAdminDiagnostics: canViewAdminDiagnostics({ isSystemAdmin }),
    canViewProductionLogs: canViewProductionLogs({ isSystemAdmin }),
    canRunAiDiagnostics: canRunAiDiagnostics({ isSystemAdmin }),
    canExportDiagnostics: canExportDiagnostics({ isSystemAdmin }),
    canViewTeamMembers: canViewTeamMembers(role),
    canManageWorkspace: canManageWorkspace(role),
    canEditWorkspace: canEditWorkspace(role),
    canInviteMembers: canInviteMembers(role),
    canLeaveWorkspace: canLeaveWorkspace(role, memberCount),
    canManageTrash: canManageTrash({ isSystemAdmin, workspaceRole: role }),
    leaveWorkspaceBlockReason: getLeaveWorkspaceBlockReason(role, memberCount),
  };
}
