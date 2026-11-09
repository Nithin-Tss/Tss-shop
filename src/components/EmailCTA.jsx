import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ONBOARDING_PATH, STORES_PATH, useSession } from "@/lib/auth";

export default function EmailCTA() {
  const navigate = useNavigate();
  const signedIn = Boolean(useSession()?.token);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    navigate(signedIn ? STORES_PATH : ONBOARDING_PATH);
  };

  return (
    <section className="bg-orange-600 text-ink">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-24 lg:grid-cols-12 lg:items-end lg:px-10 lg:py-32">
        <h2 className="display text-5xl lg:col-span-6 lg:text-7xl">Open the doors this week.</h2>

        <form onSubmit={handleSubmit} className="lg:col-span-5 lg:col-start-8" noValidate>
          <label htmlFor="cta-email" className="text-sm text-ink">
            Your email
          </label>
          <div className="mt-2 flex border-b border-ink/40 focus-within:border-ink">
            <input
              id="cta-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              className="h-12 min-w-0 flex-1 bg-transparent text-lg text-ink outline-none placeholder:text-ink/60"
            />
            <button
              type="submit"
              className="h-12 whitespace-nowrap pl-4 text-sm font-medium text-ink hover:text-white"
            >
              Start free trial &rarr;
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-white">{error}</p>}
        </form>
      </div>
    </section>
  );
}
