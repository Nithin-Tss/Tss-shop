import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
import { useCan } from "@/lib/auth";
import { setEditingThemeId, getEditingThemeId } from "@/lib/editingTheme";
import { addTheme, deleteTheme, getThemeLibrary, publishTheme, renameTheme } from "@/lib/themeApi";

const categories = [
  "All",
  "Beauty",
  "Fashion",
  "Electronics",
  "Home & Living",
  "Food & Beverage",
  "Health & Wellness",
  "Sports",
  "Manufacturing",
];

const lineIcon = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

const OWN_SWATCHES = ["#161C2C", "#FFFFFF", "#161C2C"];

// A small storefront drawn from a theme's colours
function Preview({ swatches }) {
  const [accent, background, text] = swatches;
  return (
    <div
      className="overflow-hidden rounded-xl border border-black/5"
      style={{ background, color: text }}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between px-3 py-2">
        <span className="h-2 w-10 rounded-full" style={{ background: text }} />
        <span className="flex gap-1.5">
          <span className="h-1.5 w-5 rounded-full opacity-50" style={{ background: text }} />
          <span className="h-1.5 w-5 rounded-full opacity-50" style={{ background: text }} />
        </span>
      </div>
      <div className="mx-3 h-16 rounded-lg" style={{ background: accent, opacity: 0.9 }} />
      <div className="grid grid-cols-3 gap-2 p-3">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-8 rounded-md" style={{ background: text, opacity: 0.1 }} />
        ))}
      </div>
    </div>
  );
}

const smallButton =
  "inline-flex h-8 items-center rounded-lg border border-[#DDD6FE] bg-white px-3 text-[13px] font-medium text-[#0B1020] transition hover:border-[#0B1020] disabled:opacity-50";
const primaryButton =
  "inline-flex h-8 items-center rounded-lg bg-[#0B1020] px-3 text-[13px] font-semibold text-white transition hover:bg-[#1C2347] disabled:opacity-50";

