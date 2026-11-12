import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import AssistantMarkdown from "@/components/AssistantMarkdown";
import Icon from "@/components/Icons";
import { ChatComposer, ChatError, chatFocusRing, useScrollToEnd } from "@/components/ChatParts";
import { apiGet, apiPost } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { useFlag } from "@/lib/featureFlags";
import {
  ESCALATED_NOTICE,
  HELP_FLAG,
  listConversations,
  loadConversation,
  sendHelpMessage,
  talkToAHuman,
} from "@/lib/helpAssistantApi";
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

// The floating button + popup, on every admin page except the Help Center, which is the chat itself
export default function HelpWidget() {
  const access = useHelpAssistantAccess();
  const { pathname } = useLocation();
  if (!access || pathname.replace(/\/+$/, "") === HELP_HOME) return null;
  return <Widget />;
}

export const HELP_HOME = "/admin/help";

// The Help Center page: the same chat, filling the page
export function HelpChatPage() {
  const access = useHelpAssistantAccess();
  return access ? <Widget inline /> : <p className="p-8 text-slate-600">Chat is unavailable.</p>;
}

export function Widget({
  send = sendHelpMessage,
  escalate = talkToAHuman,
  load = loadConversation,
  list = listConversations,
  inline = false,
}) {
  const session = useSession();
  const storeId = session?.storeId;
  const [openState, setOpen] = useState(false);
  const open = inline || openState;
  const [messages, setMessages] = useState([]); // { role: "user" | "assistant", text, sources? }
  const [conversationId, setConversationId] = useState(() => readSaved(storeId));
  const [ticket, setTicket] = useState(null);
  const [escalated, setEscalated] = useState(false);
  const [ticketMessages, setTicketMessages] = useState([]); // the live conversation with support, once escalated
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const restored = useRef(false);
  const [history, setHistory] = useState([]); // earlier chats, shown beside the chat on the Help page
  const refreshHistory = useCallback(() => {
    if (inline) list().then((res) => res.ok && setHistory(res.conversations));
  }, [inline, list]);
  useEffect(refreshHistory, [refreshHistory]);
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
    refreshHistory();
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
    setMessages((m) => [
      ...m,
      {
        role: "assistant",
        text: "I've passed this chat to our team. One of our executives will contact you.",
      },
    ]);
  }

  async function openConversation(id) {
    if (busy || id === conversationId) return;
    setError("");
    setBusy(true);
    const res = await load(id);
    setBusy(false);
    if (!res.ok) {
      setError("Couldn't open that chat.");
      return;
    }
    restored.current = true;
    remember(id);
    setMessages(res.messages);
    setTicket(res.ticket);
    setEscalated(res.escalated);
    setTicketMessages([]);
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

  const firstName = session?.name ? String(session.name).split(" ")[0] : "";
  const card = (
    <aside
      aria-label="Help assistant"
      className={
        inline
          ? "relative flex h-[calc(100vh-9rem)] min-h-[480px] w-full flex-col overflow-hidden rounded-3xl bg-white shadow-[0_1px_2px_rgba(17,24,39,0.04),0_16px_48px_-16px_rgba(17,24,39,0.14)] ring-1 ring-stone-200/80"
          : "relative flex h-[min(820px,calc(100vh-3rem))] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-[0_32px_96px_-24px_rgba(17,24,39,0.45)] ring-1 ring-stone-900/10"
      }
    >
      <header className="flex items-center justify-between gap-3 border-b border-stone-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <Monogram className="h-10 w-10 text-xl" />
          <div>
            <h2 className="text-[15px] font-semibold leading-tight text-ink">Support assistant</h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-stone-500">
              <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Online · replies in seconds
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={startNewChat}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium text-ink ring-1 ring-stone-200 transition hover:bg-stone-50 ${chatFocusRing}`}
            >
              <Icon name="plus" className="h-3.5 w-3.5" />
              New chat
            </button>
          )}
          {!inline && (
            <button
              type="button"
              aria-label="Close help"
              onClick={() => setOpen(false)}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-ink ${chatFocusRing}`}
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-10" aria-live="polite">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          <div className={messages.length === 0 ? "pb-2 pt-6 sm:pt-12" : ""}>
            <p className={`display text-ink ${messages.length === 0 ? "text-4xl" : "text-2xl"}`}>
              {firstName ? `Hi ${firstName}.` : "Hi there."}
            </p>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-stone-500">
              I can answer questions about running your store. If I can't solve it, one of our
              executives will contact you.
            </p>
          </div>

          {messages.length === 0 && (
            <div>
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-400">
                Try asking
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    disabled={busy}
                    onClick={() => submit(example)}
                    className={`group flex items-start justify-between gap-3 rounded-2xl bg-stone-50 px-4 py-3.5 text-left text-[14.5px] leading-snug text-ink ring-1 ring-stone-200/70 transition hover:bg-white hover:ring-stone-300 hover:shadow-sm disabled:opacity-50 ${chatFocusRing}`}
                  >
                    {example}
                    <Icon
                      name="arrow-right"
                      className="mt-0.5 h-4 w-4 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-orange-600"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <Bubble key={i} role={m.role} text={m.text}>
              {m.sources?.length > 0 && (
                <div className="mt-4 border-t border-stone-100 pt-3 text-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-400">
                    Related articles
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {m.sources.map((source) => (
                      <li key={source.slug}>
                        <Link
                          to={source.url}
                          onClick={() => setOpen(false)}
                          className="inline-flex rounded-full bg-stone-100 px-3 py-1 text-[13px] font-medium text-ink transition hover:bg-orange-100"
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

          {busy && !escalated && (
            <div className="flex items-center gap-3" role="status">
              <Monogram className="h-7 w-7 text-sm" />
              <span className="sr-only">Thinking…</span>
              <span className="flex gap-1" aria-hidden="true">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-300"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </span>
            </div>
          )}
          <ChatError>{error}</ChatError>
          {escalated && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-2xl bg-emerald-50/70 px-4 py-3.5 text-sm text-emerald-900 ring-1 ring-emerald-200/70"
            >
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white"
                aria-hidden="true"
              >
                <Icon name="check" className="h-3 w-3" strokeWidth="2.5" />
              </span>
              <p className="font-medium">{ESCALATED_NOTICE}</p>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {!escalated && (triedAssistant || error) && (
        /* Always visible, also while the assistant is answering or after a ticket exists */
        <div className="mx-5 mb-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl bg-stone-50 px-4 py-2.5 ring-1 ring-stone-200/60">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink">Need a person?</p>
            <p className="text-xs text-stone-500">
              An executive will contact you. We'll pass on this chat.
            </p>
          </div>
          <button
            type="button"
            onClick={humanPlease}
            disabled={busy}
            className={`rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-black disabled:opacity-50 ${chatFocusRing}`}
          >
            Talk to a human
          </button>
        </div>
      )}

      <ChatComposer
        variant="soft"
        id="help-assistant-message"
        value={draft}
        onChange={setDraft}
        onSubmit={submit}
        busy={busy}
        disabled={escalated && !ticketId}
        label={escalated ? "Message to support" : "Your question"}
        placeholder={escalated ? "Write to our support team…" : "Ask anything about your store…"}
      />
    </aside>
  );

  if (inline) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row md:gap-8">
        <nav aria-label="Your earlier questions" className="md:w-64 md:shrink-0">
          <h2 className="px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-400">
            Your questions
          </h2>
          {history.length === 0 ? (
            <p className="mt-3 px-3 text-sm text-stone-500">Nothing yet.</p>
          ) : (
            <ul className="mt-3 max-h-40 space-y-0.5 overflow-y-auto md:max-h-[calc(100vh-12rem)]">
              {history.map((c) => {
                const active = c.id === conversationId;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => openConversation(c.id)}
                      aria-current={active ? "true" : undefined}
                      className={`relative block w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${chatFocusRing} ${
                        active ? "bg-stone-100" : "hover:bg-stone-50"
                      }`}
                    >
                      {active && (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-orange-600"
                        />
                      )}
                      <span
                        className={`block truncate text-ink ${active ? "font-semibold" : "font-medium"}`}
                      >
                        {c.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-stone-500">
                        {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : ""}
                        {c.escalated ? " · with our team" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>
        <div className="min-w-0 flex-1">{card}</div>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Help"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-5 right-5 z-40 flex h-12 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white shadow-[0_12px_32px_-8px_rgba(17,24,39,0.55)] transition hover:-translate-y-0.5 hover:bg-black ${chatFocusRing}`}
      >
        <Icon name="chat" className="h-5 w-5" />
        Help
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 p-3 backdrop-blur-sm sm:items-center sm:p-6">
          <button
            type="button"
            aria-label="Dismiss help"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default"
          />
          {card}
        </div>
      )}
    </>
  );
}

function Monogram({ className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`display flex shrink-0 items-center justify-center rounded-xl bg-ink text-white ${className}`}
    >
      S
    </span>
  );
}

function Bubble({ role, text, children }) {
  const mine = role === "user";
  if (mine) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] whitespace-pre-wrap rounded-3xl rounded-br-lg bg-stone-100 px-4 py-2.5 text-[15px] leading-relaxed text-ink">
          {text}
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3">
      <Monogram className="mt-0.5 h-7 w-7 text-sm" />
      <div className="min-w-0 max-w-[88%] pt-0.5 text-[15px] leading-relaxed text-ink">
        {text ? <AssistantMarkdown text={text} /> : null}
        {children}
      </div>
    </div>
  );
}
