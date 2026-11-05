import { useEffect, useState } from "react";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";

// Settings > Payments: two ways to get paid out — a direct bank account, or the
// store's own Stripe account (Stripe Connect). The backend enforces permissions.
export default function PaymentsSettings() {
  return (
    <div className="space-y-5">
      <BankPayoutSettings />
      <StripeSettings />
    </div>
  );
}

const fieldClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-300";

const EMPTY_BANK = {
  account_holder_name: "",
  bank_name: "",
  account_number: "",
  routing_code: "",
  currency: "USD",
};

function BankPayoutSettings() {
  const [saved, setSaved] = useState(null); // API shape, or { configured: false }
  const [form, setForm] = useState(EMPTY_BANK);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let cancelled = false;
    apiGet("/api/v1/payments/bank-payout/").then((res) => {
      if (cancelled) return;
      if (res.ok) setSaved(res.data);
      else setError(res.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const startEdit = () => {
    setForm({
      ...EMPTY_BANK,
      ...(saved?.configured
        ? {
            account_holder_name: saved.account_holder_name,
            bank_name: saved.bank_name,
            routing_code: saved.routing_code,
            currency: saved.currency,
          }
        : {}),
    });
    setFieldErrors({});
    setError("");
    setEditing(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setFieldErrors({});
    const res = await apiPut("/api/v1/payments/bank-payout/", form);
    setSaving(false);
    if (!res.ok) {
      setFieldErrors(res.fieldErrors || {});
      setError(res.formError || (Object.keys(res.fieldErrors || {}).length ? "" : res.error));
      return;
    }
    setSaved(res.data);
    setEditing(false);
  };

  const remove = async () => {
    if (!window.confirm("Remove your bank details? Payouts to this account will stop.")) return;
    setSaving(true);
    const res = await apiDelete("/api/v1/payments/bank-payout/");
    setSaving(false);
    if (res.ok) setSaved({ configured: false });
    else setError(res.error);
  };

  const field = (key, label, props = {}) => (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        value={form[key]}
        onChange={set(key)}
        className={fieldClass}
        aria-invalid={Boolean(fieldErrors[key])}
        {...props}
      />
      {fieldErrors[key] && <span className="mt-1 block text-xs text-red-700">{fieldErrors[key]}</span>}
    </label>
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-5">
        <h2 className="text-lg font-semibold text-[#14130F]">Bank account payout</h2>
        <p className="mt-1 text-sm text-slate-500">
          Add your bank details and we'll send your store's earnings straight to your account.
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
        ) : editing ? (
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {field("account_holder_name", "Account holder name", { required: true, autoComplete: "name" })}
              {field("bank_name", "Bank name", { required: true })}
              {field("account_number", "Account number / IBAN", {
                required: !saved?.configured,
                placeholder: saved?.configured ? `•••• ${saved.account_last4} (leave blank to keep)` : "",
                autoComplete: "off",
              })}
              {field("routing_code", "Routing / sort code / IFSC", { required: true, autoComplete: "off" })}
              {field("currency", "Currency", { required: true, maxLength: 3 })}
            </div>
            <p className="text-xs text-slate-500">
              Your full account number is stored securely and never shown again after saving.
            </p>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[#14130F] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1A1916] disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save bank details"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : saved?.configured ? (
          <>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Account holder</dt>
                <dd className="font-medium text-slate-800">{saved.account_holder_name}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Bank</dt>
                <dd className="font-medium text-slate-800">{saved.bank_name}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Account</dt>
                <dd className="font-medium text-slate-800">•••• {saved.account_last4}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Routing / sort code</dt>
                <dd className="font-medium text-slate-800">{saved.routing_code}</dd>
              </div>
            </dl>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={startEdit}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={saving}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                Remove
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-700">No bank account added.</p>
            <button
              type="button"
              onClick={startEdit}
              className="rounded-lg bg-[#14130F] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1A1916]"
            >
              Add bank account
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function StripeSettings() {
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState({ publishable_key: "", secret_key: "", webhook_secret: "" });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

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

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Sends the keys; the server checks them with Stripe before connecting
  const connect = async (e) => {
    e.preventDefault();
    setWorking(true);
    setError("");
    setFieldErrors({});
    const res = await apiPost("/api/v1/payments/stripe/connect/", form);
    setWorking(false);
    if (!res.ok) {
      setFieldErrors(res.fieldErrors || {});
      setError(res.formError || (Object.keys(res.fieldErrors || {}).length ? "" : res.error));
      return;
    }
    setStatus(res.data);
    setForm({ publishable_key: "", secret_key: "", webhook_secret: "" });
    setEditing(false);
  };

  const disconnect = async () => {
    if (!window.confirm("Disconnect Stripe? Your store will stop taking card payments.")) return;
    setWorking(true);
    const res = await apiDelete("/api/v1/payments/stripe/connect/");
    setWorking(false);
    if (res.ok) setStatus(res.data);
    else setError(res.error);
  };

  const input = (key, label, props = {}) => (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        value={form[key]}
        onChange={set(key)}
        className={fieldClass}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={Boolean(fieldErrors[key])}
        {...props}
      />
      {fieldErrors[key] && <span className="mt-1 block text-xs text-red-700">{fieldErrors[key]}</span>}
    </label>
  );

  const connected = status?.connected;
  const ready = status?.charges_enabled;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-5">
        <h2 className="text-lg font-semibold text-[#14130F]">Stripe</h2>
        <p className="mt-1 text-sm text-slate-500">
          Accept cards and wallets at checkout. Enter the API keys from your Stripe dashboard
          (Developers → API keys). We check them with Stripe before connecting, and payments go
          straight to your own Stripe account.
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
        ) : editing || !connected ? (
          <form onSubmit={connect} className="space-y-4">
            {input("publishable_key", "Publishable key", {
              required: true,
              placeholder: "pk_live_… or pk_test_…",
            })}
            {input("secret_key", "Secret key", {
              required: true,
              type: "password",
              placeholder: "sk_live_… or sk_test_…",
            })}
            {input("webhook_secret", "Webhook signing secret (optional)", {
              type: "password",
              placeholder: "whsec_…",
            })}
            <p className="text-xs text-slate-500">
              Use matching keys (both test or both live). Your secret key is encrypted and never shown
              again. Leave the webhook secret blank and we'll register the webhook for you; if you add
              it yourself in Stripe, point it at the URL shown after connecting.
            </p>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={working}
                className="rounded-lg bg-[#14130F] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1A1916] disabled:opacity-60"
              >
                {working ? "Verifying with Stripe…" : "Verify and connect"}
              </button>
              {connected && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        ) : (
          <>
            <p className="text-sm text-slate-700">
              {ready
                ? `Connected in ${status.livemode ? "live" : "test"} mode. Your store can take card payments.`
                : "Keys verified, but this Stripe account can't take payments yet. Finish setting it up in your Stripe dashboard."}
            </p>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Publishable key</dt>
                <dd className="truncate font-medium text-slate-800">{status.publishable_key}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Secret key</dt>
                <dd className="font-medium text-slate-800">••••{status.secret_key_last4}</dd>
              </div>
            </dl>
            {!status.webhook_configured && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Webhook not set up, so payments can't be confirmed automatically.
                {status.webhook_url
                  ? ` In Stripe, add an endpoint for ${status.webhook_url} and paste its signing secret by updating your keys.`
                  : " The server's public URL isn't configured yet."}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Update keys
              </button>
              <button
                type="button"
                onClick={disconnect}
                disabled={working}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