// Asks for a theme's name (creating your own, copying, renaming)
function NameDialog({ title, confirmLabel, initial, onCancel, onConfirm, busy, error }) {
  const [name, setName] = useState(initial);
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <form
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm(name);
        }}
      >
        <h2 className="text-lg font-semibold text-[#0B1020]">{title}</h2>
        <label className="mt-4 block text-sm font-medium text-[#4C4F7A]" htmlFor="theme-name">
          Theme name
        </label>
        <input
          id="theme-name"
          autoFocus
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5 h-10 w-full rounded-lg border border-[#DDD6FE] px-3 text-sm outline-none focus:border-[#0B1020]"
        />
        {error && <p className="mt-2 text-sm text-[#B42318]">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className={smallButton}>
            Cancel
          </button>
          <button type="submit" disabled={busy || !name.trim()} className={primaryButton}>
            {busy ? "Saving…" : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function OnlineStorePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // The customizer and code editor change themes
  const canEditTheme = useCan("themes.manage");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [library, setLibrary] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  // { kind: "own" | "copy" | "rename", theme? }
  const [dialog, setDialog] = useState(searchParams.get("create") === "1" ? { kind: "own" } : null);
  const [dialogError, setDialogError] = useState("");

  const show = useCallback((data) => {
    setLibrary(data);
    // A draft that was deleted can't stay selected for editing
    if (getEditingThemeId() && !data.themes.some((t) => t.id === getEditingThemeId()))
      setEditingThemeId("");
  }, []);

  const failed = useCallback((e) => {
    setError(e.message || "Could not load your themes.");
    setLibrary((old) => old || { themes: [], presets: [], max: 20 });
  }, []);

  // Reload after a change
  const load = useCallback(() => getThemeLibrary().then(show).catch(failed), [show, failed]);

  useEffect(() => {
    let cancelled = false;
    getThemeLibrary()
      .then((data) => !cancelled && show(data))
      .catch((e) => !cancelled && failed(e));
    return () => {
      cancelled = true;
    };
  }, [show, failed]);

  // Back to the previous page, or the admin home if this page was opened directly
  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/admin/online-store/home");
  };

  const themes = library?.themes || [];
  const presets = library?.presets || [];
  const live = themes.find((t) => t.published);
  const presetOf = (slug) => presets.find((p) => p.slug === slug);
  const shown = presets.filter(
    (p) => selectedCategory === "All" || p.categories.includes(selectedCategory)
  );
  const full = themes.length >= (library?.max || 20);

  const run = async (key, task) => {
    if (busy) return;
    setBusy(key);
    setError("");
    setNotice("");
    try {
      await task();
    } catch (e) {
      setError(e.message || "Something went wrong.");
    }
    setBusy("");
  };

  // The store's first theme goes live at once; later ones are saved as drafts next to the live one
  const add = (source, name) =>
    run(`add-${source}`, async () => {
      const first = themes.length === 0;
      const created = await addTheme(source, name);
      if (first) {
        setEditingThemeId("");
        navigate("/admin/online-store/customize");
        return;
      }
      setNotice(`“${created.name}” was added as a draft. Your live theme hasn’t changed.`);
      await load();
    });

  const open = (theme, to) => {
    setEditingThemeId(theme.published ? "" : theme.id);
    navigate(to);
  };

  const publish = (theme) => {
    if (
      !window.confirm(
        `Publish “${theme.name}”? It replaces “${live?.name}” on your storefront. “${live?.name}” stays in your themes as a draft.`
      )
    )
      return;
    run(`publish-${theme.id}`, async () => {
      await publishTheme(theme.id);
      setNotice(`“${theme.name}” is now live.`);
      await load();
    });
  };

  const remove = (theme) => {
    if (
      !window.confirm(`Delete the draft “${theme.name}”? Its design and code are removed for good.`)
    )
      return;
    run(`delete-${theme.id}`, async () => {
      await deleteTheme(theme.id);
      if (getEditingThemeId() === theme.id) setEditingThemeId("");
      await load();
    });
  };

  const confirmDialog = async (name) => {
    setBusy("dialog");
    setDialogError("");
    try {
      if (dialog.kind === "rename") {
        await renameTheme(dialog.theme.id, name);
        await load();
      } else if (dialog.kind === "copy") {
        const created = await addTheme(dialog.theme.id, name);
        setNotice(`“${created.name}” was added as a draft.`);
        await load();
      } else {
        const first = themes.length === 0;
        await addTheme("blank", name);
        if (first) {
          setEditingThemeId("");
          navigate("/admin/online-store/customize");
          return;
        }
        setNotice(`“${name}” was added as a draft. Your live theme hasn’t changed.`);
        await load();
      }
      setDialog(null);
    } catch (e) {
      setDialogError(e.message || "Could not save.");
    }
    setBusy("");
  };

  return (
    <div className="min-h-screen bg-white text-[#0B1020]">
      <AdminHeader />

      <div className="flex min-h-[calc(100vh-72px)]">
        <AdminSidebar />

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="mx-auto flex w-full max-w-[1160px] flex-1 flex-col px-4 pb-10 pt-5 sm:px-8">
            <button
              type="button"
              onClick={goBack}
              className="-ml-2 inline-flex self-start items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-[#4C4F7A] transition hover:bg-[#F3F5F8] hover:text-[#0B1020]"
            >
              <svg {...lineIcon} className="h-4 w-4">
                <path d="M19 12H5M11 6l-6 6 6 6" />
              </svg>
              Back
            </button>

            <div className="mt-3">
              <h1 className="flex items-center gap-2.5 text-[26px] font-semibold leading-tight tracking-tight text-[#0B1020] sm:text-[28px]">
                <PageIcon name="themes" />
                {themes.length === 0 && library ? "Choose a theme for your store" : "Themes"}
              </h1>
              <p className="mt-1.5 text-sm text-[#4C4F7A] sm:text-[15px]">
                {themes.length === 0 && library
                  ? "Pick a ready-made design, or start your own. You can change everything later."
                  : "One theme is live on your store. Add more and keep them as drafts until you’re ready to publish."}
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-lg bg-[#FEF2F2] px-3 py-2 text-sm text-[#B42318]"
              >
                {error}
              </p>
            )}
            {notice && (
              <p
                role="status"
                className="mt-4 rounded-lg bg-[#ECFDF3] px-3 py-2 text-sm text-[#067647]"
              >
                {notice}
              </p>
            )}

            {library === null && (
              <p className="py-16 text-center text-sm text-[#4C4F7A]">Loading themes…</p>
            )}

            {/* YOUR THEMES */}
            {themes.length > 0 && (
              <section className="mt-6" aria-labelledby="your-themes">
                <h2 id="your-themes" className="text-lg font-semibold">
                  Your themes
                </h2>
                <ul className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {themes.map((theme) => {
                    const preset = presetOf(theme.preset);
                    return (
                      <li
                        key={theme.id}
                        className={`rounded-2xl border bg-white p-3 ${theme.published ? "border-[#0B1020]" : "border-[#E4DEFB]"}`}
                      >
                        <Preview swatches={preset?.swatches || OWN_SWATCHES} />
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <h3 className="truncate text-[15px] font-semibold">{theme.name}</h3>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              theme.published
                                ? "bg-[#0B1020] text-white"
                                : "bg-[#EDE9FE] text-[#4C4F7A]"
                            }`}
                          >
                            {theme.published ? "Published" : "Draft"}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[13px] text-[#4C4F7A]">
                          {preset ? `${preset.name} design` : "Your own design"}
                        </p>

                        {canEditTheme && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              className={primaryButton}
                              onClick={() => open(theme, "/admin/online-store/customize")}
                            >
                              Customize
                            </button>
                            <button
                              type="button"
                              className={smallButton}
                              onClick={() => open(theme, "/editor-demo")}
                            >
                              Code editor
                            </button>
                            {!theme.published && (
                              <button
                                type="button"
                                className={smallButton}
                                disabled={Boolean(busy)}
                                onClick={() => publish(theme)}
                              >
                                Publish
                              </button>
                            )}
                            <button
                              type="button"
                              className={smallButton}
                              onClick={() => {
                                setDialogError("");
                                setDialog({ kind: "rename", theme });
                              }}
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              className={smallButton}
                              disabled={full}
                              title={full ? "You've reached the theme limit" : undefined}
                              onClick={() => {
                                setDialogError("");
                                setDialog({ kind: "copy", theme });
                              }}
                            >
                              Duplicate
                            </button>
                            {!theme.published && (
                              <button
                                type="button"
                                className={`${smallButton} text-[#B42318]`}
                                disabled={Boolean(busy)}
                                onClick={() => remove(theme)}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* THEME LIBRARY */}
            {library && (
              <section className="mt-8" aria-labelledby="theme-library">
                <h2 id="theme-library" className="text-lg font-semibold">
                  Theme library
                </h2>
                <p className="mt-1 text-sm text-[#4C4F7A]">
                  {themes.length === 0
                    ? "Your pick goes live right away."
                    : "Adding a theme saves it as a draft. Your live theme isn’t touched until you publish."}
                </p>

                <div className="-mx-4 mt-4 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-8 sm:px-8 [&::-webkit-scrollbar]:hidden">
                  <div className="flex w-max gap-2">
                    {categories.map((category) => {
                      const active = selectedCategory === category;
                      return (
                        <button
                          key={category}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setSelectedCategory(category)}
                          className={`h-8 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition ${
                            active
                              ? "bg-[#0B1020] text-white"
                              : "border border-[#E4DEFB] bg-white text-[#4C4F7A] hover:border-[#C9D1DD] hover:bg-[#F5F3FF] hover:text-[#0B1020]"
                          }`}
                        >
                          {category}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Your own */}
                  {canEditTheme && (
                    <li className="flex flex-col rounded-2xl border border-dashed border-[#C9D1DD] bg-[#fafbfc] p-3">
                      <div className="flex h-[132px] items-center justify-center rounded-xl bg-white text-[#8B8FB8]">
                        <svg {...lineIcon} className="h-8 w-8">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </div>
                      <h3 className="mt-3 text-[15px] font-semibold">Create your own theme</h3>
                      <p className="mt-1 flex-1 text-[13px] leading-relaxed text-[#4C4F7A]">
                        Start from a clean base and build your design with the customizer and the
                        code editor.
                      </p>
                      <button
                        type="button"
                        className={`${primaryButton} mt-3 self-start`}
                        disabled={Boolean(busy) || full}
                        onClick={() => {
                          setDialogError("");
                          setDialog({ kind: "own" });
                        }}
                      >
                        Create theme
                      </button>
                    </li>
                  )}

                  {shown.map((preset) => (
                    <li
                      key={preset.slug}
                      className="flex flex-col rounded-2xl border border-[#E4DEFB] bg-white p-3"
                    >
                      <Preview swatches={preset.swatches} />
                      <h3 className="mt-3 text-[15px] font-semibold">{preset.name}</h3>
                      <p className="mt-1 flex-1 text-[13px] leading-relaxed text-[#4C4F7A]">
                        {preset.description}
                      </p>
                      {canEditTheme && (
                        <button
                          type="button"
                          className={`${primaryButton} mt-3 self-start`}
                          disabled={Boolean(busy) || full}
                          onClick={() => add(preset.slug)}
                        >
                          {busy === `add-${preset.slug}`
                            ? "Adding…"
                            : themes.length === 0
                              ? "Use this theme"
                              : "Add to my themes"}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                {full && (
                  <p className="mt-3 text-sm text-[#4C4F7A]">
                    You have {library.max} themes. Delete a draft to add another.
                  </p>
                )}
              </section>
            )}
          </div>
        </main>
      </div>

      {dialog && (
        <NameDialog
          title={
            dialog.kind === "rename"
              ? "Rename theme"
              : dialog.kind === "copy"
                ? "Duplicate theme"
                : "Create your own theme"
          }
          confirmLabel={
            dialog.kind === "rename"
              ? "Save"
              : themes.length === 0 && dialog.kind === "own"
                ? "Create and open"
                : "Create"
          }
          initial={
            dialog.kind === "rename"
              ? dialog.theme.name
              : dialog.kind === "copy"
                ? `${dialog.theme.name} copy`
                : "My theme"
          }
          busy={busy === "dialog"}
          error={dialogError}
          onCancel={() => setDialog(null)}
          onConfirm={confirmDialog}
        />
      )}
    </div>
  );
}
