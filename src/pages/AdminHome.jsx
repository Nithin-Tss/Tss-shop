import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminSidebar, { AdminHeader, NavIcon, navIcons } from "@/components/AdminSidebar";
import { apiGet, openStorefront } from "@/lib/api";
import { can, getActiveStore, useSession } from "@/lib/auth";
import { formatMoney, useOverview } from "@/lib/reportsApi";

const BASE = "/admin/online-store";

const lineIcon = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

const icons = {
  upload: <path d="M12 15V3M7 8l5-5 5 5M5 21h14" />,
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 16-5-5-9 9" />
    </>
  ),
  cash: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  bulb: (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
};

function Icon({ name, className = "h-5 w-5" }) {
  // Sidebar items (products, orders, discounts...) use the shared sidebar icon
  if (navIcons[name]) return <NavIcon name={name} className={className} />;

  return (
    <svg {...lineIcon} className={className}>
      {icons[name]}
    </svg>
  );
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
    <div className="min-h-screen bg-white text-[#0B1020]">
      <AdminHeader />

      <div className="flex min-h-[calc(100vh-72px)]">
        <AdminSidebar />

        <main className="min-w-0 flex-1 overflow-hidden bg-[#F5F3FF]">
          {/* METRICS STRIP */}
          {canSeeReports && (
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-[#E4DEFB] bg-white/70 px-4 py-3 sm:px-6 lg:px-9">
              <span className="text-sm text-[#4C4F7A]">Last 30 days</span>
              <dl className="flex flex-wrap gap-x-8 gap-y-3">
                {metrics.map((m) => (
                  <div key={m.label}>
                    <dt className="text-xs text-[#4C4F7A]">{m.label}</dt>
                    <dd className="mt-0.5 flex items-center gap-2 text-sm font-semibold">
                      {m.value}
                      <Sparkline values={m.trend} />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="mx-auto max-w-[1100px] space-y-8 px-4 py-10 sm:px-6 lg:px-9">
            {/* GREETING + QUICK ACTIONS */}
            <section className="text-center">
              <p className="text-sm text-[#4C4F7A]">{storeName}</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                {greeting()}, {firstName}
                <span className="block text-[#3B3F8F]">
                  {steps.length ? "Let's get ready to sell." : "Let's keep growing."}
                </span>
              </h1>
              {hasNoAccess && (
                <p className="mx-auto mt-3 max-w-md text-sm text-[#4C4F7A]">
                  You don&apos;t have any roles in this store yet. Ask the store owner to give you
                  one under Settings → Users.
                </p>
              )}

              {actions.length > 0 && (
                <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                  {actions.map((action) => (
                    <Link
                      key={action.label}
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
                      className="group inline-flex items-center gap-2 rounded-full border border-[#E4DEFB] bg-white px-4 py-2 text-sm font-medium text-[#0B1020] shadow-sm transition hover:-translate-y-0.5 hover:border-[#0B1020] hover:bg-[#0B1020] hover:text-white"
                    >
                      <Icon name={action.icon} className="h-4 w-4" />
                      {action.label}
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* SETUP CARDS */}
            {steps.length > 0 && (
              <section>
                <div className="mb-3 flex items-end justify-between gap-4">
                  <h2 className="text-base font-semibold">Get your store ready</h2>
                  <div className="flex items-center gap-3 text-xs text-[#4C4F7A]">
                    <span>
                      {doneCount} of {steps.length} done
                    </span>
                    <div className="h-1.5 w-28 overflow-hidden rounded-full bg-[#E4DEFB]">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${Math.max(progress, 3)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {steps.map((step, i) => {
                    const isNext = i === nextIndex;
                    return (
                      <li key={step.title} className="min-w-0">
                        <Link
                          to={step.to}
                          className={`group flex h-full flex-col rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                            isNext ? "border-[#0B1020]" : "border-[#E4DEFB]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F3FF] text-[#3B3F8F]">
                              <Icon name={step.icon} />
                            </span>
                            {step.done ? (
                              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                <Icon name="check" className="h-3 w-3" /> Done
                              </span>
                            ) : (
                              isNext && (
                                <span className="rounded-full bg-[#0B1020] px-2 py-0.5 text-xs font-medium text-white">
                                  Next
                                </span>
                              )
                            )}
                          </div>
                          <h3
                            className={`mt-4 text-sm font-semibold ${step.done ? "opacity-60" : ""}`}
                          >
                            {step.title}
                          </h3>
                          <p
                            className={`mt-1 flex-1 text-sm text-[#4C4F7A] ${step.done ? "opacity-60" : ""}`}
                          >
                            {step.help}
                          </p>
                          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#0B1020]">
                            {step.done ? "Review" : "Get started"}
                            <Icon
                              name="arrow"
                              className="h-4 w-4 transition group-hover:translate-x-0.5"
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
            <aside className="mx-auto max-w-xl rounded-2xl border border-[#E4DEFB] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Icon name="bulb" />
                </span>
                <h2 className="text-base font-semibold">Did you know?</h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[#4C4F7A]">{tip}</p>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
