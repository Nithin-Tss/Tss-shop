import { useEffect, useRef } from "react";
import Icon from "@/components/Icons";

/**
 * Reusable Admin Confirmation Modal
 * Used for confirming destructive or critical actions (e.g., deleting blog posts,
 * products, collections, customers, etc.) with consistent system UI styling.
 */
export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete post?",
  message,
  itemName = "",
  itemType = "Blog post",
  confirmText = "Delete post",
  cancelText = "Cancel",
  isDestructive = true,
  isLoading = false,
}) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    previousActiveElement.current = document.activeElement;

    // Prevent background scrolling while modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (!isLoading) onClose();
        return;
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const timer = setTimeout(() => {
      // Focus cancel button by default to prevent accidental trigger
      const cancelBtn = modalRef.current?.querySelector('button[data-cancel="true"]');
      cancelBtn?.focus();
    }, 50);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      clearTimeout(timer);
      if (
        previousActiveElement.current &&
        typeof previousActiveElement.current.focus === "function"
      ) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      onClick={() => {
        if (!isLoading) onClose();
      }}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-description"
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Icon + Title + Description */}
        <div className="flex items-start gap-3.5">
          {isDestructive ? (
            <div
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-100"
            >
              <Icon name="trash" className="h-5 w-5" />
            </div>
          ) : (
            <div
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#B08D57]/10 text-[#8F6B32] border border-[#B08D57]/20"
            >
              <Icon name="alert" className="h-5 w-5" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h3
              id="confirm-modal-title"
              className="text-base font-bold text-slate-900 leading-snug"
            >
              {title}
            </h3>
            <p
              id="confirm-modal-description"
              className="mt-1 text-xs text-slate-500 leading-relaxed"
            >
              {message || (
                <>
                  Are you sure you want to delete{" "}
                  {itemName ? (
                    <span className="font-semibold text-slate-800">"{itemName}"</span>
                  ) : (
                    `this ${itemType.toLowerCase()}`
                  )}
                  ? This action cannot be undone.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Item preview card */}
        {itemName && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-700">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 block mb-0.5">
              {itemType ? `${itemType} to delete` : "Item"}
            </span>
            <span className="font-semibold text-slate-900 truncate block">{itemName}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            data-cancel="true"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#B08D57]/20"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50 focus:outline-none focus:ring-2 ${
              isDestructive
                ? "bg-[#DC2626] hover:bg-[#B91C1C] focus:ring-[#DC2626]/30"
                : "bg-[#B08D57] hover:bg-[#97733E] focus:ring-[#B08D57]/30"
            }`}
          >
            {isLoading ? (
              <>
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
