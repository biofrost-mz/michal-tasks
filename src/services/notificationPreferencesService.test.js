import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  DEFAULT_NOTIFICATION_PREFS,
  fetchNotificationPreferences,
  saveNotificationPreferences,
  toNotificationPreferencesPayload,
} from "./notificationPreferencesService.js";

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockUpsert = vi.fn();

vi.mock("../supabase.js", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      upsert: mockUpsert,
    })),
  },
}));

describe("toNotificationPreferencesPayload", () => {
  it("propouští jen známé preference a ořízne digest_hour", () => {
    const payload = toNotificationPreferencesPayload("user-1", {
      email_task_reminders: false,
      email_daily_digest: true,
      push_task_reminders: false,
      push_daily_digest: true,
      digest_hour: 99,
      workspaceId: "ws-1",
      theme: "dark",
    });

    expect(payload).toMatchObject({
      user_id: "user-1",
      email_task_reminders: false,
      email_daily_digest: true,
      push_task_reminders: false,
      push_daily_digest: true,
      digest_hour: 23,
    });
    expect(payload).toHaveProperty("updated_at");
    expect(payload).not.toHaveProperty("workspaceId");
    expect(payload).not.toHaveProperty("theme");
  });
});

describe("fetchNotificationPreferences", () => {
  beforeEach(() => {
    mockSelect.mockReset();
    mockEq.mockReset();
    mockSingle.mockReset();
  });

  it("vrátí defaulty doplněné DB hodnotami", async () => {
    mockSelect.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValueOnce({ single: mockSingle });
    mockSingle.mockResolvedValueOnce({
      data: { email_daily_digest: false, digest_hour: 7 },
      error: null,
    });

    await expect(fetchNotificationPreferences("user-1")).resolves.toEqual({
      ...DEFAULT_NOTIFICATION_PREFS,
      email_daily_digest: false,
      digest_hour: 7,
    });
  });
});

describe("saveNotificationPreferences", () => {
  beforeEach(() => {
    mockUpsert.mockReset();
  });

  it("ukládá jen očištěný payload s user konfliktem", async () => {
    mockUpsert.mockResolvedValueOnce({ error: null });

    await saveNotificationPreferences("user-1", { digest_hour: -5, unknown: true });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", digest_hour: 0 }),
      { onConflict: "user_id" }
    );
  });
});
