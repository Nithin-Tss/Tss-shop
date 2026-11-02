"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
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

export default function ShippingPage() {
  const canManage = useCan("shipping.manage");

  const [locations, setLocations] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

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
    const [locs, gws, rts, store] = await Promise.all([
      apiGet("/api/v1/inventory/locations/"),
      apiGet(GATEWAYS),
      apiGet(RATES),
      storeId ? apiGet(`/api/v1/stores/${storeId}/`) : Promise.resolve({ ok: false }),
    ]);
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

  const addGateway = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    const res = await apiPost(GATEWAYS, {
      name: name.trim(),
      code: slugify(name),
      is_active: true,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.fieldErrors.code || res.fieldErrors.name || res.formError);
      return;
    }
    setName("");
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

  return (
    <div className="min-h-screen bg-[#F3F1EC] text-[#14130F]">
      <AdminHeader />

      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        <AdminSidebar />

        <main className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-[#F3F1EC] px-4 py-5 sm:px-6">
            <div className="flex items-center gap-2.5 text-[#14130F]">
              <PageIcon name="shipping" />
              <h1 className="text-xl font-semibold">Shipping</h1>
            </div>
          </header>

          <div className="p-5">
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
                  Charged at checkout. Free shipping applies once the order, after discounts,
                  reaches the threshold.
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
                  A rate for the shopper&apos;s country wins over a rate for anywhere. Weights are
                  in {weightUnit}, set per product.
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

            {/* DELIVERY PARTNERS */}
            <section className="mt-5 rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-5">
                <h2 className="text-base font-semibold">Delivery partners</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Couriers and carriers you choose when shipping an order.
                </p>
              </div>

              {loading ? (
                <p className="px-5 py-8 text-sm text-slate-500">Loading…</p>
              ) : gateways.length ? (
                <ul className="divide-y divide-slate-100">
                  {gateways.map((gateway) => (
                    <li
                      key={gateway.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                    >
                      <div>
                        <p className="text-sm font-medium">{gateway.name}</p>
                        <p className="text-xs text-slate-500">
                          {gateway.code} · {gateway.is_active ? "Active" : "Inactive"}
                        </p>
                      </div>

                      {canManage && (
                        <div className="flex gap-2">
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
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-8 text-center text-sm text-slate-500">
                  No delivery partners yet.
                </p>
              )}

              {canManage && (
                <form
                  onSubmit={addGateway}
                  className="flex flex-wrap gap-3 border-t border-slate-200 px-5 py-4"
                >
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Delivery partner name"
                    aria-label="Delivery partner name"
                    maxLength={100}
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#14130F]"
                  />
                  <button
                    type="submit"
                    disabled={saving || !name.trim()}
                    className="rounded-lg bg-[#14130F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1A1916] disabled:opacity-50"
                  >
                    {saving ? "Adding…" : "Add partner"}
                  </button>
                </form>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
