import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AdminSidebar, { AdminHeader } from "@/components/AdminSidebar";
import {
  COMPARE_OPTIONS,
  Chevron,
  DateRangeButton,
  EmptyState,
  LineChart,
  Menu,
  PRESETS,
  card,
  cardHeading,
  chip,
  menuItem,
  outlineButton,
  percent,
  rangeLabel,
  shortDate,
  smallLabel,
  todayIn,
  whole,
  bucketLabel,
} from "@/components/reportKit";
import { apiDownload } from "@/lib/api";
import { formatMoney, reportQuery, useReport } from "@/lib/reportsApi";

const PAGE_SIZE = 50;
const CUSTOMER_TYPES = [
  { value: "", label: "All customers" },
  { value: "new", label: "New customers" },
  { value: "returning", label: "Returning customers" },
];

function BarChart({ points, format }) {
  const max = Math.max(...points.map((p) => Number(p.value) || 0), 1);
  return (
    <ul className="space-y-2.5">
      {points.map((p) => (
        <li key={p.label}>
          <div className="flex items-center justify-between gap-3 text-[13px]">
            <span className="truncate text-ink">{p.label || "—"}</span>
            <span className="font-semibold text-ink">{format(p.value)}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full bg-violet-600"
              style={{ width: `${Math.max((Number(p.value) / max) * 100, 2)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AdminReportDetail() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [preset, setPreset] = useState("30d");
  const [custom, setCustom] = useState(null);
  const [compare, setCompare] = useState("previous_period");
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState("");
  const [page, setPage] = useState(1);
  const [timeZone, setTimeZone] = useState(undefined);
  const [notice, setNotice] = useState("");

  const today = useMemo(() => todayIn(timeZone), [timeZone]);
  const [from, to] = useMemo(() => {
    if (preset === "custom" && custom) return custom;
    return PRESETS.find((p) => p.key === preset).range(today);
  }, [preset, custom, today]);

  const params = { from, to, compare, sort, page, ...filters };
  const { data, loading, error } = useReport(reportId, params);
  if (data?.timezone && data.timezone !== timeZone) setTimeZone(data.timezone);

  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(id);
  }, [notice]);

  // Filters, dates and sorting all start the table over on page 1
  const change = (apply) => {
    apply();
    setPage(1);
  };

  const cur = data?.currency_code || "INR";
  const hourly = data?.interval === "hour";
  const cell = (column, value) => {
    if (value === null || value === undefined || value === "") return "—";
    if (column.type === "money") return formatMoney(value, cur);
    if (column.type === "number") return whole(value);
    if (column.type === "percent") return percent(value);
    if (column.type === "date")
      return hourly ? bucketLabel(value, true) : shortDate(value.slice(0, 10));
    return value;
  };
  const chartFormat = (value, compact) => {
    const type = data?.chart?.value_type;
    if (type === "money") {
      return compact && Number(value) >= 1000
        ? `${Math.round(Number(value) / 1000)}k`
        : formatMoney(value, cur);
    }
    return type === "percent" ? percent(value) : whole(value);
  };

  const sortKey = (data?.sort || "").replace(/^-/, "");
  const sortDesc = (data?.sort || "").startsWith("-");
  const toggleSort = (key) =>
    change(() =>
      setSort(sortKey === key && !sortDesc ? `-${key}` : sortKey === key ? key : `-${key}`)
    );

  const exportCsv = async () => {
    const query = reportQuery({
      from,
      to,
      compare: "none",
      sort: data?.sort,
      ...filters,
      format: "csv",
    });
    const res = await apiDownload(
      `/api/v1/reports/${reportId}/?${query}`,
      `${reportId}_${from}_${to}.csv`
    );
    setNotice(res.ok ? "CSV downloaded." : res.error);
  };

  const options = data?.filter_options || {};
  const supported = data?.supported_filters || [];
  const firstRow = data ? (data.page - 1) * data.page_size + 1 : 0;
  const lastRow = data ? Math.min(data.page * data.page_size, data.row_count) : 0;
  const lastPage = data ? Math.max(Math.ceil(data.row_count / PAGE_SIZE), 1) : 1;
  const presetLabel =
    preset === "custom" ? rangeLabel(from, to) : PRESETS.find((p) => p.key === preset).label;
  const compareLabel = COMPARE_OPTIONS.find((o) => o.value === compare).label;
  const empty = data && data.row_count === 0;

  const select = (label, value, onChange, items) => (
    <select
      aria-label={label}
      className={chip}
      value={value}
      onChange={(e) => change(() => onChange(e.target.value))}
    >
      {items.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-charcoal-navy">
      <AdminHeader />

      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        <AdminSidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  aria-label="Back to reports"
                  title="Back"
                  onClick={() => navigate("/admin/online-store/reports")}
                  className={`${outlineButton} w-9 justify-center px-0`}
                >
                  ←
                </button>
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-semibold text-charcoal-navy">
                    {data?.name || "Report"}
                  </h1>
                  <p className="mt-0.5 text-[13px] text-slate-600">
                    {data ? (
                      <>
                        <Link to="/admin/online-store/reports" className="hover:underline">
                          Reports
                        </Link>{" "}
                        · {data.category}
                      </>
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
              </div>

              <Menu
                ariaLabel="More actions"
                label="⋯"
                className={`${outlineButton} w-9 justify-center px-0`}
              >
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase text-slate-600">
                  Export
                </p>
                <button type="button" className={menuItem} disabled={!data} onClick={exportCsv}>
                  CSV (all rows)
                </button>
              </Menu>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
            {data?.description && (
              <p className="mb-4 text-[13px] text-slate-600">{data.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {(!data || data.dated) && (
                <DateRangeButton
                  label={presetLabel}
                  preset={preset}
                  range={[from, to]}
                  today={today}
                  onPreset={(key) => change(() => setPreset(key))}
                  onCustom={(a, b) =>
                    change(() => {
                      setCustom([a, b]);
                      setPreset("custom");
                    })
                  }
                />
              )}
              {(!data || data.dated) && (
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
                      onClick={() => change(() => setCompare(o.value))}
                    >
                      {o.label}
                    </button>
                  ))}
                </Menu>
              )}
              {supported.includes("product") &&
                select(
                  "Product",
                  filters.product || "",
                  (v) => setFilters((f) => ({ ...f, product: v })),
                  [
                    { value: "", label: "All products" },
                    ...(options.products || []).map((p) => ({ value: p.id, label: p.title })),
                  ]
                )}
              {supported.includes("channel") &&
                select(
                  "Sales channel",
                  filters.channel || "",
                  (v) => setFilters((f) => ({ ...f, channel: v })),
                  [
                    { value: "", label: "All sales channels" },
                    ...(options.channels || []).map((c) => ({ value: c.id, label: c.name })),
                  ]
                )}
              {supported.includes("customer_type") &&
                select(
                  "Customer type",
                  filters.customer_type || "",
                  (v) => setFilters((f) => ({ ...f, customer_type: v })),
                  CUSTOMER_TYPES
                )}
              {data?.currency_code && <span className={chip}>{data.currency_code}</span>}
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
            {notice && (
              <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-[13px]">{notice}</p>
            )}

            <section className={`${card} mt-4`}>
              <h2 className={cardHeading}>{data?.chart?.value_label || "—"}</h2>
              <div className="mt-3">
                {!data || empty ? (
                  <div className="rounded-lg bg-slate-100">
                    <EmptyState>
                      {loading && !data ? "Loading…" : "No data for this date range"}
                    </EmptyState>
                  </div>
                ) : data.chart.type === "line" ? (
                  <LineChart
                    series={data.chart.points.map((p) => ({ bucket: p.label, v: p.value }))}
                    comparison={data.chart.comparison?.map((p) => ({
                      bucket: p.label,
                      v: p.value,
                    }))}
                    field="v"
                    format={chartFormat}
                    hourly={hourly}
                  />
                ) : data.chart.points.length ? (
                  <BarChart points={data.chart.points} format={chartFormat} />
                ) : (
                  <EmptyState>Nothing to chart</EmptyState>
                )}
              </div>
              {data?.chart?.comparison && !empty && (
                <div className={`mt-2 flex gap-4 ${smallLabel}`}>
                  <span>━ {rangeLabel(from, to)}</span>
                  <span>╌ {rangeLabel(data.compare_from, data.compare_to)}</span>
                </div>
              )}
            </section>

            <section className={`${card} mt-4 overflow-hidden p-0`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-160 text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      {(data?.columns || []).map((c) => (
                        <th
                          key={c.key}
                          className={`px-4 py-3 font-medium ${c.type === "text" || c.type === "date" ? "" : "text-right"}`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleSort(c.key)}
                            className="inline-flex items-center gap-1 hover:text-orange-600"
                          >
                            {c.label}
                            {sortKey === c.key && (
                              <span aria-hidden="true">{sortDesc ? "↓" : "↑"}</span>
                            )}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.rows || []).map((row, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                        {data.columns.map((c) => (
                          <td
                            key={c.key}
                            className={`px-4 py-2.5 ${c.type === "text" || c.type === "date" ? "text-ink" : "text-right tabular-nums"}`}
                          >
                            {cell(c, row[c.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {data && !empty && (
                      <tr className="bg-slate-50 font-semibold">
                        {data.columns.map((c, i) => (
                          <td
                            key={c.key}
                            className={`px-4 py-3 ${c.type === "text" || c.type === "date" ? "" : "text-right tabular-nums"}`}
                          >
                            {i === 0
                              ? "Total"
                              : data.totals[c.key] === undefined
                                ? ""
                                : cell(c, data.totals[c.key])}
                          </td>
                        ))}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {(!data || empty) && (
                <EmptyState>
                  {loading && !data ? "Loading…" : "No data for this date range"}
                </EmptyState>
              )}

              {data && !empty && (
                <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
                  <span className={smallLabel}>
                    {firstRow}–{lastRow} of {data.row_count}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={outlineButton}
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className={outlineButton}
                      disabled={page >= lastPage}
                      onClick={() => setPage((p) => Math.min(p + 1, lastPage))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
