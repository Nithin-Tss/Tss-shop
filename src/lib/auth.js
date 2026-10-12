
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
// The active store's id, kept on its own so it survives sign-out/sign-in (lib/api.js reads it too)
const STORE_KEY = "tss-store-id";
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

function readSavedStoreId() {
  try {
    return window.localStorage.getItem(STORE_KEY);
  } catch {
    return null;
  }
}

function saveStoreId(storeId) {
  try {
    if (storeId) window.localStorage.setItem(STORE_KEY, storeId);
    else window.localStorage.removeItem(STORE_KEY);
  } catch {}
}

// The saved store if the user still has it, otherwise their first store
function pickStoreId(stores, preferred) {
  if (preferred && stores.some((s) => s.storeId === preferred)) return preferred;
  return stores[0]?.storeId || null;
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
  const storeId = pickStoreId(stores, readSavedStoreId());
  saveStoreId(storeId);

  writeSession({
    token: data.access,
    refresh: data.refresh,
    name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
    email: user.email,
    user,
    stores,
    storeId,
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

// After the profile changes (or /auth/me/ is re-read): keep the session, swap in the new user
export function setUser(user) {
  const session = getSession();

  if (!session) return;

  writeSession({
    ...session,
    name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
    email: user.email,
    user,
  });
}

export function getStoreId() {
  return getSession()?.storeId || null;
}

// Remember a newly created store and make it the current one
export function addStore(store) {
  const session = getSession();

  if (!session) return;

  const stores = [...(session.stores || []).filter((s) => s.storeId !== store.storeId), store];
  saveStoreId(store.storeId);
  writeSession({ ...session, stores, storeId: store.storeId });
}

// Switch the store every admin page works on
export function setActiveStore(storeId) {
  const session = getSession();

  if (!session || !session.stores?.some((s) => s.storeId === storeId)) return;

  saveStoreId(storeId);
  writeSession({ ...session, storeId });
}

// Replace the store list (after a fetch, rename or delete), keeping the active store when it's still there
export function setStores(stores) {
  const session = getSession();

  if (!session) return;

  const storeId = pickStoreId(stores, session.storeId);
  saveStoreId(storeId);
  writeSession({ ...session, stores, storeId });
}

export function getActiveStore(session) {
  return session?.stores?.find((s) => s.storeId === session.storeId) || null;
}

/*
 * PERMISSIONS
 *
 * Each store in the session carries the user's role there and what it allows,
 * e.g. { role: "staff", permissions: ["orders.view", "orders.manage", ...] }
 * (the backend's apps/core/rbac.py). The backend checks every request; these
 * only hide what it would refuse.
 */

// Does the user's role in `store` allow `permission`?
export function storeCan(store, permission) {
  // A session saved before stores carried permissions: show everything until the store list is re-read
  if (!Array.isArray(store?.permissions)) return true;
  return store.permissions.includes(permission);
}

// ...in the active store
export function can(session, permission) {
  return storeCan(getActiveStore(session), permission);
}

export function useCan(permission) {
  return can(useSession(), permission);
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
