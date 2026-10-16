import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const DISCOUNT_TYPES = [
  {
    id: "amount-off-products",
    title: "Amount off products",
    description: "Discount specific products or collections of products",
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
        <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "buy-x-get-y",
    title: "Buy X get Y",
    description: "Discount products based on a customer's purchase",
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="8" width="18" height="4" rx="1" />
        <path d="M12 8v13" />
        <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
        <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 4.8 0 0 1 12 8a4.8 4.8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
      </svg>
    ),
  },
  {
    id: "amount-off-order",
    title: "Amount off order",
    description: "Discount the total order amount",
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
        <path d="M12 6v12" />
      </svg>
    ),
  },
  {
    id: "free-shipping",
    title: "Free shipping",
    description: "Offer free shipping on an order",
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
        <path d="M15 18H9" />
        <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
        <circle cx="17" cy="18" r="2" />
        <circle cx="7" cy="18" r="2" />
      </svg>
    ),
  },
];

export default function SelectDiscountTypeModal({ isOpen, onClose }) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
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
        className="w-full max-w-[560px] rounded-2xl bg-white shadow-2xl transition-all overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="select-discount-type-title"
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-[#E1E3E5] px-6 py-4">
          <h2 id="select-discount-type-title" className="text-[17px] font-semibold text-[#202223]">
            Select discount type
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1 text-[#5C5F62] hover:bg-[#F1F2F3] hover:text-[#202223] transition-colors focus:outline-none"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* MODAL CONTENT: 4 DISCOUNT TYPE OPTIONS */}
        <div className="p-4 space-y-2.5">
          {DISCOUNT_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => handleSelect(type.id)}
              className="group flex w-full items-center justify-between rounded-xl border border-slate-200/80 p-4 text-left transition hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0B1020]/10"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition group-hover:bg-[#0B1020] group-hover:text-white">
                  {type.icon}
                </div>
                <div>
                  <div className="text-[15px] font-semibold text-[#0B1020] transition">
                    {type.title}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">{type.description}</div>
                </div>
              </div>

              <div className="flex items-center pl-3 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-end border-t border-[#E1E3E5] bg-[#FAFBFB] px-6 py-3.5">
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
