import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiDelete, apiGet, apiPatch, syncAccess } from "@/lib/api";
import { STORES_PATH, getActiveStore, getSession } from "@/lib/auth";
import AdminSidebar, { AdminHeader } from "@/components/AdminSidebar";
import { RolesSettings, UsersSettings } from "@/components/TeamSettings";

// [IANA name, label]; the backend validates the name
const TIME_ZONES = [
  ["Asia/Kolkata", "(GMT+05:30) Chennai, Kolkata, Mumbai, New Delhi"],
  ["Australia/Melbourne", "(GMT+10:00) Canberra, Melbourne"],
  ["Europe/London", "(GMT+00:00) London"],
  ["America/New_York", "(GMT-05:00) Eastern Time"],
];

const CURRENCIES = [
  ["INR", "Indian Rupee (INR ₹)"],
  ["AUD", "Australian Dollar (AUD $)"],
  ["USD", "US Dollar (USD $)"],
  ["GBP", "British Pound (GBP £)"],
  ["EUR", "Euro (EUR €)"],
];

const REGIONS = ["Australia", "India", "United States", "United Kingdom"];

const settingsMenu = [
  { label: "General" },
  { label: "Plan" },
  { label: "Billing" },
  { label: "Users" },
  { label: "Roles", nested: true },
  { label: "Payments" },
  { label: "Checkout" },
  { label: "Customer accounts" },
  { label: "Shipping and delivery" },
  { label: "Taxes and duties" },
  { label: "Locations" },
  { label: "Markets" },
  { label: "Apps" },
  { label: "Sales channels" },
  { label: "Domains" },
  { label: "Customer events" },
  { label: "Notifications" },
  { label: "Metafields and metaobjects" },
  { label: "Languages" },
  { label: "Customer privacy" },
  { label: "Policies" },
];

