import { useState } from "react";
import {
  ChatBubble,
  ChatComposer,
  ChatError,
  ChatThinking,
  chatFocusRing as focusRing,
  darkButton,
  smallButton,
  useScrollToEnd,
} from "@/components/ChatParts";
import {
  AI_FLAG,
  discardDraft,
  pagesOf,
  previewDraft,
  publishDraft,
  sendAiMessage,
} from "@/lib/aiAssistantApi";
import { useFlag } from "@/lib/featureFlags";
import { useCan } from "@/lib/auth";

export const EXAMPLES = [
  "Create an About Us page with a hero banner and testimonials",
  "Create an FAQ page with 5 common questions",
  "Create a Contact page",
];

// Shown only where the backend allows it: the ai_page_builder flag is on for the store and the member can manage themes
export function useAiPageBuilderAccess() {
  const flagOn = useFlag(AI_FLAG);
  const canManage = useCan("themes.manage");
  return flagOn && canManage;
}

// A button for the customizer's top bar that opens the page builder (a separate panel from the dev-only assistant)
export function AiPageBuilderButton({ tone = "light" }) {
  const access = useAiPageBuilderAccess();
  const [open, setOpen] = useState(false);
  if (!access) return null;
  return (
    <>
      <button
        type="button"
        aria-label="Build pages with AI"
        title="Build pages with AI"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition ${focusRing} ${tone === "dark" ? (open ? "bg-white/20 text-white ring-1 ring-white/40" : "bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/15 hover:ring-white/35") : open ? "bg-charcoal-navy text-white" : "bg-slate-900/[0.06] text-slate-800 hover:bg-slate-900/[0.1]"}`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-4 w-4"
        >
          <rect x="3" y="3" width="18" height="18" rx="2.5" />
          <path d="M3 9h18M9 21V9" />
        </svg>
        <span className="hidden lg:inline">AI pages</span>
      </button>
      {open && <AiPageBuilderPanel onClose={() => setOpen(false)} />}
    </>
  );
}

export default function AiPageBuilderPanel({ onClose, send = sendAiMessage }) {
  const [messages, setMessages] = useState([]); // { role: "user" | "assistant", text, pages? }
  const [conversationId, setConversationId] = useState(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pageState, setPageState] = useState({}); // pageId -> { status: "published" | "discarded", busy, error }
  const [preview, setPreview] = useState(null); // { title, html } | { title, error } | { title, loading }
  const endRef = useScrollToEnd([messages, busy]);

  async function submit(text) {
    const message = text.trim();
    if (!message || busy) return;
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
    setConversationId(res.conversationId);
    setMessages((m) => [...m, { role: "assistant", text: res.reply, pages: pagesOf(res.changes) }]);
  }

  const patch = (pageId, values) =>
    setPageState((s) => ({ ...s, [pageId]: { ...s[pageId], ...values } }));

  async function act(page, action) {
    patch(page.pageId, { busy: true, error: "" });
    const res = await (action === "publish" ? publishDraft : discardDraft)(page.pageId);
    if (!res.ok) {
      patch(page.pageId, { busy: false, error: res.error });
      return;
    }
    patch(page.pageId, {
      busy: false,
      status: action === "publish" ? "published" : "discarded",
    });
  }

  async function showPreview(page) {
    setPreview({ title: page.title, loading: true });
    const res = await previewDraft(page);
    setPreview(
      res.ok ? { title: page.title, html: res.html } : { title: page.title, error: res.error }
    );
  }

  return (
    <aside
      aria-label="AI page builder"
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl"
    >
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Build pages with AI</h2>
          <p className="text-xs text-slate-500">
            Everything is saved as a hidden draft until you publish it.
          </p>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className={`${smallButton} w-8 justify-center px-0`}
        >
          ✕
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-slate-600">Describe the page you want, for example:</p>
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
            <p className="pt-1 text-xs text-slate-500">
              I can build standalone pages (About, FAQ, Contact...). Editing the home, product or
              collection pages isn't supported yet.
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <ChatBubble key={i} role={m.role} text={m.text}>
            {(m.pages || []).map((page) => (
              <PageCard
                key={page.pageId}
                page={page}
                state={pageState[page.pageId] || {}}
                onPreview={() => showPreview(page)}
                onPublish={() => act(page, "publish")}
                onDiscard={() => act(page, "discard")}
              />
            ))}
          </ChatBubble>
        ))}

        {busy && <ChatThinking />}
        <ChatError>{error}</ChatError>
        <div ref={endRef} />
      </div>

      <ChatComposer
        id="ai-page-message"
        label="Your request"
        value={draft}
        onChange={setDraft}
        onSubmit={submit}
        busy={busy}
        placeholder="Create an About Us page with a hero banner…"
      />

      {preview && (
        <div
          role="dialog"
          aria-label={`Preview of ${preview.title}`}
          className="absolute inset-0 z-10 flex flex-col bg-white"
        >
          <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-ink">Draft preview: {preview.title}</h3>
            <button type="button" onClick={() => setPreview(null)} className={smallButton}>
              Close preview
            </button>
          </header>
          {preview.loading && <p className="p-4 text-sm text-slate-500">Loading the preview…</p>}
          {preview.error && (
            <p role="alert" className="p-4 text-sm text-red-700">
              {preview.error}
            </p>
          )}
          {preview.html && (
            // sandbox without allow-scripts: the preview is a picture of the page, nothing in it can run
            <iframe
              title={`Preview of ${preview.title}`}
              sandbox=""
              srcDoc={preview.html}
              className="w-full flex-1"
            />
          )}
        </div>
      )}
    </aside>
  );
}

function PageCard({ page, state, onPreview, onPublish, onDiscard }) {
  const done = state.status;
  return (
    <div className="mt-2 rounded-md border border-slate-300 bg-white p-2 text-[13px]">
      <p className="font-medium">{page.title}</p>
      <ul className="mt-0.5 list-disc pl-4 text-xs text-slate-600">
        {page.summaries.map((summary, i) => (
          <li key={i}>{summary}</li>
        ))}
      </ul>
      {done === "published" && (
        <p className="mt-2 text-xs font-medium text-green-700">Published at /pages/{page.handle}</p>
      )}
      {done === "discarded" && <p className="mt-2 text-xs font-medium text-slate-600">Discarded</p>}
      {!done && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={onPreview} disabled={state.busy} className={smallButton}>
            Preview draft
          </button>
          <button type="button" onClick={onPublish} disabled={state.busy} className={darkButton}>
            Publish
          </button>
          <button type="button" onClick={onDiscard} disabled={state.busy} className={smallButton}>
            Discard
          </button>
        </div>
      )}
      {state.error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {state.error}
        </p>
      )}
    </div>
  );
}
