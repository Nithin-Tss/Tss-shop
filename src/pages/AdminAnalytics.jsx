import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
import { formatMoney, useAnalytics } from "@/lib/reportsApi";
import {
  card,
  cardHeading,
  smallLabel,
  outlineButton,
  chip,
  REFRESH_MS,
  COMPARE_OPTIONS,
  todayIn,
  PRESETS,
  rangeLabel,
  percent,
  whole,
  Delta,
  Chevron,
  EmptyState,
  Sparkline,
  LineChart,
  DateRangeButton,
  Menu,
  menuItem,
} from "@/components/reportKit";

// ---- cards -----------------------------------------------------------------------------

function KpiCard({ title, metric, format, spark, loaded }) {
  return (
    <div className={card}>
      <h2 className={cardHeading}>{title}</h2>
      <p className="mt-2 text-2xl font-bold text-[#14130F]">
        {loaded ? format(metric.value) : "—"}
      </p>
      <div className="mt-1 flex items-center gap-2">
        {loaded && <Delta change={metric.change} />}
        {loaded && metric.previous !== null && (
          <span className={smallLabel}>from {format(metric.previous)}</span>
        )}
      </div>
      <div className="mt-3 border-t border-[#E7E4DC] pt-3">
        <Sparkline values={spark} />
      </div>
    </div>
  );
}

