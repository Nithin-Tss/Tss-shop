import { Link } from "react-router-dom";
import AdminSidebar, { AdminHeader } from "@/components/AdminSidebar";

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

      <AdminHeader />


      {/* BODY */}
      <div className="flex min-h-[calc(100vh-72px)]">

        {/* SIDEBAR */}
        <AdminSidebar />


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
                  <Link
                    to="/admin/online-store/products/new"
                    className="flex items-center gap-2 rounded-lg bg-[#141b2d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#252E45] transition"
                  >
                    <span className="text-base leading-none">+</span>
                    Add product
                  </Link>

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
