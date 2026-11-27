import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
import ConfirmationModal from "@/components/ConfirmationModal";
import RichTextEditor from "@/components/RichTextEditor";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api";
import { useSession } from "@/lib/auth";
import {
  createAdminBlogPost,
  deleteAdminBlogPost,
  publishAdminBlogPost,
  unpublishAdminBlogPost,
  updateAdminBlogPost,
} from "@/lib/platformBlogApi";

/*
 * Platform administration: everything across every store. Only platform administrators
 * (User.is_owner) get past the API; the backend's apps/platform_admin/platform_views.py
 * lists each endpoint used here.
 */

const P = "/api/v1/platform";
const PAGE = 25;

const inputClass =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-600";
const primaryButton =
  "rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600/90 disabled:opacity-60";
const secondaryButton =
  "rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60";
const dangerButton =
  "rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60";

const TABS = [
  ["overview", "Overview"],
  ["stores", "Stores"],
  ["users", "Users"],
  ["keys", "API keys"],
  ["flags", "Feature flags"],
  ["blog", "Blog CMS"],
  ["audit", "Audit log"],
];

const TONE = {
  active: "bg-emerald-50 text-emerald-700",
  published: "bg-emerald-50 text-emerald-700",
  draft: "bg-slate-100 text-slate-700",
  suspended: "bg-amber-50 text-amber-700",
  closed: "bg-slate-100 text-slate-600",
  revoked: "bg-slate-100 text-slate-600",
  expired: "bg-amber-50 text-amber-700",
};

const when = (value) => (value ? new Date(value).toLocaleString() : "Never");

function Chip({ tone, children }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONE[tone] || "bg-slate-100 text-slate-700"}`}
    >
      {children}
    </span>
  );
}

function Card({ title, action, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function ErrorNote({ children }) {
  return children ? (
    <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
      {children}
    </p>
  ) : null;
}

// A page of a paginated platform list ({count, results}) that reloads when `query` changes
function usePaged(path, query) {
  const [offset, setOffset] = useState(0);
  const [state, setState] = useState({ loading: true, error: "", count: 0, results: [] });
  const key = JSON.stringify(query);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffset(0);
  }, [key]);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ limit: PAGE, offset });
    Object.entries(JSON.parse(key)).forEach(([name, value]) => value && params.set(name, value));
    const res = await apiGet(`${path}?${params}`);
    setState(
      res.ok
        ? { loading: false, error: "", count: res.data.count, results: res.data.results }
        : { loading: false, error: res.error, count: 0, results: [] }
    );
  }, [path, key, offset]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return { ...state, offset, setOffset, reload: load };
}

function Pager({ offset, count, setOffset }) {
  if (count <= PAGE) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-sm text-slate-500">
      <span>
        {offset + 1}–{Math.min(offset + PAGE, count)} of {count}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={offset === 0}
          onClick={() => setOffset(offset - PAGE)}
          className={secondaryButton}
        >
          Previous
        </button>
        <button
          type="button"
          disabled={offset + PAGE >= count}
          onClick={() => setOffset(offset + PAGE)}
          className={secondaryButton}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function Search({ value, onChange, placeholder, children }) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-200 px-5 py-3">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputClass} min-w-0 flex-1`}
      />
      {children}
    </div>
  );
}

