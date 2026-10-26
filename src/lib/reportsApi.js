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
export function useOverview(days = 30) {
  const [state, setState] = useState({ days: null, data: null, error: "" });

  useEffect(() => {
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
  }, [days]);

  // Still loading until the answer for this range has arrived
  return { data: state.data, error: state.error, loading: state.days !== days };
}
