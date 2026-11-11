// Logic for the "Contact support" page (/admin/help/contact). Pure functions, no React, no network.
// The page now creates a ticket (POST /support/tickets/, see supportTickets.js). The mailto: helpers below belong to
// the older email-only form (POST /support/contact/, kept on the server) and are no longer used by the page.

// The server's "support email is not configured" status: the only case that uses the mailto: fallback
export const NOT_CONFIGURED_STATUS = 503;
export const SENT_MESSAGE = "Sent. We will reply to your email.";

export const MAX_SUBJECT = 150;
export const MIN_MESSAGE = 10;
export const MAX_MESSAGE = 2000;
export const MAX_TRANSCRIPT_CHARS = 1500;
export const MAX_TRANSCRIPT_ITEM_CHARS = 500;
// Mail clients and browsers cut very long mailto: links. Above this we open a short one and offer "Copy details".
export const MAX_MAILTO_LENGTH = 1800;
export const EARLIER_LEFT_OUT = "(earlier messages left out)";

// Returns an object of errors by field. Empty object = valid.
export function validateSupport({ subject, message }) {
  const errors = {};
  const s = String(subject ?? "").trim();
  const m = String(message ?? "").trim();
  if (!s) errors.subject = "Enter a subject.";
  else if (s.length > MAX_SUBJECT)
    errors.subject = `Keep the subject under ${MAX_SUBJECT + 1} characters.`;
  if (!m) errors.message = "Describe the problem.";
  else if (m.length < MIN_MESSAGE) errors.message = `Write at least ${MIN_MESSAGE} characters.`;
  else if (m.length > MAX_MESSAGE)
    errors.message = `Keep the description under ${MAX_MESSAGE + 1} characters.`;
  return errors;
}

// The JSON body for POST /support/tickets/ (and the older /support/contact/). Store and user details are not sent:
// the server knows them. `includeStoreDetails` only says the owner agrees to share them in the first message, and
// `attachments` are the ids of screenshots uploaded to /support/attachments/.
export function buildSupportPayload({
  subject,
  message,
  transcript,
  page,
  includeStoreDetails,
  attachments,
}) {
  const payload = { subject: String(subject ?? "").trim(), message: String(message ?? "").trim() };
  if (transcript) payload.transcript = String(transcript);
  if (page) payload.page = String(page);
  if (includeStoreDetails === true) payload.includeStoreDetails = true;
  if (Array.isArray(attachments) && attachments.length) payload.attachments = attachments;
  return payload;
}

// Should a failed send fall back to the mailto: link? Only when the server says support email is not set up.
export const needsMailtoFallback = (result) =>
  Boolean(result) && !result.ok && result.status === NOT_CONFIGURED_STATUS;

// What to show under the form for a failed send: the server's message, else a generic one
export const sendErrorMessage = (result) =>
  result?.formError ||
  Object.values(result?.fieldErrors || {})[0] ||
  "Something went wrong. Please try again.";

// Is there a conversation worth including? (at least one question from the member)
export const hasChat = (messages) =>
  Array.isArray(messages) &&
  messages.some((m) => m?.role === "user" && typeof m.text === "string" && m.text.trim() !== "");

const clip = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

function fit(lines, max) {
  const kept = [];
  let total = 0;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const cost = lines[i].length + (kept.length ? 1 : 0); // +1 for the newline
    if (total + cost > max) {
      // Even the newest line alone may be too long: keep what fits of it
      if (kept.length === 0) kept.unshift(clip(lines[i], max));
      return { text: kept.join("\n"), cut: true };
    }
    kept.unshift(lines[i]);
    total += cost;
  }
  return { text: kept.join("\n"), cut: false };
}

// The conversation as plain text: only what the member and the assistant said. Tool names, buttons,
// errors and notes are left out. Each message and the whole text are capped; the newest turns win.
export function buildTranscript(messages, maxChars = MAX_TRANSCRIPT_CHARS) {
  const lines = (Array.isArray(messages) ? messages : [])
    .filter(
      (m) =>
        (m?.role === "user" || m?.role === "assistant") &&
        typeof m.text === "string" &&
        m.text.trim()
    )
    .map((m) => {
      const text = clip(m.text.replace(/\s+/g, " ").trim(), MAX_TRANSCRIPT_ITEM_CHARS);
      return `${m.role === "user" ? "Me" : "Assistant"}: ${text}`;
    });
  if (lines.length === 0) return "";

  const whole = fit(lines, maxChars);
  if (!whole.cut || lines.length === 1) return whole.text;
  // Something was dropped: say so, and keep the total (marker included) within the cap
  const room = Math.max(maxChars - EARLIER_LEFT_OUT.length - 1, 0);
  const rest = fit(lines, room);
  return rest.text ? `${EARLIER_LEFT_OUT}\n${rest.text}` : EARLIER_LEFT_OUT;
}

function detailsBlock(details) {
  const d = details || {};
  return [
    "--- Details ---",
    `Store: ${d.storeName || "-"}`,
    `Store ID: ${d.storeId || "-"}`,
    `Name: ${d.name || "-"}`,
    `Email: ${d.email || "-"}`,
    `Page I came from: ${d.page || "-"}`,
  ].join("\n");
}

// The full email body: the problem, the details, and the chat when there is one
export function buildSupportBody({ details, message, transcript }) {
  const parts = [String(message ?? "").trim(), detailsBlock(details)];
  if (transcript) parts.push(`--- Chat with the assistant ---\n${transcript}`);
  return parts.join("\n\n");
}

// The short body used when the full one is too long for a mailto: link
export function buildShortBody({ details }) {
  return [
    "Hello, I need help. The full details are copied: please paste them here.",
    detailsBlock(details),
  ].join("\n\n");
}

// { href, tooLong, prefilled }. Only mailto: links can carry a subject and a body; for any other address
// (a web page) the link is returned as it is and nothing is prefilled.
export function buildMailto(supportUrl, subject, body) {
  const base = String(supportUrl || "");
  if (!/^mailto:/i.test(base)) return { href: base, tooLong: false, prefilled: false };
  const sep = base.includes("?") ? "&" : "?";
  const enc = (value) => encodeURIComponent(String(value ?? "").replace(/\r?\n/g, "\r\n"));
  const href = `${base}${sep}subject=${enc(subject)}&body=${enc(body)}`;
  return { href, tooLong: href.length > MAX_MAILTO_LENGTH, prefilled: true };
}
