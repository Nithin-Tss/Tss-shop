"use client";

import { useCallback, useEffect, useState } from "react";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

const BASE = "/api/v1/webhooks";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#14130F]";
const primaryButton =
  "rounded-lg bg-[#14130F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1A1916] disabled:opacity-50";
const smallButton =
  "rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50";

const TONE = {
  succeeded: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
  pending: "bg-amber-50 text-amber-700",
};

const when = (value) => (value ? new Date(value).toLocaleString() : "—");

export default function WebhooksPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [endpoints, setEndpoints] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [deliveries, setDeliveries] = useState({}); // endpoint id -> rows
  const [open, setOpen] = useState(null);
  const [secret, setSecret] = useState(null); // shown once after create / rotate

  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState(["*"]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    const [list, events] = await Promise.all([
      apiGet(`${BASE}/endpoints/`),
      apiGet(`${BASE}/endpoints/events/`),
    ]);
    if (list.ok) setEndpoints(list.data?.results ?? list.data ?? []);
    else setError(list.status === 403 ? "You don't have access to webhooks." : list.error);
    if (events.ok) setEventTypes(events.data?.results ?? events.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const loadDeliveries = async (endpoint) => {
    const res = await apiGet(`${BASE}/deliveries/?endpoint=${endpoint.id}`);
    if (res.ok)
      setDeliveries((d) => ({ ...d, [endpoint.id]: res.data?.results ?? res.data ?? [] }));
    else setError(res.error);
  };

  const toggleDeliveries = (endpoint) => {
    if (open === endpoint.id) return setOpen(null);
    setOpen(endpoint.id);
    loadDeliveries(endpoint);
  };

  const toggleEvent = (type) =>
    setSelected((current) => {
      if (type === "*") return ["*"];
      const without = current.filter((t) => t !== "*" && t !== type);
      const next = current.includes(type) ? without : [...without, type];
      return next.length ? next : ["*"];
    });

  const create = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    const res = await apiPost(`${BASE}/endpoints/`, {
      url: url.trim(),
      description: description.trim(),
      events: selected,
    });
    setSaving(false);
    if (!res.ok) {
      const fe = res.fieldErrors || {};
      return setFormError(fe.url || fe.events || res.formError || "Couldn't add the endpoint.");
    }
    setSecret({ id: res.data.id, value: res.data.secret });
    setUrl("");
    setDescription("");
    setSelected(["*"]);
    load();
  };

  const act = async (fn, fallback) => {
    setError("");
    const res = await fn();
    if (!res.ok) setError(res.error || fallback);
    return res;
  };

  const toggleActive = async (endpoint) => {
    const res = await act(
      () => apiPatch(`${BASE}/endpoints/${endpoint.id}/`, { is_active: !endpoint.is_active }),
      "Couldn't update the endpoint."
    );
    if (res.ok) load();
  };

  const remove = async (endpoint) => {
    if (!window.confirm(`Delete the endpoint ${endpoint.url}?`)) return;
    const res = await act(() => apiDelete(`${BASE}/endpoints/${endpoint.id}/`), "Couldn't delete.");
    if (res.ok) load();
  };

  const rotate = async (endpoint) => {
    if (!window.confirm("Rotate the signing secret? The old one keeps working for a short while."))
      return;
    const res = await act(
      () => apiPost(`${BASE}/endpoints/${endpoint.id}/rotate-secret/`, {}),
      "Couldn't rotate the secret."
    );
    if (res.ok) setSecret({ id: endpoint.id, value: res.data.secret });
  };

  const ping = async (endpoint) => {
    const res = await act(
      () => apiPost(`${BASE}/endpoints/${endpoint.id}/test/`, {}),
      "Couldn't queue the test event."
    );
    if (res.ok && open === endpoint.id) loadDeliveries(endpoint);
  };

  const retry = async (endpoint, delivery) => {
    const res = await act(
      () => apiPost(`${BASE}/deliveries/${delivery.id}/retry/`, {}),
      "Couldn't retry the delivery."
    );
    if (res.ok) loadDeliveries(endpoint);
  };

  return (
    <div className="min-h-screen bg-[#F3F1EC] text-[#14130F]">
      <AdminHeader />
      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        <AdminSidebar />
        <main className="min-w-0 flex-1">
          <header className="flex items-center gap-2.5 border-b border-slate-200 bg-[#F3F1EC] px-4 py-5 sm:px-6">
            <PageIcon name="apps" />
            <h1 className="text-xl font-semibold">Webhooks</h1>
          </header>

          <div className="p-5">
            {error && (
              <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            {secret && (
              <div role="status" className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm">
                <p className="font-medium">
                  Signing secret — copy it now, it won&apos;t be shown again.
                </p>
                <code className="mt-1 block break-all rounded bg-white px-2 py-1 text-xs">
                  {secret.value}
                </code>
                <button
                  type="button"
                  className="mt-2 text-xs underline"
                  onClick={() => setSecret(null)}
                >
                  I&apos;ve saved it
                </button>
              </div>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-5">
                <h2 className="text-base font-semibold">Endpoints</h2>
                <p className="mt-1 text-sm text-slate-500">
                  We POST signed events to these URLs. Failed deliveries are retried automatically.
                </p>
              </div>

              {loading ? (
                <p className="px-5 py-8 text-sm text-slate-500">Loading…</p>
              ) : endpoints.length ? (
                <ul className="divide-y divide-slate-100">
                  {endpoints.map((endpoint) => (
                    <li key={endpoint.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{endpoint.url}</p>
                          <p className="text-xs text-slate-500">
                            {endpoint.is_active ? "Active" : "Disabled"}
                            {endpoint.disabled_reason
                              ? ` (${endpoint.disabled_reason})`
                              : ""} ·{" "}
                            {endpoint.events.includes("*")
                              ? "All events"
                              : endpoint.events.join(", ")}
                            {endpoint.consecutive_failures
                              ? ` · ${endpoint.consecutive_failures} failures in a row`
                              : ""}
                          </p>
                          {endpoint.description && (
                            <p className="text-xs text-slate-500">{endpoint.description}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={smallButton}
                            onClick={() => ping(endpoint)}
                          >
                            Send test
                          </button>
                          <button
                            type="button"
                            className={smallButton}
                            onClick={() => toggleDeliveries(endpoint)}
                          >
                            {open === endpoint.id ? "Hide deliveries" : "Deliveries"}
                          </button>
                          <button
                            type="button"
                            className={smallButton}
                            onClick={() => rotate(endpoint)}
                          >
                            Rotate secret
                          </button>
                          <button
                            type="button"
                            className={smallButton}
                            onClick={() => toggleActive(endpoint)}
                          >
                            {endpoint.is_active ? "Disable" : "Enable"}
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(endpoint)}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {open === endpoint.id && (
                        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                          {(deliveries[endpoint.id] || []).length ? (
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 text-slate-500">
                                <tr>
                                  <th className="px-3 py-2">Event</th>
                                  <th className="px-3 py-2">Status</th>
                                  <th className="px-3 py-2">Attempts</th>
                                  <th className="px-3 py-2">Response</th>
                                  <th className="px-3 py-2">Created</th>
                                  <th className="px-3 py-2" />
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {deliveries[endpoint.id].map((d) => (
                                  <tr key={d.id}>
                                    <td className="px-3 py-2">{d.event_type}</td>
                                    <td className="px-3 py-2">
                                      <span
                                        className={`rounded-full px-2 py-0.5 font-medium ${TONE[d.status] || "bg-slate-100"}`}
                                      >
                                        {d.status}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2">{d.attempts}</td>
                                    <td className="px-3 py-2">
                                      {d.last_status_code ?? d.last_error ?? "—"}
                                    </td>
                                    <td className="px-3 py-2">{when(d.created_at)}</td>
                                    <td className="px-3 py-2 text-right">
                                      {d.status !== "pending" && (
                                        <button
                                          type="button"
                                          className="underline"
                                          onClick={() => retry(endpoint, d)}
                                        >
                                          Retry
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="px-3 py-4 text-xs text-slate-500">No deliveries yet.</p>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-8 text-center text-sm text-slate-500">No endpoints yet.</p>
              )}

              <form onSubmit={create} className="grid gap-3 border-t border-slate-200 px-5 py-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/webhooks"
                    aria-label="Endpoint URL"
                    className={inputClass}
                  />
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description (optional)"
                    aria-label="Description"
                    maxLength={200}
                    className={inputClass}
                  />
                </div>
                <fieldset className="text-sm">
                  <legend className="mb-1 font-medium">Events</legend>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={selected.includes("*")}
                        onChange={() => toggleEvent("*")}
                      />
                      All events
                    </label>
                    {eventTypes.map((e) => (
                      <label
                        key={e.type}
                        className="flex items-center gap-1.5"
                        title={e.description}
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(e.type)}
                          onChange={() => toggleEvent(e.type)}
                        />
                        {e.type}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div>
                  <button type="submit" disabled={saving || !url.trim()} className={primaryButton}>
                    {saving ? "Adding…" : "Add endpoint"}
                  </button>
                </div>
                {formError && (
                  <p role="alert" className="text-sm text-red-700">
                    {formError}
                  </p>
                )}
              </form>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
