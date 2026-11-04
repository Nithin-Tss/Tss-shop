import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

export function formatMoney(amount, currency) {
  const value = Number(amount) || 0;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: currency || "INR" }).format(
      value
    );
  } catch {
    return value.toFixed(2);
  }
}

// The store overview: totals, a daily sales series and recent activity.
// Returns { data, loading, error }.
// Pass `enabled: false` to skip the request (e.g. for roles that can't view reports).
export function useOverview(days = 30, enabled = true) {
  const [state, setState] = useState({ days: null, data: null, error: "" });

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    apiGet(`/api/v1/reports/overview/?days=${days}`).then((res) => {
      if (cancelled) return;
      setState(
        res.ok ? { days, data: res.data, error: "" } : { days, data: null, error: res.error }
      );
    });
    return () => {
      cancelled = true;
    };
  }, [days, enabled]);

  // Still loading until the answer for this range has arrived
  return { data: state.data, error: state.error, loading: enabled && state.days !== days };
}

// The Analytics dashboard figures for a date range (YYYY-MM-DD, in the store timezone).
// `reloadKey` changes to force a refetch. Returns { data, loading, error }.
export function useAnalytics({ from, to, compare, currency, reloadKey = 0 }) {
  const [state, setState] = useState({ key: null, data: null, error: "" });
  const key = [from, to, compare, currency, reloadKey].join("|");

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ compare });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (currency) params.set("currency", currency);
    apiGet(`/api/v1/reports/analytics/?${params}`).then((res) => {
      if (cancelled) return;
      setState(res.ok ? { key, data: res.data, error: "" } : { key, data: null, error: res.error });
    });
    return () => {
      cancelled = true;
    };
  }, [key, from, to, compare, currency]);

  // Keep showing the last answer while a refresh is in flight
  return { data: state.data, error: state.error, loading: state.key !== key };
}

// The Live View figures, refetched every `intervalMs`. Returns { data, error, loading }.
export function useLive(intervalMs = 10_000) {
  const [state, setState] = useState({ data: null, error: "", loaded: false });

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      apiGet("/api/v1/reports/live/").then((res) => {
        if (cancelled) return;
        // Keep the last answer on screen when a refresh fails
        setState((prev) =>
          res.ok
            ? { data: res.data, error: "", loaded: true }
            : { data: prev.data, error: res.error, loaded: true }
        );
      });
    load();
    const timer = setInterval(load, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [intervalMs]);

  return { data: state.data, error: state.error, loading: !state.loaded };
}

// Query string for a report: dates, comparison, sorting, page and filters (empty values left out).
export function reportQuery(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  return query.toString();
}

// One built-in report (rows for one page, totals, chart). Returns { data, loading, error }.
export function useReport(id, params) {
  const [state, setState] = useState({ key: null, data: null, error: "" });
  const query = reportQuery(params);
  const key = `${id}?${query}`;

  useEffect(() => {
    let cancelled = false;
    apiGet(`/api/v1/reports/${id}/?${query}`).then((res) => {
      if (cancelled) return;
      setState(res.ok ? { key, data: res.data, error: "" } : { key, data: null, error: res.error });
    });
    return () => {
      cancelled = true;
    };
  }, [id, query, key]);

  return { data: state.data, error: state.error, loading: state.key !== key };
}
