
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ONBOARDING_PATH } from "@/lib/auth";

export default function EmailCTA() {
  const navigate = useNavigate();
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

    navigate(ONBOARDING_PATH);
  };

  return (
    <section className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-xl bg-gradient-to-r from-[#06142f] via-[#081d46] to-[#07152f] px-6 py-10 text-center shadow-sm sm:px-10 sm:py-12">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-blue-700/20 blur-sm" />

        <div className="pointer-events-none absolute -bottom-12 -right-4 h-36 w-36 rounded-full bg-blue-600/20" />

        <div className="pointer-events-none absolute right-16 top-8 h-10 w-10 rounded-full bg-blue-600/20" />

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
            Start building with STORE today.
          </h2>

          <p className="mt-3 text-sm text-slate-300 sm:text-base">
            Join thousands of entrepreneurs and create your online store in
            minutes.
          </p>

          <form
              onSubmit={handleSubmit}
              className="mx-auto mt-7 flex max-w-2xl flex-col gap-3 sm:flex-row"
            >
              <div className="flex-1">
                <label htmlFor="cta-email" className="sr-only">
                  Email address
                </label>

                <input
                  id="cta-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email"
                  className="h-12 w-full rounded-md border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />

                {error && (
                  <p className="mt-2 text-left text-sm text-red-300">
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="h-12 rounded-md bg-blue-600 px-6 font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-[#081d46]"
              >
                Start free trial
              </button>
            </form>
        </div>
      </div>
    </section>
  );
}