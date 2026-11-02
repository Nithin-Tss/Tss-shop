import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminSidebar, { AdminHeader } from "@/components/AdminSidebar";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { useCan } from "@/lib/auth";

// Shopify Polaris CatalogIcon (20x20 viewBox)
function CatalogHeaderIcon({ className = "h-5 w-5 text-[#1A1916] shrink-0" }) {
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
        <div className="relative z-10 w-30.5 rounded-xl border border-[#E7E4DC] bg-white px-3.5 py-4 shadow-[0_4px_18px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col gap-3">
            {/* Row 1 - Personalized green customer & pricing */}
            <div className="flex items-center justify-between gap-2">
              <PersonIcon className="h-5 w-5 text-[#008060] shrink-0" />
              <div className="flex flex-1 flex-col gap-1 items-start">
                <div className="h-[3.5px] w-full rounded-full bg-[#D4D0C5]" />
                <div className="h-[3.5px] w-5/6 rounded-full bg-[#D4D0C5]" />
              </div>
              <TagIcon className="h-4 w-4 text-[#008060] shrink-0" />
            </div>

            {/* Row 2 - Secondary muted customer & pricing */}
            <div className="flex items-center justify-between gap-2">
              <PersonIcon className="h-5 w-5 text-[#D4D0C5] shrink-0" />
              <div className="flex flex-1 flex-col gap-1 items-start">
                <div className="h-[3.5px] w-full rounded-full bg-[#D4D0C5]" />
                <div className="h-[3.5px] w-5/6 rounded-full bg-[#D4D0C5]" />
              </div>
              <TagIcon className="h-4 w-4 text-[#D4D0C5] shrink-0" />
            </div>

            {/* Row 3 - Tertiary muted customer & pricing */}
            <div className="flex items-center justify-between gap-2">
              <PersonIcon className="h-5 w-5 text-[#D4D0C5] shrink-0" />
              <div className="flex flex-1 flex-col gap-1 items-start">
                <div className="h-[3.5px] w-full rounded-full bg-[#D4D0C5]" />
                <div className="h-[3.5px] w-5/6 rounded-full bg-[#D4D0C5]" />
              </div>
              <TagIcon className="h-4 w-4 text-[#D4D0C5] shrink-0" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const CATALOGUES = "/api/v1/catalog/catalogues/";

const titleCase = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// Minimal CSV reader (quoted fields, "" escapes, newlines inside quotes)
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim())) rows.push(row);
  return rows;
}

