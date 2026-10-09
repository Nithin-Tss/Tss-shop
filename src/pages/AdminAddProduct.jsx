import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar, { AdminHeader } from "@/components/AdminSidebar";
import { apiGet, apiPost, apiUpload } from "@/lib/api";

const NAVY = "#141b2d";
const PRODUCTS_URL = "/admin/online-store/products";

const inputClass =
  "w-full h-11 rounded-lg border border-[#DDE1EA] bg-[#FAFBFD] px-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#141b2d] focus:bg-white focus:ring-4 focus:ring-[#141b2d]/[0.07]";

// Photos: JPG, PNG or WEBP, up to 5MB each
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

// Returns why a photo can't be added, or "" when it's fine
function photoError(file) {
  // Some browsers leave file.type empty, so fall back to the extension
  const isAllowedType = file.type ? PHOTO_TYPES.includes(file.type) : PHOTO_EXTENSIONS.test(file.name);
  if (!isAllowedType) return "Not a supported image. Use JPG, PNG or WEBP.";
  if (file.size > MAX_PHOTO_SIZE) return "Image is too large. Maximum size is 5MB.";
  return "";
}

const slugify = (text) =>
  text.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");

// Product.status values, and how they read in the top bar and the Visibility card
const STATUSES = [
  { value: "active", label: "Active", text: "Shoppers can find and buy it", badge: "bg-emerald-100 text-emerald-800" },
  { value: "draft", label: "Draft", text: "Only you can see it", badge: "bg-slate-100 text-slate-600" },
  { value: "archived", label: "Archived", text: "Hidden and kept for your records", badge: "bg-amber-100 text-amber-800" },
];

// Product.theme_template values
const PAGE_LAYOUTS = [
  { value: "default", label: "Default product page" },
  { value: "featured", label: "Featured product" },
  { value: "minimal", label: "Minimal" },
];

// Lists from the API come back either as an array or as { results }
const listOf = (res) => (Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.results) ? res.data.results : []);

// Categories in dropdown order: each top-level category followed by its subcategories
function categoryOptions(categories) {
  const byParent = {};
  categories.forEach((c) => (byParent[c.parent || "root"] ||= []).push(c));
  Object.values(byParent).forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name)));

  const rows = [];
  const walk = (parentId, depth) =>
    (byParent[parentId] || []).forEach((c) => {
      rows.push({ id: c.id, label: `${"   ".repeat(depth)}${depth ? "↳ " : ""}${c.name}` });
      if (depth < 4) walk(c.id, depth + 1);
    });
  walk("root", 0);
  return rows;
}

/* ---------- small building blocks ---------- */

function Card({ title, hint, action, children }) {
  return (
    <section>
      <div className="overflow-hidden rounded-[22px] border border-[#E5E7EB] bg-white shadow-[0_4px_16px_-6px_rgba(20,27,45,0.12)]">
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

function Field({ label, help, error, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[13px] font-semibold text-[#141b2d]">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      ) : (
        help && <span className="mt-1 block text-xs text-slate-500">{help}</span>
      )}
    </label>
  );
}

function FieldError({ message }) {
  return message ? <span className="mt-1 block text-xs text-red-600">{message}</span> : null;
}

const withError = (error) => (error ? "border-red-400" : "");

function MoneyInput({ value, onChange, placeholder = "0.00", error }) {
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
        className={`${inputClass} pl-7 ${withError(error)}`}
      />
    </div>
  );
}

// Text box that turns typed words into removable chips (Enter or comma adds one)
function ChipInput({ values, onChange, placeholder }) {
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
    </div>
  );
}

/* ---------- page ---------- */

