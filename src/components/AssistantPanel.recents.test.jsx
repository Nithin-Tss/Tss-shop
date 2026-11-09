import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/api", () => ({ apiPost: vi.fn() }));

import { AssistantButton, AssistantPanel } from "@/components/AssistantPanel";
import { EXAMPLE_QUESTIONS } from "@/components/AssistantChat";
import { apiPost } from "@/lib/api";
import { assistantStore, syncAssistantOwner } from "@/lib/assistantApi";

const KEY = "tss-assistant-recents";

function signIn(storeId = "s1", email = "owner@example.com") {
  window.localStorage.setItem(
    "store_session",
    JSON.stringify({
      token: "t",
      email,
      storeId,
      stores: [{ storeId, permissions: ["reports.view"] }],
    })
  );
}

function mount() {
  return render(
    <MemoryRouter>
      <AssistantButton />
      <AssistantPanel />
    </MemoryRouter>
  );
}

const panel = () => screen.getByLabelText("Assistant", { selector: "aside" });
const isOpen = () => panel().getAttribute("aria-hidden") === "false";
const openPanel = () => fireEvent.click(screen.getByRole("button", { name: "Assistant" }));

async function ask(question) {
  await act(async () => {
    await assistantStore.send(question);
  });
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  assistantStore.wipe();
  assistantStore.setOpen(false);
  window.innerWidth = 1024;
  apiPost.mockReset();
  apiPost.mockResolvedValue({
    ok: true,
    data: { answer: "an answer", tools: [{ name: "low_stock", arguments: { x: 1 } }] },
  });
  signIn();
  syncAssistantOwner();
});

afterEach(cleanup);

describe("the panel's top bar", () => {
  it("has a Recents pill, a New chat button and a close button, and no Clear or subtitle", () => {
    mount();
    openPanel();
    expect(screen.getByRole("button", { name: "Recents" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "New chat" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Close assistant" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
    expect(document.body.textContent).not.toContain("Changes nothing");
  });
});

describe("the look of the panel", () => {
  it("has a plain Recents button on the left, + and X on the right, and a thin divider under the bar", () => {
    mount();
    openPanel();
    const header = panel().querySelector("header");
    expect(header).not.toBeNull();
    expect(header.className).toContain("border-b"); // the thin divider
    const recents = screen.getByRole("button", { name: "Recents" });
    expect(recents.className).not.toMatch(/rounded-full|border|(^|\s)bg-/);
    const [first, last] = [header.firstElementChild, header.lastElementChild];
    expect(first.contains(recents)).toBe(true);
    expect(last.contains(screen.getByRole("button", { name: "New chat" }))).toBe(true);
    expect(last.contains(screen.getByRole("button", { name: "Close assistant" }))).toBe(true);
  });

  it("has a faint lavender background and no heavy shadow", () => {
    mount();
    openPanel();
    expect(panel().className).toContain("bg-[rgba(24,24,27,0.06)]");
    expect(panel().className).not.toContain("shadow-2xl");
  });

  it("shows the bubble illustration (inline SVG) above a large greeting, centered in the panel", () => {
    mount();
    openPanel();
    const heading = screen.getByRole("heading", { name: "Where should we begin?" });
    expect(heading.className).toContain("text-[21px]");
    expect(heading.className).toContain("font-semibold");
    const wrapper = heading.parentElement;
    expect(wrapper.className).toContain("justify-center"); // vertically centred
    const picture = wrapper.querySelector("svg");
    expect(picture).not.toBeNull();
    expect(picture.getAttribute("aria-hidden")).toBe("true");
    expect(picture.getAttribute("class")).toContain("h-10"); // about 40px
    expect(wrapper.querySelectorAll("img")).toHaveLength(0); // no image files
    expect(
      heading.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING
    ).toBeTruthy();
  });

  it("stacks the example chips under the greeting as compact lavender pills", () => {
    mount();
    openPanel();
    const chips = EXAMPLE_QUESTIONS.map((q) => screen.getByRole("button", { name: q }));
    for (const chip of chips) {
      expect(chip.className).toContain("rounded-full");
      expect(chip.className).toContain("border-slate-200");
      expect(chip.className).toContain("bg-white");
      expect(chip.className).toContain("text-[13px]");
    }
    const column = chips[0].parentElement;
    expect(column.className).toContain("flex-col"); // stacked
    expect(column.className).toContain("items-center"); // centred
    expect(column.className).toContain("max-w-[300px]"); // compact
    expect(chips.every((c) => c.parentElement === column)).toBe(true);
  });

  it("has one rounded input bar with the send button inside it, muted until there is text", () => {
    mount();
    openPanel();
    const input = screen.getByLabelText("Your question");
    const bar = input.closest("form");
    expect(bar.className).toContain("rounded-full");
    expect(bar.className).toContain("border-slate-200");

    const send = screen.getByRole("button", { name: "Send" });
    expect(bar.contains(send)).toBe(true);
    expect(send.className).toContain("rounded-full");
    expect(send.className).toContain("disabled:bg-slate-200"); // light violet while empty
    expect(send.className).toContain("bg-violet-700"); // stronger violet with text
    expect(send.disabled).toBe(true);

    fireEvent.change(input, { target: { value: "hello" } });
    expect(screen.getByRole("button", { name: "Send" }).disabled).toBe(false);
  });

  it("keeps Stop inside the bar while an answer is pending", () => {
    apiPost.mockReturnValue(new Promise(() => {}));
    mount();
    openPanel();
    act(() => {
      assistantStore.send("Slow question");
    });
    const stop = screen.getByRole("button", { name: "Stop" });
    expect(screen.getByLabelText("Your question").closest("form").contains(stop)).toBe(true);
    fireEvent.click(stop);
    expect(screen.queryByRole("button", { name: "Stop" })).toBeNull();
  });
});

describe("the empty state", () => {
  it("shows the greeting and the example chips, no messages", () => {
    mount();
    openPanel();
    expect(screen.getByRole("heading", { name: "Where should we begin?" })).toBeTruthy();
    for (const question of EXAMPLE_QUESTIONS) {
      expect(screen.getByRole("button", { name: question })).toBeTruthy();
    }
    // The chips are in the chat area above the input bar, not next to the input
    const form = screen.getByLabelText("Your question").closest("form");
    expect(form.contains(screen.getByRole("button", { name: EXAMPLE_QUESTIONS[0] }))).toBe(false);
    expect(document.body.textContent).not.toContain("Thinking");
  });

  it("goes away once a question is asked, and comes back after New chat", async () => {
    mount();
    openPanel();
    await ask("How were sales?");
    expect(screen.queryByRole("heading", { name: "Where should we begin?" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    expect(screen.getByRole("heading", { name: "Where should we begin?" })).toBeTruthy();
  });
});

describe("New chat and Recents in the panel", () => {
  it("New chat moves the conversation into Recents, which lists it and opens it again", async () => {
    mount();
    openPanel();
    await ask("How were sales last week?");

    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    expect(document.body.textContent).not.toContain("an answer");

    fireEvent.click(screen.getByRole("button", { name: "Recents" }));
    const item = screen.getByRole("button", { name: /^How were sales last week\?/ });
    fireEvent.click(item);

    expect(document.body.textContent).toContain("an answer");
    expect(document.body.textContent).toContain("How were sales last week?");
    expect(screen.queryByRole("region", { name: "Recent chats" })).toBeNull();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 5));
    });
    expect(document.activeElement).toBe(screen.getByLabelText("Your question")); // ready to continue
  });

  it("New chat is disabled while an answer is pending", async () => {
    apiPost.mockReturnValue(new Promise(() => {}));
    mount();
    openPanel();
    act(() => {
      assistantStore.send("Slow question");
    });
    expect(screen.getByRole("button", { name: "New chat" }).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(screen.getByRole("button", { name: "New chat" }).disabled).toBe(false);
  });

  it("puts the cursor in the input after New chat", async () => {
    mount();
    openPanel();
    await ask("Q");
    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 5));
    });
    expect(document.activeElement).toBe(screen.getByLabelText("Your question"));
  });
});

