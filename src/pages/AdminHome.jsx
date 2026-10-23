import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminSidebar, { AdminHeader, NavIcon, navIcons } from "@/components/AdminSidebar";
import { apiGet, openStorefront } from "@/lib/api";
import { can, getActiveStore, useSession } from "@/lib/auth";

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

const isToday = (value) => value && new Date(value).toDateString() === new Date().toDateString();

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function AdminHomePage() {
  const session = useSession();
  const store = getActiveStore(session);
  const storeName = store?.storeName || "My Store";
  const firstName = session?.user?.firstName || "there";
  const allowed = (item) => !item.permission || can(session, item.permission);

  const canSeeOrders = can(session, "orders.view");
  const canSeeProducts = can(session, "products.view");
  // Staff whose roles grant nothing in this store (owners always have permissions)
  const hasNoAccess = Array.isArray(store?.permissions) && store.permissions.length === 0;

  const [stats, setStats] = useState({ sales: 0, orders: 0, visitors: 0, products: 0 });
  const [tip] = useState(() => tips[Math.floor(Math.random() * tips.length)]);

  useEffect(() => {
    let cancelled = false;

    // Only ask for what the role may see; a refused request would otherwise show as "0"
    Promise.all([
      canSeeProducts ? apiGet("/api/v1/catalog/products/").catch(() => null) : null,
      canSeeOrders ? apiGet("/api/v1/orders/").catch(() => null) : null,
    ]).then(([productsRes, ordersRes]) => {
      if (cancelled) return;
      const orders = ordersRes?.ok ? listOf(ordersRes) : [];
      setStats({
        sales: orders
          .filter((o) => isToday(o.created_at))
          .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0),
        orders: ordersRes?.ok ? countOf(ordersRes) : 0,
        visitors: 0, // no visitor tracking yet
        products: productsRes?.ok ? countOf(productsRes) : 0,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [canSeeOrders, canSeeProducts]);

  // Only "first product" can be checked from data today; the rest tick once there's data behind them.
  // Each step shows only to roles that can do it; payments and the plan are the owner's.
  const steps = [
    {
      title: "Add your first product",
      help: "Title, price and photo",
      to: `${BASE}/products/new`,
      done: stats.products > 0,
      permission: "products.manage",
    },
    {
      title: "Choose a theme",
      help: "Start with a free design",
      to: BASE,
      done: false,
      permission: "themes.manage",
    },
    {
      title: "Add a banner",
      help: "Welcome shoppers on arrival",
      to: `${BASE}/customize`,
      done: false,
      permission: "themes.manage",
    },
    {
      title: "Set up payments",
      help: "Choose how customers pay",
      to: `${BASE}/settings`,
      done: false,
      permission: "store.manage",
    },
    {
      title: "Set up shipping",
      help: "Delivery areas and rates",
      to: `${BASE}/shipping`,
      done: false,
      permission: "shipping.manage",
    },
    {
      title: "Pick a plan",
      help: "Open your store publicly",
      to: `${BASE}/settings`,
      done: false,
      permission: "store.manage",
    },
  ].filter(allowed);

  const doneCount = steps.filter((s) => s.done).length;
  const nextIndex = steps.findIndex((s) => !s.done);
  const progress = steps.length ? Math.round((doneCount / steps.length) * 100) : 100;

  const statCards = [
    {
      label: "Today's sales",
      value: `$${stats.sales.toFixed(2)}`,
      icon: "cash",
      permission: "orders.view",
    },
    { label: "Orders", value: stats.orders, icon: "orders", permission: "orders.view" },
    { label: "Visitors", value: stats.visitors, icon: "customers", permission: "reports.view" },
    { label: "Products", value: stats.products, icon: "products", permission: "products.view" },
  ].filter(allowed);
  const actions = quickActions.filter(allowed);

  return (
    <div className="min-h-screen bg-white text-[#0B1020]">
      <AdminHeader />

      {/* BODY */}
      <div className="flex min-h-[calc(100vh-72px)]">
        {/* SIDEBAR */}
        <AdminSidebar />

        {/* MAIN CONTENT */}
        <main className="min-w-0 flex-1 overflow-hidden bg-[#F5F3FF] px-4 py-6 sm:px-6 lg:px-9">
          <div className="mx-auto max-w-[1180px] space-y-6">
            {/* WELCOME BANNER */}
            <section className="relative overflow-hidden rounded-2xl bg-[#0B1020] px-6 py-7 text-white shadow-[0_10px_30px_-12px_rgba(20,27,45,0.45)] sm:px-8">
              <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/[0.04]" />
              <div className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-white/[0.04]" />

              <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm text-slate-300">
                    {greeting()}, {firstName}
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[28px]">
                    {steps.length ? (
                      <>Let&apos;s get {storeName} ready to sell</>
                    ) : (
                      <>Welcome to {storeName}</>
                    )}
                  </h1>
                  <p className="mt-2 max-w-lg text-sm text-slate-300">
                    {hasNoAccess
                      ? "You don't have any roles in this store yet."
                      : steps.length
                        ? "Work through the steps below. Most stores are ready to launch in under an hour."
                        : "Use the menu on the left to get to the parts of the store you work on."}
                  </p>
                </div>

                {steps.length > 0 && (
                  <div className="w-full md:w-72">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {doneCount} of {steps.length} setup steps done
                      </span>
                      <span className="text-slate-300">{progress}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
                      <div
                        className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                        style={{ width: `${Math.max(progress, 3)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* NO ROLES: nothing below would work for them */}
            {hasNoAccess && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <h2 className="text-base font-semibold text-[#0B1020]">
                  You don&apos;t have access to anything here yet
                </h2>
                <p className="mt-1 text-sm text-[#4C4F7A]">
                  Your account is part of {storeName}, but none of your roles give you access to its
                  products, orders or settings. Ask the store owner to give you a role under
                  Settings → Users.
                </p>
              </section>
            )}

            {/* QUICK STATS */}
            {statCards.length > 0 && (
              <section
                className={`grid grid-cols-2 gap-4 ${
                  statCards.length >= 4
                    ? "lg:grid-cols-4"
                    : statCards.length === 3
                      ? "lg:grid-cols-3"
                      : ""
                }`}
              >
                {statCards.map((card) => (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-[#E4DEFB] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#4C4F7A]">{card.label}</span>
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3F5F8] text-[#3B3F8F]">
                        <Icon name={card.icon} className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="mt-3 text-2xl font-semibold tracking-tight text-[#0B1020]">
                      {card.value}
                    </p>
                  </div>
                ))}
              </section>
            )}

            {/* QUICK ACTIONS */}
            {actions.length > 0 && (
              <section className="rounded-2xl border border-[#E4DEFB] bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-[#0B1020]">Quick actions</h2>
                <div className="mt-4 grid grid-cols-3 gap-y-5 sm:grid-cols-5">
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
                      className="group flex flex-col items-center gap-2 text-center"
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#E4DEFB] bg-[#F5F3FF] text-[#0B1020] transition group-hover:-translate-y-0.5 group-hover:border-[#0B1020] group-hover:bg-[#0B1020] group-hover:text-white">
                        <Icon name={action.icon} />
                      </span>
                      <span className="text-xs font-medium text-[#4C4F7A] group-hover:text-[#0B1020] sm:text-sm">
                        {action.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* CHECKLIST + TIP */}
            <div
              className={`grid grid-cols-1 items-start gap-6 ${steps.length ? "lg:grid-cols-3" : ""}`}
            >
              {/* SETUP CHECKLIST */}
              {steps.length > 0 && (
                <section className="overflow-hidden rounded-2xl border border-[#E4DEFB] bg-white shadow-sm lg:col-span-2">
                  <div className="flex items-center justify-between border-b border-[#E4DEFB] px-4 py-2.5">
                    <h2 className="text-sm font-semibold text-[#0B1020]">Setup checklist</h2>
                    <span className="text-xs text-[#4C4F7A]">
                      {doneCount}/{steps.length} complete
                    </span>
                  </div>

                  <ol className="grid grid-cols-2 gap-2.5 p-3 md:grid-cols-3 2xl:grid-cols-6">
                    {steps.map((step, i) => {
                      const isNext = i === nextIndex;
                      return (
                        <li key={step.title} className="min-w-0">
                          <Link
                            to={step.to}
                            className={`flex h-full min-w-0 items-start gap-2.5 rounded-xl border px-3 py-2.5 transition hover:-translate-y-0.5 hover:shadow-md ${
                              isNext
                                ? "border-[#0B1020] bg-[#F4F6FA]"
                                : "border-[#E4DEFB] bg-white hover:border-[#C9D1DD]"
                            }`}
                          >
                            <span
                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                step.done
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : isNext
                                    ? "border-[#0B1020]"
                                    : "border-[#CBD3DF]"
                              }`}
                            >
                              {step.done && <Icon name="check" className="h-3 w-3" />}
                            </span>

                            <span className={`min-w-0 ${step.done ? "opacity-60" : ""}`}>
                              <span className="block truncate text-sm font-semibold text-[#0B1020]">
                                {step.title}
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-[#4C4F7A]">
                                {step.help}
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              )}

              {/* TIP */}
              <aside className="rounded-2xl border border-[#E4DEFB] bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Icon name="bulb" />
                  </span>
                  <h2 className="text-base font-semibold text-[#0B1020]">Did you know?</h2>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[#4C4F7A]">{tip}</p>
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
