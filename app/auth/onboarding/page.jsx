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
 
const options = [
  {
    id: "online",
    title: "Sell online",
    description: "Create an online store and sell products to customers.",
    icon: (
      <svg {...iconProps}>
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    id: "physical",
    title: "Sell in a physical store",
    description: "Manage sales and customers from a physical shop or location.",
    icon: (
      <svg {...iconProps}>
        <path d="M3 9l1.5-5h15L21 9" /><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" /><path d="M5 12v8h14v-8" /><path d="M10 20v-5h4v5" />
      </svg>
    ),
  },
  {
    id: "social",
    title: "Sell through social media",
    description: "Reach customers and grow your business through social channels.",
    icon: (
      <svg {...iconProps}>
        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4" /><path d="M15.4 6.5l-6.8 4" />
      </svg>
    ),
  },
  {
    id: "international",
    title: "Sell internationally",
    description: "Reach customers in different countries and markets.",
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
      </svg>
    ),
  },
  {
    id: "marketplaces",
    title: "Sell through marketplaces",
    description: "Manage products and sales across online marketplaces.",
    icon: (
      <svg {...iconProps}>
        <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2 2h2l2.7 12.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L22 7H5.1" />
      </svg>
    ),
  },
  {
    id: "dropshipping",
    title: "Start a dropshipping business",
    description: "Sell products without keeping your own inventory.",
    icon: (
      <svg {...iconProps}>
        <path d="M16.5 9.4 7.5 4.2" /><path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7Z" /><path d="M3.3 7 12 12l8.7-5" /><path d="M12 22V12" />
      </svg>
    ),
  },
];
 
