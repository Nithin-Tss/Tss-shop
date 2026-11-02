import { useSyncExternalStore } from "react";
import { cleanActions } from "@/lib/assistantActions";

// A chat that lives outside React, so its history (and a question still being answered) survives closing
// the panel and moving between admin pages, each of which mounts its own sidebar. The current conversation is
// memory only. Earlier conversations ("Recents") are also kept in sessionStorage, so they survive a page
// reload of this tab but not closing it. Never localStorage.
//
// `ask(question, signal, history)` gets the last few turns of THIS conversation as text (see buildHistory), so a
// follow-up is understood. It resolves { ok: true, answer, tools, actions } or { ok: false, error }
// ({ ok: false, aborted: true } when it was cancelled).
//
// options.storage / storageKey / getOwner: where Recents are kept, and who owns them. Without them nothing is
// saved anywhere. A saved list that belongs to someone else (another account or store) is ignored.

export const MAX_RECENTS = 20;
export const MAX_SAVED_MESSAGES = 30;
export const MAX_SAVED_TEXT = 4000;
const ROLES = new Set(["user", "assistant", "error", "note"]);

// A message as it is saved: its text, the names of the tools it used and its buttons. Nothing else
// (not the tools' arguments, not ids, not timings).
export function slimMessage(message) {
  if (!message || !ROLES.has(message.role) || typeof message.text !== "string") return null;
  const text =
    message.text.length > MAX_SAVED_TEXT ? `${message.text.slice(0, MAX_SAVED_TEXT)}…` : message.text;
  const saved = { role: message.role, text };

  const names = (Array.isArray(message.tools) ? message.tools : [])
    .map((tool) => (typeof tool === "string" ? tool : tool?.name))
    .filter((name) => typeof name === "string" && /^[a-z_]{1,40}$/.test(name));
  if (names.length) saved.tools = [...new Set(names)].slice(0, 8).map((name) => ({ name }));

  const actions = cleanActions(message.actions);
  if (actions.length) saved.actions = actions;
  return saved;
}

export function slimMessages(messages) {
  return (Array.isArray(messages) ? messages : [])
    .map(slimMessage)
    .filter(Boolean)
    .slice(0, MAX_SAVED_MESSAGES);
}

// What a saved chat is called: its first question
export function chatTitle(chat) {
  const first = chat.messages.find((message) => message.role === "user");
  return (first?.text || "").replace(/\s+/g, " ").trim() || "Chat";
}

function cleanChat(chat) {
  if (!chat || typeof chat.id !== "string" || typeof chat.savedAt !== "number") return null;
  const messages = slimMessages(chat.messages);
  if (!messages.some((message) => message.role === "user")) return null;
  return { id: chat.id, savedAt: chat.savedAt, messages };
}

let chatCounter = 0;
const newChatId = () => `chat-${Date.now().toString(36)}-${(chatCounter += 1)}`;

// What the server may read of the conversation so far: the last few exchanges, text only. Never tool names,
// buttons, errors or "Stopped." notes, and each text and the total are capped. The server checks it again.
export const HISTORY_EXCHANGES = 3;
export const MAX_HISTORY_ITEM_CHARS = 800;
export const MAX_HISTORY_TOTAL_CHARS = 3000;

export function buildHistory(messages) {
  const turns = (Array.isArray(messages) ? messages : [])
    .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.text === "string" && m.text.trim())
    .map((m) => ({ role: m.role, content: m.text.trim().slice(0, MAX_HISTORY_ITEM_CHARS) }))
    .slice(-HISTORY_EXCHANGES * 2);
  // Over the total: drop the oldest turns first, so the latest answer is kept
  let total = turns.reduce((sum, turn) => sum + turn.content.length, 0);
  while (turns.length && total > MAX_HISTORY_TOTAL_CHARS) total -= turns.shift().content.length;
  return turns;
}

