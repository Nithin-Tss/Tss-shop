import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import AssistantChat, { EXAMPLE_QUESTIONS } from "@/components/AssistantChat";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// A request the test finishes by hand, so "Thinking..." can be checked while it waits
function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const text = () => document.body.textContent;
const input = () => screen.getByLabelText("Your question");
const sendButton = () => screen.getByRole("button", { name: "Send" });

describe("AssistantChat", () => {
  it("offers the three example questions", () => {
    render(<AssistantChat ask={vi.fn()} />);
    for (const question of EXAMPLE_QUESTIONS) {
      expect(screen.getByRole("button", { name: question })).toBeTruthy();
    }
    expect(EXAMPLE_QUESTIONS).toHaveLength(3);
  });

  it("shows a small hint under the input", () => {
    render(<AssistantChat ask={vi.fn()} />);
    expect(text()).toContain("I read text only. Paste the lines you see; screenshots are not supported yet.");
  });

  it("shows a guided answer as one list and offers no Next chip", async () => {
    const ask = vi.fn().mockResolvedValueOnce({
      ok: true,
      answer: "1. Go to Online Store > Edit theme.\n2. Click the section.\n3. Save, then check the preview.",
      tools: [],
    });
    render(<AssistantChat ask={ask} />);

    fireEvent.change(input(), { target: { value: "add a View all button" } });
    fireEvent.click(sendButton());
    await waitFor(() => expect(text()).toContain("Click the section."));
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
  });

  it("shows Thinking while waiting, then the answer and the tools used", async () => {
    const request = deferred();
    const ask = vi.fn(() => request.promise);
    render(<AssistantChat ask={ask} />);

    fireEvent.click(screen.getByRole("button", { name: EXAMPLE_QUESTIONS[0] }));

    expect(ask).toHaveBeenCalledTimes(1);
    expect(ask.mock.calls[0][0]).toBe(EXAMPLE_QUESTIONS[0]);
    expect(text()).toContain("Thinking...");
    expect(input().disabled).toBe(true);
    // The example questions were only for the empty chat: they are gone once a question is asked
    expect(screen.queryByRole("button", { name: EXAMPLE_QUESTIONS[1] })).toBeNull();

    request.resolve({
      ok: true,
      answer: "Net sales were ₹26,600.",
      tools: [{ name: "sales_summary" }],
    });

    await waitFor(() => expect(text()).toContain("Net sales were ₹26,600."));
    expect(text()).toContain("Used sales_summary");
    expect(text()).not.toContain("Thinking...");
    expect(input().disabled).toBe(false);
  });

  it("sends what is typed, and clears the box", async () => {
    const ask = vi.fn(() => Promise.resolve({ ok: true, answer: "Hi", tools: [] }));
    render(<AssistantChat ask={ask} />);

    fireEvent.change(input(), { target: { value: "  Low stock?  " } });
    fireEvent.click(sendButton());

    await waitFor(() => expect(ask).toHaveBeenCalled());
    expect(ask.mock.calls[0][0]).toBe("Low stock?");
    await waitFor(() => expect(input().value).toBe(""));
  });

  it("does not send an empty question", () => {
    const ask = vi.fn();
    render(<AssistantChat ask={ask} />);
    expect(sendButton().disabled).toBe(true);
    fireEvent.submit(input().closest("form"));
    expect(ask).not.toHaveBeenCalled();
  });

  it("shows an error message and lets the user ask again", async () => {
    const ask = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: "Can't reach the demo server. Is it running?" })
      .mockResolvedValueOnce({ ok: true, answer: "Back again.", tools: [] });
    render(<AssistantChat ask={ask} />);

    fireEvent.click(screen.getByRole("button", { name: EXAMPLE_QUESTIONS[2] }));
    await waitFor(() => expect(text()).toContain("Is it running?"));

    fireEvent.change(input(), { target: { value: "Try again" } });
    fireEvent.click(sendButton());
    await waitFor(() => expect(text()).toContain("Back again."));
  });

  it("shows model text as plain text, never as HTML", async () => {
    const ask = vi.fn(() =>
      Promise.resolve({ ok: true, answer: '<img src=x onerror="alert(1)">', tools: [] })
    );
    const { container } = render(<AssistantChat ask={ask} />);

    fireEvent.click(screen.getByRole("button", { name: EXAMPLE_QUESTIONS[0] }));
    await waitFor(() => expect(text()).toContain("<img src=x"));
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders a list and a code block with a Copy button, and still no HTML", async () => {
    const answer = [
      "Use the customizer first:",
      "",
      "1. Open **Footer**",
      "2. Set `Phone number`",
      "",
      "```liquid",
      '<img src=x onerror="alert(1)">',
      "```",
    ].join("\n");
    const ask = vi.fn(() => Promise.resolve({ ok: true, answer, tools: [] }));
    const { container } = render(<AssistantChat ask={ask} />);

    fireEvent.click(screen.getByRole("button", { name: EXAMPLE_QUESTIONS[0] }));
    await waitFor(() => expect(container.querySelector("ol")).not.toBeNull());

    expect(container.querySelectorAll("ol > li")).toHaveLength(2);
    expect(container.querySelector("strong").textContent).toBe("Footer");
    expect(container.querySelector("pre code").textContent).toBe('<img src=x onerror="alert(1)">');
    expect(screen.getByRole("button", { name: "Copy code" })).toBeTruthy();
    expect(text()).toContain("Suggested code - review before using");
    expect(container.querySelector("img")).toBeNull(); // the HTML inside the code block is only text
  });

  it("shows action buttons as buttons, apart from the example chips, and calls onAction", async () => {
    const onAction = vi.fn();
    const ask = vi.fn(() =>
      Promise.resolve({
        ok: true,
        answer: "Open the footer file.",
        tools: [{ name: "theme_files" }, { name: "theme_files" }, { name: "admin_help" }],
        actions: [
          { label: "Open footer.liquid in Code editor", path: "/admin/online-store/code?file=sections%2Ffooter.liquid" },
          { label: "Open Customize", path: "/admin/online-store/customize" },
        ],
      })
    );
    render(<AssistantChat ask={ask} onAction={onAction} />);

    const chip = screen.getByRole("button", { name: EXAMPLE_QUESTIONS[1] }); // shown in the empty chat only
    fireEvent.click(screen.getByRole("button", { name: EXAMPLE_QUESTIONS[0] }));
    const open = await screen.findByRole("button", { name: "Open footer.liquid in Code editor" });

    expect(open.tagName).toBe("BUTTON");
    expect(open.className).toContain("bg-[#111827]"); // solid and dark
    expect(chip.className).not.toContain("bg-[#111827]"); // the chips stay subtle
    expect(open.querySelector("svg")).not.toBeNull(); // the small arrow

    fireEvent.click(open);
    expect(onAction).toHaveBeenCalledWith("/admin/online-store/code?file=sections%2Ffooter.liquid");

    // One small tag per tool, each shown once
    expect(text()).toContain("Used theme_files");
    expect(text()).toContain("Used admin_help");
    expect(text().match(/Used theme_files/g)).toHaveLength(1);
  });

  it("shows the calm Thinking line with three small dots", async () => {
    const request = deferred();
    const ask = vi.fn(() => request.promise);
    render(<AssistantChat ask={ask} />);
    fireEvent.click(screen.getByRole("button", { name: EXAMPLE_QUESTIONS[0] }));

    const status = screen.getByRole("status");
    expect(status.textContent).toMatch(/Thinking\.\.\. \d+s/);
    expect(status.querySelectorAll("span.animate-pulse")).toHaveLength(3);
    request.resolve({ ok: true, answer: "ok", tools: [] });
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
  });

  it("shows an error as plain text", async () => {
    const ask = vi.fn(() => Promise.resolve({ ok: false, error: "**not bold** <b>x</b>" }));
    const { container } = render(<AssistantChat ask={ask} />);
    fireEvent.click(screen.getByRole("button", { name: EXAMPLE_QUESTIONS[0] }));
    await waitFor(() => expect(text()).toContain("**not bold** <b>x</b>"));
    expect(container.querySelector("strong")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
  });

  describe("Send and Stop", () => {
    it("has a round icon-only Send button, muted while the box is empty", () => {
      render(<AssistantChat ask={vi.fn()} />);
      const send = sendButton();
      expect(send.textContent).toBe(""); // icon only
      expect(send.querySelector("svg")).not.toBeNull();
      expect(send.className).toContain("rounded-full");
      expect(send.className).toContain("h-9");
      expect(send.disabled).toBe(true);
      expect(screen.queryByRole("button", { name: "Stop" })).toBeNull();

      fireEvent.change(input(), { target: { value: "hello" } });
      expect(sendButton().disabled).toBe(false);
      fireEvent.change(input(), { target: { value: "   " } });
      expect(sendButton().disabled).toBe(true);
    });

    it("sends with Enter", async () => {
      const ask = vi.fn(() => Promise.resolve({ ok: true, answer: "ok", tools: [] }));
      render(<AssistantChat ask={ask} />);
      fireEvent.change(input(), { target: { value: "Low stock?" } });
      fireEvent.submit(input().closest("form"));
      await waitFor(() => expect(ask).toHaveBeenCalledTimes(1));
      expect(ask.mock.calls[0][0]).toBe("Low stock?");
    });

    it("shows Stop only while an answer is pending, in the place of Send", async () => {
      const request = deferred();
      render(<AssistantChat ask={vi.fn(() => request.promise)} />);
      expect(screen.queryByRole("button", { name: "Stop" })).toBeNull();

      fireEvent.click(screen.getByRole("button", { name: EXAMPLE_QUESTIONS[0] }));
      const stop = screen.getByRole("button", { name: "Stop" });
      expect(stop.className).toContain("rounded-full");
      expect(stop.querySelector("svg rect")).not.toBeNull(); // the filled square
      expect(stop.disabled).toBe(false);
      expect(screen.queryByRole("button", { name: "Send" })).toBeNull();
      expect(input().disabled).toBe(true); // still disabled while pending

      request.resolve({ ok: true, answer: "done", tools: [] });
      await waitFor(() => expect(screen.queryByRole("button", { name: "Stop" })).toBeNull());
      expect(sendButton()).toBeTruthy();
    });

    it("Stop cancels the request, shows a muted Stopped. (no error), frees and focuses the input", async () => {
      const request = deferred();
      const ask = vi.fn(() => request.promise);
      const { container } = render(<AssistantChat ask={ask} />);
      fireEvent.click(screen.getByRole("button", { name: EXAMPLE_QUESTIONS[0] }));
      const signal = ask.mock.calls[0][1];
      expect(signal.aborted).toBe(false);

      fireEvent.click(screen.getByRole("button", { name: "Stop" }));

      expect(signal.aborted).toBe(true);
      expect(screen.queryByRole("status")).toBeNull(); // no Thinking
      expect(text()).toContain("Stopped.");
      expect(container.querySelector(".bg-red-50")).toBeNull(); // not an error bubble
      expect(input().disabled).toBe(false);
      await waitFor(() => expect(document.activeElement).toBe(input()));
      expect(screen.queryByRole("button", { name: "Stop" })).toBeNull();
    });

    it("ignores an answer that arrives after Stop, and the next question works", async () => {
      const first = deferred();
      const ask = vi
        .fn()
        .mockReturnValueOnce(first.promise)
        .mockResolvedValueOnce({ ok: true, answer: "Second answer.", tools: [] });
      render(<AssistantChat ask={ask} />);

      fireEvent.click(screen.getByRole("button", { name: EXAMPLE_QUESTIONS[0] }));
      fireEvent.click(screen.getByRole("button", { name: "Stop" }));

      // The first request finishes late (the server was still working on it)
      await act(async () => {
        first.resolve({ ok: true, answer: "Late answer.", tools: [] });
        await first.promise;
      });
      expect(text()).not.toContain("Late answer.");
      expect(sendButton().disabled).toBe(true); // nothing pending, empty box

      // Ask again straight away
      fireEvent.change(input(), { target: { value: "Second question" } });
      fireEvent.click(sendButton());
      await waitFor(() => expect(text()).toContain("Second answer."));
      expect(text()).not.toContain("Late answer.");
      expect(ask).toHaveBeenCalledTimes(2);
    });

    it("an aborted result is never shown as an error", async () => {
      const ask = vi.fn(() => Promise.resolve({ ok: false, aborted: true }));
      const { container } = render(<AssistantChat ask={ask} />);
      fireEvent.click(screen.getByRole("button", { name: EXAMPLE_QUESTIONS[0] }));
      await waitFor(() => expect(ask).toHaveBeenCalled());
      expect(container.querySelector(".bg-red-50")).toBeNull();
    });
  });

  it("never reads the signed-in session", async () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    const ask = vi.fn(() => Promise.resolve({ ok: true, answer: "ok", tools: [] }));
    render(<AssistantChat ask={ask} />);

    fireEvent.click(screen.getByRole("button", { name: EXAMPLE_QUESTIONS[0] }));
    await waitFor(() => expect(text()).toContain("ok"));
    expect(getItem).not.toHaveBeenCalled();
  });
});
