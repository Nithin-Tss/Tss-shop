import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar, { AdminHeader } from "@/components/AdminSidebar";
import { apiGet, apiPost } from "@/lib/api";

const NAVY = "#141b2d";
const PRODUCTS_URL = "/admin/online-store/products";

const inputClass =
  "w-full h-11 rounded-lg border border-[#DDE1EA] bg-[#FAFBFD] px-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#141b2d] focus:bg-white focus:ring-4 focus:ring-[#141b2d]/[0.07]";

const slugify = (text) =>
  text.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");

// Every combination of option values: [["S","Red"], ["S","Blue"], ...]
function combinations(options) {
  const filled = options.filter((o) => o.name.trim() && o.values.length);
  if (!filled.length) return [];
  return filled.reduce(
    (rows, option) => rows.flatMap((row) => option.values.map((v) => [...row, v])),
    [[]]
  );
}

/* ---------- small building blocks ---------- */

function Card({ step, title, hint, action, last = false, children }) {
  return (
    <section className="relative flex gap-3 sm:gap-4">
      {/* step marker + the line joining it to the next step */}
      <div className="relative flex w-9 shrink-0 flex-col items-center sm:w-11">
        <span
          className="z-10 flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white shadow-md shadow-[#141b2d]/20 sm:h-11 sm:w-11 sm:text-base"
          style={{ backgroundColor: NAVY }}
        >
          {step}
        </span>
        {!last && <span className="absolute top-9 -bottom-6 w-px border-l-2 border-dashed border-[#D5DAE3] sm:top-11" />}
      </div>

      <div className="min-w-0 flex-1 overflow-hidden rounded-[22px] rounded-tl-md border border-[#E5E7EB] bg-white shadow-[0_4px_16px_-6px_rgba(20,27,45,0.12)]">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E6E9F2] bg-[#EEF1F8] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight text-[#141b2d]">{title}</h2>
            {hint && <p className="mt-0.5 text-[13px] leading-snug text-[#55607A]">{hint}</p>}
          </div>
          {action && <div className="shrink-0 pt-0.5">{action}</div>}
        </header>
        <div className="px-5 py-5 sm:px-6">{children}</div>
      </div>
    </section>
  );
}

