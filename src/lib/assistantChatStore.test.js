import { describe, expect, it, vi } from "vitest";

import {
  MAX_HISTORY_ITEM_CHARS,
  MAX_HISTORY_TOTAL_CHARS,
  buildHistory,
  createChatStore,
} from "@/lib/assistantChatStore";

function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const answer = (text) => ({ ok: true, answer: text, tools: [{ name: "sales_summary" }] });

describe("createChatStore", () => {
  it("keeps the question and the answer", async () => {
    const store = createChatStore(vi.fn(() => Promise.resolve(answer("Net sales were ₹26,600."))));

    await store.send("  How were sales?  ");

    const { messages, pending } = store.getState();
    expect(pending).toBe(false);
    expect(messages.map((m) => [m.role, m.text])).toEqual([
      ["user", "How were sales?"],
      ["assistant", "Net sales were ₹26,600."],
    ]);
    expect(messages[1].tools).toEqual([{ name: "sales_summary" }]);
  });

  it("is pending while it waits, and ignores a second question meanwhile", async () => {
    const request = deferred();
    const ask = vi.fn(() => request.promise);
    const store = createChatStore(ask);

    const first = store.send("one");
    expect(store.getState().pending).toBe(true);
    expect(store.getState().startedAt).toBeGreaterThan(0);
    await store.send("two");
    expect(ask).toHaveBeenCalledTimes(1);

    request.resolve(answer("done"));
    await first;
    expect(store.getState().messages).toHaveLength(2);
  });

  it("does not send an empty question", async () => {
    const ask = vi.fn();
    const store = createChatStore(ask);
    await store.send("   ");
    expect(ask).not.toHaveBeenCalled();
    expect(store.getState().messages).toEqual([]);
  });

  it("shows errors as messages, and can be asked again", async () => {
    const ask = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: "Is Ollama running?" })
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(answer("fine"));
    const store = createChatStore(ask);

    await store.send("a");
    await store.send("b");
    await store.send("c");

    const roles = store.getState().messages.map((m) => m.role);
    expect(roles).toEqual(["user", "error", "user", "error", "user", "assistant"]);
    expect(store.getState().messages[1].text).toBe("Is Ollama running?");
  });

  it("drops an answer that arrives after the chat was cleared", async () => {
    const request = deferred();
    const store = createChatStore(() => request.promise);

    const sending = store.send("old store question");
    store.reset();
    request.resolve(answer("answer for the old store"));
    await sending;

    expect(store.getState().messages).toEqual([]);
    expect(store.getState().pending).toBe(false);
  });

  it("aborts the waiting request when cleared", async () => {
    let signal;
    const store = createChatStore((_, s) => {
      signal = s;
      return new Promise(() => {});
    });

    store.send("hi");
    store.reset();

    expect(signal.aborted).toBe(true);
  });

  it("keeps the open state when cleared, and notifies listeners", () => {
    const store = createChatStore(vi.fn());
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.setOpen(true);
    store.reset();
    expect(store.getState().open).toBe(true);
    store.toggle();
    expect(store.getState().open).toBe(false);
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    store.toggle();
    expect(listener).toHaveBeenCalledTimes(3);
  });

  describe("stop", () => {
    it("aborts the request, ends pending and adds a muted note, not an error", async () => {
      let signal;
      let finish;
      const store = createChatStore((_q, s) => {
        signal = s;
        return new Promise((resolve) => {
          finish = resolve;
        });
      });
      store.send("Q");
      expect(store.getState().pending).toBe(true);

      store.stop();

      expect(signal.aborted).toBe(true);
      const state = store.getState();
      expect(state.pending).toBe(false);
      expect(state.messages.map((m) => [m.role, m.text])).toEqual([
        ["user", "Q"],
        ["note", "Stopped."],
      ]);
      finish({ ok: true, answer: "late", tools: [] });
      await Promise.resolve();
    });

    it("drops a late answer, and a late failure, after stop", async () => {
      const finishers = [];
      const store = createChatStore(() => new Promise((resolve) => finishers.push(resolve)));
      store.send("one");
      store.stop();
      finishers[0]({ ok: true, answer: "late answer", tools: [] });
      await new Promise((r) => setTimeout(r, 0));
      expect(store.getState().messages.map((m) => m.text)).toEqual(["one", "Stopped."]);

      store.send("two");
      store.stop();
      finishers[1]({ ok: false, error: "late failure" });
      await new Promise((r) => setTimeout(r, 0));
      expect(store.getState().messages.map((m) => m.text)).not.toContain("late failure");
    });

    it("lets the next question through straight after stop, and only its answer is kept", async () => {
      const finishers = [];
      const store = createChatStore(() => new Promise((resolve) => finishers.push(resolve)));
      store.send("one");
      store.stop();
      store.send("two");
      expect(store.getState().pending).toBe(true);

      finishers[0]({ ok: true, answer: "answer one", tools: [] }); // the cancelled one finishes first
      await new Promise((r) => setTimeout(r, 0));
      expect(store.getState().pending).toBe(true); // still waiting for "two"
      finishers[1]({ ok: true, answer: "answer two", tools: [] });
      await new Promise((r) => setTimeout(r, 0));

      const texts = store.getState().messages.map((m) => m.text);
      expect(texts).toContain("answer two");
      expect(texts).not.toContain("answer one");
      expect(store.getState().pending).toBe(false);
    });

    it("does nothing when nothing is pending", () => {
      const store = createChatStore(() => Promise.resolve({ ok: true, answer: "a", tools: [] }));
      store.stop();
      expect(store.getState().messages).toEqual([]);
    });

    it("treats an aborted result as nothing to show", async () => {
      const store = createChatStore(() => Promise.resolve({ ok: false, aborted: true }));
      await store.send("Q");
      expect(store.getState().messages.map((m) => m.role)).toEqual(["user"]);
    });
  });
});

