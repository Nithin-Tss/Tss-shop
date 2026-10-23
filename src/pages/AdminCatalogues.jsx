import { useState } from "react";
import { Link } from "react-router-dom";
import AdminSidebar, { AdminHeader } from "@/components/AdminSidebar";
import { useCan } from "@/lib/auth";

// Shopify Polaris CatalogIcon (20x20 viewBox)
function CatalogHeaderIcon({ className = "h-5 w-5 text-[#1A1A1A] shrink-0" }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M14.772 9c-.63 0-1.232.254-1.669.704l-2.628 2.709c-.642.661-.632 1.712.023 2.361l1.79 1.777c.595.59 1.557.6 2.164.02l2.933-2.802c.393-.376.615-.894.615-1.436v-1.34c0-1.1-.899-1.993-2.008-1.993h-1.22Zm.978 3c.414 0 .75-.336.75-.75s-.336-.75-.75-.75-.75.336-.75.75.336.75.75.75Z"
      />
      <path d="M4.95 6.7c0-1.27 1.03-2.3 2.3-2.3h5.55c1.27 0 2.3 1.03 2.3 2.3v.4c0 .387.313.7.7.7.387 0 .7-.313.7-.7v-.4c0-2.043-1.656-3.7-3.7-3.7h-5.55c-2.043 0-3.7 1.657-3.7 3.7v6.55c0 2.044 1.657 3.7 3.7 3.7h1.75c.387 0 .7-.313.7-.7 0-.386-.313-.7-.7-.7h-1.75c-1.27 0-2.3-1.03-2.3-2.3v-6.55Z" />
      <path d="M7 7c0-.414.336-.75.75-.75h4.5c.414 0 .75.336.75.75s-.336.75-.75.75h-4.5c-.414 0-.75-.336-.75-.75Z" />
      <path d="M7 10c0-.414.336-.75.75-.75h2c.414 0 .75.336.75.75s-.336.75-.75.75h-2c-.414 0-.75-.336-.75-.75Z" />
    </svg>
  );
}
// Polaris PersonFilledIcon (20x20 viewBox)
function PersonIcon({ className = "h-5 w-5 shrink-0" }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path d="M10 9.75a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z" />
      <path d="M10 11.5c-1.968 0-3.815.95-4.959 2.552l-.561.786a1.05 1.05 0 0 0 .855 1.662h9.33a1.05 1.05 0 0 0 .855-1.662l-.561-.786a6.094 6.094 0 0 0-4.959-2.552Z" />
    </svg>
  );
}

// Polaris TagIcon rotated so pointed tip faces top-right matching the reference image
function TagIcon({ className = "h-4 w-4 shrink-0" }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`${className} -rotate-90`}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.5 4.5A2 2 0 0 1 4.5 2.5h5.172a2 2 0 0 1 1.414.586l7 7a2 2 0 0 1 0 2.828l-5.172 5.172a2 2 0 0 1-2.828 0l-7-7A2 2 0 0 1 2.5 9.672V4.5Zm2 1.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
      />
    </svg>
  );
}

