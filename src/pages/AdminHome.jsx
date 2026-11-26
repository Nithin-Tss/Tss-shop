import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Upload, Image as ImageIcon, Banknote, Check, Lightbulb, ArrowRight } from "lucide-react";
import AdminSidebar, { AdminHeader, NavIcon, navIcons } from "@/components/AdminSidebar";
import { apiGet, openStorefront } from "@/lib/api";
import { can, getActiveStore, useSession } from "@/lib/auth";
import { formatMoney, useOverview } from "@/lib/reportsApi";

const BASE = "/admin/online-store";

const HOME_ICONS = {
  upload: Upload,
  image: ImageIcon,
  cash: Banknote,
  check: Check,
  bulb: Lightbulb,
  arrow: ArrowRight,
};

function Icon({ name, className = "h-5 w-5" }) {
  // Sidebar items (products, orders, discounts...) use the shared sidebar icon
  if (navIcons[name]) return <NavIcon name={name} className={className} />;

  const Comp = HOME_ICONS[name] || ArrowRight;
  return <Comp className={className} strokeWidth={1.75} aria-hidden="true" />;
}

// `permission`: shown only to roles that can use what the link opens (see can() in lib/auth.js).
// "View store" has none: any member of the store may look at it.
const quickActions = [
  {
    label: "Add product",
    icon: "products",
    to: `${BASE}/products/new`,
    permission: "products.manage",
  },
  {
    label: "Import products",
    icon: "upload",
    to: `${BASE}/products`,
    state: { openImport: true },
    permission: "products.manage",
  },
  {
    label: "Create discount",
    icon: "discounts",
    to: `${BASE}/discounts`,
    permission: "discounts.manage",
  },
  { label: "Add banner", icon: "image", to: `${BASE}/customize`, permission: "themes.manage" },
  { label: "View store", icon: "store", storefront: "/" },
];

const tips = [
  "Products with three or more photos usually sell better than products with just one.",
  "A short, clear product title helps shoppers find what they want in search.",
  "Offering free shipping above a set order amount often raises the average order value.",
  "Use collections to group similar products, so shoppers can browse them in one place.",
  "A discount code for first-time buyers is an easy way to win your first sales.",
  "Write product descriptions that answer the questions shoppers would ask you in person.",
  "Keep stock counts up to date, so you never sell something you don't have.",
];

// Lists from the API come back either as an array or as { results, count }
const listOf = (res) =>
  Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.results) ? res.data.results : [];