function Field({ label, help, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[13px] font-semibold text-[#141b2d]">{label}</span>
      {children}
      {help && <span className="mt-1 block text-xs text-slate-500">{help}</span>}
    </label>
  );
}

function MoneyInput({ value, onChange, placeholder = "0.00" }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
      <input
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputClass} pl-7`}
      />
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-xs font-medium text-slate-600"
    >
      {label}
      <span
        className="relative h-5 w-9 rounded-full transition"
        style={{ backgroundColor: checked ? NAVY : "#CBD5E1" }}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

// Text box that turns typed words into removable chips (Enter or comma adds one)
function ChipInput({ values, onChange, placeholder, suggestions = [], listId }) {
  const [draft, setDraft] = useState("");

  const add = (raw) => {
    const value = raw.trim().replace(/,$/, "");
    if (value && !values.some((v) => v.toLowerCase() === value.toLowerCase())) {
      onChange([...values, value]);
    }
    setDraft("");
  };

  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-[#DDE1EA] bg-[#FAFBFD] px-2 py-1.5 focus-within:border-[#141b2d] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#141b2d]/[0.07]">
      {values.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 rounded-full bg-[#141b2d] px-2.5 py-0.5 text-xs font-medium text-white">
          {v}
          <button
            type="button"
            aria-label={`Remove ${v}`}
            onClick={() => onChange(values.filter((x) => x !== v))}
            className="text-white/60 hover:text-white"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        list={listId}
        onChange={(e) => (e.target.value.endsWith(",") ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={() => draft && add(draft)}
        placeholder={values.length ? "" : placeholder}
        className="min-w-[90px] flex-1 bg-transparent px-1.5 text-sm outline-none placeholder:text-slate-400"
      />
      {listId && (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </div>
  );
}

/* ---------- page ---------- */

export default function AdminAddProduct() {
  const navigate = useNavigate();

  // Basic info
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");

  // Photos (previews only for now)
  const [photos, setPhotos] = useState([]);
  const [dragging, setDragging] = useState(false);

  // Pricing
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [cost, setCost] = useState("");
  const [chargeTax, setChargeTax] = useState(true);

  // Stock
  const [trackStock, setTrackStock] = useState(true);
  const [quantity, setQuantity] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [sellWhenOut, setSellWhenOut] = useState(false);

  // Delivery
  const [physical, setPhysical] = useState(true);
  const [size, setSize] = useState({ length: "", width: "", height: "" });
  const [sizeUnit, setSizeUnit] = useState("cm");
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState("kg");

  // Options -> variants
  const [options, setOptions] = useState([]);
  const [variantData, setVariantData] = useState({}); // "S / Red" -> {price, sku, quantity}

  // Extra details
  const [category, setCategory] = useState("");
  const [productType, setProductType] = useState("");

  // Google preview
  const [editingSeo, setEditingSeo] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  // Sidebar
  const [status, setStatus] = useState("draft");
  const [channels, setChannels] = useState({ online: true, pos: false });
  const [brand, setBrand] = useState("");
  const [groups, setGroups] = useState([]);
  const [labels, setLabels] = useState([]);
  const [pageLayout, setPageLayout] = useState("default");

  const [groupSuggestions, setGroupSuggestions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    apiGet("/api/v1/catalog/collections/").then((res) => {
      if (res.ok && Array.isArray(res.data)) setGroupSuggestions(res.data.map((c) => c.name));
    });
  }, []);

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = Boolean(
    name || about || price || sku || photos.length || options.length || groups.length || labels.length || brand
  );

  // Warn before closing the tab with unsaved changes
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const variants = useMemo(() => combinations(options).map((combo) => combo.join(" / ")), [options]);

  const margin = useMemo(() => {
    const p = parseFloat(price);
    const c = parseFloat(cost);
    if (!(p > 0) || Number.isNaN(c)) return null;
    return { profit: p - c, percent: ((p - c) / p) * 100 };
  }, [price, cost]);

  const leave = () => {
    if (!dirty || window.confirm("Leave without saving? Your changes will be lost.")) {
      navigate(PRODUCTS_URL);
    }
  };

  /* photos */
  const addPhotos = (fileList) => {
    const images = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
    setPhotos((prev) => [
      ...prev,
      ...images.map((file) => ({ id: `${file.name}-${file.lastModified}-${Math.random()}`, file, url: URL.createObjectURL(file) })),
    ]);
  };

  const removePhoto = (id) =>
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.url);
      return prev.filter((p) => p.id !== id);
    });

  const makeCover = (id) =>
    setPhotos((prev) => [prev.find((p) => p.id === id), ...prev.filter((p) => p.id !== id)]);

  /* options */
  const updateOption = (index, patch) =>
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)));

  const updateVariant = (key, patch) =>
    setVariantData((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  /* save */
  const handleSave = async () => {
    if (!name.trim()) {
      setFieldErrors({ title: "Give your product a name." });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSaving(true);
    setError("");
    setFieldErrors({});

    const payload = {
      title: name.trim(),
      description: about.trim(),
      status,
      vendor: brand.trim(),
      product_type: productType.trim(),
      category: category.trim(),
      seo_title: seoTitle.trim(),
      seo_description: seoDescription.trim(),
      collections: groups,
      tags: labels,
      price: price === "" ? null : price,
      sku: sku.trim(),
    };

    if (variants.length) {
      payload.variants = variants.map((key) => ({
        title: key,
        price: variantData[key]?.price || price || null,
        sku: (variantData[key]?.sku || "").trim(),
      }));
    }

    const res = await apiPost("/api/v1/catalog/products/", payload);

    if (!res.ok) {
      setSaving(false);
      setFieldErrors(res.fieldErrors || {});
      setError(res.formError || "Please fix the highlighted fields.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Record opening stock at the first location
    const quantities = variants.length
      ? variants.map((key) => variantData[key]?.quantity)
      : [quantity];

    if (trackStock && quantities.some((q) => q !== undefined && q !== "")) {
      const locations = await apiGet("/api/v1/inventory/locations/");
      const location = locations.ok && Array.isArray(locations.data) ? locations.data[0] : null;

      if (!location) {
        setSaving(false);
        setError("Product saved, but stock wasn't recorded: add a location under Inventory first.");
        return;
      }

      await Promise.all(
        (res.data.variants || []).map((variant, i) =>
          quantities[i] === undefined || quantities[i] === ""
            ? null
            : apiPost("/api/v1/inventory/items/set/", {
                variant: variant.id,
                location: location.id,
                available: Math.max(0, parseInt(quantities[i], 10) || 0),
              })
        )
      );
    }

    setSaving(false);
    navigate(PRODUCTS_URL);
  };

  const shownSeoTitle = seoTitle || name || "Your product name";
  const shownSeoDescription =
    seoDescription || about || "Add a short description so shoppers know what makes this product special.";

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <AdminHeader />

      <div className="flex min-h-[calc(100vh-72px)]">
        <AdminSidebar />

        <main className="flex-1 min-w-0 bg-white">
          {/* STICKY ACTION BAR */}
          <div className="sticky top-[72px] z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-[960px] items-center justify-between gap-3 px-3 py-3 sm:px-4">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={leave}
                  className="flex h-9 items-center gap-1.5 rounded-full border border-[#DDE1EA] bg-white px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <span aria-hidden>←</span> Back
                </button>
                <h1 className="truncate text-lg font-bold">{name.trim() || "New product"}</h1>
                <span
                  className={`hidden sm:inline rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {status === "active" ? "Live" : "Hidden"}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={leave}
                  className="h-9 rounded-full px-4 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="h-9 rounded-full px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: NAVY }}
                >
                  {saving ? "Saving..." : "Save product"}
                </button>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-[960px] px-3 py-8 sm:px-4">
            <div className="mb-8 pl-12 sm:pl-[60px]">
              <h2 className="text-2xl font-bold tracking-tight text-[#141b2d]">Add a new product</h2>
              <p className="mt-1 text-sm text-[#55607A]">
                Work down the steps below. Only the product name is required. You can come back and fill in the rest later.
              </p>
            </div>

            {error && (
              <div className="mb-6 ml-12 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:ml-[60px]">{error}</div>
            )}

            <div className="space-y-6">
              {/* 1 BASIC INFO */}
              <Card step={1} title="Basic info" hint="Give your product a clear name and describe it in a few simple sentences.">
                <div className="space-y-4">
                  <Field label="Product name">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Zonzo Chardonnay 2023 750ml"
                      className={`${inputClass} ${fieldErrors.title ? "border-red-400" : ""}`}
                      autoFocus
                    />
                    {fieldErrors.title && <span className="mt-1 block text-xs text-red-600">{fieldErrors.title}</span>}
                  </Field>

                  <Field label="About this product" help={`${about.length} characters`}>
                    <textarea
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      rows={6}
                      placeholder="Tell shoppers what it is, what it's made of and why they'll love it."
                      className={`${inputClass} h-auto resize-y py-2.5 leading-relaxed`}
                    />
                  </Field>
                </div>
              </Card>

              {/* 2 PHOTOS */}
              <Card step={2} title="Photos" hint="Add clear photos of the product. The first photo is the main one shoppers see.">
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {photos.map((photo, i) => (
                    <div
                      key={photo.id}
                      className={`group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50 ${
                        i === 0 ? "col-span-2 row-span-2" : ""
                      }`}
                    >
                      <img src={photo.url} alt="" className="h-full w-full object-cover" />
                      {i === 0 && (
                        <span className="absolute left-2 top-2 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold">Cover</span>
                      )}
                      <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/50 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                        {i !== 0 && (
                          <button type="button" onClick={() => makeCover(photo.id)} className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold">
                            Make cover
                          </button>
                        )}
                        <button type="button" onClick={() => removePhoto(photo.id)} className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}

                  <label
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      addPhotos(e.dataTransfer.files);
                    }}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-center transition ${
                      photos.length ? "aspect-square" : "col-span-3 py-10 sm:col-span-5"
                    } ${dragging ? "border-[#141b2d] bg-slate-50" : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"}`}
                  >
                    <span className="text-2xl text-slate-400">＋</span>
                    <span className="text-xs font-semibold text-slate-700">{photos.length ? "Add" : "Upload photos"}</span>
                    {!photos.length && <span className="text-xs text-slate-500">or drag and drop images here</span>}
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} />
                  </label>
                </div>
              </Card>

              {/* 3 PRICING */}
              <Card step={3} title="Pricing" hint="Set what shoppers pay. Your cost stays private and helps you see your profit.">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Selling price">
                    <MoneyInput value={price} onChange={setPrice} />
                  </Field>
                  <Field label="Original price" help="Shown crossed out">
                    <MoneyInput value={originalPrice} onChange={setOriginalPrice} />
                  </Field>
                  <Field label="Your cost" help="Customers won't see this">
                    <MoneyInput value={cost} onChange={setCost} />
                  </Field>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3">
                  <div className="flex gap-6 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Profit</p>
                      <p className="font-semibold">{margin ? `$${margin.profit.toFixed(2)}` : "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Profit margin</p>
                      <p className={`font-semibold ${margin && margin.percent < 0 ? "text-red-600" : ""}`}>
                        {margin ? `${margin.percent.toFixed(1)}%` : "—"}
                      </p>
                    </div>
                  </div>
                  <Toggle checked={chargeTax} onChange={setChargeTax} label="Charge tax" />
                </div>
              </Card>

              {/* 4 STOCK */}
              <Card step={4} title="Stock" hint="Enter how many you have, plus your own codes to keep track of it." action={<Toggle checked={trackStock} onChange={setTrackStock} label="Track quantity" />}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Quantity" help={variants.length ? "Set per option below" : undefined}>
                    <input
                      type="number"
                      min="0"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      disabled={!trackStock || variants.length > 0}
                      placeholder="0"
                      className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
                    />
                  </Field>
                  <Field label="SKU" help="Your own stock code">
                    <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. WINE-ZC-750" className={inputClass} />
                  </Field>
                  <Field label="Barcode" help="ISBN, UPC, GTIN…">
                    <input value={barcode} onChange={(e) => setBarcode(e.target.value)} className={inputClass} />
                  </Field>
                </div>
                <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={sellWhenOut}
                    onChange={(e) => setSellWhenOut(e.target.checked)}
                    className="h-4 w-4 accent-[#141b2d]"
                  />
                  Keep selling when out of stock
                </label>
              </Card>

              {/* 5 OPTIONS */}
              <Card
                step={5}
                title="Options"
                hint="Does it come in different sizes, colours or styles? Add each choice here."
                action={
                  options.length < 3 && (
                    <button
                      type="button"
                      onClick={() => setOptions((prev) => [...prev, { name: "", values: [] }])}
                      className="h-8 rounded-full border border-[#141b2d]/20 bg-white px-3.5 text-xs font-semibold text-[#141b2d] hover:bg-[#141b2d] hover:text-white"
                    >
                      + Add option
                    </button>
                  )
                }
              >
                {options.length === 0 ? (
                  <p className="text-sm text-slate-500">This product comes in one version. Add an option if it has sizes or colours.</p>
                ) : (
                  <div className="space-y-3">
                    {options.map((option, i) => (
                      <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-[#DDE1EA] bg-[#FAFBFD] p-3 sm:grid-cols-[180px_1fr_auto]">
                        <input
                          value={option.name}
                          onChange={(e) => updateOption(i, { name: e.target.value })}
                          placeholder="Option name, e.g. Size"
                          className={inputClass}
                        />
                        <ChipInput
                          values={option.values}
                          onChange={(values) => updateOption(i, { values })}
                          placeholder="Values, e.g. Small, Medium"
                        />
                        <button
                          type="button"
                          onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))}
                          className="h-10 rounded-xl px-3 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    ))}

                    {variants.length > 0 && (
                      <div className="overflow-x-auto rounded-lg border border-[#DDE1EA]">
                        <table className="w-full min-w-[480px] text-sm">
                          <thead className="bg-[#EEF1F8] text-left text-xs text-[#55607A]">
                            <tr>
                              <th className="px-3 py-2 font-semibold">Version</th>
                              <th className="px-3 py-2 font-semibold">Price</th>
                              <th className="px-3 py-2 font-semibold">SKU</th>
                              {trackStock && <th className="px-3 py-2 font-semibold">Quantity</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {variants.map((key) => (
                              <tr key={key} className="border-t border-slate-100">
                                <td className="px-3 py-2 font-medium">{key}</td>
                                <td className="px-3 py-2">
                                  <MoneyInput
                                    value={variantData[key]?.price ?? ""}
                                    onChange={(v) => updateVariant(key, { price: v })}
                                    placeholder={price || "0.00"}
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    value={variantData[key]?.sku ?? ""}
                                    onChange={(e) => updateVariant(key, { sku: e.target.value })}
                                    className={inputClass}
                                  />
                                </td>
                                {trackStock && (
                                  <td className="px-3 py-2">
                                    <input
                                      type="number"
                                      min="0"
                                      value={variantData[key]?.quantity ?? ""}
                                      onChange={(e) => updateVariant(key, { quantity: e.target.value })}
                                      placeholder="0"
                                      className={`${inputClass} w-24`}
                                    />
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* 6 DELIVERY */}
              <Card step={6} title="Delivery" hint="Enter the packed size and weight so shipping costs can be worked out." action={<Toggle checked={physical} onChange={setPhysical} label="Ships physically" />}>
                {physical ? (
                  <div className="space-y-4">
                    <Field label="Package size">
                      <div className="flex items-center gap-2">
                        {["length", "width", "height"].map((dim, i) => (
                          <div key={dim} className="flex flex-1 items-center gap-2">
                            {i > 0 && <span className="text-slate-400">×</span>}
                            <input
                              type="number"
                              min="0"
                              value={size[dim]}
                              onChange={(e) => setSize((s) => ({ ...s, [dim]: e.target.value }))}
                              placeholder={dim[0].toUpperCase()}
                              aria-label={dim}
                              className={inputClass}
                            />
                          </div>
                        ))}
                        <select value={sizeUnit} onChange={(e) => setSizeUnit(e.target.value)} className={`${inputClass} w-20`}>
                          <option value="cm">cm</option>
                          <option value="in">in</option>
                        </select>
                      </div>
                    </Field>
                    <Field label="Weight" className="max-w-xs">
                      <div className="flex gap-2">
                        <input type="number" min="0" step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0.0" className={inputClass} />
                        <select value={weightUnit} onChange={(e) => setWeightUnit(e.target.value)} className={`${inputClass} w-20`}>
                          <option value="kg">kg</option>
                          <option value="g">g</option>
                          <option value="lb">lb</option>
                          <option value="oz">oz</option>
                        </select>
                      </div>
                    </Field>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Digital products and services don't need delivery details.</p>
                )}
              </Card>

              {/* 7 ORGANIZE */}
              <Card step={7} title="Organize" hint="Add a brand, groups and labels so the product is easy to find and sort.">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Brand">
                    <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Sipnow" className={inputClass} />
                  </Field>
                  <div>
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">Groups</span>
                    <ChipInput
                      values={groups}
                      onChange={setGroups}
                      placeholder="Add to a group"
                      suggestions={groupSuggestions}
                      listId="product-groups"
                    />
                  </div>
                  <div>
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">Labels</span>
                    <ChipInput values={labels} onChange={setLabels} placeholder="Add labels" />
                  </div>
                  <Field label="Page layout">
                    <select value={pageLayout} onChange={(e) => setPageLayout(e.target.value)} className={inputClass}>
                      <option value="default">Default product page</option>
                      <option value="featured">Featured product</option>
                      <option value="minimal">Minimal</option>
                    </select>
                  </Field>
                </div>
              </Card>

              {/* 8 EXTRA DETAILS */}
              <Card step={8} title="Extra details" hint="Optional. These details help with searching and filtering in your store.">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Category">
                    <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Wine" className={inputClass} />
                  </Field>
                  <Field label="Product type">
                    <input value={productType} onChange={(e) => setProductType(e.target.value)} placeholder="e.g. White wine" className={inputClass} />
                  </Field>
                </div>
              </Card>

              {/* 9 GOOGLE PREVIEW */}
              <Card
                step={9}
                title="Google preview"
                hint="This is how the product may look on Google. Edit it if you want to change it."
                action={
                  <button
                    type="button"
                    onClick={() => setEditingSeo((v) => !v)}
                    className="h-8 rounded-full border border-[#141b2d]/20 bg-white px-3.5 text-xs font-semibold text-[#141b2d] hover:bg-[#141b2d] hover:text-white"
                  >
                    {editingSeo ? "Done" : "Edit"}
                  </button>
                }
              >
                <div className="rounded-lg border border-[#DDE1EA] bg-white p-4 shadow-sm">
                  <p className="text-xs text-slate-600">
                    yourstore.com › products › {slugify(name) || "product-name"}
                  </p>
                  <p className="mt-0.5 truncate text-lg text-[#1a0dab]">{shownSeoTitle}</p>
                  <p className="line-clamp-2 text-sm text-slate-600">{shownSeoDescription}</p>
                  {price && <p className="mt-1 text-xs text-slate-500">${parseFloat(price).toFixed(2)}</p>}
                </div>

                {editingSeo && (
                  <div className="mt-4 space-y-4">
                    <Field label="Page title" help={`${seoTitle.length} of 70 characters`}>
                      <input value={seoTitle} maxLength={70} onChange={(e) => setSeoTitle(e.target.value)} placeholder={name} className={inputClass} />
                    </Field>
                    <Field label="Short description" help={`${seoDescription.length} of 160 characters`}>
                      <textarea
                        value={seoDescription}
                        maxLength={160}
                        rows={3}
                        onChange={(e) => setSeoDescription(e.target.value)}
                        className={`${inputClass} h-auto resize-none py-2.5`}
                      />
                    </Field>
                  </div>
                )}
              </Card>

              {/* 10 SALES CHANNELS */}
              <Card step={10} title="Sales channels" hint="Choose where you want to sell this product.">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    { key: "online", label: "Online store" },
                    { key: "pos", label: "Point of sale" },
                  ].map((ch) => (
                    <label key={ch.key} className="flex cursor-pointer items-center justify-between rounded-lg border border-[#DDE1EA] bg-[#FAFBFD] px-4 py-3 text-sm font-medium">
                      {ch.label}
                      <input
                        type="checkbox"
                        checked={channels[ch.key]}
                        onChange={(e) => setChannels((c) => ({ ...c, [ch.key]: e.target.checked }))}
                        className="h-4 w-4 accent-[#141b2d]"
                      />
                    </label>
                  ))}
                </div>
              </Card>

              {/* 11 VISIBILITY */}
              <Card step={11} last title="Visibility" hint="Choose whether shoppers can see this product now, or keep it hidden for later.">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    { value: "active", label: "Live", text: "Shoppers can find and buy it" },
                    { value: "draft", label: "Hidden", text: "Only you can see it" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                        status === opt.value ? "border-[#141b2d] bg-[#EEF1F8] ring-1 ring-[#141b2d]" : "border-[#DDE1EA] hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value={opt.value}
                        checked={status === opt.value}
                        onChange={() => setStatus(opt.value)}
                        className="mt-0.5 accent-[#141b2d]"
                      />
                      <span>
                        <span className="block text-sm font-semibold">{opt.label}</span>
                        <span className="block text-xs text-slate-500">{opt.text}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
