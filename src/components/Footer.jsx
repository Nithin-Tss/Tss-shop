export default function Footer() {
  return (
    <footer className="bg-[#1C1A17] text-[#F5F5F3]">
      {/* Main Footer */}
      <div className="ml-auto grid w-full max-w-5xl grid-cols-2 items-start justify-items-start gap-x-8 gap-y-8 px-4 py-16 lg:grid-cols-4">
        <div>
          <h3 className="mb-5 text-sm font-semibold uppercase tracking-wider text-[#7C3AED]">
            Store
          </h3>

          <div className="flex flex-col gap-3">
            <a href="#" className="text-sm text-gray-300 hover:text-[#7C3AED]">
              What is Store
            </a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#7C3AED]">
              Store Editions
            </a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#7C3AED]">
              Careers
            </a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#7C3AED]">
              Investors
            </a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#7C3AED]">
              Newsroom
            </a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#7C3AED]">
              Sustainability
            </a>
          </div>
        </div>

        <div>
          <h3 className="mb-5 text-sm font-semibold uppercase tracking-wider text-[#7C3AED]">
            Ecosystem
          </h3>

          <div className="flex flex-col gap-3">
            <a href="#" className="text-sm text-gray-300 hover:text-[#7C3AED]">
              Developer Docs
            </a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#7C3AED]">
              Theme Store
            </a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#7C3AED]">
              App Store
            </a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#7C3AED]">
              Partners
            </a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#7C3AED]">
              Affiliates
            </a>
          </div>
        </div>

        <div>
          <h3 className="mb-5 text-sm font-semibold uppercase tracking-wider text-[#7C3AED]">
            Resources
          </h3>

          <div className="flex flex-col gap-3">
            <a href="/blog" className="text-sm text-gray-300 hover:text-[#7C3AED]">
              Blog
            </a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#7C3AED]">
              Compare Shopify
            </a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#7C3AED]">
              Guides
            </a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#7C3AED]">
              Free Tools
            </a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#7C3AED]">
              Changelog
            </a>
          </div>
        </div>

        <div>
          <h3 className="mb-5 text-sm font-semibold uppercase tracking-wider text-[#7C3AED]">
            Support
          </h3>

          <div className="flex flex-col gap-3">
            <a href="/contact" className="text-sm text-gray-300 hover:text-[#7C3AED]">
              Store Help Center
            </a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#7C3AED]">
              Community Forum
            </a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#7C3AED]">
              Hire a Partner
            </a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#7C3AED]">
              Service Status
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl border-t border-white/10"></div>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-gray-400">
          <span>🌐 Australia</span>
          <span>English</span>
          <a href="/terms" className="hover:text-[#7C3AED]">
            Terms & Conditions
          </a>

          <a href="/privacy" className="hover:text-[#7C3AED]">
            Privacy Policy
          </a>
          <a href="#" className="hover:text-[#7C3AED]">
            Sitemap
          </a>
          <a href="#" className="hover:text-[#7C3AED]">
            Responsible Service
          </a>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="#"
            aria-label="Facebook"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 hover:border-[#7C3AED] hover:text-[#7C3AED]"
          >
            f
          </a>
          <a
            href="#"
            aria-label="Instagram"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 hover:border-[#7C3AED] hover:text-[#7C3AED]"
          >
            ◎
          </a>
          <a
            href="#"
            aria-label="YouTube"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 hover:border-[#7C3AED] hover:text-[#7C3AED]"
          >
            ▶
          </a>
          <a
            href="#"
            aria-label="TikTok"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 hover:border-[#7C3AED] hover:text-[#7C3AED]"
          >
            ♪
          </a>
          <a
            href="#"
            aria-label="LinkedIn"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 hover:border-[#7C3AED] hover:text-[#7C3AED]"
          >
            in
          </a>
        </div>
      </div>
    </footer>
  );
}
