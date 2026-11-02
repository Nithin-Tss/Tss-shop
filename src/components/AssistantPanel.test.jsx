import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

vi.mock("@/lib/api", () => ({ apiPost: vi.fn() }));

import { AssistantButton, AssistantPanel, PUSH_MIN_WIDTH } from "@/components/AssistantPanel";
import { apiPost } from "@/lib/api";
import { assistantStore } from "@/lib/assistantApi";

function signIn(permissions, extra = {}) {
  window.localStorage.setItem(
    "store_session",
    JSON.stringify({
      token: "t",
      email: "owner@example.com",
      storeId: "s1",
      stores: [{ storeId: "s1", permissions }],
      ...extra,
    })
  );
}

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function mount() {
  return render(
    <MemoryRouter initialEntries={["/admin/online-store/home"]}>
      <AssistantButton />
      <AssistantPanel />
      <Where />
    </MemoryRouter>
  );
}

const panel = () => screen.getByLabelText("Assistant", { selector: "aside" });
const isOpen = () => panel().getAttribute("aria-hidden") === "false";

const pushing = () => document.documentElement.dataset.assistantPush === "true";
const resizeTo = (width) =>
  act(() => {
    window.innerWidth = width;
    window.dispatchEvent(new Event("resize"));
  });

beforeEach(() => {
  window.innerWidth = 1024;
  window.localStorage.clear();
  assistantStore.wipe();
  window.sessionStorage.clear();
  assistantStore.setOpen(false);
  apiPost.mockReset();
});

afterEach(cleanup);

