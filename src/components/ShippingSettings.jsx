"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { getStoreId, useCan } from "@/lib/auth";

const GATEWAYS = "/api/v1/delivery/gateways/";
const RATES = "/api/v1/delivery/rates/";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#14130F]";

const bandLabel = (rate, unit) => {
  const min = Number(rate.min_weight);
  const max = rate.max_weight === null ? null : Number(rate.max_weight);
  if (max === null) return min > 0 ? `${min} ${unit} and over` : "Any weight";
  return `${min} to under ${max} ${unit}`;
};

const slugify = (text) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export default function ShippingSettings() {
  const canManage = useCan("shipping.manage");

  const [locations, setLocations] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  // Partner type: local drivers, a manual courier, or a courier API (list comes from the server)
  const [providers, setProviders] = useState([]);
  const [connecting, setConnecting] = useState(""); // carrier being connected
  const [editing, setEditing] = useState(null); // connected carrier whose credentials are being changed
  const [credentials, setCredentials] = useState({});
  const [webhookSecret, setWebhookSecret] = useState("");
  const [trackingTemplate, setTrackingTemplate] = useState("");
  const selected = providers.find((p) => p.code === connecting);

  // Checkout pricing: flat fee and free-shipping threshold live on the store, rates in their own list
  const storeId = getStoreId();
  const [rates, setRates] = useState([]);
  const [weightUnit, setWeightUnit] = useState("kg");
  const [flatRate, setFlatRate] = useState("0");
  const [threshold, setThreshold] = useState("");
  const [pricingMsg, setPricingMsg] = useState(null);
  const [savingPricing, setSavingPricing] = useState(false);
  const emptyRate = { country: "", min_weight: "", max_weight: "", price: "" };
  const [rateForm, setRateForm] = useState(emptyRate);
  const [rateErrors, setRateErrors] = useState({});
  const [savingRate, setSavingRate] = useState(false);

  const load = useCallback(async () => {
    const [locs, gws, rts, store, provs] = await Promise.all([
      apiGet("/api/v1/inventory/locations/"),
      apiGet(GATEWAYS),
      apiGet(RATES),
      storeId ? apiGet(`/api/v1/stores/${storeId}/`) : Promise.resolve({ ok: false }),
      apiGet("/api/v1/delivery/providers/"),
    ]);
    if (provs.ok) setProviders(provs.data?.results ?? provs.data ?? []);
    if (rts.ok) setRates(rts.data?.results ?? rts.data ?? []);
    if (store.ok) {
      setWeightUnit(store.data.weightUnit ?? "kg");
      setFlatRate(String(store.data.shippingFlatRate ?? "0"));
      setThreshold(store.data.freeShippingThreshold ?? "");
    }
    // Locations belong to inventory: a role without access just doesn't see them here
    setLocations(locs.ok ? (locs.data?.results ?? locs.data ?? []) : []);
    if (gws.ok) setGateways(gws.data?.results ?? gws.data ?? []);
    else setError(gws.error);
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const addGateway = async (event, code) => {
    event.preventDefault();
    const chosen = providers.find((p) => p.code === code);
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    const res = await apiPost(GATEWAYS, {
      name: name.trim(),
      code: slugify(name),
      provider: code,
      is_active: true,
      ...(chosen?.credential_fields?.length ? { credentials } : {}),
      ...(webhookSecret ? { webhook_secret: webhookSecret } : {}),
      ...(code === "manual" && trackingTemplate ? { tracking_url_template: trackingTemplate } : {}),
    });
    setSaving(false);
    if (!res.ok) {
      setError(
        res.fieldErrors.code || res.fieldErrors.name || res.fieldErrors.credentials || res.formError
      );
      return;
    }
    setName("");
    setConnecting("");
    setCredentials({});
    setWebhookSecret("");
    setTrackingTemplate("");
    load();
  };

  const newSecret = () =>
    setWebhookSecret(
      Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) =>
        b.toString(16).padStart(2, "0")
      ).join("")
    );

  const saveConnection = async (event, gateway) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const res = await apiPatch(`${GATEWAYS}${gateway.id}/`, {
      credentials,
      ...(webhookSecret ? { webhook_secret: webhookSecret } : {}),
      ...(gateway.provider === "manual" ? { tracking_url_template: trackingTemplate } : {}),
    });
    setSaving(false);
    if (!res.ok) return setError(res.fieldErrors.credentials || res.formError || "Couldn't save.");
    setEditing(null);
    setCredentials({});
    setWebhookSecret("");
    load();
  };

  const toggleGateway = async (gateway) => {
    setError("");
    const res = await apiPatch(`${GATEWAYS}${gateway.id}/`, { is_active: !gateway.is_active });
    if (!res.ok) return setError(res.formError || "Couldn't update the delivery partner.");
    load();
  };

  const removeGateway = async (gateway) => {
    if (!window.confirm(`Remove ${gateway.name}?`)) return;
    setError("");
    const res = await apiDelete(`${GATEWAYS}${gateway.id}/`);
    if (!res.ok) return setError(res.error);
    load();
  };

  const savePricing = async (event) => {
    event.preventDefault();
    setSavingPricing(true);
    setPricingMsg(null);
    const res = await apiPatch(`/api/v1/stores/${storeId}/`, {
      shippingFlatRate: flatRate === "" ? "0" : flatRate,
      freeShippingThreshold: threshold === "" ? null : threshold,
    });
    setSavingPricing(false);
    if (res.ok) return setPricingMsg({ type: "ok", text: "Shipping charges saved." });
    setPricingMsg({
      type: "error",
      text:
        res.status === 403
          ? "Only the store owner can change these."
          : res.fieldErrors.shippingFlatRate ||
            res.fieldErrors.freeShippingThreshold ||
            res.formError ||
            "Couldn't save shipping charges.",
    });
  };

  const addRate = async (event) => {
    event.preventDefault();
    setSavingRate(true);
    setRateErrors({});
    const res = await apiPost(RATES, {
      country: rateForm.country.trim(),
      min_weight: rateForm.min_weight === "" ? "0" : rateForm.min_weight,
      max_weight: rateForm.max_weight === "" ? null : rateForm.max_weight,
      price: rateForm.price,
    });
    setSavingRate(false);
    if (!res.ok) {
      setRateErrors({ ...res.fieldErrors, form: res.formError });
      return;
    }
    setRateForm(emptyRate);
    load();
  };

  const removeRate = async (rate) => {
    if (!window.confirm("Remove this shipping rate?")) return;
    setError("");
    const res = await apiDelete(`${RATES}${rate.id}/`);
    if (!res.ok) return setError(res.error);
    load();
  };

  const connectionFields = (provider, { editingExisting = false } = {}) => (
    <>
      {(provider?.fields ?? []).map((f) => (
        <label key={f.name} className="block w-full text-sm sm:w-[calc(50%-0.375rem)]">
          <span className="font-medium">
            {f.label}
            {f.required && !editingExisting ? " *" : ""}
          </span>
          <input
            type={f.secret ? "password" : "text"}
            value={credentials[f.name] ?? ""}
            onChange={(e) => setCredentials({ ...credentials, [f.name]: e.target.value })}
            placeholder={editingExisting && f.secret ? "Saved. Type to replace" : ""}
            autoComplete="off"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#14130F]"
          />
          {f.help && <span className="mt-1 block text-xs text-slate-500">{f.help}</span>}
        </label>
      ))}
      {provider?.code === "manual" && (
        <label className="block w-full text-sm">
          <span className="font-medium">Tracking link</span>
          <input
            value={trackingTemplate}
            onChange={(e) => setTrackingTemplate(e.target.value)}
            placeholder="https://courier.com/track/{tracking}"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#14130F]"
          />
          <span className="mt-1 block text-xs text-slate-500">
            {"{tracking}"} is replaced with the tracking number.
          </span>
        </label>
      )}
      {provider?.fields?.length > 0 && (
        <div className="w-full text-sm">
          <span className="font-medium">Webhook secret</span>
          <div className="mt-1 flex gap-2">
            <input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder={editingExisting ? "Saved. Type to replace" : "Choose one, or generate"}
              autoComplete="off"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#14130F]"
            />
            <button
              type="button"
              onClick={newSecret}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Generate
            </button>
          </div>
          <span className="mt-1 block text-xs text-slate-500">
            Enter this in the courier&apos;s webhook settings so it can send status updates. The
            webhook URL is shown on the carrier once it is connected.
          </span>
        </div>
      )}
    </>
  );

  const partnerList = (list, emptyText) => (
    <>
      {loading ? (
        <p className="px-5 py-8 text-sm text-slate-500">Loading…</p>
      ) : list.length ? (
        <ul className="divide-y divide-slate-100">
          {list.map((gateway) => (
            <li
              key={gateway.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <div>
                <p className="text-sm font-medium">{gateway.name}</p>
                <p className="text-xs text-slate-500">
                  {gateway.kind === "local"
                    ? "Local delivery"
                    : (providers.find((p) => p.code === gateway.provider)?.label ??
                      gateway.provider)}{" "}
                  · {gateway.is_active ? "Active" : "Inactive"}
                </p>
                {gateway.has_credentials && (
                  <p className="mt-1 break-all text-xs text-slate-500">
                    Webhook URL: {gateway.webhook_url}
                    {gateway.has_webhook_secret ? "" : " (add a webhook secret to receive updates)"}
                  </p>
                )}
              </div>

              {canManage && (
                <div className="flex gap-2">
                  {providers.find((p) => p.code === gateway.provider)?.fields?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(editing === gateway.id ? null : gateway.id);
                        setCredentials({});
                        setWebhookSecret("");
                        setTrackingTemplate("");
                      }}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
                    >
                      Edit connection
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleGateway(gateway)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
                  >
                    {gateway.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeGateway(gateway)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              )}
              {editing === gateway.id && (
                <form
                  onSubmit={(e) => saveConnection(e, gateway)}
                  className="flex w-full flex-wrap gap-3 border-t border-slate-100 pt-4"
                >
                  {connectionFields(
                    providers.find((p) => p.code === gateway.provider),
                    { editingExisting: true }
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-[#14130F] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save connection"}
                  </button>
                  <p className="w-full text-xs text-slate-500">
                    Leave a field blank to keep what is saved.
                  </p>
                </form>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-8 text-center text-sm text-slate-500">{emptyText}</p>
      )}
    </>
  );

  return (
    <div className="space-y-0">
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* SHIPPING ORIGIN */}
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-5">
          <h2 className="text-base font-semibold">Shipping origin</h2>
          <p className="mt-1 text-sm text-slate-500">
            Your inventory locations: orders ship from where the stock is held.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 px-5 py-5">
          <div className="min-w-0">
            <p className="text-sm font-medium">Locations</p>
            <p className="mt-1 text-sm text-slate-500">
              {loading
                ? "Loading…"
                : locations.length
                  ? locations.map((l) => l.name).join(", ")
                  : "No locations configured"}
            </p>
          </div>

          <Link
            to="/admin/online-store/inventory"
            className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Manage
          </Link>
        </div>
      </section>

      {/* SHIPPING CHARGES */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-5">
          <h2 className="text-base font-semibold">Shipping charges</h2>
          <p className="mt-1 text-sm text-slate-500">
            Charged at checkout. Free shipping applies once the order, after discounts, reaches the
            threshold.
          </p>
        </div>
        <form onSubmit={savePricing} className="grid gap-4 px-5 py-5 sm:grid-cols-3">
          <label className="text-sm font-medium">
            Flat rate
            <input
              type="number"
              min="0"
              step="0.01"
              value={flatRate}
              onChange={(e) => setFlatRate(e.target.value)}
              disabled={!canManage}
              className={`${inputClass} mt-1`}
            />
            <span className="mt-1 block text-xs font-normal text-slate-500">
              Used when no rate below fits the order.
            </span>
          </label>
          <label className="text-sm font-medium">
            Free shipping from
            <input
              type="number"
              min="0"
              step="0.01"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="No free shipping"
              disabled={!canManage}
              className={`${inputClass} mt-1`}
            />
          </label>
          {canManage && (
            <div className="flex items-end">
              <button
                type="submit"
                disabled={savingPricing}
                className="rounded-lg bg-[#14130F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1A1916] disabled:opacity-50"
              >
                {savingPricing ? "Saving…" : "Save"}
              </button>
            </div>
          )}
          {pricingMsg && (
            <p
              role={pricingMsg.type === "error" ? "alert" : "status"}
              className={`text-sm sm:col-span-3 ${pricingMsg.type === "error" ? "text-red-700" : "text-green-700"}`}
            >
              {pricingMsg.text}
            </p>
          )}
        </form>
      </section>

      {/* SHIPPING RATES */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-5">
          <h2 className="text-base font-semibold">Rates by country and weight</h2>
          <p className="mt-1 text-sm text-slate-500">
            A rate for the shopper&apos;s country wins over a rate for anywhere. Weights are in{" "}
            {weightUnit}, set per product.
          </p>
        </div>

        {loading ? (
          <p className="px-5 py-8 text-sm text-slate-500">Loading…</p>
        ) : rates.length ? (
          <ul className="divide-y divide-slate-100">
            {rates.map((rate) => (
              <li
                key={rate.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div>
                  <p className="text-sm font-medium">{rate.country || "Anywhere"}</p>
                  <p className="text-xs text-slate-500">
                    {bandLabel(rate, weightUnit)} · {rate.price}
                  </p>
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => removeRate(rate)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            No rates yet: every order pays the flat rate.
          </p>
        )}

        {canManage && (
          <form
            onSubmit={addRate}
            className="grid gap-3 border-t border-slate-200 px-5 py-4 sm:grid-cols-5"
          >
            <input
              value={rateForm.country}
              onChange={(e) => setRateForm({ ...rateForm, country: e.target.value })}
              placeholder="Country (blank = anywhere)"
              aria-label="Country"
              maxLength={100}
              className={inputClass}
            />
            <input
              type="number"
              min="0"
              step="0.001"
              value={rateForm.min_weight}
              onChange={(e) => setRateForm({ ...rateForm, min_weight: e.target.value })}
              placeholder={`From (${weightUnit})`}
              aria-label="Minimum weight"
              className={inputClass}
            />
            <input
              type="number"
              min="0"
              step="0.001"
              value={rateForm.max_weight}
              onChange={(e) => setRateForm({ ...rateForm, max_weight: e.target.value })}
              placeholder={`Under (${weightUnit})`}
              aria-label="Maximum weight"
              className={inputClass}
            />
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={rateForm.price}
              onChange={(e) => setRateForm({ ...rateForm, price: e.target.value })}
              placeholder="Price"
              aria-label="Price"
              className={inputClass}
            />
            <button
              type="submit"
              disabled={savingRate || rateForm.price === ""}
              className="rounded-lg bg-[#14130F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1A1916] disabled:opacity-50"
            >
              {savingRate ? "Adding…" : "Add rate"}
            </button>
            {(rateErrors.max_weight ||
              rateErrors.price ||
              rateErrors.min_weight ||
              rateErrors.form) && (
              <p role="alert" className="text-sm text-red-700 sm:col-span-5">
                {rateErrors.max_weight ||
                  rateErrors.min_weight ||
                  rateErrors.price ||
                  rateErrors.form}
              </p>
            )}
          </form>
        )}
      </section>

      {/* LOCAL DELIVERY */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-5">
          <h2 className="text-base font-semibold">Local delivery</h2>
          <p className="mt-1 text-sm text-slate-500">
            Deliver with your own drivers or vans. When shipping an order you name the driver.
          </p>
        </div>
        {partnerList(
          gateways.filter((g) => g.kind === "local"),
          "No local delivery set up yet."
        )}
        {canManage && (
          <form
            onSubmit={(e) => addGateway(e, "local")}
            className="flex flex-wrap gap-3 border-t border-slate-200 px-5 py-4"
          >
            <input
              value={connecting ? "" : name}
              onChange={(e) => {
                setConnecting("");
                setName(e.target.value);
              }}
              placeholder="Name, e.g. Our van"
              aria-label="Local delivery name"
              maxLength={100}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#14130F]"
            />
            <button
              type="submit"
              disabled={saving || connecting || !name.trim()}
              className="rounded-lg bg-[#14130F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1A1916] disabled:opacity-50"
            >
              {saving && !connecting ? "Adding…" : "Add local delivery"}
            </button>
          </form>
        )}
      </section>

      {/* THIRD-PARTY CARRIERS */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-5">
          <h2 className="text-base font-semibold">Third-party carriers</h2>
          <p className="mt-1 text-sm text-slate-500">
            Connect a courier so orders are booked with them and tracking updates come back
            automatically.
          </p>
        </div>
        {partnerList(
          gateways.filter((g) => g.kind !== "local"),
          "No carriers connected yet."
        )}
        {canManage && (
          <div className="border-t border-slate-200 px-5 py-4">
            <p className="mb-3 text-sm font-medium">Connect a carrier</p>
            <div className="flex flex-wrap gap-3">
              {providers
                .filter((p) => p.kind === "carrier")
                .map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => {
                      setConnecting(connecting === p.code ? "" : p.code);
                      setName("");
                      setCredentials({});
                    }}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                      connecting === p.code
                        ? "border-[#14130F] bg-slate-50"
                        : "border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
            </div>

            {selected && (
              <form
                onSubmit={(e) => addGateway(e, selected.code)}
                className="mt-4 flex flex-wrap gap-3"
              >
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`Name, e.g. ${selected.label}`}
                  aria-label="Carrier name"
                  maxLength={100}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#14130F]"
                />
                {connectionFields(selected)}
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="rounded-lg bg-[#14130F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1A1916] disabled:opacity-50"
                >
                  {saving ? "Connecting…" : `Connect ${selected.label}`}
                </button>
              </form>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
