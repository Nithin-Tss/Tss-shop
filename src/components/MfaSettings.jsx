import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

const INPUT =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-blue-100";

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

  return (
    <section
      className="mt-6 rounded-2xl border border-slate-100 bg-white p-6"
      aria-labelledby="mfa-heading"
    >
      <h2 id="mfa-heading" className="text-sm font-semibold text-slate-800">
        Two-factor authentication
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        {status.enabled
          ? `On. ${status.recoveryCodesLeft} recovery code${status.recoveryCodesLeft === 1 ? "" : "s"} left.`
          : "Ask for a code from an authenticator app each time you sign in."}
      </p>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      {recoveryCodes.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-800">
            Save these recovery codes now. Each works once, and they will not be shown again.
          </p>
          <ul className="mt-2 grid grid-cols-2 gap-1 font-mono text-xs text-slate-800">
            {recoveryCodes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setRecoveryCodes([])}
            className="mt-3 text-xs font-semibold text-violet-600"
          >
            I have saved them
          </button>
        </div>
      )}

      {!status.enabled && !setup && (
        <button
          type="button"
          onClick={begin}
          disabled={busy}
          className="mt-4 rounded-lg bg-charcoal-navy px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          Set up
        </button>
      )}

      {setup && (
        <form onSubmit={enable} className="mt-4 max-w-md space-y-3" noValidate>
          <p className="text-xs text-slate-600">
            Add this key to your authenticator app (Google Authenticator, 1Password, Authy), then
            enter the 6-digit code it shows.
          </p>
          <code className="block break-all rounded bg-slate-100 px-3 py-2 text-xs">
            {setup.secret}
          </code>
          <a href={setup.otpauthUri} className="block text-xs font-semibold text-violet-600">
            Open in authenticator app
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
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-charcoal-navy px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Turn on
          </button>
        </form>
      )}

      {status.enabled && !disabling && (
        <button
          type="button"
          onClick={() => setDisabling(true)}
          className="mt-4 text-xs font-semibold text-red-600"
        >
          Turn off
        </button>
      )}

      {status.enabled && disabling && (
        <form onSubmit={disable} className="mt-4 max-w-md space-y-3" noValidate>
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
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Turn off two-factor
          </button>
        </form>
      )}
    </section>
  );
}
