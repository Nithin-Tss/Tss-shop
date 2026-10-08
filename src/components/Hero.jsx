import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-white pt-12 pb-16 lg:pt-20 lg:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Grid Layout for Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Text Content & CTA */}
          <div className="lg:col-span-6 text-left">
            <span className="inline-block text-xs font-semibold tracking-wider uppercase bg-gray-100 text-charcoal-navy px-3 py-1 rounded-full mb-4">
              All-In-One E-Commerce Platform
            </span>
            
            <h1 className="text-4xl sm:text-5xl font-extrabold text-charcoal-navy tracking-tight leading-tight">
              Create Your Online Store Without Limits
            </h1>
            
            <p className="mt-6 text-lg text-gray-600 leading-relaxed">
              Everything you need to start, manage, and grow your online store. Beautiful themes, powerful tools, and a simple experience — all in one place.
            </p>
            
            {/* CTA Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
              <Link 
                to="/signup" 
                className="w-full sm:w-auto bg-charcoal-navy text-white font-medium px-8 py-3.5 rounded-xl hover:bg-charcoal-navy/90 transition shadow-md flex items-center justify-center space-x-2"
              >
                <span>Start Free →</span>
              </Link>
              
              <a 
                href="#demo" 
                className="w-full sm:w-auto bg-white text-gray-700 border border-gray-200 font-medium px-6 py-3.5 rounded-xl hover:bg-gray-50 transition flex items-center justify-center space-x-2"
              >
                <span>▶ Watch Demo</span>
              </a>
            </div>

            {/* Trust Badges */}
            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <span className="text-green-500 font-bold">✓</span>
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500 font-bold">✓</span>
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500 font-bold">✓</span>
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Mockups (Laptop & Mobile) */}
          <div className="lg:col-span-6 relative flex justify-center items-center">
            
            {/* Laptop Mockup */}
            <div className="w-full bg-gray-900 rounded-2xl p-2 sm:p-3 shadow-2xl border border-gray-800">
              <div className="flex items-center justify-between mb-2 px-2">
                <div className="flex space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                </div>
                <div className="text-[10px] text-gray-400 bg-gray-800 px-3 py-0.5 rounded">store.store</div>
                <div className="w-8"></div>
              </div>

              <div className="bg-white rounded-lg overflow-hidden p-4 text-left">
                <div className="flex justify-between items-center border-b pb-2 mb-4 text-xs">
                  <span className="font-bold text-charcoal-navy">STORE</span>
                  <div className="flex space-x-3 text-gray-500">
                    <span>Home</span>
                    <span>Shop</span>
                    <span>Collections</span>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-pink-50 to-blue-50 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-600">FASHION & APPAREL</span>
                    <h3 className="text-lg font-black text-charcoal-navy">Summer Collection 2026</h3>
                    <p className="text-[10px] text-gray-500">Built with custom themes & instant checkout.</p>
                    <button className="mt-2 bg-charcoal-navy text-white text-[10px] px-3 py-1 rounded">Shop Apparel</button>
                  </div>
                  
                  {/* VIDEO PLAYER BOX */}
                  <div className="w-24 h-24 rounded-lg overflow-hidden shadow-md bg-black flex items-center justify-center relative flex-shrink-0">
                    <video 
                      autoPlay 
                      loop 
                      muted 
                      playsInline 
                      className="w-full h-full object-cover"
                    >
                      <source src="/my-store-video.mp4" type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>

                </div>
              </div>
            </div>

            {/* Mobile Phone Mockup Overlay */}
            <div className="absolute -right-4 -bottom-6 w-32 sm:w-36 bg-gray-900 rounded-2xl p-1.5 shadow-2xl border-4 border-gray-800 hidden sm:block">
              <div className="bg-white rounded-xl overflow-hidden p-2 text-left">
                <div className="text-[9px] font-bold text-charcoal-navy mb-1">STORE</div>
                <div className="bg-gray-50 p-2 rounded text-center">
                  <div className="text-[8px] font-bold text-charcoal-navy">Summer Collection 2026</div>
                  <div className="text-[7px] text-gray-400 mt-0.5">Mobile Ready</div>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}