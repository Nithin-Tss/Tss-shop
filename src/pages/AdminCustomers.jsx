import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminSidebar, { AdminHeader, NavIcon, PageIcon } from "@/components/AdminSidebar";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { useCan } from "@/lib/auth";
import AddressModal from "@/components/AddressModal";
import DeleteAddressModal from "@/components/DeleteAddressModal";

export default function AdminCustomers() {
  const canManage = useCan("customers.manage");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
    const timer = setTimeout(() => {
      fetchCustomers(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const allSelected = customers.length > 0 && selectedIds.size === customers.length;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(customers.map((c) => c.id)));
    } else {
      setSelectedIds(new Set());
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
    <div className="min-h-screen bg-[#F7F8FA] text-[#161C2C]">
      <AdminHeader />

      {/* 2. BODY LAYOUT */}
      <div className="flex min-h-[calc(100vh-72px)]">
        {/* SIDEBAR */}
        <AdminSidebar />

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-full overflow-x-hidden">
          {/* TITLE & TOP ACTION BAR */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <h1 className="flex items-center gap-2.5 text-[22px] font-bold text-[#161C2C]">
              <PageIcon name="customers" />
              Customers
            </h1>

            <div className="flex items-center gap-2.5">
              {canManage && (
                <Link
                  to="/admin/online-store/customers/new"
                  className="flex items-center gap-2 rounded-lg bg-[#161C2C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#252E45] transition"
                >
                  Add customer
                </Link>
              )}
            </div>
          </div>

          {/* DESCRIBE YOUR SEGMENT BANNER */}
          <div className="mb-5 rounded-2xl border border-[#E3E7ED] bg-white px-4 py-3 shadow-xs flex items-center justify-between cursor-pointer hover:bg-slate-50/70 transition">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 text-sm">
                👓
              </div>
              <span className="text-sm font-medium text-slate-700">Describe your segment</span>
            </div>
            <span className="text-slate-400 text-sm">⌄</span>
          </div>

          {/* CUSTOMERS TABLE CARD */}
          <section className="rounded-2xl border border-[#E3E7ED] bg-white shadow-sm overflow-hidden">
            {/* SEARCH & CONTROLS HEADER */}
            <div className="flex items-center justify-between gap-3 border-b border-[#E3E7ED] px-4 py-3">
              <div className="flex items-center gap-2 w-full sm:w-80 h-9 rounded-lg border border-[#D8DFE8] bg-white px-3 text-sm">
                <span className="text-slate-400">⌕</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customers"
                  className="w-full bg-transparent outline-none text-xs sm:text-sm text-[#161C2C] placeholder:text-slate-400"
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
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D8DFE8] bg-white text-slate-600 hover:bg-[#F3F6FA] transition shrink-0"
              >
                ▥
              </button>
            </div>

            {/* RESPONSIVE TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-[#161C2C]">
                <thead>
                  <tr className="border-b border-[#E3E7ED] bg-[#FAFBFD] text-xs font-semibold text-slate-700 whitespace-nowrap select-none">
                    <th className="py-3.5 pl-5 pr-3 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={handleSelectAll}
                        className="h-4 w-4 rounded border-slate-300 accent-[#161C2C] cursor-pointer"
                      />
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
                </thead>

                <tbody className="divide-y divide-[#E3E7ED]">
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
                  ) : customers.length > 0 ? (
                    // DYNAMIC DATA
                    customers.map((c) => {
                      const isSelected = selectedIds.has(c.id);
                      const fullName =
                        [c.first_name, c.last_name].filter(Boolean).join(" ") || c.name || c.email;

                      const isSubscribed = c.email_subscription_status === "subscribed";

                      return (
                        <tr
                          key={c.id}
                          className={`transition-colors whitespace-nowrap hover:bg-[#F9FAFC] ${
                            isSelected ? "bg-[#F3F6FA]" : ""
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3.5 pl-5 pr-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(c.id)}
                              className="h-4 w-4 rounded border-slate-300 accent-[#161C2C] cursor-pointer"
                            />
                          </td>

                          {/* Customer Name */}
                          <td className="py-3.5 px-3">
                            <button
                              type="button"
                              onClick={() => handleSelectCustomer(c)}
                              className="font-semibold text-slate-900 hover:text-blue-600 hover:underline cursor-pointer text-left"
                            >
                              {fullName}
                            </button>
                            <div className="text-[11px] text-slate-400">{c.email}</div>
                          </td>

                          {/* Email subscription */}
                          <td className="py-3.5 px-3">
                            {isSubscribed ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#D1FADF] text-[#027A48]">
                                Subscribed
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#F2F4F7] text-[#475467]">
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
                              <span>📍</span>
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
                            {searchQuery
                              ? `No customers matching "${searchQuery}".`
                              : "Customers who place orders or are added will appear here."}
                          </p>
                          {canManage && (
                            <Link
                              to="/admin/online-store/customers/new"
                              className="mt-3 px-4 py-2 rounded-lg bg-[#161C2C] text-white text-xs font-semibold hover:bg-slate-800 transition"
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
                  className="px-4 py-2 rounded-lg bg-[#161C2C] disabled:opacity-50 text-white font-semibold"
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
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#161C2C] text-white font-bold text-sm">
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161C2C] hover:bg-[#252E45] text-white text-xs font-semibold transition shadow-xs"
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
                                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
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
                      className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#161C2C] text-white text-xs font-semibold hover:bg-slate-800 transition"
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
    </div>
  );
}
