import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { buildSupportPayload } from "@/lib/supportRequest";
import {
  MAX_ATTACHMENTS,
  MAX_REPLY,
  POLL_MS,
  buildReplyPayload,
  fitFiles,
  isOwnMessage,
  statusLabel,
  usePoll,
  validateReply,
} from "@/lib/supportTickets";
import { TICKETS_PATH, ticketPath } from "@/lib/helpCenter";

describe("validateReply", () => {
  it("accepts a normal message and refuses empty or too long ones", () => {
    expect(validateReply("It still fails.")).toBe("");
    expect(validateReply("   ")).not.toBe("");
    expect(validateReply(undefined)).not.toBe("");
    expect(validateReply("x".repeat(MAX_REPLY))).toBe("");
    expect(validateReply("x".repeat(MAX_REPLY + 1))).not.toBe("");
  });
});

describe("buildReplyPayload", () => {
  it("trims, and leaves out empty attachments and status", () => {
    expect(buildReplyPayload({ message: "  hi  ", attachments: [] })).toEqual({ message: "hi" });
  });

  it("carries attachment ids and a status when given", () => {
    expect(buildReplyPayload({ message: "hi", attachments: ["a", "b"], status: "closed" })).toEqual({
      message: "hi",
      attachments: ["a", "b"],
      status: "closed",
    });
  });
});

describe("buildSupportPayload (ticket options)", () => {
  it("adds the consent flag and attachment ids only when set", () => {
    expect(
      buildSupportPayload({ subject: "S", message: "M", includeStoreDetails: true, attachments: ["a"] })
    ).toEqual({ subject: "S", message: "M", includeStoreDetails: true, attachments: ["a"] });
    expect(buildSupportPayload({ subject: "S", message: "M", includeStoreDetails: false, attachments: [] })).toEqual({
      subject: "S",
      message: "M",
    });
  });
});

describe("fitFiles", () => {
  it("accepts only as many files as there is room for", () => {
    expect(MAX_ATTACHMENTS).toBe(3);
    expect(fitFiles(["a", "b"], 2)).toEqual({ accepted: ["a"], skipped: 1 });
    expect(fitFiles(["a"], 3)).toEqual({ accepted: [], skipped: 1 });
    expect(fitFiles([], 0)).toEqual({ accepted: [], skipped: 0 });
    expect(fitFiles(null, 0)).toEqual({ accepted: [], skipped: 0 });
  });
});

describe("small helpers", () => {
  it("labels statuses and tells whose message it is", () => {
    expect(statusLabel("pending")).toBe("Pending");
    expect(isOwnMessage({ senderType: "owner" })).toBe(true);
    expect(isOwnMessage({ senderType: "staff" })).toBe(false);
  });

  it("builds the ticket paths", () => {
    expect(TICKETS_PATH).toBe("/admin/help/tickets");
    expect(ticketPath("abc")).toBe("/admin/help/tickets/abc");
  });
});

describe("usePoll", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("calls every 5 seconds and stops on unmount", async () => {
    expect(POLL_MS).toBe(5000);
    const callback = vi.fn().mockResolvedValue(undefined);
    const { unmount } = renderHook(() => usePoll(callback));
    expect(callback).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(5000);
    expect(callback).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10000);
    expect(callback).toHaveBeenCalledTimes(3);

    unmount();
    await vi.advanceTimersByTimeAsync(20000);
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it("skips a tick while the previous call is still running", async () => {
    let release;
    const callback = vi.fn(() => new Promise((resolve) => (release = resolve)));
    renderHook(() => usePoll(callback));

    await vi.advanceTimersByTimeAsync(15000);
    expect(callback).toHaveBeenCalledTimes(1);
    release();
    await vi.advanceTimersByTimeAsync(5000);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("does nothing while disabled or while the tab is hidden", async () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    renderHook(() => usePoll(callback, 5000, false));
    await vi.advanceTimersByTimeAsync(10000);
    expect(callback).not.toHaveBeenCalled();

    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    renderHook(() => usePoll(callback));
    await vi.advanceTimersByTimeAsync(10000);
    expect(callback).not.toHaveBeenCalled();
    hidden.mockRestore();
  });
});
