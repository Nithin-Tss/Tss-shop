import { describe, expect, it } from "vitest";
import {
  NOT_CONFIGURED_STATUS,
  SENT_MESSAGE,
  buildSupportPayload,
  needsMailtoFallback,
  sendErrorMessage,
} from "@/lib/supportRequest";

describe("buildSupportPayload", () => {
  it("sends only what the server needs, trimmed", () => {
    expect(
      buildSupportPayload({
        subject: "  Price problem ",
        message: " It does not save. ",
        transcript: "Me: hi",
        page: "/admin/help",
      })
    ).toEqual({
      subject: "Price problem",
      message: "It does not save.",
      transcript: "Me: hi",
      page: "/admin/help",
    });
  });

  it("leaves out an empty transcript and page", () => {
    expect(buildSupportPayload({ subject: "S", message: "M", transcript: "", page: "" })).toEqual({
      subject: "S",
      message: "M",
    });
  });

  it("never carries store or user details (the server reads those from the request)", () => {
    const payload = buildSupportPayload({
      subject: "S",
      message: "M",
      storeName: "X",
      storeId: "Y",
      email: "a@b.c",
      name: "N",
    });
    expect(Object.keys(payload).sort()).toEqual(["message", "subject"]);
  });
});

describe("needsMailtoFallback", () => {
  it("is true only for the server's 503", () => {
    expect(needsMailtoFallback({ ok: false, status: NOT_CONFIGURED_STATUS })).toBe(true);
    expect(NOT_CONFIGURED_STATUS).toBe(503);
  });

  it("is false for success, validation, throttling, send failure and network errors", () => {
    expect(needsMailtoFallback({ ok: true, data: { sent: true } })).toBe(false);
    for (const status of [0, 400, 401, 403, 429, 502]) {
      expect(needsMailtoFallback({ ok: false, status })).toBe(false);
    }
    expect(needsMailtoFallback(undefined)).toBe(false);
  });
});

describe("sendErrorMessage", () => {
  it("shows the server's message", () => {
    expect(
      sendErrorMessage({
        ok: false,
        status: 429,
        formError: "Request was throttled.",
        fieldErrors: {},
      })
    ).toBe("Request was throttled.");
  });

  it("falls back to the first field error, then a generic line", () => {
    expect(
      sendErrorMessage({
        ok: false,
        formError: "",
        fieldErrors: { transcript: "Keep it under 4001 characters." },
      })
    ).toBe("Keep it under 4001 characters.");
    expect(sendErrorMessage({ ok: false, formError: "", fieldErrors: {} })).toBe(
      "Something went wrong. Please try again."
    );
    expect(sendErrorMessage(undefined)).toBe("Something went wrong. Please try again.");
  });
});

describe("SENT_MESSAGE", () => {
  it("is the confirmation shown after a successful send", () => {
    expect(SENT_MESSAGE).toBe("Sent. We will reply to your email.");
  });
});
