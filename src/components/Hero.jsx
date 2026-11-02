import { Link } from "react-router-dom";
import { ONBOARDING_PATH, STORES_PATH, useSession } from "@/lib/auth";

const orders = [
  { id: "#4821", name: "Amara Okafor", total: "$184.00", status: "Paid" },
  { id: "#4820", name: "Lucas Meyer", total: "$62.50", status: "Packed" },
  { id: "#4819", name: "Hana Sato", total: "$329.00", status: "Paid" },
  { id: "#4818", name: "Diego Ruiz", total: "$48.00", status: "Shipped" },
];

const bars = [38, 52, 44, 61, 57, 74, 68, 88, 79, 96];

export default function Hero() {
  const signedIn = Boolean(useSession()?.token);

  return (
    <section className="bg-slate-50">
      <div className="mx-auto grid max-w-7xl gap-16 px-6 pb-24 pt-16 lg:grid-cols-12 lg:gap-12 lg:px-10 lg:pb-32 lg:pt-28">
        <div className="lg:col-span-6 lg:pt-6">
          <h1 className="display text-[3.6rem] text-ink sm:text-[4.6rem] lg:text-[5.4rem]">
            A store that looks like <em className="italic text-violet-600">yours</em>, and runs
            itself.
          </h1>

          <p className="mt-8 max-w-md text-[1.1rem] leading-relaxed text-slate-600">
            Themes you can edit down to the code, inventory that stays honest, and a checkout your
            customers finish. One place for the whole business.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link
              to={signedIn ? STORES_PATH : ONBOARDING_PATH}
              className="rounded-md bg-ink px-6 py-3.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              {signedIn ? "Open your stores" : "Start free"}
            </Link>
            <a
              href="#features"
              className="text-sm font-medium text-ink underline decoration-slate-300 underline-offset-[6px] hover:decoration-ink"
            >
              See how it works
            </a>
          </div>

          <p className="mt-8 text-sm text-slate-500">
            14 days free. No card. Cancel from the dashboard.
          </p>
        </div>

        {/* Product surface: the real admin, simplified */}
        <div className="relative lg:col-span-6">
          <div className="rounded-xl bg-white p-6 shadow-lg ring-1 ring-ink/5 sm:p-8">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                  Sales, last 10 days
                </p>
                <p className="mt-2 text-4xl font-medium tracking-tight tabular-nums text-ink">
                  $18,240
                </p>
              </div>
              <p className="text-sm tabular-nums text-violet-600">+12.4%</p>
            </div>

            <div className="mt-8 flex h-32 items-end gap-2" aria-hidden="true">
              {bars.map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${h}%` }}
                  className={`flex-1 rounded-t-sm ${i === bars.length - 1 ? "bg-violet-600" : "bg-slate-200"}`}
                />
              ))}
            </div>

            <table className="mt-8 w-full text-left text-sm">
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-slate-100">
                    <td className="py-3 pr-3 text-slate-500">{o.id}</td>
                    <td className="py-3 pr-3 text-ink">{o.name}</td>
                    <td className="py-3 pr-3 text-slate-500">{o.status}</td>
                    <td className="py-3 text-right font-medium text-ink">{o.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
