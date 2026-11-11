import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChatBubble,
  ChatComposer,
  ChatError,
  ChatThinking,
  chatFocusRing,
  darkButton,
  smallButton,
  useScrollToEnd,
} from "@/components/ChatParts";
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
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const restored = useRef(false);
  const endRef = useScrollToEnd([messages, busy, open]);

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
    if (!message || busy || escalated) return;
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
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-5 w-5"
        >
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
        </svg>
        Help
      </button>

      {open && (
        <aside
          aria-label="Help assistant"
          className="fixed bottom-20 right-5 z-50 flex h-[min(600px,calc(100vh-7rem))] w-[calc(100vw-2.5rem)] max-w-md flex-col rounded-xl border border-slate-200 bg-white shadow-2xl"
        >
          <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">Help</h2>
              <p className="text-xs text-slate-500">
                Ask how something works. Answers come from our help articles.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {messages.length > 0 && !escalated && (
                <button type="button" onClick={startNewChat} className={smallButton}>
                  New chat
                </button>
              )}
              <button
                type="button"
                aria-label="Close help"
                onClick={() => setOpen(false)}
                className={`${smallButton} w-8 justify-center px-0`}
              >
                ✕
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">What can we help you with? For example:</p>
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    disabled={busy}
                    onClick={() => submit(example)}
                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-[13px] text-ink hover:bg-slate-50 disabled:opacity-50"
                  >
                    {example}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <ChatBubble key={i} role={m.role} text={m.text} markdown>
                {m.sources?.length > 0 && (
                  <div className="mt-2 border-t border-slate-200 pt-2 text-xs">
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
              </ChatBubble>
            ))}

            {busy && <ChatThinking />}
            <ChatError>{error}</ChatError>
            {escalated && (
              <div
                role="status"
                className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
              >
                <p className="font-medium">{ESCALATED_NOTICE}</p>
                {ticket && (
                  <p className="mt-0.5 text-xs">
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

          {/* Always visible, also while the assistant is answering or after a ticket exists */}
          <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-3 py-2">
            <p className="text-xs text-slate-500">Not getting anywhere?</p>
            <button type="button" onClick={humanPlease} disabled={busy} className={darkButton}>
              Talk to a human
            </button>
          </div>

          <ChatComposer
            id="help-assistant-message"
            label="Your question"
            value={draft}
            onChange={setDraft}
            onSubmit={submit}
            busy={busy}
            disabled={escalated}
            placeholder={escalated ? "A support agent will reply here" : "Ask a question…"}
          />
        </aside>
      )}
    </>
  );
}
