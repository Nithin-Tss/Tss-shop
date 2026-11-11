import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

vi.mock("@/lib/api", async (orig) => ({
  ...(await orig()),
  apiGet: vi.fn(async () => ({ ok: true, data: { messages: [] } })),
  apiPost: vi.fn(async () => ({ ok: true, data: { messages: [] } })),
}));
const flag = vi.hoisted(() => ({ on: true }));
vi.mock("@/lib/featureFlags", () => ({ useFlag: () => flag.on }));

import HelpWidget, { Widget } from "@/components/HelpWidget";
import { openHelpChat } from "@/lib/helpChat";

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

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

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
      <Where />
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

  it("offers 'Talk to a human' only after the assistant has had a go", async () => {
    const { send } = mount();
    expect(screen.queryByRole("button", { name: "Talk to a human" })).toBeNull();
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

  it("'Talk to a human' raises a ticket without sending a chat message, then continues in the same chat", async () => {
    const { send, escalate } = mount();
    ask("my payouts are missing");
    await screen.findByText("Open Settings > Domains.");
    fireEvent.click(screen.getByRole("button", { name: "Talk to a human" }));
    await waitFor(() => expect(escalate).toHaveBeenCalledWith("c1", ""));
    expect(send).toHaveBeenCalledTimes(1);
    expect(await screen.findByLabelText("Message to support")).toBeTruthy();
    expect(screen.getByTestId("where").textContent).toBe("/");
    expect(screen.getByLabelText("Help assistant")).toBeTruthy();
  });

  it("is available when the assistant fails (the last question becomes the note)", async () => {
    const { escalate } = mount({ send: vi.fn(async () => ({ ok: false, error: "Busy." })) });
    ask("I need a person");
    fireEvent.click(await screen.findByRole("button", { name: "Talk to a human" }));
    await waitFor(() => expect(escalate).toHaveBeenCalledWith(null, "I need a person"));
  });

  it("continues in the chat when a ticket already exists", async () => {
    mount({
      escalate: vi.fn(async () => ({ ok: true, conversationId: "c1", ticket, created: false })),
    });
    ask("help");
    await screen.findByText("Open Settings > Domains.");
    fireEvent.click(screen.getByRole("button", { name: "Talk to a human" }));
    expect(await screen.findByLabelText("Message to support")).toBeTruthy();
    expect(screen.getByTestId("where").textContent).toBe("/");
  });

  it("shows an error and lets the merchant try again when raising a ticket fails", async () => {
    const escalate = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: "Couldn't reach support." })
      .mockResolvedValueOnce({ ok: true, conversationId: "c1", ticket, created: true });
    mount({ escalate });
    ask("help");
    await screen.findByText("Open Settings > Domains.");
    fireEvent.click(screen.getByRole("button", { name: "Talk to a human" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Couldn't reach support/);
    expect(screen.getByLabelText("Your question").disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Talk to a human" }));
    expect(await screen.findByLabelText("Message to support")).toBeTruthy();
    expect(screen.getByTestId("where").textContent).toBe("/");
  });

  it("opens when another page asks for the chat (Contact support)", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Help" })); // close it
    expect(screen.queryByLabelText("Help assistant")).toBeNull();
    openHelpChat();
    expect(await screen.findByLabelText("Help assistant")).toBeTruthy();
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
    expect(screen.getByLabelText("Message to support").disabled).toBe(false);
  });
});
