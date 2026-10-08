const stores = [
  {
    name: "Beauty",
    category: "Beauty & Cosmetics",
    image: "/store-builder/beauty.jpg",
  },
  {
    name: "Fashion",
    category: "Fashion & Clothing",
    image: "/store-builder/fashion.jpg",
  },
  {
    name: "Electronics",
    category: "Electronics",
    image: "/store-builder/electronics.jpg",
  },
  {
    name: "Manufacturing",
    category: "Manufacturing",
    image: "/store-builder/manufacturing.jpg",
  },
  {
    name: "Grocery",
    category: "Grocery & Food",
    image: "/store-builder/grocery.jpg",
  },
];

export default function StoreBuilder() {
  return (
    <section className="w-full bg-neutral-50 py-12">
      <div className="mx-auto max-w-7xl px-6">

        <div className="mb-8 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Store Builder
          </p>

          <h2 className="text-3xl font-bold text-neutral-900 md:text-4xl">
            Build any store you imagine.
          </h2>

          <p className="mt-2 text-sm text-neutral-500">
            One platform for every kind of business.
          </p>
        </div>

        <div className="flex gap-5 overflow-x-auto pb-4">
          {stores.map((store) => (
            <div
              key={store.name}
              className="w-[230px] min-w-[230px] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
            >
              <div className="h-[140px] overflow-hidden bg-neutral-200">
                <img
                  src={store.image}
                  alt={store.name}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-neutral-900">
                  {store.name}
                </h3>

                <p className="mt-1 text-xs text-neutral-500">
                  {store.category}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}