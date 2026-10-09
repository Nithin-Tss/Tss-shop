import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminSidebar, { AdminHeader } from "@/components/AdminSidebar";
import { apiGet } from "@/lib/api";
import { getActiveStore, useSession } from "@/lib/auth";

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
  plus: <path d="M12 5v14M5 12h14" />,
  upload: <path d="M12 15V3M7 8l5-5 5 5M5 21h14" />,
  tag: (
    <>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 16-5-5-9 9" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  cash: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  bag: (
    <>
      <path d="M5 8h14l-1 13H6Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" />
    </>
  ),
  box: (
    <>
      <path d="M21 16V8l-9-5-9 5v8l9 5Z" />
      <path d="M3.3 7 12 12l8.7-5M12 22V12" />
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
  return (
    <svg {...lineIcon} className={className}>
      {icons[name]}
    </svg>
  );
}

const quickActions = [
  { label: "Add product", icon: "plus", to: `${BASE}/products/new` },
  { label: "Import products", icon: "upload", to: `${BASE}/products`, state: { openImport: true } },
  { label: "Create discount", icon: "tag", to: `${BASE}/discounts` },
  { label: "Add banner", icon: "image", to: `${BASE}/customize` },
  { label: "View store", icon: "eye", to: `${BASE}/customize` },
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
const listOf = (res) => (Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.results) ? res.data.results : []);
const countOf = (res) => (typeof res?.data?.count === "number" ? res.data.count : listOf(res).length);

