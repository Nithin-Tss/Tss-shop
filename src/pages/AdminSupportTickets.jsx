import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
import {
  CategoryText,
  PriorityBadge,
  SourceBadge,
  StatusBadge,
  inputClass,
  secondaryButton,
} from "@/components/SupportUi";
import { apiGet } from "@/lib/api";
import { useIsSupportStaff } from "@/lib/auth";
import {
  CATEGORIES,
  PRIORITIES,
  STAFF_TICKETS_API,
  STATUSES,
  buildStaffQuery,
  categoryLabel,
  priorityLabel,
  staffTicketPath,
  statusLabel,
  usePoll,
  when,
} from "@/lib/supportTickets";

/*
 * Support Tickets (staff): every store's tickets. Platform administrators and support agents only; the API
 * (apps/helpdesk/staff_views.py) refuses everyone else. Default view: active tickets, most urgent first.
 */

const PAGE = 25;
export const DEFAULT_FILTERS = {
  status: "active",
  priority: "",
  category: "",
  assigned: "",
  q: "",
};

export function SupportShell({ title, children }) {
  const staff = useIsSupportStaff();
  return (
    <div className="min-h-screen bg-slate-100 text-ink">
      <AdminHeader />
      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        <AdminSidebar />
        <main className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-100 px-4 py-5 sm:px-6">
            <div className="flex items-center gap-2.5">
              <PageIcon name="support" />
              <h1 className="text-xl font-semibold">{title}</h1>
            </div>
          </header>
          {staff ? (
            <div className="space-y-5 p-5">{children}</div>
          ) : (
            <div className="p-5">
              <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Only platform support staff can open this page.{" "}
                <Link to="/admin/online-store/home" className="font-medium underline">
                  Back to admin home
                </Link>
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function AdminSupportTickets() {
  const staff = useIsSupportStaff();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [state, setState] = useState({ loading: true, error: "", count: 0, results: [] });

  // Typing in the search box filters shortly after the last key
  useEffect(() => {
    const id = setTimeout(() => setFilters((f) => (f.q === search ? f : { ...f, q: search })), 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffset(0);
  }, [filters]);

  const load = useCallback(async () => {
    if (!staff) return; // nothing is requested for anyone else (the API would refuse it anyway)
    const res = await apiGet(
      `${STAFF_TICKETS_API}?${buildStaffQuery(filters, { limit: PAGE, offset })}`
    );
    setState(
      res.ok
        ? { loading: false, error: "", count: res.data.count, results: res.data.results }
        : { loading: false, error: res.error, count: 0, results: [] }
    );
  }, [staff, filters, offset]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  usePoll(load, undefined, staff); // new tickets show up without a reload

  const set = (key) => (event) => setFilters((f) => ({ ...f, [key]: event.target.value }));
  const { loading, error, count, results } = state;
  const isDefault = JSON.stringify(filters) === JSON.stringify(DEFAULT_FILTERS);

  return (
    <SupportShell title="Support Tickets">
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 px-5 py-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search store name or ticket number"
            aria-label="Search tickets"
            className={`${inputClass} min-w-0 flex-1`}
          />
          <select
            value={filters.status}
            onChange={set("status")}
            aria-label="Status"
            className={inputClass}
          >
            <option value="active">Active (not resolved)</option>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
          <select
            value={filters.priority}
            onChange={set("priority")}
            aria-label="Priority"
            className={inputClass}
          >
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {priorityLabel(p)}
              </option>
            ))}
          </select>
          <select
            value={filters.category}
            onChange={set("category")}
            aria-label="Category"
            className={inputClass}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </select>
          <select
            value={filters.assigned}
            onChange={set("assigned")}
            aria-label="Assignment"
            className={inputClass}
          >
            <option value="">Anyone</option>
            <option value="me">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
          </select>
          {!isDefault && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilters(DEFAULT_FILTERS);
              }}
              className={secondaryButton}
            >
              Reset
            </button>
          )}
        </div>

        {error && (
          <p role="alert" className="m-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {loading && <p className="px-5 py-4 text-sm text-slate-500">Loading...</p>}
        {!loading && !error && results.length === 0 && (
          <p className="px-5 py-6 text-sm text-slate-500">No tickets match.</p>
        )}

        {results.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {[
                    "Ticket",
                    "Store",
                    "Subject",
                    "Category",
                    "Priority",
                    "Status",
                    "Source",
                    "Assigned to",
                    "Created",
                    "Updated",
                  ].map((h) => (
                    <th key={h} scope="col" className="px-4 py-2.5 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {results.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium">
                      <Link to={staffTicketPath(t.id)} className="text-orange-700 hover:underline">
                        {t.ticketNumber}
                      </Link>
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-2.5">{t.store?.name}</td>
                    <td className="max-w-[260px] truncate px-4 py-2.5">
                      <Link to={staffTicketPath(t.id)} className="hover:underline">
                        {t.subject}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <CategoryText category={t.category} />
                    </td>
                    <td className="px-4 py-2.5">
                      <PriorityBadge priority={t.priority} />
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-2.5">
                      <SourceBadge source={t.source} />
                    </td>
                    <td className="px-4 py-2.5">
                      {t.assignedTo ? (
                        t.assignedTo.name
                      ) : (
                        <span className="text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                      {when(t.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                      {when(t.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {count > PAGE && (
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
        )}
      </section>
    </SupportShell>
  );
}
