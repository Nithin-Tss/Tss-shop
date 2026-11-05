import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPatch } from "@/lib/api";
import { getActiveStore, getSession } from "@/lib/auth";

// Settings > Customer accounts: sign-in links, and the account features (configuration, order
// actions, authentication, store credit, account URL). Toggles save straight away.

const card = "rounded-2xl border border-slate-200 bg-white shadow-sm";

function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60 ${checked ? "bg-[#14130F]" : "bg-slate-300"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? "left-[22px]" : "left-0.5"}`}
      />
    </button>
  );
}

function Pill({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-[#14130F] hover:bg-slate-200"
    >
      {children}
    </button>
  );
}

function Row({ title, hint, action }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div>
        <div className="text-sm font-medium text-[#14130F]">{title}</div>
        <div className="text-sm text-slate-500">{hint}</div>
      </div>
      {action}
    </div>
  );
}

function Info({ children }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-sky-50 px-4 py-3 text-sm text-slate-700">
      <span aria-hidden="true" className="mt-0.5 text-sky-500">
        ⓘ
      </span>
      <span>{children}</span>
    </div>
  );
}

const linkCls = "underline hover:text-[#14130F]";

export default function CustomerAccountsSettings({ onOpenSection }) {
  const navigate = useNavigate();
  const store = getActiveStore(getSession());
  const storeId = store?.storeId;
  const [values, setValues] = useState({ showSignInLinks: true, storeCreditEnabled: true });
  const [domain, setDomain] = useState(store?.domain || "");
  const [loading, setLoading] = useState(Boolean(storeId));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    apiGet(`/api/v1/stores/${storeId}/`).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setValues({
          showSignInLinks: res.data.showSignInLinks ?? true,
          storeCreditEnabled: res.data.storeCreditEnabled ?? true,
        });
        if (res.data.domain) setDomain(res.data.domain);
      } else {
        setMessage({
          type: "error",
          text: res.error || "Could not load customer account settings.",
        });
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

  if (loading) return <p className="text-sm text-slate-500">Loading customer accounts…</p>;

  const accountUrl = domain ? `https://${domain}/account` : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(accountUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

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
        <h2 className="text-sm font-semibold text-[#14130F]">Sign-in links</h2>
        <section className={card}>
          <Row
            title="Show sign-in links"
            hint="Show sign-in links in the header of online store and at checkout"
            action={
              <Toggle
                checked={values.showSignInLinks}
                label="Show sign-in links"
                disabled={saving}
                onChange={(v) => update({ showSignInLinks: v })}
              />
            }
          />
        </section>
        <Info>
          Whether customers must sign in before checking out is set in{" "}
          <button type="button" className={linkCls} onClick={() => onOpenSection?.("Checkout")}>
            checkout settings
          </button>
          .
        </Info>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[#14130F]">Customer accounts</h2>
        <section className={`${card} divide-y divide-slate-100`}>
          <Row
            title="Configurations"
            hint="Configure apps, branding, and features for checkout and customer accounts"
            action={
              <Pill onClick={() => navigate("/admin/online-store/customize")}>Customize</Pill>
            }
          />
          <Row
            title="Order actions"
            hint={
              <>
                Allow customers to buy again, return, or cancel. Set conditions with{" "}
                <button
                  type="button"
                  className={linkCls}
                  onClick={() => onOpenSection?.("Policies")}
                >
                  returns and cancellation rules
                </button>
                .
              </>
            }
            action={<Pill onClick={() => onOpenSection?.("Policies")}>Manage</Pill>}
          />
          <div className="px-5 pb-4">
            <Info>
              Link to customer accounts from your{" "}
              <button type="button" className={linkCls} onClick={() => onOpenSection?.("Policies")}>
                written return and refund policy
              </button>{" "}
              or footer so customers can request returns from more places.
            </Info>
          </div>
        </section>

        <section className={`${card} divide-y divide-slate-100`}>
          <Row
            title="Authentication"
            hint="Manage sign-in methods and account access"
            action={<Pill onClick={() => onOpenSection?.("Customer privacy")}>Manage</Pill>}
          />
          <Row
            title="Store credit"
            hint="Allow customers to see and spend store credit"
            action={
              <Toggle
                checked={values.storeCreditEnabled}
                label="Store credit"
                disabled={saving}
                onChange={(v) => update({ storeCreditEnabled: v })}
              />
            }
          />
          <Row
            title="URL"
            hint="Use this URL anywhere you'd like customers to access customer accounts"
            action={<Pill onClick={() => onOpenSection?.("Domains")}>Manage</Pill>}
          />
          <div className="px-5 pb-4">
            <button
              type="button"
              onClick={copy}
              disabled={!accountUrl}
              title="Copy URL"
              className="w-full rounded-lg bg-slate-100 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-200"
            >
              {accountUrl
                ? copied
                  ? "Copied!"
                  : accountUrl
                : "Connect a domain to get an account URL"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
