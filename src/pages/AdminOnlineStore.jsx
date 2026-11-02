import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
import { openStorefront } from "@/lib/api";
import { useCan } from "@/lib/auth";
import { setEditingThemeId, getEditingThemeId } from "@/lib/editingTheme";
import {
  addTheme,
  deleteTheme,
  getThemeLibrary,
  publishTheme,
  renameTheme,
  renderThemeHome,
} from "@/lib/themeApi";

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

const SITE_WIDTH = 1280;
const homeCache = new Map();

// The theme's real home page, scaled down to fit. Falls back to the colour mock-up while it loads or if it fails.
function LivePreview({ theme, swatches, ratio = 0.62, className = "" }) {
  const box = useRef(null);
  const key = `${theme.id}:${theme.updated_at}`;
  const [html, setHtml] = useState(homeCache.get(key) || "");
  const [scale, setScale] = useState(0.2);

  useEffect(() => {
    if (homeCache.has(key)) return undefined;
    let cancelled = false;
    renderThemeHome(theme.id)
      .then((res) => {
        homeCache.set(key, res.html);
        if (!cancelled) setHtml(res.html);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [key, theme.id]);

  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => setScale(el.clientWidth / SITE_WIDTH));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={box}
      className={`relative w-full overflow-hidden bg-white ${className}`}
      style={{ aspectRatio: `1 / ${ratio}` }}
    >
      {html ? (
        <iframe
          title={`${theme.name} preview`}
          srcDoc={html}
          // Theme code is written by store owners: keep it off this origin
          sandbox="allow-scripts"
          tabIndex={-1}
          className="pointer-events-none absolute left-0 top-0 origin-top-left border-0 bg-white"
          style={{
            width: SITE_WIDTH,
            height: SITE_WIDTH * ratio,
            transform: `scale(${scale})`,
          }}
        />
      ) : (
        <div className="absolute inset-0 animate-pulse">
          <Preview swatches={swatches} />
        </div>
      )}
    </div>
  );
}

const smallButton =
  "inline-flex h-8 items-center rounded-lg border border-[#E7E4DC] bg-white px-3 text-[13px] font-medium text-[#14130F] transition hover:border-[#14130F] disabled:opacity-50";
// The theme as a working store in a new tab: real pages, cart and links (a draft is shown to you only)
function OpenThemeLink({ theme, className }) {
  return (
    <button
      type="button"
      onClick={() => openStorefront("/", theme.published ? "" : theme.id)}
      className={className}
    >
      Open theme
    </button>
  );
}

const primaryButton =
  "inline-flex h-8 items-center rounded-lg bg-[#14130F] px-3 text-[13px] font-semibold text-white transition hover:bg-[#1A1916] disabled:opacity-50";

function timeAgo(value) {
  const ms = Date.now() - new Date(value).getTime();
  if (!value || Number.isNaN(ms)) return "recently";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.floor(hr / 24);
  return `${day} day${day === 1 ? "" : "s"} ago`;
}

function formatAdded(value) {
  const d = new Date(value);
  if (!value || Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} at ${time}`;
}

// The "..." menu on a theme row
function ThemeMenu({ theme, full, dark, onCode, onRename, onCopy, onDelete }) {
  const item =
    "block w-full px-3 py-1.5 text-left text-[13px] hover:bg-[#F3F5F8] disabled:opacity-50";
  const pick = (fn) => (e) => {
    e.currentTarget.closest("details")?.removeAttribute("open");
    fn();
  };
  return (
    <details className="relative">
      <summary
        aria-label={`More actions for ${theme.name}`}
        className={`flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-lg text-lg leading-none [&::-webkit-details-marker]:hidden ${
          dark ? "text-white hover:bg-white/15" : "text-[#14130F] hover:bg-[#F3F5F8]"
        }`}
      >
        ⋯
      </summary>
      <div className="absolute bottom-full right-0 z-20 mb-1 w-36 rounded-lg border border-[#E7E4DC] bg-white py-1 text-[#14130F] shadow-lg sm:bottom-auto sm:top-full sm:mb-0 sm:mt-1">
        <button type="button" className={item} onClick={pick(onCode)}>
          Edit code
        </button>
        <button type="button" className={item} onClick={pick(onRename)}>
          Rename
        </button>
        <button type="button" className={item} disabled={full} onClick={pick(onCopy)}>
          Duplicate
        </button>
        {!theme.published && onDelete && (
          <button type="button" className={`${item} text-[#B42318]`} onClick={pick(onDelete)}>
            Delete
          </button>
        )}
      </div>
    </details>
  );
}

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
        <h2 className="text-lg font-semibold text-[#14130F]">{title}</h2>
        <label className="mt-4 block text-sm font-medium text-[#5A5750]" htmlFor="theme-name">
          Theme name
        </label>
        <input
          id="theme-name"
          autoFocus
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5 h-10 w-full rounded-lg border border-[#E7E4DC] px-3 text-sm outline-none focus:border-[#14130F]"
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
  const drafts = themes.filter((t) => !t.published);
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
    navigate(theme.published ? to : `${to}?theme=${theme.id}`);
  };

  // The code editor opens in its own tab; a draft is named in the URL, so this tab's choice is untouched
  const openInTab = (theme, to) => {
    window.open(theme.published ? to : `${to}?theme=${theme.id}`, "_blank", "noopener,noreferrer");
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
    <div className="min-h-screen bg-white text-[#14130F]">
      <AdminHeader />

      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        <AdminSidebar />

        <main className="flex min-w-0 flex-1 flex-col bg-[#F7F7F8]">
          <div className="mx-auto flex w-full max-w-[1040px] flex-1 flex-col px-4 pb-16 pt-5">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={goBack}
                className="-ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-[#5A5750] transition hover:bg-white hover:text-[#14130F]"
              >
                <svg {...lineIcon} className="h-4 w-4">
                  <path d="M19 12H5M11 6l-6 6 6 6" />
                </svg>
                Back
              </button>
              {live && (
                <span className="inline-flex items-center gap-1.5 text-[13px] text-[#5A5750]">
                  <span className="h-2 w-2 rounded-full bg-[#12B76A]" />
                  Public
                </span>
              )}
            </div>

            <h1 className="mt-3 flex items-center gap-2.5 text-[22px] font-semibold tracking-tight">
              <PageIcon name="store" />
              Online Store
            </h1>

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
              <p className="py-16 text-center text-sm text-[#5A5750]">Loading themes…</p>
            )}

            {/* LIVE THEME */}
            {live && (
              <section className="mt-4" aria-label="Live theme">
                <div className="relative overflow-hidden rounded-2xl bg-[#161C2C] shadow-sm">
                  <LivePreview
                    theme={live}
                    swatches={presetOf(live.preset)?.swatches || OWN_SWATCHES}
                    ratio={0.5}
                  />
                  <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 bg-gradient-to-t from-black/85 via-black/60 to-transparent px-5 pb-4 pt-12 text-white">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold">{live.name}</p>
                      <p className="text-[13px] text-white/70">
                        {presetOf(live.preset)?.name || "Your own design"} · Last saved:{" "}
                        {timeAgo(live.updated_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <OpenThemeLink
                        theme={live}
                        className="inline-flex h-8 items-center rounded-lg border border-white/40 px-3 text-[13px] font-semibold text-white transition hover:bg-white/10"
                      />
                      {canEditTheme && (
                        <>
                          <button
                            type="button"
                            className="inline-flex h-8 items-center rounded-lg bg-white px-3 text-[13px] font-semibold text-[#14130F] transition hover:bg-[#DFEAE4]"
                            onClick={() => open(live, "/admin/online-store/customize")}
                          >
                            Edit theme
                          </button>
                          <ThemeMenu
                            theme={live}
                            full={full}
                            dark
                            onCode={() => openInTab(live, "/editor-demo")}
                            onRename={() => {
                              setDialogError("");
                              setDialog({ kind: "rename", theme: live });
                            }}
                            onCopy={() => {
                              setDialogError("");
                              setDialog({ kind: "copy", theme: live });
                            }}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* DRAFT THEMES */}
            {library && (
              <section className="mt-7" aria-labelledby="draft-themes">
                <div className="flex items-center justify-between">
                  <h2 id="draft-themes" className="text-sm font-semibold">
                    {live ? "Draft themes" : "Your themes"}
                  </h2>
                  {canEditTheme && (
                    <button
                      type="button"
                      className={smallButton}
                      disabled={Boolean(busy) || full}
                      title={full ? "You've reached the theme limit" : undefined}
                      onClick={() => {
                        setDialogError("");
                        setDialog({ kind: "own" });
                      }}
                    >
                      + New
                    </button>
                  )}
                </div>
                <div className="mt-2 rounded-2xl border border-[#E7E4DC] bg-white">
                  {drafts.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-[#5A5750]">
                      {live
                        ? "No draft themes yet. Add one below to work on it without touching your live store."
                        : "You don’t have a theme yet. Pick one below to go live."}
                    </p>
                  ) : (
                    <ul className="divide-y divide-[#EEF0F3]">
                      {drafts.map((theme) => (
                        <li key={theme.id} className="flex items-center gap-3 p-3">
                          <div className="w-[96px] shrink-0 overflow-hidden rounded-lg border border-[#E7E4DC]">
                            <LivePreview
                              theme={theme}
                              swatches={presetOf(theme.preset)?.swatches || OWN_SWATCHES}
                              ratio={0.75}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold">{theme.name}</p>
                            <p className="text-xs text-[#6B6F8F]">
                              Added: {formatAdded(theme.updated_at)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <OpenThemeLink theme={theme} className={smallButton} />
                            {canEditTheme && (
                              <>
                                <button
                                  type="button"
                                  className={smallButton}
                                  disabled={Boolean(busy)}
                                  onClick={() => publish(theme)}
                                >
                                  Publish
                                </button>
                                <button
                                  type="button"
                                  className={smallButton}
                                  onClick={() => open(theme, "/admin/online-store/customize")}
                                >
                                  Edit theme
                                </button>
                                <ThemeMenu
                                  theme={theme}
                                  full={full}
                                  onCode={() => openInTab(theme, "/editor-demo")}
                                  onRename={() => {
                                    setDialogError("");
                                    setDialog({ kind: "rename", theme });
                                  }}
                                  onCopy={() => {
                                    setDialogError("");
                                    setDialog({ kind: "copy", theme });
                                  }}
                                  onDelete={() => remove(theme)}
                                />
                              </>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            )}

            {/* DISCOVER THEMES */}
            {library && (
              <section className="mt-8" aria-labelledby="theme-library">
                <h2 id="theme-library" className="text-sm font-semibold">
                  Discover themes
                </h2>
                <p className="mt-1 text-[13px] text-[#5A5750]">
                  {themes.length === 0
                    ? "Your pick goes live right away."
                    : "Adding a theme saves it as a draft. Your live theme isn’t touched until you publish."}
                </p>

                <div className="mt-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                              ? "bg-[#14130F] text-white"
                              : "border border-[#E7E4DC] bg-white text-[#5A5750] hover:border-[#D4D0C5] hover:text-[#14130F]"
                          }`}
                        >
                          {category}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {shown.map((preset) => (
                    <li
                      key={preset.slug}
                      className="flex flex-col rounded-xl border border-[#E7E4DC] bg-white p-2"
                    >
                      <Preview swatches={preset.swatches} />
                      <div className="mt-2 flex items-center justify-between gap-2 px-1 pb-1">
                        <h3 className="truncate text-[13px] font-semibold">{preset.name}</h3>
                        {canEditTheme && (
                          <button
                            type="button"
                            className={smallButton}
                            disabled={Boolean(busy) || full}
                            onClick={() => add(preset.slug)}
                          >
                            {busy === `add-${preset.slug}` ? "Adding…" : "Add"}
                          </button>
                        )}
                      </div>
                      <p className="line-clamp-2 px-1 pb-1 text-xs text-[#6B6F8F]">
                        {preset.description}
                      </p>
                    </li>
                  ))}
                </ul>
                {full && (
                  <p className="mt-3 text-sm text-[#5A5750]">
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
