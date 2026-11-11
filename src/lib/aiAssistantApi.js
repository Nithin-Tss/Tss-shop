import { apiPost } from "@/lib/api";
import { getThemeSettings, previewTheme } from "@/lib/themeApi";

// The AI page builder: the signed-in member's own store, through the normal API client
// (session token and X-Store-Id header). Everything it builds is a hidden draft page until Publish.
const BASE = "/api/v1/ai-assistant";

export const AI_FLAG = "ai_page_builder";

// -> { ok: true, reply, conversationId, changes } or { ok: false, error }
export async function sendAiMessage(message, conversationId) {
  const body = conversationId ? { message, conversation_id: conversationId } : { message };
  const res = await apiPost(`${BASE}/chat/`, body);
  if (!res.ok) {
    if (res.status === 429) {
      return {
        ok: false,
        error: "You've sent a lot of requests. Please wait a while and try again.",
      };
    }
    if (res.status === 403) {
      return { ok: false, error: "The AI page builder isn't available for your account or store." };
    }
    return {
      ok: false,
      error: res.data?.detail || res.formError || "Something went wrong. Please try again.",
    };
  }
  return {
    ok: true,
    reply: String(res.data?.reply ?? ""),
    conversationId: res.data?.conversation_id ?? null,
    changes: cleanChanges(res.data?.changes),
  };
}

// Only the fields the panel shows are kept, as text
export function cleanChanges(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c) => c && typeof c.page_id === "string")
    .map((c) => ({
      action: String(c.action ?? ""),
      pageId: c.page_id,
      title: String(c.title ?? ""),
      handle: String(c.handle ?? ""),
      template: String(c.template ?? ""),
      summary: String(c.summary ?? ""),
    }));
}

export async function publishDraft(pageId) {
  const res = await apiPost(`${BASE}/drafts/${encodeURIComponent(pageId)}/publish/`, {});
  return res.ok
    ? { ok: true }
    : { ok: false, error: res.data?.detail || res.formError || "Couldn't publish." };
}

export async function discardDraft(pageId) {
  const res = await apiPost(`${BASE}/drafts/${encodeURIComponent(pageId)}/discard/`, {});
  return res.ok
    ? { ok: true }
    : { ok: false, error: res.data?.detail || res.formError || "Couldn't discard." };
}

// The draft page rendered with the theme's own templates -> { ok: true, html } (nothing is saved)
export async function previewDraft({ template, handle }) {
  try {
    const data = await getThemeSettings();
    const out = await previewTheme(data, { page: template || "page", handle });
    return { ok: true, html: String(out?.html ?? "") };
  } catch (error) {
    return { ok: false, error: error?.message || "Couldn't load the preview." };
  }
}

// One entry per page, newest wording first: several edits to a page are one card
export function pagesOf(changes) {
  const byId = new Map();
  for (const change of changes) {
    const known = byId.get(change.pageId);
    byId.set(change.pageId, {
      ...(known || {}),
      ...change,
      summaries: [...(known?.summaries || []), change.summary].filter(Boolean),
    });
  }
  return [...byId.values()];
}