export function createChatStore(ask, options = {}) {
  const { storage = null, storageKey = "tss-assistant-recents", getOwner = () => null } = options;

  const loadRecents = () => {
    try {
      const owner = getOwner();
      const raw = storage?.getItem(storageKey);
      if (!owner || !raw) return [];
      const saved = JSON.parse(raw);
      if (saved?.owner !== owner || !Array.isArray(saved.chats)) return [];
      return saved.chats.map(cleanChat).filter(Boolean).slice(0, MAX_RECENTS);
    } catch {
      return [];
    }
  };

  let state = { messages: [], pending: false, startedAt: 0, open: false, recents: loadRecents() };
  let generation = 0; // bumped by reset() and stop(): an answer that arrives after it is dropped
  let nextId = 1;
  let controller = null;
  const listeners = new Set();

  const set = (patch) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };
  const add = (message) => [...state.messages, { id: nextId++, ...message }];

  // Keep Recents in sessionStorage. If the browser is out of room, the oldest chats are left out of the copy.
  const persist = () => {
    if (!storage) return;
    try {
      const owner = getOwner();
      if (!owner || state.recents.length === 0) {
        storage.removeItem(storageKey);
        return;
      }
      let chats = state.recents;
      for (;;) {
        try {
          storage.setItem(storageKey, JSON.stringify({ owner, chats }));
          return;
        } catch {
          if (chats.length <= 1) {
            storage.removeItem(storageKey);
            return;
          }
          chats = chats.slice(0, -1);
        }
      }
    } catch {
      // storage is not available: Recents stay in memory only
    }
  };

  // The current conversation, added to the front of Recents (if it has a question in it)
  const withCurrent = () => {
    if (!state.messages.some((message) => message.role === "user")) return state.recents;
    const chat = { id: newChatId(), savedAt: Date.now(), messages: slimMessages(state.messages) };
    return [chat, ...state.recents].slice(0, MAX_RECENTS);
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getState: () => state,
    setOpen: (open) => set({ open }),
    toggle: () => set({ open: !state.open }),

    async send(text) {
      const question = String(text ?? "").trim();
      if (!question || state.pending) return;

      const mine = generation;
      const history = buildHistory(state.messages); // before the new question is added
      controller = new AbortController();
      set({
        messages: add({ role: "user", text: question }),
        pending: true,
        startedAt: Date.now(),
      });

      let reply;
      try {
        const result = await ask(question, controller.signal, history);
        if (result.aborted) return; // stop() or reset() has already moved on
        reply = result.ok
          ? {
              role: "assistant",
              text: result.answer || "I don't have that data.",
              tools: result.tools,
              actions: result.actions,
            }
          : { role: "error", text: result.error };
      } catch (error) {
        if (error?.name === "AbortError") return;
        reply = { role: "error", text: "Something went wrong. Please try again." };
      }

      if (mine !== generation) return; // cleared or stopped while waiting
      controller = null;
      set({ messages: add(reply), pending: false });
    },

    // Stop waiting for the answer. The question stays, a muted "Stopped." follows it, and an answer that still
    // arrives is ignored (the generation moved on). Not an error.
    stop() {
      if (!state.pending) return;
      generation += 1;
      controller?.abort();
      controller = null;
      set({ messages: add({ role: "note", text: "Stopped." }), pending: false });
    },

    // New chat: the conversation so far goes into Recents (if it has a question) and an empty one starts.
    // Refused while an answer is pending (Stop it first). Returns true when something was done.
    newChat() {
      if (state.pending || state.messages.length === 0) return false;
      set({ recents: withCurrent(), messages: [] });
      persist();
      return true;
    },

    // Open a chat from Recents as the current conversation (it can be continued: the assistant reads its last
    // few turns, see buildHistory). The conversation it replaces goes
    // into Recents. Refused while an answer is pending.
    openChat(id) {
      const chat = state.recents.find((item) => item.id === id);
      if (state.pending || !chat) return false;
      const recents = withCurrent().filter((item) => item.id !== id);
      set({
        recents,
        messages: chat.messages.map((message) => ({ id: nextId++, ...message })),
      });
      persist();
      return true;
    },

    deleteChat(id) {
      set({ recents: state.recents.filter((item) => item.id !== id) });
      persist();
    },

    clearRecents() {
      set({ recents: [] });
      persist();
    },

    // Forget the conversation (keeps the open/closed state and Recents)
    reset() {
      generation += 1;
      controller?.abort();
      controller = null;
      set({ messages: [], pending: false });
    },

    // Forget everything, saved chats included (sign-out, or another store)
    wipe() {
      generation += 1;
      controller?.abort();
      controller = null;
      set({ messages: [], pending: false, recents: [] });
      persist();
    },
  };
}

export function useChatStore(store) {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
