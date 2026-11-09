import { useCallback, useEffect, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { getStoreId, useCan } from "@/lib/auth";

const RATES = "/api/v1/delivery/tax-rates/";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-600";
const primaryButton =
  "rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600/90 disabled:opacity-50";

const destination = (rate) =>
  rate.region ? `${rate.region}, ${rate.country}` : rate.country || "Everywhere";

export default function TaxSettings() {
  const storeId = getStoreId();
  const canManageStore = useCan("tax.manage");
  const canManageRates = useCan("shipping.manage");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rates, setRates] = useState([]);

  // Store-wide defaults
  const [taxRate, setTaxRate] = useState("0");
  const [pricesIncludeTax, setPricesIncludeTax] = useState(false);
  const [taxShipping, setTaxShipping] = useState(false);
  const [defaultsMsg, setDefaultsMsg] = useState(null);
  const [savingDefaults, setSavingDefaults] = useState(false);

  const emptyRule = { name: "", country: "", region: "", rate: "" };
  const [form, setForm] = useState(emptyRule);
  const [formError, setFormError] = useState("");
  const [savingRule, setSavingRule] = useState(false);

  const load = useCallback(async () => {
    const [list, store] = await Promise.all([
      apiGet(RATES),
      storeId ? apiGet(`/api/v1/stores/${storeId}/`) : Promise.resolve({ ok: false }),
    ]);
    if (list.ok) setRates(list.data?.results ?? list.data ?? []);
    else setError(list.error);
    if (store.ok) {
      setTaxRate(String(store.data.taxRate ?? "0"));
      setPricesIncludeTax(Boolean(store.data.pricesIncludeTax));
      setTaxShipping(Boolean(store.data.taxShipping));
    }
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const saveDefaults = async (event) => {
    event.preventDefault();
    setSavingDefaults(true);
    setDefaultsMsg(null);
    const res = await apiPatch(`/api/v1/stores/${storeId}/`, {
      taxRate: taxRate === "" ? "0" : taxRate,
      pricesIncludeTax,
      taxShipping,
    });
    setSavingDefaults(false);
    setDefaultsMsg(
      res.ok
        ? { type: "ok", text: "Tax settings saved." }
        : {
            type: "error",
            text:
              res.status === 403
                ? "You don't have permission to change tax settings."
                : res.fieldErrors?.taxRate || res.formError || "Couldn't save tax settings.",
          }
    );
  };

  const addRule = async (event) => {
    event.preventDefault();
    setSavingRule(true);
    setFormError("");
    const res = await apiPost(RATES, {
      name: form.name.trim(),
      country: form.country.trim(),
      region: form.region.trim(),
      rate: form.rate,
    });
    setSavingRule(false);
    if (!res.ok) {
      const fe = res.fieldErrors || {};
      setFormError(fe.rate || fe.country || fe.region || res.formError || "Couldn't add the rate.");
      return;
    }
    setForm(emptyRule);
    load();
  };

  const removeRule = async (rate) => {
    if (!window.confirm(`Remove the tax rate for ${destination(rate)}?`)) return;
    setError("");
    const res = await apiDelete(`${RATES}${rate.id}/`);
    if (!res.ok) return setError(res.error);
    load();
  };

  return (
    <div>
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-5">
          <h2 className="text-base font-semibold">Store defaults</h2>
          <p className="mt-1 text-sm text-slate-500">
            Applied at checkout when no destination rate below matches the address.
          </p>
        </div>
        <form onSubmit={saveDefaults} className="grid gap-4 px-5 py-5 sm:grid-cols-3">
          <label className="text-sm font-medium">
            Default tax rate (%)
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              disabled={!canManageStore}
              className={`${inputClass} mt-1`}
            />
          </label>
          <label className="flex items-start gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={pricesIncludeTax}
              onChange={(e) => setPricesIncludeTax(e.target.checked)}
              disabled={!canManageStore}
              className="mt-1"
            />
            <span>
              Prices include tax
              <span className="block text-xs font-normal text-slate-500">
                Tax is shown at checkout but not added to the total.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={taxShipping}
              onChange={(e) => setTaxShipping(e.target.checked)}
              disabled={!canManageStore}
              className="mt-1"
            />
            <span>
              Charge tax on shipping
              <span className="block text-xs font-normal text-slate-500">
                Shipping fees are taxed at the same rate.
              </span>
            </span>
          </label>
          {canManageStore && (
            <div className="sm:col-span-3">
              <button type="submit" disabled={savingDefaults} className={primaryButton}>
                {savingDefaults ? "Saving…" : "Save"}
              </button>
            </div>
          )}
          {defaultsMsg && (
            <p
              role={defaultsMsg.type === "error" ? "alert" : "status"}
              className={`text-sm sm:col-span-3 ${defaultsMsg.type === "error" ? "text-red-700" : "text-green-700"}`}
            >
              {defaultsMsg.text}
            </p>
          )}
        </form>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-5">
          <h2 className="text-base font-semibold">Rates by destination</h2>
          <p className="mt-1 text-sm text-slate-500">
            The most specific rule wins: a region beats its country, a country beats everywhere.
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
                  <p className="text-sm font-medium">{destination(rate)}</p>
                  <p className="text-xs text-slate-500">
                    {rate.name ? `${rate.name} · ` : ""}
                    {Number(rate.rate)}%
                  </p>
                </div>
                {canManageRates && (
                  <button
                    type="button"
                    onClick={() => removeRule(rate)}
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
            No destination rates yet: every order uses the default rate.
          </p>
        )}

        {canManageRates && (
          <form
            onSubmit={addRule}
            className="grid gap-3 border-t border-slate-200 px-5 py-4 sm:grid-cols-5"
          >
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Name (e.g. VAT)"
              aria-label="Name"
              maxLength={100}
              className={inputClass}
            />
            <input
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              placeholder="Country (blank = everywhere)"
              aria-label="Country"
              maxLength={100}
              className={inputClass}
            />
            <input
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
              placeholder="State / region"
              aria-label="Region"
              maxLength={100}
              className={inputClass}
            />
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              required
              value={form.rate}
              onChange={(e) => setForm({ ...form, rate: e.target.value })}
              placeholder="Rate %"
              aria-label="Rate"
              className={inputClass}
            />
            <button
              type="submit"
              disabled={savingRule || form.rate === ""}
              className={primaryButton}
            >
              {savingRule ? "Adding…" : "Add rate"}
            </button>
            {formError && (
              <p role="alert" className="text-sm text-red-700 sm:col-span-5">
                {formError}
              </p>
            )}
          </form>
        )}
      </section>
    </div>
  );
}