// Settings icons (sidebar, page header, placeholder): outline shapes on a 24x24 grid (Lucide geometry), drawn in currentColor so they
// follow the item's text color.
const SETTINGS_ICONS = {
  General: (
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  Plan: (
    <>
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </>
  ),
  Billing: (
    <>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 17.5v-11" />
    </>
  ),
  Users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  Roles: (
    <>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  Payments: (
    <>
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </>
  ),
  Checkout: (
    <>
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </>
  ),
  "Customer accounts": (
    <>
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </>
  ),
  "Shipping and delivery": (
    <>
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </>
  ),
  "Taxes and duties": (
    <>
      <line x1="19" x2="5" y1="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </>
  ),
  Locations: (
    <>
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  Markets: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </>
  ),
  Apps: (
    <>
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </>
  ),
  "Sales channels": (
    <>
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
      <path d="M2 7h20" />
      <path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7" />
    </>
  ),
  Domains: (
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>
  ),
  "Customer events": (
    <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
  ),
  Notifications: (
    <>
      <path d="M10.268 21a2 2 0 0 0 3.464 0" />
      <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
    </>
  ),
  "Metafields and metaobjects": (
    <>
      <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1" />
      <path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" />
    </>
  ),
  Languages: (
    <>
      <path d="m5 8 6 6" />
      <path d="m4 14 6-6 2-3" />
      <path d="M2 5h12" />
      <path d="M7 2h1" />
      <path d="m22 22-5-10-5 10" />
      <path d="M14 18h6" />
    </>
  ),
  "Customer privacy": (
    <>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  Policies: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </>
  ),
};

function SettingsIcon({ label, size = 18 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {SETTINGS_ICONS[label]}
    </svg>
  );
}

export default function AdminSettings() {
  /* =========================================================
     SELECTED SETTINGS SECTION
     ========================================================= */

  const [selectedSection, setSelectedSection] = useState("General");

  const [settingsSearch, setSettingsSearch] = useState("");

  /* =========================================================
     GENERAL SETTINGS STATE
     ========================================================= */

  const [storeName, setStoreName] = useState("");

  const [email, setEmail] = useState("");

  const [phone, setPhone] = useState("");

  const [address, setAddress] = useState("");

  const [currency, setCurrency] = useState("INR");

  const [backupRegion, setBackupRegion] = useState("");

  const [unitSystem, setUnitSystem] = useState("metric");

  const [weightUnit, setWeightUnit] = useState("kg");

  const [timeZone, setTimeZone] = useState("Asia/Kolkata");

  const [orderPrefix, setOrderPrefix] = useState("#");

  const [orderSuffix, setOrderSuffix] = useState("");

  const [fulfillment, setFulfillment] = useState("gift_cards");

  const [autoArchive, setAutoArchive] = useState(true);

  /* Loading and saving against the backend */

  const activeStore = getActiveStore(getSession());
  const storeId = activeStore?.storeId;
  // Only the store owner may change store details (the backend enforces this too)
  const isOwner = activeStore?.role === "owner";
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(Boolean(storeId));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: "ok" | "error", text }
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!storeId) return;

    let cancelled = false;
    apiGet(`/api/v1/stores/${storeId}/`).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        const s = res.data;
        setStoreName(s.storeName ?? "");
        setEmail(s.contactEmail ?? "");
        setPhone(s.phone ?? "");
        setAddress(s.address ?? "");
        setCurrency(s.currency ?? "INR");
        setBackupRegion(s.backupRegion ?? "");
        setUnitSystem(s.unitSystem ?? "metric");
        setWeightUnit(s.weightUnit ?? "kg");
        setTimeZone(s.timezone ?? "Asia/Kolkata");
        setOrderPrefix(s.orderPrefix ?? "#");
        setOrderSuffix(s.orderSuffix ?? "");
        setFulfillment(s.autoFulfill ?? "gift_cards");
        setAutoArchive(s.autoArchive ?? true);
      } else {
        setMessage({ type: "error", text: res.error });
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [storeId]);

  /* =========================================================
     SEARCH SETTINGS
     ========================================================= */

  const filteredSettings = settingsMenu.filter((item) =>
    item.label.toLowerCase().includes(settingsSearch.toLowerCase())
  );

  /* =========================================================
     MENU CLICK
     ========================================================= */

  const handleMenuClick = (label) => {
    setSelectedSection(label);
  };

  /* =========================================================
     SAVE
     ========================================================= */

  const handleSave = async () => {
    if (!storeId || saving || !isOwner) return;

    setSaving(true);
    setMessage(null);
    setErrors({});

    const res = await apiPatch(`/api/v1/stores/${storeId}/`, {
      storeName,
      contactEmail: email,
      phone,
      address,
      currency,
      backupRegion,
      unitSystem,
      weightUnit,
      timezone: timeZone,
      orderPrefix,
      orderSuffix,
      autoFulfill: fulfillment,
      autoArchive,
    });

    setSaving(false);

    if (res.ok) {
      syncAccess({ force: true }); // the sidebar shows the store name
      setMessage({ type: "ok", text: "General settings saved." });
      return;
    }

    setErrors(res.fieldErrors);
    setMessage({
      type: "error",
      text:
        res.status === 403
          ? "Only the store owner can change store settings."
          : res.formError || "Please fix the highlighted fields.",
    });
  };

  const handleDeleteStore = async () => {
    if (!storeId || deleting || !isOwner) return;

    const name = storeName || activeStore?.storeName || "this store";
    if (
      !window.confirm(`Delete "${name}"? The store will be closed and removed from your account.`)
    )
      return;
    const typed = window.prompt(`Type the store name to confirm:\n${name}`);
    if (typed === null) return;
    if (typed.trim() !== name) {
      setMessage({ type: "error", text: "The name didn't match, so the store was not deleted." });
      return;
    }

    setDeleting(true);
    setMessage(null);
    const res = await apiDelete(`/api/v1/stores/${storeId}/`);

    if (res.ok) {
      await syncAccess({ force: true }); // the closed store drops out of the session
      navigate(STORES_PATH);
      return;
    }

    setDeleting(false);
    setMessage({
      type: "error",
      text: res.error || "Could not delete the store.",
    });
  };

  const FIELD_NAMES = {
    storeName: "Store name",
    contactEmail: "Store email",
    phone: "Phone number",
    address: "Store address",
    currency: "Currency",
    backupRegion: "Backup region",
    unitSystem: "Unit system",
    weightUnit: "Weight unit",
    timezone: "Time zone",
    orderPrefix: "Order prefix",
    orderSuffix: "Order suffix",
    autoFulfill: "Order processing",
  };

  const saveBanner = message && (
    <div
      className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
        message.type === "ok"
          ? "border-green-200 bg-green-50 text-green-800"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      <p>{message.text}</p>
      {Object.entries(errors).map(([name, text]) => (
        <p key={name} className="mt-1">
          {FIELD_NAMES[name] || name}: {text}
        </p>
      ))}
    </div>
  );

  const saveLabel = saving ? "Saving…" : "Save";

  /* =========================================================
     GENERAL PAGE
     ========================================================= */

  const renderGeneral = () => {
    return (
      <fieldset disabled={!isOwner} className="min-w-0 space-y-5 border-0 p-0">
        {!isOwner && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Only the store owner can view and edit store settings.
          </div>
        )}
        {saveBanner}

        {/* =====================================================
            BUSINESS DETAILS
            ===================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5">
            <h2 className="text-base font-semibold text-[#0B1020]">Business details</h2>

            <p className="mt-1 text-sm text-slate-500">
              Business entity used for financial products, markets, apps, and taxes in this store.
            </p>
          </div>

          <div className="p-5">
            <button
              type="button"
              onClick={() => alert("Business details clicked")}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-4 text-left transition hover:bg-slate-50"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-lg">
                  🇦🇺
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-800">{storeName || "Your store"}</p>

                  <p className="mt-1 text-sm text-slate-500">
                    Private corporation · Business details
                  </p>
                </div>
              </div>

              <span className="text-lg text-slate-400">⋯</span>
            </button>
          </div>
        </section>

        {/* =====================================================
            STORE CONTACT DETAILS
            ===================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5">
            <h2 className="text-base font-semibold text-[#0B1020]">Store contact details</h2>

            <p className="mt-1 text-sm text-slate-500">
              Contact information associated with your store.
            </p>
          </div>

          <div className="space-y-4 p-5">
            {/* STORE NAME */}

            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-4">
                <span className="text-xl text-slate-500">▣</span>

                <div>
                  <p className="text-sm font-medium text-slate-800">Store name</p>

                  <p className="mt-1 text-sm text-slate-500">The name displayed for your store.</p>
                </div>
              </div>

              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full max-w-[280px] rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
              />
            </div>

            {/* STORE EMAIL */}

            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-4">
                <span className="text-xl text-slate-500">@</span>

                <div>
                  <p className="text-sm font-medium text-slate-800">Store email</p>

                  <p className="mt-1 text-sm text-slate-500">Email used to contact your store.</p>
                </div>
              </div>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
                className="w-full max-w-[280px] rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
              />
            </div>

            {/* PHONE */}

            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-4">
                <span className="text-xl text-slate-500">☎</span>

                <div>
                  <p className="text-sm font-medium text-slate-800">Phone number</p>

                  <p className="mt-1 text-sm text-slate-500">Store contact phone number.</p>
                </div>
              </div>

              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                className="w-full max-w-[280px] rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
              />
            </div>

            {/* ADDRESS */}

            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-4">
                <span className="text-xl text-slate-500">⌖</span>

                <div>
                  <p className="text-sm font-medium text-slate-800">Store address</p>

                  <p className="mt-1 text-sm text-slate-500">Address associated with your store.</p>
                </div>
              </div>

              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter store address"
                className="w-full max-w-[280px] rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
              />
            </div>
          </div>
        </section>

        {/* =====================================================
            STORE DEFAULTS
            ===================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5">
            <h2 className="text-base font-semibold text-[#0B1020]">Store defaults</h2>

            <p className="mt-1 text-sm text-slate-500">Default settings used by your store.</p>
          </div>

          <div className="space-y-5 p-5">
            {/* CURRENCY */}

            <div>
              <label className="text-sm font-medium text-slate-800">Currency display</label>

              <p className="mt-1 text-sm text-slate-500">
                To manage the currencies customers see, go to Markets.
              </p>

              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-500"
              >
                {CURRENCIES.map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* BACKUP REGION */}

            <div>
              <label className="text-sm font-medium text-slate-800">Backup Region</label>

              <select
                value={backupRegion}
                onChange={(e) => setBackupRegion(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-500"
              >
                <option value="">Not set</option>

                {REGIONS.map((region) => (
                  <option key={region}>{region}</option>
                ))}
              </select>

              <p className="mt-1 text-sm text-slate-500">
                Determines settings for customers outside your markets.
              </p>
            </div>

            {/* UNIT + WEIGHT */}

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="text-sm font-medium text-slate-800">Unit system</label>

                <select
                  value={unitSystem}
                  onChange={(e) => setUnitSystem(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-500"
                >
                  <option value="metric">Metric system</option>

                  <option value="imperial">Imperial system</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-800">Default weight unit</label>

                <select
                  value={weightUnit}
                  onChange={(e) => setWeightUnit(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-500"
                >
                  <option value="kg">Kilogram (kg)</option>

                  <option value="g">Gram (g)</option>

                  <option value="lb">Pound (lb)</option>

                  <option value="oz">Ounce (oz)</option>
                </select>
              </div>
            </div>

            {/* TIME ZONE */}

            <div>
              <label className="text-sm font-medium text-slate-800">Time zone</label>

              <select
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-500"
              >
                {TIME_ZONES.map(([zone, label]) => (
                  <option key={zone} value={zone}>
                    {label}
                  </option>
                ))}
              </select>

              <p className="mt-1 text-sm text-slate-500">
                Sets the time for when orders and analytics are recorded.
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================
            ORDER ID FORMAT
            ===================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-5">
            <h2 className="text-base font-semibold text-[#0B1020]">Order ID format</h2>

            <p className="mt-1 text-sm text-slate-500">
              Shown on the order page, customer pages, and customer order notifications to identify
              orders.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-5">
              {/* PREFIX */}

              <div>
                <label className="text-sm font-medium text-slate-800">Prefix</label>

                <input
                  type="text"
                  value={orderPrefix}
                  onChange={(e) => setOrderPrefix(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-500"
                />
              </div>

              {/* SUFFIX */}

              <div>
                <label className="text-sm font-medium text-slate-800">Suffix</label>

                <input
                  type="text"
                  value={orderSuffix}
                  onChange={(e) => setOrderSuffix(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-500"
                />
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Your order ID will appear as{" "}
              <span className="font-medium text-slate-700">
                {orderPrefix}1001{orderSuffix}, {orderPrefix}1002{orderSuffix}, {orderPrefix}1003
                {orderSuffix}, ...
              </span>
            </p>
          </div>
        </section>

        {/* =====================================================
            ORDER PROCESSING
            ===================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-5">
            <h2 className="text-base font-semibold text-[#0B1020]">Order processing</h2>

            <p className="mt-1 text-sm text-slate-500">
              Choose how orders are processed after payment.
            </p>

            <div className="mt-5">
              <p className="text-sm font-medium text-slate-800">After an order has been paid</p>

              <div className="mt-4 space-y-4">
                {/* OPTION 1 */}

                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="fulfillment"
                    value="all"
                    checked={fulfillment === "all"}
                    onChange={() => setFulfillment("all")}
                    className="h-4 w-4"
                  />

                  <span className="text-sm text-slate-700">
                    Automatically fulfill all of the order's line items
                  </span>
                </label>

                {/* OPTION 2 */}

                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="fulfillment"
                    value="gift_cards"
                    checked={fulfillment === "gift_cards"}
                    onChange={() => setFulfillment("gift_cards")}
                    className="h-4 w-4"
                  />

                  <span className="text-sm text-slate-700">
                    Automatically fulfill only the gift cards of the order
                  </span>
                </label>

                {/* OPTION 3 */}

                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="fulfillment"
                    value="none"
                    checked={fulfillment === "none"}
                    onChange={() => setFulfillment("none")}
                    className="h-4 w-4"
                  />

                  <span className="text-sm text-slate-700">
                    Don't fulfill any of the order's line items automatically
                  </span>
                </label>
              </div>
            </div>

            {/* ARCHIVE */}

            <div className="mt-7 border-t border-slate-200 pt-5">
              <p className="text-sm font-medium text-slate-800">
                After an order has been fulfilled and paid, or when all items have been refunded
              </p>

              <label className="mt-4 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={autoArchive}
                  onChange={(e) => setAutoArchive(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />

                <div>
                  <p className="text-sm font-medium text-slate-800">
                    Automatically archive the order
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    The order will be removed from your list of open orders.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </section>

        {/* =====================================================
            STORE ASSETS
            ===================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-5">
            <h2 className="text-base font-semibold text-[#0B1020]">Store assets</h2>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              {/* METAFIELDS */}

              <button
                type="button"
                onClick={() => alert("Metafields clicked")}
                className="flex w-full items-center justify-between border-b border-slate-200 p-4 text-left transition hover:bg-slate-50"
              >
                <div className="flex items-center gap-4">
                  <span className="text-lg text-slate-500">▣</span>

                  <div>
                    <p className="text-sm font-medium text-slate-800">Metafields</p>

                    <p className="mt-1 text-sm text-slate-500">
                      Available in themes and configurable for Storefront API.
                    </p>
                  </div>
                </div>

                <span className="text-xl text-slate-400">›</span>
              </button>

              {/* BRAND */}

              <button
                type="button"
                onClick={() => alert("Brand clicked")}
                className="flex w-full items-center justify-between p-4 text-left transition hover:bg-slate-50"
              >
                <div className="flex items-center gap-4">
                  <span className="text-lg text-slate-500">◈</span>

                  <div>
                    <p className="text-sm font-medium text-slate-800">Brand</p>

                    <p className="mt-1 text-sm text-slate-500">
                      Integrate brand assets across sales channels, themes and apps.
                    </p>
                  </div>
                </div>

                <span className="text-xl text-slate-400">›</span>
              </button>
            </div>
          </div>
        </section>

        {/* =====================================================
            RESOURCES
            ===================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-5">
            <h2 className="text-base font-semibold text-[#0B1020]">Resources</h2>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              {/* CHANGE LOG */}

              <button
                type="button"
                onClick={() => alert("Change log clicked")}
                className="flex w-full items-center justify-between border-b border-slate-200 p-4 text-left hover:bg-slate-50"
              >
                <span className="text-sm text-slate-700">◌ Change log</span>

                <span className="rounded-lg border border-slate-300 px-3 py-1 text-xs">
                  View change log
                </span>
              </button>

              {/* HELP CENTER */}

              <button
                type="button"
                onClick={() => alert("Help Center clicked")}
                className="flex w-full items-center justify-between border-b border-slate-200 p-4 text-left hover:bg-slate-50"
              >
                <span className="text-sm text-slate-700">? Help Center</span>

                <span className="rounded-lg border border-slate-300 px-3 py-1 text-xs">
                  Get help
                </span>
              </button>

              {/* PARTNER */}

              <button
                type="button"
                onClick={() => alert("Hire a Partner clicked")}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50"
              >
                <span className="text-sm text-slate-700">&lt;/&gt; Hire a Partner</span>

                <span className="rounded-lg border border-slate-300 px-3 py-1 text-xs">
                  Hire a Partner
                </span>
              </button>
            </div>

            {/* KEYBOARD SHORTCUTS */}

            <button
              type="button"
              onClick={() => alert("Keyboard shortcuts clicked")}
              className="mt-3 flex w-full items-center justify-between rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50"
            >
              <span className="text-sm text-slate-700">⌨ Keyboard shortcuts</span>

              <span className="text-xl text-slate-400">›</span>
            </button>

            {/* ACTIVITY LOG */}

            <button
              type="button"
              onClick={() => alert("Store activity log clicked")}
              className="flex w-full items-center justify-between rounded-xl border-x border-b border-slate-200 p-4 text-left hover:bg-slate-50"
            >
              <span className="text-sm text-slate-700">◌ Store activity log</span>

              <span className="text-xl text-slate-400">›</span>
            </button>
          </div>
        </section>

        {/* DELETE STORE */}

        <section className="rounded-2xl border border-red-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 p-5">
            <div>
              <h2 className="text-base font-semibold text-red-700">Delete store</h2>
              <p className="mt-1 text-sm text-slate-500">
                Closes this store and removes it from your account.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDeleteStore}
              disabled={deleting || loading}
              className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? "Deleting…" : "Delete store"}
            </button>
          </div>
        </section>

        {/* BOTTOM SAVE */}

        <div className={`flex justify-end pb-8 ${isOwner ? "" : "hidden"}`}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="rounded-lg bg-[#0B1020] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1C2347] disabled:opacity-60"
          >
            {saveLabel}
          </button>
        </div>
      </fieldset>
    );
  };

  /* =========================================================
     OTHER SETTINGS PLACEHOLDER
     ========================================================= */

  const renderOtherSection = () => {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex min-h-[500px] items-center justify-center p-10">
          <div className="max-w-md text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <span className="text-slate-500">
                <SettingsIcon label={selectedSection} size={28} />
              </span>
            </div>

            <h2 className="mt-5 text-xl font-semibold text-[#0B1020]">{selectedSection}</h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              The {selectedSection} settings page is not implemented yet. General settings are
              currently available.
            </p>

            <button
              type="button"
              onClick={() => setSelectedSection("General")}
              className="mt-5 rounded-lg bg-[#0B1020] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1C2347]"
            >
              Back to General
            </button>
          </div>
        </div>
      </section>
    );
  };

  /* =========================================================
     MAIN PAGE
     ========================================================= */

  return (
    <div className="min-h-screen bg-[#f1f1f1] text-[#0B1020]">
      <AdminHeader />

      {/* =====================================================
          SETTINGS BODY
          ===================================================== */}

      <div className="flex min-h-[calc(100vh-72px)]">
        <AdminSidebar />

        <div className="min-w-0 flex-1">
          <div className="mx-auto flex max-w-[1500px] flex-col gap-5 px-4 py-5 sm:px-6 sm:py-7 lg:flex-row lg:gap-7">
            {/* =================================================
            LEFT SETTINGS SIDEBAR
            ================================================= */}

            <aside className="w-full shrink-0 self-start overflow-hidden lg:w-[300px] rounded-xl border border-slate-200 bg-white">
              {/* STORE HEADER */}

              <div className="border-b border-slate-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fuchsia-600 text-xs font-semibold text-white">
                    Sto
                  </div>

                  <div>
                    <h2 className="text-base font-semibold">Store</h2>

                    <p className="text-sm text-slate-500">Store settings</p>
                  </div>
                </div>
              </div>

              {/* SETTINGS SEARCH */}

              <div className="p-4">
                <div className="flex h-10 items-center rounded-lg border border-slate-300 px-3">
                  <span className="mr-2 text-lg text-slate-500">⌕</span>

                  <input
                    type="text"
                    value={settingsSearch}
                    onChange={(e) => setSettingsSearch(e.target.value)}
                    placeholder="Search"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </div>

              {/* SETTINGS MENU */}

              <nav className="px-3 pb-5">
                {filteredSettings.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleMenuClick(item.label)}
                    className={`mb-1 flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition ${
                      selectedSection === item.label
                        ? "bg-[#f0f0f0] font-semibold text-[#0B1020]"
                        : "text-slate-700 hover:bg-slate-50"
                    } ${item.nested ? "pl-10" : ""}`}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                      <SettingsIcon label={item.label} />
                    </span>

                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </aside>

            {/* =================================================
            RIGHT CONTENT
            ================================================= */}

            <main className="min-w-0 flex-1">
              {/* PAGE HEADER */}

              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SettingsIcon label={selectedSection} size={22} />

                  <h1 className="text-xl font-semibold">{selectedSection}</h1>
                </div>

                {/* SAVE ONLY FOR GENERAL */}

                {selectedSection === "General" && isOwner && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || loading}
                    className="rounded-lg bg-[#0B1020] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1C2347] disabled:opacity-60"
                  >
                    {saveLabel}
                  </button>
                )}
              </div>

              {/* =================================================
              CONTENT SWITCHING
              ================================================= */}

              {selectedSection === "General" ? (
                renderGeneral()
              ) : selectedSection === "Users" ? (
                <UsersSettings />
              ) : selectedSection === "Roles" ? (
                <RolesSettings />
              ) : (
                renderOtherSection()
              )}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
