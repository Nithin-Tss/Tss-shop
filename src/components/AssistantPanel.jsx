import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AssistantChat from "@/components/AssistantChat";
import AssistantRecents from "@/components/AssistantRecents";
import { assistantStore, syncAssistantOwner } from "@/lib/assistantApi";
import { useChatStore } from "@/lib/assistantChatStore";
import { can, useSession } from "@/lib/auth";

// The assistant has no permission of its own: each tool checks its own on the server. So it is worth
// showing to anyone who holds at least one of these. Only in `npm run dev`.
const TOOL_PERMISSIONS = ["reports.view", "inventory.view", "orders.view"];

function useAssistantAccess() {
  const session = useSession();
  return (
    import.meta.env.DEV &&
    Boolean(session?.token) &&
    TOOL_PERMISSIONS.some((permission) => can(session, permission))
  );
}

// From this window width the open panel pushes the page (it shrinks to the width that is left); below it the
// panel overlays the page with a dimming backdrop. 1280 = Tailwind's xl, which the backdrop's `xl:hidden` follows.
// The page content can't see the squeeze through Tailwind breakpoints, so narrower windows would look cramped.
export const PUSH_MIN_WIDTH = 1280;

// Asks the page to make room: index.css pads <body> by the panel's width while html has data-assistant-push.
// Every page that has the assistant mounts one panel, so this needs no change in the pages themselves.
function useReserveSpace(open) {
  const [wide, setWide] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= PUSH_MIN_WIDTH
  );
  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= PUSH_MIN_WIDTH);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const push = open && wide;
  // A layout effect, so moving to another page (its own panel) swaps owners before the browser paints
  useLayoutEffect(() => {
    if (!push) return undefined;
    const root = document.documentElement;
    root.dataset.assistantPush = "true";
    return () => {
      delete root.dataset.assistantPush;
    };
  }, [push]);
}

// The conversation is forgotten on sign-out or another store (lib/assistantApi.js watches the session);
// this also checks when a page mounts, in case the session changed without an event
function useFreshChatPerOwner() {
  const session = useSession();
  const owner = session?.token ? `${session.email}:${session.storeId}` : null;
  useEffect(() => {
    syncAssistantOwner();
  }, [owner]);
}

const icon = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

// The button in the admin header (phones) and at the bottom of the sidebar (desktop); tone "light" is for the
// white top bars of the customizer and code editor, which don't render AdminSidebar
export function AssistantButton({ tone = "rail" }) {
  const access = useAssistantAccess();
  const { open } = useChatStore(assistantStore);
  if (!access) return null;

  return (
    <button
      type="button"
      aria-label="Assistant"
      title="Assistant"
      aria-expanded={open}
      onClick={() => assistantStore.toggle()}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${
        tone === "light"
          ? // For the white top bars of the customizer and the code editor
            `text-slate-600 hover:bg-slate-100 hover:text-ink ${open ? "bg-violet-100 text-ink" : ""}`
          : `${
              tone === "rail"
                ? "text-slate-300 hover:bg-white/[0.08] hover:text-white"
                : "text-white hover:bg-white/10"
            } ${open ? "bg-white/10 text-white" : ""}`
      }`}
    >
      <svg {...icon} className="h-5 w-5">
        <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
        <path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z" />
      </svg>
    </button>
  );
}

// Slides in from the right. Always mounted (when allowed), so the chat inside keeps its place.
export function AssistantPanel() {
  const access = useAssistantAccess();
  const state = useChatStore(assistantStore);
  const panelRef = useRef(null);
  const navigate = useNavigate();
  const open = access && state.open;
  const [recentsOpen, setRecentsOpen] = useState(false);
  const recentsOpenRef = useRef(false);
  useEffect(() => {
    recentsOpenRef.current = recentsOpen;
  }, [recentsOpen]);
  useFreshChatPerOwner();
  useReserveSpace(open);

  // The list of Recents never stays open behind a closed panel
  if (!open && recentsOpen) setRecentsOpen(false);

  const focusInput = () => setTimeout(() => panelRef.current?.querySelector("input")?.focus(), 0);

  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement;
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      // The page behind (the customizer steps back on Escape) leaves an Escape that was already used alone
      event.preventDefault();
      // An open list of Recents closes first; the next Escape closes the panel
      if (recentsOpenRef.current) setRecentsOpen(false);
      else assistantStore.setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const focus = setTimeout(() => panelRef.current?.querySelector("input")?.focus(), 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(focus);
      opener?.focus?.(); // back to the button that opened it
    };
  }, [open]);

  if (!access) return null;

  // Same tab. On a phone the panel covers the page, so close it; on wider screens it stays open
  const openPage = (path) => {
    navigate(path);
    if (window.innerWidth < 640) assistantStore.setOpen(false);
  };

  return (
    <>
      {open && (
        <div
          aria-hidden="true"
          onClick={() => assistantStore.setOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 xl:hidden"
        />
      )}
      <aside
        ref={panelRef}
        role="complementary"
        aria-label="Assistant"
        aria-hidden={!open}
        inert={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col sm:w-[400px] bg-[rgba(24,24,27,0.06)] border-l border-slate-100 shadow-[0_0_20px_rgba(24,24,27,0.06)] transition-transform duration-200 ease-out motion-reduce:transition-none ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
          <AssistantRecents
            store={assistantStore}
            open={recentsOpen}
            onOpenChange={setRecentsOpen}
            onOpened={focusInput}
          />
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="New chat"
              title={state.pending ? "Stop the answer first" : "New chat"}
              disabled={state.pending}
              onClick={() => {
                setRecentsOpen(false);
                assistantStore.newChat();
                focusInput();
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <svg {...icon} className="h-4 w-4">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Close assistant"
              onClick={() => assistantStore.setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
            >
              <svg {...icon} className="h-4 w-4">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1">
          <AssistantChat chat={assistantStore} onAction={openPage} />
        </div>
      </aside>
    </>
  );
}
