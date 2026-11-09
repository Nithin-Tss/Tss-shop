import { useEffect, useRef, useState } from "react";
import AssistantMarkdown from "@/components/AssistantMarkdown";
import { createChatStore, useChatStore } from "@/lib/assistantChatStore";

export const EXAMPLE_QUESTIONS = [
  "How were sales in the last 7 days?",
  "Which products are low on stock?",
  "Show me the latest orders",
];

export const INPUT_HINT =
  "I read text only. Paste the lines you see; screenshots are not supported yet.";

const sparkle = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="h-3.5 w-3.5"
  >
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
    <path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z" />
  </svg>
);

// The empty state's picture: just a violet sparkle, no bubble (inline SVG)
const illustration = (
  <svg
    viewBox="3 2 19 19"
    fill="rgba(24,24,27,0.22)"
    stroke="#111827"
    strokeWidth={1.4}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="h-10 w-10"
  >
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
    <path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z" />
  </svg>
);

const avatar =
  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600";
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2";

// Example questions: fully rounded pills with a soft lavender border
const chip = `inline-flex min-h-9 max-w-full items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-center text-[13px] leading-5 text-ink transition-colors hover:border-[rgba(24,24,27,0.22)] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

// Action buttons ("Open ... in Code editor"): compact, solid and dark, so they read as the thing to click
const actionButton = `inline-flex h-8 items-center gap-1.5 rounded-md bg-ink px-3 text-[12px] font-medium text-white transition-colors hover:bg-[rgba(24,24,27,0.88)] active:bg-black ${focusRing}`;

const arrow = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="h-3.5 w-3.5"
  >
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);

// The round button inside the input bar: Send (up arrow) and, while an answer is pending, Stop (filled square).
// Light violet while the box is empty, a stronger violet when there is something to send.
const roundButton = `flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-700 text-white transition-colors hover:bg-brand-gold-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:hover:bg-slate-200 ${focusRing}`;

const upArrow = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="h-4 w-4"
  >
    <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
  </svg>
);

const stopSquare = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-3.5 w-3.5">
    <rect x="5" y="5" width="14" height="14" rx="2.5" />
  </svg>
);

function Bubble({ message, onAction }) {
  if (message.role === "note") {
    // "Stopped.": a muted line, not a bubble
    return <p className="text-center text-[12px] leading-4 text-slate-400">{message.text}</p>;
  }

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-xl rounded-br-sm bg-orange-600 px-3.5 py-2 text-[13px] leading-5 text-white">
          {message.text}
        </p>
      </div>
    );
  }

  const failed = message.role === "error";
  const tools = [...new Set((message.tools || []).map((tool) => tool.name))];
  return (
    <div className="flex gap-2">
      <span className={avatar}>{sparkle}</span>
      <div className="min-w-0 max-w-[88%]">
        {failed ? (
          // An error is plain text
          <p className="whitespace-pre-wrap rounded-xl rounded-tl-sm border border-red-100 bg-red-50 px-3.5 py-2.5 text-[13px] leading-5 text-red-700">
            {message.text}
          </p>
        ) : (
          // Rendered by a small safe renderer: whatever the model writes is shown as text, never as HTML
          <div className="rounded-xl rounded-tl-sm bg-brand-cream-100 px-3.5 py-2.5 text-[13px] leading-5 text-ink">
            <AssistantMarkdown text={message.text} />
          </div>
        )}
        {message.actions?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.actions.map((action) => (
              <button
                key={action.path}
                type="button"
                onClick={() => onAction?.(action.path)}
                className={actionButton}
              >
                {action.label}
                {arrow}
              </button>
            ))}
          </div>
        )}
        {tools.length > 0 && (
          <p className="mt-2 flex flex-wrap gap-1.5">
            {tools.map((name) => (
              <span
                key={name}
                className="rounded bg-[rgba(24,24,27,0.06)] px-1.5 py-0.5 text-[11px] leading-4 text-slate-500"
              >
                Used {name}
              </span>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}

function Thinking({ seconds }) {
  return (
    <div className="flex items-start gap-2" role="status">
      <span className={avatar}>{sparkle}</span>
      <div className="pt-1 text-[12px] leading-5 text-slate-500">
        <span className="mr-1.5 inline-flex items-center gap-[3px] align-middle" aria-hidden="true">
          {[0, 160, 320].map((delay) => (
            <span
              key={delay}
              style={{ animationDelay: `${delay}ms` }}
              className="h-1 w-1 animate-pulse rounded-full bg-slate-400"
            />
          ))}
        </span>
        Thinking... {seconds}s
        {seconds >= 15 && (
          <span className="mt-0.5 block text-xs text-slate-400">
            The model runs on this computer, so it can take a minute or two.
          </span>
        )}
      </div>
    </div>
  );
}

// Sidekick-style chat. It shows a chat store (lib/assistantChatStore.js): pass `chat` to share one that outlives
// this component (the admin panel), or `ask` to get a private one that ends with the component (tests).
// `onAction(path)` is called when an action button is clicked (the panel navigates there).
export default function AssistantChat({ chat, ask, onAction }) {
  const [ownStore] = useState(() => (chat ? null : createChatStore(ask)));
  const store = chat || ownStore;
  const { messages, pending, startedAt } = useChatStore(store);
  const [input, setInput] = useState("");
  const [seconds, setSeconds] = useState(0);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const stoppedRef = useRef(false);

  // Count the seconds while waiting (from when the question was sent, so a remount keeps the count)
  useEffect(() => {
    if (!pending) return undefined;
    const update = () => setSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    const timer = setInterval(update, 500);
    return () => clearInterval(timer);
  }, [pending, startedAt]);

  // Keep the newest message in view
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, pending]);

  // After Stop the input is enabled again: put the cursor back in it (not after an ordinary answer, so a
  // reply that arrives while the person is doing something else never steals focus)
  useEffect(() => {
    if (!pending && stoppedRef.current) {
      stoppedRef.current = false;
      inputRef.current?.focus();
    }
  }, [pending]);

  // A private chat ends with the component: stop waiting for its answer
  useEffect(() => () => ownStore?.reset(), [ownStore]);

  const send = (text) => {
    if (!text.trim() || pending) return;
    stoppedRef.current = false;
    store.send(text);
    setInput("");
  };

  const stop = () => {
    stoppedRef.current = true;
    store.stop();
  };

  return (
    <section aria-label="Assistant chat" className="flex h-full min-h-[420px] flex-col">
      <div
        ref={listRef}
        aria-live="polite"
        className="flex-1 space-y-3.5 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 && !pending && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            {illustration}
            <h2 className="mt-4 text-[21px] font-semibold leading-7 text-ink">
              Where should we begin?
            </h2>
            {/* Only here, in the empty chat: stacked under the greeting, never next to the input */}
            <div className="mt-5 flex w-full max-w-[300px] flex-col items-center gap-2.5">
              {EXAMPLE_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => send(question)}
                  className={chip}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((message) => (
          <Bubble key={message.id} message={message} onAction={onAction} />
        ))}
        {pending && <Thinking seconds={seconds} />}
      </div>

      <div className="border-t border-slate-100 px-4 py-3">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-4 pr-1 transition-colors focus-within:border-[rgba(24,24,27,0.22)]"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            maxLength={500}
            disabled={pending}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask a question about your store"
            aria-label="Your question"
            className="h-9 min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:text-slate-400"
          />
          {pending ? (
            <button
              type="button"
              aria-label="Stop"
              title="Stop"
              onClick={stop}
              className={roundButton}
            >
              {stopSquare}
            </button>
          ) : (
            <button
              type="submit"
              aria-label="Send"
              title="Send"
              disabled={!input.trim()}
              className={roundButton}
            >
              {upArrow}
            </button>
          )}
        </form>
        <p className="mt-1.5 px-4 text-[11px] leading-4 text-slate-400">{INPUT_HINT}</p>
      </div>
    </section>
  );
}