const isToday = (value) => value && new Date(value).toDateString() === new Date().toDateString();

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function AdminHomePage() {
  const session = useSession();
  const storeName = getActiveStore(session)?.storeName || "My Store";

  const [stats, setStats] = useState({ sales: 0, orders: 0, visitors: 0, products: 0 });
  const [tip] = useState(() => tips[Math.floor(Math.random() * tips.length)]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      apiGet("/api/v1/catalog/products/").catch(() => null),
      apiGet("/api/v1/orders/").catch(() => null),
    ]).then(([productsRes, ordersRes]) => {
      if (cancelled) return;
      const orders = ordersRes?.ok ? listOf(ordersRes) : [];
      setStats({
        sales: orders.filter((o) => isToday(o.created_at)).reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0),
        orders: ordersRes?.ok ? countOf(ordersRes) : 0,
        visitors: 0, // no visitor tracking yet
        products: productsRes?.ok ? countOf(productsRes) : 0,
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Only "first product" can be checked from data today; the rest tick once there's data behind them
  const steps = [
    {
      title: "Add your first product",
      help: "Title, price and photo",
      to: `${BASE}/products/new`,
      done: stats.products > 0,
    },
    {
      title: "Choose a theme",
      help: "Start with a free design",
      to: BASE,
      done: false,
    },
    {
      title: "Add a banner",
      help: "Welcome shoppers on arrival",
      to: `${BASE}/customize`,
      done: false,
    },
    {
      title: "Set up payments",
      help: "Choose how customers pay",
      to: `${BASE}/settings`,
      done: false,
    },
    {
      title: "Set up shipping",
      help: "Delivery areas and rates",
      to: `${BASE}/shipping`,
      done: false,
    },
    {
      title: "Pick a plan",
      help: "Open your store publicly",
      to: `${BASE}/settings`,
      done: false,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const nextIndex = steps.findIndex((s) => !s.done);
  const progress = Math.round((doneCount / steps.length) * 100);

  const statCards = [
    { label: "Today's sales", value: `$${stats.sales.toFixed(2)}`, icon: "cash" },
    { label: "Orders", value: stats.orders, icon: "bag" },
    { label: "Visitors", value: stats.visitors, icon: "users" },
    { label: "Products", value: stats.products, icon: "box" },
  ];

  return (
    <div className="min-h-screen bg-white text-[#161C2C]">

      <AdminHeader />


      {/* BODY */}
      <div className="flex min-h-[calc(100vh-72px)]">

        {/* SIDEBAR */}
        <AdminSidebar />


        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-hidden bg-[#F7F8FA] px-4 py-6 sm:px-6 lg:px-9">
          <div className="mx-auto max-w-[1180px] space-y-6">

            {/* PLAN PILL */}
            <div className="flex justify-end">
              <div className="flex items-center gap-1 rounded-full border border-[#E3E7ED] bg-white p-1 pl-3.5 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="ml-1.5 mr-2 text-sm text-[#53627E]">Pick a plan to go live</span>
                <Link
                  to={`${BASE}/settings`}
                  className="rounded-full bg-[#141b2d] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#252E45] transition"
                >
                  Select a plan
                </Link>
              </div>
            </div>


            {/* WELCOME BANNER */}
            <section className="relative overflow-hidden rounded-2xl bg-[#141b2d] px-6 py-7 text-white shadow-[0_10px_30px_-12px_rgba(20,27,45,0.45)] sm:px-8">
              <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/[0.04]" />
              <div className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-white/[0.04]" />

              <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm text-slate-300">{greeting()}, Admin</p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[28px]">
                    Let&apos;s get {storeName} ready to sell
                  </h1>
                  <p className="mt-2 max-w-lg text-sm text-slate-300">
                    Work through the steps below. Most stores are ready to launch in under an hour.
                  </p>
                </div>

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
              </div>
            </section>


            {/* QUICK STATS */}
            <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {statCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-[#E3E7ED] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#53627E]">{card.label}</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3F5F8] text-[#30466F]">
                      <Icon name={card.icon} className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-[#161C2C]">{card.value}</p>
                </div>
              ))}
            </section>


            {/* QUICK ACTIONS */}
            <section className="rounded-2xl border border-[#E3E7ED] bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-[#161C2C]">Quick actions</h2>
              <div className="mt-4 grid grid-cols-3 gap-y-5 sm:grid-cols-5">
                {quickActions.map((action) => (
                  <Link
                    key={action.label}
                    to={action.to}
                    state={action.state}
                    className="group flex flex-col items-center gap-2 text-center"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#E3E7ED] bg-[#F7F8FA] text-[#141b2d] transition group-hover:-translate-y-0.5 group-hover:border-[#141b2d] group-hover:bg-[#141b2d] group-hover:text-white">
                      <Icon name={action.icon} />
                    </span>
                    <span className="text-xs font-medium text-[#53627E] group-hover:text-[#161C2C] sm:text-sm">
                      {action.label}
                    </span>
                  </Link>
                ))}
              </div>
            </section>


            {/* CHECKLIST + TIP */}
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">

              {/* SETUP CHECKLIST */}
              <section className="overflow-hidden rounded-2xl border border-[#E3E7ED] bg-white shadow-sm lg:col-span-2">
                <div className="flex items-center justify-between border-b border-[#E3E7ED] px-4 py-2.5">
                  <h2 className="text-sm font-semibold text-[#161C2C]">Setup checklist</h2>
                  <span className="text-xs text-[#53627E]">
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
                              ? "border-[#141b2d] bg-[#F4F6FA]"
                              : "border-[#E3E7ED] bg-white hover:border-[#C9D1DD]"
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                              step.done
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : isNext
                                  ? "border-[#141b2d]"
                                  : "border-[#CBD3DF]"
                            }`}
                          >
                            {step.done && <Icon name="check" className="h-3 w-3" />}
                          </span>

                          <span className={`min-w-0 ${step.done ? "opacity-60" : ""}`}>
                            <span className="block truncate text-sm font-semibold text-[#161C2C]">{step.title}</span>
                            <span className="mt-0.5 block truncate text-xs text-[#53627E]">{step.help}</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </section>


              {/* TIP */}
              <aside className="rounded-2xl border border-[#E3E7ED] bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Icon name="bulb" />
                  </span>
                  <h2 className="text-base font-semibold text-[#161C2C]">Did you know?</h2>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[#53627E]">{tip}</p>
              </aside>

            </div>

          </div>
        </main>

      </div>

    </div>
  );
}
