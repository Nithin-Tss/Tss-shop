import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api";

// Multi-currency storefront settings: which currencies shoppers may switch to. The admin itself always
// stays in the store's base currency; only the storefront converts.
export default function CurrencySettings({ storeId, baseCurrency, currencies, canEdit = true }) {
  const [enabled, setEnabled] = useState([]);
  const [on, setOn] = useState(false);
  const [markup, setMarkup] = useState("0");
  const [rated, setRated] = useState(new Set());
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiGet(`/api/v1/stores/${storeId}/`).then((res) => {
      if (cancelled || !res.ok) return;
      setOn(Boolean(res.data.multiCurrencyEnabled));
      setEnabled(res.data.enabledCurrencies || []);
      setMarkup(String(res.data.fxMarkupPercent ?? "0"));
      setRated(new Set(res.data.rateCurrencies || []));
    });
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return currencies.filter(
      (c) => c.code !== baseCurrency && (!q || `${c.code} ${c.name}`.toLowerCase().includes(q))
    );
  }, [currencies, baseCurrency, query]);

  const storefrontList = [
    baseCurrency,
    ...(on ? enabled.filter((c) => c !== baseCurrency && rated.has(c)) : []),
  ];

  const toggle = (code) =>
    setEnabled((list) => (list.includes(code) ? list.filter((c) => c !== code) : [...list, code]));

  const save = async () => {
    setSaving(true);
    setMessage(null);
    const res = await apiPatch(`/api/v1/stores/${storeId}/`, {
      multiCurrencyEnabled: on,
      enabledCurrencies: enabled,
      fxMarkupPercent: markup === "" ? "0" : markup,
    });
    setSaving(false);
    setMessage(
      res.ok
        ? { type: "ok", text: "Currency settings saved." }
        : { type: "error", text: res.error || "Could not save currency settings." }
    );
  };

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-4">
      <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium text-slate-800">
        Let shoppers switch currency
        <input
          type="checkbox"
          checked={on}
          disabled={!canEdit}
          onChange={(e) => setOn(e.target.checked)}
        />
      </label>

      <p className="text-sm text-slate-500" data-testid="storefront-displays-in">
        Storefront displays in: <strong>{storefrontList.join(", ")}</strong>. Your admin always
        shows {baseCurrency}; shoppers are charged in {baseCurrency}, and other currencies are
        estimates.
      </p>

      {on && (
        <>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search currencies"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />

          <ul className="max-h-56 divide-y divide-slate-100 overflow-auto rounded-lg border border-slate-200">
            {shown.map((c) => {
              const usable = rated.has(c.code);
              return (
                <li key={c.code}>
                  <label
                    className={`flex items-center gap-3 px-3 py-2 text-sm ${usable ? "cursor-pointer" : "text-slate-400"}`}
                  >
                    <input
                      type="checkbox"
                      checked={enabled.includes(c.code)}
                      disabled={!canEdit}
                      onChange={() => toggle(c.code)}
                    />
                    <span className="font-medium">{c.code}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {c.name} ({c.symbol})
                    </span>
                    {!usable && (
                      <span className="text-xs">Rate unavailable, hidden from shoppers</span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>

          <label className="block text-sm text-slate-800">
            Markup on converted prices (%)
            <input
              type="number"
              min="0"
              max="50"
              step="0.01"
              value={markup}
              disabled={!canEdit}
              onChange={(e) => setMarkup(e.target.value)}
              className="ml-3 w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
        </>
      )}

      {message && (
        <p className={`text-sm ${message.type === "ok" ? "text-green-700" : "text-red-600"}`}>
          {message.text}
        </p>
      )}

      {canEdit && (
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save currency settings"}
        </button>
      )}
    </div>
  );
}
