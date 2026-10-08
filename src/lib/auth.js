
import { useSyncExternalStore } from "react";

/*
 * SESSION
 *
 * After sign-in/sign-up the backend returns { token, user, stores }.
 * It's kept in localStorage so the API helpers can send
 *   Authorization: Bearer <token>   and   X-Store-Id: <current store>
 *
 * Shape: { token, name, email, user, stores: [...], storeId }
 */

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

// `data` is the backend's sign-in/sign-up response: { token, user, stores }
export function signIn(data) {
  const user = data.user || {};
  const stores = data.stores || [];

  writeSession({
    token: data.token,
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
