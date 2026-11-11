import { apiGet, apiPost } from "@/lib/api";

// The help assistant (Tss-backend/apps/helpdesk/help_views.py): the signed-in member's own chat in the active store.
const BASE = "/api/v1/help-assistant";

export const HELP_FLAG = "help_assistant";
export const ESCALATED_NOTICE = "A support agent will reply here.";

const failure = (res, fallback) => {
  if (res.status === 429) {
    return {
      ok: false,
      error: "You've sent a lot of requests. Please wait a while and try again.",
    };
  }
  if (res.status === 403) {
    return { ok: false, error: "The help assistant isn't available for your account or store." };
  }
  return { ok: false, error: res.data?.detail || res.formError || res.error || fallback };
};

// Only what the widget shows, as text
export function cleanSources(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s) => s && typeof s.slug === "string")
    .map((s) => ({ slug: s.slug, title: String(s.title ?? s.slug), url: articlePath(s.slug) }));
}

export const articlePath = (slug) => `/admin/help/articles/${encodeURIComponent(slug)}`;

export function cleanTicket(raw) {
  if (!raw || typeof raw.id !== "string") return null;
  return {
    id: raw.id,
    ticketNumber: String(raw.ticketNumber ?? ""),
    subject: String(raw.subject ?? ""),
    status: String(raw.status ?? "open"),
  };
}

// -> { ok: true, reply, conversationId, sources, ticket, escalated } or { ok: false, error }
export async function sendHelpMessage(message, conversationId) {
  const body = conversationId ? { message, conversation_id: conversationId } : { message };
  const res = await apiPost(`${BASE}/chat/`, body);
  if (!res.ok) return failure(res, "Something went wrong. Please try again.");
  return {
    ok: true,
    reply: String(res.data?.reply ?? ""),
    conversationId: res.data?.conversation_id ?? null,
    sources: cleanSources(res.data?.sources),
    ticket: cleanTicket(res.data?.ticket),
    escalated: Boolean(res.data?.escalated),
  };
}

// "Talk to a human". `conversationId` may be null before the first message. -> { ok, conversationId, ticket, created }
export async function talkToAHuman(conversationId, note = "") {
  const res = await apiPost(`${BASE}/conversations/${conversationId || "new"}/escalate/`, {
    message: note,
  });
  if (!res.ok) return failure(res, "Couldn't reach support. Please try again.");
  return {
    ok: true,
    conversationId: res.data?.conversation_id ?? conversationId ?? null,
    ticket: cleanTicket(res.data?.ticket),
    created: Boolean(res.data?.created),
  };
}

// Restore a chat after a reload -> { ok, messages: [{role, content}], ticket, escalated } or { ok: false }
export async function loadConversation(conversationId) {
  const res = await apiGet(`${BASE}/conversations/${encodeURIComponent(conversationId)}/`);
  if (!res.ok) return { ok: false, error: res.error };
  return {
    ok: true,
    messages: (res.data?.messages || []).map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      text: String(m.content ?? ""),
    })),
    ticket: cleanTicket(res.data?.ticket),
    escalated: Boolean(res.data?.escalated),
  };
}

export async function getHelpArticle(slug) {
  const res = await apiGet(`${BASE}/articles/${encodeURIComponent(slug)}/`);
  return res.ok ? { ok: true, article: res.data } : { ok: false, error: res.error };
}

// The article's markdown for the safe renderer, which has no headings: "## Title" lines become bold lines, and the
// first line is dropped when it only repeats the page title.
export function articleToMarkdown(body, title = "") {
  const lines = String(body ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  const heading = (line) => /^\s{0,3}#{1,6}\s+(.*)$/.exec(line);
  const first = lines.findIndex((l) => l.trim());
  if (first >= 0) {
    const h = heading(lines[first]);
    if (h && h[1].trim().toLowerCase() === String(title).trim().toLowerCase())
      lines.splice(first, 1);
  }
  return lines
    .map((line) => (heading(line) ? `**${heading(line)[1].trim()}**` : line))
    .join("\n")
    .trim();
}
