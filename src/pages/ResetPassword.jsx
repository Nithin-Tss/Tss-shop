import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiPost } from "@/lib/api";
import { passwordError } from "@/lib/validation";
import { PasswordChecklist, PasswordInput } from "@/components/PasswordFields";

// Opened from the "Reset your password" email: /auth/reset-password?uid=...&token=...
export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid") || "";
  const token = searchParams.get("token") || "";

  // "checking" -> "ready" (show the form) -> "done"; or "invalid"
  const [status, setStatus] = useState(uid && token ? "checking" : "invalid");
  const [linkError, setLinkError] = useState("");
  const [email, setEmail] = useState("");

  const [formData, setFormData] = useState({ newPassword: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doneMessage, setDoneMessage] = useState("");

  // Say "link expired" before the user types a new password
  useEffect(() => {
    if (!uid || !token) return;

    let ignore = false;

    apiPost("/api/v1/auth/password-reset/validate/", { uid, token }).then((result) => {
      if (ignore) return;

      if (result.ok) {
        setEmail(result.data.email);
        setStatus("ready");
      } else {
        setLinkError(result.fieldErrors.token || result.formError);
        setStatus("invalid");
      }
    });

    return () => {
      ignore = true;
    };
  }, [uid, token]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({ ...previousData, [name]: value }));
    setErrors((previousErrors) => ({ ...previousErrors, [name]: "", form: "" }));
  };

  // Same rules as the signup and change password forms
  const validateForm = () => {
    const newErrors = {};

    if (!formData.newPassword.trim()) {
      newErrors.newPassword = "New password is required.";
    } else if (passwordError(formData.newPassword)) {
      newErrors.newPassword = passwordError(formData.newPassword);
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = "Please confirm your new password.";
    } else if (formData.newPassword.trim() !== formData.confirmPassword.trim()) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    return newErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await apiPost("/api/v1/auth/password-reset/confirm/", {
        uid,
        token,
        ...formData,
      });

      if (!result.ok) {
        // The link ran out (or was used) while the form was open
        if (result.fieldErrors.token) {
          setLinkError(result.fieldErrors.token);
          setStatus("invalid");
          return;
        }

        setErrors({ ...result.fieldErrors, form: result.formError });
        return;
      }

      setDoneMessage(result.data.message);
      setStatus("done");
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

        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reset password</h1>

        {status === "checking" && (
          <p className="mt-3 text-sm leading-6 text-slate-600" role="status">
            Checking your reset link...
          </p>
        )}

        {status === "invalid" && (
          <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="font-semibold text-red-800">This link can't be used</p>
            <p className="mt-1 text-sm text-red-700">
              {linkError || "This reset link is invalid or has expired. Please request a new one."}
            </p>
            <Link
              to="/auth/forgot-password"
              className="mt-3 inline-block text-sm font-semibold text-red-800 underline"
            >
              Request a new link
            </Link>
          </div>
        )}

        {status === "done" && (
          <div role="status" className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="font-semibold text-green-800">Password changed</p>
            <p className="mt-1 text-sm text-green-700">{doneMessage}</p>
            <Link
              to="/auth/signin"
              className="mt-3 inline-block text-sm font-semibold text-green-800 underline"
            >
              Sign in
            </Link>
          </div>
        )}

        {status === "ready" && (
          <>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Choose a new password for <span className="font-medium text-slate-900">{email}</span>.
            </p>

            {errors.form && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {errors.form}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="newPassword"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  New Password
                </label>

                <PasswordInput
                  id="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  hasError={Boolean(errors.newPassword)}
                />

                <PasswordChecklist password={formData.newPassword} />

                {errors.newPassword && (
                  <p className="mt-1 text-xs text-red-500">{errors.newPassword}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Confirm New Password
                </label>

                <PasswordInput
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  hasError={Boolean(errors.confirmPassword)}
                />

                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-[#161C2C] px-4 py-3 font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : "Reset Password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
