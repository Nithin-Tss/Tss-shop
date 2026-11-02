import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({ apiPost: vi.fn() }));
vi.mock("@/lib/editingTheme", () => ({ getEditingThemeId: vi.fn(() => "") }));

import { apiPost } from "@/lib/api";
import { askAssistant, cleanActions } from "@/lib/assistantApi";
import { getEditingThemeId } from "@/lib/editingTheme";

const THEME = "11111111-1111-1111-1111-111111111111";
const button = (path, label = "Open") => ({ label, path });

describe("cleanActions", () => {
  it("keeps admin pages and the code editor with a file and theme", () => {
    const good = [
      button("/admin/online-store/customize"),
      button(`/admin/online-store/code?file=sections%2Ffooter.liquid&theme=${THEME}`),
      button("/admin/online-store/code?file=snippets/product-card.liquid"),
    ];
    expect(cleanActions(good)).toEqual([
      button("/admin/online-store/customize"),
      button(`/admin/online-store/code?file=sections%2Ffooter.liquid&theme=${THEME}`),
      button("/admin/online-store/code?file=snippets%2Fproduct-card.liquid"),
    ]);
  });

  it("drops anything that is not a plain admin link", () => {
    const bad = [
      button("https://evil.example/admin/x"),
      button("//evil.example/admin/x"),
      button("javascript:alert(1)"),
      button("/profile"),
      button("/admin/../etc"),
      button("/admin/online-store/customize#x"),
      button("/admin/online-store/customize?file=a.liquid"), // a query is allowed only on the code editor
      button("/admin/online-store/code?file=../x.liquid"),
      button("/admin/online-store/code?file=a.liquid&next=https://evil.example"),
      button("/admin/online-store/code?file=a.liquid&theme=not-a-uuid"),
      button("/admin/online-store/code?file=a%20b.liquid"),
      { label: 5, path: "/admin/online-store/customize" },
      { label: "x" },
      null,
    ];
    expect(cleanActions(bad)).toEqual([]);
    expect(cleanActions("nope")).toEqual([]);
  });

  it("offers at most three", () => {
    const many = Array.from({ length: 6 }, (_, i) => button(`/admin/online-store/pages${i ? "" : ""}`, `B${i}`));
    expect(cleanActions(many)).toHaveLength(3);
  });
});

describe("askAssistant", () => {
  beforeEach(() => {
    apiPost.mockReset();
    apiPost.mockResolvedValue({ ok: true, data: { answer: "ok", tools: [], actions: [] } });
    getEditingThemeId.mockReset();
  });

  it("sends the theme being edited in X-Theme-Id", async () => {
    getEditingThemeId.mockReturnValue(THEME);
    await askAssistant("change the footer");
    expect(apiPost).toHaveBeenCalledWith(
      "/api/v1/assistant/chat/",
      { message: "change the footer" },
      { "X-Theme-Id": THEME },
      undefined
    );
  });

  it("sends no theme header when none is being edited", async () => {
    getEditingThemeId.mockReturnValue("");
    await askAssistant("hi");
    expect(apiPost).toHaveBeenCalledWith("/api/v1/assistant/chat/", { message: "hi" }, {}, undefined);
  });

  it("sends the earlier turns as history, and leaves it out when there are none", async () => {
    getEditingThemeId.mockReturnValue("");
    const history = [
      { role: "user", content: "add a View all button" },
      { role: "assistant", content: "Three files." },
    ];
    await askAssistant("exactly which file?", undefined, history);
    expect(apiPost).toHaveBeenLastCalledWith(
      "/api/v1/assistant/chat/",
      { message: "exactly which file?", history },
      {},
      undefined
    );
    await askAssistant("hi", undefined, []);
    expect(apiPost).toHaveBeenLastCalledWith("/api/v1/assistant/chat/", { message: "hi" }, {}, undefined);
  });

  it("returns only buttons that pass the checks", async () => {
    getEditingThemeId.mockReturnValue("");
    apiPost.mockResolvedValue({
      ok: true,
      data: {
        answer: "a",
        tools: [],
        actions: [button("/admin/online-store/code?file=sections%2Ffooter.liquid"), button("https://evil.example")],
      },
    });
    const result = await askAssistant("x");
    expect(result.actions).toEqual([button("/admin/online-store/code?file=sections%2Ffooter.liquid")]);
  });

  it("passes the AbortSignal to the request", async () => {
    getEditingThemeId.mockReturnValue("");
    const controller = new AbortController();
    await askAssistant("x", controller.signal);
    expect(apiPost.mock.calls[0][3]).toBe(controller.signal);
  });

  it("answers { ok: false, aborted: true } for a cancelled request, with no error text", async () => {
    getEditingThemeId.mockReturnValue("");
    apiPost.mockResolvedValue({ ok: false, aborted: true, status: 0, formError: "" });
    expect(await askAssistant("x", new AbortController().signal)).toEqual({ ok: false, aborted: true });
  });
});
