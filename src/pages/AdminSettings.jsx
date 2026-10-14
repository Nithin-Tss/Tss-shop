import { useEffect, useState } from "react";
import { apiGet, apiPatch, syncAccess } from "@/lib/api";
import { getActiveStore, getSession } from "@/lib/auth";
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
  { icon: "⌂", label: "General" },
  { icon: "▣", label: "Plan" },
  { icon: "$", label: "Billing" },
  { icon: "♙", label: "Users" },
  { icon: "◇", label: "Roles", nested: true },
  { icon: "▱", label: "Payments" },
  { icon: "▾", label: "Checkout" },
  { icon: "●", label: "Customer accounts" },
  { icon: "▱", label: "Shipping and delivery" },
  { icon: "♙", label: "Taxes and duties" },
  { icon: "●", label: "Locations" },
  { icon: "◉", label: "Markets" },
  { icon: "▦", label: "Apps" },
  { icon: "✣", label: "Sales channels" },
  { icon: "▤", label: "Domains" },
  { icon: "✣", label: "Customer events" },
  { icon: "●", label: "Notifications" },
  { icon: "▣", label: "Metafields and metaobjects" },
  { icon: "A", label: "Languages" },
  { icon: "▣", label: "Customer privacy" },
  { icon: "▤", label: "Policies" },
];

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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: "ok" | "error", text }
  const [errors, setErrors] = useState({});

  const storeId = getActiveStore(getSession())?.storeId;

  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      return;
    }

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
    item.label
      .toLowerCase()
      .includes(settingsSearch.toLowerCase())
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
    if (!storeId || saving) return;

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
      <div className="space-y-5">

        {saveBanner}

        {/* =====================================================
            BUSINESS DETAILS
            ===================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 px-5 py-5">

            <h2 className="text-base font-semibold text-[#161c2c]">
              Business details
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Business entity used for financial products,
              markets, apps, and taxes in this store.
            </p>

          </div>


          <div className="p-5">

            <button
              type="button"
              onClick={() =>
                alert("Business details clicked")
              }
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-4 text-left transition hover:bg-slate-50"
            >

              <div className="flex items-center gap-4">

                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-lg">
                  🇦🇺
                </div>

                <div>

                  <p className="text-sm font-medium text-slate-800">
                    {storeName || "Your store"}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Private corporation · Business details
                  </p>

                </div>

              </div>


              <span className="text-lg text-slate-400">
                ⋯
              </span>

            </button>

          </div>

        </section>


        {/* =====================================================
            STORE CONTACT DETAILS
            ===================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 px-5 py-5">

            <h2 className="text-base font-semibold text-[#161c2c]">
              Store contact details
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Contact information associated with your store.
            </p>

          </div>


          <div className="space-y-4 p-5">

            {/* STORE NAME */}

            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">

              <div className="flex items-center gap-4">

                <span className="text-xl text-slate-500">
                  ▣
                </span>

                <div>

                  <p className="text-sm font-medium text-slate-800">
                    Store name
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    The name displayed for your store.
                  </p>

                </div>

              </div>


              <input
                type="text"
                value={storeName}
                onChange={(e) =>
                  setStoreName(e.target.value)
                }
                className="w-[280px] rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
              />

            </div>


            {/* STORE EMAIL */}

            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">

              <div className="flex items-center gap-4">

                <span className="text-xl text-slate-500">
                  @
                </span>

                <div>

                  <p className="text-sm font-medium text-slate-800">
                    Store email
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Email used to contact your store.
                  </p>

                </div>

              </div>


              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="Enter email"
                className="w-[280px] rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
              />

            </div>


            {/* PHONE */}

            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">

              <div className="flex items-center gap-4">

                <span className="text-xl text-slate-500">
                  ☎
                </span>

                <div>

                  <p className="text-sm font-medium text-slate-800">
                    Phone number
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Store contact phone number.
                  </p>

                </div>

              </div>


              <input
                type="tel"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value)
                }
                placeholder="Enter phone number"
                className="w-[280px] rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
              />

            </div>


            {/* ADDRESS */}

            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">

              <div className="flex items-center gap-4">

                <span className="text-xl text-slate-500">
                  ⌖
                </span>

                <div>

                  <p className="text-sm font-medium text-slate-800">
                    Store address
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Address associated with your store.
                  </p>

                </div>

              </div>


              <input
                type="text"
                value={address}
                onChange={(e) =>
                  setAddress(e.target.value)
                }
                placeholder="Enter store address"
                className="w-[280px] rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
              />

            </div>

          </div>

        </section>


        {/* =====================================================
            STORE DEFAULTS
            ===================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 px-5 py-5">

            <h2 className="text-base font-semibold text-[#161c2c]">
              Store defaults
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Default settings used by your store.
            </p>

          </div>


          <div className="space-y-5 p-5">

            {/* CURRENCY */}

            <div>

              <label className="text-sm font-medium text-slate-800">
                Currency display
              </label>

              <p className="mt-1 text-sm text-slate-500">
                To manage the currencies customers see,
                go to Markets.
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

              <label className="text-sm font-medium text-slate-800">
                Backup Region
              </label>


              <select
                value={backupRegion}
                onChange={(e) =>
                  setBackupRegion(e.target.value)
                }
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-500"
              >

                <option value="">Not set</option>

                {REGIONS.map((region) => (
                  <option key={region}>{region}</option>
                ))}

              </select>


              <p className="mt-1 text-sm text-slate-500">
                Determines settings for customers outside
                your markets.
              </p>

            </div>


            {/* UNIT + WEIGHT */}

            <div className="grid grid-cols-2 gap-5">

              <div>

                <label className="text-sm font-medium text-slate-800">
                  Unit system
                </label>


                <select
                  value={unitSystem}
                  onChange={(e) =>
                    setUnitSystem(e.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-500"
                >

                  <option value="metric">
                    Metric system
                  </option>

                  <option value="imperial">
                    Imperial system
                  </option>

                </select>

              </div>


              <div>

                <label className="text-sm font-medium text-slate-800">
                  Default weight unit
                </label>


                <select
                  value={weightUnit}
                  onChange={(e) =>
                    setWeightUnit(e.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-500"
                >

                  <option value="kg">
                    Kilogram (kg)
                  </option>

                  <option value="g">
                    Gram (g)
                  </option>

                  <option value="lb">
                    Pound (lb)
                  </option>

                  <option value="oz">
                    Ounce (oz)
                  </option>

                </select>

              </div>

            </div>


            {/* TIME ZONE */}

            <div>

              <label className="text-sm font-medium text-slate-800">
                Time zone
              </label>


              <select
                value={timeZone}
                onChange={(e) =>
                  setTimeZone(e.target.value)
                }
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-500"
              >

                {TIME_ZONES.map(([zone, label]) => (
                  <option key={zone} value={zone}>
                    {label}
                  </option>
                ))}

              </select>


              <p className="mt-1 text-sm text-slate-500">
                Sets the time for when orders and analytics
                are recorded.
              </p>

            </div>

          </div>

        </section>


        {/* =====================================================
            ORDER ID FORMAT
            ===================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="p-5">

            <h2 className="text-base font-semibold text-[#161c2c]">
              Order ID format
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Shown on the order page, customer pages,
              and customer order notifications to identify orders.
            </p>


            <div className="mt-5 grid grid-cols-2 gap-5">

              {/* PREFIX */}

              <div>

                <label className="text-sm font-medium text-slate-800">
                  Prefix
                </label>

                <input
                  type="text"
                  value={orderPrefix}
                  onChange={(e) =>
                    setOrderPrefix(e.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-500"
                />

              </div>


              {/* SUFFIX */}

              <div>

                <label className="text-sm font-medium text-slate-800">
                  Suffix
                </label>

                <input
                  type="text"
                  value={orderSuffix}
                  onChange={(e) =>
                    setOrderSuffix(e.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-500"
                />

              </div>

            </div>


            <p className="mt-4 text-sm text-slate-500">

              Your order ID will appear as{" "}

              <span className="font-medium text-slate-700">

                {orderPrefix}1001{orderSuffix},{" "}

                {orderPrefix}1002{orderSuffix},{" "}

                {orderPrefix}1003{orderSuffix}, ...

              </span>

            </p>

          </div>

        </section>


        {/* =====================================================
            ORDER PROCESSING
            ===================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="p-5">

            <h2 className="text-base font-semibold text-[#161c2c]">
              Order processing
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Choose how orders are processed after payment.
            </p>


            <div className="mt-5">

              <p className="text-sm font-medium text-slate-800">
                After an order has been paid
              </p>


              <div className="mt-4 space-y-4">

                {/* OPTION 1 */}

                <label className="flex cursor-pointer items-center gap-3">

                  <input
                    type="radio"
                    name="fulfillment"
                    value="all"
                    checked={fulfillment === "all"}
                    onChange={() =>
                      setFulfillment("all")
                    }
                    className="h-4 w-4"
                  />

                  <span className="text-sm text-slate-700">
                    Automatically fulfill all of the
                    order's line items
                  </span>

                </label>


                {/* OPTION 2 */}

                <label className="flex cursor-pointer items-center gap-3">

                  <input
                    type="radio"
                    name="fulfillment"
                    value="gift_cards"
                    checked={fulfillment === "gift_cards"}
                    onChange={() =>
                      setFulfillment("gift_cards")
                    }
                    className="h-4 w-4"
                  />

                  <span className="text-sm text-slate-700">
                    Automatically fulfill only the gift
                    cards of the order
                  </span>

                </label>


                {/* OPTION 3 */}

                <label className="flex cursor-pointer items-center gap-3">

                  <input
                    type="radio"
                    name="fulfillment"
                    value="none"
                    checked={fulfillment === "none"}
                    onChange={() =>
                      setFulfillment("none")
                    }
                    className="h-4 w-4"
                  />

                  <span className="text-sm text-slate-700">
                    Don't fulfill any of the order's
                    line items automatically
                  </span>

                </label>

              </div>

            </div>


            {/* ARCHIVE */}

            <div className="mt-7 border-t border-slate-200 pt-5">

              <p className="text-sm font-medium text-slate-800">
                After an order has been fulfilled and paid,
                or when all items have been refunded
              </p>


              <label className="mt-4 flex cursor-pointer items-start gap-3">

                <input
                  type="checkbox"
                  checked={autoArchive}
                  onChange={(e) =>
                    setAutoArchive(e.target.checked)
                  }
                  className="mt-1 h-4 w-4"
                />

                <div>

                  <p className="text-sm font-medium text-slate-800">
                    Automatically archive the order
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    The order will be removed from your
                    list of open orders.
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

            <h2 className="text-base font-semibold text-[#161c2c]">
              Store assets
            </h2>


            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">

              {/* METAFIELDS */}

              <button
                type="button"
                onClick={() =>
                  alert("Metafields clicked")
                }
                className="flex w-full items-center justify-between border-b border-slate-200 p-4 text-left transition hover:bg-slate-50"
              >

                <div className="flex items-center gap-4">

                  <span className="text-lg text-slate-500">
                    ▣
                  </span>

                  <div>

                    <p className="text-sm font-medium text-slate-800">
                      Metafields
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Available in themes and configurable
                      for Storefront API.
                    </p>

                  </div>

                </div>


                <span className="text-xl text-slate-400">
                  ›
                </span>

              </button>


              {/* BRAND */}

              <button
                type="button"
                onClick={() =>
                  alert("Brand clicked")
                }
                className="flex w-full items-center justify-between p-4 text-left transition hover:bg-slate-50"
              >

                <div className="flex items-center gap-4">

                  <span className="text-lg text-slate-500">
                    ◈
                  </span>

                  <div>

                    <p className="text-sm font-medium text-slate-800">
                      Brand
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Integrate brand assets across sales
                      channels, themes and apps.
                    </p>

                  </div>

                </div>


                <span className="text-xl text-slate-400">
                  ›
                </span>

              </button>

            </div>

          </div>

        </section>


        {/* =====================================================
            RESOURCES
            ===================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="p-5">

            <h2 className="text-base font-semibold text-[#161c2c]">
              Resources
            </h2>


            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">

              {/* CHANGE LOG */}

              <button
                type="button"
                onClick={() =>
                  alert("Change log clicked")
                }
                className="flex w-full items-center justify-between border-b border-slate-200 p-4 text-left hover:bg-slate-50"
              >

                <span className="text-sm text-slate-700">
                  ◌ Change log
                </span>

                <span className="rounded-lg border border-slate-300 px-3 py-1 text-xs">
                  View change log
                </span>

              </button>


              {/* HELP CENTER */}

              <button
                type="button"
                onClick={() =>
                  alert("Help Center clicked")
                }
                className="flex w-full items-center justify-between border-b border-slate-200 p-4 text-left hover:bg-slate-50"
              >

                <span className="text-sm text-slate-700">
                  ? Help Center
                </span>

                <span className="rounded-lg border border-slate-300 px-3 py-1 text-xs">
                  Get help
                </span>

              </button>


              {/* PARTNER */}

              <button
                type="button"
                onClick={() =>
                  alert("Hire a Partner clicked")
                }
                className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50"
              >

                <span className="text-sm text-slate-700">
                  &lt;/&gt; Hire a Partner
                </span>

                <span className="rounded-lg border border-slate-300 px-3 py-1 text-xs">
                  Hire a Partner
                </span>

              </button>

            </div>


            {/* KEYBOARD SHORTCUTS */}

            <button
              type="button"
              onClick={() =>
                alert("Keyboard shortcuts clicked")
              }
              className="mt-3 flex w-full items-center justify-between rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50"
            >

              <span className="text-sm text-slate-700">
                ⌨ Keyboard shortcuts
              </span>

              <span className="text-xl text-slate-400">
                ›
              </span>

            </button>


            {/* ACTIVITY LOG */}

            <button
              type="button"
              onClick={() =>
                alert("Store activity log clicked")
              }
              className="flex w-full items-center justify-between rounded-xl border-x border-b border-slate-200 p-4 text-left hover:bg-slate-50"
            >

              <span className="text-sm text-slate-700">
                ◌ Store activity log
              </span>

              <span className="text-xl text-slate-400">
                ›
              </span>

            </button>

          </div>

        </section>


        {/* BOTTOM SAVE */}

        <div className="flex justify-end pb-8">

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="rounded-lg bg-[#161c2c] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#252e45] disabled:opacity-60"
          >
            {saveLabel}
          </button>

        </div>

      </div>
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

              <span className="text-2xl text-slate-500">
                {
                  settingsMenu.find(
                    (item) =>
                      item.label === selectedSection
                  )?.icon
                }
              </span>

            </div>


            <h2 className="mt-5 text-xl font-semibold text-[#161c2c]">
              {selectedSection}
            </h2>


            <p className="mt-2 text-sm leading-6 text-slate-500">
              The {selectedSection} settings page is
              not implemented yet. General settings are
              currently available.
            </p>


            <button
              type="button"
              onClick={() =>
                setSelectedSection("General")
              }
              className="mt-5 rounded-lg bg-[#161c2c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#252e45]"
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
    <div className="min-h-screen bg-[#f1f1f1] text-[#161c2c]">

      <AdminHeader />


      {/* =====================================================
          SETTINGS BODY
          ===================================================== */}

      <div className="flex min-h-[calc(100vh-72px)]">

        <AdminSidebar />

        <div className="min-w-0 flex-1">

      <div className="mx-auto flex max-w-[1500px] gap-7 px-6 py-7">

        {/* =================================================
            LEFT SETTINGS SIDEBAR
            ================================================= */}

        <aside className="w-[300px] shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">

          {/* STORE HEADER */}

          <div className="border-b border-slate-200 p-5">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fuchsia-600 text-xs font-semibold text-white">
                Sto
              </div>


              <div>

                <h2 className="text-base font-semibold">
                  Store
                </h2>

                <p className="text-sm text-slate-500">
                  Store settings
                </p>

              </div>

            </div>

          </div>


          {/* SETTINGS SEARCH */}

          <div className="p-4">

            <div className="flex h-10 items-center rounded-lg border border-slate-300 px-3">

              <span className="mr-2 text-lg text-slate-500">
                ⌕
              </span>


              <input
                type="text"
                value={settingsSearch}
                onChange={(e) =>
                  setSettingsSearch(e.target.value)
                }
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
                onClick={() =>
                  handleMenuClick(item.label)
                }
                className={`mb-1 flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition ${
                  selectedSection === item.label
                    ? "bg-[#f0f0f0] font-semibold text-[#161c2c]"
                    : "text-slate-700 hover:bg-slate-50"
                } ${
                  item.nested
                    ? "pl-10"
                    : ""
                }`}
              >

                <span className="w-5 text-center text-base">
                  {item.icon}
                </span>


                <span>
                  {item.label}
                </span>

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

              <span className="text-xl">

                {
                  settingsMenu.find(
                    (item) =>
                      item.label === selectedSection
                  )?.icon
                }

              </span>


              <h1 className="text-xl font-semibold">
                {selectedSection}
              </h1>

            </div>


            {/* SAVE ONLY FOR GENERAL */}

            {selectedSection === "General" && (

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loading}
                className="rounded-lg bg-[#161c2c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#252e45] disabled:opacity-60"
              >
                {saveLabel}
              </button>

            )}

          </div>


          {/* =================================================
              CONTENT SWITCHING
              ================================================= */}

          {selectedSection === "General"
            ? renderGeneral()
            : selectedSection === "Users"
              ? <UsersSettings />
              : selectedSection === "Roles"
                ? <RolesSettings />
                : renderOtherSection()}

        </main>

      </div>

        </div>

      </div>

    </div>
  );
}
