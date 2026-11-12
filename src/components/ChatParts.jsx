import { useEffect, useRef } from "react";
import AssistantMarkdown from "@/components/AssistantMarkdown";
import Icon from "@/components/Icons";

// Small chat pieces shared by the AI page builder panel and the Help widget: a message bubble, the thinking line
// and the message box. Same look in both.

export const chatFocusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2";
export const smallButton = `inline-flex h-8 items-center rounded-md border border-slate-300 bg-white px-3 text-[12px] font-medium text-ink hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${chatFocusRing}`;
export const darkButton = `inline-flex h-8 items-center rounded-md bg-ink px-3 text-[12px] font-medium text-white hover:bg-[rgba(24,24,27,0.88)] disabled:cursor-not-allowed disabled:opacity-50 ${chatFocusRing}`;

// `markdown`: show the text through the safe renderer (bold, lists, code; never HTML or links). Otherwise plain text.
export function ChatBubble({ role, text, markdown = false, children }) {
  const mine = role === "user";
  return (
    <div className={mine ? "flex justify-end" : ""}>
      <div
        className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
          mine ? "whitespace-pre-wrap bg-ink text-white" : "bg-slate-100 text-ink"
        } ${markdown && !mine ? "" : "whitespace-pre-wrap"}`}
      >
        {markdown && !mine ? <AssistantMarkdown text={text} /> : text}
        {children}
      </div>
    </div>
  );
}

export function ChatError({ children }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {children}
    </p>
  );
}

export function ChatThinking() {
  return <p className="text-sm text-slate-500">Thinking…</p>;
}

// Keeps the newest message in view; put the returned ref on an empty element at the end of the list
export function useScrollToEnd(deps) {
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return endRef;
}

export function ChatComposer({
  id,
  value,
  onChange,
  onSubmit,
  busy,
  disabled,
  placeholder,
  label,
  variant = "default",
}) {
  const off = busy || disabled;
  if (variant === "soft") {
    const canSend = !off && Boolean(value.trim());
    return (
      <form
        className="bg-white px-5 pb-5 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(value);
        }}
      >
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <div
          className={`flex items-end gap-2 rounded-2xl border border-stone-200 bg-stone-50/60 p-2 pl-4 transition focus-within:border-stone-400 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(17,24,39,0.05)] ${
            off ? "opacity-70" : ""
          }`}
        >
          <textarea
            id={id}
            rows={1}
            maxLength={2000}
            value={value}
            disabled={off}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit(value);
              }
            }}
            placeholder={placeholder}
            className="max-h-32 min-h-9 flex-1 resize-none bg-transparent py-2 text-[15px] text-ink outline-none placeholder:text-stone-400 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={!canSend}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink text-white transition hover:bg-black disabled:bg-stone-200 disabled:text-stone-400 ${chatFocusRing}`}
          >
            <Icon name="arrow-up" className="h-4 w-4" strokeWidth="2" />
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-stone-400">
          Enter to send · Shift + Enter for a new line
        </p>
      </form>
    );
  }
  return (
    <form
      className="border-t border-slate-200 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value);
      }}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="flex gap-2">
        <textarea
          id={id}
          rows={2}
          maxLength={2000}
          value={value}
          disabled={off}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit(value);
            }
          }}
          placeholder={placeholder}
          className="min-h-10 flex-1 resize-none rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
        />
        <button
          type="submit"
          disabled={off || !value.trim()}
          className={`${darkButton} h-10 self-end`}
        >
          Send
        </button>
      </div>
    </form>
  );
}
