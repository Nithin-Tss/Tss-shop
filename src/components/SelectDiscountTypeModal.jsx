import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Tag, Gift, Receipt, Truck, X, ChevronRight } from "lucide-react";

export const DISCOUNT_TYPES = [
  {
    id: "amount-off-products",
    title: "Amount off products",
    description: "Discount specific products or collections of products",
    icon: <Tag className="h-5 w-5" />,
  },
  {
    id: "buy-x-get-y",
    title: "Buy X get Y",
    description: "Discount products based on a customer's purchase",
    icon: <Gift className="h-5 w-5" />,
  },
  {
    id: "amount-off-order",
    title: "Amount off order",
    description: "Discount the total order amount",
    icon: <Receipt className="h-5 w-5" />,
  },
  {
    id: "free-shipping",
    title: "Free shipping",
    description: "Offer free shipping on an order",
    icon: <Truck className="h-5 w-5" />,
  },
];

export default function SelectDiscountTypeModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    previousActiveElement.current = document.activeElement;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
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
      const firstBtn = modalRef.current?.querySelector("button");
      firstBtn?.focus();
    }, 50);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
      if (
        previousActiveElement.current &&
        typeof previousActiveElement.current.focus === "function"
      ) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelect = (typeId) => {
    onClose();
    navigate(`/admin/online-store/discounts/new/${typeId}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[1px] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="w-full max-w-[560px] rounded-2xl bg-white shadow-2xl transition-all overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="select-discount-type-title"
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 id="select-discount-type-title" className="text-[17px] font-semibold text-ink">
            Select discount type
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1 text-slate-600 hover:bg-[rgba(24,24,27,0.06)] hover:text-orange-600 transition-colors focus:outline-none"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* MODAL CONTENT: 4 DISCOUNT TYPE OPTIONS */}
        <div className="p-4 space-y-2.5">
          {DISCOUNT_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => handleSelect(type.id)}
              className="group flex w-full items-center justify-between rounded-xl border border-slate-200/80 p-4 text-left transition hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ink/10"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition group-hover:bg-ink group-hover:text-white">
                  {type.icon}
                </div>
                <div>
                  <div className="text-[15px] font-semibold text-ink transition">{type.title}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{type.description}</div>
                </div>
              </div>

              <div className="flex items-center pl-3 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700">
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </div>
            </button>
          ))}
        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition focus:outline-none"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
