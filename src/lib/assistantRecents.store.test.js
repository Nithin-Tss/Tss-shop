import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  MAX_RECENTS,
  MAX_SAVED_MESSAGES,
  MAX_SAVED_TEXT,
  chatTitle,
  createChatStore,
  slimMessage,
} from "@/lib/assistantChatStore";

const KEY = "tss-assistant-recents";

// A tiny stand-in for sessionStorage that can also run out of room
function fakeStorage({ limit = Infinity } = {}) {
  const data = new Map();
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => {
      if (String(v).length > limit) throw new Error("QuotaExceededError");
      data.set(k, String(v));
    },
    removeItem: (k) => data.delete(k),
  };
}

const answerWith = (text, extra = {}) => () => Promise.resolve({ ok: true, answer: text, tools: [], ...extra });

async function chatWith(store, ...questions) {
  for (const q of questions) await store.send(q);
}

describe("New chat", () => {
  it("moves the conversation into Recents and starts an empty one", async () => {
    const store = createChatStore(answerWith("A1"));
    await chatWith(store, "First question");

    expect(store.newChat()).toBe(true);

    const { messages, recents } = store.getState();
    expect(messages).toEqual([]);
    expect(recents).toHaveLength(1);
    expect(chatTitle(recents[0])).toBe("First question");
    expect(recents[0].messages.map((m) => m.text)).toEqual(["First question", "A1"]);
  });

  it("does nothing for an empty chat, and is refused while an answer is pending", async () => {
    let finish;
    const store = createChatStore(() => new Promise((resolve) => (finish = resolve)));
    expect(store.newChat()).toBe(false);

    store.send("Q");
    expect(store.getState().pending).toBe(true);
    expect(store.newChat()).toBe(false); // Stop it first
    expect(store.getState().messages).toHaveLength(1);
    expect(store.getState().recents).toEqual([]);

    store.stop();
    expect(store.newChat()).toBe(true); // after Stop it works
    finish({ ok: true, answer: "late", tools: [] });
  });

  it("lists the newest chat first and keeps at most 20", async () => {
    const store = createChatStore(answerWith("ok"));
    for (let i = 1; i <= MAX_RECENTS + 3; i += 1) {
      await chatWith(store, `Question ${i}`);
      store.newChat();
    }
    const { recents } = store.getState();
    expect(recents).toHaveLength(MAX_RECENTS);
    expect(chatTitle(recents[0])).toBe(`Question ${MAX_RECENTS + 3}`);
    expect(chatTitle(recents[MAX_RECENTS - 1])).toBe("Question 4");
  });
});

describe("opening, deleting and clearing Recents", () => {
  async function storeWithTwoSaved() {
    const store = createChatStore(answerWith("answer"));
    await chatWith(store, "Older question");
    store.newChat();
    await chatWith(store, "Newer question");
    store.newChat();
    return store;
  }

  it("opens a saved chat as the current one, which can be continued", async () => {
    const store = await storeWithTwoSaved();
    const older = store.getState().recents.find((c) => chatTitle(c) === "Older question");

    expect(store.openChat(older.id)).toBe(true);

    const state = store.getState();
    expect(state.messages.map((m) => m.text)).toEqual(["Older question", "answer"]);
    expect(state.recents.map(chatTitle)).toEqual(["Newer question"]); // it left the list while open
    await store.send("A follow-up");
    expect(store.getState().messages.map((m) => m.text)).toContain("A follow-up");
  });

  it("saves the conversation it replaces", async () => {
    const store = await storeWithTwoSaved();
    await chatWith(store, "Current question");
    const saved = store.getState().recents[0];

    store.openChat(saved.id);

    expect(store.getState().recents.map(chatTitle)).toEqual(["Current question", "Older question"]);
    expect(chatTitle({ messages: store.getState().messages })).toBe("Newer question");
  });

  it("is refused while pending, and for an id that does not exist", async () => {
    const store = await storeWithTwoSaved();
    expect(store.openChat("nope")).toBe(false);
    store.send("Q");
    expect(store.openChat(store.getState().recents[0].id)).toBe(false);
  });

  it("deletes one chat and clears all", async () => {
    const store = await storeWithTwoSaved();
    store.deleteChat(store.getState().recents[0].id);
    expect(store.getState().recents.map(chatTitle)).toEqual(["Older question"]);
    store.clearRecents();
    expect(store.getState().recents).toEqual([]);
  });
});

