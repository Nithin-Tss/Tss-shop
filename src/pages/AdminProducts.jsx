import { Link } from "react-router-dom";

const menuItems = [
  { icon: "⌂", label: "Home", href: "/admin/online-store/home" },
  { icon: "▣", label: "Orders", href: "/admin/online-store/orders" },
  { icon: "◇", label: "Products", href: "/admin/online-store/products", active: true },
  { icon: "♙", label: "Catalogues", href: "/admin/online-store/catalogues" },
  { icon: "▥", label: "Inventory", href: "/admin/online-store/inventory" },
  { icon: "⌁", label: "Content", href: "/admin/online-store/content" },
];

const lineIcon = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

// Sample product pictures shown next to "Add your products"
const sampleProducts = [
  {
    name: "Sneaker",
    icon: (
      <svg {...lineIcon}>
        <path d="M2 16v-3.5l3-1 3 2.5h3l4-4 7 3.5V16Z" />
        <path d="M2 16v2h20v-2" />
        <path d="M9.5 12.5l1.5 2M12 11.5l1.5 2" />
      </svg>
    ),
  },
  {
    name: "Tote bag",
    icon: (
      <svg {...lineIcon}>
        <path d="M5 8h14l-1 13H6Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
    ),
  },
  {
    name: "Cream tube",
    icon: (
      <svg {...lineIcon}>
        <path d="M3 10h13l3 1.5v1L16 14H3Z" />
        <path d="M19 11.5h2v1h-2" />
        <path d="M6 12c1-1 2 1 3 0s2 1 3 0" />
      </svg>
    ),
  },
  {
    name: "Mug",
    icon: (
      <svg {...lineIcon}>
        <path d="M5 7h11v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3Z" />
        <path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16" />
      </svg>
    ),
  },
];

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-white text-[#161C2C]">

      {/* HEADER */}
      <header className="h-[72px] border-b border-gray-200 flex items-center justify-between px-7">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#161C2C] flex items-center justify-center">
            <span className="text-white text-2xl font-bold">S</span>
          </div>

          <span className="text-[22px] font-bold">
            Store
          </span>
        </div>

        {/* Search */}
        <div className="hidden md:flex items-center w-[420px] h-11 rounded-full bg-[#F3F6FA] px-5 gap-3">
          <span className="text-xl">⌕</span>

          <input
            type="text"
            placeholder="Search anything..."
            className="w-full bg-transparent outline-none text-sm text-[#161C2C] placeholder:text-slate-500"
          />
        </div>

        {/* Right */}
        <div className="flex items-center gap-6">

          <button className="relative text-2xl">
            ♧
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#161C2C] text-white flex items-center justify-center font-medium">
              A
            </div>

            <span className="text-sm font-medium">
              Admin
            </span>

            <span>⌄</span>
          </div>

        </div>
      </header>


      {/* BODY */}
      <div className="flex min-h-[calc(100vh-72px)]">

        {/* SIDEBAR */}
        <aside className="hidden md:flex w-[256px] bg-[#161C2C] text-white flex-col">

          <nav className="px-4 py-6 space-y-1">

            {menuItems.map((item) => {
              // Items with a page are links
              const Row = item.href ? Link : "div";

              return (
                <Row
                  key={item.label}
                  href={item.href}
                  className={`h-11 px-3 rounded-lg flex items-center justify-between transition ${item.active ? "bg-[#30466F] font-medium" : "hover:bg-white/10"
                    }`}
                >

                  <div className="flex items-center gap-4">
                    <span className="w-5 text-center text-lg">
                      {item.icon}
                    </span>

                    <span className="text-sm">
                      {item.label}
                    </span>
                  </div>

                  {item.badge && (
                    <span className="bg-[#53627E] px-2.5 py-1 rounded-full text-xs">
                      {item.badge}
                    </span>
                  )}

                </Row>
              );
            })}


            {/* ONLINE STORE */}
            <div className="pt-5">

              <div className="h-11 px-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-lg">▣</span>

                  <span className="text-sm">
                    Online Store
                  </span>
                </div>

                <span>⌃</span>
              </div>


              {/* THEMES */}
              <Link
                to="/admin/online-store"
                className="mt-1 h-11 rounded-lg px-4 flex items-center gap-4 hover:bg-white/10 transition"
              >
                <span className="text-lg">◉</span>

                <span className="text-sm">
                  Themes
                </span>
              </Link>


              {/* PAGES */}
              <div className="h-11 px-4 flex items-center gap-4">
                <span className="text-lg">▤</span>

                <span className="text-sm">
                  Pages
                </span>
              </div>


              {/* BLOG */}
              <div className="h-11 px-4 flex items-center gap-4">
                <span className="text-lg">✎</span>

                <span className="text-sm">
                  Blog Posts
                </span>
              </div>

            </div>


            {/* APPS */}
            <div className="pt-5">

              <div className="h-11 px-3 flex items-center justify-between">

                <div className="flex items-center gap-4">
                  <span className="text-lg">◉</span>

                  <span className="text-sm">
                    Apps
                  </span>
                </div>

                <span>⌄</span>

              </div>

            </div>

          </nav>


          {/* SETTINGS */}
          <div className="mt-auto px-7 pb-8 flex items-center gap-4">
            <span className="text-xl">⚙</span>

            <span className="text-sm">
              Settings
            </span>
          </div>

        </aside>


        {/* MAIN CONTENT */}
        <main className="flex-1 bg-[#F7F8FA] px-6 lg:px-8 py-6 overflow-hidden">

          {/* TITLE */}
          <h1 className="flex items-center gap-2.5 text-[22px] font-bold text-[#161C2C]">
            <span className="text-xl">◇</span>
            Products
          </h1>


          {/* PRODUCTS CARD */}
          <section className="mt-5 overflow-hidden rounded-2xl border border-[#E3E7ED] bg-white shadow-sm">

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-[#E3E7ED] px-4 py-3">
              <button
                type="button"
                className="rounded-lg bg-[#EEF1F6] px-3 py-1.5 text-sm font-medium text-[#161C2C]"
              >
                All
              </button>

              <button
                type="button"
                aria-label="Add view"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-[#53627E] hover:bg-[#F3F6FA] transition"
              >
                +
              </button>
            </div>


            {/* Add your products */}
            <div className="flex items-center justify-between gap-10 px-6 py-14 sm:px-12 lg:pl-[14%] lg:pr-10">

              <div>
                <h2 className="text-xl font-semibold text-[#161C2C]">
                  Add your products
                </h2>

                <p className="mt-1 text-sm text-[#53627E]">
                  Start by stocking your store with products your customers will love
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-lg bg-[#161C2C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#252E45] transition"
                  >
                    <span className="text-base leading-none">+</span>
                    Add product
                  </button>

                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-lg border border-[#D8DFE8] bg-white px-4 py-2.5 text-sm font-medium text-[#161C2C] hover:border-[#161C2C] transition"
                  >
                    <svg {...lineIcon} strokeWidth="1.8" className="h-4 w-4">
                      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
                    </svg>
                    Import
                  </button>
                </div>
              </div>


              {/* Product pictures */}
              <div className="hidden lg:grid shrink-0 grid-cols-2 gap-3">
                {sampleProducts.map((product, index) => (
                  <div
                    key={product.name}
                    title={product.name}
                    className={`flex h-[90px] w-[140px] items-center justify-center rounded-xl bg-[#F3F5F8] text-[#30466F] ${index % 2 === 1 ? "-mt-6" : "mt-6"
                      }`}
                  >
                    <span className="block h-12 w-12 [&>svg]:h-full [&>svg]:w-full">
                      {product.icon}
                    </span>
                  </div>
                ))}
              </div>

            </div>


            {/* Find products to sell */}
            <div className="bg-[#F7F8FA] px-6 py-10 sm:px-12 lg:px-[14%]">
              <h3 className="text-base font-semibold text-[#161C2C]">
                Find products to sell
              </h3>

              <p className="mt-1 max-w-[640px] text-sm text-[#53627E]">
                Have dropshipping or print on demand products shipped directly
                from the supplier to your customer, and only pay for what you sell.
              </p>

              <button
                type="button"
                className="mt-5 rounded-lg border border-[#D8DFE8] bg-white px-4 py-2.5 text-sm font-medium text-[#161C2C] hover:border-[#161C2C] transition"
              >
                Discover products to sell
              </button>
            </div>

          </section>

        </main>

      </div>

    </div>
  );
}
