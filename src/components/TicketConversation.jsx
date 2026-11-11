import { useEffect, useRef, useState } from "react";
import { apiUpload } from "@/lib/api";
import {
  MAX_ATTACHMENTS,
  MAX_REPLY,
  clock,
  fitFiles,
  isOwnMessage,
  validateReply,
} from "@/lib/supportTickets";

// Pieces shared by the owner's ticket page (Help Center) and the staff inbox (platform admin):
// the screenshot picker, the list of messages, and the reply box.

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2";
const LIGHT_BTN = `rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[13px] font-medium text-[#111827] transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60 ${FOCUS}`;
const DARK_BTN = `rounded-full bg-[#111827] px-6 py-2.5 text-[14px] font-semibold text-white transition hover:bg-black disabled:opacity-60 ${FOCUS}`;

// Up to 3 screenshots. `items` are the uploaded pictures ({ id, url, name }); the parent keeps them and sends
// their ids with the message. Each file is checked (type, size) by apiUpload and again by the server.
// `actions` (buttons) and `aside` (e.g. a counter, pushed to the right) share one row with "Attach image".
export function ImageAttach({
  items,
  onChange,
  uploadUrl,
  disabled = false,
  actions = null,
  aside = null,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef(null);

  const pick = async (event) => {
    const { accepted, skipped } = fitFiles(event.target.files, items.length);
    event.target.value = ""; // the same file can be chosen again later
    setError(skipped ? `You can attach up to ${MAX_ATTACHMENTS} images.` : "");
    if (!accepted.length) return;

    setBusy(true);
    let next = items;
    for (const file of accepted) {
      const res = await apiUpload(uploadUrl, "image", file);
      if (!res.ok) {
        setError(res.error);
        break;
      }
      next = [...next, { id: res.data.id, url: res.data.url, name: res.data.name }];
      onChange(next);
    }
    setBusy(false);
  };

  const remove = (id) => {
    setError("");
    onChange(items.filter((item) => item.id !== id));
  };

  const hint = (
    <span className="text-[12px] text-slate-500">
      JPG, PNG or WEBP, up to 1MB each, {MAX_ATTACHMENTS} at most
    </span>
  );
  const inRow = Boolean(actions || aside);

  return (
    <div>
      {items.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-3">
          {items.map((item) => (
            <li key={item.id} className="relative">
              <img
                src={item.url}
                alt={item.name || "Screenshot"}
                className="h-16 w-16 rounded-lg border border-slate-200 object-cover"
              />
              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label={`Remove ${item.name || "image"}`}
                className={`absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#111827] text-[12px] leading-none text-white ${FOCUS}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          hidden
          onChange={pick}
          aria-label="Attach images"
        />
        <button
          type="button"
          disabled={disabled || busy || items.length >= MAX_ATTACHMENTS}
          onClick={() => input.current?.click()}
          className={LIGHT_BTN}
        >
          {busy ? "Uploading..." : "Attach image"}
        </button>
        {actions}
        {inRow ? null : hint}
        {aside && <div className="ml-auto">{aside}</div>}
      </div>
      {inRow && <p className="mt-2">{hint}</p>}
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

// The conversation, oldest first. The member's own messages are on the right; `staff` flips that for the staff
// inbox, where the member's messages are the ones coming in on the left.
export function Thread({ messages, staff = false }) {
  const end = useRef(null);
  const seen = useRef(null);
  const count = messages.length;

  // Scroll to the newest message when one is added (not on the first render, not on every refresh)
  useEffect(() => {
    if (seen.current !== null && count > seen.current) {
      end.current?.scrollIntoView?.({ block: "end", behavior: "smooth" });
    }
    seen.current = count;
  }, [count]);

  return (
    <ol className="space-y-4" aria-label="Conversation">
      {messages.map((message) => {
        const mine = staff ? !isOwnMessage(message) : isOwnMessage(message);
        const note = staff && message.isInternal === true; // an internal note: staff only
        // Member view: "You" / "Support team". Staff inbox: "You" for staff, the member's name for the other side.
        const sender = mine ? "You" : staff ? message.senderName : "Support team";
        return (
          <li key={message.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-6 text-slate-900 ${
                note
                  ? "border border-dashed border-amber-300 bg-amber-50"
                  : mine
                    ? "bg-slate-100"
                    : "border border-slate-200 bg-white"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{String(message.body ?? "").trim()}</p>
              {message.attachments?.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {message.attachments.map((url) => (
                    <li key={url}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block rounded-lg ${FOCUS}`}
                      >
                        <img
                          src={url}
                          alt="Screenshot"
                          className="h-24 w-24 rounded-lg border border-slate-200 object-cover"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="mt-1 px-1 text-[12px] text-slate-500">
              {note ? `Internal note, staff only · ${message.senderName}` : sender} ·{" "}
              {clock(message.createdAt)}
            </p>
          </li>
        );
      })}
      <li ref={end} aria-hidden="true" />
    </ol>
  );
}

// Reply box with the screenshot picker. `onSend({ message, attachments })` returns { ok, error? }. On success the
// box is cleared; on failure what was typed stays.
export function ReplyBox({ onSend, uploadUrl, disabled = false, children }) {
  const [text, setText] = useState("");
  const [images, setImages] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    const problem = validateReply(text);
    setError(problem);
    if (problem || sending) return;
    setSending(true);
    const result = await onSend({ message: text, attachments: images.map((image) => image.id) });
    setSending(false);
    if (result?.ok) {
      setText("");
      setImages([]);
    } else {
      setError(result?.error || "Something went wrong. Please try again.");
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <label htmlFor="ticket-reply" className="sr-only">
        Your reply
      </label>
      <textarea
        id="ticket-reply"
        rows={3}
        value={text}
        disabled={disabled}
        placeholder="Write your reply"
        onChange={(e) => setText(e.target.value)}
        aria-invalid={Boolean(error)}
        className={`w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-[15px] leading-6 text-[#111827] placeholder:text-slate-400 focus:border-slate-500 ${FOCUS}`}
      />
      <p role="alert" className="text-[13px] text-red-700 empty:hidden">
        {error}
      </p>
      <ImageAttach
        items={images}
        onChange={setImages}
        uploadUrl={uploadUrl}
        disabled={disabled}
        actions={
          <>
            <button type="submit" disabled={disabled || sending} className={DARK_BTN}>
              {sending ? "Sending..." : "Send"}
            </button>
            {children}
          </>
        }
        aside={
          <p
            className={`text-[13px] ${text.length > MAX_REPLY ? "text-red-700" : "text-slate-500"}`}
          >
            {text.length}/{MAX_REPLY}
          </p>
        }
      />
    </form>
  );
}
