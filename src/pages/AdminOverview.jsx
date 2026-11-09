import { Link } from "react-router-dom";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
import SalesChart from "@/components/SalesChart";
import { formatMoney, useOverview } from "@/lib/reportsApi";

export default function OverviewPage() {
  const { data, loading, error } = useOverview(30);
  const totals = data?.totals;
  const currency = data?.currency_code;
  const show = (value) => (loading || !totals ? "—" : value);

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminHeader />

      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        <AdminSidebar />

        <main className="min-w-0 flex-1">
          {/* Header */}
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-5 sm:px-6">
            <div>
              <h1 className="flex items-center gap-2.5 text-xl font-semibold text-ink">
                <PageIcon name="overview" />
                Overview
              </h1>

              <p className="mt-1 text-sm text-slate-500">Store overview and performance summary</p>
            </div>

            <Link
              to="/admin/online-store/reports"
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
            >
              View reports
            </Link>
          </header>

          {/* Content */}
          <div className="p-5">
            {error && (
              <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <OverviewCard
                title="Total sales (30 days)"
                value={show(formatMoney(totals?.sales, currency))}
              />
              <OverviewCard title="Orders (30 days)" value={show(totals?.orders)} />
              <OverviewCard title="Customers" value={show(totals?.customers)} />
              <OverviewCard title="Products" value={show(totals?.products)} />
            </div>

            {/* Main Sections */}
            <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
              {/* Sales Overview */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-ink">Sales overview</h2>

                <div className="mt-5 flex h-72 items-center justify-center rounded-xl bg-slate-50">
                  {data?.series?.length ? (
                    <SalesChart series={data.series} currency={currency} />
                  ) : (
                    <p className="text-sm text-slate-500">
                      {loading ? "Loading…" : "No sales data available"}
                    </p>
                  )}
                </div>
              </section>

              {/* Recent Activity */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-ink">Recent activity</h2>

                {data?.activity?.length ? (
                  <ul className="mt-5 h-72 divide-y divide-slate-100 overflow-y-auto">
                    {data.activity.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-3 py-2.5 text-sm"
                      >
                        <span className="min-w-0 truncate text-ink">{item.title}</span>
                        <span className="shrink-0 text-slate-500">
                          {item.amount != null &&
                            `${formatMoney(item.amount, item.currency_code)} · `}
                          {new Date(item.at).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-5 flex h-72 items-center justify-center rounded-xl bg-slate-50">
                    <p className="text-sm text-slate-500">
                      {loading ? "Loading…" : "No activity available"}
                    </p>
                  </div>
                )}
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function OverviewCard({ title, value = "—" }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-600">{title}</p>

      <p className="mt-3 text-2xl font-bold text-ink">{value}</p>

      <div className="mt-5 h-[2px] bg-sky-400" />
    </section>
  );
}
