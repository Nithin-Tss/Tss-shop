import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ShoppingBag,
  Store,
  Share2,
  Globe,
  ShoppingCart,
  Package,
  Palette,
  LayoutTemplate,
  Check,
} from "lucide-react";
import NavBar from "@/components/NavBar";
import { apiRequest } from "@/lib/api";
import { addStore, useSession } from "@/lib/auth";

const GOAL_OPTIONS = [
  {
    id: "online",
    title: "Sell online",
    desc: "Create an online store and sell products to customers.",
    icon: <ShoppingBag className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />,
  },
  {
    id: "physical",
    title: "Sell in a physical store",
    desc: "Manage sales and customers from a physical shop or location.",
    icon: <Store className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />,
  },
  {
    id: "social",
    title: "Sell through social media",
    desc: "Reach customers and grow your business through social channels.",
    icon: <Share2 className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />,
  },
  {
    id: "international",
    title: "Sell internationally",
    desc: "Reach customers in different countries and markets.",
    icon: <Globe className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />,
  },
  {
    id: "marketplace",
    title: "Sell through marketplaces",
    desc: "Manage products and sales across online marketplaces.",
    icon: <ShoppingCart className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />,
  },
  {
    id: "dropshipping",
    title: "Start a dropshipping business",
    desc: "Sell products without keeping your own inventory.",
    icon: <Package className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />,
  },
];

const THEME_OPTIONS = [
  {
    id: "custom",
    title: "Create your custom theme",
    desc: "Build your unique design from scratch using flexible layout tools.",
    icon: <Palette className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />,
  },
  {
    id: "predefined",
    title: "Predefined theme",
    desc: "Choose from ready-made, professionally designed templates.",
    icon: <LayoutTemplate className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />,
  },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [selectedGoals, setSelectedGoals] = useState([]);
  // "Themes" in the navbar opens this page with ?step=themes to skip the goals step
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(searchParams.get("step") === "themes" ? 2 : 1);

  const toggleOption = (id) => {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const session = useSession();
  const [storeName, setStoreName] = useState("");
  const [creating, setCreating] = useState(false);
  const [storeError, setStoreError] = useState("");
  // "+ Create new store" in the admin store switcher opens this page with ?new=1
  const creatingNew = searchParams.get("new") === "1";
  const hasStore = Boolean(session?.stores?.length) && !creatingNew;

  // Creates the user's store (once), then opens the chosen editor
  const chooseTheme = async (themeId) => {
    if (creating) return;

    if (!session?.token) {
      navigate("/auth/signin");
      return;
    }

    if (!hasStore) {
      const name = storeName.trim() || `${session.user?.firstName || "My"}'s store`;

      setCreating(true);
      setStoreError("");

      try {
        const store = await apiRequest("/api/v1/stores/", {
          method: "POST",
          body: { storeName: name },
        });
        addStore({ ...store, role: "owner" });
      } catch (error) {
        setStoreError(error.message);
        return;
      } finally {
        setCreating(false);
      }
    }

    // Both choices open the theme library: pick a ready-made design, or create your own
    navigate(themeId === "custom" ? "/admin/online-store?create=1" : "/admin/online-store");
  };

  const handleNext = () => {
    setCurrentStep(2);
  };

  return (
    <main className="min-h-screen bg-brand-cream-100 text-charcoal-navy">
      <NavBar />

      {/* Skip — on the page, top-right, under the account */}
      <div className="mx-auto flex min-h-[52px] max-w-7xl justify-end px-4 pt-4 sm:px-6 lg:px-8">
        {currentStep === 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="h-9 rounded-full border border-gray-300 bg-white px-5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50 hover:text-orange-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
          >
            Skip
          </button>
        )}
      </div>

      <section className="mx-auto w-full max-w-[840px] px-4 pb-16 pt-4 font-sans sm:px-8">
        {/* STEP 1 */}
        {currentStep === 1 && (
          <div>
            <div className="mb-10 text-center">
              <h1 className="mb-2 text-2xl font-semibold tracking-tight sm:text-[28px]">
                What are you looking to do with STORE?
              </h1>

              <p className="mx-auto max-w-xl text-[15px] leading-relaxed text-gray-500">
                Select all that apply. We&apos;ll personalize your setup based on your goals.
              </p>
            </div>

            {/* Goal Cards */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {GOAL_OPTIONS.map((option) => {
                const isSelected = selectedGoals.includes(option.id);

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleOption(option.id)}
                    aria-pressed={isSelected}
                    className={`relative flex w-full items-start gap-4 rounded-[10px] border bg-white p-[18px] pr-12 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal-navy ${
                      isSelected
                        ? "border-orange-600 ring-1 ring-orange-600"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {/* Icon */}
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        isSelected
                          ? "bg-charcoal-navy text-white"
                          : "bg-gray-100 text-charcoal-navy"
                      }`}
                    >
                      {option.icon}
                    </span>

                    {/* Text */}
                    <span className="block">
                      <span className="block text-[15px] font-semibold leading-snug">
                        {option.title}
                      </span>

                      <span className="mt-1 block text-sm leading-normal text-gray-500">
                        {option.desc}
                      </span>
                    </span>

                    {/* Checkbox */}
                    <span
                      className={`absolute right-[18px] top-[18px] flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border-[1.5px] transition-colors ${
                        isSelected
                          ? "border-orange-600 bg-charcoal-navy text-white"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {isSelected && (
                        <Check className="h-2.5 w-2.5" strokeWidth={3.5} aria-hidden="true" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Continue */}
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={handleNext}
                disabled={selectedGoals.length === 0}
                className="h-11 w-full rounded-lg bg-orange-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-[rgba(24,24,27,0.88)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 sm:w-auto sm:min-w-[180px]"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {currentStep === 2 && (
          <div>
            <div className="mb-10 text-center">
              <h1 className="mb-2 text-2xl font-semibold tracking-tight sm:text-[28px]">
                Select a Theme to Start
              </h1>

              <p className="text-[15px] leading-relaxed text-gray-500">
                Choose how you want to design your store appearance.
              </p>
            </div>

            {!hasStore && (
              <label className="mx-auto mb-6 block max-w-[600px]">
                <span className="mb-1.5 block text-sm font-medium">Store name</span>
                <input
                  value={storeName}
                  onChange={(event) => setStoreName(event.target.value)}
                  placeholder={`${session?.user?.firstName || "My"}'s store`}
                  maxLength={200}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-[15px] outline-none focus:border-orange-600"
                />
              </label>
            )}

            {storeError && (
              <p
                role="alert"
                className="mx-auto mb-4 max-w-[600px] rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {storeError}
              </p>
            )}

            {/* Theme Cards */}
            <div className="mx-auto grid max-w-[600px] grid-cols-1 gap-4 sm:grid-cols-2">
              {THEME_OPTIONS.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => chooseTheme(theme.id)}
                  disabled={creating}
                  className="group flex min-h-[260px] w-full flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-8 text-center transition-colors hover:border-orange-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
                >
                  <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-charcoal-navy transition-colors group-hover:bg-charcoal-navy group-hover:text-white">
                    {theme.icon}
                  </span>

                  <span className="block text-base font-semibold leading-snug">{theme.title}</span>

                  <span className="mt-2 block text-sm leading-normal text-gray-500">
                    {theme.desc}
                  </span>

                  <span
                    aria-hidden="true"
                    className="mt-6 text-gray-400 transition-colors group-hover:text-orange-600"
                  >
                    →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
