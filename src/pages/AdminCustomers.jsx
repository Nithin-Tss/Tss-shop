import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminSidebar, { AdminHeader } from "@/components/AdminSidebar";
import { apiGet, apiPost } from "@/lib/api";

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

  const allSelected =
    customers.length > 0 && selectedIds.size === customers.length;

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
              <span className="text-xl">👤</span>
              Customers
            </h1>

            <div className="flex items-center gap-2.5">
              <Link
                to="/admin/online-store/customers/new"
                className="flex items-center gap-2 rounded-lg bg-[#161C2C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#252E45] transition"
              >
                Add customer
              </Link>
            </div>
          </div>

          {/* DESCRIBE YOUR SEGMENT BANNER */}
          <div className="mb-5 rounded-2xl border border-[#E3E7ED] bg-white px-4 py-3 shadow-xs flex items-center justify-between cursor-pointer hover:bg-slate-50/70 transition">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 text-sm">
                👓
              </div>
              <span className="text-sm font-medium text-slate-700">
                Describe your segment
              </span>
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
                    <th className="py-3.5 pl-3 pr-6 text-right">Amount spent</th>
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
                        [c.first_name, c.last_name].filter(Boolean).join(" ") ||
                        c.name ||
                        c.email;

                      const isSubscribed =
                        c.email_subscription_status === "subscribed";

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
                            <span className="font-semibold text-slate-900 hover:underline cursor-pointer">
                              {fullName}
                            </span>
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
                              [c.city, c.state, c.country]
                                .filter(Boolean)
                                .join(", ") ||
                              "—"}
                          </td>

                          {/* Orders count */}
                          <td className="py-3.5 px-3 text-slate-800">
                            {c.orders_count ?? 0}
                          </td>

                          {/* Amount spent */}
                          <td className="py-3.5 pl-3 pr-6 text-right font-medium text-slate-900">
                            ${parseFloat(c.amount_spent || 0).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    // EMPTY STATE
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <span className="text-3xl text-slate-300">👤</span>
                          <p className="text-sm font-medium text-slate-700">
                            No customers found
                          </p>
                          <p className="text-xs text-slate-400 max-w-sm">
                            {searchQuery
                              ? `No customers matching "${searchQuery}".`
                              : "Customers who place orders or are added will appear here."}
                          </p>
                          <Link
                            to="/admin/online-store/customers/new"
                            className="mt-3 px-4 py-2 rounded-lg bg-[#161C2C] text-white text-xs font-semibold hover:bg-slate-800 transition"
                          >
                            Add customer
                          </Link>
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
                  <label className="block font-medium text-slate-700 mb-1">
                    First Name
                  </label>
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
                  <label className="block font-medium text-slate-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={customerForm.lastName}
                    onChange={(e) =>
                      setCustomerForm({ ...customerForm, lastName: e.target.value })
                    }
                    placeholder="e.g. Doe"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-slate-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={customerForm.email}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, email: e.target.value })
                  }
                  placeholder="e.g. john.doe@example.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-slate-500 text-sm"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Email Subscription
                </label>
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
                  <label className="block font-medium text-slate-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={customerForm.city}
                    onChange={(e) =>
                      setCustomerForm({ ...customerForm, city: e.target.value })
                    }
                    placeholder="e.g. Wollert"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-slate-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={customerForm.state}
                    onChange={(e) =>
                      setCustomerForm({ ...customerForm, state: e.target.value })
                    }
                    placeholder="e.g. VIC"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-slate-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={customerForm.country}
                    onChange={(e) =>
                      setCustomerForm({ ...customerForm, country: e.target.value })
                    }
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
    </div>
  );
}