describe("conversation history", () => {
  const msg = (role, text, extra = {}) => ({ role, text, ...extra });

  it("sends nothing for the first question, then the earlier turns in order without the new question", async () => {
    const ask = vi.fn(() => Promise.resolve(answer("Three files.")));
    const store = createChatStore(ask);

    await store.send("add a View all button");
    expect(ask.mock.calls[0][2]).toEqual([]);

    await store.send("exactly which file?");
    expect(ask.mock.calls[1][2]).toEqual([
      { role: "user", content: "add a View all button" },
      { role: "assistant", content: "Three files." },
    ]);
  });

  it("keeps only the last 3 exchanges (6 turns)", async () => {
    const ask = vi.fn(() => Promise.resolve(answer("a")));
    const store = createChatStore(ask);
    for (const q of ["q1", "q2", "q3", "q4", "q5"]) await store.send(q);

    const history = ask.mock.calls[4][2];
    expect(history).toHaveLength(6);
    expect(history.map((h) => h.content)).toEqual(["q2", "a", "q3", "a", "q4", "a"]);
  });

  it("leaves out errors, notes, tool names and buttons", () => {
    const history = buildHistory([
      msg("user", "q"),
      msg("error", "Something went wrong."),
      msg("note", "Stopped."),
      msg("assistant", "a", {
        tools: [{ name: "theme_files" }],
        actions: [{ label: "Open", path: "/admin/x" }],
      }),
    ]);
    expect(history).toEqual([
      { role: "user", content: "q" },
      { role: "assistant", content: "a" },
    ]);
  });

  it("caps each text and the total, dropping the oldest turns first", () => {
    const long = "x".repeat(MAX_HISTORY_ITEM_CHARS + 500);
    expect(buildHistory([msg("user", long)])[0].content).toHaveLength(MAX_HISTORY_ITEM_CHARS);

    const turns = Array.from({ length: 6 }, (_, i) =>
      msg(i % 2 ? "assistant" : "user", `${i}`.repeat(MAX_HISTORY_ITEM_CHARS))
    );
    const history = buildHistory(turns);
    const total = history.reduce((sum, h) => sum + h.content.length, 0);
    expect(total).toBeLessThanOrEqual(MAX_HISTORY_TOTAL_CHARS);
    expect(history.at(-1).content.startsWith("5")).toBe(true);
    expect(history[0].content.startsWith("0")).toBe(false);
  });

  it("is empty for anything that is not a message list", () => {
    expect(buildHistory(undefined)).toEqual([]);
    expect(buildHistory([null, { role: "user", text: 5 }, msg("user", "   ")])).toEqual([]);
  });

  it("does not send the history of a chat that was cleared", async () => {
    const ask = vi.fn(() => Promise.resolve(answer("a")));
    const store = createChatStore(ask);
    await store.send("one");
    store.reset();
    await store.send("two");
    expect(ask.mock.calls[1][2]).toEqual([]);
  });
});
