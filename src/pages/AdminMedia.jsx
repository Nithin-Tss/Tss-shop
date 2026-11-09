import { useEffect, useRef, useState } from "react";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
import {
  deleteMediaAsset,
  listMediaAssets,
  updateMediaAsset,
  uploadMediaAsset,
} from "@/lib/themeApi";

// ---------------------------------------------------------------- AdminMedia
// The store's picture library: upload, search, rename, add alt text, copy the address, delete.

const size = (bytes) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export default function AdminMedia() {
  const [assets, setAssets] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null); // the picture being edited: { id, name, alt_text }
  const fileInput = useRef(null);

  // Search as you type, a moment after the last key
  useEffect(() => {
    const timer = setTimeout(() => {
      listMediaAssets(query)
        .then(setAssets)
        .catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  async function upload(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    setBusy(true);
    setError("");
    setNotice("");
    let added = 0;
    for (const file of files) {
      const result = await uploadMediaAsset(file);
      if (result.ok) {
        added += 1;
        setAssets((list) => [result.data, ...(list || [])]);
      } else {
        setError(`${file.name}: ${result.error}`);
      }
    }
    if (added) setNotice(added === 1 ? "Picture uploaded." : `${added} pictures uploaded.`);
    setBusy(false);
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const saved = await updateMediaAsset(editing.id, {
        name: editing.name,
        alt_text: editing.alt_text || "",
      });
      setAssets((list) => list.map((a) => (a.id === saved.id ? saved : a)));
      setEditing(null);
      setNotice("Saved.");
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  async function remove(asset) {
    if (!window.confirm(`Delete "${asset.name}"?`)) return;
    setError("");
    setNotice("");
    try {
      await deleteMediaAsset(asset.id);
      setAssets((list) => list.filter((a) => a.id !== asset.id));
      setNotice("Picture deleted.");
    } catch (e) {
      setError(e.message);
    }
  }

  async function copy(asset) {
    try {
      await navigator.clipboard.writeText(asset.url);
      setNotice("Address copied.");
    } catch {
      setNotice(asset.url);
    }
  }

  return (
    <div className="min-h-screen bg-white text-ink">
      <AdminHeader />
      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        <AdminSidebar />
        <main className="min-w-0 flex-1 overflow-hidden bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="flex items-center gap-2.5 text-[22px] font-bold text-ink">
              <PageIcon name="media" />
              Media
            </h1>
            <div className="flex items-center gap-2">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pictures"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                hidden
                onChange={upload}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600/90 disabled:opacity-50"
              >
                {busy ? "Working..." : "Upload"}
              </button>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
          )}
          {notice && (
            <p className="mt-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-800">{notice}</p>
          )}

          {assets === null ? (
            <p className="mt-6 text-sm text-neutral-500">Loading...</p>
          ) : assets.length === 0 ? (
            <p className="mt-6 text-sm text-neutral-500">
              {query
                ? "No pictures match your search."
                : "No pictures yet. JPG, PNG or WEBP up to 1 MB."}
            </p>
          ) : (
            <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {assets.map((asset) => (
                <li
                  key={asset.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  <img
                    src={asset.url}
                    alt={asset.alt_text || asset.name}
                    loading="lazy"
                    className="aspect-square w-full bg-slate-100 object-cover"
                  />
                  <div className="p-3">
                    <p className="truncate text-sm font-medium" title={asset.name}>
                      {asset.name}
                    </p>
                    <p className="text-xs text-neutral-500">{size(asset.file_size)}</p>
                    <div className="mt-2 flex gap-3 text-xs font-medium">
                      <button
                        type="button"
                        onClick={() => setEditing({ ...asset })}
                        className="hover:underline"
                      >
                        Edit
                      </button>
                      <button type="button" onClick={() => copy(asset)} className="hover:underline">
                        Copy link
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(asset)}
                        className="text-red-700 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {editing && (
            <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
              <form
                onSubmit={save}
                className="w-full max-w-md space-y-4 rounded-xl bg-white p-5 shadow-xl"
              >
                <h2 className="text-lg font-bold">Edit picture</h2>
                <label className="block text-sm font-medium">
                  Name
                  <input
                    value={editing.name}
                    maxLength={255}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Alt text
                  <input
                    value={editing.alt_text || ""}
                    maxLength={255}
                    onChange={(e) => setEditing({ ...editing, alt_text: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy || !editing.name.trim()}
                    className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600/90 disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
