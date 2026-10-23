import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import AdminSidebar, { AdminHeader } from "@/components/AdminSidebar";
import { apiGet, apiPost } from "@/lib/api";
import { ALL_COUNTRIES } from "@/lib/countries";

const TYPE_CONFIG = {
  "amount-off-products": {
    id: "amount-off-products",
    title: "Amount off products",
    shortTitle: "Product discount",
    backendType: "percentage",
  },
  "buy-x-get-y": {
    id: "buy-x-get-y",
    title: "Buy X get Y",
    shortTitle: "Buy X get Y",
    backendType: "percentage",
  },
  "amount-off-order": {
    id: "amount-off-order",
    title: "Amount off order",
    shortTitle: "Order discount",
    backendType: "percentage",
  },
  "free-shipping": {
    id: "free-shipping",
    title: "Free shipping",
    shortTitle: "Free shipping",
    backendType: "fixed_amount",
  },
};

const inputClass =
  "w-full h-11 rounded-lg border border-[#DDE1EA] bg-[#FAF8FF] px-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#0B1020] focus:bg-white focus:ring-4 focus:ring-[#0B1020]/[0.07]";

const cardClass = "rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm";

function generateDiscountCode(prefix = "") {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let random = "";
  for (let i = 0; i < 7; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix ? `${prefix.toUpperCase()}-${random}` : random;
}

export default function AdminCreateDiscount({ initialType }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { discountType: routeParamType } = useParams();
  const [searchParams] = useSearchParams();

  // Resolve discount type
  const resolvedType = useMemo(() => {
    const raw = initialType || routeParamType || searchParams.get("type") || "";
    if (raw.includes("buy-x") || raw.includes("buy_x")) return "buy-x-get-y";
    if (raw.includes("order")) return "amount-off-order";
    if (raw.includes("ship")) return "free-shipping";
    if (raw.includes("product")) return "amount-off-products";
    if (location.pathname.includes("buy-x-get-y")) return "buy-x-get-y";
    if (location.pathname.includes("amount-off-order")) return "amount-off-order";
    if (location.pathname.includes("free-shipping")) return "free-shipping";
    return "amount-off-products";
  }, [initialType, routeParamType, searchParams, location.pathname]);

  const typeConfig = TYPE_CONFIG[resolvedType] || TYPE_CONFIG["amount-off-products"];

  // Form State: Method & Identity
  const [method, setMethod] = useState("code"); // 'code' | 'automatic'
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");

  // Form State: Value (Amount off products / Amount off order)
  const [valueType, setValueType] = useState("percentage"); // 'percentage' | 'fixed_amount'
  const [discountValue, setDiscountValue] = useState("");

  // Form State: Applies to (Amount off products)
  const [appliesToType, setAppliesToType] = useState("products"); // 'products' | 'collections'
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [oncePerOrder, setOncePerOrder] = useState(false);

  // Form State: Buy X get Y
  const [buyRequirementType, setBuyRequirementType] = useState("quantity"); // 'quantity' | 'amount'
  const [buyRequirementValue, setBuyRequirementValue] = useState("1");
  const [buySourceType, setBuySourceType] = useState("products"); // 'products' | 'collections'
  const [buySelectedProducts, setBuySelectedProducts] = useState([]);
  const [buySelectedCollections, setBuySelectedCollections] = useState([]);

  const [getYQuantity, setGetYQuantity] = useState("1");
  const [getYSourceType, setGetYSourceType] = useState("products");
  const [getYSelectedProducts, setGetYSelectedProducts] = useState([]);
  const [getYSelectedCollections, setGetYSelectedCollections] = useState([]);
  const [getYDiscountType, setGetYDiscountType] = useState("free"); // 'percentage' | 'amount' | 'free'
  const [getYDiscountValue, setGetYDiscountValue] = useState("");
  const [hasMaxUsesPerOrder, setHasMaxUsesPerOrder] = useState(false);
  const [maxUsesPerOrder, setMaxUsesPerOrder] = useState("1");

  // Form State: Free Shipping
  const [countryScope, setCountryScope] = useState("all"); // 'all' | 'selected'
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [excludeShippingOver, setExcludeShippingOver] = useState(false);
  const [excludeShippingRateAmount, setExcludeShippingRateAmount] = useState("");

  // Form State: Minimum purchase requirements
  const [minRequirement, setMinRequirement] = useState("none"); // 'none' | 'amount' | 'quantity'
  const [minAmount, setMinAmount] = useState("");
  const [minQuantity, setMinQuantity] = useState("");

  // Form State: Customer eligibility
  const [eligibility, setEligibility] = useState("all"); // 'all' | 'segments' | 'customers'
  const [selectedSegment, setSelectedSegment] = useState("purchased");
  const [specificCustomers, setSpecificCustomers] = useState([]);

  // Form State: Maximum usage limits
  const [limitTotalUses, setLimitTotalUses] = useState(false);
  const [totalUsesLimit, setTotalUsesLimit] = useState("");
  const [limitOnePerCustomer, setLimitOnePerCustomer] = useState(false);

  // Form State: Combinations
  const [combinesWithProducts, setCombinesWithProducts] = useState(false);
  const [combinesWithOrders, setCombinesWithOrders] = useState(false);
  const [combinesWithShipping, setCombinesWithShipping] = useState(false);

  // Form State: Active Dates
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("00:00");
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("23:59");

  // Form State: Sidebar (Sales Channels & Tags)
  const [channelOnlineStore, setChannelOnlineStore] = useState(true);
  const [channelPOS, setChannelPOS] = useState(true);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");

  // UI / Item Picker Modal State
  const [pickerModalOpen, setPickerModalOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState("products"); // 'products' | 'collections' | 'customers'
  const [pickerTarget, setPickerTarget] = useState("applies_to"); // 'applies_to' | 'buy_x' | 'get_y'

  // Available data from backend
  const [availableProducts, setAvailableProducts] = useState([]);
  const [availableCollections, setAvailableCollections] = useState([]);
  const [availableCustomers, setAvailableCustomers] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Submission State
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverMessage, setServerMessage] = useState({ type: "", text: "" });

  // Fetch catalog data for pickers
  useEffect(() => {
    let active = true;
    const loadCatalog = async () => {
      setLoadingData(true);
      const [prodRes, colRes, custRes] = await Promise.all([
        apiGet("/api/v1/catalog/products/"),
        apiGet("/api/v1/catalog/collections/"),
        apiGet("/api/v1/customers/"),
      ]);

      if (active) {
        if (prodRes.ok && Array.isArray(prodRes.data?.results || prodRes.data)) {
          setAvailableProducts(prodRes.data?.results || prodRes.data);
        }
        if (colRes.ok && Array.isArray(colRes.data?.results || colRes.data)) {
          setAvailableCollections(colRes.data?.results || colRes.data);
        }
        if (custRes.ok && Array.isArray(custRes.data?.results || custRes.data)) {
          setAvailableCustomers(custRes.data?.results || custRes.data);
        }
        setLoadingData(false);
      }
    };
    loadCatalog();
    return () => {
      active = false;
    };
  }, []);

  // Tag chip handler
  const handleAddTag = (e) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const clean = tagInput.trim().replace(/^,|,$/g, "");
      if (clean && !tags.includes(clean)) {
        setTags([...tags, clean]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (t) => {
    setTags(tags.filter((item) => item !== t));
  };

  // Open item picker modal
  const openPicker = (mode, target) => {
    setPickerMode(mode);
    setPickerTarget(target);
    setPickerModalOpen(true);
  };

  // Validation
  const validateForm = () => {
    const errs = {};
    if (method === "code" && !code.trim()) {
      errs.code = "Discount code cannot be empty.";
    }
    if (method === "automatic" && !title.trim()) {
      errs.title = "Discount title cannot be empty.";
    }

    if (resolvedType === "amount-off-products" || resolvedType === "amount-off-order") {
      if (!discountValue || Number(discountValue) <= 0) {
        errs.value = "Enter a valid discount value greater than 0.";
      }
      if (valueType === "percentage" && Number(discountValue) > 100) {
        errs.value = "Percentage discount cannot exceed 100%.";
      }
    }

    if (resolvedType === "amount-off-products") {
      if (appliesToType === "products" && selectedProducts.length === 0) {
        errs.appliesTo = "Select at least one product.";
      }
      if (appliesToType === "collections" && selectedCollections.length === 0) {
        errs.appliesTo = "Select at least one collection.";
      }
    }

    if (resolvedType === "buy-x-get-y") {
      if (buySourceType === "products" && buySelectedProducts.length === 0) {
        errs.buyItems = "Select at least one product for 'Customer buys'.";
      }
      if (getYSourceType === "products" && getYSelectedProducts.length === 0) {
        errs.getYItems = "Select at least one product for 'Customer gets'.";
      }
    }

    if (hasEndDate && endDate && startDate && endDate < startDate) {
      errs.endDate = "End date must be after the start date.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Handler
  const handleSave = async (e) => {
    e?.preventDefault();
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSaving(true);
    setServerMessage({ type: "", text: "" });

    const finalName = method === "code" ? code.trim().toUpperCase() : title.trim();
    const finalCodes = method === "code" ? [code.trim().toUpperCase()] : [];

    // Map to backend DiscountSerializer fields
    const backendDiscountType =
      resolvedType === "free-shipping"
        ? "fixed_amount"
        : valueType === "fixed_amount"
          ? "fixed_amount"
          : "percentage";

    const numericValue =
      resolvedType === "free-shipping"
        ? 0
        : resolvedType === "buy-x-get-y"
          ? getYDiscountType === "free"
            ? 100
            : Number(getYDiscountValue) || 100
          : Number(discountValue) || 0;

    let targetProductIds = [];
    if (resolvedType === "amount-off-products" && appliesToType === "products") {
      targetProductIds = selectedProducts.map((p) => p.id);
    } else if (resolvedType === "buy-x-get-y") {
      targetProductIds = [
        ...buySelectedProducts.map((p) => p.id),
        ...getYSelectedProducts.map((p) => p.id),
      ];
    }

    const payload = {
      name: finalName,
      discount_type: backendDiscountType,
      value: numericValue,
      is_active: true,
      codes: finalCodes,
      products: targetProductIds,
      usage_limit: limitTotalUses && totalUsesLimit ? Number(totalUsesLimit) : null,
      per_customer_limit: limitOnePerCustomer ? 1 : null,
      starts_at: startDate ? `${startDate}T${startTime}:00Z` : new Date().toISOString(),
      ends_at: hasEndDate && endDate ? `${endDate}T${endTime}:00Z` : null,
      minimum_order_amount: minRequirement === "amount" && minAmount ? Number(minAmount) : null,
    };

    try {
      const res = await apiPost("/api/v1/discounts/", payload);
      if (res.ok) {
        setServerMessage({
          type: "success",
          text: `Discount "${finalName}" saved successfully.`,
        });
        setTimeout(() => {
          navigate("/admin/online-store/discounts");
        }, 800);
      } else {
        // Handle server error response cleanly
        const errDetail =
          res.formError ||
          (res.fieldErrors && Object.values(res.fieldErrors)[0]) ||
          res.data?.detail ||
          "Failed to save discount to server.";
        setServerMessage({
          type: "error",
          text: String(errDetail),
        });
      }
    } catch {
      setServerMessage({
        type: "error",
        text: "Network or server connection issue while saving discount.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Dynamic Summary Computations
  const summaryTitle = method === "code" ? code || "No code yet" : title || "No title yet";
  const summaryMethodLabel = method === "code" ? "Code" : "Automatic";

  const summaryDetails = useMemo(() => {
    const lines = [];

    // 1. Offer value
    if (resolvedType === "amount-off-products") {
      const valStr = discountValue
        ? valueType === "percentage"
          ? `${discountValue}% off`
          : `$${discountValue} off`
        : "Discount off";
      const targetStr =
        appliesToType === "products"
          ? `${selectedProducts.length} product${selectedProducts.length === 1 ? "" : "s"}`
          : `${selectedCollections.length} collection${selectedCollections.length === 1 ? "" : "s"}`;
      lines.push(`${valStr} ${targetStr}`);
      if (oncePerOrder) lines.push("Applies once per order");
    } else if (resolvedType === "buy-x-get-y") {
      const buyStr =
        buyRequirementType === "quantity"
          ? `Buy ${buyRequirementValue || 1} item${buyRequirementValue === "1" ? "" : "s"}`
          : `Spend $${buyRequirementValue || "0.00"}`;
      const getValStr =
        getYDiscountType === "free"
          ? "free"
          : getYDiscountType === "percentage"
            ? `${getYDiscountValue || 0}% off`
            : `$${getYDiscountValue || 0} off`;
      lines.push(`${buyStr}, get ${getYQuantity || 1} item ${getValStr}`);
    } else if (resolvedType === "amount-off-order") {
      const valStr = discountValue
        ? valueType === "percentage"
          ? `${discountValue}% off entire order`
          : `$${discountValue} off entire order`
        : "Discount off order";
      lines.push(valStr);
    } else if (resolvedType === "free-shipping") {
      const countryStr =
        countryScope === "all"
          ? "All countries"
          : `${selectedCountries.length} selected countr${selectedCountries.length === 1 ? "y" : "ies"}`;
      lines.push(`Free shipping for ${countryStr}`);
      if (excludeShippingOver && excludeShippingRateAmount) {
        lines.push(`Excludes shipping rates over $${excludeShippingRateAmount}`);
      }
    }

    // 2. Minimum requirements
    if (resolvedType !== "buy-x-get-y") {
      if (minRequirement === "amount" && minAmount) {
        lines.push(`Minimum purchase of $${minAmount}`);
      } else if (minRequirement === "quantity" && minQuantity) {
        lines.push(`Minimum purchase of ${minQuantity} items`);
      } else {
        lines.push("No minimum requirements");
      }
    }

    // 3. Customer eligibility
    if (eligibility === "all") {
      lines.push("For all customers");
    } else if (eligibility === "segments") {
      lines.push("For selected customer segments");
    } else if (eligibility === "customers") {
      lines.push(
        `For ${specificCustomers.length} selected customer${specificCustomers.length === 1 ? "" : "s"}`
      );
    }

    // 4. Usage limits
    if (limitTotalUses && totalUsesLimit) {
      lines.push(`Limit of ${totalUsesLimit} uses in total`);
    }
    if (limitOnePerCustomer) {
      lines.push("One use per customer");
    }

    // 5. Combinations
    const activeCombos = [];
    if (combinesWithProducts) activeCombos.push("Product");
    if (combinesWithOrders) activeCombos.push("Order");
    if (combinesWithShipping && resolvedType !== "free-shipping") activeCombos.push("Shipping");
    if (activeCombos.length > 0) {
      lines.push(`Combines with ${activeCombos.join(", ")} discounts`);
    } else {
      lines.push("Can't combine with other discounts");
    }

    // 6. Active dates
    if (startDate) {
      const startFormatted = new Date(`${startDate}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      if (hasEndDate && endDate) {
        const endFormatted = new Date(`${endDate}T00:00:00`).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        lines.push(`Active from ${startFormatted} to ${endFormatted}`);
      } else {
        lines.push(`Active from ${startFormatted}`);
      }
    }

    return lines;
  }, [
    resolvedType,
    discountValue,
    valueType,
    appliesToType,
    selectedProducts,
    selectedCollections,
    oncePerOrder,
    buyRequirementType,
    buyRequirementValue,
    getYQuantity,
    getYDiscountType,
    getYDiscountValue,
    countryScope,
    selectedCountries,
    excludeShippingOver,
    excludeShippingRateAmount,
    minRequirement,
    minAmount,
    minQuantity,
    eligibility,
    specificCustomers,
    limitTotalUses,
    totalUsesLimit,
    limitOnePerCustomer,
    combinesWithProducts,
    combinesWithOrders,
    combinesWithShipping,
    startDate,
    hasEndDate,
    endDate,
  ]);

  return (
    <div className="min-h-screen bg-[#F5F3FF]">
      <AdminHeader />

      <div className="flex min-h-[calc(100vh-72px)]">
        <AdminSidebar />

        <main className="min-w-0 flex-1 pb-16">
          {/* HEADER WITH BACK NAVIGATION & ACTIONS */}
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-[#F5F3FF]/95 px-6 py-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <Link
                to="/admin/online-store/discounts"
                aria-label="Back to discounts"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-charcoal-navy">{typeConfig.title}</h1>
                <p className="text-xs text-slate-500">Create discount</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/admin/online-store/discounts")}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-charcoal-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save discount"}
              </button>
            </div>
          </header>

          {/* SERVER MESSAGES */}
          {serverMessage.text && (
            <div className="mx-6 mt-4">
              <div
                className={`flex items-center gap-2 rounded-xl p-4 text-sm font-medium ${
                  serverMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                <span>{serverMessage.type === "success" ? "✓" : "⚠️"}</span>
                {serverMessage.text}
              </div>
            </div>
          )}

          {/* MAIN FORM GRID */}
          <div className="p-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
              {/* LEFT COLUMN: FORM CARDS */}
              <div className="space-y-6">
                {/* CARD 1: METHOD & NAME */}
                <section className={cardClass}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-slate-900">{typeConfig.title}</h2>
                    <span className="text-xs font-medium text-slate-500">Method</span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMethod("code")}
                      className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition ${
                        method === "code"
                          ? "border-charcoal-navy bg-slate-50/70 ring-2 ring-[#0B1020]/10"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-medium text-slate-900 text-sm">
                        <input
                          type="radio"
                          name="method"
                          checked={method === "code"}
                          onChange={() => setMethod("code")}
                          className="h-4 w-4 text-charcoal-navy focus:ring-[#0B1020]"
                        />
                        Discount code
                      </div>
                      <p className="mt-1 text-xs text-slate-500 pl-6">
                        Customers will enter this code at checkout
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMethod("automatic")}
                      className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition ${
                        method === "automatic"
                          ? "border-charcoal-navy bg-slate-50/70 ring-2 ring-[#0B1020]/10"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-medium text-slate-900 text-sm">
                        <input
                          type="radio"
                          name="method"
                          checked={method === "automatic"}
                          onChange={() => setMethod("automatic")}
                          className="h-4 w-4 text-charcoal-navy focus:ring-[#0B1020]"
                        />
                        Automatic discount
                      </div>
                      <p className="mt-1 text-xs text-slate-500 pl-6">
                        Applied in cart and checkout automatically
                      </p>
                    </button>
                  </div>

                  {method === "code" ? (
                    <div className="mt-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                          Discount code
                        </label>
                        <button
                          type="button"
                          onClick={() => setCode(generateDiscountCode("PROMO"))}
                          className="text-xs font-medium text-charcoal-navy hover:underline"
                        >
                          Generate random code
                        </button>
                      </div>
                      <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="e.g. SUMMER2026"
                        className={`mt-1.5 ${inputClass} font-mono uppercase ${
                          errors.code ? "border-red-400 ring-2 ring-red-100" : ""
                        }`}
                      />
                      {errors.code && <p className="mt-1 text-xs text-red-600">{errors.code}</p>}
                      <p className="mt-1.5 text-xs text-slate-500">
                        Customers will enter this code at checkout.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Title
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Summer promotion"
                        className={`mt-1.5 ${inputClass} ${
                          errors.title ? "border-red-400 ring-2 ring-red-100" : ""
                        }`}
                      />
                      {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
                      <p className="mt-1.5 text-xs text-slate-500">
                        Customers will see this in their cart and at checkout.
                      </p>
                    </div>
                  )}
                </section>

                {/* CARD 2: VALUE & DETAILS (SPECIFIC TO EACH DISCOUNT TYPE) */}

                {/* TYPE 1: AMOUNT OFF PRODUCTS */}
                {resolvedType === "amount-off-products" && (
                  <section className={cardClass}>
                    <h2 className="text-base font-semibold text-slate-900">Value</h2>

                    {/* Value Type & Amount */}
                    <div className="mt-4 flex flex-col sm:flex-row gap-3">
                      <div className="flex rounded-lg border border-slate-200 bg-[#FAF8FF] p-1 h-11 shrink-0">
                        <button
                          type="button"
                          onClick={() => setValueType("percentage")}
                          className={`rounded-md px-3.5 text-xs font-semibold transition ${
                            valueType === "percentage"
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Percentage (%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setValueType("fixed_amount")}
                          className={`rounded-md px-3.5 text-xs font-semibold transition ${
                            valueType === "fixed_amount"
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Fixed amount ($)
                        </button>
                      </div>

                      <div className="relative flex-1">
                        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                          {valueType === "percentage" ? "%" : "$"}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step={valueType === "percentage" ? "1" : "0.01"}
                          value={discountValue}
                          onChange={(e) => setDiscountValue(e.target.value)}
                          placeholder="0"
                          className={`${inputClass} pl-8 ${
                            errors.value ? "border-red-400 ring-2 ring-red-100" : ""
                          }`}
                        />
                      </div>
                    </div>
                    {errors.value && <p className="mt-1 text-xs text-red-600">{errors.value}</p>}

                    {/* Applies to */}
                    <div className="mt-6 border-t border-slate-100 pt-5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Applies to
                      </label>
                      <div className="mt-2.5 space-y-2">
                        <label className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer">
                          <input
                            type="radio"
                            name="appliesTo"
                            checked={appliesToType === "collections"}
                            onChange={() => setAppliesToType("collections")}
                            className="h-4 w-4 text-charcoal-navy focus:ring-[#0B1020]"
                          />
                          Specific collections
                        </label>
                        <label className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer">
                          <input
                            type="radio"
                            name="appliesTo"
                            checked={appliesToType === "products"}
                            onChange={() => setAppliesToType("products")}
                            className="h-4 w-4 text-charcoal-navy focus:ring-[#0B1020]"
                          />
                          Specific products
                        </label>
                      </div>

                      {/* Browse items button */}
                      <div className="mt-4 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openPicker(appliesToType, "applies_to")}
                          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                        >
                          Browse {appliesToType}
                        </button>
                        <span className="text-xs text-slate-500">
                          {appliesToType === "products"
                            ? `${selectedProducts.length} product(s) selected`
                            : `${selectedCollections.length} collection(s) selected`}
                        </span>
                      </div>
                      {errors.appliesTo && (
                        <p className="mt-1.5 text-xs text-red-600">{errors.appliesTo}</p>
                      )}

                      {/* Selected Items List */}
                      {appliesToType === "products" && selectedProducts.length > 0 && (
                        <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                          {selectedProducts.map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between p-3 text-sm bg-slate-50/50"
                            >
                              <div className="flex items-center gap-3 truncate pr-2">
                                <span className="h-8 w-8 shrink-0 rounded bg-slate-200 flex items-center justify-center text-xs text-slate-600 font-medium">
                                  📦
                                </span>
                                <span className="font-medium text-slate-900 truncate">
                                  {p.title || p.name}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedProducts(selectedProducts.filter((x) => x.id !== p.id))
                                }
                                className="text-slate-400 hover:text-red-600 p-1 transition"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {appliesToType === "collections" && selectedCollections.length > 0 && (
                        <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                          {selectedCollections.map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center justify-between p-3 text-sm bg-slate-50/50"
                            >
                              <div className="flex items-center gap-2 truncate pr-2">
                                <span>📁</span>
                                <span className="font-medium text-slate-900 truncate">
                                  {c.title || c.name}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedCollections(
                                    selectedCollections.filter((x) => x.id !== c.id)
                                  )
                                }
                                className="text-slate-400 hover:text-red-600 p-1 transition"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Checkbox: Once per order */}
                      <div className="mt-5 pt-4 border-t border-slate-100">
                        <label className="flex items-start gap-2.5 text-sm text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={oncePerOrder}
                            onChange={(e) => setOncePerOrder(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-charcoal-navy focus:ring-[#0B1020]"
                          />
                          <div>
                            <span className="font-medium">Only apply discount once per order</span>
                            <p className="text-xs text-slate-500">
                              If unchecked, discount applies to each eligible product in an order.
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </section>
                )}

                {/* TYPE 2: BUY X GET Y */}
                {resolvedType === "buy-x-get-y" && (
                  <div className="space-y-6">
                    {/* CUSTOMER BUYS */}
                    <section className={cardClass}>
                      <h2 className="text-base font-semibold text-slate-900">Customer buys</h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Customer must add the quantity or amount of items specified below to their
                        cart.
                      </p>

                      <div className="mt-4 space-y-2">
                        <label className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer">
                          <input
                            type="radio"
                            name="buyReq"
                            checked={buyRequirementType === "quantity"}
                            onChange={() => setBuyRequirementType("quantity")}
                            className="h-4 w-4 text-charcoal-navy focus:ring-[#0B1020]"
                          />
                          Minimum quantity of items
                        </label>
                        <label className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer">
                          <input
                            type="radio"
                            name="buyReq"
                            checked={buyRequirementType === "amount"}
                            onChange={() => setBuyRequirementType("amount")}
                            className="h-4 w-4 text-charcoal-navy focus:ring-[#0B1020]"
                          />
                          Minimum purchase amount
                        </label>
                      </div>

                      <div className="mt-3">
                        <div className="relative max-w-xs">
                          {buyRequirementType === "amount" && (
                            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                              $
                            </span>
                          )}
                          <input
                            type="number"
                            min="1"
                            value={buyRequirementValue}
                            onChange={(e) => setBuyRequirementValue(e.target.value)}
                            placeholder={buyRequirementType === "quantity" ? "1" : "0.00"}
                            className={`${inputClass} ${buyRequirementType === "amount" ? "pl-7" : ""}`}
                          />
                        </div>
                      </div>

                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                          Any items from
                        </label>
                        <div className="mt-2 flex gap-4">
                          <label className="flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                            <input
                              type="radio"
                              name="buySource"
                              checked={buySourceType === "products"}
                              onChange={() => setBuySourceType("products")}
                              className="h-4 w-4 text-charcoal-navy focus:ring-[#0B1020]"
                            />
                            Specific products
                          </label>
                          <label className="flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                            <input
                              type="radio"
                              name="buySource"
                              checked={buySourceType === "collections"}
                              onChange={() => setBuySourceType("collections")}
                              className="h-4 w-4 text-charcoal-navy focus:ring-[#0B1020]"
                            />
                            Specific collections
                          </label>
                        </div>

                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => openPicker(buySourceType, "buy_x")}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                          >
                            Browse {buySourceType} (
                            {buySelectedProducts.length || buySelectedCollections.length} selected)
                          </button>
                          {errors.buyItems && (
                            <p className="mt-1 text-xs text-red-600">{errors.buyItems}</p>
                          )}
                        </div>
                      </div>
                    </section>

                    {/* CUSTOMER GETS */}
                    <section className={cardClass}>
                      <h2 className="text-base font-semibold text-slate-900">Customer gets</h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Specify the items that the customer can get at a discount.
                      </p>

                      <div className="mt-4">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={getYQuantity}
                          onChange={(e) => setGetYQuantity(e.target.value)}
                          className={`mt-1 max-w-xs ${inputClass}`}
                        />
                      </div>

                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                          Any items from
                        </label>
                        <div className="mt-2 flex gap-4">
                          <label className="flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                            <input
                              type="radio"
                              name="getYSource"
                              checked={getYSourceType === "products"}
                              onChange={() => setGetYSourceType("products")}
                              className="h-4 w-4 text-charcoal-navy focus:ring-[#0B1020]"
                            />
                            Specific products
                          </label>
                          <label className="flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                            <input
                              type="radio"
                              name="getYSource"
                              checked={getYSourceType === "collections"}
                              onChange={() => setGetYSourceType("collections")}
                              className="h-4 w-4 text-charcoal-navy focus:ring-[#0B1020]"
                            />
                            Specific collections
                          </label>
                        </div>

                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => openPicker(getYSourceType, "get_y")}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                          >
                            Browse {getYSourceType} (
                            {getYSelectedProducts.length || getYSelectedCollections.length}{" "}
                            selected)
                          </button>
                          {errors.getYItems && (
                            <p className="mt-1 text-xs text-red-600">{errors.getYItems}</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                          At a discounted value
                        </label>
                        <div className="mt-2 space-y-2">
                          <label className="flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                            <input
                              type="radio"
                              name="getYDiscount"
                              checked={getYDiscountType === "free"}
                              onChange={() => setGetYDiscountType("free")}
                              className="h-4 w-4 text-charcoal-navy focus:ring-[#0B1020]"
                            />
                            Free
                          </label>
                          <label className="flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                            <input
                              type="radio"
                              name="getYDiscount"
                              checked={getYDiscountType === "percentage"}
                              onChange={() => setGetYDiscountType("percentage")}
                              className="h-4 w-4 text-charcoal-navy focus:ring-[#0B1020]"
                            />
                            Percentage (%)
                          </label>
                          <label className="flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                            <input
                              type="radio"
                              name="getYDiscount"
                              checked={getYDiscountType === "amount"}
                              onChange={() => setGetYDiscountType("amount")}
                              className="h-4 w-4 text-charcoal-navy focus:ring-[#0B1020]"
                            />
                            Amount off each ($)
                          </label>
                        </div>

                        {getYDiscountType !== "free" && (
                          <div className="mt-3 max-w-xs">
                            <input
                              type="number"
                              min="0"
                              value={getYDiscountValue}
                              onChange={(e) => setGetYDiscountValue(e.target.value)}
                              placeholder={
                                getYDiscountType === "percentage" ? "e.g. 50%" : "e.g. 10.00"
                              }
                              className={inputClass}
                            />
                          </div>
                        )}

                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <label className="flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={hasMaxUsesPerOrder}
                              onChange={(e) => setHasMaxUsesPerOrder(e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-charcoal-navy focus:ring-[#0B1020]"
                            />
                            Set a maximum number of uses per order
                          </label>
                          {hasMaxUsesPerOrder && (
                            <div className="mt-2 max-w-xs">
                              <input
                                type="number"
                                min="1"
                                value={maxUsesPerOrder}
                                onChange={(e) => setMaxUsesPerOrder(e.target.value)}
                                className={inputClass}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {/* TYPE 3: AMOUNT OFF ORDER */}
                {resolvedType === "amount-off-order" && (
                  <section className={cardClass}>
                    <h2 className="text-base font-semibold text-slate-900">Value</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Discount is applied to the entire order subtotal.
                    </p>

                    <div className="mt-4 flex flex-col sm:flex-row gap-3">
                      <div className="flex rounded-lg border border-slate-200 bg-[#FAF8FF] p-1 h-11 shrink-0">
                        <button
                          type="button"
                          onClick={() => setValueType("percentage")}
                          className={`rounded-md px-3.5 text-xs font-semibold transition ${
                            valueType === "percentage"
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Percentage (%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setValueType("fixed_amount")}
                          className={`rounded-md px-3.5 text-xs font-semibold transition ${
                            valueType === "fixed_amount"
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Fixed amount ($)
                        </button>
                      </div>

                      <div className="relative flex-1">
                        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                          {valueType === "percentage" ? "%" : "$"}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step={valueType === "percentage" ? "1" : "0.01"}
                          value={discountValue}
                          onChange={(e) => setDiscountValue(e.target.value)}
                          placeholder="0"
                          className={`${inputClass} pl-8 ${
                            errors.value ? "border-red-400 ring-2 ring-red-100" : ""
                          }`}
                        />
                      </div>
                    </div>
                    {errors.value && <p className="mt-1 text-xs text-red-600">{errors.value}</p>}
                  </section>
                )}

                {/* TYPE 4: FREE SHIPPING */}
                {resolvedType === "free-shipping" && (
                  <div className="space-y-6">
                    {/* COUNTRIES */}
                    <section className={cardClass}>
                      <h2 className="text-base font-semibold text-slate-900">Countries</h2>

                      <div className="mt-4 space-y-2">
                        <label className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer">
                          <input
                            type="radio"
                            name="countryScope"
                            checked={countryScope === "all"}
                            onChange={() => setCountryScope("all")}
                            className="h-4 w-4 text-charcoal-navy focus:ring-[#0B1020]"
                          />
                          All countries
                        </label>
                        <label className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer">
                          <input
                            type="radio"
                            name="countryScope"
                            checked={countryScope === "selected"}
                            onChange={() => setCountryScope("selected")}
                            className="h-4 w-4 text-charcoal-navy focus:ring-[#0B1020]"
                          />
                          Selected countries
                        </label>
                      </div>

                      {countryScope === "selected" && (
                        <div className="mt-4 relative">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={countrySearch}
                              onChange={(e) => {
                                setCountrySearch(e.target.value);
                                setShowCountryDropdown(true);
                              }}
                              onFocus={() => setShowCountryDropdown(true)}
                              placeholder="Search countries..."
                              className={inputClass}
                            />
                          </div>

                          {/* Country Dropdown */}
                          {showCountryDropdown && (
                            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                              {ALL_COUNTRIES.filter(
                                (c) =>
                                  !selectedCountries.some((sc) => sc.code === c.code) &&
                                  c.name.toLowerCase().includes(countrySearch.toLowerCase())
                              ).map((c) => (
                                <button
                                  key={c.code}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCountries([...selectedCountries, c]);
                                    setCountrySearch("");
                                    setShowCountryDropdown(false);
                                  }}
                                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-slate-50 rounded-lg transition"
                                >
                                  <span>{c.flag}</span>
                                  <span className="font-medium text-slate-900">{c.name}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Selected Countries Chips */}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {selectedCountries.map((c) => (
                              <span
                                key={c.code}
                                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800"
                              >
                                <span>{c.flag}</span>
                                {c.name}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedCountries(
                                      selectedCountries.filter((x) => x.code !== c.code)
                                    )
                                  }
                                  className="text-slate-400 hover:text-slate-700 ml-1"
                                >
                                  ✕
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </section>

                    {/* SHIPPING RATES */}
                    <section className={cardClass}>
                      <h2 className="text-base font-semibold text-slate-900">Shipping rates</h2>

                      <div className="mt-4">
                        <label className="flex items-start gap-2.5 text-sm text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={excludeShippingOver}
                            onChange={(e) => setExcludeShippingOver(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-charcoal-navy focus:ring-[#0B1020]"
                          />
                          <div>
                            <span className="font-medium">
                              Exclude shipping rates over a certain amount
                            </span>
                            <p className="text-xs text-slate-500">
                              Orders with shipping rates higher than this amount will not qualify
                              for free shipping.
                            </p>
                          </div>
                        </label>

                        {excludeShippingOver && (
                          <div className="mt-3 max-w-xs relative">
                            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                              $
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={excludeShippingRateAmount}
                              onChange={(e) => setExcludeShippingRateAmount(e.target.value)}
                              placeholder="0.00"
                              className={`${inputClass} pl-7`}
                            />
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                )}

                {/* CARD 3: MINIMUM PURCHASE REQUIREMENTS (For non-BuyX) */}
                {resolvedType !== "buy-x-get-y" && (
                  <section className={cardClass}>
                    <h2 className="text-base font-semibold text-slate-900">
                      Minimum purchase requirements
                    </h2>

                    <div className="mt-4 space-y-2.5">
                      <label className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name="minRequirement"
                          checked={minRequirement === "none"}
                          onChange={() => setMinRequirement("none")}
                          className="h-4 w-4 text-charcoal-navy focus:ring-[#0B1020]"
                        />
                        No minimum requirements
                      </label>

                      <label className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name="minRequirement"
                          checked={minRequirement === "amount"}
                          onChange={() => setMinRequirement("amount")}
                          className="h-4 w-4 text-charcoal-navy focus:ring-[#0B1020]"
                        />
                        Minimum purchase amount ($)
                      </label>
                      {minRequirement === "amount" && (
                        <div className="mt-1 pl-6 max-w-xs relative">
                          <span className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                            $
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={minAmount}
                            onChange={(e) => setMinAmount(e.target.value)}
                            placeholder="0.00"
                            className={`${inputClass} pl-8`}
                          />
                          <p className="mt-1 text-xs text-slate-500">
                            Applies to subtotal of items before taxes and shipping.
                          </p>
                        </div>
                      )}

                      <label className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name="minRequirement"
                          checked={minRequirement === "quantity"}
                          onChange={() => setMinRequirement("quantity")}
                          className="h-4 w-4 text-charcoal-navy focus:ring-[#0B1020]"
                        />
                        Minimum quantity of items
                      </label>
                      {minRequirement === "quantity" && (
                        <div className="mt-1 pl-6 max-w-xs">
                          <input
                            type="number"
                            min="1"
                            value={minQuantity}
                            onChange={(e) => setMinQuantity(e.target.value)}
                            placeholder="1"
                            className={inputClass}
                          />
                          <p className="mt-1 text-xs text-slate-500">
                            Applies to total count of eligible items.
                          </p>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* CARD 4: CUSTOMER ELIGIBILITY */}
                <section className={cardClass}>
                  <h2 className="text-base font-semibold text-slate-900">Customer eligibility</h2>

                  <div className="mt-4 space-y-2.5">
                    <label className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer">
                      <input
                        type="radio"
                        name="eligibility"
                        checked={eligibility === "all"}
                        onChange={() => setEligibility("all")}
                        className="h-4 w-4 text-charcoal-navy focus:ring-[#0B1020]"
                      />
                      All customers
                    </label>

                    <label className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer">
                      <input
                        type="radio"
                        name="eligibility"
                        checked={eligibility === "segments"}
                        onChange={() => setEligibility("segments")}
                        className="h-4 w-4 text-charcoal-navy focus:ring-[#0B1020]"
                      />
                      Specific customer segments
                    </label>
                    {eligibility === "segments" && (
                      <div className="mt-2 pl-6 max-w-sm">
                        <select
                          value={selectedSegment}
                          onChange={(e) => setSelectedSegment(e.target.value)}
                          className={inputClass}
                        >
                          <option value="purchased">Customers who have purchased</option>
                          <option value="subscribers">Email subscribers</option>
                          <option value="abandoned">Abandoned checkouts (last 30 days)</option>
                          <option value="first_time">First-time buyers</option>
                        </select>
                      </div>
                    )}

                    <label className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer">
                      <input
                        type="radio"
                        name="eligibility"
                        checked={eligibility === "customers"}
                        onChange={() => setEligibility("customers")}
                        className="h-4 w-4 text-charcoal-navy focus:ring-[#0B1020]"
                      />
                      Specific customers
                    </label>
                    {eligibility === "customers" && (
                      <div className="mt-2 pl-6">
                        <button
                          type="button"
                          onClick={() => openPicker("customers", "eligibility")}
                          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                        >
                          Browse customers ({specificCustomers.length} selected)
                        </button>
                      </div>
                    )}
                  </div>
                </section>

                {/* CARD 5: MAXIMUM USAGE LIMITS */}
                <section className={cardClass}>
                  <h2 className="text-base font-semibold text-slate-900">Maximum discount uses</h2>

                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={limitTotalUses}
                          onChange={(e) => setLimitTotalUses(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-charcoal-navy focus:ring-[#0B1020]"
                        />
                        Limit number of times this discount can be used in total
                      </label>
                      {limitTotalUses && (
                        <div className="mt-2 pl-6 max-w-xs">
                          <input
                            type="number"
                            min="1"
                            value={totalUsesLimit}
                            onChange={(e) => setTotalUsesLimit(e.target.value)}
                            placeholder="e.g. 100"
                            className={inputClass}
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={limitOnePerCustomer}
                          onChange={(e) => setLimitOnePerCustomer(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-charcoal-navy focus:ring-[#0B1020]"
                        />
                        Limit to one use per customer
                      </label>
                      <p className="mt-1 pl-6 text-xs text-slate-500">
                        The customer's email or phone number will be checked at checkout.
                      </p>
                    </div>
                  </div>
                </section>

                {/* CARD 6: COMBINATIONS */}
                <section className={cardClass}>
                  <h2 className="text-base font-semibold text-slate-900">Combinations</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    This discount can be combined with:
                  </p>

                  <div className="mt-4 space-y-2.5">
                    <label className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={combinesWithProducts}
                        onChange={(e) => setCombinesWithProducts(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-charcoal-navy focus:ring-[#0B1020]"
                      />
                      Product discounts
                    </label>

                    <label className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={combinesWithOrders}
                        onChange={(e) => setCombinesWithOrders(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-charcoal-navy focus:ring-[#0B1020]"
                      />
                      Order discounts
                    </label>

                    {resolvedType !== "free-shipping" && (
                      <label className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={combinesWithShipping}
                          onChange={(e) => setCombinesWithShipping(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-charcoal-navy focus:ring-[#0B1020]"
                        />
                        Shipping discounts
                      </label>
                    )}
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600 border border-slate-200/70">
                    ℹ️ Eligible discounts will be combined when applied to an order.
                  </div>
                </section>

                {/* CARD 7: ACTIVE DATES */}
                <section className={cardClass}>
                  <h2 className="text-base font-semibold text-slate-900">Active dates</h2>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Start date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className={`mt-1 ${inputClass}`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Start time
                      </label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className={`mt-1 ${inputClass}`}
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <label className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasEndDate}
                        onChange={(e) => setHasEndDate(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-charcoal-navy focus:ring-[#0B1020]"
                      />
                      Set end date
                    </label>

                    {hasEndDate && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                            End date
                          </label>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className={`mt-1 ${inputClass} ${
                              errors.endDate ? "border-red-400 ring-2 ring-red-100" : ""
                            }`}
                          />
                          {errors.endDate && (
                            <p className="mt-1 text-xs text-red-600">{errors.endDate}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                            End time
                          </label>
                          <input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className={`mt-1 ${inputClass}`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* RIGHT COLUMN: SUMMARY, SALES CHANNELS & TAGS */}
              <div className="space-y-6">
                {/* SUMMARY CARD */}
                <section className={cardClass}>
                  <h2 className="text-base font-semibold text-slate-900">Summary</h2>

                  <div className="mt-4 rounded-xl bg-slate-50 p-4 border border-slate-200/80">
                    <div className="text-lg font-bold text-charcoal-navy wrap-break-word">
                      {summaryTitle}
                    </div>
                    <div className="mt-1 inline-flex items-center rounded-md bg-slate-200/80 px-2 py-0.5 text-xs font-semibold text-slate-700">
                      {typeConfig.shortTitle} • {summaryMethodLabel}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Details
                    </h3>
                    <ul className="space-y-1.5 text-sm text-slate-700">
                      {summaryDetails.map((line, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-slate-400 mt-1">•</span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Performance
                    </h3>
                    <p className="mt-1.5 text-sm text-slate-600 font-medium">0 used</p>
                    <p className="text-xs text-slate-400">
                      Can't be calculated until discount is active and used.
                    </p>
                  </div>
                </section>

                {/* SALES CHANNELS */}
                <section className={cardClass}>
                  <h2 className="text-base font-semibold text-slate-900">Sales channels</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Select the sales channels where this discount is available.
                  </p>

                  <div className="mt-4 space-y-2.5">
                    <label className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={channelOnlineStore}
                        onChange={(e) => setChannelOnlineStore(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-charcoal-navy focus:ring-[#0B1020]"
                      />
                      Online Store
                    </label>

                    <label className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={channelPOS}
                        onChange={(e) => setChannelPOS(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-charcoal-navy focus:ring-[#0B1020]"
                      />
                      Point of Sale
                    </label>
                  </div>
                </section>

                {/* TAGS */}
                <section className={cardClass}>
                  <h2 className="text-base font-semibold text-slate-900">Tags</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Categorize and group discounts with tags.
                  </p>

                  <div className="mt-3">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      placeholder="Add tag and press Enter"
                      className={inputClass}
                    />

                    {tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {tags.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800"
                          >
                            {t}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(t)}
                              className="text-slate-400 hover:text-slate-700 ml-0.5"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ITEM PICKER MODAL (Products, Collections, Customers) */}
      {pickerModalOpen && (
        <ItemPickerModal
          isOpen={pickerModalOpen}
          mode={pickerMode}
          target={pickerTarget}
          availableProducts={availableProducts}
          availableCollections={availableCollections}
          availableCustomers={availableCustomers}
          loading={loadingData}
          onClose={() => setPickerModalOpen(false)}
          onConfirm={(selectedItems) => {
            if (pickerTarget === "applies_to") {
              if (pickerMode === "products") setSelectedProducts(selectedItems);
              else setSelectedCollections(selectedItems);
            } else if (pickerTarget === "buy_x") {
              if (pickerMode === "products") setBuySelectedProducts(selectedItems);
              else setBuySelectedCollections(selectedItems);
            } else if (pickerTarget === "get_y") {
              if (pickerMode === "products") setGetYSelectedProducts(selectedItems);
              else setGetYSelectedCollections(selectedItems);
            } else if (pickerTarget === "eligibility") {
              setSpecificCustomers(selectedItems);
            }
            setPickerModalOpen(false);
          }}
          initialSelected={
            pickerTarget === "applies_to"
              ? pickerMode === "products"
                ? selectedProducts
                : selectedCollections
              : pickerTarget === "buy_x"
                ? pickerMode === "products"
                  ? buySelectedProducts
                  : buySelectedCollections
                : pickerTarget === "get_y"
                  ? pickerMode === "products"
                    ? getYSelectedProducts
                    : getYSelectedCollections
                  : specificCustomers
          }
        />
      )}
    </div>
  );
}

// GENERIC ITEM PICKER MODAL (Products, Collections, Customers)
function ItemPickerModal({
  isOpen,
  mode,
  availableProducts = [],
  availableCollections = [],
  availableCustomers = [],
  loading = false,
  onClose,
  onConfirm,
  initialSelected = [],
}) {
  const [search, setSearch] = useState("");
  const [selectedMap, setSelectedMap] = useState(() => {
    const map = {};
    initialSelected.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  });

  const list = useMemo(() => {
    if (mode === "products") return availableProducts;
    if (mode === "collections") return availableCollections;
    return availableCustomers;
  }, [mode, availableProducts, availableCollections, availableCustomers]);

  const filtered = useMemo(() => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((item) => {
      const name = item.title || item.name || `${item.first_name || ""} ${item.last_name || ""}`;
      return name.toLowerCase().includes(q) || (item.email && item.email.toLowerCase().includes(q));
    });
  }, [list, search]);

  if (!isOpen) return null;

  const toggleItem = (item) => {
    setSelectedMap((prev) => {
      const next = { ...prev };
      if (next[item.id]) delete next[item.id];
      else next[item.id] = item;
      return next;
    });
  };

  const selectedCount = Object.keys(selectedMap).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[1px] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="flex flex-col w-full max-w-155 max-h-[85vh] rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900 capitalize">Select {mode}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              ⌕
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${mode}...`}
              className="w-full h-10 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-charcoal-navy"
            />
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">Loading {mode}...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">No {mode} found.</div>
          ) : (
            filtered.map((item) => {
              const isChecked = Boolean(selectedMap[item.id]);
              const title =
                item.title ||
                item.name ||
                `${item.first_name || ""} ${item.last_name || ""}`.trim() ||
                item.email ||
                "Untitled";
              const subtitle = item.price
                ? `$${item.price}`
                : item.email || (item.product_count ? `${item.product_count} products` : "");

              return (
                <label
                  key={item.id}
                  onClick={() => toggleItem(item)}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition"
                >
                  <div className="flex items-center gap-3 truncate pr-4">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // handled by parent onClick
                      className="h-4 w-4 rounded border-slate-300 text-charcoal-navy focus:ring-[#0B1020]"
                    />
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-slate-100 text-sm text-slate-600">
                      {mode === "products" ? "📦" : mode === "collections" ? "📁" : "👤"}
                    </div>
                    <div className="truncate">
                      <div className="font-medium text-sm text-slate-900 truncate">{title}</div>
                      {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-[#FAFBFB] px-6 py-3.5">
          <span className="text-xs text-slate-500">
            {selectedCount} {mode} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(Object.values(selectedMap))}
              className="rounded-lg bg-charcoal-navy px-4 py-2 text-sm font-semibold text-white hover:bg-black"
            >
              Add {mode}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
