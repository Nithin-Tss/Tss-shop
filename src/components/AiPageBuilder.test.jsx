import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/lib/aiAssistantApi", async (importOriginal) => ({
  ...(await importOriginal()),
  publishDraft: vi.fn(async () => ({ ok: true })),
  discardDraft: vi.fn(async () => ({ ok: true })),
  previewDraft: vi.fn(async () => ({ ok: true, html: "<p>draft html</p>" })),
}));

import AiPageBuilderPanel from "@/components/AiPageBuilder";
import {
  cleanChanges,
  discardDraft,
  pagesOf,
  previewDraft,
  publishDraft,
} from "@/lib/aiAssistantApi";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const change = {
  action: "created_page",
  pageId: "p1",
  title: "About us",
  handle: "about-us",
  template: "page.about-us",
  summary: "Created draft page /pages/about-us",
};
const ask = (reply) =>
  vi.fn(async () => ({ ok: true, reply, conversationId: "c1", changes: [change] }));
const type = (text) => {
  fireEvent.change(screen.getByLabelText("Your request"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
};

describe("AiPageBuilderPanel", () => {
  it("shows the reply with Preview, Publish and Discard for each draft page", async () => {
    const send = ask("I built it.");
    render(<AiPageBuilderPanel onClose={() => {}} send={send} />);
    type("make an about page");
    expect(await screen.findByText("I built it.")).toBeTruthy();
    expect(send).toHaveBeenCalledWith("make an about page", null);
    expect(screen.getByText("About us")).toBeTruthy();
    for (const name of ["Preview draft", "Publish", "Discard"]) {
      expect(screen.getByRole("button", { name })).toBeTruthy();
    }
  });

  it("keeps the conversation id for follow-ups", async () => {
    const send = ask("ok");
    render(<AiPageBuilderPanel onClose={() => {}} send={send} />);
    type("one");
    await screen.findByText("ok");
    type("two");
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(send.mock.calls[1]).toEqual(["two", "c1"]);
  });

  it("shows a loading state while waiting", async () => {
    let finish;
    const send = vi.fn(() => new Promise((r) => (finish = r)));
    render(<AiPageBuilderPanel onClose={() => {}} send={send} />);
    type("hello");
    expect(await screen.findByText("Thinking…")).toBeTruthy();
    finish({ ok: true, reply: "hi", conversationId: "c", changes: [] });
    await screen.findByText("hi");
    expect(screen.queryByText("Thinking…")).toBeNull();
  });

  it("shows errors", async () => {
    const send = vi.fn(async () => ({ ok: false, error: "The AI service is busy right now." }));
    render(<AiPageBuilderPanel onClose={() => {}} send={send} />);
    type("hello");
    expect((await screen.findByRole("alert")).textContent).toContain("busy");
  });

  it("publishes and discards through the server, then shows the result", async () => {
    render(<AiPageBuilderPanel onClose={() => {}} send={ask("done")} />);
    type("go");
    fireEvent.click(await screen.findByRole("button", { name: "Publish" }));
    await screen.findByText(/Published at \/pages\/about-us/);
    expect(publishDraft).toHaveBeenCalledWith("p1");
    expect(screen.queryByRole("button", { name: "Publish" })).toBeNull();
  });

  it("discards", async () => {
    render(<AiPageBuilderPanel onClose={() => {}} send={ask("done")} />);
    type("go");
    fireEvent.click(await screen.findByRole("button", { name: "Discard" }));
    await screen.findByText("Discarded");
    expect(discardDraft).toHaveBeenCalledWith("p1");
  });

  it("previews the draft in a sandboxed frame", async () => {
    render(<AiPageBuilderPanel onClose={() => {}} send={ask("done")} />);
    type("go");
    fireEvent.click(await screen.findByRole("button", { name: "Preview draft" }));
    const frame = await screen.findByTitle("Preview of About us");
    expect(frame.getAttribute("sandbox")).toBe("");
    expect(previewDraft).toHaveBeenCalledWith(
      expect.objectContaining({ template: "page.about-us", handle: "about-us" })
    );
  });

  it("shows a failed publish and keeps the buttons", async () => {
    publishDraft.mockResolvedValueOnce({ ok: false, error: "Couldn't publish." });
    render(<AiPageBuilderPanel onClose={() => {}} send={ask("done")} />);
    type("go");
    fireEvent.click(await screen.findByRole("button", { name: "Publish" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Couldn't publish");
    expect(screen.getByRole("button", { name: "Publish" })).toBeTruthy();
  });
});

describe("helpers", () => {
  it("cleanChanges drops junk and pagesOf merges edits to one page", () => {
    expect(cleanChanges(null)).toEqual([]);
    expect(cleanChanges([{ nope: 1 }, null])).toEqual([]);
    const two = cleanChanges([
      {
        action: "created_page",
        page_id: "p",
        title: "T",
        handle: "t",
        template: "page.t",
        summary: "a",
      },
      {
        action: "added_section",
        page_id: "p",
        title: "T",
        handle: "t",
        template: "page.t",
        summary: "b",
      },
    ]);
    const pages = pagesOf(two);
    expect(pages).toHaveLength(1);
    expect(pages[0].summaries).toEqual(["a", "b"]);
  });
});
