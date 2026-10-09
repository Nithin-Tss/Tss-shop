
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import AdminSidebar, { AdminHeader } from "@/components/AdminSidebar";

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
  "group inline-flex h-9 items-center gap-2 rounded-lg border border-[#D8DFE8] bg-white px-3.5 text-sm font-medium text-[#161C2C] transition-colors duration-200 hover:border-[#141b2d] hover:bg-[#f1f3f7] hover:text-[#141b2d] active:bg-[#e7ebf2] focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#141b2d]";

const headerButtonIcon = "h-4 w-4 text-[#53627E] transition-colors duration-200 group-hover:text-[#141b2d]";

export default function OnlineStorePage() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("All");
  // No templates exist yet; Continue unlocks once one can be picked
  const [selectedTheme] = useState(null);

  // Back to the previous page, or the admin home if this page was opened directly
  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/admin/online-store/home");
  };

  return (
    <div className="min-h-screen bg-white text-[#161C2C]">

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
              className="-ml-2 inline-flex self-start items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-[#53627E] transition hover:bg-[#F3F5F8] hover:text-[#161C2C]"
            >
              <svg {...lineIcon} className="h-4 w-4">
                <path d="M19 12H5M11 6l-6 6 6 6" />
              </svg>
              Back
            </button>


            {/* TITLE */}
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-[#161C2C] sm:text-[28px]">
                  Create your custom theme
                </h1>
                <p className="mt-1.5 text-sm text-[#53627E] sm:text-[15px]">
                  Choose a template to get started. You can customize it later with your brand, products and style.
                </p>
              </div>

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
                          ? "bg-[#141b2d] text-white"
                          : "border border-[#E3E7ED] bg-white text-[#53627E] hover:border-[#C9D1DD] hover:bg-[#F7F8FA] hover:text-[#161C2C]"
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>


            {/* EMPTY STATE */}
            <section className="mt-5 flex min-h-[340px] flex-1 flex-col items-center justify-center rounded-2xl border border-[#EEF0F4] bg-[#fafbfc] px-6 py-10 text-center">

              {/* Illustration */}
              <div className="relative">
                <div className="w-[234px] overflow-hidden rounded-xl border border-[#E5E9EF] bg-white">
                  <div className="flex h-6 items-center gap-1.5 bg-[#141b2d] px-3">
                    <span className="h-2 w-2 rounded-full bg-white/80" />
                    <span className="h-2 w-2 rounded-full bg-white/80" />
                    <span className="h-2 w-2 rounded-full bg-white/80" />
                  </div>

                  <div className="p-4">
                    <div className="flex gap-4">
                      <div className="flex h-16 w-[72px] items-center justify-center rounded-md bg-[#EEF1F6] text-[#8A94A8]">
                        <svg {...lineIcon} className="h-6 w-6">
                          <rect x="3" y="4" width="18" height="16" rx="2" />
                          <circle cx="9" cy="10" r="2" />
                          <path d="m21 16-5-5-9 9" />
                        </svg>
                      </div>
                      <div className="flex-1 space-y-2.5 pt-1.5">
                        <div className="h-2.5 rounded-full bg-[#E6EBF2]" />
                        <div className="h-2.5 w-3/4 rounded-full bg-[#E6EBF2]" />
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2.5">
                      <div className="h-2 w-[52px] rounded-full bg-[#E6EBF2]" />
                      <div className="h-2 w-16 rounded-full bg-[#E6EBF2]" />
                      <div className="h-2 w-10 rounded-full bg-[#E6EBF2]" />
                    </div>
                  </div>
                </div>

                <span className="absolute -bottom-4 -right-5 flex h-[52px] w-[52px] items-center justify-center rounded-xl border-2 border-white bg-[#141b2d] text-[22px] font-bold text-white">
                  S
                </span>
              </div>

              <h2 className="mt-9 text-[22px] font-semibold text-[#161C2C] sm:text-2xl">Store</h2>

              <p className="mt-2 max-w-sm text-[15px] font-normal leading-relaxed text-[#53627E]">
                In future, we will add some photos here for you to choose from.
              </p>

              <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#EEF1F6] px-3.5 py-1.5 text-[13px] font-medium text-[#53627E]">
                <svg {...lineIcon} className="h-3.5 w-3.5">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                Coming soon
              </span>
            </section>

          </div>


          {/* FOOTER */}
          <div className="sticky bottom-0 border-t border-[#EEF0F4] bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-[1160px] justify-end px-4 py-3 sm:px-8">
              <button
                type="button"
                disabled={!selectedTheme}
                title={selectedTheme ? undefined : "Select a theme to continue"}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#141b2d] px-5 text-sm font-semibold text-white transition hover:bg-[#252E45] disabled:cursor-not-allowed disabled:bg-[#C5CCD8]"
              >
                Continue
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
