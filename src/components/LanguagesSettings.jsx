import { useMemo, useState } from "react";
import { LANGUAGES, getLanguage, setLanguage } from "@/lib/language";

export default function LanguagesSettings() {
  const [current, setCurrent] = useState(getLanguage);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      ([code, name, native]) =>
        name.toLowerCase().includes(q) ||
        native.toLowerCase().includes(q) ||
        code.toLowerCase() === q
    );
  }, [query]);

  const choose = async (code) => {
    setCurrent(code);
    setBusy(true);
    setError("");
    try {
      await setLanguage(code);
    } catch (e) {
      setError(e.message || "Could not change the language.");
    } finally {
      setBusy(false);
    }
  };

  const currentEntry = LANGUAGES.find(([c]) => c === current);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-lg font-semibold text-ink">Languages</h2>
        <p className="mt-1 text-sm text-slate-500">
          Choose a language. The entire website switches to it and remembers your choice.
        </p>
        <p className="mt-3 text-sm">
          Current language:{" "}
          <span className="font-semibold">
            {currentEntry ? `${currentEntry[1]} (${currentEntry[2]})` : current}
          </span>
          {busy && <span className="ml-2 text-slate-500">Translating…</span>}
        </p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search languages"
          className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-600"
        />
      </div>

      <ul className="grid gap-2 p-5 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map(([code, name, native]) => {
          const active = code === current;
          return (
            <li key={code}>
              <button
                type="button"
                disabled={busy}
                onClick={() => choose(code)}
                aria-pressed={active}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                  active
                    ? "border-orange-600 bg-ink text-white"
                    : "border-slate-200 hover:border-slate-400"
                }`}
              >
                <span>
                  <span className="font-medium">{name}</span>
                  <span className={`ml-2 ${active ? "text-slate-300" : "text-slate-500"}`}>
                    {native}
                  </span>
                </span>
                {active && <span aria-hidden="true">✓</span>}
              </button>
            </li>
          );
        })}
        {visible.length === 0 && <li className="text-sm text-slate-500">No languages match.</li>}
      </ul>
    </section>
  );
}
