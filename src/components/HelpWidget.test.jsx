import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const flag = vi.hoisted(() => ({ on: true }));
vi.mock("@/lib/featureFlags", () => ({ useFlag: () => flag.on }));

import HelpWidget, { Widget } from "@/components/HelpWidget";

function signIn() {
  window.localStorage.setItem(
    "store_session",
    JSON.stringify({
      token: "t",
      email: "m@example.com",
      storeId: "s1",
      stores: [{ storeId: "s1" }],
    })
  );
}

const ticket = { id: "t1", ticketNumber: "TSS-000007", subject: "S", status: "open" };

function mount(props = {}) {
  const send =
    props.send ||
    vi.fn(async () => ({
      ok: true,
      reply: "Open Settings > Domains.",
      conversationId: "c1",
      sources: [],
      ticket: null,
      escalated: false,
    }));
  const escalate =
    props.escalate ||
    vi.fn(async () => ({ ok: true, conversationId: "c1", ticket, created: true }));
  const load = props.load || vi.fn(async () => ({ ok: false }));
  render(
    <MemoryRouter>
      <Widget send={send} escalate={escalate} load={load} />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole("button", { name: "Help" }));
  return { send, escalate, load };
}

const ask = (text) => {
  fireEvent.change(screen.getByLabelText("Your question"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
};

beforeEach(() => {
  flag.on = true;
  window.localStorage.clear();
  window.sessionStorage.clear();
  signIn();
});
afterEach(cleanup);

describe("HelpWidget", () => {
  it("is not there while the flag is off or when signed out", () => {
    flag.on = false;
    const { container, rerender } = render(
      <MemoryRouter>
        <HelpWidget />
      </MemoryRouter>
    );
    expect(container.textContent).toBe("");
    flag.on = true;
    window.localStorage.clear();
    rerender(
      <MemoryRouter>
        <HelpWidget />
      </MemoryRouter>
    );
    expect(container.textContent).toBe("");
  });

  it("shows a Help button; the panel has 'Talk to a human' at all times", async () => {
    const { send } = mount();
    expect(screen.getByRole("button", { name: "Talk to a human" })).toBeTruthy();
    ask("How do I add a domain?");
    expect(await screen.findByText("Open Settings > Domains.")).toBeTruthy();
    expect(send).toHaveBeenCalledWith("How do I add a domain?", null);
    // still there after an answer
    expect(screen.getByRole("button", { name: "Talk to a human" })).toBeTruthy();
    expect(window.sessionStorage.getItem("tss-help-chat:s1")).toBe("c1");
  });

  it("links the help articles an answer used", async () => {
    mount({
      send: vi.fn(async () => ({
        ok: true,
        reply: "See the article.",
        conversationId: "c1",
        ticket: null,
        escalated: false,
        sources: [
          {
            slug: "domains",
            title: "Connect a custom domain",
            url: "/admin/help/articles/domains",
          },
        ],
      })),
    });
    ask("domain?");
    const link = await screen.findByRole("link", { name: "Connect a custom domain" });
    expect(link.getAttribute("href")).toBe("/admin/help/articles/domains");
  });

  it("'Talk to a human' raises a ticket without sending a chat message, then the chat is closed to the AI", async () => {
    const { send, escalate } = mount();
    ask("my payouts are missing");
    await screen.findByText("Open Settings > Domains.");
    fireEvent.click(screen.getByRole("button", { name: "Talk to a human" }));
    await waitFor(() => expect(escalate).toHaveBeenCalledWith("c1", ""));
    expect(send).toHaveBeenCalledTimes(1);
    expect((await screen.findAllByText(/A support agent will reply here/)).length).toBeGreaterThan(
      0
    );
    expect(screen.getAllByText(/TSS-000007/).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: /View it in My support tickets/ }).getAttribute("href")
    ).toBe("/admin/help/tickets/t1");
    expect(screen.getByLabelText("Your question").disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Talk to a human" })).toBeTruthy();
  });

  it("can be used before the first message (the typed text becomes the note)", async () => {
    const { escalate } = mount();
    fireEvent.change(screen.getByLabelText("Your question"), {
      target: { value: "I need a person" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Talk to a human" }));
    await waitFor(() => expect(escalate).toHaveBeenCalledWith(null, "I need a person"));
  });

  it("tells the merchant when the ticket already existed", async () => {
    mount({
      escalate: vi.fn(async () => ({ ok: true, conversationId: "c1", ticket, created: false })),
    });
    fireEvent.click(screen.getByRole("button", { name: "Talk to a human" }));
    expect(await screen.findByText(/You already have ticket TSS-000007/)).toBeTruthy();
  });

  it("shows an error and lets the merchant try again when raising a ticket fails", async () => {
    const escalate = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: "Couldn't reach support." })
      .mockResolvedValueOnce({ ok: true, conversationId: "c1", ticket, created: true });
    mount({ escalate });
    fireEvent.click(screen.getByRole("button", { name: "Talk to a human" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Couldn't reach support/);
    expect(screen.getByLabelText("Your question").disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Talk to a human" }));
    expect((await screen.findAllByText(/TSS-000007/)).length).toBeGreaterThan(0);
  });

  it("shows a failed answer as an error without losing the question", async () => {
    mount({ send: vi.fn(async () => ({ ok: false, error: "The AI service is busy." })) });
    ask("hello");
    expect((await screen.findByRole("alert")).textContent).toBe("The AI service is busy.");
    expect(screen.getByText("hello")).toBeTruthy();
  });

  it("opens an already escalated conversation in the escalated state", async () => {
    window.sessionStorage.setItem("tss-help-chat:s1", "c1");
    const load = vi.fn(async () => ({
      ok: true,
      messages: [{ role: "user", text: "q" }],
      ticket,
      escalated: true,
    }));
    mount({ load });
    expect(await screen.findByText("A support agent will reply here.")).toBeTruthy();
    expect(screen.getByLabelText("Your question").disabled).toBe(true);
  });
});
