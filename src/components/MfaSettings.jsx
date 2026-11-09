import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import Icon from "@/components/Icons";

const INPUT =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200";

// Two-factor sign-in with an authenticator app: turn it on, see recovery codes once, turn it off
export default function MfaSettings() {
  const [status, setStatus] = useState(null); // { enabled, recoveryCodesLeft }
  const [setup, setSetup] = useState(null); // { secret, otpauthUri } while enrolling
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [disabling, setDisabling] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const result = await apiGet("/api/v1/auth/mfa/");
    if (result.ok) setStatus(result.data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiGet("/api/v1/auth/mfa/").then((result) => {
      if (!cancelled && result.ok) setStatus(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const fail = (result) =>
    setError(
      Object.values(result.fieldErrors || {})[0] || result.formError || "Something went wrong."
    );

  const begin = async () => {
    setBusy(true);
    setError("");
    const result = await apiPost("/api/v1/auth/mfa/setup/", {});
    setBusy(false);
    if (result.ok) setSetup(result.data);
    else fail(result);
  };

  const enable = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await apiPost("/api/v1/auth/mfa/enable/", { code: code.trim() });
    setBusy(false);
    if (!result.ok) return fail(result);
    setRecoveryCodes(result.data.recoveryCodes);
    setSetup(null);
    setCode("");
    load();
  };

  const disable = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await apiPost("/api/v1/auth/mfa/disable/", { password, code: code.trim() });
    setBusy(false);
    if (!result.ok) return fail(result);
    setDisabling(false);
    setPassword("");
    setCode("");
    load();
  };

  if (!status) return null;

  const PRIMARY =
    "inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer";
  const GHOST =
    "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 cursor-pointer";

  return (
    <div className="p-5 sm:p-6" aria-labelledby="mfa-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Icon name="smartphone" className="mt-0.5 h-[18px] w-[18px] text-slate-400" />
          <div>
            <h4
              id="mfa-heading"
              className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900"
            >
              Two-factor authentication
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  status.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                }`}
              >
                {status.enabled && <Icon name="shield-check" className="h-3 w-3" />}
                {status.enabled ? "On" : "Off"}
              </span>
            </h4>
            <p className="mt-0.5 text-sm text-slate-500">
              {status.enabled
                ? `Protected with an authenticator app. ${status.recoveryCodesLeft} recovery code${status.recoveryCodesLeft === 1 ? "" : "s"} left.`
                : "Ask for a code from an authenticator app each time you sign in."}
            </p>
          </div>
        </div>

        {!status.enabled && !setup && (
          <button type="button" onClick={begin} disabled={busy} className={PRIMARY}>
            Set up
          </button>
        )}
        {status.enabled && !disabling && (
          <button type="button" onClick={() => setDisabling(true)} className={GHOST}>
            Turn off
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 flex items-center gap-2 text-sm text-red-600">
          <Icon name="alert" className="h-4 w-4" />
          {error}
        </p>
      )}

      {recoveryCodes.length > 0 && (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-start gap-2 text-sm font-medium text-amber-900">
            <Icon name="alert" className="mt-0.5 h-4 w-4" />
            Save these recovery codes now. Each works once, and they will not be shown again.
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {recoveryCodes.map((item) => (
              <li
                key={item}
                className="rounded-md border border-amber-200 bg-white px-2.5 py-1.5 text-center font-mono text-xs text-slate-900"
              >
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(recoveryCodes.join("\n"))}
              className={GHOST}
            >
              <Icon name="copy" className="h-4 w-4" />
              Copy codes
            </button>
            <button type="button" onClick={() => setRecoveryCodes([])} className={PRIMARY}>
              <Icon name="check" className="h-4 w-4" />I have saved them
            </button>
          </div>
        </div>
      )}

      {setup && (
        <form onSubmit={enable} className="mt-5 max-w-md space-y-4" noValidate>
          <ol className="space-y-1 text-sm text-slate-600">
            <li>
              1. Add this key to your authenticator app (Google Authenticator, 1Password, Authy).
            </li>
            <li>2. Enter the 6-digit code it shows.</li>
          </ol>
          <code className="block break-all rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-xs text-slate-900">
            {setup.secret}
          </code>
          <a
            href={setup.otpauthUri}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-700 underline-offset-2 hover:underline"
          >
            Open in authenticator app
            <Icon name="arrow-right" className="h-3.5 w-3.5" />
          </a>
          <input
            className={INPUT}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit code"
            aria-label="6-digit code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <button type="submit" disabled={busy} className={PRIMARY}>
            Turn on
          </button>
        </form>
      )}

      {status.enabled && disabling && (
        <form onSubmit={disable} className="mt-5 max-w-md space-y-3" noValidate>
          <input
            className={INPUT}
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            aria-label="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <input
            className={INPUT}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Authenticator or recovery code"
            aria-label="Authenticator or recovery code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50 cursor-pointer"
            >
              Turn off two-factor
            </button>
            <button type="button" onClick={() => setDisabling(false)} className={GHOST}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
