import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
import { apiDownload, apiGet, apiPost } from "@/lib/api";
import { useCan } from "@/lib/auth";

// SVG Illustration for Empty State
function GiftCardsIllustration({ className = "h-36 w-44" }) {
  return (
    <svg
      viewBox="0 0 200 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <filter id="gc-shadow" x="25" y="30" width="150" height="95" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#14130F" floodOpacity="0.1" />
        </filter>
        <linearGradient
          id="card-grad"
          x1="35"
          y1="40"
          x2="165"
          y2="115"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1E1D19" />
          <stop offset="1" stopColor="#3A3832" />
        </linearGradient>
        <linearGradient id="ribbon-grad" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#E0B86B" />
          <stop offset="1" stopColor="#C49A48" />
        </linearGradient>
      </defs>

      {/* Ambient background circle */}
      <circle cx="100" cy="75" r="60" fill="#F3F1EC" />

      {/* Main Gift Card */}
      <g filter="url(#gc-shadow)">
        <rect
          x="35"
          y="42"
          width="130"
          height="76"
          rx="8"
          fill="url(#card-grad)"
          stroke="#4A4740"
          strokeWidth="1"
        />
        {/* Ribbon Horizontal */}
        <rect x="35" y="68" width="130" height="12" fill="url(#ribbon-grad)" opacity="0.9" />
        {/* Ribbon Vertical */}
        <rect x="86" y="42" width="12" height="76" fill="url(#ribbon-grad)" opacity="0.9" />
        {/* Ribbon Bow */}
        <path d="M86 68 C80 58, 66 60, 72 74 C78 78, 86 74, 86 74 Z" fill="#F0CD87" />
        <path d="M98 68 C104 58, 118 60, 112 74 C106 78, 98 74, 98 74 Z" fill="#F0CD87" />
        <circle cx="92" cy="74" r="3.5" fill="#C49A48" />

        {/* Card Chip & Details */}
        <rect x="47" y="52" width="12" height="9" rx="1.5" fill="#E0B86B" opacity="0.8" />
        {/* Masked numbers */}
        <circle cx="50" cy="98" r="1.5" fill="#A8A49C" />
        <circle cx="56" cy="98" r="1.5" fill="#A8A49C" />
        <circle cx="62" cy="98" r="1.5" fill="#A8A49C" />
        <circle cx="68" cy="98" r="1.5" fill="#A8A49C" />

        <circle cx="78" cy="98" r="1.5" fill="#A8A49C" />
        <circle cx="84" cy="98" r="1.5" fill="#A8A49C" />
        <circle cx="90" cy="98" r="1.5" fill="#A8A49C" />
        <circle cx="96" cy="98" r="1.5" fill="#A8A49C" />

        <circle cx="106" cy="98" r="1.5" fill="#A8A49C" />
        <circle cx="112" cy="98" r="1.5" fill="#A8A49C" />
        <circle cx="118" cy="98" r="1.5" fill="#A8A49C" />
        <circle cx="124" cy="98" r="1.5" fill="#A8A49C" />

        <text x="135" y="101" fill="#FFFFFF" fontSize="8" fontFamily="monospace" fontWeight="600">
          8492
        </text>
      </g>
    </svg>
  );
}

const inputClass =
  "h-9 rounded-lg border border-[#D4D0C5] bg-white px-3 text-xs sm:text-sm text-charcoal-navy outline-none focus:border-charcoal-navy focus:ring-1 focus:ring-charcoal-navy";

const STATUS_BADGE = {
  active: "bg-[#E3F5EC] border-[#B7EBD0] text-[#008060]",
  disabled: "bg-[#F3F1EC] border-[#E7E4DC] text-[#5A5750]",
};

function StatusBadge({ status }) {
  const cls = STATUS_BADGE[status] || STATUS_BADGE.disabled;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status === "active" ? "Active" : "Deactivated"}
    </span>
  );
}

function money(amount, currency) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount));
  } catch {
    return `${currency} ${amount}`;
  }
}

function CreateGiftCardModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ initial_balance: "", currency_code: "", customer: "", note: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [issuedCode, setIssuedCode] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const payload = {
      initial_balance: form.initial_balance,
      note: form.note || undefined,
      currency_code: form.currency_code || undefined,
      customer: form.customer || undefined,
    };
    const res = await apiPost("/api/v1/gift-cards/", payload);
    setSaving(false);
    if (!res.ok) {
      setErrors(res.fieldErrors || {});
      return;
    }
    setIssuedCode(res.data.code);
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        {issuedCode ? (
          <div>
            <h2 className="text-base font-semibold text-charcoal-navy mb-2">Gift card issued</h2>
            <p className="text-sm text-[#5A5750] mb-3">
              This code is shown once. Copy it now -- it can't be shown again, only resent by email.
            </p>
            <div className="mb-4 rounded-lg border border-[#E7E4DC] bg-[#FAF9F6] px-3 py-2 font-mono text-sm tracking-wide">
              {issuedCode}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg bg-charcoal-navy px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#1A1916]"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h2 className="text-base font-semibold text-charcoal-navy mb-4">Create gift card</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#78746A]">Value</label>
                <input
                  className={`${inputClass} w-full`}
                  value={form.initial_balance}
                  onChange={(e) => setForm({ ...form, initial_balance: e.target.value })}
                  placeholder="50.00"
                  required
                />
                {errors.initial_balance && (
                  <p className="mt-1 text-xs text-red-600">{errors.initial_balance}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#78746A]">
                  Currency (ISO 4217, defaults to this store's gift card currency)
                </label>
                <input
                  className={`${inputClass} w-full`}
                  value={form.currency_code}
                  onChange={(e) => setForm({ ...form, currency_code: e.target.value.toUpperCase() })}
                  placeholder="AUD"
                  maxLength={3}
                />
                {errors.currency_code && (
                  <p className="mt-1 text-xs text-red-600">{errors.currency_code}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#78746A]">Customer id (optional)</label>
                <input
                  className={`${inputClass} w-full`}
                  value={form.customer}
                  onChange={(e) => setForm({ ...form, customer: e.target.value })}
                  placeholder="Leave blank to issue unassigned"
                />
                {errors.customer && <p className="mt-1 text-xs text-red-600">{errors.customer}</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#78746A]">Note (optional)</label>
                <input
                  className={`${inputClass} w-full`}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Why this card was issued"
                />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-[#D4D0C5] bg-white px-3.5 py-2 text-sm font-semibold text-charcoal-navy hover:bg-[#FAF9F6]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-charcoal-navy px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#1A1916] disabled:opacity-60"
              >
                {saving ? "Issuing..." : "Issue gift card"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function GiftCardDetailModal({ card, onClose, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const resend = async () => {
    setBusy(true);
    setNotice("");
    const res = await apiPost(`/api/v1/gift-cards/${card.id}/resend/`, {});
    setBusy(false);
    setNotice(res.ok ? `Resent to ${res.data.sent_to}.` : res.formError || "Couldn't resend.");
  };

  const deactivate = async () => {
    if (!window.confirm("Deactivate this gift card? This cannot be undone.")) return;
    setBusy(true);
    const res = await apiPost(`/api/v1/gift-cards/${card.id}/deactivate/`, {});
    setBusy(false);
    if (res.ok) {
      setNotice("Deactivated.");
      onChanged();
    } else {
      setNotice(res.formError || "Couldn't deactivate.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-charcoal-navy">Gift card &bull;&bull;&bull;&bull;{card.code_last4}</h2>
          <StatusBadge status={card.status} />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-[#78746A]">Current balance</div>
            <div className="font-semibold text-charcoal-navy">{money(card.current_balance, card.currency_code)}</div>
          </div>
          <div>
            <div className="text-xs text-[#78746A]">Initial value</div>
            <div className="font-semibold text-charcoal-navy">{money(card.initial_balance, card.currency_code)}</div>
          </div>
          <div>
            <div className="text-xs text-[#78746A]">Expiry</div>
            <div className="text-charcoal-navy">{card.expires_at ? new Date(card.expires_at).toLocaleDateString() : "Never expires"}</div>
          </div>
          <div>
            <div className="text-xs text-[#78746A]">Issued</div>
            <div className="text-charcoal-navy">{new Date(card.created_at).toLocaleDateString()}</div>
          </div>
        </div>

        <h3 className="mb-2 text-sm font-semibold text-charcoal-navy">Activity history</h3>
        <div className="mb-4 max-h-56 overflow-y-auto rounded-lg border border-[#E7E4DC]">
          <table className="w-full text-xs">
            <thead className="bg-[#FAF9F6] text-[#78746A]">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-left font-medium">Order</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2 text-right font-medium">Balance after</th>
              </tr>
            </thead>
            <tbody>
              {(card.transactions || []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-[#A8A49C]">
                    No activity yet
                  </td>
                </tr>
              )}
              {(card.transactions || []).map((t) => (
                <tr key={t.id} className="border-t border-[#E7E4DC]">
                  <td className="px-3 py-2">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td className="px-3 py-2 capitalize">{t.transaction_type}</td>
                  <td className="px-3 py-2">{t.order ? t.order.slice(0, 8) : "—"}</td>
                  <td className="px-3 py-2 text-right">{money(t.amount, card.currency_code)}</td>
                  <td className="px-3 py-2 text-right">{money(t.balance_after, card.currency_code)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {notice && <p className="mb-3 text-xs text-[#5A5750]">{notice}</p>}

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#D4D0C5] bg-white px-3.5 py-2 text-sm font-semibold text-charcoal-navy hover:bg-[#FAF9F6]"
          >
            Close
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={resend}
              className="rounded-lg border border-[#D4D0C5] bg-white px-3.5 py-2 text-sm font-semibold text-charcoal-navy hover:bg-[#FAF9F6] disabled:opacity-60"
            >
              Resend code
            </button>
            {card.status === "active" && (
              <button
                type="button"
                disabled={busy}
                onClick={deactivate}
                className="rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                Deactivate
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminGiftCards() {
  const navigate = useNavigate();
  const canManage = useCan("gift_cards.manage");

  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("created_desc");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);

  const ordering = { created_desc: "-created_at", created_asc: "created_at", balance_desc: "-current_balance", balance_asc: "current_balance" }[sort];

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (status !== "all") params.set("status", status);
    params.set("ordering", ordering);
    const res = await apiGet(`/api/v1/gift-cards/?${params}`);
    if (res.ok && Array.isArray(res.data?.results || res.data)) {
      setCards(res.data?.results || res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load();
    }, 250); // debounce search
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, ordering]);

  const pageCount = Math.max(Math.ceil(cards.length / pageSize), 1);
  const pageRows = useMemo(
    () => cards.slice((page - 1) * pageSize, page * pageSize),
    [cards, page, pageSize]
  );

  const exportCsv = async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (status !== "all") params.set("status", status);
    params.set("ordering", ordering);
    const res = await apiDownload(`/api/v1/gift-cards/export/?${params}`);
    if (!res.ok) return;
    const url = URL.createObjectURL(res.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gift-cards.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white text-charcoal-navy">
      <AdminHeader />

      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        <AdminSidebar />

        <main className="min-w-0 flex-1 bg-[#F3F1EC] px-4 sm:px-8 py-6 max-w-full overflow-x-hidden">
          {/* Page Title & Action Buttons Header */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h1 className="flex items-center gap-2.5 text-[20px] sm:text-[22px] font-bold text-charcoal-navy">
              <PageIcon name="gift_cards" />
              Gift cards
            </h1>

            {/* Header Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => navigate("/admin/online-store/products/new")}
                className="rounded-lg border border-[#D4D0C5] bg-white px-3 py-1.5 text-xs sm:text-sm font-semibold text-charcoal-navy hover:bg-[#FAF9F6] transition shadow-2xs cursor-pointer"
              >
                Add gift card product
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin/online-store/products")}
                className="rounded-lg border border-[#D4D0C5] bg-white px-3 py-1.5 text-xs sm:text-sm font-semibold text-charcoal-navy hover:bg-[#FAF9F6] transition shadow-2xs cursor-pointer"
              >
                View gift card products
              </button>
              <button
                type="button"
                onClick={exportCsv}
                className="flex items-center gap-1.5 rounded-lg border border-[#D4D0C5] bg-white px-3 py-1.5 text-xs sm:text-sm font-semibold text-charcoal-navy hover:bg-[#FAF9F6] transition shadow-2xs cursor-pointer"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export
              </button>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-charcoal-navy px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-2xs hover:bg-[#1A1916] transition cursor-pointer"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Create gift card
                </button>
              )}
            </div>
          </div>

          {/* Table Container Card */}
          <div className="rounded-2xl border border-[#E7E4DC] bg-white shadow-xs overflow-hidden">
            {/* Search and Filters Toolbar */}
            <div className="p-3.5 sm:p-4 border-b border-[#E7E4DC] flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78746A]"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by code ending or customer"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[#D4D0C5] bg-white pl-9 pr-3 text-xs sm:text-sm text-charcoal-navy outline-none placeholder:text-[#A8A49C] focus:border-charcoal-navy focus:ring-1 focus:ring-charcoal-navy"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <label htmlFor="status-filter" className="text-xs text-[#78746A] font-medium hidden sm:inline">
                    Status:
                  </label>
                  <select
                    id="status-filter"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={`${inputClass} cursor-pointer`}
                  >
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="disabled">Deactivated</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <label htmlFor="sort-by" className="text-xs text-[#78746A] font-medium hidden sm:inline">
                    Sort:
                  </label>
                  <select
                    id="sort-by"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className={`${inputClass} cursor-pointer`}
                  >
                    <option value="created_desc">Date (newest first)</option>
                    <option value="created_asc">Date (oldest first)</option>
                    <option value="balance_desc">Balance (high to low)</option>
                    <option value="balance_asc">Balance (low to high)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Status Badges Showcase Bar */}
            <div className="px-4 py-2 bg-[#FAF9F6] border-b border-[#E7E4DC] flex flex-wrap items-center justify-between text-xs text-[#78746A] gap-2">
              <span className="font-medium">{loading ? "Loading..." : `${cards.length} gift card${cards.length === 1 ? "" : "s"}`}</span>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E3F5EC] border border-[#B7EBD0] px-2.5 py-0.5 text-xs font-medium text-[#008060]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#008060]" />
                  Active
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F1EC] border border-[#E7E4DC] px-2.5 py-0.5 text-xs font-medium text-[#5A5750]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#78746A]" />
                  Deactivated
                </span>
              </div>
            </div>

            {/* Gift Cards Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#E7E4DC] bg-[#FAF9F6] text-[#78746A]">
                    <th className="px-4 py-3 font-semibold">Code ending</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Currency</th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                    <th className="px-4 py-3 font-semibold text-right">Current / Initial Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 sm:p-16 text-center">
                        <div className="mx-auto flex max-w-md flex-col items-center justify-center">
                          <GiftCardsIllustration className="h-32 w-44 sm:h-36 sm:w-48 mb-4" />
                          <h2 className="text-base sm:text-lg font-semibold text-charcoal-navy mb-1.5">
                            No gift cards {search || status !== "all" ? "match these filters" : "issued yet"}
                          </h2>
                          <p className="text-xs sm:text-sm text-[#78746A] max-w-sm leading-relaxed mb-5">
                            Issue a gift card directly to a customer or start selling digital gift
                            card products in your store.
                          </p>
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => setShowCreate(true)}
                              className="inline-flex items-center justify-center rounded-lg bg-charcoal-navy px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#1A1916] transition shadow-xs cursor-pointer"
                            >
                              Create gift card
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  {pageRows.map((card) => (
                    <tr
                      key={card.id}
                      onClick={() => setSelected(card)}
                      className="border-b border-[#E7E4DC] last:border-0 hover:bg-[#FAF9F6] cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono">&bull;&bull;&bull;&bull;{card.code_last4}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={card.status} />
                      </td>
                      <td className="px-4 py-3">{card.customer || "—"}</td>
                      <td className="px-4 py-3">{card.currency_code}</td>
                      <td className="px-4 py-3">{new Date(card.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        {money(card.current_balance, card.currency_code)} / {money(card.initial_balance, card.currency_code)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-wrap items-center justify-between border-t border-[#E7E4DC] px-4 py-3 text-xs sm:text-sm text-[#78746A] gap-3">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-8 rounded-lg border border-[#D4D0C5] bg-white px-2 text-xs text-charcoal-navy outline-none focus:border-charcoal-navy cursor-pointer"
                >
                  {[10, 25, 50, 100].map((sz) => (
                    <option key={sz} value={sz}>
                      {sz}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span>
                  {cards.length === 0
                    ? "0–0 of 0"
                    : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, cards.length)} of ${cards.length}`}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    aria-label="Previous page"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D4D0C5] bg-white text-charcoal-navy disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    disabled={page >= pageCount}
                    onClick={() => setPage((p) => p + 1)}
                    aria-label="Next page"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D4D0C5] bg-white text-charcoal-navy disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {showCreate && (
        <CreateGiftCardModal onClose={() => setShowCreate(false)} onCreated={load} />
      )}
      {selected && (
        <GiftCardDetailModal
          card={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            load();
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}
