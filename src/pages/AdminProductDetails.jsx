import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AdminSidebar, { AdminHeader } from "@/components/AdminSidebar";
import { apiDelete, apiGet, apiRequest } from "@/lib/api";

const PRODUCTS_URL = "/admin/online-store/products";

const inputClass =
  "w-full h-11 rounded-lg border border-[#DDE1EA] bg-[#FAFBFD] px-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#141b2d] focus:bg-white focus:ring-4 focus:ring-[#141b2d]/[0.07]";

function Card({ title, children }) {
  return (
    <section className="overflow-hidden rounded-[22px] border border-[#E5E7EB] bg-white shadow-[0_4px_16px_-6px_rgba(20,27,45,0.12)]">
      <h2 className="border-b border-[#E6E9F2] bg-[#EEF1F8] px-5 py-4 text-base font-bold tracking-tight text-[#141b2d] sm:px-6">
        {title}
      </h2>
      <div className="space-y-4 px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

function Field({ label, help, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-[#141b2d]">{label}</span>
      {children}
      {help && !error && <span className="mt-1 block text-xs text-slate-500">{help}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

const listText = (items) => (items || []).join(", ");
const splitList = (text) =>
  [...new Set(text.split(",").map((v) => v.trim()).filter(Boolean))];

export default function AdminProductDetails() {
  const { productId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiGet(`/api/v1/catalog/products/${productId}/`).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setLoadError(res.error || "We couldn't load this product.");
        return;
      }
      const p = res.data;
      setForm({
        title: p.title || "",
        status: p.status || "draft",
        description: p.description || "",
        vendor: p.vendor || "",
        product_type: p.product_type || "",
        category: p.category || "",
        collections: listText(p.collections),
        tags: listText(p.tags),
        seo_title: p.seo_title || "",
        seo_description: p.seo_description || "",
        variants: (p.variants || []).map((v) => ({ id: v.id, sku: v.sku || "", price: v.price ?? "" })),
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const set = (field) => (e) => {
    setSaved(false);
    setForm((f) => ({ ...f, [field]: e.target.value }));
  };

  const setVariant = (id, field, value) => {
    setSaved(false);
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v) => (v.id === id ? { ...v, [field]: value } : v)),
    }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError("Give your product a name.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const p = await apiRequest(`/api/v1/catalog/products/${productId}/`, {
        method: "PATCH",
        body: {
          title: form.title.trim(),
          status: form.status,
          description: form.description.trim(),
          vendor: form.vendor.trim(),
          product_type: form.product_type.trim(),
          category: form.category.trim(),
          collections: splitList(form.collections),
          tags: splitList(form.tags),
          seo_title: form.seo_title.trim(),
          seo_description: form.seo_description.trim(),
          variants: form.variants.map((v) => ({
            id: v.id,
            sku: v.sku.trim(),
            price: v.price === "" ? null : v.price,
          })),
        },
      });
      setForm((f) => ({
        ...f,
        variants: (p.variants || []).map((v) => ({ id: v.id, sku: v.sku || "", price: v.price ?? "" })),
        updatedAt: p.updatedAt,
      }));
      setSaved(true);
    } catch (err) {
      const first = err.data && typeof err.data === "object" ? Object.entries(err.data)[0] : null;
      setError(first ? `${first[0]}: ${[].concat(first[1])[0]}` : err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${form.title}"? This can't be undone.`)) return;
    setDeleting(true);
    setError("");
    const res = await apiDelete(`/api/v1/catalog/products/${productId}/`);
    if (!res.ok) {
      setDeleting(false);
      setError(res.error);
      return;
    }
    navigate(PRODUCTS_URL);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <AdminHeader />
      <div className="flex min-h-[calc(100vh-72px)]">
        <AdminSidebar />

        <main className="flex-1 min-w-0 bg-white">
          {loading && <p className="px-6 py-10 text-sm text-slate-500">Loading product...</p>}

          {loadError && (
            <div className="px-6 py-10">
              <p className="text-sm text-red-700">{loadError}</p>
              <Link to={PRODUCTS_URL} className="mt-3 inline-block text-sm font-medium underline">
                Back to products
              </Link>
            </div>
          )}

          {form && (
            <>
              <div className="sticky top-[72px] z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
                <div className="mx-auto flex max-w-[960px] items-center justify-between gap-3 px-3 py-3 sm:px-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <Link
                      to={PRODUCTS_URL}
                      className="flex h-9 items-center gap-1.5 rounded-full border border-[#DDE1EA] bg-white px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <span aria-hidden>←</span> Back
                    </Link>
                    <h1 className="truncate text-lg font-bold">{form.title.trim() || "Product"}</h1>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="h-9 rounded-full border border-red-200 px-4 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deleting ? "Deleting..." : "Delete"}
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="h-9 rounded-full bg-[#141b2d] px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mx-auto max-w-[960px] space-y-6 px-3 py-8 sm:px-4">
                {error && (
                  <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                {saved && (
                  <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    Changes saved.
                  </div>
                )}

                <Card title="Basic info">
                  <Field label="Name">
                    <input className={inputClass} value={form.title} onChange={set("title")} />
                  </Field>
                  <Field label="Description">
                    <textarea
                      className={`${inputClass} h-32 py-3`}
                      value={form.description}
                      onChange={set("description")}
                    />
                  </Field>
                  <Field label="Status" help="Only active products are shown on your storefront.">
                    <select className={inputClass} value={form.status} onChange={set("status")}>
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                    </select>
                  </Field>
                </Card>

                <Card title="Variants and pricing">
                  {form.variants.length === 0 && (
                    <p className="text-sm text-slate-500">This product has no variants.</p>
                  )}
                  {form.variants.map((v, i) => (
                    <div key={v.id} className="grid gap-4 sm:grid-cols-2">
                      <Field label={form.variants.length > 1 ? `SKU (variant ${i + 1})` : "SKU"}>
                        <input className={inputClass} value={v.sku} onChange={(e) => setVariant(v.id, "sku", e.target.value)} />
                      </Field>
                      <Field label="Price">
                        <input
                          className={inputClass}
                          inputMode="decimal"
                          value={v.price}
                          onChange={(e) => setVariant(v.id, "price", e.target.value)}
                        />
                      </Field>
                    </div>
                  ))}
                </Card>

                <Card title="Organisation">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Category">
                      <input className={inputClass} value={form.category} onChange={set("category")} />
                    </Field>
                    <Field label="Product type">
                      <input className={inputClass} value={form.product_type} onChange={set("product_type")} />
                    </Field>
                    <Field label="Vendor">
                      <input className={inputClass} value={form.vendor} onChange={set("vendor")} />
                    </Field>
                  </div>
                  <Field label="Collections" help="Separate with commas.">
                    <input className={inputClass} value={form.collections} onChange={set("collections")} />
                  </Field>
                  <Field label="Tags" help="Separate with commas.">
                    <input className={inputClass} value={form.tags} onChange={set("tags")} />
                  </Field>
                </Card>

                <Card title="Search engine listing">
                  <Field label="Page title">
                    <input className={inputClass} value={form.seo_title} onChange={set("seo_title")} />
                  </Field>
                  <Field label="Description">
                    <textarea
                      className={`${inputClass} h-24 py-3`}
                      value={form.seo_description}
                      onChange={set("seo_description")}
                    />
                  </Field>
                </Card>

                <p className="text-xs text-slate-500">
                  Created {form.createdAt ? new Date(form.createdAt).toLocaleString() : "-"}
                  {form.updatedAt ? ` · Updated ${new Date(form.updatedAt).toLocaleString()}` : ""}
                </p>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
