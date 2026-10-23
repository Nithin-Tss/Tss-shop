import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar, { AdminHeader, NavIcon, PageIcon } from "@/components/AdminSidebar";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { useCan, useSession } from "@/lib/auth";
import AddressModal from "@/components/AddressModal";
import DeleteAddressModal from "@/components/DeleteAddressModal";

export default function AdminCustomers() {
  const navigate = useNavigate();
  const session = useSession();
  const currentStoreId = session?.storeId;
  const canManage = useCan("customers.manage");
  const canDelete = useCan("customers.delete") || canManage;
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isSelectDropdownOpen, setIsSelectDropdownOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const moreMenuRef = useRef(null);
  const selectDropdownRef = useRef(null);

  // Customer Address Management State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerAddresses, setCustomerAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [addressSuccessMsg, setAddressSuccessMsg] = useState("");
  const [addressErrorMsg, setAddressErrorMsg] = useState("");
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [deletingAddress, setDeletingAddress] = useState(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [deletingAddressLoading, setDeletingAddressLoading] = useState(false);
  const [addressModalError, setAddressModalError] = useState("");

  const fetchCustomerAddresses = async (customerId) => {
    if (!customerId) return;
    setLoadingAddresses(true);
    const res = await apiGet(`/api/v1/customers/addresses/?customer=${customerId}`);
    if (res.ok && Array.isArray(res.data)) {
      setCustomerAddresses(res.data);
    } else {
      setCustomerAddresses([]);
    }
    setLoadingAddresses(false);
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setAddressSuccessMsg("");
    setAddressErrorMsg("");
    fetchCustomerAddresses(customer.id);
  };

  const handleCloseCustomerDrawer = () => {
    setSelectedCustomer(null);
    setCustomerAddresses([]);
    setAddressSuccessMsg("");
    setAddressErrorMsg("");
  };

  const handleOpenAddAddress = () => {
    if (!canManage) return;
    setEditingAddress(null);
    setAddressModalError("");
    setShowAddressModal(true);
  };

  const handleOpenEditAddress = (addr) => {
    if (!canManage) return;
    setEditingAddress(addr);
    setAddressModalError("");
    setShowAddressModal(true);
  };

  const handleSaveAddress = async (formData) => {
    if (!canManage || !selectedCustomer) return;
    setSavingAddress(true);
    setAddressModalError("");

    const isEdit = Boolean(editingAddress);
    const payload = {
      ...formData,
      customer: selectedCustomer.id,
    };

    const url = isEdit
      ? `/api/v1/customers/addresses/${editingAddress.id}/`
      : "/api/v1/customers/addresses/";

    const res = isEdit ? await apiPatch(url, payload) : await apiPost(url, payload);

    setSavingAddress(false);

    if (res.ok) {
      setShowAddressModal(false);
      setEditingAddress(null);
      setAddressSuccessMsg(
        isEdit ? "Address updated successfully." : "Address added successfully."
      );
      setAddressErrorMsg("");
      fetchCustomerAddresses(selectedCustomer.id);
      fetchCustomers(searchQuery);
    } else {
      const err =
        res.formError ||
        (res.fieldErrors && Object.values(res.fieldErrors)[0]) ||
        "Failed to save address.";
      setAddressModalError(err);
    }
  };

  const handleOpenDeleteAddress = (addr) => {
    if (!canManage) return;
    setDeletingAddress(addr);
  };

  const handleConfirmDeleteAddress = async () => {
    if (!canManage || !deletingAddress || !selectedCustomer) return;
    setDeletingAddressLoading(true);
    const res = await apiDelete(`/api/v1/customers/addresses/${deletingAddress.id}/`);
    setDeletingAddressLoading(false);
    setDeletingAddress(null);

    if (res.ok) {
      setAddressSuccessMsg("Address deleted successfully.");
      setAddressErrorMsg("");
      fetchCustomerAddresses(selectedCustomer.id);
      fetchCustomers(searchQuery);
    } else {
      setAddressErrorMsg(res.error || "Failed to delete address.");
    }
  };

  const handleSetDefaultAddress = async (addr) => {
    if (!canManage || !selectedCustomer) return;
    setAddressSuccessMsg("");
    setAddressErrorMsg("");
    const res = await apiPost(`/api/v1/customers/addresses/${addr.id}/set-default/`, {});
    if (res.ok) {
      setAddressSuccessMsg(`Default ${addr.address_type || "shipping"} address updated.`);
      fetchCustomerAddresses(selectedCustomer.id);
      fetchCustomers(searchQuery);
    } else {
      setAddressErrorMsg(res.formError || res.error || "Failed to set default address.");
    }
  };

  const [customerForm, setCustomerForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    emailSubscriptionStatus: "subscribed",
    city: "",
    state: "",
    country: "Australia",
  });

  const fetchCustomers = async (search = "") => {
    setLoading(true);
    const url = search.trim()
      ? `/api/v1/customers/?search=${encodeURIComponent(search.trim())}`
      : "/api/v1/customers/";

    const res = await apiGet(url);
    if (res.ok && Array.isArray(res.data)) {
      setCustomers(res.data);
    } else if (res.ok && Array.isArray(res.data?.results)) {
      setCustomers(res.data.results);
    } else {
      setCustomers([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    setSelectedIds(new Set());
    setSelectedCustomer(null);
    const timer = setTimeout(() => {
      fetchCustomers(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, currentStoreId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setIsMoreMenuOpen(false);
      }
      if (selectDropdownRef.current && !selectDropdownRef.current.contains(event.target)) {
        setIsSelectDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const allSelected = customers.length > 0 && selectedIds.size === customers.length;
  const isIndeterminate = selectedIds.size > 0 && !allSelected;

  const displayedCustomers =
    showOnlySelected && selectedIds.size > 0
      ? customers.filter((c) => selectedIds.has(c.id))
      : customers;

  const handleMasterCheckboxClick = () => {
    if (selectedIds.size > 0) {
      setSelectedIds(new Set());
      setShowOnlySelected(false);
    } else {
      setSelectedIds(new Set(customers.map((c) => c.id)));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const handleBulkAction = (actionName) => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    const s = count > 1 ? "customers" : "customer";
    if (actionName === "Bulk edit") {
      showToast(`Bulk edit for ${count} ${s} triggered.`);
    } else if (actionName === "Merge customer") {
      showToast(`Merge action for ${count} ${s} triggered.`);
    } else if (actionName === "Add tags") {
      showToast(`Add tags for ${count} ${s} triggered.`);
    } else if (actionName === "Remove tags") {
      showToast(`Remove tags for ${count} ${s} triggered.`);
    } else if (actionName === "Add to company") {
      showToast(`Add ${count} ${s} to company triggered.`);
    }
  };

  const handleExport = () => {
    if (!customers.length) {
      showToast("No customers to export.");
      return;
    }
    const headers = [
      "First Name",
      "Last Name",
      "Email",
      "Subscription Status",
      "Location",
      "Orders",
      "Amount Spent",
    ];
    const rows = customers.map((c) => [
      c.first_name || "",
      c.last_name || "",
      c.email || "",
      c.email_subscription_status || "",
      c.location || [c.city, c.state, c.country].filter(Boolean).join(", ") || "",
      c.orders_count || 0,
      c.amount_spent || "0.00",
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `customers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Customers exported successfully.");
  };

  const handleImport = () => {
    showToast("Customer import feature ready.");
  };

  const handleConfirmDeleteCustomers = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    setDeleteError("");

    const idsToDelete = Array.from(selectedIds);
    let failedCount = 0;
    let lastErrorMessage = "";
    const deletedIds = new Set();

    for (const id of idsToDelete) {
      const res = await apiDelete(`/api/v1/customers/${id}/`);
      if (res.ok) {
        deletedIds.add(id);
      } else {
        failedCount++;
        lastErrorMessage = res.error || "Failed to delete customer.";
      }
    }

    setIsDeleting(false);

    if (deletedIds.size > 0) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        deletedIds.forEach((id) => next.delete(id));
        return next;
      });
      fetchCustomers(searchQuery);
    }

    if (failedCount === 0) {
      setIsDeleteDialogOpen(false);
      setShowOnlySelected(false);
      showToast(
        deletedIds.size > 1
          ? `Successfully deleted ${deletedIds.size} customers.`
          : "Customer deleted successfully."
      );
    } else {
      setDeleteError(
        idsToDelete.length > 1
          ? `Failed to delete ${failedCount} of ${idsToDelete.length} customers: ${lastErrorMessage}`
          : lastErrorMessage
      );
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!customerForm.email.trim()) {
      setError("Customer email is required.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      first_name: customerForm.firstName.trim(),
      last_name: customerForm.lastName.trim(),
      email: customerForm.email.trim(),
      email_subscription_status: customerForm.emailSubscriptionStatus,
      city: customerForm.city.trim(),
      state: customerForm.state.trim(),
      country: customerForm.country.trim(),
    };

    const res = await apiPost("/api/v1/customers/", payload);
    setSaving(false);

    if (res.ok) {
      setShowAddModal(false);
      setCustomerForm({
        firstName: "",
        lastName: "",
        email: "",
        emailSubscriptionStatus: "subscribed",
        city: "",
        state: "",
        country: "Australia",
      });
      fetchCustomers(searchQuery);
    } else {
      setError(
        res.formError ||
          res.fieldErrors?.email ||
          res.fieldErrors?.first_name ||
          "Failed to create customer."
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3FF] text-[#0B1020]">
      <AdminHeader />

      {/* 2. BODY LAYOUT */}
      <div className="flex min-h-[calc(100vh-72px)]">
        {/* SIDEBAR */}
        <AdminSidebar />

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-full overflow-x-hidden">
          {/* TITLE & TOP ACTION BAR */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h1 className="flex items-center gap-2.5 text-[22px] font-bold text-[#0B1020]">
              <PageIcon name="customers" />
              Customers
            </h1>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="rounded-lg bg-white border border-slate-300 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              >
                Export
              </button>
              <button
                type="button"
                onClick={handleImport}
                className="rounded-lg bg-white border border-slate-300 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              >
                Import
              </button>
              {canManage && (
                <Link
                  to="/admin/online-store/customers/new"
                  className="flex items-center gap-2 rounded-lg bg-[#0B1020] px-4 py-1.5 text-xs sm:text-sm font-semibold text-white hover:bg-[#1C2347] transition shadow-2xs"
                >
                  Add customer
                </Link>
              )}
            </div>
          </div>

          {/* DESCRIBE YOUR SEGMENT ROW */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-2xs mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#7C3AED] text-white">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.38-1 1.72V7h2a5 5 0 0 1 5 5v1.28c.6.34 1 .98 1 1.72a2 2 0 1 1-4 0v-.28A5 5 0 0 1 15 10H9a5 5 0 0 1-2 4.72V15a2 2 0 1 1-4 0c0-.74.4-1.38 1-1.72V12a5 5 0 0 1 5-5h2V5.72A2 2 0 0 1 12 2zm-3 9a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
                </svg>
              </div>
              <span className="text-xs sm:text-sm text-slate-600 font-medium">
                Describe your segment
              </span>
            </div>
            <button
              type="button"
              className="text-slate-400 hover:text-slate-600 p-0.5"
              aria-label="Segment options"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="m19.5 8.25-7.5 7.5-7.5-7.5"
                />
              </svg>
            </button>
          </div>

          {/* CUSTOMERS TABLE CARD */}
          <section className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-visible">
            {/* SEARCH & CONTROLS HEADER */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
              <div className="flex items-center gap-2.5 w-full sm:w-96 text-sm">
                <svg
                  className="h-4 w-4 text-slate-400 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customers"
                  className="w-full bg-transparent outline-none text-xs sm:text-sm text-[#0B1020] placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                title="Table columns"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition shrink-0"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.75}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 4.5v15m6-15v15m-10.5-15h15a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-15a1.5 1.5 0 0 1-1.5-1.5v-12a1.5 1.5 0 0 1 1.5-1.5Z"
                  />
                </svg>
              </button>
            </div>

            {/* RESPONSIVE TABLE */}
            <div className="overflow-x-auto overflow-y-visible min-h-[360px]">
              <table className="w-full border-collapse text-left text-sm text-[#0B1020]">
                <thead>
                  {selectedIds.size > 0 ? (
                    /* BULK ACTIONS TOOLBAR ROW */
                    <tr className="border-b border-slate-200 bg-white">
                      {/* Master Checkbox */}
                      <th className="py-2.5 pl-5 pr-3 w-10 align-middle">
                        <button
                          type="button"
                          onClick={handleMasterCheckboxClick}
                          className="group flex h-4 w-4 items-center justify-center rounded transition-colors focus:outline-none"
                          aria-label="Toggle selection"
                        >
                          {isIndeterminate ? (
                            <span className="flex h-4 w-4 items-center justify-center rounded bg-[#0B1020] text-white shadow-2xs">
                              <span className="h-0.5 w-2 rounded-full bg-white" />
                            </span>
                          ) : allSelected ? (
                            <span className="flex h-4 w-4 items-center justify-center rounded bg-[#0B1020] text-white shadow-2xs">
                              <svg
                                className="h-3 w-3"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </span>
                          ) : (
                            <span className="h-4 w-4 rounded border border-slate-300 bg-white transition-colors group-hover:border-slate-500" />
                          )}
                        </button>
                      </th>

                      {/* Bulk actions and toggle spanning remaining columns */}
                      <th colSpan={6} className="py-2 pr-6 font-normal">
                        <div className="flex items-center justify-between gap-3">
                          {/* Left Action Buttons */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Selected Count with Dropdown */}
                            <div className="relative inline-block" ref={selectDropdownRef}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsSelectDropdownOpen((prev) => !prev);
                                }}
                                className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs sm:text-[13px] font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
                                aria-expanded={isSelectDropdownOpen}
                              >
                                <span>{selectedIds.size} selected</span>
                                <svg
                                  className={`h-3 w-3 text-slate-500 transition-transform duration-150 ${
                                    isSelectDropdownOpen ? "rotate-180" : ""
                                  }`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="m6 9 6 6 6-6"
                                  />
                                </svg>
                              </button>

                              {isSelectDropdownOpen && (
                                <div
                                  className="absolute left-0 top-full mt-1.5 z-50 min-w-[200px] rounded-xl border border-slate-200 bg-white p-1 text-left shadow-lg animate-in fade-in"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedIds(new Set(customers.map((c) => c.id)));
                                      setIsSelectDropdownOpen(false);
                                    }}
                                    className="flex w-full items-center rounded-lg px-3 py-2 text-xs sm:text-[13px] text-slate-700 transition-colors hover:bg-slate-100"
                                  >
                                    Select all ({customers.length})
                                  </button>
                                  <div className="my-1 border-t border-slate-100" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedIds(new Set());
                                      setShowOnlySelected(false);
                                      setIsSelectDropdownOpen(false);
                                    }}
                                    className="flex w-full items-center rounded-lg px-3 py-2 text-xs sm:text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50"
                                  >
                                    Deselect all
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Bulk edit button */}
                            <button
                              type="button"
                              onClick={() => handleBulkAction("Bulk edit")}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs sm:text-[13px] font-medium text-slate-700 shadow-2xs hover:bg-slate-50 active:bg-slate-100 transition-colors"
                            >
                              Bulk edit
                            </button>

                            {/* Merge customer button */}
                            <button
                              type="button"
                              onClick={() => handleBulkAction("Merge customer")}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs sm:text-[13px] font-medium text-slate-700 shadow-2xs hover:bg-slate-50 active:bg-slate-100 transition-colors"
                            >
                              Merge customer
                            </button>

                            {/* Add tags button */}
                            <button
                              type="button"
                              onClick={() => handleBulkAction("Add tags")}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs sm:text-[13px] font-medium text-slate-700 shadow-2xs hover:bg-slate-50 active:bg-slate-100 transition-colors"
                            >
                              Add tags
                            </button>

                            {/* Three-dot menu button & popover */}
                            <div className="relative inline-block" ref={moreMenuRef}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsMoreMenuOpen((prev) => !prev);
                                }}
                                className={`inline-flex h-[28px] w-[32px] items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 active:bg-slate-100 transition-colors ${
                                  isMoreMenuOpen ? "bg-slate-100 border-slate-400" : ""
                                }`}
                                aria-label="More bulk actions"
                                aria-expanded={isMoreMenuOpen}
                              >
                                <span className="tracking-tight text-base leading-none">⋯</span>
                              </button>

                              {/* Popover Dropdown */}
                              {isMoreMenuOpen && (
                                <div
                                  className="absolute left-0 top-full mt-1.5 z-50 min-w-[185px] rounded-xl border border-slate-200 bg-white p-1 text-left shadow-[0_4px_20px_rgba(0,0,0,0.12)] animate-in fade-in zoom-in-95 duration-100"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsMoreMenuOpen(false);
                                      handleBulkAction("Remove tags");
                                    }}
                                    className="flex w-full items-center rounded-lg px-3.5 py-2 text-left text-xs sm:text-[13px] text-slate-700 transition-colors hover:bg-slate-100"
                                  >
                                    Remove tags
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsMoreMenuOpen(false);
                                      handleBulkAction("Add to company");
                                    }}
                                    className="flex w-full items-center rounded-lg px-3.5 py-2 text-left text-xs sm:text-[13px] text-slate-700 transition-colors hover:bg-slate-100"
                                  >
                                    Add to company
                                  </button>

                                  <button
                                    type="button"
                                    disabled={!canDelete}
                                    onClick={() => {
                                      setIsMoreMenuOpen(false);
                                      setDeleteError("");
                                      setIsDeleteDialogOpen(true);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-3.5 py-2 text-left text-xs sm:text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                                  >
                                    <svg
                                      className="h-4 w-4 shrink-0 text-red-500"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={1.75}
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                                      />
                                    </svg>
                                    <span>Delete customer</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right: Show all selected switch */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={showOnlySelected}
                              onClick={() => setShowOnlySelected((prev) => !prev)}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                showOnlySelected ? "bg-[#0B1020]" : "bg-slate-300"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                  showOnlySelected ? "translate-x-4" : "translate-x-0"
                                }`}
                              />
                            </button>
                            <span
                              onClick={() => setShowOnlySelected((prev) => !prev)}
                              className="cursor-pointer select-none text-xs sm:text-[13px] font-medium text-slate-700"
                            >
                              Show all selected
                            </span>
                          </div>
                        </div>
                      </th>
                    </tr>
                  ) : (
                    /* REGULAR COLUMN HEADERS */
                    <tr className="border-b border-[#E4DEFB] bg-[#FAF8FF] text-xs font-semibold text-slate-700 whitespace-nowrap select-none">
                      <th className="py-3.5 pl-5 pr-3 w-10">
                        <button
                          type="button"
                          onClick={handleMasterCheckboxClick}
                          className="group flex h-4 w-4 items-center justify-center rounded transition-colors focus:outline-none"
                          aria-label="Select all"
                        >
                          <span className="h-4 w-4 rounded border border-slate-300 bg-white transition-colors group-hover:border-slate-500" />
                        </button>
                      </th>
                      <th className="py-3.5 px-3">Customer name</th>
                      <th className="py-3.5 px-3">Email subscription</th>
                      <th className="py-3.5 px-3">Location</th>
                      <th className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1 cursor-pointer">
                          Orders <span className="text-[10px]">↑</span>
                        </span>
                      </th>
                      <th className="py-3.5 px-3">Amount spent</th>
                      <th className="py-3.5 pl-3 pr-6 text-right">Addresses</th>
                    </tr>
                  )}
                </thead>

                <tbody className="divide-y divide-[#E4DEFB]">
                  {loading ? (
                    // SKELETON LOADING
                    [...Array(6)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-4 pl-5 pr-3">
                          <div className="h-4 w-4 bg-slate-200 rounded" />
                        </td>
                        <td className="py-4 px-3">
                          <div className="h-4 w-32 bg-slate-200 rounded" />
                        </td>
                        <td className="py-4 px-3">
                          <div className="h-5 w-24 bg-slate-200 rounded-full" />
                        </td>
                        <td className="py-4 px-3">
                          <div className="h-4 w-40 bg-slate-100 rounded" />
                        </td>
                        <td className="py-4 px-3">
                          <div className="h-4 w-6 bg-slate-200 rounded" />
                        </td>
                        <td className="py-4 pl-3 pr-6 text-right">
                          <div className="h-4 w-12 bg-slate-200 rounded ml-auto" />
                        </td>
                      </tr>
                    ))
                  ) : displayedCustomers.length > 0 ? (
                    // DYNAMIC DATA
                    displayedCustomers.map((c) => {
                      const isSelected = selectedIds.has(c.id);
                      const fullName =
                        [c.first_name, c.last_name].filter(Boolean).join(" ") || c.name || c.email;

                      const isSubscribed = c.email_subscription_status === "subscribed";
                      const isUnsubscribed = c.email_subscription_status === "unsubscribed";

                      return (
                        <tr
                          key={c.id}
                          className={`transition-colors whitespace-nowrap hover:bg-[#F9FAFC] ${
                            isSelected ? "bg-[#F3F0FF]" : ""
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3.5 pl-5 pr-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleSelect(c.id);
                              }}
                              className="group flex h-4 w-4 items-center justify-center rounded transition-colors focus:outline-none"
                              aria-label={isSelected ? "Deselect customer" : "Select customer"}
                            >
                              {isSelected ? (
                                <span className="flex h-4 w-4 items-center justify-center rounded bg-[#0B1020] text-white shadow-2xs">
                                  <svg
                                    className="h-3 w-3"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </span>
                              ) : (
                                <span className="h-4 w-4 rounded border border-slate-300 bg-white transition-colors group-hover:border-slate-500" />
                              )}
                            </button>
                          </td>

                          {/* Customer Name */}
                          <td className="py-3.5 px-3">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/admin/online-store/customers/${c.id}`, {
                                  state: { customer: c, allCustomers: displayedCustomers },
                                })
                              }
                              className="font-semibold text-slate-900 hover:text-violet-600 hover:underline cursor-pointer text-left"
                            >
                              {fullName}
                            </button>
                            {c.email && c.email !== fullName && (
                              <div className="text-[11px] text-slate-400">{c.email}</div>
                            )}
                          </td>

                          {/* Email subscription */}
                          <td className="py-3.5 px-3">
                            {isSubscribed ? (
                              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-[#D1FADF] text-[#027A48]">
                                Subscribed
                              </span>
                            ) : isUnsubscribed ? (
                              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-[#FEF0C7] text-[#B54708]">
                                Unsubscribed
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-[#F2F4F7] text-[#475467]">
                                Not subscribed
                              </span>
                            )}
                          </td>

                          {/* Location */}
                          <td className="py-3.5 px-3 text-slate-700 text-xs sm:text-sm">
                            {c.location ||
                              [c.city, c.state, c.country].filter(Boolean).join(", ") ||
                              "—"}
                          </td>

                          {/* Orders count */}
                          <td className="py-3.5 px-3 text-slate-800">{c.orders_count ?? 0}</td>

                          {/* Amount spent */}
                          <td className="py-3.5 px-3 font-medium text-slate-900">
                            ${parseFloat(c.amount_spent || 0).toFixed(2)}
                          </td>

                          {/* Addresses Action */}
                          <td className="py-3.5 pl-3 pr-6 text-right">
                            <button
                              type="button"
                              onClick={() => handleSelectCustomer(c)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                            >
                              <NavIcon name="location" className="h-4 w-4" />
                              <span>Manage addresses</span>
                              {Array.isArray(c.addresses) && c.addresses.length > 0 && (
                                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white text-slate-800 font-bold border border-slate-200">
                                  {c.addresses.length}
                                </span>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    // EMPTY STATE
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <NavIcon name="customers" className="h-8 w-8 text-slate-300" />
                          <p className="text-sm font-medium text-slate-700">No customers found</p>
                          <p className="text-xs text-slate-400 max-w-sm">
                            {showOnlySelected && selectedIds.size > 0
                              ? "No selected customers to display."
                              : searchQuery
                                ? `No customers matching "${searchQuery}".`
                                : "Customers who place orders or are added will appear here."}
                          </p>
                          {canManage && (
                            <Link
                              to="/admin/online-store/customers/new"
                              className="mt-3 px-4 py-2 rounded-lg bg-[#0B1020] text-white text-xs font-semibold hover:bg-slate-800 transition"
                            >
                              Add customer
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {/* ADD CUSTOMER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add customer</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={customerForm.firstName}
                    onChange={(e) =>
                      setCustomerForm({ ...customerForm, firstName: e.target.value })
                    }
                    placeholder="e.g. John"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-slate-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={customerForm.lastName}
                    onChange={(e) => setCustomerForm({ ...customerForm, lastName: e.target.value })}
                    placeholder="e.g. Doe"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-slate-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  placeholder="e.g. john.doe@example.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-slate-500 text-sm"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Email Subscription</label>
                <select
                  value={customerForm.emailSubscriptionStatus}
                  onChange={(e) =>
                    setCustomerForm({
                      ...customerForm,
                      emailSubscriptionStatus: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-slate-500 text-sm bg-white"
                >
                  <option value="subscribed">Subscribed</option>
                  <option value="not_subscribed">Not subscribed</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={customerForm.city}
                    onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
                    placeholder="e.g. Wollert"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-slate-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={customerForm.state}
                    onChange={(e) => setCustomerForm({ ...customerForm, state: e.target.value })}
                    placeholder="e.g. VIC"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-slate-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={customerForm.country}
                    onChange={(e) => setCustomerForm({ ...customerForm, country: e.target.value })}
                    placeholder="e.g. Australia"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-slate-500 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-[#0B1020] disabled:opacity-50 text-white font-semibold"
                >
                  {saving ? "Saving..." : "Save customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SELECTED CUSTOMER ADDRESS MANAGEMENT SLIDE-OVER DRAWER */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0B1020] text-white font-bold text-sm">
                  {[selectedCustomer.first_name?.[0], selectedCustomer.last_name?.[0]]
                    .filter(Boolean)
                    .join("") || "C"}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">
                    {[selectedCustomer.first_name, selectedCustomer.last_name]
                      .filter(Boolean)
                      .join(" ") ||
                      selectedCustomer.name ||
                      "Customer"}
                  </h2>
                  <p className="text-xs text-slate-500">{selectedCustomer.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseCustomerDrawer}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
                title="Close drawer"
              >
                ✕
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Customer Metadata Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Subscription</span>
                  <span className="font-semibold text-slate-800 capitalize mt-0.5 inline-block">
                    {selectedCustomer.email_subscription_status === "subscribed"
                      ? "Subscribed"
                      : "Not subscribed"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Orders</span>
                  <span className="font-semibold text-slate-800 mt-0.5 inline-block">
                    {selectedCustomer.orders_count ?? 0}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Total Spent</span>
                  <span className="font-semibold text-slate-800 mt-0.5 inline-block">
                    ${parseFloat(selectedCustomer.amount_spent || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Feedback Notifications */}
              {addressSuccessMsg && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                  <span>✓ {addressSuccessMsg}</span>
                  <button
                    type="button"
                    onClick={() => setAddressSuccessMsg("")}
                    className="text-emerald-600 hover:text-emerald-900 font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}

              {addressErrorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between">
                  <span>{addressErrorMsg}</span>
                  <button
                    type="button"
                    onClick={() => setAddressErrorMsg("")}
                    className="text-red-500 hover:text-red-800 font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Addresses Section Header */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>Saved Addresses</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                      {customerAddresses.length}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Shipping and billing addresses for this customer.
                  </p>
                </div>

                {canManage ? (
                  <button
                    type="button"
                    onClick={handleOpenAddAddress}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B1020] hover:bg-[#1C2347] text-white text-xs font-semibold transition shadow-xs"
                  >
                    <span>⊕</span>
                    <span>Add address</span>
                  </button>
                ) : (
                  <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                    Read-only (Requires admin access)
                  </span>
                )}
              </div>

              {/* Address List */}
              {loadingAddresses ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded-xl border border-slate-200 p-4 space-y-2 bg-white"
                    >
                      <div className="h-4 w-24 bg-slate-200 rounded" />
                      <div className="h-4 w-40 bg-slate-100 rounded" />
                      <div className="h-4 w-32 bg-slate-100 rounded" />
                    </div>
                  ))}
                </div>
              ) : customerAddresses.length > 0 ? (
                <div className="space-y-3">
                  {customerAddresses.map((addr) => {
                    const recipientName = [addr.first_name, addr.last_name]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <div
                        key={addr.id}
                        className={`rounded-xl border p-4.5 bg-white transition shadow-2xs ${
                          addr.is_default
                            ? "border-slate-400/80 ring-1 ring-slate-400/20"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {/* Header Badges */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wide">
                            {addr.address_type || "Shipping"}
                          </span>

                          {addr.is_default && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span>✓</span> Default
                            </span>
                          )}
                        </div>

                        {/* Recipient info */}
                        {recipientName && (
                          <div className="font-bold text-slate-900 text-sm">{recipientName}</div>
                        )}
                        {addr.company && (
                          <div className="text-xs text-slate-500 font-medium">{addr.company}</div>
                        )}

                        {/* Address Lines */}
                        <div className="text-xs text-slate-700 mt-1.5 leading-relaxed">
                          <div>{addr.address_line_1}</div>
                          {addr.address_line_2 && <div>{addr.address_line_2}</div>}
                          <div>
                            {[addr.city, addr.state, addr.postal_code].filter(Boolean).join(", ")}
                          </div>
                          <div className="font-medium text-slate-800">{addr.country}</div>
                        </div>

                        {addr.phone && (
                          <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                            <span>📞</span>
                            <span>{addr.phone}</span>
                          </div>
                        )}

                        {/* Admin Action Buttons */}
                        {canManage && (
                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                            <div>
                              {!addr.is_default ? (
                                <button
                                  type="button"
                                  onClick={() => handleSetDefaultAddress(addr)}
                                  className="text-xs font-semibold text-violet-600 hover:text-violet-800 hover:underline"
                                >
                                  Set as default
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400 font-medium">
                                  Default address
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEditAddress(addr)}
                                className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md transition"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDeleteAddress(addr)}
                                className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Empty Addresses State */
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center bg-slate-50/50">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-400 mb-2">
                    📍
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">No addresses saved</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    This customer does not have any saved shipping or billing addresses.
                  </p>
                  {canManage && (
                    <button
                      type="button"
                      onClick={handleOpenAddAddress}
                      className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0B1020] text-white text-xs font-semibold hover:bg-slate-800 transition"
                    >
                      <span>⊕</span>
                      <span>Add address</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                type="button"
                onClick={handleCloseCustomerDrawer}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Address Management Modals */}
      <AddressModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onSave={handleSaveAddress}
        initialData={editingAddress}
        title={editingAddress ? "Edit Customer Address" : "Add Customer Address"}
        saving={savingAddress}
        apiError={addressModalError}
      />

      <DeleteAddressModal
        isOpen={Boolean(deletingAddress)}
        onClose={() => setDeletingAddress(null)}
        onConfirm={handleConfirmDeleteAddress}
        address={deletingAddress}
        deleting={deletingAddressLoading}
      />

      {/* TOAST FEEDBACK NOTIFICATION */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-[#0B1020] px-4 py-3 text-sm text-white shadow-xl animate-in slide-in-from-bottom duration-200">
          <span>✓</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* DELETE CUSTOMER CONFIRMATION MODAL */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedIds.size > 1
                      ? `Delete ${selectedIds.size} customers?`
                      : "Delete customer?"}
                  </h3>
                  <p className="text-xs text-slate-500">This action cannot be undone.</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setDeleteError("");
                }}
                className="text-slate-400 hover:text-slate-700 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {selectedIds.size === 1 ? (
                <>
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-slate-900">
                    {(() => {
                      const target = customers.find((c) => selectedIds.has(c.id));
                      return target
                        ? [target.first_name, target.last_name].filter(Boolean).join(" ") ||
                            target.name ||
                            target.email
                        : "this customer";
                    })()}
                  </span>
                  ? This customer and their data will be removed.
                </>
              ) : (
                <>
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-slate-900">
                    {selectedIds.size} selected customers
                  </span>
                  ? Their data will be removed.
                </>
              )}
            </div>

            {deleteError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setDeleteError("");
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting || !canDelete}
                onClick={handleConfirmDeleteCustomers}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>{selectedIds.size > 1 ? "Delete customers" : "Delete customer"}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
