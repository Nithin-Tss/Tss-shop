import { describe, expect, it } from "vitest";
import {
  EARLIER_LEFT_OUT,
  MAX_MAILTO_LENGTH,
  MAX_MESSAGE,
  MAX_SUBJECT,
  MAX_TRANSCRIPT_CHARS,
  buildMailto,
  buildShortBody,
  buildSupportBody,
  buildTranscript,
  hasChat,
  validateSupport,
} from "@/lib/supportRequest";

const details = {
  storeName: "Test Store",
  storeId: "st_123",
  name: "Asha Rao",
  email: "asha@example.com",
  page: "/admin/help/add-product",
};

describe("validateSupport", () => {
  it("accepts a subject and a description", () => {
    expect(validateSupport({ subject: "Price problem", message: "The price does not save." })).toEqual({});
  });

  it("requires both fields", () => {
    const errors = validateSupport({ subject: "  ", message: "" });
    expect(errors.subject).toBeTruthy();
    expect(errors.message).toBeTruthy();
  });

  it("rejects a short description", () => {
    expect(validateSupport({ subject: "Hi", message: "too short" }).message).toBeTruthy();
  });

  it("enforces the length caps", () => {
    expect(validateSupport({ subject: "a".repeat(MAX_SUBJECT), message: "x".repeat(20) }).subject).toBeUndefined();
    expect(validateSupport({ subject: "a".repeat(MAX_SUBJECT + 1), message: "x".repeat(20) }).subject).toBeTruthy();
    expect(validateSupport({ subject: "ok", message: "x".repeat(MAX_MESSAGE) }).message).toBeUndefined();
    expect(validateSupport({ subject: "ok", message: "x".repeat(MAX_MESSAGE + 1) }).message).toBeTruthy();
  });
});

describe("transcript", () => {
  const chat = [
    { role: "user", text: "How many orders today?" },
    { role: "assistant", text: "You had 4 orders.", tools: ["orders"], actions: [{ label: "Open" }] },
    { role: "error", text: "Something went wrong." },
    { role: "note", text: "Stopped." },
    { role: "user", text: "   " },
  ];

  it("keeps only what the member and the assistant said, as text", () => {
    expect(buildTranscript(chat)).toBe("Me: How many orders today?\nAssistant: You had 4 orders.");
  });

  it("is empty when there is no chat", () => {
    expect(buildTranscript([])).toBe("");
    expect(buildTranscript(undefined)).toBe("");
    expect(hasChat([])).toBe(false);
    expect(hasChat([{ role: "assistant", text: "hi" }])).toBe(false);
    expect(hasChat(chat)).toBe(true);
  });

  it("caps each message", () => {
    const text = buildTranscript([{ role: "user", text: "a".repeat(5000) }], 10000);
    expect(text.length).toBeLessThan(600);
    expect(text.endsWith("…")).toBe(true);
  });

  it("caps the total, keeps the newest turns and says that earlier ones are left out", () => {
    const long = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 ? "assistant" : "user",
      text: `message number ${i} ${"x".repeat(150)}`,
    }));
    const text = buildTranscript(long);
    expect(text.length).toBeLessThanOrEqual(MAX_TRANSCRIPT_CHARS);
    expect(text.startsWith(EARLIER_LEFT_OUT)).toBe(true);
    expect(text).toContain("message number 19");
    expect(text).not.toContain("message number 0 ");
  });

  it("keeps part of the newest message when it alone is over the cap", () => {
    const text = buildTranscript([{ role: "user", text: "word ".repeat(200) }], 100);
    expect(text.length).toBeLessThanOrEqual(100);
    expect(text.startsWith("Me: word")).toBe(true);
  });
});

describe("mailto", () => {
  it("builds the body with the problem, the details and the chat", () => {
    const body = buildSupportBody({ details, message: "The price does not save.", transcript: "Me: hi" });
    expect(body.startsWith("The price does not save.")).toBe(true);
    expect(body).toContain("Store: Test Store");
    expect(body).toContain("Store ID: st_123");
    expect(body).toContain("Name: Asha Rao");
    expect(body).toContain("Email: asha@example.com");
    expect(body).toContain("Page I came from: /admin/help/add-product");
    expect(body).toContain("--- Chat with the assistant ---\nMe: hi");
  });

  it("leaves the chat section out when there is no transcript", () => {
    expect(buildSupportBody({ details, message: "Something is wrong", transcript: "" })).not.toContain("Chat");
  });

  it("encodes the subject and body into a mailto: link", () => {
    const { href, tooLong, prefilled } = buildMailto("mailto:support@example.com", "Price & stock?", "Line 1\nLine 2");
    expect(prefilled).toBe(true);
    expect(tooLong).toBe(false);
    expect(href).toBe("mailto:support@example.com?subject=Price%20%26%20stock%3F&body=Line%201%0D%0ALine%202");
  });

  it("uses & when the address already has a query", () => {
    expect(buildMailto("mailto:a@b.co?cc=c@d.co", "S", "B").href).toContain("?cc=c@d.co&subject=S&body=B");
  });

  it("flags a link that is too long", () => {
    const { href, tooLong } = buildMailto("mailto:support@example.com", "S", "x".repeat(MAX_MAILTO_LENGTH));
    expect(tooLong).toBe(true);
    expect(href.length).toBeGreaterThan(MAX_MAILTO_LENGTH);
  });

  it("gives a short body for the too-long case", () => {
    const short = buildShortBody({ details });
    expect(short).toContain("paste");
    expect(short).toContain("Store: Test Store");
    expect(buildMailto("mailto:support@example.com", "S", short).tooLong).toBe(false);
  });

  it("does not prefill a web address", () => {
    expect(buildMailto("https://example.com/support", "S", "B")).toEqual({
      href: "https://example.com/support",
      tooLong: false,
      prefilled: false,
    });
  });
});
