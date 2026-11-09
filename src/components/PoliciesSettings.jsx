import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api";
import { getActiveStore, getSession } from "@/lib/auth";
import { RichTextEditor } from "@/pages/AdminAddCollection";
import { announceThemeChange } from "@/lib/themeSync";

// Settings > Policies: return and cancellation rules (saved on the store) and the written policies.
// Each written policy with text goes live on its own page of the storefront (/pages/<handle>).

const POLICIES = [
  ["privacyPolicy", "Privacy policy"],
  ["refundPolicy", "Return and refund policy"],
  ["termsOfService", "Terms of service"],
  ["shippingPolicy", "Shipping policy"],
  ["contactInformation", "Contact information"],
  ["legalNotice", "Legal notice"],
];

const CANCELLATION_WINDOWS = [
  [15, "15 minutes"],
  [30, "30 minutes"],
  [60, "1 hour"],
  [120, "2 hours"],
  [360, "6 hours"],
  [720, "12 hours"],
  [1440, "1 day"],
  [2880, "2 days"],
  [4320, "3 days"],
  [10080, "7 days"],
];

const DEFAULT_RULES = {
  returnsEnabled: false,
  returnWindowDays: 7,
  returnWindowStartsFrom: "delivery",
  returnWindowExtendWeekends: false,
  returnShipping: "free",
  restockingFeePercent: "0",
  cancellationsEnabled: true,
  cancellationWindowMinutes: 60,
};
const RULE_KEYS = Object.keys(DEFAULT_RULES);

const fieldClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-600 disabled:bg-slate-50 disabled:text-slate-400";
const labelClass = "mb-1 block text-sm font-medium text-ink";

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-ink" : "bg-slate-300"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? "left-[22px]" : "left-0.5"}`}
      />
    </button>
  );
}

function Card({ title, hint, enabled, onToggle, children, note }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{hint}</p>
        </div>
        <Toggle checked={enabled} onChange={onToggle} label={title} />
      </div>
      {enabled && <div className="grid gap-4 p-5 sm:grid-cols-2">{children}</div>}
      {note && <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">{note}</p>}
    </section>
  );
}

