import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

// Settings > Payments: connect the store's own Stripe account (Stripe Connect).
// Only the owner reaches this; the backend enforces it as well.
export default function PaymentsSettings() {
  const [status, setStatus] = useState(null); // { connected, charges_enabled, details_submitted }
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiGet("/api/v1/payments/stripe/connect/").then((res) => {
      if (cancelled) return;
      if (res.ok) setStatus(res.data);
      else setError(res.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = async () => {
    setWorking(true);
    setError("");
    const res = await apiPost("/api/v1/payments/stripe/connect/", {});
    if (res.ok) {
      window.location.assign(res.data.url); // Stripe's hosted onboarding
      return;
    }
    setError(res.formError || "Could not reach Stripe. Please try again.");
    setWorking(false);
  };

  const ready = status?.charges_enabled;
  const pending = status?.connected && !ready;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-5">
        <h2 className="text-lg font-semibold text-[#14130F]">Stripe</h2>
        <p className="mt-1 text-sm text-slate-500">
          Accept cards and wallets at checkout. Payments go straight to your own Stripe account.
        </p>
      </div>
      <div className="space-y-4 px-5 py-5">
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <>
            <p className="text-sm text-slate-700">
              {ready
                ? "Connected. Your store can take card payments."
                : pending
                  ? "Your Stripe account isn't ready to take payments yet. Finish setting it up."
                  : "Not connected."}
            </p>
            {!ready && (
              <button
                type="button"
                onClick={connect}
                disabled={working}
                className="rounded-lg bg-[#14130F] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1A1916] disabled:opacity-60"
              >
                {working ? "Opening Stripe…" : pending ? "Continue setup" : "Connect Stripe"}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
