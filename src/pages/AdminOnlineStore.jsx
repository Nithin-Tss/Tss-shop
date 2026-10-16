import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
import { useCan } from "@/lib/auth";
import { applyThemePreset, listThemePresets, undoThemePreset } from "@/lib/themeApi";

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

const headerButton =
  "group inline-flex h-9 items-center gap-2 rounded-lg border border-[#DDD6FE] bg-white px-3.5 text-sm font-medium text-[#0B1020] transition-colors duration-200 hover:border-[#0B1020] hover:bg-[#f1f3f7] hover:text-[#0B1020] active:bg-[#e7ebf2] focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#0B1020]";

const headerButtonIcon =
  "h-4 w-4 text-[#4C4F7A] transition-colors duration-200 group-hover:text-[#0B1020]";

export default function OnlineStorePage() {
  const navigate = useNavigate();
  // The customizer and code editor change the theme
  const canEditTheme = useCan("themes.manage");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [presets, setPresets] = useState(null);
  const [applied, setApplied] = useState("");
  const [undo, setUndo] = useState(null);
  const [notice, setNotice] = useState("");
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listThemePresets()
      .then((data) => {
        if (cancelled) return;
        setPresets(data.presets);
        setApplied(data.applied);
        setUndo(data.undo);
      })
      .catch(
        (e) => !cancelled && (setPresets([]), setError(e.message || "Could not load themes."))
      );
    return () => {
      cancelled = true;
    };
  }, []);

  const shown = (presets || []).filter(
    (p) => selectedCategory === "All" || p.categories.includes(selectedCategory)
  );
  const chosen = presets?.find((p) => p.slug === selectedTheme);

  const undoLast = async () => {
    if (applying) return;
    if (
      !window.confirm(
        `Go back to ${undo}? This restores the look, home page layout and theme code from before.`
      )
    )
      return;
    setApplying(true);
    setError("");
    try {
      const data = await undoThemePreset();
      setApplied(data.applied);
      setUndo(null);
      setNotice("Your previous theme is back.");
    } catch (e) {
      setError(e.message || "Could not undo.");
    }
    setApplying(false);
  };

  const useTheme = async () => {
    if (!chosen || applying) return;
    if (
      !window.confirm(
        `Use the ${chosen.name} theme? Its colours, fonts, buttons and home page layout will replace your current ones. Your products, logo, menus and other pages are kept.`
      )
    )
      return;
    setApplying(true);
    setError("");
    try {
      await applyThemePreset(chosen.slug);
      setNotice("");
      navigate("/admin/online-store/customize");
    } catch (e) {
      setError(e.message || "Could not apply the theme.");
      setApplying(false);
    }
  };

  // Back to the previous page, or the admin home if this page was opened directly
  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/admin/online-store/home");
  };

  return (
    <div className="min-h-screen bg-white text-[#0B1020]">
      <AdminHeader />

      {/* BODY */}
      <div className="flex min-h-[calc(100vh-72px)]">
        {/* SIDEBAR */}
        <AdminSidebar />

        {/* MAIN CONTENT */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="mx-auto flex w-full max-w-[1160px] flex-1 flex-col px-4 pb-5 pt-5 sm:px-8">
            {/* BACK */}
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

            {/* TITLE */}
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="flex items-center gap-2.5 text-[26px] font-semibold leading-tight tracking-tight text-[#0B1020] sm:text-[28px]">
                  <PageIcon name="themes" />
                  Create your custom theme
                </h1>
                <p className="mt-1.5 text-sm text-[#4C4F7A] sm:text-[15px]">
                  Choose a template to get started. You can customize it later with your brand,
                  products and style.
                </p>
              </div>

              {canEditTheme && (
                <div className="flex shrink-0 items-center gap-2">
                  {/* Theme customizer: sections, slides, colours */}
                  <Link to="/admin/online-store/customize" className={headerButton}>
                    <svg {...lineIcon} className={headerButtonIcon}>
                      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
                    </svg>
                    Customize theme
                  </Link>

                  <Link to="/editor-demo" className={headerButton}>
                    <svg {...lineIcon} className={headerButtonIcon}>
                      <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />
                    </svg>
                    Code Editor
                  </Link>
                </div>
              )}
            </div>

            {/* CATEGORIES: one line, scrolls sideways on small screens */}
            <div className="-mx-4 mt-5 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-8 sm:px-8 [&::-webkit-scrollbar]:hidden">
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

            {/* THEME LIBRARY */}
            <section className="mt-5 flex-1">
              {undo && canEditTheme && (
                <p className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#F5F3FF] px-3 py-2 text-sm text-[#4C4F7A]">
                  You changed your theme recently.
                  <button
                    type="button"
                    onClick={undoLast}
                    disabled={applying}
                    className="font-semibold text-[#0B1020] underline underline-offset-2 disabled:opacity-50"
                  >
                    Undo and go back to {undo}
                  </button>
                </p>
              )}
              {notice && (
                <p
                  role="status"
                  className="mb-3 rounded-lg bg-[#ECFDF3] px-3 py-2 text-sm text-[#067647]"
                >
                  {notice}
                </p>
              )}
              {error && (
                <p
                  role="alert"
                  className="mb-3 rounded-lg bg-[#FEF2F2] px-3 py-2 text-sm text-[#B42318]"
                >
                  {error}
                </p>
              )}
              {presets === null ? (
                <p className="py-16 text-center text-sm text-[#4C4F7A]">Loading themes…</p>
              ) : shown.length === 0 ? (
                <p className="rounded-2xl border border-[#EEF0F4] bg-[#fafbfc] py-16 text-center text-sm text-[#4C4F7A]">
                  No themes in this category yet.
                </p>
              ) : (
                <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {shown.map((preset) => {
                    const [accent, background, text] = preset.swatches;
                    const active = selectedTheme === preset.slug;

                    return (
                      <li key={preset.slug}>
                        <button
                          type="button"
                          aria-pressed={active}
                          onClick={() => setSelectedTheme(preset.slug)}
                          className={`block w-full rounded-2xl border bg-white p-3 text-left transition ${
                            active
                              ? "border-[#0B1020] ring-2 ring-[#0B1020]/15"
                              : "border-[#E4DEFB] hover:border-[#C9D1DD]"
                          }`}
                        >
                          {/* Mini storefront drawn from the theme's colours */}
                          <div
                            className="overflow-hidden rounded-xl border border-black/5"
                            style={{ background, color: text }}
                            aria-hidden="true"
                          >
                            <div className="flex items-center justify-between px-3 py-2">
                              <span
                                className="h-2 w-10 rounded-full"
                                style={{ background: text }}
                              />
                              <span className="flex gap-1.5">
                                <span
                                  className="h-1.5 w-5 rounded-full opacity-50"
                                  style={{ background: text }}
                                />
                                <span
                                  className="h-1.5 w-5 rounded-full opacity-50"
                                  style={{ background: text }}
                                />
                              </span>
                            </div>
                            <div
                              className="mx-3 h-20 rounded-lg"
                              style={{ background: accent, opacity: 0.9 }}
                            />
                            <div className="grid grid-cols-3 gap-2 p-3">
                              {[0, 1, 2].map((i) => (
                                <span
                                  key={i}
                                  className="h-10 rounded-md"
                                  style={{ background: text, opacity: 0.1 }}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-2">
                            <h3 className="text-[15px] font-semibold text-[#0B1020]">
                              {preset.name}
                            </h3>
                            {applied === preset.slug && (
                              <span className="rounded-full bg-[#EDE9FE] px-2.5 py-0.5 text-xs font-medium text-[#4C4F7A]">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[13px] leading-relaxed text-[#4C4F7A]">
                            {preset.description}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          {/* FOOTER */}
          <div className="sticky bottom-0 border-t border-[#EEF0F4] bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-[1160px] justify-end px-4 py-3 sm:px-8">
              <button
                type="button"
                disabled={!selectedTheme || !canEditTheme || applying}
                onClick={useTheme}
                title={selectedTheme ? undefined : "Select a theme to continue"}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0B1020] px-5 text-sm font-semibold text-white transition hover:bg-[#1C2347] disabled:cursor-not-allowed disabled:bg-[#C5CCD8]"
              >
                {applying ? "Applying…" : "Use this theme"}
                <svg {...lineIcon} strokeWidth="2" className="h-4 w-4">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
