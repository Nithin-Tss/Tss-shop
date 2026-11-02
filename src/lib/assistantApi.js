import { apiPost } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getEditingThemeId } from "@/lib/editingTheme";
import { cleanActions } from "@/lib/assistantActions";
import { createChatStore } from "@/lib/assistantChatStore";

// The real assistant: the signed-in member's own store, through the normal API client
// (session token and X-Store-Id header). Slow on purpose: a local model takes 30-120 seconds,
// so there is no client-side timeout here (the browser and the server decide).
// The buttons the server offers are checked in lib/assistantActions.js (also used for saved chats)
export { cleanActions };

// Resolves { ok: true, answer, tools, actions }, { ok: false, error } or { ok: false, aborted: true }.
// `signal` (an AbortSignal) cancels the request. `history` is the last few turns of this chat as
// [{ role: "user" | "assistant", content }] (see buildHistory); it is left out of the request when empty.
export async function askAssistant(message, signal, history = []) {
  // The theme being edited, so a question about theme code is answered from that theme (the server checks
  // it is one of this store's own themes, and falls back to the published one)
  const themeId = getEditingThemeId();
  const body = Array.isArray(history) && history.length ? { message, history } : { message };
  const res = await apiPost(
    "/api/v1/assistant/chat/",
    body,
    themeId ? { "X-Theme-Id": themeId } : {},
    signal
  );

  // Stopped by the person: not an error, and nothing to show (the chat store has already moved on)
  if (res.aborted) return { ok: false, aborted: true };

  if (!res.ok) {
    if (res.status === 404) {
      return { ok: false, error: "The assistant isn't turned on for this server." };
    }
    return { ok: false, error: res.formError || "Something went wrong. Please try again." };
  }
  return {
    ok: true,
    answer: String(res.data?.answer ?? ""),
    tools: Array.isArray(res.data?.tools) ? res.data.tools : [],
    actions: cleanActions(res.data?.actions),
  };
}

// Who the conversation belongs to: one person in one store (a token refresh is not a change)
function ownerOf(session) {
  return session?.token ? `${session.email}:${session.storeId}` : null;
}

// sessionStorage keeps Recents across a page reload of this tab (gone when the tab closes). Never localStorage.
function tabStorage() {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

// One conversation for the whole admin (see AssistantPanel for when it is shown), and its Recents
export const assistantStore = createChatStore(askAssistant, {
  storage: tabStorage(),
  storageKey: "tss-assistant-recents",
  getOwner: () => ownerOf(getSession()),
});

// Everything (the conversation and Recents, in memory and in sessionStorage) is forgotten when the person
// signs out or the store changes.
let lastOwner;
export function syncAssistantOwner() {
  const owner = ownerOf(getSession());
  if (lastOwner !== undefined && owner !== lastOwner) assistantStore.wipe();
  lastOwner = owner;
}

// Sign-out happens on pages that have no sidebar, so watch the session here, not in a component
if (typeof window !== "undefined") {
  // "store-session-change" is lib/auth.js's own event; "storage" covers another tab
  window.addEventListener("store-session-change", syncAssistantOwner);
  window.addEventListener("storage", syncAssistantOwner);
  syncAssistantOwner();
}
