import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiPost } from "@/lib/api";
import { signIn } from "@/lib/auth";
import { emailError } from "@/lib/validation";

export default function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  // Set once the password was right and the account needs its authenticator code too
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaCode, setMfaCode] = useState("");

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: type === "checkbox" ? checked : value,
    }));

    setErrors((previousErrors) => ({
      ...previousErrors,
      [name]: "",
      form: "",
    }));

    setMessage("");
  };

  const validateForm = () => {
    const newErrors = {};

    // The backend trims spaces from both fields, so check the trimmed values
    if (emailError(formData.email)) {
      newErrors.email = emailError(formData.email);
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required.";
    }

    return newErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setErrors({});

    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (mfaStep && !mfaCode.trim()) {
      setErrors({ mfaCode: "Enter the code from your authenticator app, or a recovery code." });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await apiPost(
        "/api/v1/auth/login/",
        mfaStep ? { ...formData, mfaCode: mfaCode.trim() } : formData
      );

      if (!result.ok && result.fieldErrors?.mfaRequired) {
        setMfaStep(true);
        return;
      }

      if (!result.ok) {
        setErrors({ ...result.fieldErrors, form: result.formError });
        return;
      }

      signIn(result.data);
      setMessage("Signed in. Redirecting...");

      // Next: pick which store to open (or create one); a page they were sent here from is kept
      const next = new URLSearchParams(window.location.search).get("next");
      const safeNext = next && next.startsWith("/admin") && !next.startsWith("//") ? next : null;

      navigate(safeNext ? `/auth/stores?next=${encodeURIComponent(safeNext)}` : "/auth/stores");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center justify-center">
        <div className="w-full rounded-xl bg-white ring-1 ring-ink/5 p-6 shadow-lg sm:p-8">
          {/* Heading */}
          <div className="mb-8 text-center">
            <h1 className="display text-5xl text-ink">Welcome back</h1>

            <p className="mt-2 text-sm text-slate-500">Sign in to continue to your account</p>
          </div>

          {/* Form Error */}
          {errors.form && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              {errors.form}
            </div>
          )}

          {/* Frontend Message */}
          {message && (
            <div
              role="status"
              className="mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-violet-700"
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                Email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                required
                aria-required="true"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "email-error" : undefined}
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                autoComplete="email"
                className={`w-full rounded-lg border px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                  errors.email
                    ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                    : "border-slate-300 focus:border-violet-500 focus:ring-blue-100"
                }`}
              />

              {errors.email && (
                <p id="email-error" role="alert" className="mt-1 text-xs text-red-500">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="mt-5">
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
                Password
              </label>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  aria-required="true"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className={`w-full rounded-lg border px-4 py-3 pr-20 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                    errors.password
                      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                      : "border-slate-300 focus:border-violet-500 focus:ring-blue-100"
                  }`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((previousValue) => !previousValue)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-violet-600 hover:text-violet-700"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {errors.password && (
                <p id="password-error" role="alert" className="mt-1 text-xs text-red-500">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Second factor: shown after the password was accepted */}
            {mfaStep && (
              <div className="mt-5">
                <label htmlFor="mfaCode" className="mb-2 block text-sm font-medium text-slate-700">
                  Authentication code
                </label>

                <input
                  id="mfaCode"
                  name="mfaCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  required
                  aria-required="true"
                  aria-invalid={Boolean(errors.mfaCode)}
                  aria-describedby={errors.mfaCode ? "mfaCode-error" : undefined}
                  value={mfaCode}
                  onChange={(event) => {
                    setMfaCode(event.target.value);
                    setErrors((previousErrors) => ({ ...previousErrors, mfaCode: "", form: "" }));
                  }}
                  placeholder="6-digit code or recovery code"
                  className={`w-full rounded-lg border px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                    errors.mfaCode
                      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                      : "border-slate-300 focus:border-violet-500 focus:ring-blue-100"
                  }`}
                />

                {errors.mfaCode && (
                  <p id="mfaCode-error" role="alert" className="mt-1 text-xs text-red-500">
                    {errors.mfaCode}
                  </p>
                )}
              </div>
            )}

            {/* Remember Me + Forgot Password */}
            <div className="mt-5 flex items-center justify-between gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="h-4 w-4 accent-violet-600"
                />

                <span className="text-sm text-slate-600">Remember me</span>
              </label>

              <Link
                to="/auth/forgot-password"
                className="text-sm font-medium text-violet-600 hover:text-violet-700 hover:underline"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-7 w-full rounded-lg bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Signing In..." : "Sign In"}
            </button>
          </form>

          {/* Sign Up */}
          <div className="mt-7 border-t border-slate-200 pt-6 text-center">
            <p className="text-sm text-slate-500">Don't have an account?</p>

            <Link
              to={{ pathname: "/auth/signup", search: location.search }}
              className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-violet-600 px-5 py-3 font-semibold text-violet-600 transition hover:bg-blue-50"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
