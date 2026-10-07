"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NavBar from "../../../components/NavBar";

const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

const GOAL_OPTIONS = [
  {
    id: "online",
    title: "Sell online",
    desc: "Create an online store and sell products to customers.",
    icon: (
      <svg {...iconProps}>
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    id: "physical",
    title: "Sell in a physical store",
    desc: "Manage sales and customers from a physical shop or location.",
    icon: (
      <svg {...iconProps}>
        <path d="M3 9l1.5-5h15L21 9" />
        <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
        <path d="M5 12v8h14v-8" />
        <path d="M10 20v-5h4v5" />
      </svg>
    ),
  },
  {
    id: "social",
    title: "Sell through social media",
    desc: "Reach customers and grow your business through social channels.",
    icon: (
      <svg {...iconProps}>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="M8.6 13.5l6.8 4" />
        <path d="M15.4 6.5l-6.8 4" />
      </svg>
    ),
  },
  {
    id: "international",
    title: "Sell internationally",
    desc: "Reach customers in different countries and markets.",
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
      </svg>
    ),
  },
  {
    id: "marketplace",
    title: "Sell through marketplaces",
    desc: "Manage products and sales across online marketplaces.",
    icon: (
      <svg {...iconProps}>
        <circle cx="8" cy="21" r="1" />
        <circle cx="19" cy="21" r="1" />
        <path d="M2 2h2l2.7 12.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L22 7H5.1" />
      </svg>
    ),
  },
  {
    id: "dropshipping",
    title: "Start a dropshipping business",
    desc: "Sell products without keeping your own inventory.",
    icon: (
      <svg {...iconProps}>
        <path d="M16.5 9.4 7.5 4.2" />
        <path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7Z" />
        <path d="M3.3 7 12 12l8.7-5" />
        <path d="M12 22V12" />
      </svg>
    ),
  },
];

const THEME_OPTIONS = [
  {
    id: "custom",
    title: "Create your custom theme",
    desc: "Build your unique design from scratch using flexible layout tools.",
    icon: (
      <svg {...iconProps}>
        <circle cx="13.5" cy="6.5" r="0.75" fill="currentColor" />
        <circle cx="17.5" cy="10.5" r="0.75" fill="currentColor" />
        <circle cx="8.5" cy="7.5" r="0.75" fill="currentColor" />
        <circle cx="6.5" cy="12.5" r="0.75" fill="currentColor" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1a1.6 1.6 0 0 1 1.7-1.7h2c3 0 5.5-2.5 5.5-5.5C22 6 17.5 2 12 2Z" />
      </svg>
    ),
  },
  {
    id: "predefined",
    title: "Predefined theme",
    desc: "Choose from ready-made, professionally designed templates.",
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
    ),
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);

  const toggleOption = (id) => {
    setSelectedGoals((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  const handleNext = () => {
    setCurrentStep(2);
  };

  return (
    <main className="min-h-screen bg-[#f7f7f8] text-charcoal-navy">
      <NavBar />

      {/* Skip — on the page, top-right, under the account */}
      <div className="mx-auto flex min-h-[52px] max-w-7xl justify-end px-4 pt-4 sm:px-6 lg:px-8">
        {currentStep === 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="h-9 rounded-full border border-gray-300 bg-white px-5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50 hover:text-charcoal-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal-navy"
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
                Select all that apply. We&apos;ll personalize your setup based
                on your goals.
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
                        ? "border-charcoal-navy ring-1 ring-charcoal-navy"
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
                          ? "border-charcoal-navy bg-charcoal-navy text-white"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {isSelected && (
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
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
                className="h-11 w-full rounded-lg bg-charcoal-navy px-6 text-sm font-semibold text-white transition-colors hover:bg-[#2a3246] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal-navy disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 sm:w-auto sm:min-w-[180px]"
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

            {/* Theme Cards */}
            <div className="mx-auto grid max-w-[600px] grid-cols-1 gap-4 sm:grid-cols-2">
              {THEME_OPTIONS.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() =>{
                    if (theme.id === "custom"){
                      router.push("/admin/online-store");}
                    }}
                  className="group flex min-h-[260px] w-full flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-8 text-center transition-colors hover:border-charcoal-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal-navy"
                >
                  <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-charcoal-navy transition-colors group-hover:bg-charcoal-navy group-hover:text-white">
                    {theme.icon}
                  </span>

                  <span className="block text-base font-semibold leading-snug">
                    {theme.title}
                  </span>

                  <span className="mt-2 block text-sm leading-normal text-gray-500">
                    {theme.desc}
                  </span>

                  <span
                    aria-hidden="true"
                    className="mt-6 text-gray-400 transition-colors group-hover:text-charcoal-navy"
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
