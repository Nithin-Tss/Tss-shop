import { useCallback, useEffect, useMemo, useState } from "react";
import { API_URL, apiDelete, apiGet, apiPost } from "@/lib/api";
import { useCan } from "@/lib/auth";

/*
 * Settings → API keys. A key lets the store's own software call the API without a person
 * signing in. It acts in this store with only the scopes ticked here (the backend's
 * apps/platform_admin). The secret is shown once, when the key is made or rotated.
 */

const KEYS = "/api/v1/api-keys/";

const inputClass =
  "rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-300";
const primaryButton =
  "rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600/90 disabled:opacity-60";
const secondaryButton =
  "rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60";
const dangerButton =
  "rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60";

const EXPIRY = [
  ["", "Never expires"],
  ["30", "30 days"],
  ["90", "90 days"],
  ["365", "1 year"],
];

const STATUS_TONE = {
  active: "bg-emerald-50 text-emerald-700",
  revoked: "bg-slate-100 text-slate-600",
  expired: "bg-amber-50 text-amber-700",
};

const when = (value) => (value ? new Date(value).toLocaleString() : "Never");

function groupScopes(scopes) {
  const groups = new Map();
  scopes.forEach((scope) => {
    if (!groups.has(scope.group)) groups.set(scope.group, []);
    groups.get(scope.group).push(scope);
  });
  return [...groups.entries()];
}

function SecretBanner({ created, onDismiss }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(created.key);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <h3 className="text-sm font-semibold text-emerald-900">
        Copy your new key for “{created.name}” now
      </h3>
      <p className="mt-1 text-sm text-emerald-800">
        This is the only time it is shown. If you lose it, rotate the key to get a new one.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-slate-900">
          {created.key}
        </code>
        <button type="button" onClick={copy} className={secondaryButton}>
          {copied ? "Copied" : "Copy"}
        </button>
        <button type="button" onClick={onDismiss} className={secondaryButton}>
          I've saved it
        </button>
      </div>
      <p className="mt-3 text-xs text-emerald-800">
        Use it as <code className="font-mono">Authorization: Bearer {created.prefix}…</code> or{" "}
        <code className="font-mono">X-Api-Key</code> on requests to {API_URL}/api/v1/.
      </p>
    </div>
  );
}

