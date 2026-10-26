"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { useCan } from "@/lib/auth";

const GATEWAYS = "/api/v1/delivery/gateways/";

const slugify = (text) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export default function ShippingPage() {
  const canManage = useCan("shipping.manage");

  const [locations, setLocations] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [locs, gws] = await Promise.all([
      apiGet("/api/v1/inventory/locations/"),
      apiGet(GATEWAYS),
    ]);
    // Locations belong to inventory: a role without access just doesn't see them here
    setLocations(locs.ok ? (locs.data?.results ?? locs.data ?? []) : []);
    if (gws.ok) setGateways(gws.data?.results ?? gws.data ?? []);
    else setError(gws.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const addGateway = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    const res = await apiPost(GATEWAYS, {
      name: name.trim(),
      code: slugify(name),
      is_active: true,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.fieldErrors.code || res.fieldErrors.name || res.formError);
      return;
    }
    setName("");
    load();
  };

  const toggleGateway = async (gateway) => {
    setError("");
    const res = await apiPatch(`${GATEWAYS}${gateway.id}/`, { is_active: !gateway.is_active });
    if (!res.ok) return setError(res.formError || "Couldn't update the delivery partner.");
    load();
  };

  const removeGateway = async (gateway) => {
    if (!window.confirm(`Remove ${gateway.name}?`)) return;
    setError("");
    const res = await apiDelete(`${GATEWAYS}${gateway.id}/`);
    if (!res.ok) return setError(res.error);
    load();
  };

  return (
    <div className="min-h-screen bg-[#F5F3FF] text-[#0B1020]">
      <AdminHeader />

      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        <AdminSidebar />

        <main className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-[#F5F3FF] px-4 py-5 sm:px-6">
            <div className="flex items-center gap-2.5 text-[#0B1020]">
              <PageIcon name="shipping" />
              <h1 className="text-xl font-semibold">Shipping</h1>
            </div>
          </header>

          <div className="p-5">
            {error && (
              <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            {/* SHIPPING ORIGIN */}
            <section className="rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-5">
                <h2 className="text-base font-semibold">Shipping origin</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Your inventory locations: orders ship from where the stock is held.
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 px-5 py-5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Locations</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {loading
                      ? "Loading…"
                      : locations.length
                        ? locations.map((l) => l.name).join(", ")
                        : "No locations configured"}
                  </p>
                </div>

                <Link
                  to="/admin/online-store/inventory"
                  className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Manage
                </Link>
              </div>
            </section>

            {/* DELIVERY PARTNERS */}
            <section className="mt-5 rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-5">
                <h2 className="text-base font-semibold">Delivery partners</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Couriers and carriers you choose when shipping an order.
                </p>
              </div>

              {loading ? (
                <p className="px-5 py-8 text-sm text-slate-500">Loading…</p>
              ) : gateways.length ? (
                <ul className="divide-y divide-slate-100">
                  {gateways.map((gateway) => (
                    <li
                      key={gateway.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                    >
                      <div>
                        <p className="text-sm font-medium">{gateway.name}</p>
                        <p className="text-xs text-slate-500">
                          {gateway.code} · {gateway.is_active ? "Active" : "Inactive"}
                        </p>
                      </div>

                      {canManage && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => toggleGateway(gateway)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
                          >
                            {gateway.is_active ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeGateway(gateway)}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-8 text-center text-sm text-slate-500">
                  No delivery partners yet.
                </p>
              )}

              {canManage && (
                <form
                  onSubmit={addGateway}
                  className="flex flex-wrap gap-3 border-t border-slate-200 px-5 py-4"
                >
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Delivery partner name"
                    aria-label="Delivery partner name"
                    maxLength={100}
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0B1020]"
                  />
                  <button
                    type="submit"
                    disabled={saving || !name.trim()}
                    className="rounded-lg bg-[#0B1020] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1C2347] disabled:opacity-50"
                  >
                    {saving ? "Adding…" : "Add partner"}
                  </button>
                </form>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
