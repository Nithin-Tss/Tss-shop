import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, User, Tag, Upload } from "lucide-react";
import AdminSidebar, { AdminHeader } from "@/components/AdminSidebar";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { useCan } from "@/lib/auth";
import Icon from "@/components/Icons";

function CatalogHeaderIcon({ className = "h-5 w-5 text-ink shrink-0" }) {
  return <BookOpen className={className} strokeWidth={1.75} aria-hidden="true" />;
}
function PersonIcon({ className = "h-5 w-5 shrink-0" }) {
  return <User className={className} strokeWidth={1.75} aria-hidden="true" />;
}
function TagIcon({ className = "h-4 w-4 shrink-0" }) {
  return <Tag className={className} strokeWidth={1.75} aria-hidden="true" />;
}

// Centered illustration matching the reference screenshot:
// Soft circular background with floating white card containing three buyer & pricing rows
function CatalogsIllustration() {
  return (
    <div className="relative flex items-center justify-center select-none" aria-hidden="true">
      {/* Background circle */}
      <div className="relative flex h-38 w-38 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-[rgba(24,24,27,0.12)]" />

        {/* Floating white card */}
        <div className="relative z-10 w-30.5 rounded-xl border border-slate-200 bg-white px-3.5 py-4 shadow-[0_4px_18px_rgba(24,24,27,0.06)]">
          <div className="flex flex-col gap-3">
            {/* Row 1 - Personalized green customer & pricing */}
            <div className="flex items-center justify-between gap-2">
              <PersonIcon className="h-5 w-5 text-violet-600 shrink-0" />
              <div className="flex flex-1 flex-col gap-1 items-start">
                <div className="h-[3.5px] w-full rounded-full bg-slate-300" />
                <div className="h-[3.5px] w-5/6 rounded-full bg-slate-300" />
              </div>
              <TagIcon className="h-4 w-4 text-violet-600 shrink-0" />
            </div>

            {/* Row 2 - Secondary muted customer & pricing */}
            <div className="flex items-center justify-between gap-2">
              <PersonIcon className="h-5 w-5 text-slate-300 shrink-0" />
              <div className="flex flex-1 flex-col gap-1 items-start">
                <div className="h-[3.5px] w-full rounded-full bg-slate-300" />
                <div className="h-[3.5px] w-5/6 rounded-full bg-slate-300" />
              </div>
              <TagIcon className="h-4 w-4 text-slate-300 shrink-0" />
            </div>

            {/* Row 3 - Tertiary muted customer & pricing */}
            <div className="flex items-center justify-between gap-2">
              <PersonIcon className="h-5 w-5 text-slate-300 shrink-0" />
              <div className="flex flex-1 flex-col gap-1 items-start">
                <div className="h-[3.5px] w-full rounded-full bg-slate-300" />
                <div className="h-[3.5px] w-5/6 rounded-full bg-slate-300" />
              </div>
              <TagIcon className="h-4 w-4 text-slate-300 shrink-0" />
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
    <div className="min-h-screen bg-white text-ink">
      <AdminHeader />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white shadow-xl transition-all"
        >
          {toastMessage}
        </div>
      )}

      {/* BODY */}
      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        {/* SIDEBAR */}
        <AdminSidebar />

        {/* MAIN CONTENT */}
        <main className="min-w-0 flex flex-1 flex-col bg-slate-100 px-4 sm:px-6 lg:px-8 py-5 overflow-hidden">
          {/* HEADER ROW: Match reference design */}
          <div className="flex items-center justify-between">
            <h1 className="flex items-center gap-2 text-[20px] font-bold text-ink tracking-tight">
              <CatalogHeaderIcon />
              Catalogs
            </h1>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleExport}
                className="rounded-lg bg-black px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-neutral-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              >
                Export
              </button>

              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="rounded-lg bg-black px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-neutral-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              >
                Import
              </button>

              {canManage && (
                <Link
                  to="/admin/online-store/catalogues/new"
                  className="rounded-lg bg-orange-600 px-3.5 py-1.5 text-[13px] font-medium text-white shadow-xs hover:bg-orange-600/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
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
                className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-xs min-h-120"
              >
                {/* Centered Graphic Illustration */}
                <CatalogsIllustration />

                {/* Heading */}
                <h2
                  id="catalogs-empty-heading"
                  className="mt-7 text-[16px] sm:text-[17px] font-semibold text-ink tracking-tight"
                >
                  Personalize buying with catalogs
                </h2>

                {/* Description */}
                <p className="mt-1.5 text-[13px] text-slate-500 leading-normal text-center">
                  Create custom product and pricing offerings for your customers with catalogs.
                </p>

                {/* Create catalog Action Button */}
                {canManage && (
                  <Link
                    to="/admin/online-store/catalogues/new"
                    className="mt-5 inline-flex items-center justify-center rounded-lg bg-orange-600 px-4 py-2 text-[13px] font-medium text-white shadow-xs hover:bg-orange-600/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                  >
                    Create catalog
                  </Link>
                )}
              </section>

              {/* FOOTER: Learn more about catalogs */}
              <div className="mt-6 text-center text-[13px] text-slate-500">
                Learn more about{" "}
                <a
                  href="https://help.shopify.com/manual/b2b/catalogs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink underline underline-offset-2 hover:text-black"
                >
                  catalogs
                </a>
              </div>
            </div>
          )}

          {/* DYNAMIC LIST VIEW: Shown when catalogues exist */}
          {catalogues.length > 0 && (
            <div className="mt-4 flex flex-1 flex-col">
              <section className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                {/* Search & Filter bar */}
                <div className="flex items-center justify-between border-b border-slate-200 p-3.5">
                  <div className="relative w-full max-w-sm">
                    <input
                      type="text"
                      placeholder="Filter catalogs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-ink placeholder-slate-400 focus:border-orange-600 focus:outline-none"
                    />
                  </div>
                  <span className="text-xs text-slate-500">
                    {filteredCatalogues.length}{" "}
                    {filteredCatalogues.length === 1 ? "catalog" : "catalogs"}
                  </span>
                </div>

                {/* Table of catalogs */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Title</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Created</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredCatalogues.map((cat) => (
                        <tr key={cat.id} className="hover:bg-slate-100 transition-colors">
                          <td className="px-4 py-3 font-medium text-ink">
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
                                  ? "bg-[rgba(24,24,27,0.06)] text-[#111827]"
                                  : "bg-slate-200 text-slate-500"
                              }`}
                            >
                              {titleCase(cat.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{cat.description || "—"}</td>
                          <td className="px-4 py-3 text-slate-500">{formatDate(cat.created_at)}</td>
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
              <div className="mt-6 text-center text-[13px] text-slate-500">
                Learn more about{" "}
                <a
                  href="https://help.shopify.com/manual/b2b/catalogs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink underline underline-offset-2 hover:text-black"
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
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 id="import-catalog-modal-title" className="text-base font-semibold text-ink">
                Import catalogs
              </h3>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-500 hover:text-orange-600 text-lg font-bold"
                aria-label="Close"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-6 text-center">
              <Upload className="h-8 w-8 text-slate-400 mb-2" strokeWidth={1.75} />
              <p className="text-xs text-slate-500">
                Select a CSV file with a Name column (Status and Description are optional).
              </p>
              <input
                type="file"
                accept=".csv"
                className="mt-3 text-xs text-slate-500"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleImport(e.target.files[0]);
                }}
              />
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-ink hover:bg-slate-100 transition"
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