export default function CataloguesPage() {
  const canManage = useCan("products.manage");

  const [catalogues, setCatalogues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const load = useCallback(async () => {
    const res = await apiGet(CATALOGUES);
    if (res.ok) setCatalogues(res.data?.results ?? res.data ?? []);
    else showToast(res.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const handleDeleteCatalogue = async (cat) => {
    if (!window.confirm(`Delete "${cat.name}"?`)) return;
    const res = await apiDelete(`${CATALOGUES}${cat.id}/`);
    if (!res.ok) return showToast(res.error);
    setCatalogues((prev) => prev.filter((item) => item.id !== cat.id));
    showToast("Catalog deleted.");
  };

  const handleExport = () => {
    if (catalogues.length === 0) {
      showToast("No catalogs available to export.");
      return;
    }
    const cell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const headers = "ID,Name,Status,Description,Created At\n";
    const rows = catalogues
      .map((c) =>
        [c.id, c.name, titleCase(c.status), c.description, formatDate(c.created_at)]
          .map(cell)
          .join(",")
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

  // Creates one catalog per row; needs a Name column, Status and Description are optional
  const handleImport = async (file) => {
    const [header = [], ...rows] = parseCsv(await file.text());
    const column = (name) => header.findIndex((h) => h.trim().toLowerCase() === name);
    const [nameAt, statusAt, descriptionAt] = ["name", "status", "description"].map(column);
    if (nameAt < 0) return showToast("The CSV needs a Name column.");

    let created = 0;
    for (const row of rows) {
      const name = row[nameAt]?.trim();
      if (!name) continue;
      const status =
        statusAt >= 0 && row[statusAt]?.trim().toLowerCase() === "draft" ? "draft" : "active";
      const res = await apiPost(CATALOGUES, {
        name,
        status,
        description: descriptionAt >= 0 ? (row[descriptionAt] ?? "").trim() : "",
      });
      if (res.ok) created++;
    }
    setIsImportModalOpen(false);
    showToast(`Imported ${created} of ${rows.length} catalogs.`);
    load();
  };

  const filteredCatalogues = catalogues.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white text-[#1A1916]">
      <AdminHeader />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 rounded-lg bg-[#1A1916] px-4 py-2.5 text-sm font-medium text-white shadow-xl transition-all"
        >
          {toastMessage}
        </div>
      )}

      {/* BODY */}
      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        {/* SIDEBAR */}
        <AdminSidebar />

        {/* MAIN CONTENT */}
        <main className="min-w-0 flex flex-1 flex-col bg-[#F3F1EC] px-4 sm:px-6 lg:px-8 py-5 overflow-hidden">
          {/* HEADER ROW: Match reference design */}
          <div className="flex items-center justify-between">
            <h1 className="flex items-center gap-2 text-[20px] font-bold text-[#1A1916] tracking-tight">
              <CatalogHeaderIcon />
              Catalogs
            </h1>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleExport}
                className="rounded-lg bg-[#F3F1EC] px-3.5 py-1.5 text-[13px] font-medium text-[#A29E92] hover:bg-[#E7E4DC] hover:text-[#1A1916] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              >
                Export
              </button>

              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="rounded-lg bg-[#F3F1EC] px-3.5 py-1.5 text-[13px] font-medium text-[#A29E92] hover:bg-[#E7E4DC] hover:text-[#1A1916] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              >
                Import
              </button>

              {canManage && (
                <Link
                  to="/admin/online-store/catalogues/new"
                  className="rounded-lg bg-[#1A1916] px-3.5 py-1.5 text-[13px] font-medium text-white shadow-xs hover:bg-[#2A2925] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                >
                  Create catalog
                </Link>
              )}
            </div>
          </div>

          {/* EMPTY STATE: Shown when no catalogues exist */}
          {!loading && catalogues.length === 0 && (
            <div className="mt-4 flex flex-1 flex-col">
              <section
                aria-labelledby="catalogs-empty-heading"
                className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-[#E7E4DC] bg-white px-6 py-16 text-center shadow-xs min-h-120"
              >
                {/* Centered Graphic Illustration */}
                <CatalogsIllustration />

                {/* Heading */}
                <h2
                  id="catalogs-empty-heading"
                  className="mt-7 text-[16px] sm:text-[17px] font-semibold text-[#1A1916] tracking-tight"
                >
                  Personalize buying with catalogs
                </h2>

                {/* Description */}
                <p className="mt-1.5 text-[13px] text-[#78746A] leading-normal text-center">
                  Create custom product and pricing offerings for your customers with catalogs.
                </p>

                {/* Create catalog Action Button */}
                {canManage && (
                  <Link
                    to="/admin/online-store/catalogues/new"
                    className="mt-5 inline-flex items-center justify-center rounded-lg bg-[#1A1916] px-4 py-2 text-[13px] font-medium text-white shadow-xs hover:bg-[#2A2925] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                  >
                    Create catalog
                  </Link>
                )}
              </section>

              {/* FOOTER: Learn more about catalogs */}
              <div className="mt-6 text-center text-[13px] text-[#78746A]">
                Learn more about{" "}
                <a
                  href="https://help.shopify.com/manual/b2b/catalogs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1A1916] underline underline-offset-2 hover:text-black"
                >
                  catalogs
                </a>
              </div>
            </div>
          )}

          {/* DYNAMIC LIST VIEW: Shown when catalogues exist */}
          {catalogues.length > 0 && (
            <div className="mt-4 flex flex-1 flex-col">
              <section className="rounded-2xl border border-[#E7E4DC] bg-white shadow-xs overflow-hidden">
                {/* Search & Filter bar */}
                <div className="flex items-center justify-between border-b border-[#E7E4DC] p-3.5">
                  <div className="relative w-full max-w-sm">
                    <input
                      type="text"
                      placeholder="Filter catalogs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-[#D4D0C5] px-3 py-1.5 text-sm text-[#1A1916] placeholder-[#A29E92] focus:border-[#1A1916] focus:outline-none"
                    />
                  </div>
                  <span className="text-xs text-[#78746A]">
                    {filteredCatalogues.length}{" "}
                    {filteredCatalogues.length === 1 ? "catalog" : "catalogs"}
                  </span>
                </div>

                {/* Table of catalogs */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-[#E7E4DC] bg-[#FAF9F6] text-xs font-semibold text-[#78746A]">
                      <tr>
                        <th className="px-4 py-3">Title</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Created</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E4DC]">
                      {filteredCatalogues.map((cat) => (
                        <tr key={cat.id} className="hover:bg-[#F3F1EC] transition-colors">
                          <td className="px-4 py-3 font-medium text-[#1A1916]">
                            <Link
                              to={`/admin/online-store/catalogues/${cat.id}`}
                              className="hover:underline"
                            >
                              {cat.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                cat.status === "active"
                                  ? "bg-[#E3F1DF] text-[#0D5B22]"
                                  : "bg-[#E7E4DC] text-[#78746A]"
                              }`}
                            >
                              {titleCase(cat.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#78746A]">{cat.description || "—"}</td>
                          <td className="px-4 py-3 text-[#78746A]">{formatDate(cat.created_at)}</td>
                          <td className="px-4 py-3 text-right">
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCatalogue(cat)}
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
              <div className="mt-6 text-center text-[13px] text-[#78746A]">
                Learn more about{" "}
                <a
                  href="https://help.shopify.com/manual/b2b/catalogs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1A1916] underline underline-offset-2 hover:text-black"
                >
                  catalogs
                </a>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* IMPORT MODAL */}
      {isImportModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-catalog-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#E7E4DC]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E4DC]">
              <h3
                id="import-catalog-modal-title"
                className="text-base font-semibold text-[#1A1916]"
              >
                Import catalogs
              </h3>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-[#78746A] hover:text-[#1A1916] text-lg font-bold"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#D4D0C5] p-6 text-center">
              <svg className="h-8 w-8 text-[#A29E92] mb-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.56l2.22 2.22a.75.75 0 1 0 1.06-1.06l-3.5-3.5a.75.75 0 0 0-1.06 0l-3.5 3.5a.75.75 0 0 0 1.06 1.06l2.22-2.22v8.69Z" />
                <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
              </svg>
              <p className="text-xs text-[#78746A]">
                Select a CSV file with a Name column (Status and Description are optional).
              </p>
              <input
                type="file"
                accept=".csv"
                className="mt-3 text-xs text-[#78746A]"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleImport(e.target.files[0]);
                }}
              />
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="rounded-lg border border-[#D4D0C5] bg-white px-3.5 py-1.5 text-xs font-medium text-[#1A1916] hover:bg-[#F3F1EC] transition"
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
