import { Link } from "react-router-dom";

const posts = [
  {
    title: "How to Build a Successful Online Store",
    category: "E-commerce",
    date: "October 8, 2026",
    excerpt:
      "Learn the essential steps for creating an online store that is simple, professional, and ready to grow.",
  },
  {
    title: "Why Your Online Store Needs a Strong Brand",
    category: "Branding",
    date: "October 8, 2026",
    excerpt:
      "A strong brand helps your store stand out, build trust, and create a memorable experience for customers.",
  },
  {
    title: "Tips for Growing Your Online Business",
    category: "Business",
    date: "October 8, 2026",
    excerpt:
      "Explore practical strategies that can help you attract customers and grow your online business.",
  },
];

export default function Blog() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-[#071A2B] px-6 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#D98324]">
            TSS Shop Blog
          </p>

          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Ideas, insights & inspiration
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-300">
            Discover helpful insights, practical tips, and ideas to help you
            build and grow your online business.
          </p>
        </div>
      </section>

      {/* Blog posts */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#D98324]">
              Latest articles
            </p>

            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              From the TSS Shop team
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {posts.map((post) => (
              <article
                key={post.title}
                className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex h-48 items-center justify-center bg-[#071A2B]">
                  <span className="text-5xl font-bold text-white">TSS</span>
                </div>

                <div className="p-6">
                  <p className="text-sm font-semibold text-[#D98324]">
                    {post.category}
                  </p>

                  <h3 className="mt-3 text-xl font-bold leading-7 text-gray-900">
                    {post.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-gray-600">
                    {post.excerpt}
                  </p>

                  <div className="mt-6 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {post.date}
                    </span>

                    <Link
                      to="#"
                      className="text-sm font-semibold text-[#D98324] hover:underline"
                    >
                      Read more →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}