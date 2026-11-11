import { useSyncExternalStore } from "react";
import { apiGet } from "@/lib/api";

/*
 * FEATURE FLAGS
 *
 * The backend decides (apps/platform_admin/flags.py): a platform admin switches a flag, rolls it out
 * to a percentage of stores, or overrides it for one store (Platform admin → Feature flags).
 * GET /api/v1/feature-flags/ answers for the active store: { flags: { api_keys: true, ... } }.
 *
 * Until that answer arrives (and for visitors who are signed out, which the endpoint refuses),
 * the defaults below apply; VITE_FLAG_<NAME>=true|false in .env overrides a default.
 * The backend still enforces its flags; these only hide what it would refuse.
 *
 *   const flagsOn = useFlags();            // in a component: re-renders when the flags change
 *   {flagsOn("api_keys") && <ApiKeys />}
 */

// Keep in step with REGISTRY in the backend's flags.py
const defaults = {
  blog: true,
  api_keys: true,
  ai_page_builder: false, // AI page builder: off unless the platform enables it for the store
  help_assistant: false, // Help chat widget + "Talk to a human": off unless the platform enables it for the store
};

function fromEnv(name, fallback) {
  const value = import.meta.env[`VITE_FLAG_${name.toUpperCase()}`];
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}

let fromServer = {};
const listeners = new Set();

function publish(next) {
  fromServer = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => fromServer;

export function isEnabled(name) {
  if (name in fromServer) return Boolean(fromServer[name]);
  return fromEnv(name, defaults[name] ?? false);
}

// Re-renders the component whenever the flags change; returns isEnabled
export function useFlags() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return isEnabled;
}

export function useFlag(name) {
  return useFlags()(name);
}

// Ask the backend for the active store's flags. A failed request keeps the last answer.
export async function loadFlags() {
  const res = await apiGet("/api/v1/feature-flags/");
  if (res.ok && res.data?.flags) publish(res.data.flags);
}

// Signed out or no store: back to the defaults
export function clearFlags() {
  if (Object.keys(fromServer).length) publish({});
}
