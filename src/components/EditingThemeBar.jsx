import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getEditingThemeId, setEditingThemeId } from "@/lib/editingTheme";
import { getThemeLibrary, publishTheme } from "@/lib/themeApi";

// Shown over the customizer and the code editor while they work on a draft, so it's clear the live store isn't being changed.
export default function EditingThemeBar() {
  const [theme, setTheme] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = getEditingThemeId();
    if (!id) return undefined;
    let cancelled = false;
    getThemeLibrary()
      .then((data) => {
        if (cancelled) return;
        const found = data.themes.find((t) => t.id === id);
        if (!found) setEditingThemeId("");
        setTheme(found && !found.published ? found : null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!theme) return null;

  const publish = async () => {
    if (
      busy ||
      !window.confirm(`Publish "${theme.name}"? It replaces your live theme on your storefront.`)
    )
      return;
    setBusy(true);
    setError("");
    try {
      await publishTheme(theme.id);
      setTheme(null);
    } catch (e) {
      setError(e.message || "Could not publish.");
    }
    setBusy(false);
  };

  return (
    <div className="fixed bottom-3 left-3 z-[60] flex max-w-[calc(100vw-24px)] flex-wrap items-center gap-2 rounded-xl bg-[#0B1020] px-3.5 py-2 text-[13px] text-white shadow-lg">
      <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
        Draft
      </span>
      <span className="truncate font-medium">{theme.name}</span>
      <span className="text-white/60">Your live store isn’t changed.</span>
      <button
        type="button"
        onClick={publish}
        disabled={busy}
        className="rounded-lg bg-white px-2.5 py-1 font-semibold text-[#0B1020] disabled:opacity-60"
      >
        {busy ? "Publishing…" : "Publish"}
      </button>
      <Link to="/admin/online-store" className="underline underline-offset-2">
        All themes
      </Link>
      {error && <span className="basis-full text-[#FDA29B]">{error}</span>}
    </div>
  );
}
