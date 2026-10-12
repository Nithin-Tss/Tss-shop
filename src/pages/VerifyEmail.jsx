import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiGet, apiPost } from "@/lib/api";
import { getSession, setUser, useSession } from "@/lib/auth";

// Opened from the "Verify your email address" email: /auth/verify-email?token=...
// Works signed out too: the link may be opened on another device.
export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const signedIn = Boolean(useSession()?.token);

  // "checking" -> "verified" or "invalid"
  const [status, setStatus] = useState(token ? "checking" : "invalid");
  const [error, setError] = useState("");

  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    if (!token) return;

    let ignore = false;

    apiPost("/api/v1/auth/verify-email/", { token }).then(async (result) => {
      if (ignore) return;

      if (!result.ok) {
        setError(result.fieldErrors.token || result.formError);
        setStatus("invalid");
        return;
      }

      setStatus("verified");

      // Signed in on this device: show the account as verified right away
      if (getSession()?.token) {
        const me = await apiGet("/api/v1/auth/me/");
        if (me.ok) setUser(me.data.user);
      }
    });

    return () => {
      ignore = true;
    };
  }, [token]);

  const handleResend = async () => {
    setResendMessage("");
    setIsResending(true);

    try {
      const result = await apiPost("/api/v1/auth/verify-email/resend/", {});
      setResendMessage(
        result.ok ? result.data.message : result.formError || "Could not send the link. Please try again."
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Verify email
        </h1>

        {status === "checking" && (
          <p className="mt-3 text-sm leading-6 text-slate-600" role="status">
            Verifying your email address...
          </p>
        )}

        {status === "verified" && (
          <div role="status" className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="font-semibold text-green-800">Email verified</p>
            <p className="mt-1 text-sm text-green-700">
              Thanks! Your email address is confirmed.
            </p>
            <Link
              to={signedIn ? "/profile" : "/auth/signin"}
              className="mt-3 inline-block text-sm font-semibold text-green-800 underline"
            >
              {signedIn ? "Go to your profile" : "Sign in"}
            </Link>
          </div>
        )}

        {status === "invalid" && (
          <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="font-semibold text-red-800">This link can't be used</p>
            <p className="mt-1 text-sm text-red-700">
              {error || "This verification link is invalid or has expired. Please request a new one."}
            </p>

            {signedIn ? (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="mt-3 text-sm font-semibold text-red-800 underline disabled:opacity-60"
              >
                {isResending ? "Sending..." : "Send a new link"}
              </button>
            ) : (
              <p className="mt-3 text-sm text-red-700">
                <Link to="/auth/signin?next=/profile" className="font-semibold underline">
                  Sign in
                </Link>{" "}
                to get a new link from your profile.
              </p>
            )}

            {resendMessage && (
              <p className="mt-2 text-sm text-slate-700" role="status">{resendMessage}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
