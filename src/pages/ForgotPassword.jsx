import { useState } from "react";
import { Link } from "react-router-dom";
import { apiPost } from "@/lib/api";
import { emailError } from "@/lib/validation";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // The server's answer; it is the same whether or not the account exists
  const [sentMessage, setSentMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = emailError(email);

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await apiPost("/api/v1/auth/password-reset/", { email });

      if (!result.ok) {
        setError(result.fieldErrors.email || result.formError);
        return;
      }

      setSentMessage(result.data.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <Link
          to="/auth/signin"
          className="mb-8 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <span aria-hidden="true">←</span> Back to Sign In
        </Link>

        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
          ✉
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Forgot password?</h1>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          No worries. Enter your registered email address and we'll help you reset your password.
        </p>

        {sentMessage ? (
          <div role="status" className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="font-semibold text-green-800">Check your email</p>
            <p className="mt-1 text-sm text-green-700">{sentMessage}</p>
            <button
              type="button"
              onClick={() => setSentMessage("")}
              className="mt-3 text-sm font-semibold text-green-800 underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                Email address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                aria-invalid={Boolean(error)}
                className={`w-full rounded-xl border px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                  error
                    ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                    : "border-slate-300 focus:border-slate-700 focus:ring-slate-200"
                }`}
              />

              {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#161C2C] px-4 py-3 font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-sm text-slate-600">
          Remember your password?{" "}
          <Link to="/auth/signin" className="font-semibold text-slate-900 hover:underline">
            Sign in
          </Link>
        </p>

        <p className="mt-8 text-center text-xs tracking-wide text-slate-400">Store</p>
      </div>
    </div>
  );
}
