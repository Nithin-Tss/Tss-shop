import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ReplyBox, Thread } from "@/components/TicketConversation";
import {
  PriorityBadge,
  SourceBadge,
  StatusBadge,
  inputClass,
  secondaryButton,
} from "@/components/SupportUi";
import { SupportShell } from "@/pages/AdminSupportTickets";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { sendErrorMessage } from "@/lib/supportRequest";
import {
  CATEGORIES,
  PRIORITIES,
  STAFF_SUPPORT_PATH,
  STAFF_TICKETS_API,
  STATUSES,
  SUPPORT_AGENTS_API,
  buildReplyPayload,
  categoryLabel,
  priorityLabel,
  statusLabel,
  usePoll,
  when,
} from "@/lib/supportTickets";

/*
 * One ticket, for staff: the AI summary on top, the AI chat transcript, the thread with the merchant (and internal
 * notes, which only staff ever receive from the API), and the controls: assign, status, priority, category.
 * Refreshes every 5 seconds while the tab is visible.
 */

export default function AdminSupportTicket() {
  const { ticketId } = useParams();
  return (
    <SupportShell title="Support Tickets">
      <TicketView key={ticketId} ticketId={ticketId} />
    </SupportShell>
  );
}

export function TicketView({ ticketId }) {
  const me = useSession()?.user?.id;
  const [ticket, setTicket] = useState(null);
  const [agents, setAgents] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("reply"); // "reply" to the merchant | "note" (internal)
  const [after, setAfter] = useState("waiting_on_customer");
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
    apiGet(SUPPORT_AGENTS_API).then((res) => alive.current && res.ok && setAgents(res.data));
  }, [load]);

  usePoll(load);

  const change = async (patch) => {
    setBusy(true);
    setError("");
    const res = await apiPatch(`${STAFF_TICKETS_API}${ticketId}/`, patch);
    if (!alive.current) return;
    setBusy(false);
    if (res.ok) setTicket(res.data);
    else setError(sendErrorMessage(res));
  };

  const send = async ({ message, attachments }) => {
    const body =
      mode === "note"
        ? { message: String(message).trim(), internal: true }
        : buildReplyPayload({ message, attachments, status: after });
    const res = await apiPost(`${STAFF_TICKETS_API}${ticketId}/messages/`, body);
    if (!res.ok) return { ok: false, error: sendErrorMessage(res) };
    if (alive.current) setTicket(res.data);
    return { ok: true };
  };

  if (error && !ticket) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </p>
    );
  }
  if (!ticket) return <p className="text-sm text-slate-500">Loading...</p>;

  const rows = [
    { label: "Store", value: ticket.store?.name },
    { label: "Store ID", value: String(ticket.store?.id ?? "") },
    ...(ticket.user
      ? [
          ...(ticket.user.name ? [{ label: "Name", value: ticket.user.name }] : []),
          { label: "Email", value: ticket.user.email },
        ]
      : [{ label: "Requester", value: "Former user" }]),
    { label: "Created", value: when(ticket.createdAt) },
    ...(ticket.resolvedAt ? [{ label: "Resolved", value: when(ticket.resolvedAt) }] : []),
  ];

  return (
    <div className="space-y-5">
      <Link to={STAFF_SUPPORT_PATH} className="text-sm text-slate-600 hover:underline">
        ← All tickets
      </Link>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-sm font-semibold text-slate-500">{ticket.ticketNumber}</span>
          <h2 className="min-w-0 break-words text-lg font-semibold tracking-tight">
            {ticket.subject}
          </h2>
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <SourceBadge source={ticket.source} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-medium text-slate-500">
            Assigned to
            <select
              aria-label="Assigned to"
              className={`${inputClass} mt-1 w-full`}
              disabled={busy}
              value={ticket.assignedTo?.id || ""}
              onChange={(e) => change({ assignedTo: e.target.value || null })}
            >
              <option value="">Unassigned</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id === me ? `${a.name} (me)` : a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-500">
            Status
            <select
              aria-label="Status"
              className={`${inputClass} mt-1 w-full`}
              disabled={busy}
              value={ticket.status}
              onChange={(e) => change({ status: e.target.value })}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-500">
            Priority
            <select
              aria-label="Priority"
              className={`${inputClass} mt-1 w-full`}
              disabled={busy}
              value={ticket.priority}
              onChange={(e) => change({ priority: e.target.value })}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {priorityLabel(p)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-500">
            Category
            <select
              aria-label="Category"
              className={`${inputClass} mt-1 w-full`}
              disabled={busy}
              value={ticket.category}
              onChange={(e) => change({ category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {me && ticket.assignedTo?.id !== me && (
          <button
            type="button"
            disabled={busy}
            onClick={() => change({ assignedTo: me })}
            className={`${secondaryButton} mt-3`}
          >
            Assign to me
          </button>
        )}
        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </section>

      {ticket.summary && (
        <section
          aria-label="AI summary"
          className="rounded-2xl border border-orange-200 bg-orange-50 p-5"
        >
          <h3 className="text-sm font-semibold text-orange-900">Summary</h3>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-900">
            {ticket.summary}
          </p>
        </section>
      )}

      <details className="group rounded-2xl border border-slate-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl px-5 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
          Store and requester
        </summary>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 border-t border-slate-200 px-5 py-3 text-sm">
          {rows.map((item) => (
            <Fragment key={item.label}>
              <dt className="text-slate-500">{item.label}</dt>
              <dd className="break-words text-slate-900">{item.value}</dd>
            </Fragment>
          ))}
        </dl>
      </details>

      {ticket.transcript?.length > 0 && (
        <details open className="group rounded-2xl border border-slate-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl px-5 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
            AI chat transcript ({ticket.transcript.length} messages)
          </summary>
          <ol
            aria-label="AI chat transcript"
            className="max-h-80 space-y-2 overflow-y-auto border-t border-slate-200 px-5 py-3 text-sm"
          >
            {ticket.transcript.map((turn, i) => (
              <li key={i}>
                <span className="font-medium text-slate-500">
                  {turn.role === "user" ? "Merchant" : "Assistant"}:{" "}
                </span>
                <span className="whitespace-pre-wrap break-words text-slate-900">
                  {turn.content}
                </span>
              </li>
            ))}
          </ol>
        </details>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold">Conversation</h3>
        {ticket.messages.length === 0 ? (
          <p className="text-sm text-slate-500">No messages yet.</p>
        ) : (
          <Thread messages={ticket.messages} staff />
        )}

        <div className="mt-6 border-t border-slate-200 pt-5">
          <div role="tablist" aria-label="Reply type" className="mb-3 flex gap-1">
            {[
              ["reply", "Reply to merchant"],
              ["note", "Internal note"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                onClick={() => setMode(id)}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  mode === id
                    ? "bg-ink font-semibold text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === "note" && (
            <p className="mb-3 text-xs text-amber-800">
              Only support staff can see internal notes. The merchant is not notified.
            </p>
          )}
          <ReplyBox
            key={mode}
            onSend={send}
            uploadUrl={`${STAFF_TICKETS_API}${ticketId}/attachments/`}
            disabled={false}
          >
            {mode === "reply" && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                After sending, mark as
                <select
                  value={after}
                  onChange={(e) => setAfter(e.target.value)}
                  className={inputClass}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {statusLabel(s)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </ReplyBox>
        </div>
      </section>
    </div>
  );
}
