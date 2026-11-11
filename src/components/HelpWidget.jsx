import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AssistantMarkdown from "@/components/AssistantMarkdown";
import {
  ChatComposer,
  ChatError,
  ChatThinking,
  chatFocusRing,
  useScrollToEnd,
} from "@/components/ChatParts";
import { apiGet, apiPost } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { useFlag } from "@/lib/featureFlags";
import {
  ESCALATED_NOTICE,
  HELP_FLAG,
  loadConversation,
  sendHelpMessage,
  talkToAHuman,
} from "@/lib/helpAssistantApi";
import { ticketPath } from "@/lib/helpCenter";
import { onOpenHelpChat } from "@/lib/helpChat";
import { sendErrorMessage } from "@/lib/supportRequest";
import { TICKETS_API, buildReplyPayload, usePoll, validateReply } from "@/lib/supportTickets";

/*
 * The floating Help chat. Shown across the admin to any signed-in member while the help_assistant feature flag is on
 * for the store (the backend refuses everything else). It answers from the help articles and can raise a support
 * ticket; "Talk to a human" is always visible and creates one without involving the model.
 *
 * The conversation id is kept in sessionStorage (per store), because every admin page mounts its own widget; the chat
 * is read back from the server when a page opens.
 */

const EXAMPLES = ["How do I connect a custom domain?", "How do I set up shipping rates?"];

export function useHelpAssistantAccess() {
  const flagOn = useFlag(HELP_FLAG);
  const session = useSession();
  return flagOn && Boolean(session?.token);
}

const storageKey = (storeId) => `tss-help-chat:${storeId || "none"}`;

function readSaved(storeId) {
  try {
    return window.sessionStorage.getItem(storageKey(storeId)) || null;
  } catch {
    return null;
  }
}

function writeSaved(storeId, id) {
  try {
    if (id) window.sessionStorage.setItem(storageKey(storeId), id);
    else window.sessionStorage.removeItem(storageKey(storeId));
  } catch {
    // storage unavailable: the chat just starts again on the next page
  }
}

export default function HelpWidget() {
  const access = useHelpAssistantAccess();
  return access ? <Widget /> : null;
}

