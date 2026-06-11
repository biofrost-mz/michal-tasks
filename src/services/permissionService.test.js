import { describe, expect, it } from "vitest";
import {
  canChangeMemberRole,
  canEditWorkspace,
  canInviteMembers,
  canLeaveWorkspace,
  canRemoveMember,
  canViewSystemAdmin,
  getLeaveWorkspaceBlockReason,
  getWorkspacePermissions,
  normalizeWorkspaceRole,
} from "./permissionService.js";

describe("permissionService", () => {
  it("normalizes unknown workspace roles to viewer", () => {
    expect(normalizeWorkspaceRole("owner")).toBe("owner");
    expect(normalizeWorkspaceRole("admin")).toBe("admin");
    expect(normalizeWorkspaceRole("member")).toBe("member");
    expect(normalizeWorkspaceRole("viewer")).toBe("viewer");
    expect(normalizeWorkspaceRole("unknown")).toBe("viewer");
    expect(normalizeWorkspaceRole(undefined)).toBe("viewer");
  });

  it("allows only system admins to view system admin", () => {
    expect(canViewSystemAdmin({ isSystemAdmin: true })).toBe(true);
    expect(canViewSystemAdmin({ isSystemAdmin: false })).toBe(false);
    expect(canViewSystemAdmin()).toBe(false);
  });

  it("allows workspace owners to edit workspace metadata", () => {
    expect(canEditWorkspace("owner")).toBe(true);
    expect(canEditWorkspace("admin")).toBe(false);
    expect(canEditWorkspace("member")).toBe(false);
    expect(canEditWorkspace("viewer")).toBe(false);
  });

  it("allows owners and admins to invite members", () => {
    expect(canInviteMembers("owner")).toBe(true);
    expect(canInviteMembers("admin")).toBe(true);
    expect(canInviteMembers("member")).toBe(false);
    expect(canInviteMembers("viewer")).toBe(false);
  });

  it("prevents admins from changing owner/admin roles", () => {
    expect(canChangeMemberRole("owner", "admin")).toBe(true);
    expect(canChangeMemberRole("owner", "member")).toBe(true);
    expect(canChangeMemberRole("owner", "owner")).toBe(false);
    expect(canChangeMemberRole("admin", "member")).toBe(true);
    expect(canChangeMemberRole("admin", "viewer")).toBe(true);
    expect(canChangeMemberRole("admin", "admin")).toBe(false);
    expect(canChangeMemberRole("admin", "owner")).toBe(false);
    expect(canChangeMemberRole("member", "viewer")).toBe(false);
  });

  it("prevents removing self, owners, and peer admins by admins", () => {
    expect(canRemoveMember("owner", "admin")).toBe(true);
    expect(canRemoveMember("owner", "owner")).toBe(false);
    expect(canRemoveMember("admin", "member")).toBe(true);
    expect(canRemoveMember("admin", "viewer")).toBe(true);
    expect(canRemoveMember("admin", "admin")).toBe(false);
    expect(canRemoveMember("admin", "owner")).toBe(false);
    expect(canRemoveMember("owner", "member", { isSelf: true })).toBe(false);
  });

  it("blocks owners from leaving workspace and provides a reason", () => {
    expect(canLeaveWorkspace("member", 3)).toBe(true);
    expect(canLeaveWorkspace("admin", 3)).toBe(true);
    expect(canLeaveWorkspace("owner", 3)).toBe(false);
    expect(getLeaveWorkspaceBlockReason("owner", 1)).toBe("Workspace nelze opustit, jsi jediný člen.");
    expect(getLeaveWorkspaceBlockReason("owner", 3)).toBe("Jako owner nemůžeš workspace opustit. Nejprve předej ownership.");
    expect(getLeaveWorkspaceBlockReason("member", 3)).toBe(null);
  });

  it("returns a combined permissions object", () => {
    expect(getWorkspacePermissions({ workspaceRole: "admin", isSystemAdmin: true, memberCount: 4 })).toMatchObject({
      role: "admin",
      isSystemAdmin: true,
      canViewSystemAdmin: true,
      canInviteMembers: true,
      canEditWorkspace: false,
      canLeaveWorkspace: true,
    });
  });
});
