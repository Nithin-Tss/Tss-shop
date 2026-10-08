"use client";

import { useState } from "react";
import Link from "next/link";

import AdminSidebar from "../../../components/AdminSidebar";

const categories = [
  "All",
  "Beauty",
  "Fashion",
  "Electronics",
  "Home & Living",
  "Food & Beverage",
  "Health & Wellness",
  "Sports",
  "Manufacturing",
];



export default function OnlineStorePage() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  return (
    <div className="min-h-screen bg-white text-[#161C2C]">

      {/* HEADER */}
      <header className="h-[72px] border-b border-gray-200 flex items-center justify-between px-7">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#161C2C] flex items-center justify-center">
            <span className="text-white text-2xl font-bold">S</span>
          </div>

          <span className="text-[22px] font-bold">
            Store
          </span>
        </div>

        {/* Search */}
        <div className="hidden md:flex items-center w-[420px] h-11 rounded-full bg-[#F3F6FA] px-5 gap-3">
          <span className="text-xl">⌕</span>

          <input
            type="text"
            placeholder="Search anything..."
            className="w-full bg-transparent outline-none text-sm text-[#161C2C] placeholder:text-slate-500"
          />
        </div>

        {/* Right */}
        <div className="flex items-center gap-6">

          <button className="relative text-2xl">
            ♧
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#161C2C] text-white flex items-center justify-center font-medium">
              A
            </div>

            <span className="text-sm font-medium">
              Admin
            </span>

            <span>⌄</span>
          </div>

        </div>
      </header>


      {/* BODY */}
      <div className="flex min-h-[calc(100vh-72px)]">

        {/* SIDEBAR */}
        <AdminSidebar />


        {/* MAIN CONTENT */}
        <main className="flex-1 px-8 lg:px-9 py-8 overflow-hidden">

          {/* TITLE */}
          <div className="flex justify-between items-start">

            <div>

              <h1 className="text-[36px] leading-tight font-bold text-[#161C2C]">
                Create your custom theme
              </h1>

              <p className="mt-2 text-[16px] text-[#53627E]">
                Choose a template to get started. You can customize it later
                with your brand, products and style.
              </p>

            </div>


            <div className="flex items-center gap-3 mt-4">

            {/* CODE EDITOR BUTTON */}
            <Link
              href="/editor-demo"
              className="
                px-7 py-3
                rounded-xl
                bg-[#161C2C]
                text-white
                font-medium
                flex items-center gap-3
                hover:bg-[#252E45]
                transition
              "
            >
              <span className="text-xl">
                {"</>"}
              </span>

              Code Editor
            </Link>

            {/* TOP BACK BUTTON */}
            <button
              className="
                px-7 py-3
                rounded-xl
                border border-[#161C2C]
                text-[#161C2C]
                font-medium
                flex items-center gap-3
                hover:bg-[#161C2C]
                hover:text-white
                transition
              "
            >
              <span className="text-xl">
                ←
              </span>

              Back
            </button>

            </div>

          </div>


          {/* CATEGORIES */}
          <div className="flex flex-wrap gap-3 mt-7">

            {categories.map((category) => {

              const active = selectedCategory === category;

              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`
                    px-5 py-2.5
                    rounded-full
                    text-sm
                    font-medium
                    transition
                    ${
                      active
                        ? "bg-[#161C2C] text-white"
                        : "border border-[#D8DFE8] bg-white text-[#53627E] hover:border-[#161C2C] hover:text-[#161C2C]"
                    }
                  `}
                >
                  {category}
                </button>
              );
            })}

          </div>


          {/* EMPTY STORE */}
          <section className="relative min-h-[600px] flex flex-col items-center justify-center">

            {/* Illustration */}
            <div className="relative mb-7">

              <div className="w-[350px] h-[240px] rounded-[48%] bg-[#F1F4F9] flex items-center justify-center">

                {/* Browser */}
                <div className="w-[245px] h-[180px] bg-white rounded-xl shadow-lg overflow-hidden border border-[#E5E9EF]">

                  {/* Browser bar */}
                  <div className="h-7 bg-[#161C2C] flex items-center gap-1.5 px-3">
                    <span className="w-2 h-2 rounded-full bg-white" />
                    <span className="w-2 h-2 rounded-full bg-white" />
                    <span className="w-2 h-2 rounded-full bg-white" />
                  </div>


                  {/* Browser content */}
                  <div className="p-5">

                    <div className="flex gap-4">

                      <div className="w-[85px] h-[65px] rounded-lg bg-[#E9EEF5] flex items-center justify-center">
                        <span className="text-3xl text-[#53627E]">
                          ◇
                        </span>
                      </div>

                      <div className="flex-1">

                        <div className="h-3 rounded-full bg-[#E6EBF2] mb-3" />

                        <div className="h-3 w-4/5 rounded-full bg-[#E6EBF2] mb-5" />

                        <span className="text-2xl">
                          🛒
                        </span>

                      </div>

                    </div>


                    <div className="flex gap-3 mt-6">
                      <div className="h-2 w-14 rounded-full bg-[#E6EBF2]" />
                      <div className="h-2 w-16 rounded-full bg-[#E6EBF2]" />
                      <div className="h-2 w-10 rounded-full bg-[#E6EBF2]" />
                    </div>

                  </div>

                </div>


                {/* Shopping bag */}
                <div className="absolute right-[48px] bottom-[15px] w-[65px] h-[70px] bg-[#161C2C] rounded-xl flex items-center justify-center shadow-lg">

                  <span className="text-white text-4xl font-bold">
                    S
                  </span>

                  <div className="absolute -top-5 w-8 h-7 border-[5px] border-[#161C2C] border-b-0 rounded-t-full" />

                </div>

              </div>


              {/* Stars */}
              <span className="absolute -left-10 top-20 text-3xl text-[#53627E]">
                ✧
              </span>

              <span className="absolute -right-10 top-32 text-3xl text-[#53627E]">
                ✧
              </span>

              <span className="absolute right-10 -top-7 text-2xl text-[#53627E]">
                ✧
              </span>

            </div>


            {/* STORE */}
            <h2 className="text-[48px] leading-none font-bold text-[#161C2C]">
              Store
            </h2>


            {/* DESCRIPTION */}
            <p className="mt-5 text-[19px] leading-7 text-[#53627E] text-center">
              In future, we will add some photos
              <br />
              here for you to choose from.
            </p>


            {/* COMING SOON */}
            <div className="mt-8 px-7 py-3 rounded-full bg-[#EEF1F6] text-[#161C2C] font-medium flex items-center gap-3">
              <span className="text-xl">
                ◷
              </span>

              Coming Soon
            </div>

          </section>


          {/* BOTTOM BUTTONS */}
          <div className="border-t border-[#E7EBF0] pt-5 flex justify-end gap-4">

            <button
              className="
                px-7 py-3
                rounded-xl
                border border-[#161C2C]
                text-[#161C2C]
                font-medium
                hover:bg-[#F3F5F8]
                transition
              "
            >
              Back
            </button>


            <button
              className="
                px-7 py-3
                rounded-xl
                bg-[#161C2C]
                text-white
                font-medium
                hover:bg-[#252E45]
                transition
              "
            >
              Continue →
            </button>

          </div>

        </main>

      </div>

    </div>
  );
}