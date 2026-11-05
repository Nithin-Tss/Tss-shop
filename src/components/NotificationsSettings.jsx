import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { useCan } from "@/lib/auth";

/*
 * Settings → Notifications. Who the store's emails come from, which customer events send one,
 * and who on the team is told about new orders (the backend's apps/notifications).
 */

const SETTINGS = "/api/v1/notifications/settings/";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-300 disabled:bg-slate-50";
const primaryButton =
  "rounded-lg bg-[#14130F] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1A1916] disabled:opacity-60";
const secondaryButton =
  "rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60";

const CUSTOMER_EVENTS = [
  ["customer_order_confirmation", "Order confirmation", "Sent when a customer places an order"],
  ["customer_order_cancelled", "Order cancelled", "Sent when an order is cancelled"],
  ["customer_order_refunded", "Refund", "Sent when a payment is refunded, in part or in full"],
  [
    "customer_shipment_delivered",
    "Shipment delivered",
    "Sent when a delivery partner marks a shipment delivered",
  ],
];

const STAFF_EVENTS = [
  ["staff_new_order", "New order", "Tell staff when an order is placed"],
  ["staff_order_cancelled", "Order cancelled", "Tell staff when an order is cancelled"],
];

const EMPTY = {
  sender_name: "",
  reply_to_email: "",
  email_footer: "",
  staff_recipients: [],
  ...Object.fromEntries([...CUSTOMER_EVENTS, ...STAFF_EVENTS].map(([key]) => [key, false])),
};

function Card({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold text-[#14130F]">{title}</h2>
      {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Toggle({ checked, disabled, onChange, label, hint }) {
  return (
    <label
      className={`flex items-start justify-between gap-4 py-3 ${disabled ? "opacity-60" : "cursor-pointer"}`}
    >
      <span>
        <span className="block text-sm font-medium text-[#14130F]">{label}</span>
        <span className="block text-sm text-slate-500">{hint}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-[#14130F]"
      />
    </label>
  );
}

export default function NotificationsSettings() {
  const canManage = useCan("notifications.manage");

  const [form, setForm] = useState(EMPTY);
  const [recipientsText, setRecipientsText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [message, setMessage] = useState(null); // { tone: "ok" | "error", text }
  const [fieldErrors, setFieldErrors] = useState({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!canManage) {
      Promise.resolve().then(() => setLoading(false));
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const res = await apiGet(SETTINGS);
      if (cancelled) return;
      if (res.ok && res.data) {
        setForm({ ...EMPTY, ...res.data });
        setRecipientsText((res.data.staff_recipients ?? []).join(", "));
        setDirty(false);
      } else {
        setMessage({ tone: "error", text: res.error || "Could not load notification settings." });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [canManage]);

  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setMessage(null);
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setFieldErrors({});
    const staff_recipients = recipientsText
      .split(/[\s,;]+/)
      .map((email) => email.trim())
      .filter(Boolean);
    const { updated_at, ...rest } = form; // eslint-disable-line no-unused-vars
    const res = await apiPatch(SETTINGS, { ...rest, staff_recipients });
    setSaving(false);
    if (!res.ok) {
      setFieldErrors(res.fieldErrors || {});
      setMessage({ tone: "error", text: res.formError || "Please fix the highlighted fields." });
      return;
    }
    setForm({ ...EMPTY, ...res.data });
    setRecipientsText((res.data.staff_recipients ?? []).join(", "));
    setDirty(false);
    setMessage({ tone: "ok", text: "Notification settings saved." });
  };

  const sendTest = async () => {
    setTesting(true);
    setMessage(null);
    const res = await apiPost(`${SETTINGS}test/`, testTo.trim() ? { email: testTo.trim() } : {});
    setTesting(false);
    if (!res.ok) {
      setMessage({
        tone: "error",
        text: res.fieldErrors?.email || res.formError || "Could not send the test email.",
      });
      return;
    }
    setMessage({
      tone: "ok",
      text: `Test email sent to ${res.data?.to ?? "you"}. Save first to test unsaved changes.`,
    });
  };

  if (!canManage) {
    return (
      <Card title="Notifications">
        <p className="text-sm text-slate-500">
          You don't have permission to change notification settings.
        </p>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card title="Notifications">
        <p className="text-sm text-slate-500">Loading…</p>
      </Card>
    );
  }

  const fieldError = (name) =>
    fieldErrors[name] ? <p className="mt-1 text-xs text-red-600">{fieldErrors[name]}</p> : null;

  return (
    <div className="space-y-5">
      {message ? (
        <div
          role="status"
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.tone === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <Card title="Sender" description="How your store's emails appear to customers.">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Sender name
            <input
              className={`${inputClass} mt-1.5 font-normal`}
              value={form.sender_name}
              maxLength={100}
              placeholder="Your store name"
              onChange={(e) => set("sender_name", e.target.value)}
            />
            {fieldError("sender_name")}
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Reply-to email
            <input
              type="email"
              className={`${inputClass} mt-1.5 font-normal`}
              value={form.reply_to_email}
              placeholder="support@yourstore.com"
              onChange={(e) => set("reply_to_email", e.target.value)}
            />
            {fieldError("reply_to_email")}
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Customers see the sender name, and replies go to the reply-to email (your store's contact
          email if blank). The address emails are sent from is set by the server.
        </p>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Email footer
          <input
            className={`${inputClass} mt-1.5 font-normal`}
            value={form.email_footer}
            maxLength={500}
            placeholder="e.g. Questions? Reply to this email."
            onChange={(e) => set("email_footer", e.target.value)}
          />
          {fieldError("email_footer")}
        </label>
      </Card>

      <Card
        title="Customer notifications"
        description="Emails sent to the customer on order and delivery events."
      >
        <div className="divide-y divide-slate-100">
          {CUSTOMER_EVENTS.map(([key, label, hint]) => (
            <Toggle
              key={key}
              label={label}
              hint={hint}
              checked={Boolean(form[key])}
              onChange={(v) => set(key, v)}
            />
          ))}
        </div>
      </Card>

      <Card title="Staff notifications" description="Emails sent to your team.">
        <div className="divide-y divide-slate-100">
          {STAFF_EVENTS.map(([key, label, hint]) => (
            <Toggle
              key={key}
              label={label}
              hint={hint}
              checked={Boolean(form[key])}
              onChange={(v) => set(key, v)}
            />
          ))}
        </div>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Recipients
          <textarea
            rows={2}
            className={`${inputClass} mt-1.5 font-normal`}
            value={recipientsText}
            placeholder="orders@yourstore.com, manager@yourstore.com"
            onChange={(e) => {
              setRecipientsText(e.target.value);
              setDirty(true);
              setMessage(null);
            }}
          />
          {fieldError("staff_recipients")}
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Separate addresses with commas. Up to 10. If empty, your store's contact email is used
            (then the store owners).
          </span>
        </label>
      </Card>

      <Card
        title="Send a test email"
        description="Check how your sender name and reply-to look in an inbox."
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            className={inputClass}
            value={testTo}
            placeholder="Your email (default: the account you're signed in with)"
            onChange={(e) => setTestTo(e.target.value)}
          />
          <button
            type="button"
            className={`${secondaryButton} shrink-0`}
            onClick={sendTest}
            disabled={testing || saving}
          >
            {testing ? "Sending…" : "Send test"}
          </button>
        </div>
      </Card>

      <div className="flex justify-end">
        <button type="button" className={primaryButton} onClick={save} disabled={saving || !dirty}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