function CreateKeyForm({ scopes, onCreated, onCancel }) {
  const [name, setName] = useState("");
  const [picked, setPicked] = useState(new Set());
  const [expiryDays, setExpiryDays] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const groups = useMemo(() => groupScopes(scopes), [scopes]);

  const toggle = (key) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const pickWhere = (test) =>
    setPicked(new Set(scopes.filter((s) => test(s.key)).map((s) => s.key)));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!name.trim()) return setError("Give the key a name.");
    if (!picked.size) return setError("Choose what the key may do.");

    setSaving(true);
    const body = { name: name.trim(), scopes: [...picked] };
    if (expiryDays)
      body.expiresAt = new Date(Date.now() + Number(expiryDays) * 86400000).toISOString();
    const res = await apiPost(KEYS, body);
    setSaving(false);

    if (!res.ok) return setError(res.fieldErrors.scopes || res.fieldErrors.name || res.formError);
    onCreated(res.data);
  };

  return (
    <form onSubmit={submit} className="space-y-5 border-b border-slate-200 bg-slate-50 px-5 py-5">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            placeholder="e.g. Warehouse sync"
            className={`${inputClass} mt-1 w-full`}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Expires
          <select
            value={expiryDays}
            onChange={(e) => setExpiryDays(e.target.value)}
            className={`${inputClass} mt-1 w-full bg-white`}
          >
            {EXPIRY.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <legend className="text-sm font-medium text-slate-700">Access</legend>
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              className={secondaryButton}
              onClick={() => pickWhere((k) => k.endsWith(".view"))}
            >
              Read-only
            </button>
            <button type="button" className={secondaryButton} onClick={() => pickWhere(() => true)}>
              Everything
            </button>
            <button type="button" className={secondaryButton} onClick={() => setPicked(new Set())}>
              Clear
            </button>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {groups.map(([group, items]) => (
            <div key={group} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-ink">{group}</p>
              {items.map((scope) => (
                <label
                  key={scope.key}
                  className="mt-2 flex items-start gap-2 text-sm text-slate-600"
                >
                  <input
                    type="checkbox"
                    checked={picked.has(scope.key)}
                    onChange={() => toggle(scope.key)}
                    className="mt-0.5"
                  />
                  <span>{scope.label}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Changing something always includes viewing it. Keys can never manage users, roles,
          billing, domains or payments.
        </p>
      </fieldset>

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className={primaryButton}>
          {saving ? "Creating…" : "Create key"}
        </button>
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function ApiKeysSettings() {
  const canManage = useCan("api_keys.manage");
  const [keys, setKeys] = useState([]);
  const [scopes, setScopes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    const [list, catalog] = await Promise.all([
      apiGet(KEYS),
      canManage ? apiGet(`${KEYS}scopes/`) : Promise.resolve({ ok: true, data: [] }),
    ]);
    if (list.ok) {
      setKeys(list.data ?? []);
      setError("");
    } else {
      setError(list.error);
    }
    if (catalog.ok) setScopes(catalog.data ?? []);
    setLoading(false);
  }, [canManage]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const act = async (key, action) => {
    setBusyId(key.id);
    setError("");
    const res = await apiPost(`${KEYS}${key.id}/${action}/`, {});
    setBusyId("");
    if (!res.ok) return setError(res.formError);
    if (action === "rotate") setCreated(res.data);
    load();
  };

  const revoke = (key) => {
    if (window.confirm(`Revoke “${key.name}”? Anything using it stops working immediately.`))
      act(key, "revoke");
  };

  const rotate = (key) => {
    if (window.confirm(`Rotate “${key.name}”? The current secret stops working immediately.`))
      act(key, "rotate");
  };

  const remove = async (key) => {
    if (!window.confirm(`Delete “${key.name}” for good?`)) return;
    setBusyId(key.id);
    const res = await apiDelete(`${KEYS}${key.id}/`);
    setBusyId("");
    if (!res.ok) return setError(res.error);
    load();
  };

  return (
    <div className="space-y-5">
      {created && <SecretBanner created={created} onDismiss={() => setCreated(null)} />}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5">
          <div>
            <h2 className="text-base font-semibold text-ink">API keys</h2>
            <p className="mt-1 text-sm text-slate-500">
              Let your own software read and change this store's data without a person signing in.
            </p>
          </div>
          {canManage && !creating && (
            <button type="button" onClick={() => setCreating(true)} className={primaryButton}>
              Create key
            </button>
          )}
        </div>

        {creating && (
          <CreateKeyForm
            scopes={scopes}
            onCancel={() => setCreating(false)}
            onCreated={(key) => {
              setCreating(false);
              setCreated(key);
              load();
            }}
          />
        )}

        {loading ? (
          <p className="px-5 py-6 text-sm text-slate-500">Loading…</p>
        ) : keys.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No API keys yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {keys.map((key) => (
              <li
                key={key.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                    {key.name}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[key.status] || ""}`}
                    >
                      {key.status}
                    </span>
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-slate-500">
                    tssk_{key.prefix}_••••••••
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {key.scopes.length} permission{key.scopes.length === 1 ? "" : "s"} · Created{" "}
                    {when(key.createdAt)}
                    {key.createdBy ? ` by ${key.createdBy}` : ""} · Last used {when(key.lastUsedAt)}{" "}
                    · {key.expiresAt ? `Expires ${when(key.expiresAt)}` : "Never expires"}
                  </p>
                  <p className="mt-1 break-words text-xs text-slate-400">{key.scopes.join(", ")}</p>
                </div>
                {canManage && (
                  <div className="flex shrink-0 gap-2">
                    {key.status === "active" && (
                      <>
                        <button
                          type="button"
                          disabled={busyId === key.id}
                          onClick={() => rotate(key)}
                          className={secondaryButton}
                        >
                          Rotate
                        </button>
                        <button
                          type="button"
                          disabled={busyId === key.id}
                          onClick={() => revoke(key)}
                          className={dangerButton}
                        >
                          Revoke
                        </button>
                      </>
                    )}
                    {key.status !== "active" && (
                      <button
                        type="button"
                        disabled={busyId === key.id}
                        onClick={() => remove(key)}
                        className={dangerButton}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
