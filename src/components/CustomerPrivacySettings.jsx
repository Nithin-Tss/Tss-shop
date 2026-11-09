import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api";
import { getActiveStore, getSession } from "@/lib/auth";

// Settings > Customer privacy: privacy settings (policy, cookie banner, data-sharing opt-out page,
// network intelligence), marketing consent at checkout, and where customer data is stored.
// Each change saves straight away; rows with options open a detail view.

const DEFAULTS = {
  cookieBanner: "automated",
  dataSharingOptOut: "automated",
  networkIntelligence: true,
  checkoutEmailMarketing: "unchecked",
  checkoutSmsMarketing: "hidden",
  doubleOptInEmail: false,
  doubleOptInSms: false,
  backupRegion: "",
};
const KEYS = Object.keys(DEFAULTS);

const PRIVACY_MODES = [
  ["automated", "Automated", "Shown only to visitors from regions where the law requires it."],
  ["always", "Always show", "Shown to every visitor, whatever their region."],
  ["off", "Off", "Never shown. You are responsible for meeting the privacy laws where you sell."],
];
const CONSENT_MODES = [
  ["hidden", "Don't ask", "Customers are not asked for marketing consent at checkout."],
  ["unchecked", "Ask, unchecked", "A checkbox is shown and customers opt in themselves."],
  ["prechecked", "Ask, pre-checked", "The checkbox starts ticked. Not permitted in some regions."],
];

const card = "rounded-2xl border border-slate-200 bg-white shadow-sm";
const modeLabel = (modes, v) => modes.find(([k]) => k === v)?.[1] ?? v;

function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60 ${checked ? "bg-ink" : "bg-slate-300"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? "left-[22px]" : "left-0.5"}`}
      />
    </button>
  );
}

function Badge({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-ink">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
      {children}
    </span>
  );
}

function Row({ title, hint, badge, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50"
    >
      <span>
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="block text-sm text-slate-500">{hint}</span>
      </span>
      <span className="flex items-center gap-3">
        {badge}
        <span aria-hidden="true" className="text-slate-400">
          ›
        </span>
      </span>
    </button>
  );
}

function RadioGroup({ legend, value, modes, onChange, disabled }) {
  return (
    <fieldset className="grid gap-2" disabled={disabled}>
      <legend className="mb-2 text-sm font-medium text-ink">{legend}</legend>
      {modes.map(([key, title, hint]) => (
        <label
          key={key}
          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${
            value === key
              ? "border-orange-600 bg-slate-50"
              : "border-slate-200 hover:border-slate-400"
          }`}
        >
          <input
            type="radio"
            name={legend}
            className="mt-1"
            checked={value === key}
            onChange={() => onChange(key)}
          />
          <span>
            <span className="block font-medium text-ink">{title}</span>
            <span className="block text-slate-500">{hint}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