function Stat({ label, value, note }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ overview */

function Overview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiGet(`${P}/overview/`).then((res) => {
      if (cancelled) return;
      if (res.ok) setData(res.data);
      else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Stores"
          value={data.stores.total}
          note={`${data.stores.active} active · ${data.stores.suspended} suspended · ${data.stores.closed} closed`}
        />
        <Stat
          label="Users"
          value={data.users.total}
          note={`${data.users.platformAdmins} platform admins`}
        />
        <Stat
          label="Active API keys"
          value={data.apiKeys.active}
          note={`${data.apiKeys.total} ever made`}
        />
        <Stat
          label="Feature flags"
          value={data.featureFlags.total}
          note={`${data.featureFlags.enabled} switched on`}
        />
      </div>
      <p className="text-sm text-slate-500">
        New this week: {data.stores.newThisWeek} stores, {data.users.newThisWeek} users.
      </p>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Newest stores">
          <ul className="divide-y divide-slate-200">
            {data.recentStores.map((s) => (
              <li
                key={s.storeId}
                className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
              >
                <span>
                  <span className="font-medium">{s.storeName}</span>
                  <span className="ml-2 text-slate-500">{s.createdBy}</span>
                </span>
                <Chip tone={s.status}>{s.status}</Chip>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Recent platform actions">
          {data.recentActions.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-500">Nothing yet.</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {data.recentActions.map((e) => (
                <li key={e.id} className="px-5 py-3 text-sm">
                  <p>
                    {e.summary}
                    {e.object ? ` — ${e.object}` : ""}
                  </p>
                  <p className="text-xs text-slate-500">
                    {e.actor} · {when(e.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ stores */

function StoreDetail({ storeId, onChanged }) {
  const [store, setStore] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await apiGet(`${P}/stores/${storeId}/`);
    if (res.ok) setStore(res.data);
    else setError(res.error);
  }, [storeId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const setStatus = async (action) => {
    let body = {};
    if (action === "suspend") {
      const reason = window.prompt("Why is this store being suspended? (kept in the audit log)");
      if (reason === null) return;
      body = { reason };
    }
    setBusy(true);
    const res = await apiPost(`${P}/stores/${storeId}/${action}/`, body);
    setBusy(false);
    if (!res.ok) return setError(res.formError);
    setError("");
    await load();
    onChanged();
  };

  const setFlag = async (key, enabled) => {
    const res =
      enabled === null
        ? await apiDelete(`${P}/feature-flags/${key}/overrides/${storeId}/`)
        : await apiPut(`${P}/feature-flags/${key}/overrides/${storeId}/`, { enabled });
    if (!res.ok) return setError(res.formError || res.error);
    load();
  };

  if (!store)
    return <div className="px-5 py-4">{error ? <ErrorNote>{error}</ErrorNote> : "Loading…"}</div>;

  return (
    <div className="space-y-4 bg-slate-50 px-5 py-4 text-sm">
      <ErrorNote>{error}</ErrorNote>
      <div className="flex flex-wrap gap-2">
        {store.status === "active" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setStatus("suspend")}
            className={dangerButton}
          >
            Suspend store
          </button>
        )}
        {store.status === "suspended" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setStatus("unsuspend")}
            className={primaryButton}
          >
            Restore store
          </button>
        )}
        <span className="self-center text-xs text-slate-500">
          Suspended stores keep all their data; members and API keys are refused until restored.
        </span>
      </div>
      <div>
        <p className="font-medium">Members</p>
        <ul className="mt-1 text-slate-600">
          {store.members.map((m) => (
            <li key={m.email}>
              {m.name || m.email} ({m.email}) — {m.role}, {m.status}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="font-medium">Feature flags for this store</p>
        <ul className="mt-1 space-y-1">
          {Object.entries(store.flags).map(([key, on]) => (
            <li key={key} className="flex flex-wrap items-center gap-2">
              <code className="font-mono text-xs">{key}</code>
              <Chip tone={on ? "active" : "closed"}>{on ? "on" : "off"}</Chip>
              <button type="button" className={secondaryButton} onClick={() => setFlag(key, true)}>
                Force on
              </button>
              <button type="button" className={secondaryButton} onClick={() => setFlag(key, false)}>
                Force off
              </button>
              <button type="button" className={secondaryButton} onClick={() => setFlag(key, null)}>
                Follow flag
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stores() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState("");
  const list = usePaged(`${P}/stores/`, { q, status });

  return (
    <Card>
      <Search value={q} onChange={setQ} placeholder="Search by name, address or creator">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={`${inputClass} bg-white`}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="closed">Closed</option>
        </select>
      </Search>
      {list.error && <ErrorNote>{list.error}</ErrorNote>}
      <ul className="divide-y divide-slate-200">
        {list.results.map((s) => (
          <li key={s.storeId}>
            <button
              type="button"
              onClick={() => setOpen(open === s.storeId ? "" : s.storeId)}
              className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-3 text-left hover:bg-slate-50"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{s.storeName}</span>
                <span className="block text-xs text-slate-500">
                  /{s.storeSlug} · {s.createdBy || "unknown creator"} · {s.memberCount} member
                  {s.memberCount === 1 ? "" : "s"} · {s.apiKeyCount} key
                  {s.apiKeyCount === 1 ? "" : "s"} · created {when(s.createdAt)}
                </span>
              </span>
              <Chip tone={s.status}>{s.status}</Chip>
            </button>
            {open === s.storeId && <StoreDetail storeId={s.storeId} onChanged={list.reload} />}
          </li>
        ))}
        {!list.loading && list.results.length === 0 && (
          <li className="px-5 py-6 text-sm text-slate-500">No stores match.</li>
        )}
      </ul>
      <Pager offset={list.offset} count={list.count} setOffset={list.setOffset} />
    </Card>
  );
}

/* ------------------------------------------------------------------ users */

function Users({ me }) {
  const [q, setQ] = useState("");
  const [adminsOnly, setAdminsOnly] = useState(false);
  const [error, setError] = useState("");
  const list = usePaged(`${P}/users/`, { q, admin: adminsOnly ? "true" : "" });

  const toggle = async (user) => {
    const next = !user.isPlatformAdmin;
    const text = next
      ? `Make ${user.email} a platform administrator? They will be able to open and manage every store.`
      : `Remove platform administrator access from ${user.email}?`;
    if (!window.confirm(text)) return;
    const res = await apiPost(`${P}/users/${user.id}/platform-admin/`, { isPlatformAdmin: next });
    if (!res.ok) return setError(res.formError);
    setError("");
    list.reload();
  };

  const toggleAgent = async (user) => {
    const next = !user.isSupportAgent;
    const text = next
      ? `Make ${user.email} a support agent? They will be able to read and answer every store's support tickets.`
      : `Remove support agent access from ${user.email}?`;
    if (!window.confirm(text)) return;
    const res = await apiPost(`${P}/users/${user.id}/support-agent/`, { isSupportAgent: next });
    if (!res.ok) return setError(res.formError);
    setError("");
    list.reload();
  };

  return (
    <Card>
      <Search value={q} onChange={setQ} placeholder="Search by name or email">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={adminsOnly}
            onChange={(e) => setAdminsOnly(e.target.checked)}
          />
          Platform admins only
        </label>
      </Search>
      <div className="px-5 pt-3">
        <ErrorNote>{error || list.error}</ErrorNote>
      </div>
      <ul className="divide-y divide-slate-200">
        {list.results.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div className="min-w-0 text-sm">
              <p className="font-semibold">
                {u.firstName} {u.lastName}{" "}
                {u.isPlatformAdmin && <Chip tone="active">platform admin</Chip>}{" "}
                {u.isSupportAgent && <Chip tone="active">support agent</Chip>}
              </p>
              <p className="text-xs text-slate-500">
                {u.email} · {u.storeCount} store{u.storeCount === 1 ? "" : "s"} · joined{" "}
                {when(u.createdAt)} · last sign-in {when(u.lastLogin)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => toggleAgent(u)}
                className={u.isSupportAgent ? dangerButton : secondaryButton}
              >
                {u.isSupportAgent ? "Remove support agent" : "Make support agent"}
              </button>
              {u.id !== me && (
                <button
                  type="button"
                  onClick={() => toggle(u)}
                  className={u.isPlatformAdmin ? dangerButton : secondaryButton}
                >
                  {u.isPlatformAdmin ? "Remove admin" : "Make admin"}
                </button>
              )}
            </div>
          </li>
        ))}
        {!list.loading && list.results.length === 0 && (
          <li className="px-5 py-6 text-sm text-slate-500">No users match.</li>
        )}
      </ul>
      <Pager offset={list.offset} count={list.count} setOffset={list.setOffset} />
    </Card>
  );
}

/* ------------------------------------------------------------------ api keys */

function ApiKeys() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const list = usePaged(`${P}/api-keys/`, { q, status });

  const revoke = async (key) => {
    if (!window.confirm(`Revoke “${key.name}” of ${key.storeName}?`)) return;
    const res = await apiPost(`${P}/api-keys/${key.id}/revoke/`, {});
    if (!res.ok) return setError(res.formError);
    setError("");
    list.reload();
  };

  return (
    <Card>
      <Search value={q} onChange={setQ} placeholder="Search by key name, prefix or store">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={`${inputClass} bg-white`}
        >
          <option value="">All keys</option>
          <option value="active">Active</option>
          <option value="revoked">Revoked</option>
          <option value="expired">Expired</option>
        </select>
      </Search>
      <div className="px-5 pt-3">
        <ErrorNote>{error || list.error}</ErrorNote>
      </div>
      <ul className="divide-y divide-slate-200">
        {list.results.map((k) => (
          <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div className="min-w-0 text-sm">
              <p className="font-semibold">
                {k.name} <Chip tone={k.status}>{k.status}</Chip>
              </p>
              <p className="text-xs text-slate-500">
                {k.storeName} · tssk_{k.prefix}_•••• · {k.scopes.length} permissions · last used{" "}
                {when(k.lastUsedAt)}
              </p>
            </div>
            {k.status === "active" && (
              <button type="button" onClick={() => revoke(k)} className={dangerButton}>
                Revoke
              </button>
            )}
          </li>
        ))}
        {!list.loading && list.results.length === 0 && (
          <li className="px-5 py-6 text-sm text-slate-500">No keys match.</li>
        )}
      </ul>
      <Pager offset={list.offset} count={list.count} setOffset={list.setOffset} />
    </Card>
  );
}

/* ------------------------------------------------------------------ feature flags */

function FlagRow({ flag, onChanged, onError }) {
  const [percent, setPercent] = useState(String(flag.rolloutPercent));
  const [overrides, setOverrides] = useState(null);

  const save = async (changes) => {
    // A flag that only exists in code gets its row the first time it is changed
    const res = flag.saved
      ? await apiPatch(`${P}/feature-flags/${flag.key}/`, changes)
      : await apiPost(`${P}/feature-flags/`, {
          key: flag.key,
          name: flag.name,
          description: flag.description,
          enabled: flag.enabled,
          rolloutPercent: flag.rolloutPercent,
          ...changes,
        });
    if (!res.ok) return onError(res.fieldErrors.rolloutPercent || res.formError);
    onError("");
    onChanged();
  };

  const remove = async () => {
    if (!window.confirm(`Delete the flag “${flag.key}”? Stores fall back to its default.`)) return;
    const res = await apiDelete(`${P}/feature-flags/${flag.key}/`);
    if (!res.ok) return onError(res.error);
    onChanged();
  };

  const showOverrides = async () => {
    if (overrides) return setOverrides(null);
    const res = await apiGet(`${P}/feature-flags/${flag.key}/overrides/`);
    if (res.ok) setOverrides(res.data);
  };

  return (
    <li className="space-y-2 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {flag.name} <code className="ml-1 font-mono text-xs text-slate-500">{flag.key}</code>
            {!flag.saved && (
              <span className="ml-2 text-xs font-normal text-slate-500">(code default)</span>
            )}
          </p>
          {flag.description && <p className="text-xs text-slate-500">{flag.description}</p>}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={flag.enabled}
            onChange={(e) => save({ enabled: e.target.checked })}
          />
          {flag.enabled ? "On" : "Off"}
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        Roll out to
        <input
          type="number"
          min="0"
          max="100"
          value={percent}
          onChange={(e) => setPercent(e.target.value)}
          className={`${inputClass} w-20`}
        />
        % of stores
        <button
          type="button"
          disabled={percent === String(flag.rolloutPercent) || percent === ""}
          onClick={() => save({ rolloutPercent: Number(percent) })}
          className={secondaryButton}
        >
          Apply
        </button>
        {flag.saved && (
          <>
            <button type="button" onClick={showOverrides} className={secondaryButton}>
              {flag.overrideCount} store override{flag.overrideCount === 1 ? "" : "s"}
            </button>
            <button type="button" onClick={remove} className={dangerButton}>
              Delete
            </button>
          </>
        )}
      </div>
      {overrides && (
        <ul className="rounded-lg bg-slate-50 px-4 py-2 text-sm">
          {overrides.length === 0 && <li className="text-slate-500">No store overrides.</li>}
          {overrides.map((o) => (
            <li key={o.storeId}>
              {o.storeName} — forced {o.enabled ? "on" : "off"}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function Flags() {
  const [flags, setFlags] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ key: "", name: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await apiGet(`${P}/feature-flags/`);
    if (res.ok) setFlags(res.data);
    else setError(res.error);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const create = async (event) => {
    event.preventDefault();
    setSaving(true);
    const res = await apiPost(`${P}/feature-flags/`, {
      ...form,
      enabled: false,
      rolloutPercent: 100,
    });
    setSaving(false);
    if (!res.ok) return setError(res.fieldErrors.key || res.fieldErrors.name || res.formError);
    setError("");
    setForm({ key: "", name: "" });
    load();
  };

  return (
    <div className="space-y-4">
      <ErrorNote>{error}</ErrorNote>
      <Card title="Feature flags">
        <form
          onSubmit={create}
          className="flex flex-wrap gap-2 border-b border-slate-200 px-5 py-3"
        >
          <input
            required
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value })}
            placeholder="key_like_this"
            className={`${inputClass} w-52 font-mono`}
          />
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Display name"
            className={`${inputClass} min-w-0 flex-1`}
          />
          <button type="submit" disabled={saving} className={primaryButton}>
            Add flag
          </button>
        </form>
        <ul className="divide-y divide-slate-200">
          {flags.map((flag) => (
            <FlagRow
              key={`${flag.key}:${flag.saved}`}
              flag={flag}
              onChanged={load}
              onError={setError}
            />
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ audit */

function Audit() {
  const [q, setQ] = useState("");
  const [platformOnly, setPlatformOnly] = useState(false);
  const list = usePaged(`${P}/audit/`, { q, platformOnly: platformOnly ? "true" : "" });

  return (
    <Card>
      <Search value={q} onChange={setQ} placeholder="Search action, object or person">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={platformOnly}
            onChange={(e) => setPlatformOnly(e.target.checked)}
          />
          Platform actions only
        </label>
      </Search>
      <div className="px-5 pt-3">
        <ErrorNote>{list.error}</ErrorNote>
      </div>
      <ul className="divide-y divide-slate-200">
        {list.results.map((e) => (
          <li key={e.id} className="px-5 py-3 text-sm">
            <p>
              <span className="font-medium">{e.summary}</span>
              {e.object ? ` — ${e.object}` : ""}
            </p>
            <p className="text-xs text-slate-500">
              {e.actor || "system"} · {e.store || "no store"} ·{" "}
              <code className="font-mono">{e.action}</code> · {when(e.createdAt)}
              {e.ipAddress ? ` · ${e.ipAddress}` : ""}
            </p>
          </li>
        ))}
        {!list.loading && list.results.length === 0 && (
          <li className="px-5 py-6 text-sm text-slate-500">Nothing logged.</li>
        )}
      </ul>
      <Pager offset={list.offset} count={list.count} setOffset={list.setOffset} />
    </Card>
  );
}

/* ------------------------------------------------------------------ blog CMS */

function BlogPostEditorModal({ post, onClose, onSaved }) {
  const isNew = !post?.id;
  const [form, setForm] = useState({
    title: post?.title || "",
    slug: post?.slug || "",
    category: post?.category || "Product Updates",
    author: post?.author || "TSS Team",
    excerpt: post?.excerpt || "",
    content: post?.content || "",
    featured_image: post?.featured_image || "",
    read_time: post?.read_time || "",
    status: post?.status || "draft",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const slugify = (text) =>
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const handleTitleChange = (val) => {
    setForm((prev) => {
      const next = { ...prev, title: val };
      if (isNew && (!prev.slug || prev.slug === slugify(prev.title))) {
        next.slug = slugify(val);
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setIsSubmitting(true);
    setError("");

    const payload = {
      ...form,
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      category: form.category.trim(),
      author: form.author.trim(),
      excerpt: form.excerpt.trim(),
      featured_image: form.featured_image.trim(),
      read_time: form.read_time.trim() || undefined,
    };

    const res = isNew
      ? await createAdminBlogPost(payload)
      : await updateAdminBlogPost(post.id, payload);

    setIsSubmitting(false);
    if (!res.ok) {
      setError(res.error || "Failed to save article.");
      return;
    }
    onSaved();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="blog-modal-title"
    >
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 id="blog-modal-title" className="text-lg font-semibold text-slate-900">
            {isNew ? "Create Platform Blog Article" : "Edit Blog Article"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <ErrorNote>{error}</ErrorNote>}

          <div className="space-y-1">
            <label htmlFor="blog-title" className="text-sm font-medium text-slate-700">
              Article Title *
            </label>
            <input
              id="blog-title"
              type="text"
              required
              value={form.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. Launching TSS Shop 2.0"
              className={`w-full ${inputClass}`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="blog-slug" className="text-sm font-medium text-slate-700">
                URL Slug
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="blog-slug"
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm((prev) => ({ ...prev, slug: slugify(e.target.value) }))}
                  placeholder="launching-tss-shop-2-0"
                  className={`w-full ${inputClass}`}
                />
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, slug: slugify(prev.title) }))}
                  className={secondaryButton}
                  title="Regenerate slug from title"
                >
                  Auto
                </button>
              </div>
              <p className="text-xs text-slate-500">Live URL: /blog/{form.slug || "..."}</p>
            </div>

            <div className="space-y-1">
              <label htmlFor="blog-category" className="text-sm font-medium text-slate-700">
                Category
              </label>
              <input
                id="blog-category"
                type="text"
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                placeholder="Product Updates, Guides, E-Commerce"
                className={`w-full ${inputClass}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label htmlFor="blog-author" className="text-sm font-medium text-slate-700">
                Author
              </label>
              <input
                id="blog-author"
                type="text"
                value={form.author}
                onChange={(e) => setForm((prev) => ({ ...prev, author: e.target.value }))}
                placeholder="TSS Team"
                className={`w-full ${inputClass}`}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="blog-read-time" className="text-sm font-medium text-slate-700">
                Read Time
              </label>
              <input
                id="blog-read-time"
                type="text"
                value={form.read_time}
                onChange={(e) => setForm((prev) => ({ ...prev, read_time: e.target.value }))}
                placeholder="e.g. 5 min read"
                className={`w-full ${inputClass}`}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="blog-status" className="text-sm font-medium text-slate-700">
                Status
              </label>
              <select
                id="blog-status"
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                className={`w-full ${inputClass}`}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="blog-image" className="text-sm font-medium text-slate-700">
              Featured Image URL
            </label>
            <input
              id="blog-image"
              type="url"
              value={form.featured_image}
              onChange={(e) => setForm((prev) => ({ ...prev, featured_image: e.target.value }))}
              placeholder="https://example.com/image.jpg"
              className={`w-full ${inputClass}`}
            />
            {form.featured_image && (
              <div className="mt-2 h-32 w-full max-w-xs overflow-hidden rounded-lg border border-slate-200">
                <img
                  src={form.featured_image}
                  alt="Featured preview"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="blog-excerpt" className="text-sm font-medium text-slate-700">
              Excerpt / Summary
            </label>
            <textarea
              id="blog-excerpt"
              rows={3}
              value={form.excerpt}
              onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
              placeholder="Brief teaser displayed in marketing blog cards..."
              className={`w-full ${inputClass}`}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Article Content</label>
            <RichTextEditor
              value={form.content}
              onChange={(html) => setForm((prev) => ({ ...prev, content: html }))}
              placeholder="Write full article body..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={secondaryButton}
            >
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className={primaryButton}>
              {isSubmitting ? "Saving..." : isNew ? "Create Article" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PlatformBlogSection() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [editingPost, setEditingPost] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState("");

  const list = usePaged(`${P}/blog/posts/`, {
    q,
    status: statusFilter,
    category: categoryFilter,
  });

  const handleTogglePublish = async (post) => {
    setActionError("");
    const isPublished = post.status === "published";
    const res = isPublished
      ? await unpublishAdminBlogPost(post.id)
      : await publishAdminBlogPost(post.id);
    if (!res.ok) {
      setActionError(res.error || `Failed to ${isPublished ? "unpublish" : "publish"} article.`);
      return;
    }
    list.reload();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setActionError("");
    const res = await deleteAdminBlogPost(deleteTarget.id);
    setIsDeleting(false);
    if (!res.ok) {
      setActionError(res.error || "Failed to delete article.");
      return;
    }
    setDeleteTarget(null);
    list.reload();
  };

  return (
    <Card
      title="Marketing Blog CMS"
      action={
        <button type="button" onClick={() => setEditingPost({})} className={primaryButton}>
          + New Article
        </button>
      }
    >
      <Search value={q} onChange={setQ} placeholder="Search articles by title, excerpt or content">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-orange-600"
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>

          <input
            type="text"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            placeholder="Filter category..."
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-orange-600"
          />
        </div>
      </Search>

      <div className="px-5 pt-3">
        <ErrorNote>{actionError || list.error}</ErrorNote>
      </div>

      <ul className="divide-y divide-slate-200">
        {list.results.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0 max-w-2xl space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-slate-900 text-sm">{p.title}</h3>
                <Chip tone={p.status}>{p.status}</Chip>
                {p.category && (
                  <span className="rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 border border-violet-200">
                    {p.category}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Slug: <span className="text-slate-700">/blog/{p.slug}</span>
              </p>
              {p.excerpt && <p className="text-xs text-slate-600 line-clamp-2">{p.excerpt}</p>}
              <p className="text-xs text-slate-400">
                By {p.author || "TSS Team"} · {p.read_time || "Quick read"} ·{" "}
                {p.status === "published"
                  ? `Published ${when(p.published_at)}`
                  : `Created ${when(p.created_at)}`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/blog/${p.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className={secondaryButton}
              >
                View ↗
              </Link>
              <button
                type="button"
                onClick={() => handleTogglePublish(p)}
                className={secondaryButton}
              >
                {p.status === "published" ? "Unpublish" : "Publish"}
              </button>
              <button type="button" onClick={() => setEditingPost(p)} className={secondaryButton}>
                Edit
              </button>
              <button type="button" onClick={() => setDeleteTarget(p)} className={dangerButton}>
                Delete
              </button>
            </div>
          </li>
        ))}

        {!list.loading && list.results.length === 0 && (
          <li className="px-5 py-12 text-center text-sm text-slate-500">
            <p className="font-medium text-slate-700">No blog articles found.</p>
            <p className="mt-1 text-xs text-slate-400">
              Create your first article or adjust filters to manage marketing content.
            </p>
            <button
              type="button"
              onClick={() => setEditingPost({})}
              className={`mt-4 ${primaryButton}`}
            >
              + Create First Article
            </button>
          </li>
        )}
      </ul>

      <Pager offset={list.offset} count={list.count} setOffset={list.setOffset} />

      {editingPost && (
        <BlogPostEditorModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSaved={() => {
            setEditingPost(null);
            list.reload();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmationModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete blog article?"
          itemName={deleteTarget.title}
          itemType="Blog article"
          message={`Are you sure you want to delete "${deleteTarget.title}"? This permanently removes the article from the public platform blog.`}
          confirmText="Delete article"
          isLoading={isDeleting}
        />
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ page */

export default function AdminPlatform() {
  const session = useSession();
  const [tab, setTab] = useState("overview");
  // The Support tab moved to its own section: old links (/admin/platform?tab=support) go there
  const [params] = useSearchParams();
  if (params.get("tab") === "support") return <Navigate to="/admin/support-tickets" replace />;

  return (
    <div className="min-h-screen bg-slate-100 text-ink">
      <AdminHeader />

      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        <AdminSidebar />

        <main className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-100 px-4 py-5 sm:px-6">
            <div className="flex items-center gap-2.5">
              <PageIcon name="platform" />
              <h1 className="text-xl font-semibold">Platform administration</h1>
            </div>
          </header>

          {!session?.user?.isPlatformAdmin ? (
            <div className="p-5">
              <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Only platform administrators can open this page. If you were just given access, sign
                out and in again.{" "}
                <Link to="/admin/online-store/home" className="font-medium underline">
                  Back to admin home
                </Link>
              </p>
            </div>
          ) : (
            <div className="space-y-5 p-5">
              <nav className="flex flex-wrap gap-1" aria-label="Platform sections">
                {TABS.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    aria-current={tab === id ? "page" : undefined}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      tab === id
                        ? "bg-ink font-semibold text-white"
                        : "text-slate-700 hover:bg-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              {tab === "overview" && <Overview />}
              {tab === "stores" && <Stores />}
              {tab === "users" && <Users me={session.user.id} />}
              {tab === "keys" && <ApiKeys />}
              {tab === "flags" && <Flags />}
              {tab === "blog" && <PlatformBlogSection />}
              {tab === "audit" && <Audit />}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