export default function AdminAddProduct() {
  const navigate = useNavigate();

  // 1 Basic info
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");

  // 2 Photos: [{ id, file, url (preview), uploadedUrl }], in display order
  const [photos, setPhotos] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [photoErrors, setPhotoErrors] = useState([]); // [{ name, message }] from the last upload

  // 3 Pricing
  const [price, setPrice] = useState("");

  // 4 Stock
  const [sku, setSku] = useState("");
  const [locationId, setLocationId] = useState("");
  const [quantity, setQuantity] = useState("");

  // 5 Organize
  const [categoryId, setCategoryId] = useState("");
  const [productType, setProductType] = useState("");
  const [vendor, setVendor] = useState("");
  const [collections, setCollections] = useState([]); // collection names
  const [tags, setTags] = useState([]);

  // 6 Visibility
  const [status, setStatus] = useState("draft");

  // 7 Sales channels (ids)
  const [channelIds, setChannelIds] = useState([]);

  // 8 Page layout
  const [pageLayout, setPageLayout] = useState("default");

  // 9 Google preview
  const [editingSeo, setEditingSeo] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  // The active store's own lists
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [storeCollections, setStoreCollections] = useState([]);
  const [channels, setChannels] = useState([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      apiGet("/api/v1/inventory/locations/"),
      apiGet("/api/v1/catalog/categories/"),
      apiGet("/api/v1/catalog/collections/"),
      apiGet("/api/v1/catalog/sales-channels/"),
    ]).then(([locationsRes, categoriesRes, collectionsRes, channelsRes]) => {
      if (cancelled) return;
      const locationList = listOf(locationsRes);
      const channelList = listOf(channelsRes);

      setLocations(locationList);
      setLocationId((current) => current || locationList[0]?.id || "");
      setCategories(listOf(categoriesRes));
      setStoreCollections(listOf(collectionsRes).map((c) => c.name));
      setChannels(channelList);
      // New products go on the online store by default
      setChannelIds((current) => (current.length ? current : channelList.filter((c) => c.type === "online").map((c) => c.id)));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = Boolean(
    name || about || price || sku || quantity || photos.length || collections.length || tags.length || vendor || productType
  );

  // Warn before closing the tab with unsaved changes
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const categoryRows = useMemo(() => categoryOptions(categories), [categories]);
  const statusInfo = STATUSES.find((s) => s.value === status) || STATUSES[1];

  const leave = () => {
    if (!dirty || window.confirm("Leave without saving? Your changes will be lost.")) {
      navigate(PRODUCTS_URL);
    }
  };

  /* photos */
  const addPhotos = (fileList) => {
    const images = [];
    const rejected = [];
    Array.from(fileList || []).forEach((file) => {
      const message = photoError(file);
      if (message) rejected.push({ name: file.name, message });
      else images.push(file);
    });

    setPhotoErrors(rejected);
    if (!images.length) return;

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

  const toggleCollection = (collection) =>
    setCollections((prev) => (prev.includes(collection) ? prev.filter((c) => c !== collection) : [...prev, collection]));

  const toggleChannel = (id) =>
    setChannelIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const fail = (message, errors = {}) => {
    setSaving(false);
    setFieldErrors(errors);
    setError(message);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Upload any photos not sent yet, keeping their order; returns the urls, or null on failure
  const uploadPhotos = async () => {
    const urls = [];
    const updated = [...photos];

    for (let i = 0; i < updated.length; i += 1) {
      const photo = updated[i];
      if (!photo.uploadedUrl) {
        const res = await apiUpload("/api/v1/catalog/products/images/", "image", photo.file);
        if (!res.ok) {
          setPhotos(updated);
          return { error: `${photo.file.name}: ${res.error}` };
        }
        updated[i] = { ...photo, uploadedUrl: res.data.url };
      }
      urls.push(updated[i].uploadedUrl);
    }

    setPhotos(updated);
    return { urls };
  };

  /* save */
  const handleSave = async () => {
    const errors = {};
    if (!name.trim()) errors.title = "Give your product a name.";
    if (price !== "" && !(parseFloat(price) >= 0)) errors.price = "Enter a price of 0 or more.";
    if (quantity !== "" && !(Number.isInteger(Number(quantity)) && Number(quantity) >= 0)) {
      errors.quantity = "Enter a whole number of 0 or more.";
    }
    if (quantity !== "" && !locationId) errors.location = "Choose a location for this stock.";

    if (Object.keys(errors).length) {
      fail("Please fix the highlighted fields.", errors);
      return;
    }

    setSaving(true);
    setError("");
    setFieldErrors({});

    const uploaded = await uploadPhotos();
    if (uploaded.error) {
      fail("A photo couldn't be uploaded.", { images: uploaded.error });
      return;
    }

    // Sent for the active store: lib/api adds its id to every request (X-Store-Id)
    const payload = {
      title: name.trim(),
      description: about.trim(),
      images: uploaded.urls,
      price: price === "" ? null : price,
      sku: sku.trim(),
      location: quantity === "" ? null : locationId || null,
      quantity: quantity === "" ? null : Number(quantity),
      category_id: categoryId || null,
      product_type: productType.trim(),
      vendor: vendor.trim(),
      collections,
      tags,
      status,
      sales_channels: channelIds,
      theme_template: pageLayout,
      seo_title: seoTitle.trim(),
      seo_description: seoDescription.trim(),
    };

    const res = await apiPost("/api/v1/catalog/products/", payload);

    if (!res.ok) {
      fail(res.formError || "Please fix the highlighted fields.", res.fieldErrors || {});
      return;
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
            <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={leave}
                  className="-ml-1 flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  <span aria-hidden>←</span> Back
                </button>
                <h1 className="truncate text-lg font-bold">{name.trim() || "New product"}</h1>
                <span className={`hidden sm:inline rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusInfo.badge}`}>
                  {statusInfo.label}
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
            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-[#141b2d]">Add a new product</h2>
              <p className="mt-1 text-sm text-[#55607A]">
                Work down the steps below. Only the product name is required. You can come back and fill in the rest later.
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div className="space-y-6">
              {/* 1 BASIC INFO */}
              <Card title="Basic info" hint="Give your product a clear name and describe it in a few simple sentences.">
                <div className="space-y-4">
                  <Field label="Product name" error={fieldErrors.title}>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Zonzo Chardonnay 2023 750ml"
                      className={`${inputClass} ${withError(fieldErrors.title)}`}
                      autoFocus
                    />
                  </Field>

                  <Field label="About this product" help={`${about.length} characters`} error={fieldErrors.description}>
                    <textarea
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      rows={6}
                      placeholder="Tell shoppers what it is, what it's made of and why they'll love it."
                      className={`${inputClass} h-auto resize-y py-2.5 leading-relaxed ${withError(fieldErrors.description)}`}
                    />
                  </Field>
                </div>
              </Card>

              {/* 2 PHOTOS */}
              <Card title="Photos" hint="Add clear photos of the product. The first photo is the main one shoppers see.">
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
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        addPhotos(e.target.files);
                        // Reset so choosing the same file again still triggers onChange
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>

                {photoErrors.length > 0 && (
                  <div role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {photoErrors.length > 1 && (
                      <p className="mb-1 font-semibold">{photoErrors.length} files weren't added:</p>
                    )}
                    <ul className="space-y-0.5">
                      {photoErrors.map((item, i) => (
                        <li key={`${item.name}-${i}`}>
                          <span className="font-medium break-all">{item.name}</span>: {item.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <FieldError message={fieldErrors.images} />
              </Card>

              {/* 3 PRICING */}
              <Card title="Pricing" hint="Set what shoppers pay for this product.">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Selling price" error={fieldErrors.price}>
                    <MoneyInput value={price} onChange={setPrice} error={fieldErrors.price} />
                  </Field>
                </div>
              </Card>

              {/* 4 STOCK */}
              <Card title="Stock" hint="Enter how many you have, plus your own codes to keep track of it.">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="SKU" help="Your own stock code" error={fieldErrors.sku}>
                    <input
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="e.g. WINE-ZC-750"
                      className={`${inputClass} ${withError(fieldErrors.sku)}`}
                    />
                  </Field>
                  <div>
                    <Field
                      label="Location"
                      help={locations.length ? "Where this stock is kept" : undefined}
                      error={fieldErrors.location}
                    >
                      <select
                        value={locationId}
                        onChange={(e) => setLocationId(e.target.value)}
                        disabled={!locations.length}
                        className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400 ${withError(fieldErrors.location)}`}
                      >
                        {locations.length ? (
                          locations.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))
                        ) : (
                          <option value="">No locations yet</option>
                        )}
                      </select>
                    </Field>
                    {!locations.length && !fieldErrors.location && (
                      <span className="mt-1 block text-xs text-slate-500">
                        Add one under{" "}
                        <Link to="/admin/online-store/inventory" className="font-medium text-[#141b2d] underline">
                          Inventory
                        </Link>
                      </span>
                    )}
                  </div>
                  <Field label="Quantity" error={fieldErrors.quantity}>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="0"
                      className={`${inputClass} ${withError(fieldErrors.quantity)}`}
                    />
                  </Field>
                </div>
              </Card>

              {/* 5 ORGANIZE */}
              <Card title="Organize" hint="Add a category, vendor, collections and tags so the product is easy to find and sort.">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Category" error={fieldErrors.category_id}>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className={`${inputClass} ${withError(fieldErrors.category_id)}`}
                    >
                      <option value="">{categoryRows.length ? "No category" : "No categories yet"}</option>
                      {categoryRows.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Product type" error={fieldErrors.product_type}>
                    <input
                      value={productType}
                      onChange={(e) => setProductType(e.target.value)}
                      placeholder="e.g. White wine"
                      className={`${inputClass} ${withError(fieldErrors.product_type)}`}
                    />
                  </Field>
                  <Field label="Vendor" error={fieldErrors.vendor}>
                    <input
                      value={vendor}
                      onChange={(e) => setVendor(e.target.value)}
                      placeholder="e.g. Sipnow"
                      className={`${inputClass} ${withError(fieldErrors.vendor)}`}
                    />
                  </Field>
                  <div>
                    <span className="mb-1.5 block text-[13px] font-semibold text-[#141b2d]">Collections</span>
                    {storeCollections.length ? (
                      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-[#DDE1EA] bg-[#FAFBFD] px-2 py-1.5">
                        {storeCollections.map((collection) => {
                          const selected = collections.includes(collection);
                          return (
                            <button
                              key={collection}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => toggleCollection(collection)}
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                                selected
                                  ? "bg-[#141b2d] text-white"
                                  : "border border-[#DDE1EA] bg-white text-slate-600 hover:border-[#141b2d] hover:text-[#141b2d]"
                              }`}
                            >
                              {collection}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="flex min-h-11 items-center rounded-lg border border-[#DDE1EA] bg-[#FAFBFD] px-3.5 text-sm text-slate-400">
                        No collections yet
                      </p>
                    )}
                    <FieldError message={fieldErrors.collections} />
                  </div>
                  <div className="sm:col-span-2">
                    <span className="mb-1.5 block text-[13px] font-semibold text-[#141b2d]">Tags</span>
                    <ChipInput values={tags} onChange={setTags} placeholder="Type a tag and press Enter" />
                    <FieldError message={fieldErrors.tags} />
                  </div>
                </div>
              </Card>

              {/* 6 VISIBILITY */}
              <Card title="Visibility" hint="Choose whether shoppers can see this product now, or keep it hidden for later.">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {STATUSES.map((opt) => (
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
                <FieldError message={fieldErrors.status} />
              </Card>

              {/* 7 SALES CHANNELS */}
              <Card title="Sales channels" hint="Choose where you want to sell this product.">
                {channels.length ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {channels.map((ch) => (
                      <label key={ch.id} className="flex cursor-pointer items-center justify-between rounded-lg border border-[#DDE1EA] bg-[#FAFBFD] px-4 py-3 text-sm font-medium">
                        {ch.name}
                        <input
                          type="checkbox"
                          checked={channelIds.includes(ch.id)}
                          onChange={() => toggleChannel(ch.id)}
                          className="h-4 w-4 accent-[#141b2d]"
                        />
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Loading your sales channels…</p>
                )}
                <FieldError message={fieldErrors.sales_channels} />
              </Card>

              {/* 8 PAGE LAYOUT */}
              <Card title="Page layout" hint="Choose which product page template your store uses for this product.">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Product page template" error={fieldErrors.theme_template}>
                    <select
                      value={pageLayout}
                      onChange={(e) => setPageLayout(e.target.value)}
                      className={`${inputClass} ${withError(fieldErrors.theme_template)}`}
                    >
                      {PAGE_LAYOUTS.map((layout) => (
                        <option key={layout.value} value={layout.value}>
                          {layout.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </Card>

              {/* 9 GOOGLE PREVIEW */}
              <Card
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

                {(editingSeo || fieldErrors.seo_title || fieldErrors.seo_description) && (
                  <div className="mt-4 space-y-4">
                    <Field label="SEO title" help={`${seoTitle.length} of 70 characters`} error={fieldErrors.seo_title}>
                      <input
                        value={seoTitle}
                        maxLength={70}
                        onChange={(e) => setSeoTitle(e.target.value)}
                        placeholder={name}
                        className={`${inputClass} ${withError(fieldErrors.seo_title)}`}
                      />
                    </Field>
                    <Field label="SEO description" help={`${seoDescription.length} of 160 characters`} error={fieldErrors.seo_description}>
                      <textarea
                        value={seoDescription}
                        maxLength={160}
                        rows={3}
                        onChange={(e) => setSeoDescription(e.target.value)}
                        className={`${inputClass} h-auto resize-none py-2.5 ${withError(fieldErrors.seo_description)}`}
                      />
                    </Field>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
