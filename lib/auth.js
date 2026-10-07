"use client";

import { useSyncExternalStore } from "react";

/*
 * FRONTEND-ONLY SESSION
 *
 * The Django login/signup endpoints don't return a session or token yet,
 * so the signed-in state is kept in the browser. Replace this with the
 * real backend session/token once it's available.
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

function subscribe(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener(SESSION_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SESSION_EVENT, callback);
  };
}

export function signIn(user = {}) {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {}

  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function signOut() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {}

  window.dispatchEvent(new Event(SESSION_EVENT));
}

// Returns the signed-in user object, or null when signed out.
export function useSession() {
  const raw = useSyncExternalStore(subscribe, readSession, () => null);

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
