import { Link } from "react-router-dom";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
import SalesChart from "@/components/SalesChart";
import { formatMoney, useOverview } from "@/lib/reportsApi";

const lineIcon = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

const card =
  "rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-[0_1px_2px_rgba(20,27,45,0.04)] transition-shadow duration-200 hover:shadow-[0_4px_14px_-6px_rgba(20,27,45,0.12)]";

const cardHeading = "text-sm font-semibold text-[#0B1020]";

const outlineButton =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-3.5 text-sm font-medium text-[#0B1020] transition-colors duration-200 hover:border-[#0B1020] hover:bg-[#f1f3f7]";

const chip =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-3 text-[13px] font-medium text-[#0B1020] transition-colors duration-200 hover:border-[#0B1020] hover:bg-[#f1f3f7]";

function Chevron() {
  return (
    <svg {...lineIcon} className="h-3.5 w-3.5 text-[#4C4F7A]">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg {...lineIcon} className="h-6 w-6 text-[#A3ADBF]">
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <path d="M18 17V9M13 17V5M8 17v-3" />
    </svg>
  );
}

export default function AnalyticsPage() {
  const { data, loading, error } = useOverview(30);
  const totals = data?.totals;
  const currency = data?.currency_code;
  const show = (value) => (loading || !totals ? "—" : value);

  return (
    <div className="min-h-screen bg-[#F5F3FF] text-charcoal-navy">
      <AdminHeader />

      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        <AdminSidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden">
          <header className="border-b border-[#e5e7eb] bg-white">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <h1 className="flex items-center gap-2.5 text-xl font-semibold text-charcoal-navy">
                  <PageIcon name="analytics" />
                  Analytics
                </h1>

                <p className="mt-0.5 text-[13px] text-[#4C4F7A]">
                  Last refreshed: {data ? new Date().toLocaleTimeString() : "—"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="More actions"
                  className={`${outlineButton} w-9 justify-center px-0`}
                >
                  ⋯
                </button>

                <button type="button" className={outlineButton}>
                  Try targets <Chevron />
                </button>

                <Link
                  to="/admin/online-store/reports/new"
                  className="inline-flex h-9 items-center rounded-lg bg-charcoal-navy px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#1C2347]"
                >
                  New exploration
                </Link>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
            <div className="rounded-xl bg-[#f1f3f7] px-4 py-3 text-[13px] text-charcoal-navy">
              Analytics provides insights into your store performance.
              <button
                type="button"
                className="ml-1.5 font-semibold text-charcoal-navy hover:underline"
              >
                Learn more
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className={chip}>Last 30 days</span>
              {currency && <span className={chip}>{currency}</span>}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard title="Total sales" value={show(formatMoney(totals?.sales, currency))} />
              <MetricCard title="Orders" value={show(totals?.orders)} />
              <MetricCard
                title="Average order value"
                value={show(formatMoney(totals?.average_order_value, currency))}
              />
              <MetricCard title="Customers" value={show(totals?.customers)} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <section className={card}>
                <h2 className={cardHeading}>Total sales</h2>

                <div className="mt-4 flex h-85 items-center justify-center rounded-lg bg-[#F5F3FF]">
                  {data?.series?.length ? (
                    <SalesChart series={data.series} currency={currency} />
                  ) : (
                    <div className="flex flex-col items-center text-center">
                      <EmptyIcon />

                      <p className="mt-2 text-[13px] text-[#4C4F7A]">
                        {loading ? "Loading…" : error || "No sales data available"}
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className={card}>
                <h2 className={cardHeading}>Total sales breakdown</h2>

                <div className="mt-3 divide-y divide-[#eef0f4]">
                  <BreakdownRow label="Orders" value={show(totals?.orders)} />
                  <BreakdownRow
                    label="Average order value"
                    value={show(formatMoney(totals?.average_order_value, currency))}
                  />
                  <BreakdownRow
                    label="Total sales"
                    value={show(formatMoney(totals?.sales, currency))}
                  />
                </div>
              </section>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"></div>
          </div>
        </main>
      </div>
    </div>
  );
}

function MetricCard({ title, value = "—" }) {
  return (
    <div className={card}>
      <h2 className={cardHeading}>{title}</h2>

      <p className="mt-2 text-2xl font-bold text-charcoal-navy">{value}</p>

      <div className="mt-4 h-px bg-[#e5e7eb]" />
    </div>
  );
}

function BreakdownRow({ label, value = "—" }) {
  return (
    <div className="flex h-11 items-center justify-between px-1">
      <span className="text-sm text-charcoal-navy">{label}</span>

      <span className="text-sm font-semibold text-charcoal-navy">{value}</span>
    </div>
  );
}
