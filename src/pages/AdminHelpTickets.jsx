import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "@/lib/api";
import { CONTACT_PATH, ticketPath } from "@/lib/helpCenter";
import { STATUS_HELP, STATUS_TONE, TICKETS_API, statusLabel, when } from "@/lib/supportTickets";

// /admin/help/tickets ("My support tickets"): the signed-in member's own support tickets in this store, newest activity first.

const PAGE = 20;
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2";
const DARK_BTN = `rounded-full bg-[#111827] px-6 py-2.5 text-[14px] font-semibold text-white transition hover:bg-black ${FOCUS}`;
const LIGHT_BTN = `rounded-full border border-slate-200 bg-white px-5 py-2 text-[14px] font-medium text-[#111827] transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60 ${FOCUS}`;
export function StatusChip({ status, label }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${STATUS_TONE[status] || STATUS_TONE.closed}`}
    >
      {label || statusLabel(status)}
    </span>
  );
}

export default function AdminHelpTickets() {
  const [offset, setOffset] = useState(0);
  const [state, setState] = useState({ loading: true, error: "", count: 0, results: [] });

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await apiGet(`${TICKETS_API}?limit=${PAGE}&offset=${offset}`);
      if (!alive) return;
      setState(
        res.ok
          ? { loading: false, error: "", count: res.data.count, results: res.data.results }
          : { loading: false, error: res.error, count: 0, results: [] }
      );
    })();
    return () => {
      alive = false;
    };
  }, [offset]);

  const { loading, error, count, results } = state;

  return (
    <section className="mx-auto w-full max-w-[720px] px-5 pt-12 sm:px-8 sm:pt-20">
      <nav aria-label="Breadcrumb" className="text-[13px] text-slate-500">
        <Link
          to="/admin/help"
          className={`rounded-md hover:text-[#111827] hover:underline ${FOCUS}`}
        >
          Help
        </Link>{" "}
        <span aria-hidden="true">&gt;</span> <span className="text-slate-700">My tickets</span>
      </nav>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.02em] text-[#111827] sm:text-[44px]">
          My tickets
        </h1>
        <Link to={CONTACT_PATH} className={DARK_BTN}>
          New ticket
        </Link>
      </div>

      {loading && <p className="mt-10 text-[15px] text-slate-600">Loading...</p>}
      {error && (
        <p role="alert" className="mt-10 text-[14px] text-red-700">
          {error}
        </p>
      )}
      {!loading && !error && count === 0 && (
        <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6">
          <p className="text-[15px] font-semibold text-[#111827]">No tickets yet</p>
          <p className="mt-1 text-[14px] text-slate-600">
            When you contact support, the conversation will be here.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <ul className="mt-10 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {results.map((ticket) => (
            <li key={ticket.id}>
              <Link
                to={ticketPath(ticket.id)}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4 transition hover:bg-slate-50 ${FOCUS}`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold text-[#111827]">
                    {ticket.subject}
                  </span>
                  <span className="mt-0.5 block text-[12px] font-medium text-slate-500">
                    {ticket.ticketNumber}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-slate-500">
                    {STATUS_HELP[ticket.status]} · Updated {when(ticket.updatedAt)}
                  </span>
                </span>
                <StatusChip status={ticket.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {count > PAGE && (
        <div className="mt-6 flex items-center justify-between text-[13px] text-slate-500">
          <span>
            {offset + 1}-{Math.min(offset + PAGE, count)} of {count}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={offset === 0}
              onClick={() => setOffset(offset - PAGE)}
              className={LIGHT_BTN}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={offset + PAGE >= count}
              onClick={() => setOffset(offset + PAGE)}
              className={LIGHT_BTN}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