export default function CustomerPrivacySettings({ onOpenSection }) {
  const storeId = getActiveStore(getSession())?.storeId;
  const [values, setValues] = useState(DEFAULTS);
  const [loading, setLoading] = useState(Boolean(storeId));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [view, setView] = useState("main"); // main | cookie | optout | checkout | optin

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    apiGet(`/api/v1/stores/${storeId}/`).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setValues(Object.fromEntries(KEYS.map((k) => [k, res.data[k] ?? DEFAULTS[k]])));
      } else {
        setMessage({ type: "error", text: res.error || "Could not load privacy settings." });
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

  if (loading) return <p className="text-sm text-slate-500">Loading privacy settings…</p>;

  const banner = message && (
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
  );

  const detail = (title, children) => (
    <div className="flex flex-col gap-6">
      <div>
        <button
          type="button"
          onClick={() => {
            setView("main");
            setMessage(null);
          }}
          className="text-sm text-slate-500 hover:text-orange-600"
        >
          ← Customer privacy
        </button>
        <h2 className="mt-2 text-lg font-semibold text-ink">{title}</h2>
      </div>
      {banner}
      <section className={`${card} grid gap-6 p-5`}>{children}</section>
    </div>
  );

  if (view === "cookie") {
    return detail(
      "Cookie banner",
      <RadioGroup
        legend="Show the cookie banner"
        value={values.cookieBanner}
        modes={PRIVACY_MODES}
        disabled={saving}
        onChange={(v) => update({ cookieBanner: v })}
      />
    );
  }
  if (view === "optout") {
    return detail(
      "Data sharing opt out page",
      <RadioGroup
        legend="Offer the data sharing opt out page"
        value={values.dataSharingOptOut}
        modes={PRIVACY_MODES}
        disabled={saving}
        onChange={(v) => update({ dataSharingOptOut: v })}
      />
    );
  }
  if (view === "checkout") {
    return detail(
      "E-mail and SMS marketing in checkout",
      <>
        <RadioGroup
          legend="E-mail marketing"
          value={values.checkoutEmailMarketing}
          modes={CONSENT_MODES}
          disabled={saving}
          onChange={(v) => update({ checkoutEmailMarketing: v })}
        />
        <RadioGroup
          legend="SMS marketing"
          value={values.checkoutSmsMarketing}
          modes={CONSENT_MODES}
          disabled={saving}
          onChange={(v) => update({ checkoutSmsMarketing: v })}
        />
      </>
    );
  }
  if (view === "optin") {
    return detail(
      "Double opt-in for marketing",
      <>
        <p className="text-sm text-slate-500">
          Ask new subscribers to confirm their contact details before they receive marketing.
        </p>
        {[
          [
            "doubleOptInEmail",
            "E-mail",
            "Send a confirmation e-mail with a link to verify the address.",
          ],
          ["doubleOptInSms", "SMS", "Send a confirmation text the customer must reply to."],
        ].map(([key, title, hint]) => (
          <div key={key} className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-ink">{title}</div>
              <div className="text-sm text-slate-500">{hint}</div>
            </div>
            <Toggle
              checked={values[key]}
              label={`Double opt-in for ${title}`}
              disabled={saving}
              onChange={(v) => update({ [key]: v })}
            />
          </div>
        ))}
      </>
    );
  }

  const doubleOptInOn = values.doubleOptInEmail || values.doubleOptInSms;
  const consentSummary = [values.checkoutEmailMarketing, values.checkoutSmsMarketing].every(
    (v) => v === "hidden"
  )
    ? "Customers are not asked for marketing preferences"
    : "Ask your customers for their marketing preferences";

  return (
    <div className="flex flex-col gap-8">
      {banner}

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-ink">Privacy settings</h2>
        <section className={`${card} divide-y divide-slate-100`}>
          <Row
            title="Privacy policy"
            hint="Edit the policy published on your online store"
            onClick={() => onOpenSection?.("Policies")}
          />
          <Row
            title="Cookie banner"
            hint={
              values.cookieBanner === "automated"
                ? "Shown only in regions where it's required"
                : values.cookieBanner === "always"
                  ? "Shown to all visitors"
                  : "Not shown"
            }
            badge={<Badge>{modeLabel(PRIVACY_MODES, values.cookieBanner)}</Badge>}
            onClick={() => setView("cookie")}
          />
          <Row
            title="Data sharing opt out page"
            hint={
              values.dataSharingOptOut === "automated"
                ? "Offered only in regions where it's required"
                : values.dataSharingOptOut === "always"
                  ? "Offered to all visitors"
                  : "Not offered"
            }
            badge={<Badge>{modeLabel(PRIVACY_MODES, values.dataSharingOptOut)}</Badge>}
            onClick={() => setView("optout")}
          />
        </section>

        <section className={`${card} flex items-center justify-between gap-4 px-5 py-4`}>
          <div className="flex items-center gap-3 text-sm font-medium text-ink">
            Network intelligence
            <Badge>{values.networkIntelligence ? "Enabled" : "Disabled"}</Badge>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => update({ networkIntelligence: !values.networkIntelligence })}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-ink hover:bg-slate-50 disabled:opacity-60"
          >
            {values.networkIntelligence ? "Disable" : "Enable"}
          </button>
        </section>
        <p className="text-sm text-slate-500">
          {values.networkIntelligence
            ? "Your customer data is securely used with other platform data to improve products, ad targeting, and personalization for your store. No other merchant can see your data."
            : "Your customer data is not used to improve products, ad targeting, or personalization."}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-ink">Marketing settings</h2>
        <section className={`${card} divide-y divide-slate-100`}>
          <Row
            title="E-mail and SMS marketing in checkout"
            hint={consentSummary}
            onClick={() => setView("checkout")}
          />
          <Row
            title="Double opt-in for marketing"
            hint="Ask your customers to confirm their contact details"
            badge={doubleOptInOn ? <Badge>On</Badge> : null}
            onClick={() => setView("optin")}
          />
        </section>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-ink">Data storage hosting location</h2>
        <section className={`${card} px-5 py-4 text-sm text-ink`}>
          {values.backupRegion || "Not set"}
        </section>
      </div>

      <p className="text-sm text-slate-500">
        Recommended privacy settings are for your convenience. Compliance with laws and regulations
        is your responsibility.
      </p>
    </div>
  );
}
