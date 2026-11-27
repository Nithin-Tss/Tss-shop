/**
 * Structured static blog data source for the TSS platform marketing site (/blog).
 *
 * NOTE: This content is maintained as a structured static frontend collection
 * until a dedicated public platform CMS or API is deployed.
 *
 * Tenant-specific store blog APIs (/api/v1/themes/posts/) are intentionally
 * not used here as they require merchant authentication and store context.
 */

export const BLOG_CONTENT_SOURCE = "static";
export const IS_STATIC_CONTENT = true;

export const BLOG_POSTS = [
  {
    id: "how-to-build-a-successful-online-store",
    slug: "how-to-build-a-successful-online-store",
    handle: "how-to-build-a-successful-online-store",
    title: "How to Build a Successful Online Store",
    category: "E-commerce",
    date: "October 8, 2026",
    readTime: "5 min read",
    excerpt:
      "Learn the essential steps for creating an online store that is simple, professional, and ready to grow.",
    content: [
      {
        heading: "1. Define your niche and target audience",
        body: "Before launching your store, identify the exact customers you serve and the problems your products solve. Having a clear niche helps streamline your catalog, marketing messaging, and product presentation.",
      },
      {
        heading: "2. Optimize product presentation and navigation",
        body: "Shoppers make purchase decisions within seconds. High-resolution photos, concise product descriptions, transparent pricing, and simple navigation structures reduce friction and build buyer confidence.",
      },
      {
        heading: "3. Choose the right platform and streamlined checkout",
        body: "A reliable store platform guarantees speed, responsive design on mobile devices, and secure payments. Keeping checkout simple with guest checkout and transparent shipping terms drives higher conversion rates.",
      },
      {
        heading: "4. Establish customer trust and after-sales support",
        body: "Clear return policies, easily accessible contact information, and proactive shipping updates turn one-time shoppers into loyal, repeat customers.",
      },
    ],
  },
  {
    id: "why-your-online-store-needs-a-strong-brand",
    slug: "why-your-online-store-needs-a-strong-brand",
    handle: "why-your-online-store-needs-a-strong-brand",
    title: "Why Your Online Store Needs a Strong Brand",
    category: "Branding",
    date: "October 8, 2026",
    readTime: "4 min read",
    excerpt:
      "A strong brand helps your store stand out, build trust, and create a memorable experience for customers.",
    content: [
      {
        heading: "Creating an unmistakable identity",
        body: "In competitive e-commerce markets, products can be replicated, but a distinct brand cannot. Your brand voice, visual styling, typography, and core values differentiate you from generic marketplaces.",
      },
      {
        heading: "Building long-term customer trust",
        body: "Customers gravitate toward brands they recognize and trust. A cohesive visual appearance across your storefront, packaging, confirmation emails, and customer communications reinforces professionalism.",
      },
      {
        heading: "Driving organic loyalty and retention",
        body: "Strong brands create emotional connections with their audience. When customers feel aligned with your mission and brand promise, they become brand advocates who return organically without relying solely on paid ad spend.",
      },
    ],
  },
  {
    id: "tips-for-growing-your-online-business",
    slug: "tips-for-growing-your-online-business",
    handle: "tips-for-growing-your-online-business",
    title: "Tips for Growing Your Online Business",
    category: "Business",
    date: "October 8, 2026",
    readTime: "6 min read",
    excerpt:
      "Explore practical strategies that can help you attract customers and grow your online business.",
    content: [
      {
        heading: "Focus on customer lifetime value",
        body: "Acquiring new customers is often more expensive than retaining existing ones. Implement email follow-ups, loyalty rewards, and personalized product recommendations to maximize lifetime order value.",
      },
      {
        heading: "Leverage data-driven analytics",
        body: "Track which products drive the highest conversion rates, monitor cart abandonment rates, and analyze traffic sources. Making informed adjustments based on store analytics yields predictable growth.",
      },
      {
        heading: "Streamline operations and fulfillment",
        body: "As order volumes increase, manual order fulfillment and inventory tracking become bottlenecks. Automating order workflows, managing inventory thresholds, and integrating reliable carriers ensure consistent customer satisfaction.",
      },
    ],
  },
];

/**
 * Returns all structured blog posts.
 */
export function getBlogPosts() {
  return BLOG_POSTS;
}

/**
 * Looks up a blog post by its unique slug or handle.
 * @param {string} slug
 * @returns {object|null}
 */
export function getBlogPostBySlug(slug) {
  if (!slug) return null;
  const normalized = String(slug).trim().toLowerCase();
  return (
    BLOG_POSTS.find(
      (post) =>
        post.slug.toLowerCase() === normalized ||
        post.id.toLowerCase() === normalized ||
        post.handle.toLowerCase() === normalized
    ) || null
  );
}