const countOf = (res) =>
  typeof res?.data?.count === "number" ? res.data.count : listOf(res).length;

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// Tiny line chart for the metrics strip. `values` is a plain number array.
function Sparkline({ values }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values, 1);
  const step = 56 / (values.length - 1);
  const points = values.map(
    (v, i) => `${(i * step).toFixed(1)},${(16 - (v / max) * 14).toFixed(1)}`
  );
  return (
    <svg viewBox="0 0 56 16" className="h-4 w-14 text-emerald-500" aria-hidden="true">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AdminHomePage() {
  const session = useSession();
  const store = getActiveStore(session);
  const storeName = store?.storeName || "My Store";
  const firstName = session?.user?.firstName || "there";
  const allowed = (item) => !item.permission || can(session, item.permission);

  const canSeeProducts = can(session, "products.view");
  const canSeeReports = can(session, "reports.view");
  // Staff whose roles grant nothing in this store (owners always have permissions)
  const hasNoAccess = Array.isArray(store?.permissions) && store.permissions.length === 0;

  const [productCount, setProductCount] = useState(0);
  const [tip] = useState(() => tips[Math.floor(Math.random() * tips.length)]);
  const { data: overview, loading: overviewLoading } = useOverview(30, canSeeReports);

  useEffect(() => {
    if (!canSeeProducts) return undefined;
    let cancelled = false;
    // Only "first product" can be checked from data today; a refused request just leaves it at 0
    apiGet("/api/v1/catalog/products/")
      .catch(() => null)
      .then((res) => {
        if (!cancelled && res?.ok) setProductCount(countOf(res));
      });
    return () => {
      cancelled = true;
    };
  }, [canSeeProducts]);

  // The rest tick once there's data behind them.
  // Each step shows only to roles that can do it; payments and the plan are the owner's.
  const steps = [
    {
      title: "Add your first product",
      help: "Title, price and photo. Shoppers can't buy what isn't listed.",
      to: `${BASE}/products/new`,
      icon: "products",
      done: productCount > 0,
      permission: "products.manage",
    },
    {
      title: "Choose a theme",
      help: "Start with a free design and make it yours.",
      to: BASE,
      icon: "store",
      done: false,
      permission: "themes.manage",
    },
    {
      title: "Add a banner",
      help: "Welcome shoppers the moment they arrive.",
      to: `${BASE}/customize`,
      icon: "image",
      done: false,
      permission: "themes.manage",
    },
    {
      title: "Set up payments",
      help: "Choose how customers pay you.",
      to: `${BASE}/settings`,
      icon: "cash",
      done: false,
      permission: "store.manage",
    },
    {
      title: "Set up shipping",
      help: "Delivery areas and rates.",
      to: `${BASE}/shipping`,
      icon: "orders",
      done: false,
      permission: "shipping.manage",
    },
    {
      title: "Pick a plan",
      help: "Open your store to the public.",
      to: `${BASE}/settings`,
      icon: "check",
      done: false,
      permission: "store.manage",
    },
  ].filter(allowed);

  const doneCount = steps.filter((s) => s.done).length;
  const nextIndex = steps.findIndex((s) => !s.done);
  const progress = steps.length ? Math.round((doneCount / steps.length) * 100) : 100;

  const totals = overview?.totals;
  const currency = overview?.currency_code;
  const series = overview?.series || [];
  const metric = (value) => (overviewLoading || !totals ? "—" : value);
  const metrics = [
    {
      label: "Total sales",
      value: metric(formatMoney(totals?.sales, currency)),
      trend: series.map((d) => Number(d.sales) || 0),
    },
    {
      label: "Orders",
      value: metric(totals?.orders),
      trend: series.map((d) => Number(d.orders) || 0),
    },
    { label: "Customers", value: metric(totals?.customers) },
    { label: "Products", value: metric(totals?.products) },
  ];

  const actions = quickActions.filter(allowed);

  return (
    <div className="min-h-screen bg-slate-50 text-ink">
      <AdminHeader />

      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        <AdminSidebar />

        <main className="min-w-0 flex-1 overflow-hidden bg-slate-50">
          {/* METRICS STRIP */}
          {canSeeReports && (
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-slate-200 bg-white/70 px-4 py-3 sm:px-6 lg:px-9">
              <span className="text-sm text-slate-600">Last 30 days</span>
              <dl className="flex flex-wrap gap-x-8 gap-y-3">
                {metrics.map((m) => (
                  <div key={m.label}>
                    <dt className="text-xs text-slate-600">{m.label}</dt>
                    <dd className="mt-0.5 flex items-center gap-2 text-sm font-semibold">
                      {m.value}
                      <Sparkline values={m.trend} />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="mx-auto max-w-[980px] px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
            {/* GREETING + QUICK ACTIONS */}
            <section>
              <p className="text-sm text-slate-500">{storeName}</p>
              <h1 className="display mt-3 text-4xl leading-tight text-ink sm:text-6xl">
                {greeting()}, {firstName}.
                <span className="block italic text-violet-600">
                  {steps.length ? "Let's get ready to sell." : "Let's keep growing."}
                </span>
              </h1>
              {hasNoAccess && (
                <p className="mt-4 max-w-md text-sm text-slate-600">
                  You don&apos;t have any roles in this store yet. Ask the store owner to give you
                  one under Settings → Users.
                </p>
              )}

              {actions.length > 0 && (
                <div className="mt-8 inline-flex w-fit max-w-full flex-wrap items-center rounded-[28px] border border-slate-200 bg-white p-[6px] shadow-sm sm:rounded-full sm:px-[10px]">
                  {actions.map((action, idx) => (
                    <Fragment key={action.label}>
                      {idx > 0 && (
                        <span
                          aria-hidden="true"
                          className="hidden h-5 w-px shrink-0 bg-slate-300 sm:block"
                        />
                      )}
                      <Link
                        to={action.to || "#"}
                        state={action.state}
                        // "View store" opens the store in a new tab (with its "Back to admin" bar)
                        onClick={
                          action.storefront
                            ? (e) => {
                                e.preventDefault();
                                openStorefront(action.storefront);
                              }
                            : undefined
                        }
                        className="group inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-[18px] py-[12px] text-sm font-medium text-ink hover:bg-slate-50"
                      >
                        <Icon
                          name={action.icon}
                          className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-orange-600"
                        />
                        {action.label}
                      </Link>
                    </Fragment>
                  ))}
                </div>
              )}
            </section>

            {/* SETUP LIST */}
            {steps.length > 0 && (
              <section className="mt-12 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 pb-5">
                  <h2 className="display text-[28px] text-ink sm:text-[32px]">
                    Get your store ready
                  </h2>
                  <div className="flex items-center gap-3 text-sm tabular-nums text-slate-600">
                    <span>
                      {doneCount} of {steps.length}
                    </span>
                    <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-violet-600 transition-[width] duration-500"
                        style={{ width: `${Math.max(progress, 3)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <ol className="border-t border-slate-200">
                  {steps.map((step, i) => {
                    const isNext = i === nextIndex;
                    return (
                      <li
                        key={step.title}
                        className="border-b border-slate-200 py-1 last:border-b-0"
                      >
                        <Link
                          to={step.to}
                          className="group flex items-center gap-3 rounded-2xl px-3 py-4 hover:bg-slate-50 sm:gap-5 sm:px-5"
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm tabular-nums ${
                              step.done
                                ? "bg-violet-600 text-white"
                                : "border border-slate-300 text-slate-500"
                            }`}
                          >
                            {step.done ? <Icon name="check" className="h-4 w-4" /> : i + 1}
                          </span>
                          <span className="hidden h-8 w-px shrink-0 bg-slate-200 sm:block" />
                          <span className={`min-w-0 flex-1 ${step.done ? "opacity-50" : ""}`}>
                            <span className="block text-[15px] font-semibold">{step.title}</span>
                            <span className="mt-0.5 block text-sm text-slate-600">{step.help}</span>
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1 text-sm text-slate-500 group-hover:text-orange-600">
                            {step.done ? "Review" : isNext ? "Start" : ""}
                            <Icon
                              name="arrow"
                              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                            />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}

            {/* TIP */}
            <div className="mt-8 flex items-center gap-4 rounded-2xl border border-violet-100 bg-violet-50/60 px-5 py-4">
              <Icon name="bulb" className="h-5 w-5 shrink-0 text-violet-600" />
              <span className="h-8 w-px shrink-0 bg-violet-200" />
              <p className="text-sm leading-relaxed text-slate-600">
                <span className="font-semibold text-violet-700">Tip. </span>
                {tip}
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