function BarList({ rows, label, value, format }) {
  const max = Math.max(...rows.map((r) => Number(r[value])), 1);
  return (
    <ul className="mt-3 space-y-3">
      {rows.map((r) => (
        <li key={`${r.product_id || ""}${r.type || ""}${r[label]}`}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-[#14130F]">{r[label]}</span>
            <span className="font-semibold text-[#14130F]">{format(r[value])}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-[#F3F1EC]">
            <div
              className="h-1.5 rounded-full bg-[#5B9BD5]"
              style={{ width: `${Math.max((Number(r[value]) / max) * 100, 2)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---- page ------------------------------------------------------------------------------

export default function AnalyticsPage() {
  const [preset, setPreset] = useState("30d");
  const [custom, setCustom] = useState(null);
  const [compare, setCompare] = useState("previous_period");
  const [currency, setCurrency] = useState("");
  const [timeZone, setTimeZone] = useState(undefined);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [fullScreen, setFullScreen] = useState(false);
  const pageRef = useRef(null);

  const today = useMemo(() => todayIn(timeZone), [timeZone]);
  const [from, to] = useMemo(() => {
    if (preset === "custom" && custom) return custom;
    return PRESETS.find((p) => p.key === preset).range(today);
  }, [preset, custom, today]);

  const { data, loading, error } = useAnalytics({ from, to, compare, currency, reloadKey });
  // Presets follow the store's timezone once the first answer has told us which it is
  if (data?.timezone && data.timezone !== timeZone) setTimeZone(data.timezone);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = setInterval(() => setReloadKey((k) => k + 1), REFRESH_MS);
    return () => clearInterval(id);
  }, [autoRefresh]);

  useEffect(() => {
    const sync = () => setFullScreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggleFullScreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else pageRef.current?.requestFullscreen?.();
  };

  const loaded = Boolean(data);
  const m = data?.metrics;
  const cur = data?.currency_code || currency || "INR";
  const money = (v, compact) =>
    compact && Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : formatMoney(v, cur);
  const series = data?.series || [];
  const spark = (field) => series.map((r) => Number(r[field]) || 0);
  const hourly = data?.interval === "hour";
  const empty = loaded && !data.has_data;
  const noVisits = loaded && !data.has_sessions;
  const presetLabel =
    preset === "custom" ? rangeLabel(from, to) : PRESETS.find((p) => p.key === preset).label;
  const compareLabel = COMPARE_OPTIONS.find((o) => o.value === compare).label;
  const refreshed = data ? new Date(data.refreshed_at).toLocaleTimeString() : "—";

  const breakdown = [
    ["Gross sales", "gross_sales"],
    ["Discounts", "discounts", true],
    ["Returns", "returns", true],
    ["Net sales", "net_sales"],
    ["Shipping charges", "shipping_charges"],
    ["Taxes", "taxes"],
    ["Total sales", "total_sales"],
  ];

  return (
    <div ref={pageRef} className="min-h-screen overflow-y-auto bg-[#F3F1EC] text-charcoal-navy">
      {!fullScreen && <AdminHeader />}

      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        {!fullScreen && <AdminSidebar />}

        <main className="min-w-0 flex-1 overflow-x-hidden">
          <header className="border-b border-[#E7E4DC] bg-white">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <h1 className="flex items-center gap-2.5 text-xl font-semibold text-charcoal-navy">
                  <PageIcon name="analytics" />
                  Analytics
                </h1>
                <p className="mt-0.5 text-[13px] text-[#5A5750]">
                  Last refreshed: {refreshed}
                  {autoRefresh && " · auto-refresh on"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Menu
                  ariaLabel="More actions"
                  label="⋯"
                  className={`${outlineButton} w-9 justify-center px-0`}
                >
                  <button
                    type="button"
                    className={menuItem}
                    onClick={() => setAutoRefresh((v) => !v)}
                  >
                    {autoRefresh ? "Turn off auto-refresh" : "Turn on auto-refresh"}
                  </button>
                  <button type="button" className={menuItem} onClick={toggleFullScreen}>
                    {fullScreen ? "Exit full screen" : "Expand to full screen"}
                  </button>
                </Menu>
                <Link
                  to="/admin/online-store/reports/new"
                  className="inline-flex h-9 items-center rounded-lg bg-charcoal-navy px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#1A1916]"
                >
                  New exploration
                </Link>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <DateRangeButton
                label={presetLabel}
                preset={preset}
                range={[from, to]}
                today={today}
                onPreset={setPreset}
                onCustom={(a, b) => {
                  setCustom([a, b]);
                  setPreset("custom");
                }}
              />
              <Menu
                label={
                  <>
                    Compare to: {compareLabel} <Chevron />
                  </>
                }
                className={chip}
              >
                {COMPARE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    className={`${menuItem} ${compare === o.value ? "font-semibold" : ""}`}
                    onClick={() => setCompare(o.value)}
                  >
                    {o.label}
                  </button>
                ))}
              </Menu>
              {data?.currencies?.length > 1 ? (
                <select
                  aria-label="Currency"
                  className={chip}
                  value={cur}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  {data.currencies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              ) : (
                loaded && <span className={chip}>{cur}</span>
              )}
              {data?.compare_from && (
                <span className={smallLabel}>
                  vs {rangeLabel(data.compare_from, data.compare_to)}
                </span>
              )}
            </div>

            {error && (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-800">
                {error}
              </p>
            )}

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                title="Gross sales"
                metric={m?.gross_sales}
                loaded={loaded}
                format={(v) => formatMoney(v, cur)}
                spark={spark("gross_sales")}
              />
              <KpiCard
                title="Returning customer rate"
                metric={m?.returning_customer_rate}
                loaded={loaded}
                format={percent}
                spark={spark("returning_customer_rate")}
              />
              <KpiCard
                title="Orders fulfilled"
                metric={m?.orders_fulfilled}
                loaded={loaded}
                format={whole}
                spark={spark("orders_fulfilled")}
              />
              <KpiCard
                title="Orders"
                metric={m?.orders}
                loaded={loaded}
                format={whole}
                spark={spark("orders")}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <section className={card}>
                <h2 className={cardHeading}>Total sales over time</h2>
                <p className="mt-2 text-xl font-bold">
                  {loaded ? formatMoney(m.total_sales.value, cur) : "—"}
                </p>
                <div className="mt-3">
                  {empty || !loaded ? (
                    <div className="rounded-lg bg-[#F3F1EC]">
                      <EmptyState>
                        {loading && !loaded ? "Loading…" : "No data for this date range"}
                      </EmptyState>
                    </div>
                  ) : (
                    <LineChart
                      series={series}
                      comparison={data.comparison_series}
                      field="total_sales"
                      format={money}
                      hourly={hourly}
                    />
                  )}
                </div>
                {data?.comparison_series && !empty && (
                  <div className={`mt-2 flex gap-4 ${smallLabel}`}>
                    <span>━ {rangeLabel(from, to)}</span>
                    <span>╌ {rangeLabel(data.compare_from, data.compare_to)}</span>
                  </div>
                )}
              </section>

              <section className={card}>
                <h2 className={cardHeading}>Total sales breakdown</h2>
                <div className="mt-3 divide-y divide-[#F3F1EC]">
                  {breakdown.map(([label, key, negative]) => (
                    <div key={key} className="flex h-11 items-center justify-between gap-2 px-1">
                      <span className="text-sm text-charcoal-navy">{label}</span>
                      <span className="flex items-center gap-2">
                        {loaded && <Delta change={m[key].change} />}
                        <span className="text-sm font-semibold text-charcoal-navy">
                          {loaded
                            ? `${negative && Number(m[key].value) ? "-" : ""}${formatMoney(m[key].value, cur)}`
                            : "—"}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <section className={card}>
                <h2 className={cardHeading}>Average order value over time</h2>
                <p className="mt-2 text-xl font-bold">
                  {loaded ? formatMoney(m.average_order_value.value, cur) : "—"}
                </p>
                <div className="mt-3">
                  {empty || !loaded ? (
                    <EmptyState>
                      {loading && !loaded ? "Loading…" : "No data for this date range"}
                    </EmptyState>
                  ) : (
                    <LineChart
                      series={series}
                      comparison={data.comparison_series}
                      field="average_order_value"
                      format={money}
                      hourly={hourly}
                    />
                  )}
                </div>
              </section>

              <section className={card}>
                <h2 className={cardHeading}>Total sales by product</h2>
                {data?.top_products?.length ? (
                  <BarList
                    rows={data.top_products}
                    label="name"
                    value="sales"
                    format={(v) => formatMoney(v, cur)}
                  />
                ) : (
                  <EmptyState>
                    {loading && !loaded ? "Loading…" : "No data for this date range"}
                  </EmptyState>
                )}
              </section>

              <section className={card}>
                <h2 className={cardHeading}>Total sales by sales channel</h2>
                {data?.sales_by_channel?.length ? (
                  <BarList
                    rows={data.sales_by_channel}
                    label="channel"
                    value="sales"
                    format={(v) => formatMoney(v, cur)}
                  />
                ) : (
                  <EmptyState>
                    {loading && !loaded ? "Loading…" : "No data for this date range"}
                  </EmptyState>
                )}
              </section>

              <section className={card}>
                <h2 className={cardHeading}>Sessions over time</h2>
                <p className="mt-2 text-xl font-bold">{loaded ? whole(m.sessions.value) : "—"}</p>
                <div className="mt-3">
                  {noVisits || !loaded ? (
                    <EmptyState>
                      {loading && !loaded ? "Loading…" : "No data for this date range"}
                    </EmptyState>
                  ) : (
                    <LineChart
                      series={series}
                      comparison={data.comparison_series}
                      field="sessions"
                      format={whole}
                      hourly={hourly}
                    />
                  )}
                </div>
              </section>

              <section className={card}>
                <h2 className={cardHeading}>Conversion rate over time</h2>
                <p className="mt-2 text-xl font-bold">
                  {loaded ? percent(m.conversion_rate.value) : "—"}
                </p>
                <div className="mt-3">
                  {noVisits || !loaded ? (
                    <EmptyState>
                      {loading && !loaded ? "Loading…" : "No data for this date range"}
                    </EmptyState>
                  ) : (
                    <LineChart
                      series={series}
                      comparison={data.comparison_series}
                      field="conversion_rate"
                      format={percent}
                      hourly={hourly}
                    />
                  )}
                </div>
              </section>

              <section className={card}>
                <h2 className={cardHeading}>Conversion rate breakdown</h2>
                {noVisits || !loaded ? (
                  <EmptyState>
                    {loading && !loaded ? "Loading…" : "No data for this date range"}
                  </EmptyState>
                ) : (
                  <div className="mt-3 divide-y divide-[#F3F1EC]">
                    {data.funnel.map((step) => (
                      <div
                        key={step.key}
                        className="flex h-11 items-center justify-between gap-2 px-1"
                      >
                        <span className="text-sm text-charcoal-navy">{step.label}</span>
                        <span className="flex items-center gap-2">
                          <Delta change={step.change} />
                          <span className="text-sm font-semibold text-charcoal-navy">
                            {whole(step.value)}
                          </span>
                          <span className={`${smallLabel} w-12 text-right`}>
                            {percent(step.rate)}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className={card}>
                <h2 className={cardHeading}>Sessions by landing page</h2>
                {data?.sessions_by_landing_page?.length ? (
                  <BarList
                    rows={data.sessions_by_landing_page}
                    label="page"
                    value="sessions"
                    format={whole}
                  />
                ) : (
                  <EmptyState>
                    {loading && !loaded ? "Loading…" : "No data for this date range"}
                  </EmptyState>
                )}
              </section>

              <section className={card}>
                <h2 className={cardHeading}>Sessions by referrer</h2>
                {data?.sessions_by_referrer?.length ? (
                  <BarList
                    rows={data.sessions_by_referrer}
                    label="referrer"
                    value="sessions"
                    format={whole}
                  />
                ) : (
                  <EmptyState>
                    {loading && !loaded ? "Loading…" : "No data for this date range"}
                  </EmptyState>
                )}
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
