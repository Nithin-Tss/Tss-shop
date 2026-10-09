import { useState } from "react";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";

export default function InventoryPage() {
  // TODO: load the store's inventory items from the backend
  const [inventoryItems] = useState([]);

  // TODO: open the add-inventory flow once it exists
  const handleAddInventory = () => {};

  return (
    <div className="min-h-screen bg-white text-[#161C2C]">

      <AdminHeader />


      {/* BODY */}
      <div className="flex min-h-[calc(100vh-72px)]">

        {/* SIDEBAR */}
        <AdminSidebar />


        {/* MAIN CONTENT */}
        <main className="flex flex-1 flex-col bg-[#F7F8FA] px-6 lg:px-8 py-6 overflow-hidden">

          {/* TITLE */}
          <h1 className="flex items-center gap-2.5 text-[22px] font-bold text-[#161C2C]">
            <PageIcon name="inventory" />
            Inventory
          </h1>


          {/* EMPTY STATE (shown while there are no inventory items) */}
          {inventoryItems.length === 0 && (
            <section
              aria-labelledby="inventory-empty-heading"
              className="mt-5 flex flex-1 flex-col items-center justify-center rounded-2xl border border-[#D8DFE8]/80 bg-white px-6 py-14 text-center shadow-[0_1px_3px_rgba(22,28,44,0.05)] sm:py-16"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F7F8FA] text-[#161C2C] ring-1 ring-[#D8DFE8]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="h-8 w-8"
                >
                  <path d="M3 9l9-5 9 5v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
                  <path d="M7 20v-7h10v7" />
                  <path d="M7 16.5h10" />
                </svg>
              </span>

              <h2 id="inventory-empty-heading" className="mt-5 text-xl font-semibold text-[#161C2C]">
                No inventory items yet
              </h2>

              <p className="mt-1.5 max-w-[380px] text-sm text-[#53627E]">
                Add products to your inventory to start tracking stock levels.
              </p>

              <button
                type="button"
                onClick={handleAddInventory}
                className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#161C2C] px-4 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(22,28,44,0.25)] hover:bg-[#252E45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161C2C]/40 focus-visible:ring-offset-2 transition"
              >
                <span className="text-base leading-none">+</span>
                Add Inventory
              </button>
            </section>
          )}

        </main>

      </div>

    </div>
  );
}
