import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api";
import { getActiveStore, getSession } from "@/lib/auth";

// Settings > Checkout: whether shoppers must sign in, and which customer fields the checkout asks for.
// Every change saves straight away.

const card = "rounded-2xl border border-slate-200 bg-white shadow-sm";
const linkCls = "underline hover:text-[#14130F]";

const FIELD_OPTIONS = [
  { value: "hidden", label: "Don't include" },
  { value: "optional", label: "Optional" },
  { value: "required", label: "Required" },
];
const FULL_NAME_OPTIONS = [
  { value: "first_last", label: "Require first and last name" },
  { value: "last_only", label: "Only require last name" },
];
const CONSENT_LABEL = {
  hidden: "Don't show",
  unchecked: "Show, unchecked",
  prechecked: "Show, preselected",
};

const DEFAULTS = {
  checkoutRequireLogin: false,
  checkoutFullName: "first_last",
  checkoutCompany: "hidden",
  checkoutAddress2: "optional",
  checkoutPhone: "optional",
  checkoutEmailMarketing: "unchecked",
  checkoutSmsMarketing: "hidden",
};

function Select({ value, options, onChange, label, disabled }) {
  return (
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-[#14130F] hover:bg-slate-200 disabled:opacity-60"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Row({ title, action }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <div className="text-sm text-[#14130F]">{title}</div>
      {action}
    </div>
  );
}

export default function CheckoutSettings({ onOpenSection }) {
  const storeId = getActiveStore(getSession())?.storeId;
  const [values, setValues] = useState(DEFAULTS);
  const [loading, setLoading] = useState(Boolean(storeId));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    apiGet(`/api/v1/stores/${storeId}/`).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        const next = {};
        for (const key of Object.keys(DEFAULTS)) next[key] = res.data[key] ?? DEFAULTS[key];
        setValues(next);
      } else {
        setMessage({ type: "error", text: res.error || "Could not load checkout settings." });
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  const update = async (patch) => {
    if (!storeId) return;
    const previous = values;
    setValues({ ...values, ...patch });
    setSaving(true);
    setMessage(null);
    const res = await apiPatch(`/api/v1/stores/${storeId}/`, patch);
    setSaving(false);
    if (res.ok) {
      setMessage({ type: "ok", text: "Saved." });
    } else {
      setValues(previous);
      setMessage({
        type: "error",
        text:
          res.status === 403
            ? "You don't have permission to change these settings."
            : res.formError || res.error || "Could not save.",
      });
    }
  };

  if (loading) return <p className="text-sm text-slate-500">Loading checkout settings…</p>;

  return (
    <div className="flex flex-col gap-8">
      {message && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === "ok"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#14130F]">Customer contact method</h2>
          <p className="text-sm text-slate-500">
            Customers enter their email at checkout to receive order and shipping notifications.
          </p>
        </div>
        <section className={`${card} px-5 py-4`}>
          <label className="flex items-start gap-3 text-sm text-[#14130F]">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[#14130F]"
              checked={values.checkoutRequireLogin}
              disabled={saving}
              onChange={(e) => update({ checkoutRequireLogin: e.target.checked })}
            />
            <span>
              Require customers to sign in to their account before checkout
              <span className="block text-slate-500">
                Shoppers who aren&apos;t signed in are sent to the{" "}
                <button
                  type="button"
                  className={linkCls}
                  onClick={() => onOpenSection?.("Customer accounts")}
                >
                  customer account
                </button>{" "}
                sign-in page first.
              </span>
            </span>
          </label>
        </section>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[#14130F]">Customer information</h2>
        <section className={`${card} divide-y divide-slate-100`}>
          <Row
            title="Full name"
            action={
              <Select
                label="Full name"
                value={values.checkoutFullName}
                options={FULL_NAME_OPTIONS}
                disabled={saving}
                onChange={(v) => update({ checkoutFullName: v })}
              />
            }
          />
          <Row
            title="Company name"
            action={
              <Select
                label="Company name"
                value={values.checkoutCompany}
                options={FIELD_OPTIONS}
                disabled={saving}
                onChange={(v) => update({ checkoutCompany: v })}
              />
            }
          />
          <Row
            title="Address line 2 (apartment, unit, etc.)"
            action={
              <Select
                label="Address line 2"
                value={values.checkoutAddress2}
                options={FIELD_OPTIONS}
                disabled={saving}
                onChange={(v) => update({ checkoutAddress2: v })}
              />
            }
          />
          <Row
            title="Shipping address phone number"
            action={
              <Select
                label="Shipping address phone number"
                value={values.checkoutPhone}
                options={FIELD_OPTIONS}
                disabled={saving}
                onChange={(v) => update({ checkoutPhone: v })}
              />
            }
          />
        </section>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#14130F]">Marketing opt-in</h2>
          <p className="text-sm text-slate-500">
            Show a checkbox for customers to sign up for marketing
          </p>
        </div>
        <section className={`${card} divide-y divide-slate-100`}>
          <Row
            title="Email"
            action={
              <span className="text-sm text-slate-600">
                {CONSENT_LABEL[values.checkoutEmailMarketing]}
              </span>
            }
          />
          <Row
            title="SMS"
            action={
              <span className="text-sm text-slate-600">
                {CONSENT_LABEL[values.checkoutSmsMarketing]}
              </span>
            }
          />
        </section>
        <p className="text-sm text-slate-500">
          Change these in{" "}
          <button
            type="button"
            className={linkCls}
            onClick={() => onOpenSection?.("Customer privacy")}
          >
            customer privacy settings
          </button>
          .
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[#14130F]">Checkout language</h2>
        <section className={card}>
          <Row
            title="Translate your checkout in each language you sell in"
            action={
              <button
                type="button"
                onClick={() => onOpenSection?.("Languages")}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-[#14130F] hover:bg-slate-200"
              >
                Manage languages
              </button>
            }
          />
        </section>
      </div>
    </div>
  );
}
