import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({ apiGet: vi.fn(), apiPost: vi.fn() }));

import { apiGet, apiPost } from "@/lib/api";
import {
  articleToMarkdown,
  cleanSources,
  cleanTicket,
  loadConversation,
  sendHelpMessage,
  talkToAHuman,
} from "@/lib/helpAssistantApi";
import { buildStaffQuery, isFinished, sourceLabel, statusLabel } from "@/lib/supportTickets";

beforeEach(() => vi.clearAllMocks());

describe("sendHelpMessage", () => {
  it("posts the message with the conversation id and cleans the answer", async () => {
    apiPost.mockResolvedValue({
      ok: true,
      data: {
        reply: "Open Settings.",
        conversation_id: "c1",
        sources: [{ slug: "domains", title: "Domains", url: "http://evil.example/x" }, { nope: 1 }],
        ticket: { id: "t1", ticketNumber: "TSS-000001", subject: "S", status: "open" },
        escalated: true,
      },
    });
    const res = await sendHelpMessage("hi", "c1");
    expect(apiPost).toHaveBeenCalledWith("/api/v1/help-assistant/chat/", {
      message: "hi",
      conversation_id: "c1",
    });
    expect(res.ok).toBe(true);
    expect(res.escalated).toBe(true);
    expect(res.ticket.ticketNumber).toBe("TSS-000001");
    // links are rebuilt from the slug: a url sent by the server is never followed
    expect(res.sources).toEqual([
      { slug: "domains", title: "Domains", url: "/admin/help/articles/domains" },
    ]);
  });

  it("omits conversation_id on the first message and explains 403, 429 and 503", async () => {
    apiPost.mockResolvedValue({ ok: false, status: 403 });
    expect((await sendHelpMessage("hi", null)).error).toMatch(/isn't available/);
    expect(apiPost.mock.calls[0][1]).toEqual({ message: "hi" });
    apiPost.mockResolvedValue({ ok: false, status: 429 });
    expect((await sendHelpMessage("hi", null)).error).toMatch(/lot of requests/);
    apiPost.mockResolvedValue({ ok: false, status: 503, data: { detail: "busy" } });
    expect((await sendHelpMessage("hi", null)).error).toBe("busy");
  });
});

describe("talkToAHuman", () => {
  it("escalates the conversation, or 'new' before any message", async () => {
    apiPost.mockResolvedValue({
      ok: true,
      data: {
        conversation_id: "c9",
        created: true,
        ticket: { id: "t", ticketNumber: "TSS-000002" },
      },
    });
    const res = await talkToAHuman(null, "need a person");
    expect(apiPost).toHaveBeenCalledWith("/api/v1/help-assistant/conversations/new/escalate/", {
      message: "need a person",
    });
    expect(res).toMatchObject({ ok: true, conversationId: "c9", created: true });
    await talkToAHuman("c1");
    expect(apiPost.mock.calls[1][0]).toBe("/api/v1/help-assistant/conversations/c1/escalate/");
  });

  it("reports a failure", async () => {
    apiPost.mockResolvedValue({ ok: false, status: 500, error: "Server error" });
    expect(await talkToAHuman("c1")).toEqual({ ok: false, error: "Server error" });
  });
});

describe("helpers", () => {
  it("restores a conversation", async () => {
    apiGet.mockResolvedValue({
      ok: true,
      data: {
        messages: [
          { role: "user", content: "q" },
          { role: "assistant", content: "a" },
        ],
        escalated: false,
      },
    });
    expect(await loadConversation("c1")).toMatchObject({
      ok: true,
      messages: [
        { role: "user", text: "q" },
        { role: "assistant", text: "a" },
      ],
    });
  });

  it("cleans odd data", () => {
    expect(cleanSources(null)).toEqual([]);
    expect(cleanTicket({ ticketNumber: "x" })).toBeNull();
  });

  it("turns article headings into bold lines and drops a repeated title", () => {
    expect(
      articleToMarkdown("## Connect a domain\n\n1. Do it\n\n### More\ntext", "Connect a domain")
    ).toBe("1. Do it\n\n**More**\ntext");
  });

  it("builds the staff query: only chosen filters, trimmed search", () => {
    expect(
      buildStaffQuery({ status: "active", priority: "", q: "  tea  " }, { limit: 25, offset: 50 })
    ).toBe("status=active&q=tea&limit=25&offset=50");
    expect(buildStaffQuery()).toBe("");
  });

  it("knows the new statuses", () => {
    expect(statusLabel("in_progress")).toBe("In progress");
    expect(isFinished("resolved") && isFinished("closed")).toBe(true);
    expect(isFinished("waiting_on_customer")).toBe(false);
    expect(sourceLabel("ai_escalation")).toBe("AI");
  });
});