describe("what is saved", () => {
  it("keeps only text, tool names and buttons", () => {
    const saved = slimMessage({
      id: 7,
      role: "assistant",
      text: "Open the footer.",
      tools: [{ name: "theme_files", arguments: { path: "sections/footer.liquid", secret: "x" } }, { name: "theme_files" }],
      actions: [
        { label: "Open footer.liquid in Code editor", path: "/admin/online-store/code?file=sections%2Ffooter.liquid", extra: 1 },
        { label: "Evil", path: "https://evil.example" },
      ],
      startedAt: 123,
      token: "abc",
    });
    expect(saved).toEqual({
      role: "assistant",
      text: "Open the footer.",
      tools: [{ name: "theme_files" }],
      actions: [{ label: "Open footer.liquid in Code editor", path: "/admin/online-store/code?file=sections%2Ffooter.liquid" }],
    });
  });

  it("drops unknown roles and non-text", () => {
    expect(slimMessage({ role: "system", text: "x" })).toBeNull();
    expect(slimMessage({ role: "user", text: 5 })).toBeNull();
    expect(slimMessage(null)).toBeNull();
  });

  it("caps the size of a saved chat", async () => {
    const store = createChatStore(answerWith("x".repeat(MAX_SAVED_TEXT + 500)));
    for (let i = 0; i < MAX_SAVED_MESSAGES; i += 1) await store.send(`q${i}`);
    store.newChat();
    const [chat] = store.getState().recents;
    expect(chat.messages).toHaveLength(MAX_SAVED_MESSAGES);
    expect(Math.max(...chat.messages.map((m) => m.text.length))).toBeLessThanOrEqual(MAX_SAVED_TEXT + 1);
  });

  it("does not save a chat that has no question in it", () => {
    const store = createChatStore(answerWith("x"));
    expect(store.newChat()).toBe(false);
    expect(store.getState().recents).toEqual([]);
  });
});

