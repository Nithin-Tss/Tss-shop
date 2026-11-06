"use client";

import { useCallback, useEffect, useState } from "react";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
import { getStoreId } from "@/lib/auth";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

const RATES = "/api/v1/delivery/tax-rates/";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#14130F]";
const primaryButton =
  "rounded-lg bg-[#14130F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1A1916] disabled:opacity-50";
const smallButton =
  "rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50";

export default function AdminTax() {
  const storeId = getStoreId();
  const storeUrl = `/api/v1/stores/${storeId}/`;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rates, setRates] = useState([]);

  const [taxRate, setTaxRate] = useState("");
  const [pricesIncludeTax, setPricesIncludeTax] = useState(false);
  const [taxShipping, setTaxShipping] = useState(false);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [saved, setSaved] = useState("");

  const [form, setForm] = useState({ name: "", country: "", region: "", rate: "" });
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    const [list, store] = await Promise.all([apiGet(RATES), apiGet(storeUrl)]);
    if (list.ok) setRates(list.data?.results ?? list.data ?? []);
    else setError(list.status === 403 ? "You don't have access to tax settings." : list.error);
    if (store.ok && store.data) {
      setTaxRate(String(store.data.taxRate ?? ""));
      setPricesIncludeTax(!!store.data.pricesIncludeTax);
      setTaxShipping(!!store.data.taxShipping);
    }
    setLoading(false);
  }, [storeUrl]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const saveDefaults = async (event) => {
    event.preventDefault();
    setSavingDefaults(true);
    setSaved("");
    setError("");
    const res = await apiPatch(storeUrl, { taxRate, pricesIncludeTax, taxShipping });
    setSavingDefaults(false);
    if (!res.ok) return setError(res.fieldErrors?.taxRate || res.error || "Couldn't save.");
    setSaved("Tax settings saved.");
  };

  const setField = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const addRate = async (event) => {
    event.preventDefault();
    setAdding(true);
    setFormError("");
    const res = await apiPost(RATES, {
      name: form.name.trim(),
      country: form.country.trim(),
      region: form.region.trim(),
      rate: form.rate.trim(),
    });
    setAdding(false);
    if (!res.ok) {
      const fe = res.fieldErrors || {};
      return setFormError(
        res.formError || fe.country || fe.rate || fe.region || "Couldn't add the rate."
      );
    }
    setForm({ name: "", country: "", region: "", rate: "" });
    load();
  };

  const remove = async (rate) => {
    if (!window.confirm(`Remove the tax rate for ${rate.country}?`)) return;
    setError("");
    const res = await apiDelete(`${RATES}${rate.id}/`);
    if (!res.ok) return setError(res.error || "Couldn't remove the rate.");
    load();
  };

  return (
    <div className="min-h-screen bg-[#F3F1EC] text-[#14130F]">
      <AdminHeader />
      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        <AdminSidebar />
        <main className="min-w-0 flex-1">
          <header className="flex items-center gap-2.5 border-b border-slate-200 bg-[#F3F1EC] px-4 py-5 sm:px-6">
            <PageIcon name="settings" />
            <h1 className="text-xl font-semibold">Taxes</h1>
          </header>

          <div className="space-y-5 p-5">
            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white">
              <form onSubmit={saveDefaults} className="space-y-4 px-5 py-5">
                <h2 className="text-base font-semibold">Store defaults</h2>
                <div className="max-w-xs">
                  <label htmlFor="tax-default-rate" className="mb-1 block text-sm font-medium">
                    Default tax rate (%)
                  </label>
                  <input
                    id="tax-default-rate"
                    className={inputClass}
                    inputMode="decimal"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={pricesIncludeTax}
                    onChange={(e) => setPricesIncludeTax(e.target.checked)}
                  />
                  Prices include tax
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={taxShipping}
                    onChange={(e) => setTaxShipping(e.target.checked)}
                  />
                  Charge tax on shipping
                </label>
                <div className="flex items-center gap-3">
                  <button type="submit" className={primaryButton} disabled={savingDefaults}>
                    Save
                  </button>
                  {saved && (
                    <span role="status" className="text-sm text-emerald-700">
                      {saved}
                    </span>
                  )}
                </div>
              </form>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-5">
                <h2 className="text-base font-semibold">Destination rates</h2>
                <p className="mt-1 text-sm text-slate-500">
                  A rate for a country (and optionally a region) overrides the store default.
                </p>
              </div>
              {loading ? (
                <p className="px-5 py-8 text-sm text-slate-500">Loading…</p>
              ) : rates.length ? (
                <ul className="divide-y divide-slate-100">
                  {rates.map((rate) => (
                    <li key={rate.id} className="flex items-center justify-between gap-3 px-5 py-4">
                      <div>
                        <p className="text-sm font-medium">{rate.country}</p>
                        <p className="text-xs text-slate-500">
                          {rate.region ? `${rate.region} · ` : ""}
                          {rate.name || "Tax"} · {Number(rate.rate)}%
                        </p>
                      </div>
                      <button type="button" className={smallButton} onClick={() => remove(rate)}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-8 text-sm text-slate-500">No destination rates yet.</p>
              )}

              <form
                onSubmit={addRate}
                className="grid gap-3 border-t border-slate-200 px-5 py-5 sm:grid-cols-4"
              >
                {[
                  ["name", "Name", "tax-name"],
                  ["country", "Country", "tax-country"],
                  ["region", "Region", "tax-region"],
                  ["rate", "Rate", "tax-rate"],
                ].map(([key, label, id]) => (
                  <div key={key}>
                    <label htmlFor={id} className="mb-1 block text-sm font-medium">
                      {label}
                    </label>
                    <input
                      id={id}
                      className={inputClass}
                      value={form[key]}
                      onChange={setField(key)}
                    />
                  </div>
                ))}
                <div className="sm:col-span-4">
                  {formError && (
                    <p
                      role="alert"
                      className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                      {formError}
                    </p>
                  )}
                  <button type="submit" className={primaryButton} disabled={adding}>
                    Add rate
                  </button>
                </div>
              </form>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
