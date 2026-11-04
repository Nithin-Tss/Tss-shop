import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
import { formatMoney, useLive } from "@/lib/reportsApi";
import { card, cardHeading, smallLabel, whole, EmptyState } from "@/components/reportKit";

function Stat({ title, value }) {
  return (
    <div className={card}>
      <h2 className={cardHeading}>{title}</h2>
      <p className="mt-2 text-2xl font-bold text-[#14130F]">{value}</p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-[#F3F1EC] py-2 text-[13px] last:border-0">
      <span className="min-w-0 truncate text-[#14130F]">{label}</span>
      <span className="shrink-0 font-medium text-[#14130F]">{value}</span>
    </li>
  );
}

export default function AdminLiveView() {
  const { data, error, loading } = useLive();
  const money = (v) => (data ? formatMoney(v, data.currency_code) : "—");
  const count = (v) => (data ? whole(v) : "—");
  const steps = [
    ["Active carts", data?.behaviour.active_carts],
    ["Checking out", data?.behaviour.checking_out],
    ["Purchased", data?.behaviour.purchased],
  ];
  const updated = data
    ? new Date(data.refreshed_at).toLocaleTimeString("en", { timeZone: data.timezone })
    : "—";

  return (
    <div className="min-h-screen overflow-y-auto bg-[#F3F1EC] text-charcoal-navy">
      <AdminHeader />
      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        <AdminSidebar />
        <main className="min-w-0 flex-1 overflow-x-hidden">
          <header className="border-b border-[#E7E4DC] bg-white">
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
              <h1 className="flex items-center gap-2.5 text-xl font-semibold text-charcoal-navy">
                <PageIcon name="analytics" />
                Live View
              </h1>
              <p className="mt-0.5 text-[13px] text-[#5A5750]">
                Today&apos;s totals use your store&apos;s timezone ({data?.timezone || "…"}) · Last
                updated {updated}
              </p>
            </div>
          </header>

          <div className="mx-auto max-w-7xl space-y-4 px-4 py-5 sm:px-6">
            {error && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
                {error}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className={card}>
                <h2 className={cardHeading}>Visitors right now</h2>
                <p className="mt-2 text-4xl font-bold text-[#14130F]">{count(data?.visitors_now)}</p>
                <p className={`mt-1 ${smallLabel}`}>Active in the last 5 minutes</p>
              </div>
              <Stat title="Total sales" value={money(data?.total_sales)} />
              <Stat title="Total sessions" value={count(data?.total_sessions)} />
              <Stat title="Total orders" value={count(data?.total_orders)} />
            </div>

            <div className={card}>
              <h2 className={cardHeading}>Customer behavior</h2>
              <p className={smallLabel}>Sessions active in the last 10 minutes</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {steps.map(([label, value], i) => (
                  <div key={label} className="rounded-lg bg-[#F3F1EC] p-4">
                    <p className="text-[13px] text-[#5A5750]">
                      {i > 0 && "→ "}
                      {label}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-[#14130F]">{count(value)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className={card}>
                <h2 className={cardHeading}>Top locations</h2>
                <p className={smallLabel}>Sessions today, by country</p>
                {data?.top_locations.length ? (
                  <ul className="mt-2">
                    {data.top_locations.map((l) => (
                      <Row key={l.country} label={l.country} value={whole(l.sessions)} />
                    ))}
                  </ul>
                ) : (
                  <EmptyState>{loading ? "Loading…" : "No sessions yet today"}</EmptyState>
                )}
              </div>

              <div className={card}>
                <h2 className={cardHeading}>Top products</h2>
                <p className={smallLabel}>By sales today</p>
                {data?.top_products.length ? (
                  <ul className="mt-2">
                    {data.top_products.map((p) => (
                      <Row key={p.product_id || p.name} label={p.name} value={money(p.sales)} />
                    ))}
                  </ul>
                ) : (
                  <EmptyState>{loading ? "Loading…" : "No orders yet today"}</EmptyState>
                )}
              </div>

              <div className={card}>
                <h2 className={cardHeading}>Customers</h2>
                <p className={smallLabel}>Who ordered today</p>
                <ul className="mt-2">
                  <Row label="First-time" value={count(data?.customers.first_time)} />
                  <Row label="Returning" value={count(data?.customers.returning)} />
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
