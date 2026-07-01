import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptWorkspaceInvite,
  createWorkspace,
  generateWorkspaceInviteLink,
  renameWorkspace,
  updateMemberRole,
} from "./workspaceService.js";

const mocks = vi.hoisted(() => {
  const query = {};
  query.select = vi.fn(() => query);
  query.update = vi.fn(() => query);
  query.insert = vi.fn(() => query);
  query.delete = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.is = vi.fn(() => query);
  query.gt = vi.fn(() => query);
  query.order = vi.fn(() => ({ data: [], error: null }));
  query.limit = vi.fn(() => query);
  return {
    query,
    from: vi.fn(() => query),
    rpc: vi.fn(),
    uuid4: vi.fn(() => "11111111-2222-3333-4444-555555555555"),
  };
});

vi.mock("../supabase.js", () => ({
  supabase: {
    from: mocks.from,
    rpc: mocks.rpc,
  },
}));

vi.mock("../utils.js", () => ({
  uuid4: mocks.uuid4,
}));

describe("workspaceService collaboration writes", () => {
  beforeEach(() => {
    Object.values(mocks.query).forEach((fn) => fn.mockClear());
    mocks.from.mockClear();
    mocks.rpc.mockReset();
    mocks.uuid4.mockClear();
  });

  it("přejmenuje workspace oříznutým názvem", async () => {
    await renameWorkspace("ws-1", "  Tým Zentero  ");

    expect(mocks.from).toHaveBeenCalledWith("workspaces");
    expect(mocks.query.update).toHaveBeenCalledWith({ name: "Tým Zentero" });
    expect(mocks.query.eq).toHaveBeenCalledWith("id", "ws-1");
  });

  it("nepovolí prázdný název workspace", async () => {
    await expect(renameWorkspace("ws-1", "   ")).rejects.toThrow("Název workspace nesmí být prázdný.");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("uloží změnu role člena, ale nepovolí owner ani neznámou roli", async () => {
    await updateMemberRole("ws-1", "user-2", "admin");

    expect(mocks.from).toHaveBeenCalledWith("workspace_members");
    expect(mocks.query.update).toHaveBeenCalledWith({ role: "admin" });
    expect(mocks.query.eq).toHaveBeenCalledWith("workspace_id", "ws-1");
    expect(mocks.query.eq).toHaveBeenCalledWith("user_id", "user-2");

    await expect(updateMemberRole("ws-1", "user-2", "owner")).rejects.toThrow("Neplatná role člena.");
    await expect(updateMemberRole("ws-1", "user-2", "ghost")).rejects.toThrow("Neplatná role člena.");
  });

  it("vytvoří workspace i owner členství jednou servisní funkcí", async () => {
    const workspace = await createWorkspace("  Nový tým  ", "user-1");

    expect(workspace).toMatchObject({
      id: "11111111-2222-3333-4444-555555555555",
      name: "Nový tým",
      role: "owner",
    });
    expect(mocks.from).toHaveBeenNthCalledWith(1, "workspaces");
    expect(mocks.query.insert).toHaveBeenNthCalledWith(1, {
      id: "11111111-2222-3333-4444-555555555555",
      name: "Nový tým",
      created_by: "user-1",
    });
    expect(mocks.from).toHaveBeenNthCalledWith(2, "workspace_members");
    expect(mocks.query.insert).toHaveBeenNthCalledWith(2, {
      workspace_id: "11111111-2222-3333-4444-555555555555",
      user_id: "user-1",
      role: "owner",
    });
  });
});

describe("workspaceService invites", () => {
  beforeEach(() => {
    Object.values(mocks.query).forEach((fn) => fn.mockClear());
    mocks.from.mockClear();
    mocks.rpc.mockReset();
    mocks.uuid4.mockClear();
  });

  it("vytvoří invite přes preferované RPC", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: "server-token", error: null });

    await expect(generateWorkspaceInviteLink({
      workspaceId: "ws-1",
      role: "member",
      currentUserRole: "admin",
      userId: "user-1",
      origin: "https://tasks.example.test",
    })).resolves.toBe("https://tasks.example.test?invite=server-token");

    expect(mocks.rpc).toHaveBeenCalledWith("create_workspace_invite", {
      p_workspace_id: "ws-1",
      p_role: "member",
    });
    expect(mocks.from).not.toHaveBeenCalledWith("workspace_invites");
  });

  it("nepovolí admin invite od admina, jen od ownera", async () => {
    await expect(generateWorkspaceInviteLink({
      workspaceId: "ws-1",
      role: "admin",
      currentUserRole: "admin",
      userId: "user-1",
      origin: "https://tasks.example.test",
    })).rejects.toThrow("Admin pozvánky může vytvářet jen owner workspace.");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("použije plain-token fallback jen pokud RPC chybí", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST202", message: "could not find create_workspace_invite" },
    });

    await expect(generateWorkspaceInviteLink({
      workspaceId: "ws-1",
      role: "viewer",
      currentUserRole: "owner",
      userId: "user-1",
      origin: "https://tasks.example.test",
    })).resolves.toBe("https://tasks.example.test?invite=11111111222233334444555555555555");

    expect(mocks.from).toHaveBeenCalledWith("workspace_invites");
    expect(mocks.query.insert).toHaveBeenCalledWith({
      workspace_id: "ws-1",
      role: "viewer",
      token: "11111111222233334444555555555555",
      invited_by: "user-1",
    });
  });

  it("přijme invite přes RPC a jasně hlásí chybějící RPC", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: "ws-accepted", error: null });
    await expect(acceptWorkspaceInvite("token-1")).resolves.toBe("ws-accepted");

    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "42883", message: "could not find accept_workspace_invite" },
    });
    await expect(acceptWorkspaceInvite("token-2")).rejects.toThrow(
      "Přijímání pozvánek vyžaduje nasazenou RPC funkci accept_workspace_invite."
    );
  });
});
