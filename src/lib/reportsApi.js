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
