import { useEffect, useMemo, useState } from "react";
import {
  Settings,
  Layers,
  Receipt,
  Users,
  ShieldCheck,
  CreditCard,
  ShoppingCart,
  User,
  Truck,
  Percent,
  MapPin,
  Globe,
  KeyRound,
  LayoutGrid,
  Store,
  Link2,
  Activity,
  Bell,
  Braces,
  Languages,
  Lock,
  FileText,
} from "lucide-react";
import { currencyOptions } from "@/lib/formatPrice";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiDelete, apiGet, apiPatch, syncAccess } from "@/lib/api";
import { STORES_PATH, getActiveStore, getSession, storeCan } from "@/lib/auth";
import AdminSidebar, { AdminHeader } from "@/components/AdminSidebar";
import PaymentsSettings from "@/components/PaymentsSettings";
import TaxSettings from "@/components/TaxSettings";
import ShippingSettings from "@/components/ShippingSettings";
import { RolesSettings, UsersSettings } from "@/components/TeamSettings";
import ApiKeysSettings from "@/components/ApiKeysSettings";
import NotificationsSettings from "@/components/NotificationsSettings";
import { useFlags } from "@/lib/featureFlags";
import DomainsSettings from "@/components/DomainsSettings";
import LanguagesSettings from "@/components/LanguagesSettings";
import MetafieldsSettings from "@/components/MetafieldsSettings";
import PoliciesSettings from "@/components/PoliciesSettings";
import CustomerPrivacySettings from "@/components/CustomerPrivacySettings";
import CheckoutSettings from "@/components/CheckoutSettings";
import CustomerAccountsSettings from "@/components/CustomerAccountsSettings";
import CurrencySettings from "@/components/CurrencySettings";
import Icon from "@/components/Icons";

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
  { label: "API keys", permission: "api_keys.view", flag: "api_keys" },
  { label: "Sales channels" },
  { label: "Domains" },
  { label: "Customer events" },
  { label: "Notifications" },
  { label: "Metafields and metaobjects" },
  { label: "Languages" },
  { label: "Customer privacy" },
  { label: "Policies" },
];

// Settings icons (sidebar, page header, placeholder) using standard Lucide icons
const SETTINGS_ICON_COMPONENTS = {
  General: Settings,
  Plan: Layers,
  Billing: Receipt,
  Users: Users,
  Roles: ShieldCheck,
  Payments: CreditCard,
  Checkout: ShoppingCart,
  "Customer accounts": User,
  "Shipping and delivery": Truck,
  "Taxes and duties": Percent,
  Locations: MapPin,
  Markets: Globe,
  "API keys": KeyRound,
  Apps: LayoutGrid,
  "Sales channels": Store,
  Domains: Link2,
  "Customer events": Activity,
  Notifications: Bell,
  "Metafields and metaobjects": Braces,
  Languages: Languages,
  "Customer privacy": Lock,
  Policies: FileText,
};

function SettingsIcon({ label, size = 18 }) {
  const Comp = SETTINGS_ICON_COMPONENTS[label] || Settings;
  return <Comp size={size} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />;
}

