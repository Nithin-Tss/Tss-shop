import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ReplyBox, Thread } from "@/components/TicketConversation";
import { apiGet, apiPost } from "@/lib/api";
import { TICKETS_PATH } from "@/lib/helpCenter";
import { sendErrorMessage } from "@/lib/supportRequest";
import {
  ATTACHMENTS_API,
  STATUS_HELP,
  TICKETS_API,
  buildReplyPayload,
  splitDetails,
  usePoll,
} from "@/lib/supportTickets";
import { StatusChip } from "@/pages/AdminHelpTickets";

// /admin/help/tickets/:id: one conversation. It asks the server for new messages every 5 seconds while the page is
// open (and the tab is visible), and stops when the page is left. AdminHelp gives it key={ticketId}, so a new
// ticket starts with a clean state.

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2";

export default function AdminHelpTicket({ ticketId }) {
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState("");
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const loaded = useRef(false);

  const load = useCallback(async () => {
    const res = await apiGet(`${TICKETS_API}${ticketId}/`);
    if (!alive.current) return;
    if (res.ok) {
      loaded.current = true;
      setTicket(res.data);
      setError("");
    } else if (!loaded.current) {
      // A refresh that fails (a dropped connection) keeps what is on screen; only the first load shows the error
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
      `${TICKETS_API}${ticketId}/messages/`,
      buildReplyPayload({ message, attachments })
    );
    if (!result.ok) return { ok: false, error: sendErrorMessage(result) };
    if (alive.current) setTicket(result.data);
    return { ok: true };
  };

  // The store details block of the first message is shown in its own card; the bubble keeps the problem text
  const { messages, details } = useMemo(() => {
    const list = ticket?.messages || [];
    const first = list[0];
    if (!first || first.senderType !== "owner") return { messages: list, details: null };
    const split = splitDetails(first.body);
    if (!split.details) return { messages: list, details: null };
    return { messages: [{ ...first, body: split.text }, ...list.slice(1)], details: split.details };
  }, [ticket]);

  return (
    <section className="mx-auto w-full max-w-[720px] px-5 pt-12 sm:px-8 sm:pt-20">
      <nav aria-label="Breadcrumb" className="text-[13px] text-slate-500">
        <Link
          to="/admin/help"
          className={`rounded-md hover:text-[#111827] hover:underline ${FOCUS}`}
        >
          Help
        </Link>{" "}
        <span aria-hidden="true">&gt;</span>{" "}
        <Link
          to={TICKETS_PATH}
          className={`rounded-md hover:text-[#111827] hover:underline ${FOCUS}`}
        >
          My tickets
        </Link>{" "}
        <span aria-hidden="true">&gt;</span> <span className="text-slate-700">Ticket</span>
      </nav>

      {error && (
        <p role="alert" className="mt-10 text-[14px] text-red-700">
          {error}
        </p>
      )}
      {!ticket && !error && <p className="mt-10 text-[15px] text-slate-600">Loading...</p>}

      {ticket && (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="min-w-0 break-words text-[26px] font-semibold leading-tight tracking-[-0.02em] text-[#111827] sm:text-[32px]">
              {ticket.subject}
            </h1>
            <StatusChip
              status={ticket.status}
              label={ticket.status === "pending" ? "Waiting for you" : undefined}
            />
            {/* The chip already says it for "Waiting for you" and "Closed"; only "Open" needs the line */}
            {ticket.status === "open" && (
              <span className="text-[14px] text-slate-600">{STATUS_HELP.open}</span>
            )}
          </div>

          {details && (
            <details className="group mt-5 rounded-2xl border border-slate-200 bg-white">
              <summary
                className={`flex cursor-pointer list-none items-center justify-between rounded-2xl px-4 py-3 text-[14px] font-medium text-[#111827] [&::-webkit-details-marker]:hidden ${FOCUS}`}
              >
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
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 border-t border-slate-200 px-4 py-3 text-[14px]">
                {details.map((item) => (
                  <Fragment key={item.label}>
                    <dt className="text-slate-500">{item.label}</dt>
                    <dd className="break-words text-slate-900">{item.value}</dd>
                  </Fragment>
                ))}
              </dl>
            </details>
          )}

          <div className="mt-8">
            <Thread messages={messages} />
          </div>

          <div className="mt-10 border-t border-slate-200 pt-8">
            {ticket.status === "closed" && (
              <p className="mb-4 text-[14px] text-slate-600">
                This ticket is closed. Send a message to reopen it.
              </p>
            )}
            <ReplyBox onSend={send} uploadUrl={ATTACHMENTS_API} />
          </div>
        </>
      )}
    </section>
  );
}