describe("Escape, with Recents", () => {
  it("closes the list of Recents first, and the panel on the next Escape", () => {
    mount();
    openPanel();
    fireEvent.click(screen.getByRole("button", { name: "Recents" }));
    expect(screen.getByRole("region", { name: "Recent chats" })).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "Recent chats" })).toBeNull();
    expect(isOpen()).toBe(true);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(isOpen()).toBe(false);
  });

  it("does not leave the list open behind a closed panel", () => {
    mount();
    openPanel();
    fireEvent.click(screen.getByRole("button", { name: "Recents" }));
    fireEvent.click(screen.getByRole("button", { name: "Close assistant" }));
    openPanel();
    expect(screen.queryByRole("region", { name: "Recent chats" })).toBeNull();
  });

  it("still pushes the page on a wide window (and not on a narrow one)", () => {
    window.innerWidth = 1440;
    mount();
    openPanel();
    expect(document.documentElement.dataset.assistantPush).toBe("true");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.documentElement.dataset.assistantPush).toBeUndefined();
  });
});

describe("sessionStorage", () => {
  it("keeps Recents across a fresh mount, only in sessionStorage", async () => {
    mount();
    openPanel();
    await ask("Remember me");
    fireEvent.click(screen.getByRole("button", { name: "New chat" }));

    const saved = JSON.parse(window.sessionStorage.getItem(KEY));
    expect(saved.owner).toBe("owner@example.com:s1");
    expect(JSON.stringify(saved)).not.toContain("arguments"); // tool names only
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it("wipes Recents, in memory and in sessionStorage, when the store changes", async () => {
    mount();
    openPanel();
    await ask("Store one question");
    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    expect(window.sessionStorage.getItem(KEY)).not.toBeNull();

    signIn("s2");
    act(() => syncAssistantOwner());

    expect(assistantStore.getState().recents).toEqual([]);
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
  });

  it("wipes Recents on sign-out", async () => {
    mount();
    openPanel();
    await ask("Before sign-out");
    fireEvent.click(screen.getByRole("button", { name: "New chat" }));

    window.localStorage.removeItem("store_session"); // signed out
    act(() => syncAssistantOwner());

    expect(assistantStore.getState().recents).toEqual([]);
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
  });
});
