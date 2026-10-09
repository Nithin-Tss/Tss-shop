import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar, { AdminHeader } from "@/components/AdminSidebar";
import { apiGet, apiPost } from "@/lib/api";

const CURRENCIES = [
  { code: "AUD", symbol: "$", label: "Australian Dollar (AUD $)" },
  { code: "USD", symbol: "$", label: "US Dollar (USD $)" },
  { code: "INR", symbol: "₹", label: "Indian Rupee (INR ₹)" },
  { code: "EUR", symbol: "€", label: "Euro (EUR €)" },
  { code: "GBP", symbol: "£", label: "British Pound (GBP £)" },
];

export default function AdminCreateOrder() {
  const navigate = useNavigate();

  // Form states
  const [items, setItems] = useState([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [shippingAmount, setShippingAmount] = useState(0);
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [currency, setCurrency] = useState("AUD");
  const [notes, setNotes] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");

  // Customer state
  const [customerSearch, setCustomerSearch] = useState("");
  const [customersList, setCustomersList] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Modals & Pickers
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState(new Set());

  // Custom Item Form
  const [customItemForm, setCustomItemForm] = useState({
    title: "",
    price: "",
    quantity: 1,
  });

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Fetch available products
  const fetchProducts = async () => {
    setLoadingProducts(true);
    const res = await apiGet("/api/v1/catalog/products/");
    if (res.ok && Array.isArray(res.data)) {
      setAvailableProducts(res.data);
    } else if (res.ok && Array.isArray(res.data?.results)) {
      setAvailableProducts(res.data.results);
    } else {
      setAvailableProducts([]);
    }
    setLoadingProducts(false);
  };

  // Search customers
  useEffect(() => {
    let ignore = false;
    async function searchCustomers() {
      if (!customerSearch.trim()) {
        const res = await apiGet("/api/v1/customers/");
        if (!ignore && res.ok) {
          setCustomersList(Array.isArray(res.data) ? res.data : res.data?.results || []);
        }
        return;
      }
      const res = await apiGet(`/api/v1/customers/?search=${encodeURIComponent(customerSearch.trim())}`);
      if (!ignore && res.ok) {
        setCustomersList(Array.isArray(res.data) ? res.data : res.data?.results || []);
      }
    }
    searchCustomers();
    return () => {
      ignore = true;
    };
  }, [customerSearch]);

  const handleOpenProductModal = () => {
    fetchProducts();
    setShowProductModal(true);
  };

  const handleAddSelectedProducts = () => {
    const newItems = [];
    availableProducts.forEach((p) => {
      if (selectedProductIds.has(p.id)) {
        const variant = p.variants?.[0];
        newItems.push({
          id: `prod-${p.id}-${Date.now()}-${Math.random()}`,
          productId: p.id,
          variantId: variant?.id || null,
          title: p.title,
          sku: p.sku || variant?.sku || "",
          price: parseFloat(p.price || variant?.price || 0),
          quantity: 1,
        });
      }
    });

    setItems((prev) => [...prev, ...newItems]);
    setSelectedProductIds(new Set());
    setShowProductModal(false);
  };

  const handleAddCustomItem = (e) => {
    e.preventDefault();
    if (!customItemForm.title.trim()) return;

    setItems((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        productId: null,
        variantId: null,
        title: customItemForm.title.trim(),
        sku: "",
        price: parseFloat(customItemForm.price || 0),
        quantity: parseInt(customItemForm.quantity, 10) || 1,
      },
    ]);

    setCustomItemForm({ title: "", price: "", quantity: 1 });
    setShowCustomItemModal(false);
  };

  const handleUpdateItemQuantity = (id, newQty) => {
    const qty = Math.max(1, parseInt(newQty, 10) || 1);
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: qty } : item))
    );
  };

  const handleUpdateItemPrice = (id, newPrice) => {
    const price = Math.max(0, parseFloat(newPrice) || 0);
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, price } : item))
    );
  };

  const handleRemoveItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddTag = (e) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const val = tagInput.trim().replace(/^,|,$/g, "");
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Computations
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const total = Math.max(
    0,
    subtotal - (parseFloat(discountAmount) || 0) + (parseFloat(shippingAmount) || 0)
  );

  const selectedCurrencyObj =
    CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0];

  const handleSaveOrder = async () => {
    if (items.length === 0) {
      setError("Please add at least one product or custom item to the order.");
      return;
    }

    setSaving(true);
    setError("");

    // Build payload for backend
    const payload = {
      customer: selectedCustomer?.id || null,
      currency_code: currency,
      discount_amount: parseFloat(discountAmount) || 0,
      shipping_amount: parseFloat(shippingAmount) || 0,
      delivery_method: deliveryMethod || "Standard",
      items: items.map((it) => ({
        product: it.productId,
        variant: it.variantId,
        quantity: it.quantity,
        unit_price: it.price,
        discount_amount: 0,
      })),
    };

    // If order items have null product (e.g. pure custom items not in DB), 
    // we route to draft or create order with products
    const hasUnsavedCustomItems = items.some((it) => !it.productId);

    if (hasUnsavedCustomItems) {
      // Draft orders allow custom items without product ID
      const draftPayload = {
        customer: selectedCustomer?.id || null,
        currency_code: currency,
        po_number: notes || "",
        details: items.map((it) => ({
          product: it.productId || null,
          variant: it.variantId || null,
          title: it.title,
          quantity: it.quantity,
          unit_price: it.price,
          discount_amount: 0,
        })),
      };

      const res = await apiPost("/api/v1/orders/drafts/", draftPayload);
      setSaving(false);

      if (res.ok) {
        navigate("/admin/online-store/orders");
      } else {
        setError(res.formError || res.fieldErrors?.items || "Failed to create order draft.");
      }
    } else {
      const res = await apiPost("/api/v1/orders/", payload);
      setSaving(false);

      if (res.ok) {
        navigate("/admin/online-store/orders");
      } else {
        setError(res.formError || res.fieldErrors?.items || "Failed to create order.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F2F4] text-[#161C2C]">
      <AdminHeader />

      {/* 2. BODY LAYOUT */}
      <div className="flex min-h-[calc(100vh-72px)]">
        {/* SIDEBAR */}
        <AdminSidebar />

        {/* MAIN CREATE ORDER CONTENT */}
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-6xl mx-auto w-full">
          {/* Breadcrumb / Title Bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-slate-700">
              <Link
                to="/admin/online-store/orders"
                className="hover:text-slate-900 transition-colors flex items-center gap-1 text-slate-500 hover:underline"
              >
                <span className="text-base">📝</span>
                <span>›</span>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Create order
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/admin/online-store/orders"
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors"
              >
                Discard
              </Link>
              <button
                type="button"
                onClick={handleSaveOrder}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#161C2C] hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-semibold transition-all shadow-xs"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                className="text-red-400 hover:text-red-700 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* 2-COLUMN MAIN CONTENT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN (8 cols) */}
            <div className="lg:col-span-8 space-y-5">
              {/* CARD 1: PRODUCTS */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-slate-900">Products</h2>
                </div>

                {items.length === 0 ? (
                  // Empty buttons container
                  <div className="flex items-center justify-center gap-3 py-8">
                    <button
                      type="button"
                      onClick={() => setShowCustomItemModal(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 transition"
                    >
                      <span>+</span>
                      <span>Custom item</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenProductModal}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 transition"
                    >
                      <span>+</span>
                      <span>Product</span>
                    </button>
                  </div>
                ) : (
                  // Items Table / List
                  <div className="space-y-4">
                    <div className="divide-y divide-slate-100">
                      {items.map((it) => (
                        <div
                          key={it.id}
                          className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 truncate">
                              {it.title}
                            </p>
                            {it.sku && (
                              <p className="text-xs text-slate-400 font-mono">
                                SKU: {it.sku}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-4">
                            {/* Price input */}
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-500">
                                {selectedCurrencyObj.symbol}
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={it.price}
                                onChange={(e) =>
                                  handleUpdateItemPrice(it.id, e.target.value)
                                }
                                className="w-20 px-2 py-1 text-sm border border-slate-200 rounded-md text-right outline-none focus:border-slate-500"
                              />
                            </div>

                            {/* Quantity input */}
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-500">Qty:</span>
                              <input
                                type="number"
                                min="1"
                                value={it.quantity}
                                onChange={(e) =>
                                  handleUpdateItemQuantity(it.id, e.target.value)
                                }
                                className="w-14 px-2 py-1 text-sm border border-slate-200 rounded-md text-center outline-none focus:border-slate-500"
                              />
                            </div>

                            {/* Total line price */}
                            <span className="w-20 text-right font-medium text-slate-900">
                              {selectedCurrencyObj.symbol}
                              {(it.price * it.quantity).toFixed(2)}
                            </span>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(it.id)}
                              className="text-slate-400 hover:text-red-600 p-1 transition"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Bottom Actions to Add More */}
                    <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowCustomItemModal(true)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                      >
                        + Add custom item
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={handleOpenProductModal}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                      >
                        + Add product
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* CARD 2: PAYMENT */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                <h2 className="text-base font-bold text-slate-900">Payment</h2>

                <div className="space-y-3 text-sm text-slate-700">
                  {/* Subtotal */}
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span className="font-medium text-slate-900">
                      {selectedCurrencyObj.symbol}
                      {subtotal.toFixed(2)}
                    </span>
                  </div>

                  {/* Add discount */}
                  <div className="flex items-center justify-between text-slate-500">
                    <div className="flex items-center gap-2">
                      <span>Add discount</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={discountAmount || ""}
                        onChange={(e) => setDiscountAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-20 px-2 py-0.5 text-xs border border-slate-200 rounded text-right outline-none focus:border-slate-500"
                      />
                    </div>
                    <span>
                      {selectedCurrencyObj.symbol}
                      {(parseFloat(discountAmount) || 0).toFixed(2)}
                    </span>
                  </div>

                  {/* Add shipping or delivery */}
                  <div className="flex items-center justify-between text-slate-500">
                    <div className="flex items-center gap-2">
                      <span>Add shipping or delivery</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={shippingAmount || ""}
                        onChange={(e) => setShippingAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-20 px-2 py-0.5 text-xs border border-slate-200 rounded text-right outline-none focus:border-slate-500"
                      />
                    </div>
                    <span>
                      {selectedCurrencyObj.symbol}
                      {(parseFloat(shippingAmount) || 0).toFixed(2)}
                    </span>
                  </div>

                  {/* Estimated tax */}
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      Estimated tax <span className="text-xs">ⓘ</span>
                    </span>
                    <span>Not calculated</span>
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 font-bold text-base text-slate-900">
                    <span>Total</span>
                    <span>
                      {selectedCurrencyObj.symbol}
                      {total.toFixed(2)} {currency}
                    </span>
                  </div>
                </div>

                {/* Footer Note */}
                <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                  {items.length === 0
                    ? "Add a product to calculate total and view payment options"
                    : "Taxes and additional duties calculated automatically at checkout."}
                </p>
              </div>
            </div>

            {/* RIGHT COLUMN (4 cols) */}
            <div className="lg:col-span-4 space-y-5">
              {/* CARD 1: NOTES */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">Notes</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingNotes((prev) => !prev)}
                    className="text-slate-400 hover:text-slate-700 text-sm transition"
                  >
                    ✎
                  </button>
                </div>

                {isEditingNotes ? (
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add a note to this order..."
                    className="w-full text-xs text-slate-800 p-2.5 rounded-lg border border-slate-300 outline-none focus:border-slate-500 resize-none"
                    autoFocus
                  />
                ) : (
                  <p className="text-xs text-slate-500">
                    {notes.trim() ? notes : "No notes"}
                  </p>
                )}
              </div>

              {/* CARD 2: CUSTOMER */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3 relative">
                <span className="text-sm font-bold text-slate-900">Customer</span>

                {selectedCustomer ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {[selectedCustomer.first_name, selectedCustomer.last_name]
                          .filter(Boolean)
                          .join(" ") || selectedCustomer.name || "Customer"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {selectedCustomer.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCustomer(null)}
                      className="text-slate-400 hover:text-red-600 text-sm p-1"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs">
                      <span className="text-slate-400">⌕</span>
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setShowCustomerDropdown(true);
                        }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        placeholder="Search or create a customer"
                        className="w-full bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
                      />
                    </div>

                    {showCustomerDropdown && (
                      <div className="absolute top-12 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {customersList.length > 0 ? (
                          customersList.map((c) => (
                            <div
                              key={c.id}
                              onClick={() => {
                                setSelectedCustomer(c);
                                setShowCustomerDropdown(false);
                                setCustomerSearch("");
                              }}
                              className="p-2.5 hover:bg-slate-50 cursor-pointer text-xs"
                            >
                              <p className="font-semibold text-slate-900">
                                {[c.first_name, c.last_name].filter(Boolean).join(" ") ||
                                  c.email}
                              </p>
                              <p className="text-slate-500">{c.email}</p>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-center text-xs text-slate-400">
                            No matching customers found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* CARD 3: MARKETS */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">Markets</span>
                  <span className="text-slate-400 text-xs">☍</span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-xs font-medium text-slate-700">
                  <span>🌐</span>
                  <span>Melb</span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-medium text-slate-600">
                    Currency
                  </label>
                  <div className="relative">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full appearance-none bg-white px-3 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 outline-none focus:border-slate-500 cursor-pointer pr-8"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <span className="absolute right-3 top-2.5 text-slate-400 pointer-events-none text-xs">
                      ↕
                    </span>
                  </div>
                </div>
              </div>

              {/* CARD 4: TAGS */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">Tags</span>
                  <span className="text-slate-400 text-sm">✎</span>
                </div>

                <div className="min-h-[42px] p-1.5 rounded-lg border border-slate-300 bg-white flex flex-wrap items-center gap-1.5 focus-within:border-slate-500">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-xs text-slate-700"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder={tags.length === 0 ? "Add tags..." : ""}
                    className="flex-1 min-w-[80px] bg-transparent outline-none text-xs text-slate-800 p-1"
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* PRODUCT PICKER MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Select Products</h3>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {loadingProducts ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Loading catalog products...
                </div>
              ) : availableProducts.length > 0 ? (
                availableProducts.map((prod) => {
                  const isChecked = selectedProductIds.has(prod.id);
                  return (
                    <label
                      key={prod.id}
                      className="py-3 px-2 flex items-center justify-between hover:bg-slate-50 rounded-lg cursor-pointer transition"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setSelectedProductIds((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(prod.id);
                              else next.delete(prod.id);
                              return next;
                            });
                          }}
                          className="h-4 w-4 rounded border-slate-300 accent-[#161C2C]"
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {prod.title}
                          </p>
                          <p className="text-xs text-slate-400">
                            {prod.category || "General"}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-slate-700">
                        {selectedCurrencyObj.symbol}
                        {parseFloat(prod.price || 0).toFixed(2)}
                      </span>
                    </label>
                  );
                })
              ) : (
                <div className="p-8 text-center text-sm text-slate-500">
                  No products found in catalog. Create some products first or add custom items!
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddSelectedProducts}
                disabled={selectedProductIds.size === 0}
                className="px-4 py-2 rounded-lg bg-[#161C2C] disabled:opacity-50 text-white text-xs font-semibold"
              >
                Add {selectedProductIds.size > 0 ? `(${selectedProductIds.size})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM ITEM MODAL */}
      {showCustomItemModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Custom Item</h3>
              <button
                type="button"
                onClick={() => setShowCustomItemModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomItem} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Item Title
                </label>
                <input
                  type="text"
                  required
                  value={customItemForm.title}
                  onChange={(e) =>
                    setCustomItemForm({ ...customItemForm, title: e.target.value })
                  }
                  placeholder="e.g. Gift wrapping or Custom product"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-slate-500 text-sm"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Price ({selectedCurrencyObj.symbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={customItemForm.price}
                    onChange={(e) =>
                      setCustomItemForm({ ...customItemForm, price: e.target.value })
                    }
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-slate-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={customItemForm.quantity}
                    onChange={(e) =>
                      setCustomItemForm({ ...customItemForm, quantity: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-slate-500 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCustomItemModal(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#161C2C] text-white font-semibold"
                >
                  Add item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
