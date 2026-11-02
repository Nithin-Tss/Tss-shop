const columns = [
  {
    title: "Store",
    links: [
      ["What is Store", "#"],
      ["Editions", "#"],
      ["Careers", "#"],
      ["Newsroom", "#"],
      ["Sustainability", "#"],
    ],
  },
  {
    title: "Ecosystem",
    links: [
      ["Developer docs", "#"],
      ["Theme store", "#"],
      ["App store", "#"],
      ["Partners", "#"],
    ],
  },
  {
    title: "Resources",
    links: [
      ["Blog", "/blog"],
      ["Guides", "#"],
      ["Free tools", "#"],
      ["Changelog", "#"],
    ],
  },
  {
    title: "Support",
    links: [
      ["Help center", "/contact"],
      ["Community", "#"],
      ["Hire a partner", "#"],
      ["Service status", "#"],
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-ink text-slate-400">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid gap-12 border-t border-white/10 py-16 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="display text-3xl text-white">Store</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed">
              Commerce software for shops that would rather sell than configure.
            </p>
          </div>
          {columns.map((c) => (
            <div key={c.title} className="lg:col-span-2">
              <h3 className="text-sm font-medium text-white">{c.title}</h3>
              <ul className="mt-4 space-y-3 text-sm">
                {c.links.map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="hover:text-white">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {new Date().getFullYear()} Store. Australia, English.</span>
          <div className="flex gap-6">
            <a href="/terms" className="hover:text-white">
              Terms
            </a>
            <a href="/privacy" className="hover:text-white">
              Privacy
            </a>
            <a href="/sitemap.xml" className="hover:text-white">
              Sitemap
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
