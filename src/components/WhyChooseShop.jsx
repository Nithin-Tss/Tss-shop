const points = [
  {
    title: "Assistant that edits, not just chats",
    body: "Ask it to restock a collection or rewrite a product page. It proposes the change; you approve it.",
  },
  {
    title: "Inventory you can trust",
    body: "Counts move with every order, return and transfer, with an audit trail behind each number.",
  },
  {
    title: "Reports without exporting",
    body: "Sales, customers and abandoned checkouts in one place, filterable down to a single product.",
  },
  {
    title: "Roles and keys",
    body: "Give staff exactly the access they need. Issue API keys that can be revoked in one click.",
  },
];

export default function WhyChooseShop() {
  return (
    <section className="bg-ink py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-16 px-6 lg:grid-cols-12 lg:px-10">
        <h2 className="display text-5xl text-white lg:col-span-5 lg:text-6xl">
          The unglamorous parts, done properly.
        </h2>

        <dl className="lg:col-span-6 lg:col-start-7">
          {points.map((p) => (
            <div
              key={p.title}
              className="border-t border-white/15 py-8 first:border-t-0 first:pt-0"
            >
              <dt className="text-lg font-medium text-orange-400">{p.title}</dt>
              <dd className="mt-2 max-w-md leading-relaxed text-white/75">{p.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
