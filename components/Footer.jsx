export default function Footer() {
  return (
    <footer className="bg-[#1C1A17] text-[#F5F5F3]">
      {/* Main Footer */}
      <div className="ml-auto grid w-full max-w-5xl grid-cols-2 items-start justify-items-start gap-x-8 gap-y-8 px-4 py-16 lg:grid-cols-4"> 

        <div>
          <h3 className="mb-5 text-sm font-semibold uppercase tracking-wider text-[#D98324]">
            Store
          </h3>
    
          <div className="flex flex-col gap-3">
            <a href="#" className="text-sm text-gray-300 hover:text-[#D98324]">What is Store</a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#D98324]">Store Editions</a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#D98324]">Careers</a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#D98324]">Investors</a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#D98324]">Newsroom</a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#D98324]">Sustainability</a>
          </div>
        </div>

        <div>
          <h3 className="mb-5 text-sm font-semibold uppercase tracking-wider text-[#D98324]">
            Ecosystem
          </h3>

          <div className="flex flex-col gap-3">
            <a href="#" className="text-sm text-gray-300 hover:text-[#D98324]">Developer Docs</a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#D98324]">Theme Store</a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#D98324]">App Store</a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#D98324]">Partners</a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#D98324]">Affiliates</a>
            
          </div>
        </div>

        <div>
          <h3 className="mb-5 text-sm font-semibold uppercase tracking-wider text-[#D98324]">
            Resources
          </h3>

          <div className="flex flex-col gap-3">
            <a href="#" className="text-sm text-gray-300 hover:text-[#D98324]">Blog</a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#D98324]">Compare Shopify</a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#D98324]">Guides</a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#D98324]">Free Tools</a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#D98324]">Changelog</a>
            
          </div>
        </div>

        <div>
          <h3 className="mb-5 text-sm font-semibold uppercase tracking-wider text-[#D98324]">
            Support
          </h3>

          <div className="flex flex-col gap-3">
            <a href="#" className="text-sm text-gray-300 hover:text-[#D98324]">Store Help Center</a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#D98324]">Community Forum</a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#D98324]">Hire a Partner</a>
            <a href="#" className="text-sm text-gray-300 hover:text-[#D98324]">Service Status</a>
          </div>
        </div>

      </div>

      <div className="mx-auto max-w-7xl border-t border-white/10"></div>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-gray-400">
          <span>🌐 Australia</span>
          <span>English</span>
          <a href="#" className="hover:text-[#D98324]">Terms & Conditions</a>
          <a href="#" className="hover:text-[#D98324]">Privacy Policy</a>
          <a href="#" className="hover:text-[#D98324]">Sitemap</a>
          <a href="#" className="hover:text-[#D98324]">Responsible Service</a>
        </div>

        <div className="flex items-center gap-3">
          <a href="#" aria-label="Facebook" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 hover:border-[#D98324] hover:text-[#D98324]">f</a>
          <a href="#" aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 hover:border-[#D98324] hover:text-[#D98324]">◎</a>
          <a href="#" aria-label="YouTube" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 hover:border-[#D98324] hover:text-[#D98324]">▶</a>
          <a href="#" aria-label="TikTok" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 hover:border-[#D98324] hover:text-[#D98324]">♪</a>
          <a href="#" aria-label="LinkedIn" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 hover:border-[#D98324] hover:text-[#D98324]">in</a>
        </div>

      </div>
    </footer>
  );
}