export default function PoliciesSettings() {
  const storeId = getActiveStore(getSession())?.storeId;
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [policies, setPolicies] = useState({}); // key -> html being edited
  const [saved, setSaved] = useState({}); // key -> { handle, url, visible } as stored
  const [loading, setLoading] = useState(Boolean(storeId));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: "ok" | "error", text }

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    Promise.all([
      apiGet(`/api/v1/stores/${storeId}/`),
      apiGet(`/api/v1/stores/${storeId}/policies/`),
    ]).then(([store, written]) => {
      if (cancelled) return;
      if (store.ok) {
        setRules(Object.fromEntries(RULE_KEYS.map((k) => [k, store.data[k] ?? DEFAULT_RULES[k]])));
      }
      if (written.ok) {
        setSaved(written.data);
        setPolicies(Object.fromEntries(POLICIES.map(([k]) => [k, written.data[k]?.body ?? ""])));
      }
      if (!store.ok || !written.ok) {
        setMessage({
          type: "error",
          text: store.error || written.error || "Could not load policies.",
        });
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  const setRule = (key) => (value) => setRules((r) => ({ ...r, [key]: value }));
  const noLimit = rules.returnWindowDays === null;

  const save = async () => {
    if (!storeId || saving) return;
    setSaving(true);
    setMessage(null);
    const body = Object.fromEntries(POLICIES.map(([k]) => [k, policies[k] ?? ""]));
    const ruleRes = await apiPatch(`/api/v1/stores/${storeId}/`, {
      ...rules,
      returnWindowDays: noLimit ? null : Number(rules.returnWindowDays) || 1,
      cancellationWindowMinutes: Number(rules.cancellationWindowMinutes),
      restockingFeePercent: String(rules.restockingFeePercent || 0),
    });
    const policyRes = ruleRes.ok
      ? await apiPatch(`/api/v1/stores/${storeId}/policies/`, body)
      : null;
    setSaving(false);

    if (ruleRes.ok && policyRes?.ok) {
      setSaved(policyRes.data);
      announceThemeChange("pages"); // an open Customize / Pages screen shows the new pages
      setMessage({ type: "ok", text: "Policies saved." });
      return;
    }
    const failed = policyRes && !policyRes.ok ? policyRes : ruleRes;
    const detail = Object.entries(failed.fieldErrors || {})
      .map(([k, v]) => `${k}: ${v}`)
      .join(" ");
    setMessage({
      type: "error",
      text:
        failed.status === 403
          ? "You don't have permission to change these settings."
          : [failed.formError || failed.error || "Could not save policies.", detail]
              .filter(Boolean)
              .join(" "),
    });
  };

  if (loading) return <p className="text-sm text-slate-500">Loading policies…</p>;

  const windowOptions = CANCELLATION_WINDOWS.some(([m]) => m === rules.cancellationWindowMinutes)
    ? CANCELLATION_WINDOWS
    : [
        ...CANCELLATION_WINDOWS,
        [rules.cancellationWindowMinutes, `${rules.cancellationWindowMinutes} minutes`],
      ];

  return (
    <div className="flex flex-col gap-6">
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

      <Card
        title="Return rules"
        hint="Applied to fulfilled items in an order"
        enabled={rules.returnsEnabled}
        onToggle={setRule("returnsEnabled")}
        note="Return rules apply to items purchased after the rules were turned on or updated."
      >
        <label>
          <span className={labelClass}>Return window</span>
          <select
            className={fieldClass}
            value={noLimit ? "none" : "custom"}
            onChange={(e) => setRule("returnWindowDays")(e.target.value === "none" ? null : 7)}
          >
            <option value="custom">Custom</option>
            <option value="none">No time limit</option>
          </select>
        </label>
        <label>
          <span className={labelClass}>Duration (days)</span>
          <input
            type="number"
            min={1}
            max={365}
            className={fieldClass}
            disabled={noLimit}
            value={noLimit ? "" : rules.returnWindowDays}
            onChange={(e) => setRule("returnWindowDays")(e.target.value)}
          />
        </label>
        <div>
          <label>
            <span className={labelClass}>Starting from</span>
            <select
              className={fieldClass}
              value={rules.returnWindowStartsFrom}
              onChange={(e) => setRule("returnWindowStartsFrom")(e.target.value)}
              disabled={noLimit}
            >
              <option value="delivery">Delivery of item</option>
              <option value="fulfillment">Fulfillment of item</option>
              <option value="order">Order date</option>
            </select>
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={rules.returnWindowExtendWeekends}
              disabled={noLimit}
              onChange={(e) => setRule("returnWindowExtendWeekends")(e.target.checked)}
            />
            Extend to account for weekends or holidays
          </label>
        </div>
        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
          <label>
            <span className={labelClass}>Return shipping</span>
            <select
              className={fieldClass}
              value={rules.returnShipping}
              onChange={(e) => setRule("returnShipping")(e.target.value)}
            >
              <option value="free">Free return shipping</option>
              <option value="customer_pays">Customer pays return shipping</option>
            </select>
          </label>
          <label>
            <span className={labelClass}>Restocking fee (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              className={fieldClass}
              value={rules.restockingFeePercent}
              onChange={(e) => setRule("restockingFeePercent")(e.target.value)}
            />
          </label>
        </div>
      </Card>

      <Card
        title="Cancellation rules"
        hint="Applied to unfulfilled items in an order. Shoppers can cancel from their account within this window; staff are not limited."
        enabled={rules.cancellationsEnabled}
        onToggle={setRule("cancellationsEnabled")}
        note="Cancellation rules apply to orders placed after the rules were turned on or updated."
      >
        <label>
          <span className={labelClass}>Cancellation window</span>
          <select
            className={fieldClass}
            value={rules.cancellationWindowMinutes}
            onChange={(e) => setRule("cancellationWindowMinutes")(Number(e.target.value))}
          >
            {windowOptions.map(([minutes, text]) => (
              <option key={minutes} value={minutes}>
                {text}
              </option>
            ))}
          </select>
        </label>
      </Card>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-base font-semibold text-ink">Store policies</h2>
          <p className="mt-1 text-sm text-slate-500">
            A policy with text is published on its own page of your store. Leave it empty to hide
            the page.
          </p>
        </div>
        <div className="grid gap-6 p-5">
          {POLICIES.map(([key, title]) => {
            const info = saved[key];
            return (
              <div key={key}>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor={`policy-${key}`} className="text-sm font-medium text-ink">
                    {title}
                  </label>
                  {info?.visible ? (
                    <a
                      href={info.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-slate-500 underline hover:text-orange-600"
                    >
                      View page ↗
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">
                      Not published · /pages/{info?.handle}
                    </span>
                  )}
                </div>
                <RichTextEditor
                  id={`policy-${key}`}
                  value={policies[key] ?? ""}
                  onChange={(html) => setPolicies((p) => ({ ...p, [key]: html }))}
                  placeholder={`Write your ${title.toLowerCase()}…`}
                />
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600/90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