describe("sessionStorage", () => {
  const options = (storage, owner = "a@b.c:s1") => ({ storage, storageKey: KEY, getOwner: () => owner });

  it("writes Recents (and only Recents) for the owner, and a new store reads them back", async () => {
    const storage = fakeStorage();
    const store = createChatStore(answerWith("A"), options(storage));
    await chatWith(store, "Saved question");
    expect(storage.data.size).toBe(0); // the current conversation is memory only
    store.newChat();

    const raw = JSON.parse(storage.getItem(KEY));
    expect(raw.owner).toBe("a@b.c:s1");
    expect(raw.chats).toHaveLength(1);
    expect(Object.keys(raw.chats[0]).sort()).toEqual(["id", "messages", "savedAt"]);

    const again = createChatStore(answerWith("A"), options(storage)); // a reload of the tab
    expect(again.getState().recents.map(chatTitle)).toEqual(["Saved question"]);
  });

  it("ignores saved chats that belong to someone else, or damaged data", async () => {
    const storage = fakeStorage();
    const store = createChatStore(answerWith("A"), options(storage, "a@b.c:s1"));
    await chatWith(store, "Mine");
    store.newChat();

    expect(createChatStore(answerWith("A"), options(storage, "other@x.y:s1")).getState().recents).toEqual([]);
    expect(createChatStore(answerWith("A"), options(storage, "a@b.c:s2")).getState().recents).toEqual([]);
    expect(createChatStore(answerWith("A"), options(storage, null)).getState().recents).toEqual([]);

    storage.setItem(KEY, "{not json");
    expect(createChatStore(answerWith("A"), options(storage)).getState().recents).toEqual([]);
    storage.setItem(KEY, JSON.stringify({ owner: "a@b.c:s1", chats: [{ id: 1 }, null, { id: "x", savedAt: 1, messages: [] }] }));
    expect(createChatStore(answerWith("A"), options(storage)).getState().recents).toEqual([]);
  });

  it("cleans what it reads: a tampered button path is not kept", () => {
    const storage = fakeStorage();
    storage.setItem(
      KEY,
      JSON.stringify({
        owner: "a@b.c:s1",
        chats: [
          {
            id: "c1",
            savedAt: Date.now(),
            messages: [
              { role: "user", text: "q" },
              { role: "assistant", text: "a", actions: [{ label: "x", path: "javascript:alert(1)" }], password: "p" },
            ],
          },
        ],
      })
    );
    const [chat] = createChatStore(answerWith("A"), options(storage)).getState().recents;
    expect(chat.messages[1]).toEqual({ role: "assistant", text: "a" });
  });

  it("wipe() empties memory and sessionStorage (sign-out, another store)", async () => {
    const storage = fakeStorage();
    const store = createChatStore(answerWith("A"), options(storage));
    await chatWith(store, "Q");
    store.newChat();
    await chatWith(store, "Current");
    expect(storage.data.has(KEY)).toBe(true);

    store.wipe();

    expect(store.getState().recents).toEqual([]);
    expect(store.getState().messages).toEqual([]);
    expect(storage.data.has(KEY)).toBe(false);
  });

  it("deleting and clearing keep the storage in step", async () => {
    const storage = fakeStorage();
    const store = createChatStore(answerWith("A"), options(storage));
    await chatWith(store, "One");
    store.newChat();
    await chatWith(store, "Two");
    store.newChat();
    store.deleteChat(store.getState().recents[0].id);
    expect(JSON.parse(storage.getItem(KEY)).chats).toHaveLength(1);
    store.clearRecents();
    expect(storage.data.has(KEY)).toBe(false);
  });

  it("when the browser has no room, the oldest chats are left out of the copy but the list still works", async () => {
    const storage = fakeStorage({ limit: 1500 });
    const store = createChatStore(answerWith("y".repeat(300)), options(storage));
    for (let i = 0; i < 6; i += 1) {
      await chatWith(store, `Question ${i}`);
      store.newChat();
    }
    expect(store.getState().recents).toHaveLength(6); // memory keeps all
    const saved = JSON.parse(storage.getItem(KEY)).chats;
    expect(saved.length).toBeGreaterThan(0);
    expect(saved.length).toBeLessThan(6);
    expect(chatTitle(saved[0])).toBe("Question 5"); // the newest survive
  });

  it("works with no storage at all", async () => {
    const store = createChatStore(answerWith("A"), { storage: null, getOwner: () => "x" });
    await chatWith(store, "Q");
    expect(store.newChat()).toBe(true);
    expect(store.getState().recents).toHaveLength(1);
  });

  it("copes when the storage throws", async () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    const store = createChatStore(answerWith("A"), options(broken));
    await chatWith(store, "Q");
    expect(() => store.newChat()).not.toThrow();
    expect(store.getState().recents).toHaveLength(1);
  });

  it("never touches localStorage", async () => {
    const spy = vi.spyOn(Storage.prototype, "setItem");
    const store = createChatStore(answerWith("A"), options(fakeStorage()));
    await chatWith(store, "Q");
    store.newChat();
    expect(window.localStorage.getItem(KEY)).toBeNull();
    spy.mockRestore();
    for (const file of ["./assistantChatStore.js", "./assistantApi.js"]) {
      const source = readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8");
      expect(source).not.toMatch(/localStorage\.(setItem|getItem)/);
    }
  });
});

describe("A reopened chat continues with its history", () => {
  it("sends the reopened chat's earlier turns with the next question, and not the chat it replaced", async () => {
    const ask = vi.fn((question) => Promise.resolve({ ok: true, answer: `answer to ${question}`, tools: [] }));
    const store = createChatStore(ask);
    await chatWith(store, "View all button");
    store.newChat();
    await chatWith(store, "Something else");
    const saved = store.getState().recents.find((c) => chatTitle(c) === "View all button");

    expect(store.openChat(saved.id)).toBe(true);
    await store.send("exactly which file?");

    expect(ask.mock.calls.at(-1)[2]).toEqual([
      { role: "user", content: "View all button" },
      { role: "assistant", content: "answer to View all button" },
    ]);
  });
});
