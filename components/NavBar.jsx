"use client";
import Link from "next/link";

import React, { useState } from "react";

export default function NavBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const navLinks = [
    { name: "Features", href: "#features" },
    { name: "Themes", href: "#themes" },
    { name: "Pricing", href: "#pricing" },
    { name: "Resources", href: "#resources" },
    { name: "Blog", href: "#blog" },
  ];

  return (
    <header className="w-full sticky top-0 z-50 bg-white shadow-xs">
      {/* 1. ANNOUNCEMENT BAR */}
      <div 
        className="w-full bg-charcoal-navy text-white text-xs sm:text-sm py-2 px-4 flex items-center justify-between transition-all"
      >
        <div className="hidden sm:block sm:w-28"></div>
        
        <div className="flex-1 flex items-center justify-center gap-2 text-center text-gray-200">
          <span className="inline-flex items-center justify-center text-amber-400 text-sm">
            🚀
          </span>
          <span className="font-normal tracking-wide text-xs sm:text-sm">
            Start your online store for free &mdash; No credit card required.
          </span>
        </div>

        <div className="hidden sm:flex items-center justify-end sm:w-28 text-right">
          <span className="text-[11px] text-gray-400 font-light whitespace-nowrap">
            Limited time offer
          </span>
        </div>
      </div>

      {/* 2. MAIN NAVBAR */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 border-b border-gray-100">
          
          {/* Left: Brand Logo & Desktop Nav Links */}
          <div className="flex items-center gap-8 lg:gap-12">
            <a href="#" className="flex items-center gap-1 group">
              <span className="text-xl sm:text-2xl font-black tracking-wider text-slate-900 uppercase">
                STORE
              </span>
            </a>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-6 lg:space-x-8">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors duration-150"
                >
                  {link.name}
                </a>
              ))}
            </nav>
          </div>

          {/* Right: Search, Login & Create Store Button */}
          <div className="hidden md:flex items-center space-x-5">
            {/* Search Toggle / Input */}
            <div className="relative flex items-center">
              {searchOpen ? (
                <div className="flex items-center bg-gray-100 rounded-full px-3 py-1 text-sm border border-gray-200 focus-within:border-blue-500 focus-within:bg-white transition-all">
                  <svg
                    className="w-4 h-4 text-gray-500 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-slate-800 placeholder-gray-400 w-32 lg:w-44 text-xs"
                    autoFocus
                  />
                  <button
                    onClick={() => setSearchOpen(false)}
                    className="text-gray-400 hover:text-gray-600 ml-1 text-xs"
                  >
                    &#x2715;
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-full transition-colors"
                  aria-label="Search"
                  title="Search"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Login Link */}
<Link
  href="/auth/signin"
  className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors px-2 py-1"
>
  Login
</Link>

            {/* Create Store CTA Button */}
            <a
              href="#create-store"
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm hover:shadow transition-all duration-150 inline-flex items-center justify-center whitespace-nowrap"
            >
              Create Store
            </a>
          </div>

          {/* Mobile Right Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-md"
              aria-label="Toggle search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar Expansion */}
        {searchOpen && (
          <div className="md:hidden py-2 px-1 pb-3 border-b border-gray-100">
            <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2 text-sm border border-gray-200">
              <svg className="w-4 h-4 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-slate-800 placeholder-gray-400 w-full text-xs"
              />
            </div>
          </div>
        )}

        {/* Mobile Collapsible Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-b border-gray-200 space-y-3 bg-white">
            <div className="flex flex-col space-y-2 px-2">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-colors"
                >
                  {link.name}
                </a>
              ))}
            </div>

            <div className="pt-3 border-t border-gray-100 flex flex-col space-y-2 px-2">
              <a
                href="#login"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-colors"
              >
                Login
              </a>
              <a
                href="#create-store"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg text-center shadow-sm transition-colors"
              >
                Create Store
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