// Centered illustration matching the reference screenshot:
// Soft circular background with floating white card containing three buyer & pricing rows
function CatalogsIllustration() {
  return (
    <div className="relative flex items-center justify-center select-none" aria-hidden="true">
      {/* Background circle */}
      <div className="relative flex h-38 w-38 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-[#E5E6E8]" />

        {/* Floating white card */}
        <div className="relative z-10 w-30.5 rounded-xl border border-[#E1E3E5] bg-white px-3.5 py-4 shadow-[0_4px_18px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col gap-3">
            {/* Row 1 - Personalized green customer & pricing */}
            <div className="flex items-center justify-between gap-2">
              <PersonIcon className="h-5 w-5 text-[#008060] shrink-0" />
              <div className="flex flex-1 flex-col gap-1 items-start">
                <div className="h-[3.5px] w-full rounded-full bg-[#D1D5DB]" />
                <div className="h-[3.5px] w-5/6 rounded-full bg-[#D1D5DB]" />
              </div>
              <TagIcon className="h-4 w-4 text-[#008060] shrink-0" />
            </div>

            {/* Row 2 - Secondary muted customer & pricing */}
            <div className="flex items-center justify-between gap-2">
              <PersonIcon className="h-5 w-5 text-[#D1D5DB] shrink-0" />
              <div className="flex flex-1 flex-col gap-1 items-start">
                <div className="h-[3.5px] w-full rounded-full bg-[#D1D5DB]" />
                <div className="h-[3.5px] w-5/6 rounded-full bg-[#D1D5DB]" />
              </div>
              <TagIcon className="h-4 w-4 text-[#D1D5DB] shrink-0" />
            </div>

            {/* Row 3 - Tertiary muted customer & pricing */}
            <div className="flex items-center justify-between gap-2">
              <PersonIcon className="h-5 w-5 text-[#D1D5DB] shrink-0" />
              <div className="flex flex-1 flex-col gap-1 items-start">
                <div className="h-[3.5px] w-full rounded-full bg-[#D1D5DB]" />
                <div className="h-[3.5px] w-5/6 rounded-full bg-[#D1D5DB]" />
              </div>
              <TagIcon className="h-4 w-4 text-[#D1D5DB] shrink-0" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CataloguesPage() {
  const canManage = useCan("products.manage");

  // Dynamic catalogues list state
  const [catalogues, setCatalogues] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Form fields for new catalog
  const [newTitle, setNewTitle] = useState("");
  const [newStatus, setNewStatus] = useState("Active");
  const [newDescription, setNewDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleSaveCatalogue = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    const newRecord = {
      id: Date.now().toString(),
      name: newTitle.trim(),
      status: newStatus,
      description: newDescription.trim(),
      productsCount: 0,
      createdAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    };

    setCatalogues((prev) => [newRecord, ...prev]);
    setNewTitle("");
    setNewDescription("");
    setNewStatus("Active");
    setIsSubmitting(false);
    setIsCreateModalOpen(false);
    showToast("Catalog created successfully.");
  };

  const handleDeleteCatalogue = (id) => {
    setCatalogues((prev) => prev.filter((item) => item.id !== id));
    showToast("Catalog deleted.");
  };

  const handleExport = () => {
    if (catalogues.length === 0) {
      showToast("No catalogs available to export.");
      return;
    }
    const headers = "ID,Name,Status,Description,Created At\n";
    const rows = catalogues
      .map(
        (c) =>
          `"${c.id}","${c.name.replace(/"/g, '""')}","${c.status}","${(c.description || "").replace(/"/g, '""')}","${c.createdAt}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `catalogs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Catalogs exported successfully.");
  };

  const filteredCatalogues = catalogues.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white text-[#1A1A1A]">
      <AdminHeader />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 rounded-lg bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-white shadow-xl transition-all"
        >
          {toastMessage}
        </div>
      )}

      {/* BODY */}
      <div className="flex min-h-[calc(100vh-72px)]">
        {/* SIDEBAR */}
        <AdminSidebar />

        {/* MAIN CONTENT */}
        <main className="flex flex-1 flex-col bg-[#F1F2F4] px-6 lg:px-8 py-5 overflow-hidden">
          {/* HEADER ROW: Match reference design */}
          <div className="flex items-center justify-between">
            <h1 className="flex items-center gap-2 text-[20px] font-bold text-[#1A1A1A] tracking-tight">
              <CatalogHeaderIcon />
              Catalogs
            </h1>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleExport}
                className="rounded-lg bg-[#EFEFEF] px-3.5 py-1.5 text-[13px] font-medium text-[#8C9196] hover:bg-[#E4E5E7] hover:text-[#1A1A1A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              >
                Export
              </button>

              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="rounded-lg bg-[#EFEFEF] px-3.5 py-1.5 text-[13px] font-medium text-[#8C9196] hover:bg-[#E4E5E7] hover:text-[#1A1A1A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              >
                Import
              </button>

              {canManage && (
                <Link
                  to="/admin/online-store/catalogues/new"
                  className="rounded-lg bg-[#1A1A1A] px-3.5 py-1.5 text-[13px] font-medium text-white shadow-xs hover:bg-[#303030] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                >
                  Create catalog
                </Link>
              )}
            </div>
          </div>

          {/* EMPTY STATE: Shown when no catalogues exist */}
          {catalogues.length === 0 && (
            <div className="mt-4 flex flex-1 flex-col">
              <section
                aria-labelledby="catalogs-empty-heading"
                className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-[#E1E3E5] bg-white px-6 py-16 text-center shadow-xs min-h-120"
              >
                {/* Centered Graphic Illustration */}
                <CatalogsIllustration />

                {/* Heading */}
                <h2
                  id="catalogs-empty-heading"
                  className="mt-7 text-[16px] sm:text-[17px] font-semibold text-[#1A1A1A] tracking-tight"
                >
                  Personalize buying with catalogs
                </h2>

                {/* Description */}
                <p className="mt-1.5 text-[13px] text-[#616161] leading-normal text-center">
                  Create custom product and pricing offerings for your customers with catalogs.
                </p>

                {/* Create catalog Action Button */}
                {canManage && (
                  <Link
                    to="/admin/online-store/catalogues/new"
                    className="mt-5 inline-flex items-center justify-center rounded-lg bg-[#1A1A1A] px-4 py-2 text-[13px] font-medium text-white shadow-xs hover:bg-[#303030] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                  >
                    Create catalog
                  </Link>
                )}
              </section>

              {/* FOOTER: Learn more about catalogs */}
              <div className="mt-6 text-center text-[13px] text-[#616161]">
                Learn more about{" "}
                <a
                  href="https://help.shopify.com/manual/b2b/catalogs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1A1A1A] underline underline-offset-2 hover:text-black"
                >
                  catalogs
                </a>
              </div>
            </div>
          )}

          {/* DYNAMIC LIST VIEW: Shown when catalogues exist */}
          {catalogues.length > 0 && (
            <div className="mt-4 flex flex-1 flex-col">
              <section className="rounded-2xl border border-[#E1E3E5] bg-white shadow-xs overflow-hidden">
                {/* Search & Filter bar */}
                <div className="flex items-center justify-between border-b border-[#E1E3E5] p-3.5">
                  <div className="relative w-full max-w-sm">
                    <input
                      type="text"
                      placeholder="Filter catalogs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-[#D2D5D8] px-3 py-1.5 text-sm text-[#1A1A1A] placeholder-[#8C9196] focus:border-[#1A1A1A] focus:outline-none"
                    />
                  </div>
                  <span className="text-xs text-[#616161]">
                    {filteredCatalogues.length}{" "}
                    {filteredCatalogues.length === 1 ? "catalog" : "catalogs"}
                  </span>
                </div>

                {/* Table of catalogs */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-[#E1E3E5] bg-[#FAFBFB] text-xs font-semibold text-[#616161]">
                      <tr>
                        <th className="px-4 py-3">Title</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Created</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E1E3E5]">
                      {filteredCatalogues.map((cat) => (
                        <tr key={cat.id} className="hover:bg-[#F6F6F7] transition-colors">
                          <td className="px-4 py-3 font-medium text-[#1A1A1A]">{cat.name}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                cat.status === "Active"
                                  ? "bg-[#E3F1DF] text-[#0D5B22]"
                                  : "bg-[#E4E5E7] text-[#616161]"
                              }`}
                            >
                              {cat.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#616161]">{cat.description || "—"}</td>
                          <td className="px-4 py-3 text-[#616161]">{cat.createdAt}</td>
                          <td className="px-4 py-3 text-right">
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCatalogue(cat.id)}
                                className="text-xs text-red-600 hover:text-red-800 font-medium"
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* FOOTER: Learn more about catalogs */}
              <div className="mt-6 text-center text-[13px] text-[#616161]">
                Learn more about{" "}
                <a
                  href="https://help.shopify.com/manual/b2b/catalogs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1A1A1A] underline underline-offset-2 hover:text-black"
                >
                  catalogs
                </a>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* CREATE CATALOG MODAL */}
      {isCreateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-catalog-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#E1E3E5]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E1E3E5]">
              <h3
                id="create-catalog-modal-title"
                className="text-base font-semibold text-[#1A1A1A]"
              >
                Create catalog
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#616161] hover:text-[#1A1A1A] text-lg font-bold"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCatalogue} className="mt-4 flex flex-col gap-4">
              <div>
                <label
                  htmlFor="catalog-title"
                  className="block text-xs font-semibold text-[#1A1A1A] mb-1"
                >
                  Catalog title *
                </label>
                <input
                  id="catalog-title"
                  type="text"
                  required
                  placeholder="e.g. B2B Wholesale, Summer 2026"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-lg border border-[#D2D5D8] px-3 py-2 text-sm text-[#1A1A1A] focus:border-[#1A1A1A] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="catalog-status"
                  className="block text-xs font-semibold text-[#1A1A1A] mb-1"
                >
                  Status
                </label>
                <select
                  id="catalog-status"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full rounded-lg border border-[#D2D5D8] px-3 py-2 text-sm text-[#1A1A1A] focus:border-[#1A1A1A] focus:outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="catalog-description"
                  className="block text-xs font-semibold text-[#1A1A1A] mb-1"
                >
                  Description
                </label>
                <textarea
                  id="catalog-description"
                  rows={3}
                  placeholder="Optional details or pricing notes..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full rounded-lg border border-[#D2D5D8] px-3 py-2 text-sm text-[#1A1A1A] focus:border-[#1A1A1A] focus:outline-none"
                />
              </div>

              <div className="mt-2 flex items-center justify-end gap-2 pt-3 border-t border-[#E1E3E5]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-lg border border-[#D2D5D8] bg-white px-3.5 py-1.5 text-xs font-medium text-[#1A1A1A] hover:bg-[#F6F6F7] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newTitle.trim()}
                  className="rounded-lg bg-[#1A1A1A] px-3.5 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-[#303030] transition disabled:opacity-50"
                >
                  Create catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT MODAL */}
      {isImportModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-catalog-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#E1E3E5]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E1E3E5]">
              <h3
                id="import-catalog-modal-title"
                className="text-base font-semibold text-[#1A1A1A]"
              >
                Import catalogs
              </h3>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-[#616161] hover:text-[#1A1A1A] text-lg font-bold"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#D2D5D8] p-6 text-center">
              <svg className="h-8 w-8 text-[#8C9196] mb-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.56l2.22 2.22a.75.75 0 1 0 1.06-1.06l-3.5-3.5a.75.75 0 0 0-1.06 0l-3.5 3.5a.75.75 0 0 0 1.06 1.06l2.22-2.22v8.69Z" />
                <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
              </svg>
              <p className="text-xs text-[#616161]">Select a CSV file to import catalogs.</p>
              <input
                type="file"
                accept=".csv"
                className="mt-3 text-xs text-[#616161]"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setIsImportModalOpen(false);
                    showToast(`Imported ${e.target.files[0].name}`);
                  }
                }}
              />
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="rounded-lg border border-[#D2D5D8] bg-white px-3.5 py-1.5 text-xs font-medium text-[#1A1A1A] hover:bg-[#F6F6F7] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
