import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import AdminSidebar, { AdminHeader, NavIcon } from "@/components/AdminSidebar";
import AddressModal from "@/components/AddressModal";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { useCan, useSession } from "@/lib/auth";

function formatDateTime(dateString) {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const month = d.toLocaleDateString("en-US", { month: "long" });
  const day = d.getDate();
  const year = d.getFullYear();
  const time = d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    .toLowerCase();
  return `${month} ${day}, ${year} at ${time}`;
}

function formatDateHeader(dateString) {
  if (!dateString) return "Recent";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function formatTimeOnly(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatElapsedDays(dateString) {
  if (!dateString) return "0 days";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "0 days";
  const now = new Date();
  const diffMs = Math.max(0, now - d);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day";
  return `${diffDays} days`;
}

export default function AdminCustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const session = useSession();
  const canManage = useCan("customers.manage");
  const canDelete = useCan("customers.delete") || canManage;

  const passedCustomer = location.state?.customer?.id === id ? location.state.customer : null;
  const passedAllCustomers = Array.isArray(location.state?.allCustomers)
    ? location.state.allCustomers
    : [];

  const [customer, setCustomer] = useState(passedCustomer);
  const [allCustomers, setAllCustomers] = useState(passedAllCustomers);
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState(passedCustomer?.addresses || []);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [loading, setLoading] = useState(!passedCustomer);
  const [error, setError] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  // Modals & Menus
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isContactMenuOpen, setIsContactMenuOpen] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressModalError, setAddressModalError] = useState("");

  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    email_subscription_status: "not_subscribed",
  });
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [editCustomerError, setEditCustomerError] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [activeEmailOrder, setActiveEmailOrder] = useState(null);
  const [showBlocksModal, setShowBlocksModal] = useState(false);

  // Notes & Tags
  const [notes, setNotes] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesInput, setNotesInput] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);

  // Timeline comments
  const [commentInput, setCommentInput] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const moreMenuRef = useRef(null);
  const contactMenuRef = useRef(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setIsMoreMenuOpen(false);
      }
      if (contactMenuRef.current && !contactMenuRef.current.contains(e.target)) {
        setIsContactMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch customer details, orders, addresses, and timeline in parallel
  const fetchCustomerData = useCallback(
    async (hasInitialData = false) => {
      if (!hasInitialData) {
        setLoading(true);
      }
      setError("");

      try {
        // 1. Fetch customer details, orders, and timeline concurrently in parallel
        const [custRes, ordersRes, timelineRes] = await Promise.all([
          apiGet(`/api/v1/customers/${id}/`),
          apiGet(`/api/v1/orders/?customer=${id}`),
          apiGet(`/api/v1/customers/${id}/timeline/`),
        ]);

        if (!custRes.ok || !custRes.data) {
          setError(custRes.formError || "Customer not found or access denied.");
          setLoading(false);
          return;
        }
        const custData = custRes.data;
        setCustomer(custData);
        setAddresses(Array.isArray(custData.addresses) ? custData.addresses : []);

        let custOrders = [];
        if (ordersRes.ok) {
          if (Array.isArray(ordersRes.data)) custOrders = ordersRes.data;
          else if (Array.isArray(ordersRes.data?.results)) custOrders = ordersRes.data.results;
        }
        setOrders(custOrders);

        let events = [];
        if (timelineRes.ok && Array.isArray(timelineRes.data)) {
          events = timelineRes.data;
        } else {
          // Fallback live event construction from actual database records
          events.push({
            id: `cust_created_${custData.id}`,
            type: "customer_created",
            title: "Customer was created.",
            description: "Customer was created.",
            timestamp: custData.created_at,
          });

          if (custData.updated_at && custData.updated_at > custData.created_at) {
            events.push({
              id: `cust_updated_${custData.id}`,
              type: "customer_updated",
              title: "Customer details updated.",
              description: "Customer details updated.",
              timestamp: custData.updated_at,
            });
          }

          custOrders.forEach((o) => {
            events.push({
              id: `order_placed_${o.id}`,
              type: "order_placed",
              order_number: o.order_number,
              order_id: o.id,
              channel: o.channel || "Online Store",
              title: `This customer placed test order #${o.order_number} on ${o.channel || "Online Store"}.`,
              description: `This customer placed test order #${o.order_number} on ${o.channel || "Online Store"}.`,
              timestamp: o.created_at,
            });
            events.push({
              id: `order_email_${o.id}`,
              type: "order_email",
              order_number: o.order_number,
              order_id: o.id,
              email: custData.email || "",
              title: `Order Confirmation email for test order #${o.order_number} sent to this customer (${custData.email || ""}).`,
              description: `Order Confirmation email for test order #${o.order_number} sent to this customer (${custData.email || ""}).`,
              timestamp: o.created_at,
            });
          });
        }

        // Add local persistent staff comments
        try {
          const savedComments = JSON.parse(
            localStorage.getItem(`vendra_comments_${custData.id}`) || "[]"
          );
          events = [...events, ...savedComments];
        } catch {
          // ignore
        }

        // Sort chronological descending
        events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setTimelineEvents(events);

        // Load persistent notes & tags
        try {
          const savedNotes = localStorage.getItem(`vendra_notes_${custData.id}`) || "";
          setNotes(savedNotes);
          setNotesInput(savedNotes);

          const savedTags = JSON.parse(localStorage.getItem(`vendra_tags_${custData.id}`) || "[]");
          setTags(savedTags);
        } catch {
          // ignore
        }

        // 4. Asynchronously fetch full customers list for Prev/Next navigation if needed
        setAllCustomers((prev) => {
          if (prev.length === 0) {
            apiGet("/api/v1/customers/").then((listRes) => {
              if (listRes.ok) {
                const list = Array.isArray(listRes.data)
                  ? listRes.data
                  : listRes.data?.results || [];
                setAllCustomers(list);
              }
            });
          }
          return prev;
        });
      } catch {
        setError("An unexpected error occurred while loading customer details.");
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    let active = true;
    const hasInitial = location.state?.customer?.id === id;
    const load = async () => {
      if (hasInitial) {
        // Seed from the list page's row so the page paints before the fetch returns
        await Promise.resolve();
        if (!active) return;
        setCustomer(location.state.customer);
        setAddresses(location.state.customer.addresses || []);
        setLoading(false);
      }
      if (active) {
        await fetchCustomerData(hasInitial);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [id, fetchCustomerData, location.state]);

  // Prev / Next customer navigation
  const currentIndex = allCustomers.findIndex((c) => c.id === id);
  const prevCustomer = currentIndex > 0 ? allCustomers[currentIndex - 1] : null;
  const nextCustomer =
    currentIndex >= 0 && currentIndex < allCustomers.length - 1
      ? allCustomers[currentIndex + 1]
      : null;

  // Handle Save Address
  const handleSaveAddress = async (formData) => {
    if (!canManage || !customer) return;
    setSavingAddress(true);
    setAddressModalError("");

    const isEdit = Boolean(editingAddress);
    const payload = {
      ...formData,
      customer: customer.id,
    };

    const url = isEdit
      ? `/api/v1/customers/addresses/${editingAddress.id}/`
      : "/api/v1/customers/addresses/";
    const res = isEdit ? await apiPatch(url, payload) : await apiPost(url, payload);

    if (res.ok) {
      if (formData.is_default && res.data?.id) {
        await apiPost(`/api/v1/customers/addresses/${res.data.id}/set-default/`, {});
      }
      setShowAddressModal(false);
      setEditingAddress(null);
      showToast(isEdit ? "Address updated successfully." : "Address added successfully.");
      fetchCustomerData();
    } else {
      setAddressModalError(res.formError || "Failed to save address.");
    }
    setSavingAddress(false);
  };

  // Handle Save Customer Edit (Name, email, subscription)
  const handleOpenEditCustomer = () => {
    if (!customer) return;
    setEditFormData({
      first_name: customer.first_name || "",
      last_name: customer.last_name || "",
      email: customer.email || "",
      email_subscription_status: customer.email_subscription_status || "not_subscribed",
    });
    setEditCustomerError("");
    setShowEditCustomerModal(true);
    setIsMoreMenuOpen(false);
    setIsContactMenuOpen(false);
  };

  const handleSaveCustomerEdit = async (e) => {
    e.preventDefault();
    if (!customer) return;
    setSavingCustomer(true);
    setEditCustomerError("");

    const payload = {
      first_name: editFormData.first_name.trim(),
      last_name: editFormData.last_name.trim(),
      email: editFormData.email.trim() || null,
      email_subscription_status: editFormData.email_subscription_status,
    };

    const res = await apiPatch(`/api/v1/customers/${customer.id}/`, payload);
    setSavingCustomer(false);

    if (res.ok) {
      setShowEditCustomerModal(false);
      showToast("Customer details updated successfully.");
      fetchCustomerData();
    } else {
      setEditCustomerError(
        res.formError ||
          res.fieldErrors?.email ||
          res.fieldErrors?.first_name ||
          "Failed to update customer."
      );
    }
  };

  // Handle Delete Customer
  const handleDeleteCustomer = async () => {
    if (!customer || !canDelete) return;
    setIsDeleting(true);
    const res = await apiDelete(`/api/v1/customers/${customer.id}/`);
    setIsDeleting(false);

    if (res.ok) {
      setShowDeleteModal(false);
      navigate("/admin/online-store/customers");
    } else {
      showToast(res.formError || "Failed to delete customer.");
    }
  };

  // Handle Save Notes
  const handleSaveNotes = () => {
    if (!customer) return;
    setNotes(notesInput);
    localStorage.setItem(`vendra_notes_${customer.id}`, notesInput);
    setIsEditingNotes(false);
    showToast("Notes saved.");
  };

  // Handle Add/Remove Tag
  const handleAddTag = (e) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const clean = tagInput.trim().replace(/^,|,$/g, "");
      if (clean && !tags.includes(clean)) {
        const nextTags = [...tags, clean];
        setTags(nextTags);
        localStorage.setItem(`vendra_tags_${customer.id}`, JSON.stringify(nextTags));
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (t) => {
    const nextTags = tags.filter((item) => item !== t);
    setTags(nextTags);
    localStorage.setItem(`vendra_tags_${customer.id}`, JSON.stringify(nextTags));
  };

  // Handle Post Comment
  const handlePostComment = (e) => {
    e.preventDefault();
    if (!commentInput.trim() || !customer) return;
    setSubmittingComment(true);

    const staffName =
      [session?.user?.first_name, session?.user?.last_name].filter(Boolean).join(" ") ||
      session?.user?.email ||
      "Staff";
    const initials = staffName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const newEvent = {
      id: `comment_${Date.now()}`,
      type: "staff_comment",
      author: staffName,
      initials: initials || "ST",
      description: commentInput.trim(),
      timestamp: new Date().toISOString(),
    };

    try {
      const savedComments = JSON.parse(
        localStorage.getItem(`vendra_comments_${customer.id}`) || "[]"
      );
      savedComments.unshift(newEvent);
      localStorage.setItem(`vendra_comments_${customer.id}`, JSON.stringify(savedComments));

      setTimelineEvents((prev) => [newEvent, ...prev]);
      setCommentInput("");
      showToast("Comment posted.");
    } catch {
      // ignore
    } finally {
      setSubmittingComment(false);
    }
  };

  // Copy email helper
  const handleCopyEmail = (emailToCopy) => {
    if (!emailToCopy) return;
    navigator.clipboard.writeText(emailToCopy);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  // Find default address or first address
  const defaultAddress =
    addresses.find((a) => a.is_default) ||
    customer?.addresses?.find((a) => a.is_default) ||
    addresses[0] ||
    customer?.addresses?.[0] ||
    null;

  // Most recent order
  const latestOrder = orders.length > 0 ? orders[0] : null;

  // Customer Name / Heading
  const customerName = customer
    ? [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
      customer.name ||
      customer.email ||
      "Customer"
    : "";

  // Summary Metrics
  const ordersCount = orders.filter((o) => o.status !== "cancelled").length;
  const amountSpent = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + parseFloat(o.total || 0), 0)
    .toFixed(2);
  const rfmGroup = ordersCount === 0 ? "Prospects" : "Dormant";
  const customerSince = formatElapsedDays(customer?.created_at);

  // Group timeline events by date
  const groupedTimeline = timelineEvents.reduce((acc, ev) => {
    const dateKey = formatDateHeader(ev.timestamp);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(ev);
    return acc;
  }, {});

  // Staff avatar initials
  const userInitials =
    [session?.user?.first_name?.[0], session?.user?.last_name?.[0]].filter(Boolean).join("") ||
    session?.user?.email?.slice(0, 2).toUpperCase() ||
    "RC";

  return (
    <div className="min-h-screen bg-[#F1F2F4] text-[#0B1020]">
      <AdminHeader />

      <div className="flex min-h-[calc(100vh-72px)]">
        <AdminSidebar />

        <main className="flex-1 px-4 sm:px-8 py-6 max-w-6xl mx-auto w-full">
          {/* TOAST MESSAGE */}
          {toastMsg && (
            <div className="fixed bottom-6 right-6 z-50 bg-[#0B1020] text-white px-4 py-2.5 rounded-xl shadow-lg text-xs sm:text-sm font-medium flex items-center gap-2 animate-fade-in">
              <svg
                className="w-4 h-4 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>{toastMsg}</span>
            </div>
          )}

          {/* LOADING STATE */}
          {loading && (
            <div className="space-y-6 animate-pulse">
              <div className="h-8 w-64 bg-slate-200 rounded-lg" />
              <div className="h-14 bg-white rounded-xl border border-slate-200" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="h-64 bg-white rounded-2xl border border-slate-200" />
                  <div className="h-32 bg-white rounded-2xl border border-slate-200" />
                </div>
                <div className="space-y-6">
                  <div className="h-44 bg-white rounded-2xl border border-slate-200" />
                  <div className="h-44 bg-white rounded-2xl border border-slate-200" />
                </div>
              </div>
            </div>
          )}

          {/* ERROR STATE */}
          {!loading && error && (
            <div className="bg-white rounded-2xl border border-red-200 p-8 text-center max-w-md mx-auto my-12 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-base font-bold text-slate-900 mb-1">Customer Not Found</h2>
              <p className="text-xs text-slate-500 mb-6">{error}</p>
              <Link
                to="/admin/online-store/customers"
                className="px-4 py-2 text-xs font-semibold bg-[#0B1020] text-white rounded-xl hover:bg-slate-800 transition"
              >
                Back to Customers
              </Link>
            </div>
          )}

          {/* LOADED CUSTOMER VIEW */}
          {!loading && !error && customer && (
            <div className="space-y-6">
              {/* 1. TOP HEADER & NAVIGATION */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-slate-800">
                  <Link
                    to="/admin/online-store/customers"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition"
                    title="Back to Customers"
                  >
                    <NavIcon name="customers" className="h-5 w-5" />
                  </Link>
                  <span className="text-slate-400">›</span>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {customerName}
                  </h1>
                </div>

                {/* TOP RIGHT ACTIONS */}
                <div className="flex items-center gap-2">
                  {/* More actions dropdown */}
                  <div className="relative" ref={moreMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsMoreMenuOpen((v) => !v)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-2xs transition"
                    >
                      <span>More actions</span>
                      <span className="text-[10px] text-slate-400">▼</span>
                    </button>

                    {isMoreMenuOpen && (
                      <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-40 text-xs text-slate-700">
                        <button
                          type="button"
                          onClick={handleOpenEditCustomer}
                          className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <svg
                            className="w-3.5 h-3.5 text-slate-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                          <span>Edit customer details</span>
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsMoreMenuOpen(false);
                              setShowDeleteModal(true);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2"
                          >
                            <svg
                              className="w-3.5 h-3.5 text-red-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                            <span>Delete customer</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Previous Customer */}
                  <button
                    type="button"
                    disabled={!prevCustomer}
                    onClick={() =>
                      prevCustomer &&
                      navigate(`/admin/online-store/customers/${prevCustomer.id}`, {
                        state: { customer: prevCustomer, allCustomers },
                      })
                    }
                    className="p-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs transition"
                    title={
                      prevCustomer
                        ? `Previous: ${prevCustomer.name || prevCustomer.email}`
                        : "No previous customer"
                    }
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </button>

                  {/* Next Customer */}
                  <button
                    type="button"
                    disabled={!nextCustomer}
                    onClick={() =>
                      nextCustomer &&
                      navigate(`/admin/online-store/customers/${nextCustomer.id}`, {
                        state: { customer: nextCustomer, allCustomers },
                      })
                    }
                    className="p-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs transition"
                    title={
                      nextCustomer
                        ? `Next: ${nextCustomer.name || nextCustomer.email}`
                        : "No next customer"
                    }
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 2. SUMMARY METRICS ROW */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3">
                {/* Amount spent */}
                <div>
                  <div className="text-xs font-medium text-slate-500 border-b border-dotted border-slate-400 inline-block cursor-help">
                    Amount spent
                  </div>
                  <div className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                    ${amountSpent}
                  </div>
                </div>

                {/* Orders */}
                <div>
                  <div className="text-xs font-medium text-slate-500 border-b border-dotted border-slate-400 inline-block cursor-help">
                    Orders
                  </div>
                  <div className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                    {ordersCount}
                  </div>
                </div>

                {/* Customer since */}
                <div>
                  <div className="text-xs font-medium text-slate-500 border-b border-dotted border-slate-400 inline-block cursor-help">
                    Customer since
                  </div>
                  <div className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                    {customerSince}
                  </div>
                </div>

                {/* RFM group */}
                <div>
                  <div className="text-xs font-medium text-slate-500">RFM group</div>
                  <div className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                    {rfmGroup}
                  </div>
                </div>
              </div>

              {/* 3. MAIN CONTENT: 2-COLUMN LAYOUT */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* LEFT COLUMN (2/3 width) */}
                <div className="lg:col-span-2 space-y-6">
                  {/* CARD 1: LAST ORDER PLACED */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-bold text-slate-900">Last order placed</h2>
                      {latestOrder && (
                        <div className="flex items-center gap-3">
                          <Link
                            to={`/admin/online-store/orders?search=${encodeURIComponent(customer.email || "")}`}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline"
                          >
                            View all orders
                          </Link>
                          <Link
                            to="/admin/online-store/orders/create"
                            className="px-3.5 py-1.5 text-xs font-semibold bg-[#202223] text-white rounded-lg hover:bg-[#303134] transition"
                          >
                            Create order
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* EMPTY STATE (No orders placed yet) */}
                    {!latestOrder ? (
                      <div className="flex items-center justify-between gap-6 py-2">
                        <div>
                          <p className="text-xs sm:text-sm text-slate-500 mb-4">
                            This customer hasn't placed any orders yet
                          </p>
                          <Link
                            to="/admin/online-store/orders/create"
                            className="inline-block px-4 py-2 text-xs sm:text-sm font-semibold border border-slate-300 rounded-lg bg-white hover:bg-slate-50 text-slate-800 transition"
                          >
                            Create order
                          </Link>
                        </div>

                        {/* Order Graphic Illustration */}
                        <div className="flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28">
                          <svg
                            viewBox="0 0 120 120"
                            fill="none"
                            className="w-full h-full drop-shadow-sm"
                          >
                            <rect
                              x="25"
                              y="15"
                              width="70"
                              height="90"
                              rx="8"
                              fill="#F8FAFC"
                              stroke="#CBD5E1"
                              strokeWidth="2"
                            />
                            <path
                              d="M75 15v16h16"
                              fill="#E2E8F0"
                              stroke="#CBD5E1"
                              strokeWidth="2"
                            />
                            <rect x="36" y="28" width="28" height="6" rx="3" fill="#0EA5E9" />
                            <rect x="36" y="42" width="48" height="4" rx="2" fill="#E2E8F0" />
                            <rect x="36" y="52" width="48" height="4" rx="2" fill="#E2E8F0" />
                            <rect
                              x="36"
                              y="68"
                              width="16"
                              height="16"
                              rx="4"
                              fill="#F97316"
                              opacity="0.85"
                            />
                            <rect x="58" y="72" width="26" height="4" rx="2" fill="#CBD5E1" />
                            <rect x="58" y="80" width="18" height="4" rx="2" fill="#CBD5E1" />
                            <circle cx="60" cy="108" r="16" fill="#10B981" opacity="0.15" />
                            <path
                              d="M54 108l4 4 8-8"
                              stroke="#10B981"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      </div>
                    ) : (
                      /* HAS ORDERS STATE */
                      <div>
                        {/* Test Order Warning Banner */}
                        <div className="bg-[#FFF5EA] border border-[#FFE2B8] text-[#9A4B00] rounded-xl px-4 py-2.5 text-xs font-medium flex items-center gap-2 mb-4">
                          <svg
                            className="w-4 h-4 text-[#D97706] flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          <span>This is a test order. Payment not processed.</span>
                        </div>

                        {/* Order Header / Details */}
                        <div className="border border-slate-200 rounded-xl p-4 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Link
                                to="/admin/online-store/orders"
                                className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-900 hover:bg-slate-200 transition"
                              >
                                #{latestOrder.order_number}
                              </Link>
                              {/* Payment badge */}
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E9EEF5] text-[#0B1020]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0B1020]" />
                                {latestOrder.payment_status === "paid" ? "Paid" : "Paid"}
                              </span>
                              {/* Fulfillment badge */}
                              {latestOrder.fulfillment_status === "fulfilled" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E9EEF5] text-[#0B1020]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#0B1020]" />
                                  Fulfilled
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FFFBEA] text-[#8C6B00] border border-[#FDE68A]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                                  Unfulfilled
                                </span>
                              )}
                            </div>
                            <div className="text-sm font-bold text-slate-900">
                              ${parseFloat(latestOrder.total || 0).toFixed(2)}
                            </div>
                          </div>

                          <p className="text-xs text-slate-500">
                            {formatDateTime(latestOrder.created_at)} from{" "}
                            {latestOrder.channel || "Online Store"}
                          </p>

                          {/* Line items */}
                          <div className="divide-y divide-slate-100 pt-2 border-t border-slate-100">
                            {Array.isArray(latestOrder.items) && latestOrder.items.length > 0 ? (
                              latestOrder.items.map((item, idx) => (
                                <div
                                  key={item.id || idx}
                                  className="py-2.5 flex items-center justify-between gap-4"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    {item.image_url ? (
                                      <img
                                        src={item.image_url}
                                        alt={item.product_name}
                                        className="w-12 h-12 rounded-lg border border-slate-200 object-cover bg-slate-50 flex-shrink-0"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                                        <svg
                                          className="w-6 h-6"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="1.5"
                                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                          />
                                        </svg>
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                                        {item.product_name}
                                      </p>
                                      {item.sku && (
                                        <p className="text-[11px] text-slate-400">{item.sku}</p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-6 text-xs text-slate-700 flex-shrink-0">
                                    <span className="text-slate-500">x {item.quantity}</span>
                                    <span className="font-semibold text-slate-900 w-16 text-right">
                                      ${parseFloat(item.unit_price || 0).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-400 py-2">
                                No product details recorded for this order.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CARD 2: BLOCKS SECTION */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
                    <div className="flex items-center gap-2 mb-3">
                      <svg
                        className="w-4 h-4 text-slate-700"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                        />
                      </svg>
                      <h2 className="text-sm font-bold text-slate-900">Blocks</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowBlocksModal(true)}
                      className="w-full py-2.5 px-4 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 rounded-xl transition text-center shadow-2xs"
                    >
                      + Block
                    </button>
                  </div>

                  {/* CARD 3: TIMELINE SECTION */}
                  <div className="space-y-4">
                    <h2 className="text-base font-bold text-slate-900">Timeline</h2>

                    {/* Staff Comment Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#0080FF] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs">
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
                              <button
                                type="button"
                                className="hover:text-slate-600 transition"
                                title="Add emoji"
                              >
                                😊
                              </button>
                              <button
                                type="button"
                                className="hover:text-slate-600 font-bold text-xs transition"
                                title="Mention staff"
                              >
                                @
                              </button>
                              <button
                                type="button"
                                className="hover:text-slate-600 font-bold text-xs transition"
                                title="Reference order"
                              >
                                #
                              </button>
                              <button
                                type="button"
                                className="hover:text-slate-600 transition"
                                title="Attach file"
                              >
                                📎
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={handlePostComment}
                              disabled={!commentInput.trim() || submittingComment}
                              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed bg-slate-200 text-slate-700 hover:bg-slate-300"
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
                                  <div className="absolute left-[5px] top-1.5 w-2 h-2 rounded-full bg-slate-600 ring-4 ring-[#F1F2F4]" />

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
                                        ) : ev.type === "order_placed" ? (
                                          <div>
                                            <span>This customer placed test order </span>
                                            <span className="font-bold text-slate-900 bg-slate-200 px-1.5 py-0.5 rounded text-[11px]">
                                              #{ev.order_number}
                                            </span>
                                            <span> on {ev.channel || "Online Store"}.</span>
                                          </div>
                                        ) : ev.type === "order_email" ? (
                                          <div>
                                            <div>
                                              <span>Order Confirmation email for test order </span>
                                              <span className="font-bold text-slate-900 bg-slate-200 px-1.5 py-0.5 rounded text-[11px]">
                                                #{ev.order_number}
                                              </span>
                                              <span> sent to this customer ({ev.email}).</span>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const match = orders.find(
                                                  (o) => o.order_number === ev.order_number
                                                );
                                                setActiveEmailOrder(
                                                  match || {
                                                    order_number: ev.order_number,
                                                    total: "0.00",
                                                    items: [],
                                                  }
                                                );
                                              }}
                                              className="mt-1.5 px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                                            >
                                              View email
                                            </button>
                                          </div>
                                        ) : (
                                          <span>{ev.description || ev.title}</span>
                                        )}
                                      </div>

                                      <span className="text-[11px] text-slate-400 whitespace-nowrap flex-shrink-0">
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
                        <p className="text-xs text-slate-400 pl-6">No recorded activity yet.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT SIDEBAR COLUMN (1/3 width) */}
                <div className="space-y-6">
                  {/* CARD 1: CONTACT INFORMATION */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between" ref={contactMenuRef}>
                      <h2 className="text-sm font-bold text-slate-900">Contact information</h2>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsContactMenuOpen((v) => !v)}
                          className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 rounded transition"
                        >
                          •••
                        </button>
                        {isContactMenuOpen && (
                          <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-30 text-xs">
                            <button
                              type="button"
                              onClick={handleOpenEditCustomer}
                              className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700"
                            >
                              Edit contact
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Email link with copy icon */}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`mailto:${customer.email}`}
                          className="text-xs sm:text-sm font-semibold text-blue-600 hover:underline truncate"
                        >
                          {customer.email || "No email address"}
                        </a>
                        {customer.email && (
                          <button
                            type="button"
                            onClick={() => handleCopyEmail(customer.email)}
                            className="text-slate-400 hover:text-slate-700 transition"
                            title="Copy email"
                          >
                            {copiedEmail ? (
                              <span className="text-[10px] text-emerald-600 font-bold">✓</span>
                            ) : (
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                                />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Will receive notifications in English
                      </p>
                    </div>

                    {/* Phone number */}
                    {(customer.phone || defaultAddress?.phone) && (
                      <div className="pt-2 border-t border-slate-100 text-xs text-slate-700">
                        <span className="text-slate-400">Phone: </span>
                        <span>{customer.phone || defaultAddress?.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* CARD 2: DEFAULT ADDRESS */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-slate-900">Default address</h2>
                      {defaultAddress && canManage && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAddress(defaultAddress);
                            setAddressModalError("");
                            setShowAddressModal(true);
                          }}
                          className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline"
                        >
                          Manage
                        </button>
                      )}
                    </div>

                    {defaultAddress ? (
                      <div className="text-xs text-slate-700 space-y-1 leading-relaxed">
                        <div className="font-semibold text-slate-900">
                          {[defaultAddress.first_name, defaultAddress.last_name]
                            .filter(Boolean)
                            .join(" ") || customerName}
                        </div>
                        {defaultAddress.company && <div>{defaultAddress.company}</div>}
                        <div>{defaultAddress.address_line_1}</div>
                        {defaultAddress.address_line_2 && (
                          <div>{defaultAddress.address_line_2}</div>
                        )}
                        <div>
                          {[defaultAddress.city, defaultAddress.state, defaultAddress.postal_code]
                            .filter(Boolean)
                            .join(" ")}
                        </div>
                        <div>{defaultAddress.country}</div>
                        {defaultAddress.phone && (
                          <div className="text-slate-500 mt-1">{defaultAddress.phone}</div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-slate-500 mb-3">No address provided</p>
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAddress(null);
                              setAddressModalError("");
                              setShowAddressModal(true);
                            }}
                            className="text-xs font-semibold text-blue-600 hover:underline"
                          >
                            + Add address
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* CARD 3: MARKETING SUBSCRIPTIONS */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-2">
                    <h2 className="text-sm font-bold text-slate-900">Marketing subscriptions</h2>
                    <p className="text-xs font-medium text-slate-700">
                      {customer.email_subscription_status === "subscribed"
                        ? "Email"
                        : "Not subscribed to any channels"}
                    </p>
                  </div>

                  {/* CARD 4: TAX DETAILS */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-2">
                    <h2 className="text-sm font-bold text-slate-900">Tax details</h2>
                    <p className="text-xs text-slate-700">Collect tax</p>
                  </div>

                  {/* CARD 5: STORE CREDIT */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-slate-900">Store credit</h2>
                      <button
                        type="button"
                        onClick={() => showToast("Store credit balance is $0.00.")}
                        className="text-slate-400 hover:text-slate-700 transition"
                        title="Edit store credit"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">None</p>
                  </div>

                  {/* CARD 6: TAGS */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-slate-900">Tags</h2>
                      <button
                        type="button"
                        onClick={() => setShowTagInput((v) => !v)}
                        className="text-slate-400 hover:text-slate-700 transition font-bold"
                        title="Add tag"
                      >
                        ⊕
                      </button>
                    </div>

                    {/* Tag list */}
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          <span>{t}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(t)}
                            className="text-slate-400 hover:text-slate-700"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>

                    {showTagInput && (
                      <div className="pt-2">
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleAddTag}
                          placeholder="Type tag & press enter"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-slate-500 bg-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* CARD 7: NOTES */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-slate-900">Notes</h2>
                      <button
                        type="button"
                        onClick={() => {
                          setNotesInput(notes);
                          setIsEditingNotes((v) => !v);
                        }}
                        className="text-slate-400 hover:text-slate-700 transition"
                        title="Edit note"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </button>
                    </div>

                    {isEditingNotes ? (
                      <div className="space-y-2">
                        <textarea
                          value={notesInput}
                          onChange={(e) => setNotesInput(e.target.value)}
                          rows={3}
                          placeholder="Add customer note..."
                          className="w-full p-2.5 text-xs rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-slate-500 bg-white"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setIsEditingNotes(false)}
                            className="px-3 py-1 text-xs text-slate-600 hover:text-slate-900 font-medium"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveNotes}
                            className="px-3 py-1 text-xs font-semibold bg-[#0B1020] text-white rounded-md hover:bg-slate-800"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap">
                        {notes || "None"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODAL 1: VIEW EMAIL MODAL */}
          {activeEmailOrder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
              <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Order Confirmation email</h3>
                  <button
                    type="button"
                    onClick={() => setActiveEmailOrder(null)}
                    className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-600 space-y-1">
                    <div>
                      <span className="font-semibold text-slate-800">Subject: </span>
                      Order #{activeEmailOrder.order_number} confirmed
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">From: </span>
                      Store Notifications &lt;store@vendra.com&gt;
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">To: </span>
                      {customer?.email}
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-6 space-y-4 bg-white">
                    <div className="border-b border-slate-100 pb-4">
                      <h4 className="text-lg font-bold text-slate-900">
                        Thank you for your purchase!
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Hi {customer?.first_name || "there"}, we're getting your order ready to be
                        shipped. We will notify you when it has been sent.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="font-semibold text-slate-800">
                        Order #{activeEmailOrder.order_number}
                      </div>
                      <div className="divide-y divide-slate-100">
                        {Array.isArray(activeEmailOrder.items) &&
                        activeEmailOrder.items.length > 0 ? (
                          activeEmailOrder.items.map((it, i) => (
                            <div key={i} className="py-2 flex justify-between items-center text-xs">
                              <span className="text-slate-800 font-medium">
                                {it.product_name}{" "}
                                <span className="text-slate-400">× {it.quantity}</span>
                              </span>
                              <span className="font-semibold text-slate-900">
                                ${parseFloat(it.total || it.unit_price || 0).toFixed(2)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="py-2 text-slate-500">Test items included in order</div>
                        )}
                      </div>
                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-bold text-sm text-slate-900">
                        <span>Total:</span>
                        <span>${parseFloat(activeEmailOrder.total || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveEmailOrder(null)}
                    className="px-4 py-2 text-xs font-semibold bg-[#0B1020] text-white rounded-lg hover:bg-slate-800 transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL 2: BLOCKS MODAL */}
          {showBlocksModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
              <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-xl p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-900">Customer Blocks</h3>
                <p className="text-xs text-slate-500">
                  Custom customer blocks allow displaying app extensions, loyalty data, and custom
                  metadata directly on the profile.
                </p>
                <button
                  type="button"
                  onClick={() => setShowBlocksModal(false)}
                  className="w-full py-2 text-xs font-semibold bg-[#0B1020] text-white rounded-xl hover:bg-slate-800 transition"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* MODAL 3: EDIT CUSTOMER MODAL */}
          {showEditCustomerModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
              <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">Edit Customer</h3>
                  <button
                    type="button"
                    onClick={() => setShowEditCustomerModal(false)}
                    className="text-slate-400 hover:text-slate-700 text-lg font-bold"
                  >
                    ✕
                  </button>
                </div>

                {editCustomerError && (
                  <div className="p-3 text-xs bg-red-50 text-red-600 rounded-lg border border-red-200">
                    {editCustomerError}
                  </div>
                )}

                <form onSubmit={handleSaveCustomerEdit} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">First name</label>
                    <input
                      type="text"
                      value={editFormData.first_name}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, first_name: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-slate-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Last name</label>
                    <input
                      type="text"
                      value={editFormData.last_name}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, last_name: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-slate-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Email address</label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-slate-500 bg-white"
                    />
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editFormData.email_subscription_status === "subscribed"}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            email_subscription_status: e.target.checked
                              ? "subscribed"
                              : "not_subscribed",
                          })
                        }
                        className="h-4 w-4 rounded border-slate-300 accent-[#0B1020]"
                      />
                      <span className="text-slate-700 font-medium">
                        Customer agreed to receive marketing emails
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowEditCustomerModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingCustomer}
                      className="px-4 py-2 text-xs font-semibold bg-[#0B1020] text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 transition"
                    >
                      {savingCustomer ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL 4: DELETE CUSTOMER CONFIRMATION MODAL */}
          {showDeleteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
              <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-900">Delete customer?</h3>
                <p className="text-xs text-slate-500">
                  Are you sure you want to delete {customerName}? This action cannot be undone.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDeleteCustomer}
                    className="px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition"
                  >
                    {isDeleting ? "Deleting..." : "Delete customer"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL 5: ADDRESS MODAL */}
          {showAddressModal && (
            <AddressModal
              isOpen={showAddressModal}
              onClose={() => {
                setShowAddressModal(false);
                setEditingAddress(null);
              }}
              onSave={handleSaveAddress}
              initialData={editingAddress}
              title={editingAddress ? "Edit Default Address" : "Add Default Address"}
              saving={savingAddress}
              apiError={addressModalError}
            />
          )}
        </main>
      </div>
    </div>
  );
}
