import { Link } from "react-router-dom";
import AdminSidebar, { AdminHeader } from "@/components/AdminSidebar";

const lineIcon = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

export default function AdminHomePage() {
  return (
    <div className="min-h-screen bg-white text-[#161C2C]">

      <AdminHeader />


      {/* BODY */}
      <div className="flex min-h-[calc(100vh-72px)]">

        {/* SIDEBAR */}
        <AdminSidebar />


      {/* MAIN CONTENT */}
      <main className="flex-1 bg-[#F7F8FA] px-6 lg:px-9 py-6 overflow-hidden">

        {/* PLAN BANNER */}
        <div className="flex justify-end">
          <div className="flex items-center rounded-full bg-[#161C2C] text-white text-sm font-medium shadow-sm">
            <span className="flex items-center gap-2.5 py-2.5 pl-3 pr-4">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/25">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Pick a plan to go live
            </span>

            <button
              type="button"
              className="border-l border-white/15 py-2.5 pl-4 pr-5 font-semibold hover:text-white/80 transition"
            >
              Select a plan
            </button>
          </div>
        </div>


        {/* WELCOME */}
        <section className="mt-16 text-center">
          <h1 className="text-[28px] leading-tight font-medium text-[#53627E]">
            Welcome to Store
          </h1>

          <p className="text-[28px] leading-tight font-semibold text-[#161C2C]">
            Let&apos;s set up{" "}
            <span className="underline decoration-dotted decoration-2 underline-offset-4">
              My Store
            </span>
          </p>
        </section>


        {/* SETUP CARDS */}
        <section className="mx-auto mt-20 grid max-w-[1100px] grid-cols-1 gap-6 lg:grid-cols-2">

          {/* ADD SOMETHING TO SELL */}
          <div className="flex flex-col rounded-2xl border border-[#E3E7ED] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#161C2C]">
              Add something to sell
            </h2>

            <p className="mt-1 text-sm text-[#53627E]">
              A title, a price, and a photo is enough to start selling. Add detail later.
            </p>

            {/* Illustration */}
            <div className="relative my-6 flex h-[220px] items-center justify-center">
              <div className="absolute left-[8%] top-8 flex h-[150px] w-[140px] -rotate-6 items-center justify-center rounded-xl bg-[#EEF1F6]">
                <svg {...lineIcon} className="h-16 w-16 text-[#53627E]">
                  <path d="M20.4 6.6 16 4a4 4 0 0 1-8 0L3.6 6.6a1 1 0 0 0-.4 1.3l1.3 2.6a1 1 0 0 0 1.2.5L7 10.5V20a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-9.5l1.3.5a1 1 0 0 0 1.2-.5l1.3-2.6a1 1 0 0 0-.4-1.3Z" />
                </svg>
              </div>

              <div className="absolute right-[8%] top-8 flex h-[150px] w-[140px] rotate-6 items-center justify-center rounded-xl bg-[#E6EBF2]">
                <svg {...lineIcon} className="h-16 w-16 text-[#53627E]">
                  <path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7Z" />
                  <path d="M3.3 7 12 12l8.7-5" />
                  <path d="M12 22V12" />
                </svg>
              </div>

              <div className="relative z-10 flex h-[170px] w-[170px] items-center justify-center rounded-xl bg-white shadow-md">
                <div className="flex h-[150px] w-[150px] items-center justify-center rounded-lg border-2 border-dashed border-[#D8DFE8] text-[#161C2C]">
                  <svg {...lineIcon} className="h-6 w-6">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="mt-auto">
              <button
                type="button"
                className="rounded-full border border-[#D8DFE8] px-4 py-2 text-sm font-medium text-[#161C2C] hover:border-[#161C2C] transition"
              >
                Add product
              </button>
            </div>
          </div>


          {/* CHOOSE YOUR STORE DESIGN */}
          <div className="flex flex-col rounded-2xl border border-[#E3E7ED] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#161C2C]">
              Choose your store design
            </h2>

            <p className="mt-1 text-sm text-[#53627E]">
              Start with a free theme. You can refine it once you&apos;re selling.
            </p>

            {/* Illustration */}
            <div className="relative my-6 flex h-[220px] items-center justify-center">
              <div className="absolute left-[8%] top-8 h-[150px] w-[140px] -rotate-6 overflow-hidden rounded-xl border border-[#E3E7ED] bg-white shadow-sm">
                <div className="h-[90px] bg-gradient-to-br from-[#C9D3E1] to-[#8C9AB3]" />
                <div className="space-y-2 p-3">
                  <div className="h-2 w-3/4 rounded-full bg-[#E6EBF2]" />
                  <div className="h-2 w-1/2 rounded-full bg-[#E6EBF2]" />
                </div>
              </div>

              <div className="absolute right-[8%] top-8 h-[150px] w-[140px] rotate-6 overflow-hidden rounded-xl border border-[#E3E7ED] bg-white shadow-sm">
                <div className="flex h-[70px] items-end bg-[#161C2C] p-3">
                  <span className="text-2xl font-black tracking-wider text-white">
                    STORE
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 p-3">
                  <div className="h-10 rounded-md bg-[#EEF1F6]" />
                  <div className="h-10 rounded-md bg-[#EEF1F6]" />
                </div>
              </div>

              <div className="relative z-10 flex h-[170px] w-[190px] items-center justify-between rounded-xl bg-white px-4 shadow-md">
                <div className="flex flex-col gap-2">
                  <span className="h-4 w-4 rounded bg-[#161C2C]" />
                  <span className="h-4 w-4 rounded bg-[#53627E]" />
                  <span className="h-4 w-4 rounded bg-[#D8DFE8]" />
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#161C2C] text-2xl font-medium text-white">
                  Aa
                </div>
              </div>
            </div>

            <div className="mt-auto">
              <Link
                to="/admin/online-store"
                className="inline-block rounded-full border border-[#D8DFE8] px-4 py-2 text-sm font-medium text-[#161C2C] hover:border-[#161C2C] transition"
              >
                Choose theme
              </Link>
            </div>
          </div>

        </section>

      </main>

      </div>

    </div>
  );
}