export default function OnboardingPage() {
  const router = useRouter();
  const [selectedOptions, setSelectedOptions] = useState([]);
 
  const handleSelect = (id) => {
    setSelectedOptions((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };
 
  const handleContinue = () => {
    if (selectedOptions.length === 0) return;
 
    localStorage.setItem(
      "store_onboarding_goals",
      JSON.stringify(selectedOptions)
    );
 
    router.push("/");
  };
 
  const handleSkip = () => {
    router.push("/");
  };
 
  return (
    <main className="onboarding-page">
      <NavBar isLoggedIn />

      {/* Skip — aligned under the account in the navbar */}
      <div className="skip-row max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button className="skip-button" onClick={handleSkip}>
          Skip
        </button>
      </div>

      <section className="onboarding-content">
        <div className="heading-area">
          <h1>What are you looking to do with STORE?</h1>

          <p>
            Select all that apply. We'll personalize your setup based on your
            goals.
          </p>
        </div>
 
        <div className="options-grid">
          {options.map((option) => {
            const isSelected = selectedOptions.includes(option.id);
 
            return (
              <button
                key={option.id}
                type="button"
                className={`option-card ${
                  isSelected ? "selected" : ""
                }`}
                onClick={() => handleSelect(option.id)}
                aria-pressed={isSelected}
              >
                <div className="option-icon">{option.icon}</div>
 
                <div className="option-text">
                  <h2>{option.title}</h2>
                  <p>{option.description}</p>
                </div>
 
                <div className="check-box">
                  {isSelected ? "✓" : ""}
                </div>
              </button>
            );
          })}
        </div>
 
        <div className="continue-area">
          <button
            className="continue-button"
            onClick={handleContinue}
            disabled={selectedOptions.length === 0}
          >
            Continue
          </button>
        </div>
      </section>
 
      <style jsx>{`
        .onboarding-page {
          min-height: 100vh;
          background: #f7f7f8;
          color: #161c2c;
        }

        .onboarding-content,
        .skip-row,
        .continue-area {
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI",
            Roboto, "Helvetica Neue", Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .skip-row {
          display: flex;
          justify-content: flex-end;
          padding-top: 16px;
        }

        .skip-button {
          height: 36px;
          padding: 0 22px;
          border: 1px solid #dcdee3;
          border-radius: 999px;
          background: #ffffff;
          color: #3d4454;
          font: inherit;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease,
            color 0.15s ease;
        }

        .skip-button:hover {
          background: #f5f6f7;
          border-color: #c9ccd3;
          color: #161c2c;
        }

        .skip-button:focus-visible {
          outline: 2px solid #161c2c;
          outline-offset: 2px;
        }

        /* Content */
        .onboarding-content {
          max-width: 840px;
          margin: 0 auto;
          padding: 32px 32px 140px;
        }

        .heading-area {
          margin-bottom: 32px;
        }

        .heading-area h1 {
          margin: 0 0 8px;
          font-size: 28px;
          line-height: 1.25;
          font-weight: 650;
          letter-spacing: -0.02em;
          color: #161c2c;
        }

        .heading-area p {
          margin: 0;
          max-width: 520px;
          color: #636978;
          font-size: 15px;
          line-height: 1.6;
        }

        /* Option cards */
        .options-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .option-card {
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 18px 48px 18px 18px;
          text-align: left;
          font: inherit;
          color: inherit;
          background: #ffffff;
          border: 1px solid #e0e2e6;
          border-radius: 10px;
          cursor: pointer;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .option-card:hover {
          border-color: #b8bcc5;
        }

        .option-card:focus-visible {
          outline: 2px solid #161c2c;
          outline-offset: 2px;
        }

        .option-card.selected {
          border-color: #161c2c;
          box-shadow: inset 0 0 0 1px #161c2c;
        }

        .option-icon {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: #f2f3f5;
          color: #161c2c;
          transition: background 0.15s ease, color 0.15s ease;
        }

        .option-icon :global(svg) {
          display: block;
        }

        .option-card.selected .option-icon {
          background: #161c2c;
          color: #ffffff;
        }

        .option-text h2 {
          margin: 1px 0 4px;
          font-size: 15px;
          line-height: 1.4;
          font-weight: 600;
          color: #161c2c;
        }

        .option-text p {
          margin: 0;
          color: #686e7c;
          font-size: 13.5px;
          line-height: 1.5;
        }

        .check-box {
          position: absolute;
          top: 18px;
          right: 18px;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          border: 1.5px solid #c6cad2;
          border-radius: 5px;
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          line-height: 1;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .option-card:hover .check-box {
          border-color: #9298a4;
        }

        .option-card.selected .check-box {
          background: #161c2c;
          border-color: #161c2c;
        }

        /* Bottom action bar */
        .continue-area {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 20;
          display: flex;
          justify-content: flex-end;
          padding: 14px max(32px, calc((100vw - 776px) / 2));
          padding-bottom: calc(14px + env(safe-area-inset-bottom));
          background: #ffffff;
          border-top: 1px solid #e7e8eb;
        }

        .continue-button {
          height: 42px;
          min-width: 140px;
          padding: 0 22px;
          border: none;
          border-radius: 8px;
          background: #161c2c;
          color: #ffffff;
          font: inherit;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .continue-button:hover:not(:disabled) {
          background: #2a3246;
        }

        .continue-button:focus-visible {
          outline: 2px solid #161c2c;
          outline-offset: 2px;
        }

        .continue-button:disabled {
          background: #e3e5e9;
          color: #9a9fa9;
          cursor: not-allowed;
        }

        /* Tablet */
        @media (max-width: 900px) {
          .onboarding-content {
            padding: 24px 24px 130px;
          }

          .continue-area {
            padding-left: 24px;
            padding-right: 24px;
          }
        }

        /* Mobile */
        @media (max-width: 640px) {
          .onboarding-content {
            padding: 16px 16px 120px;
          }

          .heading-area {
            margin-bottom: 22px;
          }

          .heading-area h1 {
            font-size: 23px;
          }

          .heading-area p {
            font-size: 14px;
          }

          .options-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .option-card {
            padding: 16px 44px 16px 16px;
          }

          .check-box {
            top: 16px;
            right: 16px;
          }

          .continue-area {
            padding: 12px 16px;
            padding-bottom: calc(12px + env(safe-area-inset-bottom));
          }

          .continue-button {
            width: 100%;
            height: 44px;
          }
        }
      `}</style>
    </main>
  );
}
 