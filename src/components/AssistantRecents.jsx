import { useEffect, useRef } from "react";
import { chatTitle, useChatStore } from "@/lib/assistantChatStore";

// "Just now", "5 min ago", "3 h ago", "Yesterday", "4 days ago", then the date
export function formatWhen(timestamp, now = Date.now()) {
  const minutes = Math.floor(Math.max(0, now - timestamp) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { day: "numeric", month: "short" });
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

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827]";

// The "Recents" pill and the list under it. Controlled: the panel owns `open`, so its Escape key can close the
// list first and the panel second. `onOpened()` runs after a chat is opened (the panel puts the cursor in the input).
export default function AssistantRecents({ store, open, onOpenChange, onOpened }) {
  const { recents, pending } = useChatStore(store);
  const rootRef = useRef(null);

  // A click anywhere else closes the list
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) onOpenChange(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onOpenChange]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className={`inline-flex h-8 items-center gap-2 rounded px-1 text-[13px] font-medium transition-colors hover:text-[#6D28D9] ${
          open ? "text-[#6D28D9]" : "text-[#111827]"
        } ${focusRing}`}
      >
        <svg {...icon} className="h-4 w-4">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        Recents
      </button>

      {open && (
        <div
          role="region"
          aria-label="Recent chats"
          className="absolute left-0 top-10 z-10 w-72 max-w-[calc(100vw-24px)] rounded-lg border border-[#E4DEFB] bg-white py-1 shadow-[0_4px_16px_rgba(76,29,149,0.08)]"
        >
          {recents.length === 0 ? (
            <p className="px-3 py-4 text-center text-[12px] text-[#9CA3AF]">No previous chats</p>
          ) : (
            <>
              <ul className="max-h-72 overflow-y-auto">
                {recents.map((chat) => {
                  const title = chatTitle(chat);
                  return (
                    <li
                      key={chat.id}
                      className="group flex items-center gap-1 pr-1.5 hover:bg-[#F7F8FA]"
                    >
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          if (store.openChat(chat.id)) {
                            onOpenChange(false);
                            onOpened?.();
                          }
                        }}
                        className={`min-w-0 flex-1 px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
                      >
                        <span className="block truncate text-[13px] text-[#111827]">{title}</span>
                        <span className="block text-[11px] text-[#9CA3AF]">
                          {formatWhen(chat.savedAt)}
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete chat: ${title}`}
                        title="Delete"
                        onClick={() => store.deleteChat(chat.id)}
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#9CA3AF] transition-colors hover:bg-[#E5E7EB] hover:text-[#111827] ${focusRing}`}
                      >
                        <svg {...icon} className="h-3.5 w-3.5">
                          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3" />
                        </svg>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="border-t border-[#EEF0F3] px-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => store.clearRecents()}
                  className={`w-full rounded px-2 py-1.5 text-left text-[12px] text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#111827] ${focusRing}`}
                >
                  Clear all
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
