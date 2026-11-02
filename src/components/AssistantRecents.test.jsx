import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";

import AssistantRecents, { formatWhen } from "@/components/AssistantRecents";
import { createChatStore } from "@/lib/assistantChatStore";

afterEach(cleanup);

const answer = () => Promise.resolve({ ok: true, answer: "an answer", tools: [] });

async function saved(store, question) {
  await act(async () => {
    await store.send(question);
  });
  act(() => {
    store.newChat();
  });
}

// The panel owns "open"; this stands in for it
function Harness({ store, onOpened }) {
  const [open, setOpen] = useState(false);
  return <AssistantRecents store={store} open={open} onOpenChange={setOpen} onOpened={onOpened} />;
}

const pill = () => screen.getByRole("button", { name: "Recents" });

describe("formatWhen", () => {
  const now = new Date("2026-11-02T12:00:00Z").getTime();
  it("reads naturally", () => {
    expect(formatWhen(now - 5_000, now)).toBe("Just now");
    expect(formatWhen(now - 5 * 60_000, now)).toBe("5 min ago");
    expect(formatWhen(now - 3 * 3_600_000, now)).toBe("3 h ago");
    expect(formatWhen(now - 30 * 3_600_000, now)).toBe("Yesterday");
    expect(formatWhen(now - 4 * 86_400_000, now)).toBe("4 days ago");
    expect(formatWhen(now - 30 * 86_400_000, now)).toMatch(/\d/); // a date
    expect(formatWhen(now + 60_000, now)).toBe("Just now"); // a clock a little ahead
  });
});

describe("AssistantRecents", () => {
  it("is a plain-text button with a clock icon (no pill border or background), closed to begin with", () => {
    render(<Harness store={createChatStore(answer)} />);
    expect(pill().tagName).toBe("BUTTON");
    expect(pill().textContent).toBe("Recents");
    expect(pill().querySelector("svg")).not.toBeNull();
    expect(pill().className).not.toMatch(/rounded-full|border|(^|\s)bg-/);
    fireEvent.click(pill());
    expect(pill().className).not.toMatch(/rounded-full|border|(^|\s)bg-/); // still plain while open
    fireEvent.click(pill());
    expect(pill().getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("region", { name: "Recent chats" })).toBeNull();
  });

  it("says No previous chats when there are none", () => {
    render(<Harness store={createChatStore(answer)} />);
    fireEvent.click(pill());
    expect(screen.getByRole("region", { name: "Recent chats" }).textContent).toContain("No previous chats");
  });

  it("lists previous chats, newest first, by their first question with a time", async () => {
    const store = createChatStore(answer);
    await saved(store, "Older question about stock");
    await saved(store, "Newer question about sales");
    render(<Harness store={store} />);
    fireEvent.click(pill());

    const items = within(screen.getByRole("region", { name: "Recent chats" })).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain("Newer question about sales");
    expect(items[1].textContent).toContain("Older question about stock");
    expect(items[0].textContent).toContain("Just now");
    expect(items[0].querySelector(".truncate")).not.toBeNull(); // long titles are cut with an ellipsis
  });

  it("opens a chat, closes the list and tells the panel", async () => {
    const store = createChatStore(answer);
    await saved(store, "Question to reopen");
    let opened = 0;
    render(<Harness store={store} onOpened={() => (opened += 1)} />);
    fireEvent.click(pill());

    fireEvent.click(screen.getByRole("button", { name: /^Question to reopen/ }));

    expect(store.getState().messages.map((m) => m.text)).toEqual(["Question to reopen", "an answer"]);
    expect(screen.queryByRole("region", { name: "Recent chats" })).toBeNull();
    expect(opened).toBe(1);
  });

  it("deletes one chat, and Clear all removes the rest", async () => {
    const store = createChatStore(answer);
    await saved(store, "First");
    await saved(store, "Second");
    render(<Harness store={store} />);
    fireEvent.click(pill());

    fireEvent.click(screen.getByRole("button", { name: "Delete chat: Second" }));
    const list = screen.getByRole("region", { name: "Recent chats" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    expect(list.textContent).not.toContain("Second");

    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(screen.getByRole("region", { name: "Recent chats" }).textContent).toContain("No previous chats");
    expect(store.getState().recents).toEqual([]);
  });

  it("cannot open a chat while an answer is pending", async () => {
    let hang = false;
    const store = createChatStore(() => (hang ? new Promise(() => {}) : answer()));
    await saved(store, "Saved one");
    hang = true;
    act(() => {
      store.send("Still waiting");
    });
    expect(store.getState().pending).toBe(true);

    render(<Harness store={store} />);
    fireEvent.click(pill());
    const item = screen.getByRole("button", { name: /^Saved one/ });
    expect(item.disabled).toBe(true);
    fireEvent.click(item);
    expect(store.getState().messages.map((m) => m.text)).toEqual(["Still waiting"]); // nothing was replaced
    expect(screen.getByRole("button", { name: "Delete chat: Saved one" }).disabled).toBe(false); // deleting is fine
  });

  it("closes on a click elsewhere", () => {
    render(
      <>
        <p>elsewhere</p>
        <Harness store={createChatStore(answer)} />
      </>
    );
    fireEvent.click(pill());
    expect(screen.getByRole("region", { name: "Recent chats" })).toBeTruthy();
    fireEvent.mouseDown(screen.getByText("elsewhere"));
    expect(screen.queryByRole("region", { name: "Recent chats" })).toBeNull();
  });
});
