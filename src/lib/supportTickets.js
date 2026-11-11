// Logic for Help Center tickets (owner pages and the staff inbox). Pure functions plus one polling hook; the pages
// do the network calls. Server side: Tss-backend/apps/helpdesk.

import { useEffect, useRef } from "react";

export const TICKETS_API = "/api/v1/support/tickets/";
export const ATTACHMENTS_API = "/api/v1/support/attachments/";
export const STAFF_TICKETS_API = "/api/v1/platform/support/tickets/";

export const POLL_MS = 5000; // an open conversation refreshes this often
export const MAX_ATTACHMENTS = 3; // images per message (the server enforces the same limit)
export const MAX_REPLY = 2000;

export const STAFF_SUPPORT_PATH = "/admin/support-tickets";
export const staffTicketPath = (id) => `${STAFF_SUPPORT_PATH}/${id}`;
export const SUPPORT_SUMMARY_API = "/api/v1/platform/support/summary/";
export const SUPPORT_AGENTS_API = "/api/v1/platform/support/agents/";

// Keep in step with Ticket.STATUSES in the backend (apps/helpdesk/models.py)
export const STATUSES = ["open", "in_progress", "waiting_on_customer", "resolved", "closed"];
export const STATUS_LABEL = {
  open: "Open",
  in_progress: "In progress",
  waiting_on_customer: "Waiting on customer",
  resolved: "Resolved",
  closed: "Closed",
};
// What the merchant is told about each status
export const STATUS_HELP = {
  open: "Waiting for our team",
  in_progress: "Our team is working on it",
  waiting_on_customer: "Waiting for your reply",
  resolved: "Resolved",
  closed: "Closed",
};
export const STATUS_TONE = {
  open: "bg-emerald-50 text-emerald-700",
  in_progress: "bg-sky-50 text-sky-700",
  waiting_on_customer: "bg-amber-50 text-amber-700",
  resolved: "bg-slate-100 text-slate-600",
  closed: "bg-slate-100 text-slate-600",
};
// Done: a reply from the merchant reopens it
export const isFinished = (status) => status === "resolved" || status === "closed";

export const PRIORITIES = ["low", "normal", "high", "urgent"];
export const PRIORITY_LABEL = { low: "Low", normal: "Normal", high: "High", urgent: "Urgent" };
export const PRIORITY_TONE = {
  low: "bg-slate-100 text-slate-600",
  normal: "bg-slate-100 text-slate-700",
  high: "bg-amber-50 text-amber-700",
  urgent: "bg-red-50 text-red-700",
};
export const CATEGORIES = ["payments", "shipping", "domains", "themes", "account", "other"];
export const CATEGORY_LABEL = {
  payments: "Payments",
  shipping: "Shipping",
  domains: "Domains",
  themes: "Themes",
  account: "Account",
  other: "Other",
};
export const SOURCE_LABEL = {
  ai_escalation: "AI",
  customer_request: "Customer",
  help_center: "Help Center",
};

export const statusLabel = (status) => STATUS_LABEL[status] || String(status || "");
export const priorityLabel = (value) => PRIORITY_LABEL[value] || String(value || "");
export const categoryLabel = (value) => CATEGORY_LABEL[value] || String(value || "");
export const sourceLabel = (value) => SOURCE_LABEL[value] || String(value || "");

// Query string for the staff list. `filters` = { status, priority, category, assigned, q }. Default view: active
// tickets (open, in progress, waiting), most urgent first (the server sorts).
export function buildStaffQuery(filters = {}, { limit, offset } = {}) {
  const params = new URLSearchParams();
  for (const key of ["status", "priority", "category", "assigned"]) {
    if (filters[key]) params.set(key, filters[key]);
  }
  if (String(filters.q ?? "").trim()) params.set("q", String(filters.q).trim());
  if (limit != null) params.set("limit", limit);
  if (offset != null) params.set("offset", offset);
  return params.toString();
}

// -> "" when the reply can be sent, else the reason it can't
export function validateReply(message) {
  const text = String(message ?? "").trim();
  if (!text) return "Write a message.";
  if (text.length > MAX_REPLY) return `Keep your message under ${MAX_REPLY + 1} characters.`;
  return "";
}

// The JSON body for POST /support/tickets/<id>/messages/ (staff may also send a status)
export function buildReplyPayload({ message, attachments, status }) {
  const payload = { message: String(message ?? "").trim() };
  if (Array.isArray(attachments) && attachments.length) payload.attachments = attachments;
  if (status) payload.status = status;
  return payload;
}

// How many more files can be added, and which of `files` fit (the rest are left out)
export function fitFiles(files, alreadyAttached, max = MAX_ATTACHMENTS) {
  const room = Math.max(max - alreadyAttached, 0);
  const list = Array.from(files || []);
  return { accepted: list.slice(0, room), skipped: Math.max(list.length - room, 0) };
}

// Does the newest message belong to the member (true) or to support (false)?
export const isOwnMessage = (message) => message?.senderType === "owner";

export const when = (value) => (value ? new Date(value).toLocaleString() : "");

// Time for a chat bubble: "2:35 PM" for today, "Nov 10, 2:35 PM" for earlier days (with the year if not this year)
export function clock(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (date.toDateString() === now.toDateString()) return time;
  const day = date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
  return `${day}, ${time}`;
}

// The first message is the problem, then (when the owner agreed) "--- Details ---" with five known lines written by
// the server (helpdesk/services.py build_first_body), then maybe the assistant chat. This takes the details block out.
// -> { text, details: [{ label, value }] | null }. Anything that does not look exactly like that block is left alone
// (details: null, text unchanged), so a message is never cut by mistake.
const DETAILS_MARK = "\n\n--- Details ---\n";
const DETAIL_LABELS = ["Store", "Store ID", "Name", "Email", "Page I came from"];

export function splitDetails(body) {
  const text = String(body ?? "");
  const at = text.indexOf(DETAILS_MARK);
  if (at < 1) return { text, details: null };

  const rest = text.slice(at + DETAILS_MARK.length);
  const end = rest.indexOf("\n\n");
  const block = end === -1 ? rest : rest.slice(0, end);
  const after = end === -1 ? "" : rest.slice(end);

  const details = [];
  for (const line of block.split("\n")) {
    const cut = line.indexOf(": ");
    const label = cut > 0 ? line.slice(0, cut) : "";
    if (!DETAIL_LABELS.includes(label)) return { text, details: null };
    details.push({ label, value: line.slice(cut + 2) });
  }
  return { text: text.slice(0, at) + after, details };
}

// Calls `callback` every `ms` while `enabled` and the tab is visible. A tick is skipped while the previous call is
// still running, so a slow server is never sent overlapping requests. Stops when the component goes away.
// Coming back to the tab refreshes at once.
export function usePoll(callback, ms = POLL_MS, enabled = true) {
  const latest = useRef(callback);
  useEffect(() => {
    latest.current = callback;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    let busy = false;
    const tick = async () => {
      if (busy || (typeof document !== "undefined" && document.hidden)) return;
      busy = true;
      try {
        await latest.current();
      } finally {
        busy = false;
      }
    };
    const id = setInterval(tick, ms);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [ms, enabled]);
}
