import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AdminSidebar, { AdminHeader } from "@/components/AdminSidebar";
import { apiGet, apiPost } from "@/lib/api";
import { useCan, useSession } from "@/lib/auth";

function formatOrderDateTime(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const month = date.toLocaleDateString("en-US", { month: "long" });
  const day = date.getDate();
  const year = date.getFullYear();
  const time = date
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();

  return `${month} ${day}, ${year} at ${time}`;
}

function formatDateHeader(dateString) {
  if (!dateString) return "Recent";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "Recent";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function formatTimeOnly(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatCurrency(amount, currencyCode = "INR") {
  const num = typeof amount === "number" ? amount : parseFloat(amount || 0);
  if (isNaN(num)) return `${amount || "0.00"} ${currencyCode || ""}`;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode || "INR",
    }).format(num);
  } catch {
    return `${currencyCode || ""} ${num.toFixed(2)}`;
  }
}

export default function AdminOrderDetails() {
  const { id: orderId } = useParams();
  const navigate = useNavigate();
  const session = useSession();
  const storeId = session?.storeId;
  const canManage = useCan("orders.manage");

  const [order, setOrder] = useState(null);
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals & Popups
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [showFulfillModal, setShowFulfillModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showCustomerMenu, setShowCustomerMenu] = useState(false);
  const [showShippingMenu, setShowShippingMenu] = useState(false);

  // Action feedback
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [actionError, setActionError] = useState("");

  // Notes & Tags
  const [notesInput, setNotesInput] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [isEditingTags, setIsEditingTags] = useState(false);

  // Comments & Timeline
  const [commentInput, setCommentInput] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [customComments, setCustomComments] = useState([]);

  // Form inputs for modals
  const [fulfillMethod, setFulfillMethod] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentProvider, setPaymentProvider] = useState("manual");
  const [paymentReference, setPaymentReference] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("Order canceled");

  const moreMenuRef = useRef(null);

  const showToast = (msg) => {
    setActionMsg(msg);
    setActionError("");
    setTimeout(() => setActionMsg(""), 4000);
  };

  const showErrorToast = (err) => {
    setActionError(err);
    setActionMsg("");
    setTimeout(() => setActionError(""), 5000);
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setIsMoreMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Order details
  const fetchOrderDetails = useCallback(
    async (isSilent = false) => {
      if (!orderId) return;
      if (!isSilent) setLoading(true);
      try {
        const [orderRes, ordersListRes] = await Promise.all([
          apiGet(`/api/v1/orders/${orderId}/`),
          apiGet(`/api/v1/orders/`),
        ]);

        if (orderRes.ok && orderRes.data) {
          setOrder(orderRes.data);
          setError(null);

          // Initialize notes and tags
          const savedNotes =
            localStorage.getItem(`vendra_order_notes_${orderId}`) || orderRes.data.notes || "";
          setNotesInput(savedNotes);

          const savedTags = JSON.parse(
            localStorage.getItem(`vendra_order_tags_${orderId}`) || "null"
          );
          if (Array.isArray(savedTags)) {
            setTags(savedTags);
          } else if (Array.isArray(orderRes.data.tags)) {
            setTags(orderRes.data.tags);
          }

          // Initialize custom comments
          const savedComments = JSON.parse(
            localStorage.getItem(`vendra_order_comments_${orderId}`) || "[]"
          );
          setCustomComments(savedComments);

          // Defaults for modals
          const fin = orderRes.data.financial_summary || {};
          setPaymentAmount(fin.balance_due || orderRes.data.total || "");
          setRefundAmount(fin.gross_paid || orderRes.data.total || "");
          setFulfillMethod(orderRes.data.delivery_method || "Standard Delivery");
        } else {
          setError(orderRes.error || "Order not found or access restricted.");
        }

        if (ordersListRes.ok) {
          const list = Array.isArray(ordersListRes.data)
            ? ordersListRes.data
            : ordersListRes.data?.results || [];
          setAllOrders(list);
        }
      } catch {
        setError("Failed to connect to backend service. Please try again.");
      } finally {
        if (!isSilent) setLoading(false);
      }
    },
    [orderId]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrderDetails();
  }, [fetchOrderDetails, storeId]);

  // Next / Previous Order navigation
  const currentIndex = allOrders.findIndex((o) => o.id === orderId);
  const prevOrder = currentIndex > 0 ? allOrders[currentIndex - 1] : null;
  const nextOrder =
    currentIndex >= 0 && currentIndex < allOrders.length - 1 ? allOrders[currentIndex + 1] : null;

  // Actions
  const handleCancelOrder = async () => {
    if (!order) return;
    setActionLoading(true);
    try {
      const res = await apiPost(`/api/v1/orders/${order.id}/cancel/`, {});
      if (res.ok) {
        showToast("Order cancelled successfully.");
        setShowCancelModal(false);
        fetchOrderDetails(true);
      } else {
        showErrorToast(res.error || res.formError || "Failed to cancel order.");
      }
    } catch {
      showErrorToast("Network error cancelling order.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFulfillOrder = async () => {
    if (!order) return;
    setActionLoading(true);
    try {
      const res = await apiPost(`/api/v1/fulfillments/`, {
        order: order.id,
        delivery_method: fulfillMethod || order.delivery_method || "Standard Delivery",
      });
      if (res.ok) {
        showToast("Order marked as fulfilled.");
        setShowFulfillModal(false);
        fetchOrderDetails(true);
      } else {
        showErrorToast(res.error || res.formError || "Failed to fulfill order.");
      }
    } catch {
      showErrorToast("Error creating fulfillment.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCollectPayment = async () => {
    if (!order) return;
    setActionLoading(true);
    try {
      const res = await apiPost(`/api/v1/payments/`, {
        order: order.id,
        amount: parseFloat(paymentAmount) || parseFloat(order.total) || 0.01,
        provider: paymentProvider,
        reference: paymentReference,
      });
      if (res.ok) {
        showToast("Payment recorded successfully.");
        setShowPaymentModal(false);
        fetchOrderDetails(true);
      } else {
        showErrorToast(res.error || res.formError || "Failed to record payment.");
      }
    } catch {
      showErrorToast("Error processing payment.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefundPayment = async () => {
    if (!order) return;
    const paymentsList = order.payments || [];
    const validPayment = paymentsList.find(
      (p) => p.status === "captured" || p.status === "paid" || p.status === "partially_refunded"
    );
    if (!validPayment) {
      showErrorToast("No eligible payment found to refund on this order.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await apiPost(`/api/v1/payments/${validPayment.id}/refund/`, {
        amount: parseFloat(refundAmount) || 0,
        reason: refundReason,
      });
      if (res.ok) {
        showToast("Refund processed successfully.");
        setShowRefundModal(false);
        fetchOrderDetails(true);
      } else {
        showErrorToast(res.error || res.formError || "Failed to process refund.");
      }
    } catch {
      showErrorToast("Error submitting refund.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveNotes = () => {
    if (!order) return;
    localStorage.setItem(`vendra_order_notes_${order.id}`, notesInput);
    setShowNotesModal(false);
    showToast("Notes saved.");
  };

  const handleAddTag = () => {
    if (!tagInput.trim() || !order) return;
    const newTags = Array.from(new Set([...tags, tagInput.trim()]));
    setTags(newTags);
    localStorage.setItem(`vendra_order_tags_${order.id}`, JSON.stringify(newTags));
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove) => {
    if (!order) return;
    const newTags = tags.filter((t) => t !== tagToRemove);
    setTags(newTags);
    localStorage.setItem(`vendra_order_tags_${order.id}`, JSON.stringify(newTags));
  };

  const handlePostComment = () => {
    if (!commentInput.trim() || !order) return;
    setSubmittingComment(true);
    const staffName = session?.user?.name || session?.user?.email || "Staff";
    const initials = staffName
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const newComment = {
      id: `comment_${Date.now()}`,
      type: "staff_comment",
      author: staffName,
      initials: initials || "ST",
      title: `${staffName}: ${commentInput.trim()}`,
      description: commentInput.trim(),
      timestamp: new Date().toISOString(),
    };

    const updated = [newComment, ...customComments];
    setCustomComments(updated);
    localStorage.setItem(`vendra_order_comments_${order.id}`, JSON.stringify(updated));
    setCommentInput("");
    setSubmittingComment(false);
    showToast("Comment posted.");
  };

  // Group timeline events (merging backend timeline and custom staff comments)
  const allTimelineEvents = [...customComments, ...(order?.timeline || [])].sort((a, b) => {
    const timeA = new Date(a.timestamp || 0).getTime();
    const timeB = new Date(b.timestamp || 0).getTime();
    return timeB - timeA;
  });

  const groupedTimeline = allTimelineEvents.reduce((acc, ev) => {
    const label = formatDateHeader(ev.timestamp);
    if (!acc[label]) acc[label] = [];
    acc[label].push(ev);
    return acc;
  }, {});

  const userInitials = (session?.user?.name || session?.user?.email || "RC")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Status computation
  const isCancelled = order?.status === "cancelled";
  const isArchived = order?.status === "closed" || order?.status === "archived";
  const isPaid = order?.payment_status === "paid";
  const isPending = order?.payment_status === "pending";
  const isRefunded = order?.payment_status === "refunded";
  const isPartiallyPaid = order?.payment_status === "partially_paid";
  const isPartiallyRefunded = order?.payment_status === "partially_refunded";
  const isFulfilled = order?.fulfillment_status === "fulfilled";
  const isUnfulfilled = order?.fulfillment_status === "unfulfilled" || !order?.fulfillment_status;

  const fin = order?.financial_summary || {
    subtotal: order?.subtotal || "0.00",
    discount_amount: order?.discount_amount || "0.00",
    tax_amount: order?.tax_amount || "0.00",
    shipping_amount: order?.shipping_amount || "0.00",
    total: order?.total || "0.00",
    gross_paid: isPaid ? order?.total || "0.00" : "0.00",
    amount_refunded: isRefunded ? order?.total || "0.00" : "0.00",
    net_payment: isPaid && !isRefunded ? order?.total || "0.00" : "0.00",
    balance_due: isPaid ? "0.00" : order?.total || "0.00",
  };

  const customerObj = order?.customer_details || {
    name: order?.customer_name || "Guest Customer",
    email: order?.customer_email || "",
    phone: "",
    orders_count: 1,
    is_guest: !order?.customer,
  };

  const shippingAddr = order?.shipping_address;
  const billingAddr = order?.billing_address;

  // Determine if this order was placed via test mode
  const isTestOrder =
    order?.channel === "Online Store" ||
    order?.order_number?.toLowerCase().includes("test") ||
    tags.some((t) => t.toLowerCase().includes("test"));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F3FF] text-charcoal-navy">
        <AdminHeader />
        <div className="flex min-h-[calc(100vh-72px)]">
          <AdminSidebar />
          <main className="flex-1 px-4 sm:px-8 py-6 max-w-full">
            <div className="animate-pulse space-y-6">
              <div className="h-6 w-32 bg-slate-200 rounded" />
              <div className="h-10 w-64 bg-slate-200 rounded" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="h-64 bg-white rounded-2xl border border-[#E4DEFB]" />
                  <div className="h-64 bg-white rounded-2xl border border-[#E4DEFB]" />
                </div>
                <div className="space-y-6">
                  <div className="h-40 bg-white rounded-2xl border border-[#E4DEFB]" />
                  <div className="h-40 bg-white rounded-2xl border border-[#E4DEFB]" />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#F5F3FF] text-charcoal-navy">
        <AdminHeader />
        <div className="flex min-h-[calc(100vh-72px)]">
          <AdminSidebar />
          <main className="flex-1 px-4 sm:px-8 py-16 flex flex-col items-center justify-center">
            <div className="bg-white p-8 rounded-2xl border border-[#E4DEFB] text-center max-w-md shadow-sm">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xl mx-auto mb-4">
                !
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Order Not Available</h2>
              <p className="text-sm text-slate-600 mb-6">{error || "Could not load this order."}</p>
              <Link
                to="/admin/online-store/orders"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-charcoal-navy text-white text-sm font-semibold hover:bg-[#1C2347] transition"
              >
                ← Back to Orders
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F3FF] text-charcoal-navy">
      <AdminHeader />

      <div className="flex min-h-[calc(100vh-72px)]">
        <AdminSidebar />

        <main className="flex-1 px-4 sm:px-8 py-6 max-w-full overflow-x-hidden">
          {/* TOAST / ACTION ALERTS */}
          {actionMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 flex items-center justify-between shadow-xs">
              <span>{actionMsg}</span>
              <button
                type="button"
                onClick={() => setActionMsg("")}
                className="text-emerald-600 hover:text-emerald-900 font-bold"
              >
                ✕
              </button>
            </div>
          )}
          {actionError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-800 text-xs border border-red-200 flex items-center justify-between shadow-xs">
              <span>{actionError}</span>
              <button
                type="button"
                onClick={() => setActionError("")}
                className="text-red-600 hover:text-red-900 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* 1. TOP HEADER & NAVIGATION */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              {/* Back Link */}
              <Link
                to="/admin/online-store/orders"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-2"
              >
                <span>←</span> Orders
              </Link>

              {/* Order Number & Badges */}
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {order.order_number?.startsWith("#")
                    ? order.order_number
                    : `#${order.order_number || order.id?.slice(0, 8)}`}
                </h1>

                {/* Status Badges */}
                {isCancelled && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FFEBE6] text-[#C93B2B] border border-[#F8C4BC]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C93B2B]" />
                    Canceled
                  </span>
                )}

                {isPending && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FFF4E5] text-[#B76E00] border border-[#FFE2B8]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B76E00]" />
                    Payment pending
                  </span>
                )}

                {isPartiallyPaid && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FEF3E2] text-[#9A4B00] border border-[#FCD399]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C25E00]" />
                    Partially paid
                  </span>
                )}

                {isPaid && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E9EEF5] text-charcoal-navy">
                    <span className="w-1.5 h-1.5 rounded-full bg-charcoal-navy" />
                    Paid
                  </span>
                )}

                {isRefunded && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    Refunded
                  </span>
                )}

                {isPartiallyRefunded && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    Partially refunded
                  </span>
                )}

                {!isCancelled && isUnfulfilled && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FFFBEA] text-[#8C6B00] border border-[#FDE68A]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                    Unfulfilled
                  </span>
                )}

                {!isCancelled && isFulfilled && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E9EEF5] text-charcoal-navy">
                    <span className="w-1.5 h-1.5 rounded-full bg-charcoal-navy" />
                    Fulfilled
                  </span>
                )}

                {isCancelled && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    Fulfillment not required
                  </span>
                )}

                {isArchived && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                    Archived
                  </span>
                )}
              </div>

              {/* Subheading: Date and Source */}
              <p className="text-xs text-slate-500 mt-1.5">
                {formatOrderDateTime(order.created_at)} from{" "}
                <span className="text-slate-700 font-medium">
                  {order.source_draft ? "Draft Orders" : order.channel || "Online Store"}
                </span>
              </p>
            </div>

            {/* Top Right Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Refund Button */}
              {Number(fin.gross_paid) > 0 && !isRefunded && (
                <button
                  type="button"
                  onClick={() => setShowRefundModal(true)}
                  className="rounded-lg bg-white border border-[#DDD6FE] px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-[#F3F0FF] transition cursor-pointer"
                >
                  Refund
                </button>
              )}

              {/* Return Button */}
              {isFulfilled && !isCancelled && (
                <button
                  type="button"
                  onClick={() => showToast("Return workflow initiated.")}
                  className="rounded-lg bg-white border border-[#DDD6FE] px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-[#F3F0FF] transition cursor-pointer"
                >
                  Return
                </button>
              )}

              {/* Edit Button */}
              <button
                type="button"
                onClick={() => setShowNotesModal(true)}
                className="rounded-lg bg-white border border-[#DDD6FE] px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-[#F3F0FF] transition cursor-pointer"
              >
                Edit
              </button>

              {/* More Actions Dropdown */}
              <div className="relative" ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 rounded-lg bg-white border border-[#DDD6FE] px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-[#F3F0FF] transition cursor-pointer"
                >
                  More actions
                  <span className="text-xs">⌄</span>
                </button>

                {isMoreMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-48 rounded-xl border border-[#DDD6FE] bg-white py-1.5 shadow-lg z-20 text-xs sm:text-sm">
                    {order.status === "open" && isUnfulfilled && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          setShowCancelModal(true);
                        }}
                        className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition cursor-pointer"
                      >
                        Cancel order
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setShowEmailModal(true);
                      }}
                      className="w-full text-left px-4 py-2 text-slate-700 hover:bg-[#F3F0FF] transition cursor-pointer"
                    >
                      View confirmation email
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        window.print();
                      }}
                      className="w-full text-left px-4 py-2 text-slate-700 hover:bg-[#F3F0FF] transition cursor-pointer"
                    >
                      Print packing slip
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        showToast("Invoice sent to customer email.");
                      }}
                      className="w-full text-left px-4 py-2 text-slate-700 hover:bg-[#F3F0FF] transition cursor-pointer"
                    >
                      Send invoice
                    </button>
                  </div>
                )}
              </div>

              {/* Prev / Next Order Chevrons */}
              <div className="flex items-center rounded-lg bg-white border border-[#DDD6FE] overflow-hidden ml-1">
                <button
                  type="button"
                  disabled={!prevOrder}
                  onClick={() => prevOrder && navigate(`/admin/online-store/orders/${prevOrder.id}`)}
                  title={prevOrder ? `Previous: ${prevOrder.order_number}` : "No previous order"}
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-[#F3F0FF] disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  ▲
                </button>
                <div className="w-px h-5 bg-[#DDD6FE]" />
                <button
                  type="button"
                  disabled={!nextOrder}
                  onClick={() => nextOrder && navigate(`/admin/online-store/orders/${nextOrder.id}`)}
                  title={nextOrder ? `Next: ${nextOrder.order_number}` : "No next order"}
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-[#F3F0FF] disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  ▼
                </button>
              </div>
            </div>
          </div>

          {/* 2. DYNAMIC MAIN CONTENT: TWO-COLUMN RESPONSIVE LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT COLUMN: FULFILLMENT, ITEMS, PAYMENT, TIMELINE */}
            <div className="lg:col-span-2 space-y-5">
              {/* TEST ORDER BANNER */}
              {isTestOrder && (
                <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEA] p-4 text-xs sm:text-sm text-[#8C6B00] shadow-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="font-bold text-base leading-none">!</span>
                    <div>
                      <p className="font-semibold text-slate-900">Test order</p>
                      <p className="mt-0.5 text-slate-700">
                        Your payment gateway was in test mode when this order was created.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* FULFILLMENT SECTION */}
              {isCancelled ? (
                /* CANCELLED / REMOVED SECTION */
                <div className="rounded-2xl border border-[#E4DEFB] bg-white p-5 shadow-xs">
                  <h2 className="text-sm font-semibold text-slate-900 mb-4">Removed</h2>
                  <div className="divide-y divide-slate-100">
                    {(order.items || []).map((item, idx) => (
                      <div key={item.id || idx} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.product_name}
                              className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-[#FAF8FF] border border-[#E4DEFB] flex items-center justify-center text-slate-400 text-lg">
                              📦
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-slate-800 line-through">
                              {item.product_name}
                            </p>
                            {item.sku && (
                              <p className="text-xs text-slate-400 font-mono">
                                {item.sku}
                              </p>
                            )}
                            {item.variant_title && (
                              <p className="text-xs text-slate-500">{item.variant_title}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-600">
                            {formatCurrency(item.unit_price, order.currency_code)} × {item.quantity}
                          </p>
                          <p className="text-sm font-medium text-slate-800">
                            {formatCurrency(item.total, order.currency_code)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* ACTIVE ORDERS: FULFILLED OR UNFULFILLED GROUPS */
                <>
                  {/* FULFILLED GROUPS (if any) */}
                  {(order.fulfillments || []).map((ful, fIdx) => (
                    <div
                      key={ful.id || fIdx}
                      className="rounded-2xl border border-[#E4DEFB] bg-white p-5 shadow-xs"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-charcoal-navy text-sm font-bold">✓</span>
                          <h2 className="text-sm font-bold text-slate-900">
                            Fulfilled #{order.order_number}-F{fIdx + 1}
                          </h2>
                        </div>
                        <span className="text-xs text-slate-500">
                          {formatOrderDateTime(ful.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 mb-3">
                        {ful.delivery_method ? `Method: ${ful.delivery_method}` : "Shipping not required"}
                      </p>

                      {/* Items in fulfillment */}
                      <div className="divide-y divide-slate-100">
                        {Array.isArray(ful.items) && ful.items.length > 0 ? (
                          ful.items.map((fi, iIdx) => (
                            <div key={fi.id || iIdx} className="py-2.5 flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-800">
                                {fi.product_name}
                              </span>
                              <span className="text-xs text-slate-600">Qty: {fi.quantity}</span>
                            </div>
                          ))
                        ) : (
                          <div className="py-2.5 text-xs text-slate-500">All order items fulfilled.</div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* UNFULFILLED GROUP (if items still to fulfill) */}
                  {!isFulfilled && (
                    <div className="rounded-2xl border border-[#E4DEFB] bg-white p-5 shadow-xs">
                      {/* Header with Mark as Fulfilled and Create Shipping Label */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-md bg-[#FFFBEA] border border-[#FDE68A] text-[#8C6B00] flex items-center justify-center text-xs font-bold">
                            📦
                          </span>
                          <h2 className="text-sm font-bold text-slate-900">Unfulfilled</h2>
                        </div>

                        <div className="flex items-center gap-2">
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => setShowFulfillModal(true)}
                              className="rounded-lg bg-white border border-[#DDD6FE] px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-[#F3F0FF] transition cursor-pointer"
                            >
                              Mark as fulfilled ⌄
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => showToast("Shipping label created.")}
                            className="rounded-lg bg-charcoal-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1C2347] transition cursor-pointer"
                          >
                            Create shipping label
                          </button>
                        </div>
                      </div>

                      {/* Delivery method bar */}
                      <div className="mt-3.5 flex items-center justify-between p-2.5 rounded-xl bg-[#FAF8FF] border border-[#E4DEFB] text-xs">
                        <div className="flex items-center gap-2 text-slate-700">
                          <span>🚚</span>
                          <span className="font-medium">
                            {order.delivery_method || "Standard Delivery"}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 font-mono text-[11px]">
                          {order.sales_channel?.name || "ONLINE STORE"}
                        </span>
                      </div>

                      {/* Line Items List */}
                      <div className="divide-y divide-slate-100 mt-4">
                        {(order.items || []).map((item, idx) => (
                          <div
                            key={item.id || idx}
                            className="py-3 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3">
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.product_name}
                                  className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-[#FAF8FF] border border-[#E4DEFB] flex items-center justify-center text-slate-400 text-lg">
                                  📦
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium text-slate-800">
                                  {item.product_name}
                                </p>
                                {item.sku && (
                                  <p className="text-xs text-slate-400 font-mono">
                                    {item.sku}
                                  </p>
                                )}
                                {item.variant_title && (
                                  <p className="text-xs text-slate-500">
                                    {item.variant_title}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-slate-600">
                                {formatCurrency(item.unit_price, order.currency_code)} ×{" "}
                                {item.quantity}
                              </p>
                              <p className="text-sm font-medium text-slate-800">
                                {formatCurrency(item.total, order.currency_code)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* PAYMENT & FINANCIAL SUMMARY CARD */}
              <div className="rounded-2xl border border-[#E4DEFB] bg-white p-5 shadow-xs">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    {isRefunded ? (
                      <span className="text-slate-600 font-bold">📄</span>
                    ) : isPaid ? (
                      <span className="text-charcoal-navy font-bold">✓</span>
                    ) : (
                      <span className="text-[#B76E00] font-bold">⏱</span>
                    )}
                    <h2 className="text-sm font-bold text-slate-900">
                      {isRefunded
                        ? "Refunded"
                        : isPaid
                          ? "Paid"
                          : isPartiallyPaid
                            ? "Partially paid"
                            : "Payment pending"}
                    </h2>
                  </div>

                  {/* Payment Action Buttons */}
                  <div className="flex items-center gap-2">
                    {isPending && (
                      <>
                        <button
                          type="button"
                          onClick={() => showToast("Invoice email dispatched to customer.")}
                          className="rounded-lg bg-white border border-[#DDD6FE] px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-[#F3F0FF] transition cursor-pointer"
                        >
                          Send invoice
                        </button>
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => setShowPaymentModal(true)}
                            className="rounded-lg bg-charcoal-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1C2347] transition cursor-pointer"
                          >
                            Collect payment ⌄
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Financial Breakdown Table */}
                <div className="mt-4 space-y-2.5 text-xs sm:text-sm">
                  {isRefunded && (
                    <div className="flex justify-between text-slate-600">
                      <span>Original order</span>
                      <span>{formatCurrency(order.total, order.currency_code)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600">
                    <span>
                      Subtotal ({order.items_count || order.items?.length || 0}{" "}
                      {(order.items_count || order.items?.length || 0) === 1 ? "item" : "items"})
                    </span>
                    <span>{formatCurrency(fin.subtotal, order.currency_code)}</span>
                  </div>

                  {Number(fin.discount_amount) > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Discount</span>
                      <span>-{formatCurrency(fin.discount_amount, order.currency_code)}</span>
                    </div>
                  )}

                  {Number(fin.shipping_amount) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Shipping ({order.delivery_method || "Standard"})</span>
                      <span>{formatCurrency(fin.shipping_amount, order.currency_code)}</span>
                    </div>
                  )}

                  {Number(fin.tax_amount) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Tax</span>
                      <span>{formatCurrency(fin.tax_amount, order.currency_code)}</span>
                    </div>
                  )}

                  <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-100 text-sm sm:text-base">
                    <span>Total</span>
                    <span>{formatCurrency(fin.total, order.currency_code)}</span>
                  </div>

                  {/* Paid / Refund / Balance Details */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <div className="flex justify-between text-slate-700">
                      <span>Paid</span>
                      <span>{formatCurrency(fin.gross_paid, order.currency_code)}</span>
                    </div>

                    {Number(fin.amount_refunded) > 0 && (
                      <div className="flex justify-between text-[#C93B2B]">
                        <span>Refunded ({refundReason || "Order canceled"})</span>
                        <span>-{formatCurrency(fin.amount_refunded, order.currency_code)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-900 font-semibold pt-1">
                      <span>Net payment</span>
                      <span>{formatCurrency(fin.net_payment, order.currency_code)}</span>
                    </div>

                    {!isPaid && Number(fin.balance_due) > 0 && (
                      <div className="flex justify-between text-slate-600 text-xs pt-1">
                        <span>Balance (Payment due when invoice is sent)</span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(fin.balance_due, order.currency_code)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* TIMELINE SECTION */}
              <div className="space-y-4">
                <h2 className="text-base font-bold text-slate-900">Timeline</h2>

                {/* Staff Comment Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#0080FF] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {userInitials}
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        placeholder="Leave a comment..."
                        rows={2}
                        className="w-full text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none resize-none bg-transparent"
                      />
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                        <div className="flex items-center gap-3 text-slate-400 text-sm">
                          <button type="button" className="hover:text-slate-600 transition" title="Add emoji">
                            😊
                          </button>
                          <button type="button" className="hover:text-slate-600 font-bold text-xs transition" title="Mention staff">
                            @
                          </button>
                          <button type="button" className="hover:text-slate-600 font-bold text-xs transition" title="Reference order">
                            #
                          </button>
                          <button type="button" className="hover:text-slate-600 transition" title="Attach file">
                            📎
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={handlePostComment}
                          disabled={!commentInput.trim() || submittingComment}
                          className="px-3.5 py-1.5 text-xs font-semibold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed bg-charcoal-navy text-white hover:bg-[#1C2347]"
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 text-right mt-1.5">
                    Only you and other staff can see comments
                  </p>
                </div>

                {/* Vertical Event Timeline */}
                <div className="pt-2 pl-4">
                  {Object.keys(groupedTimeline).length > 0 ? (
                    Object.entries(groupedTimeline).map(([dateLabel, dateEvents]) => (
                      <div key={dateLabel} className="mb-6 relative">
                        {/* Date Header */}
                        <div className="text-xs font-semibold text-slate-500 mb-4 pl-6">
                          {dateLabel}
                        </div>

                        {/* Events on this date */}
                        <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-200">
                          {dateEvents.map((ev) => (
                            <div key={ev.id} className="relative flex items-start gap-4 pl-6">
                              {/* Node bullet */}
                              <div className="absolute left-1.25 top-1.5 w-2 h-2 rounded-full bg-slate-600 ring-4 ring-[#F1F2F4]" />

                              {/* Event Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between gap-2">
                                  <div className="text-xs text-slate-800 leading-relaxed">
                                    {ev.type === "staff_comment" ? (
                                      <div>
                                        <span className="font-semibold text-slate-900">
                                          {ev.author}:{" "}
                                        </span>
                                        <span>{ev.description}</span>
                                      </div>
                                    ) : ev.type === "order_email" ? (
                                      <div>
                                        <p>{ev.title}</p>
                                        <button
                                          type="button"
                                          onClick={() => setShowEmailModal(true)}
                                          className="mt-1.5 inline-flex items-center px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold hover:bg-slate-50 transition cursor-pointer"
                                        >
                                          View email
                                        </button>
                                      </div>
                                    ) : (
                                      <p>{ev.title}</p>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-slate-400 shrink-0">
                                    {formatTimeOnly(ev.timestamp)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 pl-6">No timeline events recorded yet.</div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: NOTES, CUSTOMER, ADDRESSES, CONVERSION, RISK, TAGS */}
            <div className="space-y-5">
              {/* NOTES CARD */}
              <div className="rounded-2xl border border-[#E4DEFB] bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900">Notes</h3>
                  <button
                    type="button"
                    onClick={() => setShowNotesModal(true)}
                    className="text-slate-400 hover:text-slate-800 transition text-base font-bold p-1"
                    title="Edit note"
                  >
                    +
                  </button>
                </div>
                {notesInput ? (
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">{notesInput}</p>
                ) : (
                  <p className="text-xs text-slate-400">No notes from customer</p>
                )}
              </div>

              {/* CUSTOMER CARD */}
              <div className="rounded-2xl border border-[#E4DEFB] bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900">Customer</h3>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCustomerMenu((prev) => !prev)}
                      className="text-slate-400 hover:text-slate-800 transition text-sm font-bold p-1"
                    >
                      •••
                    </button>
                    {showCustomerMenu && (
                      <div className="absolute right-0 mt-1 w-40 rounded-xl border border-[#DDD6FE] bg-white py-1 shadow-lg z-20 text-xs">
                        {customerObj.id && (
                          <Link
                            to={`/admin/online-store/customers/${customerObj.id}`}
                            className="block px-3 py-1.5 text-slate-700 hover:bg-[#F3F0FF]"
                          >
                            View customer profile
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (customerObj.email) {
                              navigator.clipboard.writeText(customerObj.email);
                              showToast("Customer email copied.");
                            }
                            setShowCustomerMenu(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-[#F3F0FF]"
                        >
                          Copy email
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs sm:text-sm">
                  {customerObj.id ? (
                    <Link
                      to={`/admin/online-store/customers/${customerObj.id}`}
                      className="font-semibold text-blue-600 hover:underline block"
                    >
                      {customerObj.name}
                    </Link>
                  ) : (
                    <p className="font-semibold text-slate-800">{customerObj.name}</p>
                  )}

                  <p className="text-xs text-slate-500">
                    {customerObj.orders_count === 1
                      ? "1 order"
                      : customerObj.orders_count > 1
                        ? `${customerObj.orders_count} orders`
                        : "No orders"}
                  </p>

                  {customerObj.email && (
                    <a
                      href={`mailto:${customerObj.email}`}
                      className="text-xs text-blue-600 hover:underline block truncate"
                    >
                      {customerObj.email}
                    </a>
                  )}

                  {customerObj.phone && (
                    <p className="text-xs text-slate-600">{customerObj.phone}</p>
                  )}
                </div>
              </div>

              {/* SHIPPING ADDRESS CARD */}
              <div className="rounded-2xl border border-[#E4DEFB] bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900">Shipping address</h3>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowShippingMenu((prev) => !prev)}
                      className="text-slate-400 hover:text-slate-800 transition text-sm font-bold p-1"
                    >
                      •••
                    </button>
                    {showShippingMenu && (
                      <div className="absolute right-0 mt-1 w-36 rounded-xl border border-[#DDD6FE] bg-white py-1 shadow-lg z-20 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setShowShippingMenu(false);
                            showToast("Address edit opened.");
                          }}
                          className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-[#F3F0FF]"
                        >
                          Edit address
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {shippingAddr ? (
                  <div className="space-y-2 text-xs sm:text-sm text-slate-700">
                    {/* Optional alert if address has issues */}
                    {(!shippingAddr.address1 || !shippingAddr.postal_code) && (
                      <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                        <span className="font-bold">!</span>
                        <span>Review address issues</span>
                      </div>
                    )}

                    <div className="space-y-0.5">
                      {(shippingAddr.first_name || shippingAddr.last_name) && (
                        <p className="font-medium text-slate-900">
                          {`${shippingAddr.first_name || ""} ${shippingAddr.last_name || ""}`.trim()}
                        </p>
                      )}
                      {shippingAddr.company && <p>{shippingAddr.company}</p>}
                      {shippingAddr.address1 && <p>{shippingAddr.address1}</p>}
                      {shippingAddr.address2 && <p>{shippingAddr.address2}</p>}
                      <p>
                        {[shippingAddr.city, shippingAddr.province || shippingAddr.state, shippingAddr.postal_code]
                          .filter(Boolean)
                          .join(" ")}
                      </p>
                      {shippingAddr.country && <p>{shippingAddr.country}</p>}
                      {shippingAddr.phone && <p>{shippingAddr.phone}</p>}
                    </div>

                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(
                        [shippingAddr.address1, shippingAddr.city, shippingAddr.state, shippingAddr.country]
                          .filter(Boolean)
                          .join(", ")
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline inline-block mt-1"
                    >
                      View map
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No shipping address provided</p>
                )}
              </div>

              {/* BILLING ADDRESS CARD */}
              <div className="rounded-2xl border border-[#E4DEFB] bg-white p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Billing address</h3>
                {billingAddr && JSON.stringify(billingAddr) !== JSON.stringify(shippingAddr) ? (
                  <div className="space-y-0.5 text-xs sm:text-sm text-slate-700">
                    {(billingAddr.first_name || billingAddr.last_name) && (
                      <p className="font-medium text-slate-900">
                        {`${billingAddr.first_name || ""} ${billingAddr.last_name || ""}`.trim()}
                      </p>
                    )}
                    {billingAddr.address1 && <p>{billingAddr.address1}</p>}
                    <p>
                      {[billingAddr.city, billingAddr.province || billingAddr.state, billingAddr.postal_code]
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                    {billingAddr.country && <p>{billingAddr.country}</p>}
                  </div>
                ) : (
                  <p className="text-xs text-slate-600">Same as shipping address</p>
                )}
              </div>

              {/* CONVERSION SUMMARY */}
              <div className="rounded-2xl border border-[#E4DEFB] bg-white p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 mb-2">Conversion summary</h3>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <p className="flex items-center gap-2">
                    <span>🛍</span>
                    <span>
                      This is their {customerObj.orders_count || 1}
                      {customerObj.orders_count === 1
                        ? "st"
                        : customerObj.orders_count === 2
                          ? "nd"
                          : customerObj.orders_count === 3
                            ? "rd"
                            : "th"}{" "}
                      order
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span>🌐</span>
                    <span>1st session from {order.channel || "Online Store"}</span>
                  </p>
                </div>
              </div>

              {/* ORDER RISK CARD */}
              <div className="rounded-2xl border border-[#E4DEFB] bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-900">Order risk</h3>
                  <span className="text-slate-400 text-xs">🛡</span>
                </div>
                <div className="space-y-2">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div className="w-1/3 bg-emerald-500 rounded-full" />
                    <div className="w-2/3 bg-transparent" />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span className="text-emerald-700 font-semibold">Low</span>
                    <span>Medium</span>
                    <span>High</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Chargeback risk is low. You can fulfill this order.
                  </p>
                </div>
              </div>

              {/* TAGS CARD */}
              <div className="rounded-2xl border border-[#E4DEFB] bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900">Tags</h3>
                  <button
                    type="button"
                    onClick={() => setIsEditingTags((prev) => !prev)}
                    className="text-slate-400 hover:text-slate-700 text-xs font-semibold p-1"
                    title="Edit tags"
                  >
                    ✎
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {tags.length > 0 ? (
                    tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EEF2F6] text-xs font-mono text-slate-700 border border-slate-200"
                      >
                        {tag}
                        {isEditingTags && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="text-slate-400 hover:text-red-600 font-bold ml-1"
                          >
                            ✕
                          </button>
                        )}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400">No tags added</p>
                  )}
                </div>

                {isEditingTags && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                      placeholder="Add tag..."
                      className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-[#DDD6FE] outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-3 py-1.5 rounded-lg bg-charcoal-navy text-white text-xs font-semibold hover:bg-[#1C2347]"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* 3. MODALS */}

      {/* FULFILL MODAL */}
      {showFulfillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E4DEFB] p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-2">Fulfill items</h3>
            <p className="text-xs text-slate-500 mb-4">
              Mark items in this order as shipped. Inventory will be updated automatically.
            </p>

            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Delivery Method
                </label>
                <input
                  type="text"
                  value={fulfillMethod}
                  onChange={(e) => setFulfillMethod(e.target.value)}
                  placeholder="e.g. Standard Shipping, Express, In-store Pickup"
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-[#DDD6FE] outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowFulfillModal(false)}
                className="px-4 py-2 rounded-lg border border-[#DDD6FE] text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleFulfillOrder}
                className="px-4 py-2 rounded-lg bg-charcoal-navy text-white text-xs font-semibold hover:bg-[#1C2347] disabled:opacity-50"
              >
                {actionLoading ? "Fulfilling..." : "Confirm fulfillment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COLLECT PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E4DEFB] p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-2">Collect payment</h3>
            <p className="text-xs text-slate-500 mb-4">
              Record a payment received for order {order.order_number}.
            </p>

            <div className="space-y-3 mb-6 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Amount ({order.currency_code})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#DDD6FE] outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentProvider}
                  onChange={(e) => setPaymentProvider(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#DDD6FE] outline-none bg-white"
                >
                  <option value="manual">Manual / Cash on Delivery</option>
                  <option value="card">Credit Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cod">Cash</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reference / Transaction ID
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Optional reference code"
                  className="w-full px-3 py-2 rounded-lg border border-[#DDD6FE] outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 rounded-lg border border-[#DDD6FE] text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCollectPayment}
                className="px-4 py-2 rounded-lg bg-charcoal-navy text-white text-xs font-semibold hover:bg-[#1C2347] disabled:opacity-50"
              >
                {actionLoading ? "Recording..." : "Accept payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REFUND MODAL */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E4DEFB] p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-2">Process refund</h3>
            <p className="text-xs text-slate-500 mb-4">
              Refund an amount back to the customer.
            </p>

            <div className="space-y-3 mb-6 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Refund Amount ({order.currency_code})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#DDD6FE] outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for refund</label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#DDD6FE] outline-none bg-white"
                >
                  <option value="Order canceled">Order canceled</option>
                  <option value="Customer request">Customer request</option>
                  <option value="Damaged goods">Damaged goods</option>
                  <option value="Defective product">Defective product</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRefundModal(false)}
                className="px-4 py-2 rounded-lg border border-[#DDD6FE] text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleRefundPayment}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? "Processing..." : "Refund amount"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E4DEFB] p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-2">Cancel this order?</h3>
            <p className="text-xs text-slate-500 mb-4">
              Cancelling this order will release all committed inventory back to available stock.
              This operation cannot be undone.
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-lg border border-[#DDD6FE] text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCancelOrder}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? "Cancelling..." : "Cancel Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT NOTES MODAL */}
      {showNotesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E4DEFB] p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-2">Order Notes</h3>
            <textarea
              rows={4}
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="Add internal notes about customer preferences, shipping instructions..."
              className="w-full text-xs sm:text-sm p-3 rounded-lg border border-[#DDD6FE] outline-none resize-none mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNotesModal(false)}
                className="px-4 py-2 rounded-lg border border-[#DDD6FE] text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNotes}
                className="px-4 py-2 rounded-lg bg-charcoal-navy text-white text-xs font-semibold hover:bg-[#1C2347]"
              >
                Save notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW EMAIL PREVIEW MODAL */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E4DEFB] p-6 max-w-lg w-full shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Order Confirmation Email</h3>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="text-slate-400 hover:text-slate-800 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#FAF8FF] p-4 rounded-xl border border-[#E4DEFB] space-y-3 text-xs sm:text-sm">
              <p>
                <strong className="text-slate-800">To:</strong>{" "}
                <span className="text-blue-600">{customerObj.email || "customer@example.com"}</span>
              </p>
              <p>
                <strong className="text-slate-800">Subject:</strong> Order Confirmation #
                {order.order_number}
              </p>
              <div className="pt-3 border-t border-slate-200 text-slate-700 space-y-2">
                <p>Hi {customerObj.name || "Customer"},</p>
                <p>
                  Thank you for your order! We are getting your order ready to be shipped. We will
                  notify you when it has been sent.
                </p>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <p className="font-semibold text-slate-900">
                    Order Summary ({order.order_number})
                  </p>
                  <ul className="divide-y divide-slate-100 mt-2">
                    {(order.items || []).map((i, idx) => (
                      <li key={idx} className="py-1.5 flex justify-between">
                        <span>
                          {i.product_name} × {i.quantity}
                        </span>
                        <span className="font-semibold">
                          {formatCurrency(i.total, order.currency_code)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-2 border-t border-slate-100 flex justify-between font-bold mt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(order.total, order.currency_code)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 rounded-lg bg-charcoal-navy text-white text-xs font-semibold hover:bg-[#1C2347]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
