"use client";

import AdminSidebar from "../components/AdminSidebar";

export default function ShippingPage() {
  return (
    <div className="flex min-h-screen bg-[#F7F8FA] text-[#161C2C]">

      <AdminSidebar />

      <main className="min-w-0 flex-1">

        {/* HEADER */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-[#F7F8FA] px-6 py-5">

          <div className="flex items-center gap-2">
            <span className="text-xl">
              ▱
            </span>

            <h1 className="text-xl font-semibold">
              Shipping
            </h1>
          </div>

        </header>


        {/* CONTENT */}
        <div className="p-5">

          {/* SHIPPING ORIGIN */}
          <section className="rounded-2xl border border-slate-200 bg-white">

            <div className="border-b border-slate-200 px-5 py-5">

              <h2 className="text-base font-semibold">
                Shipping origin
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Manage where your orders are shipped from.
              </p>

            </div>

            <div className="flex items-center justify-between px-5 py-5">

              <div>
                <p className="text-sm font-medium">
                  Shipping location
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  No shipping origin configured
                </p>
              </div>

              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Manage
              </button>

            </div>

          </section>


          {/* SHIPPING RATES */}
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white">

            <div className="border-b border-slate-200 px-5 py-5">

              <h2 className="text-base font-semibold">
                Shipping rates
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Set up the rates customers see at checkout.
              </p>

            </div>

            <div className="flex min-h-[220px] items-center justify-center px-5 py-8">

              <div className="text-center">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                  <span className="text-3xl text-slate-500">
                    ▱
                  </span>
                </div>

                <h3 className="mt-4 text-base font-semibold">
                  No shipping rates configured
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Add shipping rates to start offering delivery options.
                </p>

                <button
                  type="button"
                  className="mt-5 rounded-lg bg-[#161C2C] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#252E45]"
                >
                  Add shipping rate
                </button>

              </div>

            </div>

          </section>


          {/* PACKAGES */}
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white">

            <div className="border-b border-slate-200 px-5 py-5">

              <h2 className="text-base font-semibold">
                Packages
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Manage the packages used for shipping your orders.
              </p>

            </div>

            <div className="flex min-h-[180px] items-center justify-center">

              <p className="text-sm text-slate-500">
                No packages configured
              </p>

            </div>

          </section>


          {/* SAVE */}
          <div className="mt-5 flex justify-end">

            <button
              type="button"
              className="rounded-lg bg-[#161C2C] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#252E45]"
            >
              Save
            </button>

          </div>

        </div>

      </main>

    </div>
  );
}