describe("AssistantPanel", () => {
  it("shows the button only to someone who may use at least one tool", () => {
    signIn(["products.view"]);
    const { container } = mount();
    expect(container.querySelector("button[aria-label='Assistant']")).toBeNull();
    expect(container.querySelector("aside")).toBeNull();
  });

  it("shows nothing when signed out", () => {
    const { container } = mount();
    expect(container.querySelector("aside")).toBeNull();
  });

  it("opens from the button and closes with Escape", () => {
    signIn(["orders.view"]);
    mount();
    expect(isOpen()).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Assistant" }));
    expect(isOpen()).toBe(true);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(isOpen()).toBe(false);
  });

  it("closes with the close button", () => {
    signIn(["reports.view"]);
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Assistant" }));
    fireEvent.click(screen.getByRole("button", { name: "Close assistant" }));
    expect(isOpen()).toBe(false);
  });

  it("keeps the conversation when closed and reopened, and across a fresh mount", async () => {
    signIn(["reports.view"]);
    apiPost.mockResolvedValue({ ok: true, data: { answer: "Net sales were ₹26,600.", tools: [] } });
    const first = mount();

    fireEvent.click(screen.getByRole("button", { name: "Assistant" }));
    await act(async () => {
      await assistantStore.send("How were sales?");
    });
    expect(document.body.textContent).toContain("Net sales were ₹26,600.");
    expect(apiPost).toHaveBeenCalledWith(
      "/api/v1/assistant/chat/",
      { message: "How were sales?" },
      {}
    );

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Assistant" }));
    expect(document.body.textContent).toContain("Net sales were ₹26,600.");

    // Another admin page mounts its own sidebar: the chat is still there
    first.unmount();
    mount();
    expect(document.body.textContent).toContain("Net sales were ₹26,600.");
  });

  it("starts fresh for another store", async () => {
    signIn(["reports.view"]);
    apiPost.mockResolvedValue({ ok: true, data: { answer: "Store one answer", tools: [] } });
    const first = mount();
    await act(async () => {
      await assistantStore.send("Q");
    });
    expect(document.body.textContent).toContain("Store one answer");
    first.unmount();

    signIn(["reports.view"], {
      storeId: "s2",
      stores: [{ storeId: "s2", permissions: ["reports.view"] }],
    });
    mount();
    expect(document.body.textContent).not.toContain("Store one answer");
  });

  it("starts an empty chat with New chat (the old one goes to Recents)", async () => {
    signIn(["reports.view"]);
    apiPost.mockResolvedValue({ ok: true, data: { answer: "Some answer", tools: [] } });
    mount();
    await act(async () => {
      await assistantStore.send("Q");
    });
    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    expect(document.body.textContent).not.toContain("Some answer");
    expect(document.body.textContent).toContain("Where should we begin?");
    expect(assistantStore.getState().recents).toHaveLength(1);
  });

  it("shows the server's message when the assistant is refused", async () => {
    signIn(["orders.view"]);
    apiPost.mockResolvedValue({
      ok: false,
      status: 403,
      formError: "Your role doesn't allow this.",
    });
    mount();
    await act(async () => {
      await assistantStore.send("Q");
    });
    expect(document.body.textContent).toContain("Your role doesn't allow this.");
  });

  it("opens the page of an action button in the same tab, and keeps the panel open on wide screens", async () => {
    signIn(["themes.manage", "reports.view"]);
    apiPost.mockResolvedValue({
      ok: true,
      data: {
        answer: "1. Open Customize.",
        tools: [{ name: "admin_help" }],
        actions: [
          { label: "Open Customize", path: "/admin/online-store/customize" },
          { label: "Evil", path: "https://evil.example/x" },
        ],
      },
    });
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Assistant" }));
    await act(async () => {
      await assistantStore.send("How do I change the logo text?");
    });
    expect(screen.queryByRole("button", { name: "Evil" })).toBeNull(); // only plain admin paths become buttons

    window.innerWidth = 1280;
    fireEvent.click(screen.getByRole("button", { name: "Open Customize" }));
    expect(screen.getByTestId("where").textContent).toBe("/admin/online-store/customize");
    expect(isOpen()).toBe(true);
  });

  it("closes the panel after a button click on a phone-sized screen", async () => {
    signIn(["themes.manage", "reports.view"]);
    apiPost.mockResolvedValue({
      ok: true,
      data: {
        answer: "Steps",
        tools: [],
        actions: [{ label: "Open Code editor", path: "/admin/online-store/code" }],
      },
    });
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Assistant" }));
    await act(async () => {
      await assistantStore.send("How do I edit theme code?");
    });
    window.innerWidth = 400;
    fireEvent.click(screen.getByRole("button", { name: "Open Code editor" }));
    expect(screen.getByTestId("where").textContent).toBe("/admin/online-store/code");
    expect(isOpen()).toBe(false);
    window.innerWidth = 1024;
  });

  it("has a light button for the white top bars, which opens and closes the same panel", () => {
    signIn(["themes.manage", "reports.view"]);
    render(
      <MemoryRouter>
        <AssistantButton tone="light" />
        <AssistantPanel />
      </MemoryRouter>
    );
    const button = screen.getByRole("button", { name: "Assistant" });
    expect(button.className).toContain("text-[#5A5750]"); // dark icon on a light bar
    expect(button.className).not.toContain("text-white");
    fireEvent.click(button);
    expect(isOpen()).toBe(true);
    expect(button.className).toContain("bg-[#DFEAE4]");
    fireEvent.click(button);
    expect(isOpen()).toBe(false);
  });

  it("uses an Escape that closes the panel, so the page behind does not also react", () => {
    signIn(["reports.view"]);
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Assistant" }));

    const escape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    document.dispatchEvent(escape);
    expect(isOpen()).toBe(false);
    expect(escape.defaultPrevented).toBe(true);

    // With the panel closed, Escape is left alone for the page
    const again = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    document.dispatchEvent(again);
    expect(again.defaultPrevented).toBe(false);
  });

  it("keeps the conversation going from the customizer to the code editor through an action button", async () => {
    signIn(["themes.manage", "reports.view"]);
    apiPost.mockResolvedValue({
      ok: true,
      data: {
        answer: "Open sections/footer.liquid.",
        tools: [{ name: "theme_files" }],
        actions: [
          {
            label: "Open footer.liquid in Code editor",
            path: "/admin/online-store/code?file=sections%2Ffooter.liquid",
          },
        ],
      },
    });
    // Each page mounts its own button and panel, as the customizer and the code editor do
    const Page = ({ name }) => (
      <div data-testid="page">
        {name}
        <AssistantButton tone="light" />
        <AssistantPanel />
      </div>
    );
    render(
      <MemoryRouter initialEntries={["/admin/online-store/customize"]}>
        <Routes>
          <Route path="/admin/online-store/customize" element={<Page name="customize" />} />
          <Route path="/admin/online-store/code" element={<Page name="code" />} />
        </Routes>
        <Where />
      </MemoryRouter>
    );
    expect(screen.getByTestId("page").textContent).toContain("customize");
    fireEvent.click(screen.getByRole("button", { name: "Assistant" }));
    await act(async () => {
      await assistantStore.send("How do I change the footer?");
    });

    window.innerWidth = 1280;
    fireEvent.click(screen.getByRole("button", { name: "Open footer.liquid in Code editor" }));

    expect(screen.getByTestId("where").textContent).toBe("/admin/online-store/code");
    expect(screen.getByTestId("page").textContent).toContain("code");
    expect(document.querySelectorAll("aside[aria-label='Assistant']")).toHaveLength(1); // one panel per page
    expect(document.body.textContent).toContain("Open sections/footer.liquid."); // the history came along
    expect(isOpen()).toBe(true);
  });

  describe("making room for the page", () => {
    it("pushes from 1280px up, and not below", () => {
      expect(PUSH_MIN_WIDTH).toBe(1280);
      signIn(["reports.view"]);
      window.innerWidth = 1279;
      mount();
      fireEvent.click(screen.getByRole("button", { name: "Assistant" }));
      expect(isOpen()).toBe(true);
      expect(pushing()).toBe(false); // narrower: it overlays, with the backdrop
      expect(document.querySelector(".xl\\:hidden")).not.toBeNull();

      resizeTo(1280);
      expect(pushing()).toBe(true);
      resizeTo(1000);
      expect(pushing()).toBe(false);
      resizeTo(1600);
      expect(pushing()).toBe(true);
    });

    it("stops pushing when the panel closes, with the button, the close button or Escape", () => {
      signIn(["reports.view"]);
      window.innerWidth = 1440;
      mount();
      const button = screen.getByRole("button", { name: "Assistant" });

      fireEvent.click(button);
      expect(pushing()).toBe(true);
      fireEvent.click(button);
      expect(pushing()).toBe(false);

      fireEvent.click(button);
      fireEvent.click(screen.getByRole("button", { name: "Close assistant" }));
      expect(pushing()).toBe(false);

      fireEvent.click(button);
      expect(pushing()).toBe(true);
      fireEvent.keyDown(document, { key: "Escape" });
      expect(pushing()).toBe(false);
    });

    it("stops pushing when the page unmounts, and the next page takes over without a gap", () => {
      signIn(["reports.view"]);
      window.innerWidth = 1440;
      const first = mount();
      fireEvent.click(screen.getByRole("button", { name: "Assistant" }));
      expect(pushing()).toBe(true);

      first.unmount();
      expect(pushing()).toBe(false);

      mount(); // another page: the panel is still open in the store
      expect(pushing()).toBe(true);
    });

    it("never pushes for a member who may not use the assistant", () => {
      signIn(["products.view"]);
      window.innerWidth = 1440;
      mount();
      act(() => assistantStore.setOpen(true));
      expect(pushing()).toBe(false);
    });
  });
});