export function Widget({
  send = sendHelpMessage,
  escalate = talkToAHuman,
  load = loadConversation,
}) {
  const session = useSession();
  const storeId = session?.storeId;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // { role: "user" | "assistant", text, sources? }
  const [conversationId, setConversationId] = useState(() => readSaved(storeId));
  const [ticket, setTicket] = useState(null);
  const [escalated, setEscalated] = useState(false);
  const [ticketMessages, setTicketMessages] = useState([]); // the live conversation with support, once escalated
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const restored = useRef(false);
  // The assistant gets the first go: "Talk to a human" appears once it has answered (or something went wrong)
  const triedAssistant = messages.some((m) => m.role === "assistant");
  const endRef = useScrollToEnd([messages, busy, open]);

  // "Contact support" buttons elsewhere open this chat first
  useEffect(() => onOpenHelpChat(() => setOpen(true)), []);

  // Opening the widget on a new page: bring back the chat in progress
  useEffect(() => {
    if (!open || restored.current || !conversationId || messages.length) return;
    restored.current = true;
    let alive = true;
    load(conversationId).then((res) => {
      if (!alive) return;
      if (!res.ok) {
        writeSaved(storeId, null);
        setConversationId(null);
        return;
      }
      setMessages(res.messages);
      setTicket(res.ticket);
      setEscalated(res.escalated);
    });
    return () => {
      alive = false;
    };
  }, [open, conversationId, messages.length, load, storeId]);

  // After "Talk to a human" the chat continues here: new support replies are polled from the ticket
  const ticketId = escalated ? ticket?.id : null;
  const loadTicket = useCallback(async () => {
    if (!ticketId) return;
    const res = await apiGet(`${TICKETS_API}${ticketId}/`);
    if (res.ok && Array.isArray(res.data?.messages)) {
      // the first message is the summary made from this chat, which is already on screen
      setTicketMessages(res.data.messages.slice(1));
    }
  }, [ticketId]);

  // Fetch once when the chat opens; the poll below only fires on its interval
  useEffect(() => {
    if (!open || !ticketId) return undefined;
    let alive = true;
    apiGet(`${TICKETS_API}${ticketId}/`).then((res) => {
      if (alive && res.ok && Array.isArray(res.data?.messages)) {
        setTicketMessages(res.data.messages.slice(1));
      }
    });
    return () => {
      alive = false;
    };
  }, [open, ticketId]);

  usePoll(loadTicket, undefined, open && Boolean(ticketId));

  async function sendToSupport(message) {
    const problem = validateReply(message);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setBusy(true);
    const res = await apiPost(
      `${TICKETS_API}${ticketId}/messages/`,
      buildReplyPayload({ message })
    );
    setBusy(false);
    if (!res.ok) {
      setError(sendErrorMessage(res));
      return;
    }
    setDraft("");
    if (Array.isArray(res.data?.messages)) setTicketMessages(res.data.messages.slice(1));
  }

  const remember = useCallback(
    (id) => {
      if (!id) return;
      setConversationId(id);
      writeSaved(storeId, id);
    },
    [storeId]
  );

  async function submit(text) {
    const message = text.trim();
    if (!message || busy) return;
    if (escalated) {
      if (ticketId) await sendToSupport(message);
      return;
    }
    setError("");
    setDraft("");
    setMessages((m) => [...m, { role: "user", text: message }]);
    setBusy(true);
    const res = await send(message, conversationId);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    remember(res.conversationId);
    setMessages((m) => [...m, { role: "assistant", text: res.reply, sources: res.sources }]);
    if (res.ticket) setTicket(res.ticket);
    if (res.escalated) setEscalated(true);
  }

  async function humanPlease() {
    if (busy) return;
    setError("");
    setBusy(true);
    const lastQuestion =
      [...messages].reverse().find((m) => m.role === "user")?.text || draft.trim();
    const res = await escalate(conversationId, conversationId ? "" : lastQuestion);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    remember(res.conversationId);
    setTicket(res.ticket);
    setEscalated(true);
    setDraft("");
    const number = res.ticket?.ticketNumber;
    setMessages((m) => [
      ...m,
      {
        role: "assistant",
        text: `${res.created ? "I've raised" : "You already have"} ticket ${number || ""}. ${ESCALATED_NOTICE}`.replace(
          "  ",
          " "
        ),
      },
    ]);
  }

  function startNewChat() {
    if (busy) return;
    writeSaved(storeId, null);
    restored.current = true;
    setConversationId(null);
    setMessages([]);
    setTicket(null);
    setEscalated(false);
    setTicketMessages([]);
    setError("");
  }

  return (
    <>
      <button
        type="button"
        aria-label="Help"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-5 right-5 z-40 flex h-12 items-center gap-2 rounded-full bg-orange-600 px-5 text-sm font-semibold text-white shadow-lg hover:bg-orange-600/90 ${chatFocusRing}`}
      >
        <ChatIcon className="h-5 w-5" />
        Help
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-3 backdrop-blur-[2px] sm:items-center sm:p-6">
          <button
            type="button"
            aria-label="Dismiss help"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default"
          />
          <aside
            aria-label="Help assistant"
            className="relative flex h-[min(820px,calc(100vh-3rem))] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_80px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/10"
          >
            <header className="flex items-center justify-between gap-3 bg-[#111827] px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-600">
                  <ChatIcon className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold leading-tight">Support assistant</h2>
                  <p className="flex items-center gap-1.5 text-sm text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
                    Online · replies instantly
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={startNewChat}
                    className="rounded-full border border-white/25 px-4 py-1.5 text-sm font-medium text-white hover:bg-white/10"
                  >
                    New chat
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Close help"
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-white hover:bg-white/10"
                >
                  ✕
                </button>
              </div>
            </header>

            <div
              className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-6 py-6"
              aria-live="polite"
            >
              <Bubble role="assistant">
                Hi{session?.name ? ` ${String(session.name).split(" ")[0]}` : ""}! I can answer
                questions about running your store. If I can't solve it, you can talk to a person at
                any time.
              </Bubble>

              {messages.length === 0 && (
                <div className="space-y-2 pl-11">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Try asking
                  </p>
                  {EXAMPLES.map((example) => (
                    <button
                      key={example}
                      type="button"
                      disabled={busy}
                      onClick={() => submit(example)}
                      className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-[15px] text-ink shadow-sm transition hover:border-orange-600 hover:shadow disabled:opacity-50"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((m, i) => (
                <Bubble key={i} role={m.role} text={m.text}>
                  {m.sources?.length > 0 && (
                    <div className="mt-3 border-t border-slate-200 pt-2 text-sm">
                      <p className="font-medium text-slate-600">Related articles</p>
                      <ul className="mt-1 space-y-0.5">
                        {m.sources.map((source) => (
                          <li key={source.slug}>
                            <Link
                              to={source.url}
                              onClick={() => setOpen(false)}
                              className="text-orange-700 underline"
                            >
                              {source.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Bubble>
              ))}

              {ticketMessages.map((m) => (
                <Bubble
                  key={m.id}
                  role={m.senderType === "owner" ? "user" : "assistant"}
                  text={m.body}
                />
              ))}

              {busy && !escalated && <ChatThinking />}
              <ChatError>{error}</ChatError>
              {escalated && (
                <div
                  role="status"
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
                >
                  <p className="font-medium">{ESCALATED_NOTICE}</p>
                  {ticket && (
                    <p className="mt-0.5">
                      Ticket {ticket.ticketNumber}.{" "}
                      <Link to={ticketPath(ticket.id)} className="underline">
                        View it in My support tickets
                      </Link>
                    </p>
                  )}
                </div>
              )}
              <div ref={endRef} />
            </div>

            {!escalated && (triedAssistant || error) && (
              <>
                {/* Always visible, also while the assistant is answering or after a ticket exists */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">Prefer a real person?</p>
                    <p className="text-xs text-slate-500">
                      We'll pass on this chat so you don't repeat yourself.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={humanPlease}
                    disabled={busy}
                    className="rounded-full bg-orange-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600/90 disabled:opacity-50"
                  >
                    Talk to a human
                  </button>
                </div>
              </>
            )}

            <ChatComposer
              id="help-assistant-message"
              value={draft}
              onChange={setDraft}
              onSubmit={submit}
              busy={busy}
              disabled={escalated && !ticketId}
              label={escalated ? "Message to support" : "Your question"}
              placeholder={escalated ? "Write to our support team…" : "Type your question…"}
            />
          </aside>
        </div>
      )}
    </>
  );
}

function ChatIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
    </svg>
  );
}

function Bubble({ role, text, children }) {
  const mine = role === "user";
  return (
    <div className={`flex items-end gap-2.5 ${mine ? "justify-end" : ""}`}>
      {!mine && (
        <span className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-600 text-white">
          <ChatIcon className="h-4 w-4" />
        </span>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-sm ${
          mine
            ? "whitespace-pre-wrap rounded-br-sm bg-[#111827] text-white"
            : "rounded-bl-sm border border-slate-200 bg-white text-ink"
        }`}
      >
        {mine ? text : text ? <AssistantMarkdown text={text} /> : null}
        {children}
      </div>
    </div>
  );
}
