import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { ReplyBox, Thread } from "@/components/TicketConversation";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { sendErrorMessage } from "@/lib/supportRequest";
import {
  STAFF_TICKETS_API,
  buildReplyPayload,
  splitDetails,
  statusLabel,
  usePoll,
  when,
} from "@/lib/supportTickets";

/*
 * The "Support" tab of the platform admin page (AdminPlatform.jsx): every store's Help Center tickets.
 * Only platform administrators get past the API (see Tss-backend/apps/helpdesk/staff_views.py). The open ticket
 * refreshes every 5 seconds while the tab is visible.
 */

const PAGE = 25;
const inputClass =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-600";
const secondaryButton =
  "rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60";
const TONE = {
  open: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  closed: "bg-slate-100 text-slate-600",
};

function Chip({ status }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONE[status] || TONE.closed}`}>
      {statusLabel(status)}
    </span>
  );
}

function TicketPanel({ ticketId, onChanged }) {
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState("");
  const [after, setAfter] = useState("pending"); // the status a reply leaves the ticket in
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const loaded = useRef(false);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    const res = await apiGet(`${STAFF_TICKETS_API}${ticketId}/`);
    if (!alive.current) return;
    if (res.ok) {
      loaded.current = true;
      setTicket(res.data);
      setError("");
    } else if (!loaded.current) {
      setError(res.error);
    }
  }, [ticketId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  usePoll(load);

  const send = async ({ message, attachments }) => {
    const result = await apiPost(
      `${STAFF_TICKETS_API}${ticketId}/messages/`,
      buildReplyPayload({ message, attachments, status: after })
    );
    if (!result.ok) return { ok: false, error: sendErrorMessage(result) };
    if (alive.current) setTicket(result.data);
    onChanged();
    return { ok: true };
  };

  const setStatus = async (status) => {
    setBusy(true);
    setError("");
    const result = await apiPatch(`${STAFF_TICKETS_API}${ticketId}/`, { status });
    if (!alive.current) return;
    setBusy(false);
    if (result.ok) {
      setTicket(result.data);
      onChanged();
    } else {
      setError(sendErrorMessage(result));
    }
  };

  if (error && !ticket) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </p>
    );
  }
  if (!ticket) return <p className="px-5 py-4 text-sm text-slate-500">Loading...</p>;

  // Store/requester info goes in one collapsible card; the "--- Details ---" block of the first message is
  // taken out of the bubble (the card shows the same facts)
  const first = ticket.messages[0];
  const split = first && first.senderType === "owner" ? splitDetails(first.body) : { details: null };
  const messages = split.details ? [{ ...first, body: split.text }, ...ticket.messages.slice(1)] : ticket.messages;
  const rows = [
    { label: "Store", value: ticket.store.name },
    { label: "Store ID", value: String(ticket.store.id) },
    ...(ticket.user
      ? [
          ...(ticket.user.name ? [{ label: "Name", value: ticket.user.name }] : []),
          { label: "Email", value: ticket.user.email },
        ]
      : [{ label: "Requester", value: "Former user" }]),
    ...(split.details || []).filter((item) => item.label === "Page I came from"),
  ];

  return (
    <div className="space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="min-w-0 break-words text-lg font-semibold tracking-tight">{ticket.subject}</h3>
          <Chip status={ticket.status} />
        </div>
        <div className="flex items-center gap-2">
          {ticket.status === "closed" ? (
            <button type="button" disabled={busy} onClick={() => setStatus("open")} className={secondaryButton}>
              Reopen
            </button>
          ) : (
            <button type="button" disabled={busy} onClick={() => setStatus("closed")} className={secondaryButton}>
              Close ticket
            </button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <details className="group rounded-2xl border border-slate-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
          Store details
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="h-4 w-4 text-slate-500 transition group-open:rotate-180 motion-reduce:transition-none"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 border-t border-slate-200 px-4 py-3 text-sm">
          {rows.map((item) => (
            <Fragment key={item.label}>
              <dt className="text-slate-500">{item.label}</dt>
              <dd className="break-words text-slate-900">{item.value}</dd>
            </Fragment>
          ))}
        </dl>
      </details>
      <Thread messages={messages} staff />
      <div className="border-t border-slate-200 pt-5">
        <ReplyBox onSend={send} uploadUrl={`${STAFF_TICKETS_API}${ticketId}/attachments/`}>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            After sending, mark as
            <select value={after} onChange={(e) => setAfter(e.target.value)} className={inputClass}>
              <option value="pending">Pending</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </label>
        </ReplyBox>
      </div>
    </div>
  );
}

export default function PlatformSupportInbox() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("open");
  const [offset, setOffset] = useState(0);
  const [openId, setOpenId] = useState("");
  const [state, setState] = useState({ loading: true, error: "", count: 0, results: [] });

  const load = useCallback(async () => {
    const params = new URLSearchParams({ limit: PAGE, offset });
    if (status) params.set("status", status);
    if (q.trim()) params.set("q", q.trim());
    const res = await apiGet(`${STAFF_TICKETS_API}?${params}`);
    setState(
      res.ok
        ? { loading: false, error: "", count: res.data.count, results: res.data.results }
        : { loading: false, error: res.error, count: 0, results: [] }
    );
  }, [q, status, offset]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffset(0);
  }, [q, status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  usePoll(load); // new tickets show up without a reload

  const { loading, error, count, results } = state;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 px-5 py-3">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search subject, store or email"
            aria-label="Search tickets"
            className={`${inputClass} min-w-0 flex-1`}
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
            className={inputClass}
          >
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {error && (
          <p role="alert" className="m-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {loading && <p className="px-5 py-4 text-sm text-slate-500">Loading...</p>}
        {!loading && !error && results.length === 0 && (
          <p className="px-5 py-4 text-sm text-slate-500">No tickets.</p>
        )}

        <ul className="divide-y divide-slate-200">
          {results.map((ticket) => (
            <li key={ticket.id}>
              <button
                type="button"
                onClick={() => setOpenId(ticket.id)}
                aria-current={openId === ticket.id ? "true" : undefined}
                className={`w-full px-5 py-3 text-left hover:bg-slate-50 ${openId === ticket.id ? "bg-slate-50" : ""}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{ticket.subject}</span>
                  <Chip status={ticket.status} />
                </span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">
                  {ticket.store.name} · {ticket.user?.email || "Former user"}
                </span>
                <span className="mt-0.5 block text-xs text-slate-400">
                  {ticket.lastSender === "owner" && ticket.status !== "closed" ? "Waiting for staff · " : ""}
                  {when(ticket.lastMessageAt || ticket.updatedAt)} · {ticket.messageCount} message
                  {ticket.messageCount === 1 ? "" : "s"}
                </span>
              </button>
            </li>
          ))}
        </ul>

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

      <section className="rounded-2xl border border-slate-200 bg-white">
        {openId ? (
          <TicketPanel key={openId} ticketId={openId} onChanged={load} />
        ) : (
          <p className="px-5 py-4 text-sm text-slate-500">Choose a ticket to read and reply.</p>
        )}
      </section>
    </div>
  );
}
