"use client";

import { useCallback, useEffect, useState } from "react";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
import { apiDownload, apiGet } from "@/lib/api";
import { useCan } from "@/lib/auth";

const PAGE = 25;

const inputClass =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-600";

const when = (value) => (value ? new Date(value).toLocaleString() : "—");

export default function AuditLogPage() {
  const canExport = useCan("audit.export");

  const [q, setQ] = useState("");
  const [outcome, setOutcome] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [offset, setOffset] = useState(0);
  const [state, setState] = useState({ loading: true, error: "", count: 0, results: [] });
  const [detail, setDetail] = useState(null);

  const params = useCallback(() => {
    const p = new URLSearchParams({ limit: PAGE, offset });
    if (q) p.set("q", q);
    if (outcome) p.set("outcome", outcome);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return p;
  }, [q, outcome, from, to, offset]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffset(0);
  }, [q, outcome, from, to]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await apiGet(`/api/v1/audit/logs/?${params()}`);
      if (cancelled) return;
      setState(
        res.ok
          ? { loading: false, error: "", count: res.data.count, results: res.data.results }
          : { loading: false, error: res.error, count: 0, results: [] }
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [params]);

  const openDetail = async (entry) => {
    const res = await apiGet(`/api/v1/audit/logs/${entry.id}/`);
    setDetail(res.ok ? res.data : { ...entry, error: res.error });
  };

  const exportCsv = async () => {
    const p = params();
    p.delete("limit");
    p.delete("offset");
    const res = await apiDownload(`/api/v1/audit/logs/export/?${p}`);
    if (!res.ok) return setState((s) => ({ ...s, error: res.error }));
    const url = URL.createObjectURL(res.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit-log.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const { loading, error, count, results } = state;

  return (
    <div className="min-h-screen bg-slate-100 text-ink">
      <AdminHeader />
      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        <AdminSidebar />
        <main className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-100 px-4 py-5 sm:px-6">
            <div className="flex items-center gap-2.5">
              <PageIcon name="reports" />
              <h1 className="text-xl font-semibold">Audit log</h1>
            </div>
            {canExport && (
              <button
                type="button"
                onClick={exportCsv}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-white"
              >
                Export CSV
              </button>
            )}
          </header>

          <div className="p-5">
            <div className="mb-4 flex flex-wrap gap-3">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search actor, action or record"
                aria-label="Search"
                className={`${inputClass} min-w-[16rem] flex-1`}
              />
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                aria-label="Outcome"
                className={inputClass}
              >
                <option value="">All activity</option>
                <option value="denied">Refused requests only</option>
              </select>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                aria-label="From"
                className={inputClass}
              />
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                aria-label="To"
                className={inputClass}
              />
            </div>

            {error && (
              <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              {loading ? (
                <p className="px-5 py-8 text-sm text-slate-500">Loading…</p>
              ) : results.length ? (
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-3">When</th>
                      <th className="px-4 py-3">Who</th>
                      <th className="px-4 py-3">What</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.map((entry) => (
                      <tr key={entry.id}>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {when(entry.createdAt)}
                        </td>
                        <td className="px-4 py-3">{entry.actor || "System"}</td>
                        <td className="px-4 py-3">{entry.summary}</td>
                        <td className="px-4 py-3 text-slate-600">{entry.statusCode}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            className="underline"
                            onClick={() => openDetail(entry)}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="px-5 py-8 text-center text-sm text-slate-500">
                  No activity matches these filters.
                </p>
              )}

              {count > PAGE && (
                <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
                  <span className="text-slate-500">
                    {offset + 1}–{Math.min(offset + PAGE, count)} of {count}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={offset === 0}
                      onClick={() => setOffset(Math.max(0, offset - PAGE))}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={offset + PAGE >= count}
                      onClick={() => setOffset(offset + PAGE)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {detail && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Audit entry"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDetail(null)}
          onKeyDown={(e) => e.key === "Escape" && setDetail(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-base font-semibold">{detail.summary}</h2>
              <button
                type="button"
                autoFocus
                className="underline text-sm"
                onClick={() => setDetail(null)}
              >
                Close
              </button>
            </div>
            <dl className="mt-3 grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
              <dt className="text-slate-500">Actor</dt>
              <dd>{detail.actor || "System"}</dd>
              <dt className="text-slate-500">When</dt>
              <dd>{when(detail.createdAt)}</dd>
              <dt className="text-slate-500">Request</dt>
              <dd className="break-all">
                {detail.method} {detail.path} → {detail.statusCode}
              </dd>
              <dt className="text-slate-500">IP address</dt>
              <dd>{detail.ipAddress || "—"}</dd>
            </dl>
            {detail.error && <p className="mt-3 text-sm text-red-700">{detail.error}</p>}
            {Array.isArray(detail.changes) && detail.changes.length > 0 && (
              <pre className="mt-4 overflow-auto rounded-lg bg-slate-50 p-3 text-xs">
                {JSON.stringify(detail.changes, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