export default function AdminSettings() {
  /* =========================================================
     SELECTED SETTINGS SECTION
     ========================================================= */

  // Kept in the URL (?section=...) so a page reload — e.g. the fallback reload when switching the
  // language back to English can't be undone in place — returns to the same section.
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionParam = searchParams.get("section");
  const selectedSection = settingsMenu.some((item) => item.label === sectionParam)
    ? sectionParam
    : "General";
  const setSelectedSection = (label) => {
    if (label === selectedSection) return;
    setSearchParams(label === "General" ? {} : { section: label });
  };

  const [settingsSearch, setSettingsSearch] = useState("");

  /* =========================================================
     GENERAL SETTINGS STATE
     ========================================================= */

  const [storeName, setStoreName] = useState("");

  const [email, setEmail] = useState("");

  const [phone, setPhone] = useState("");

  const [address, setAddress] = useState("");

  const [currency, setCurrency] = useState("INR");

  // Every ISO 4217 currency (code, name, symbol); the short list is the fallback
  const currencyList = useMemo(() => currencyOptions(), []);

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
  const flagsOn = useFlags();
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

  const filteredSettings = settingsMenu.filter(
    (item) =>
      (!item.permission || storeCan(activeStore, item.permission)) &&
      (!item.flag || flagsOn(item.flag)) &&
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
            <h2 className="text-base font-semibold text-ink">Business details</h2>

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
            <h2 className="text-base font-semibold text-ink">Store contact details</h2>

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
                <Icon name="phone" className="h-5 w-5" />

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
            <h2 className="text-base font-semibold text-ink">Store defaults</h2>

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
                {(currencyList.length
                  ? currencyList.map((c) => [c.code, `${c.name} (${c.code} ${c.symbol})`])
                  : CURRENCIES
                ).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>

              <div className="mt-4">
                <CurrencySettings
                  storeId={storeId}
                  baseCurrency={currency}
                  currencies={currencyList}
                />
              </div>
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
            <h2 className="text-base font-semibold text-ink">Order ID format</h2>

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
            <h2 className="text-base font-semibold text-ink">Order processing</h2>

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
            <h2 className="text-base font-semibold text-ink">Store assets</h2>

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
            <h2 className="text-base font-semibold text-ink">Resources</h2>

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
                onClick={() => navigate("/admin/help")}
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
            className="rounded-lg bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600/90 disabled:opacity-60"
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
    if (selectedSection === "Languages") return <LanguagesSettings />;
    if (selectedSection === "Metafields and metaobjects") return <MetafieldsSettings />;
    return (
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex min-h-[500px] items-center justify-center p-10">
          <div className="max-w-md text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <span className="text-slate-500">
                <SettingsIcon label={selectedSection} size={28} />
              </span>
            </div>

            <h2 className="mt-5 text-xl font-semibold text-ink">{selectedSection}</h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              The {selectedSection} settings page is not implemented yet. General settings are
              currently available.
            </p>

            <button
              type="button"
              onClick={() => setSelectedSection("General")}
              className="mt-5 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600/90"
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
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100 text-ink">
      <AdminHeader />

      {/* =====================================================
          SETTINGS BODY
          ===================================================== */}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <AdminSidebar />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="mx-auto flex w-full max-w-[1500px] flex-1 min-h-0 flex-col gap-5 px-4 py-5 sm:px-6 sm:py-7 lg:flex-row lg:gap-7">
            {/* =================================================
            LEFT SETTINGS SIDEBAR
            ================================================= */}

            <aside className="flex h-auto max-h-[40vh] min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white lg:h-full lg:max-h-none lg:w-[300px]">
              {/* STORE HEADER */}

              <div className="shrink-0 border-b border-slate-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-base font-bold uppercase text-white">
                    {(activeStore?.storeName || "S").trim().charAt(0)}
                  </div>

                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold">
                      {activeStore?.storeName || "Store"}
                    </h2>

                    <p className="text-sm text-slate-500">Store settings</p>
                  </div>
                </div>
              </div>

              {/* SETTINGS SEARCH */}

              <div className="shrink-0 p-4">
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

              <nav className="flex-1 min-h-0 overflow-y-auto px-3 pb-5">
                {filteredSettings.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleMenuClick(item.label)}
                    className={`mb-1 flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition ${
                      selectedSection === item.label
                        ? "bg-[rgba(24,24,27,0.06)] font-semibold text-ink"
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

            <main className="min-w-0 flex-1 h-full min-h-0 overflow-y-auto pb-8">
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
                    className="rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600/90 disabled:opacity-60"
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
              ) : selectedSection === "Payments" && isOwner ? (
                <PaymentsSettings />
              ) : selectedSection === "Shipping and delivery" ? (
                <ShippingSettings />
              ) : selectedSection === "Taxes and duties" ? (
                <TaxSettings />
              ) : selectedSection === "Users" ? (
                <UsersSettings />
              ) : selectedSection === "Roles" ? (
                <RolesSettings />
              ) : selectedSection === "Notifications" ? (
                <NotificationsSettings />
              ) : selectedSection === "Checkout" ? (
                <CheckoutSettings onOpenSection={handleMenuClick} />
              ) : selectedSection === "Customer accounts" ? (
                <CustomerAccountsSettings onOpenSection={handleMenuClick} />
              ) : selectedSection === "Customer privacy" ? (
                <CustomerPrivacySettings onOpenSection={handleMenuClick} />
              ) : selectedSection === "Policies" ? (
                <PoliciesSettings />
              ) : selectedSection === "Domains" ? (
                <DomainsSettings />
              ) : selectedSection === "API keys" ? (
                <ApiKeysSettings />
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
