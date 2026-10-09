
import { useSyncExternalStore } from "react";

/*
 * SESSION
 *
 * After sign-in/sign-up the backend returns { access, refresh, user, stores }.
 * - access (JWT, 15 min) is sent on every request: Authorization: Bearer <access>
 * - refresh (JWT, 7-30 days) is only used to get a new access token
 *   (see apiRequest in lib/api.js)
 * Plus X-Store-Id: <current store>.
 *
 * Shape: { token (= access), refresh, name, email, user, stores: [...], storeId }
 */

// Where every "Create store" / "Start free" button leads
export const ONBOARDING_PATH = "/auth/onboarding";

const SESSION_KEY = "store_session";
const SESSION_EVENT = "store-session-change";

function readSession() {
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function writeSession(session) {
  try {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {}

  window.dispatchEvent(new Event(SESSION_EVENT));
}

function subscribe(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener(SESSION_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SESSION_EVENT, callback);
  };
}

export function getSession() {
  const raw = readSession();

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// `data` is the backend's sign-in/sign-up response: { access, refresh, user, stores }
export function signIn(data) {
  const user = data.user || {};
  const stores = data.stores || [];

  writeSession({
    token: data.access,
    refresh: data.refresh,
    name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
    email: user.email,
    user,
    stores,
    storeId: stores[0]?.storeId || null,
  });
}

export function signOut() {
  writeSession(null);
}

export function getToken() {
  return getSession()?.token || null;
}

export function getRefreshToken() {
  return getSession()?.refresh || null;
}

// After /auth/refresh/: keep the session, swap in the new tokens
export function setTokens({ access, refresh }) {
  const session = getSession();

  if (session) writeSession({ ...session, token: access, refresh });
}

export function getStoreId() {
  return getSession()?.storeId || null;
}

// Remember a newly created store and make it the current one
export function addStore(store) {
  const session = getSession();

  if (!session) return;

  const stores = [...(session.stores || []).filter((s) => s.storeId !== store.storeId), store];
  writeSession({ ...session, stores, storeId: store.storeId });
}

// Returns the signed-in session object, or null when signed out.
export function useSession() {
  const raw = useSyncExternalStore(subscribe, readSession, () => null);

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
