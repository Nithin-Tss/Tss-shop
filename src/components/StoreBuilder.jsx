const stores = [
  {
    name: "Beauty",
    category: "Beauty & Cosmetics",
    tone: "bg-[rgba(234,88,12,0.25)]",
    note: "Shade finders, subscriptions",
  },
  {
    name: "Fashion",
    category: "Fashion & Clothing",
    tone: "bg-[rgba(24,24,27,0.22)]",
    note: "Size grids, drops, lookbooks",
  },
  {
    name: "Electronics",
    category: "Electronics",
    tone: "bg-[rgba(24,24,27,0.22)]",
    note: "Spec tables, bundles",
  },
  {
    name: "Manufacturing",
    category: "Manufacturing",
    tone: "bg-[rgba(234,88,12,0.25)]",
    note: "Wholesale tiers, quotes",
  },
  {
    name: "Grocery",
    category: "Grocery & Food",
    tone: "bg-[rgba(24,24,27,0.22)]",
    note: "Weight pricing, delivery slots",
  },
];

export default function StoreBuilder() {
  return (
    <section id="features" className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-12">
          <h2 className="display text-5xl text-ink lg:col-span-6 lg:text-6xl">
            Built for the shop you actually run.
          </h2>
          <p className="max-w-sm self-end text-slate-600 lg:col-span-5 lg:col-start-8">
            Start from a theme made for your trade, then change anything: sections, fields, even the
            template code.
          </p>
        </div>

        <div className="mt-16 grid gap-px overflow-hidden rounded-xl bg-slate-200 sm:grid-cols-2 lg:grid-cols-6">
          {stores.map((s, i) => (
            <div
              key={s.name}
              className={`${s.tone} flex min-h-64 flex-col justify-between p-7 ${
                i === 0
                  ? "lg:col-span-3 lg:min-h-80"
                  : i === 1
                    ? "lg:col-span-3 lg:min-h-80"
                    : "lg:col-span-2"
              }`}
            >
              <span className="text-xs tabular-nums text-ink/75">0{i + 1}</span>
              <div>
                <h3 className="display text-4xl text-ink">{s.name}</h3>
                <p className="mt-2 text-sm text-ink/80">{s.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
