import { useState } from "react";

const settingsMenu = [
  { icon: "⌂", label: "General" },
  { icon: "▣", label: "Plan" },
  { icon: "$", label: "Billing" },
  { icon: "♙", label: "Users" },
  { icon: "◇", label: "Roles", nested: true },
  { icon: "▱", label: "Payments" },
  { icon: "▾", label: "Checkout" },
  { icon: "●", label: "Customer accounts" },
  { icon: "▱", label: "Shipping and delivery" },
  { icon: "♙", label: "Taxes and duties" },
  { icon: "●", label: "Locations" },
  { icon: "◉", label: "Markets" },
  { icon: "▦", label: "Apps" },
  { icon: "✣", label: "Sales channels" },
  { icon: "▤", label: "Domains" },
  { icon: "✣", label: "Customer events" },
];

const userTabs = [
  "All",
  "Active",
  "Pending",
  "POS app-only",
  "Requests",
];

export default function AdminSettings() {
  const [selectedSection, setSelectedSection] = useState("Users");
  const [settingsSearch, setSettingsSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");

  const filteredSettings = settingsMenu.filter((item) =>
    item.label.toLowerCase().includes(settingsSearch.toLowerCase())
  );

  const handleMenuClick = (label) => {
    setSelectedSection(label);
  };

  const handleAddUser = () => {
    alert("Add User clicked");
  };

  const handleImport = () => {
    alert("Import clicked");
  };

  const handleLearnMore = () => {
    alert("Learn more clicked");
  };

  const handleSearch = () => {
    alert("Search clicked");
  };

  const handleFilter = () => {
    alert("Filter clicked");
  };

  const handleSort = () => {
    alert("Sort clicked");
  };

  return (
    <div className="min-h-screen bg-[#f1f1f1] text-[#161c2c]">

      {/* =====================================================
          TOP HEADER
      ===================================================== */}
      <header className="flex h-16 items-center justify-between bg-[#0b0b0b] px-5 text-white">

        {/* Search */}
        <div className="mx-auto flex h-11 w-[45%] items-center rounded-xl bg-[#292929] px-4">

          <span className="mr-3 text-lg text-slate-300">
            ⌕
          </span>

          <input
            type="text"
            placeholder="Search"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-300"
          />

          <div className="ml-3 flex items-center gap-1 text-xs text-slate-400">

            <span className="rounded bg-[#3a3a3a] px-2 py-1">
              CTRL
            </span>

            <span className="rounded bg-[#3a3a3a] px-2 py-1">
              K
            </span>

          </div>

        </div>


        {/* Right header */}
        <div className="flex items-center gap-4">

          <button
            type="button"
            className="text-lg hover:text-slate-300"
            onClick={() => alert("Notifications clicked")}
          >
            ◉
          </button>

          <button
            type="button"
            className="text-lg hover:text-slate-300"
            onClick={() => alert("Messages clicked")}
          >
            ♧
          </button>

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-fuchsia-600 text-xs font-semibold"
            onClick={() => alert("Store profile clicked")}
          >
            SIP
          </button>

          <button
            type="button"
            className="text-sm font-semibold hover:text-slate-300"
            onClick={() => alert("Store clicked")}
          >
            SIPNOW
          </button>

        </div>

      </header>


      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}
      <div className="mx-auto flex max-w-[1500px] gap-7 px-6 py-7">

        {/* =================================================
            SETTINGS SIDEBAR
        ================================================= */}
        <aside className="w-[350px] shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">

          {/* Store */}
          <button
            type="button"
            onClick={() => setSelectedSection("General")}
            className="w-full border-b border-slate-200 p-5 text-left hover:bg-slate-50"
          >

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fuchsia-600 text-xs font-semibold text-white">
                SIP
              </div>

              <div>

                <h2 className="text-base font-semibold">
                  SIPNOW
                </h2>

                <p className="text-sm text-slate-500">
                  Store settings
                </p>

              </div>

            </div>

          </button>


          {/* Search settings */}
          <div className="p-4">

            <div className="flex h-10 items-center rounded-lg border border-slate-300 px-3">

              <span className="mr-2 text-lg text-slate-500">
                ⌕
              </span>

              <input
                type="text"
                value={settingsSearch}
                onChange={(e) => setSettingsSearch(e.target.value)}
                placeholder="Search"
                className="w-full bg-transparent text-sm outline-none"
              />

            </div>

          </div>


          {/* Settings menu */}
          <nav className="px-3 pb-5">

            {filteredSettings.map((item) => (

              <button
                key={item.label}
                type="button"
                onClick={() => handleMenuClick(item.label)}
                className={`mb-1 flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition
                  ${
                    selectedSection === item.label
                      ? "bg-[#f0f0f0] font-semibold text-[#161c2c]"
                      : "text-slate-700 hover:bg-slate-50"
                  }
                  ${item.nested ? "pl-10" : ""}
                `}
              >

                <span className="w-5 text-center text-base">
                  {item.icon}
                </span>

                <span>
                  {item.label}
                </span>

              </button>

            ))}

          </nav>

        </aside>


        {/* =================================================
            MAIN CONTENT
        ================================================= */}
        <main className="min-w-0 flex-1">


          {/* =================================================
              SECTION HEADER
          ================================================= */}
          <div className="mb-5 flex items-center justify-between">

            <div className="flex items-center gap-3">

              <span className="text-xl">
                {settingsMenu.find(
                  (item) => item.label === selectedSection
                )?.icon || "⚙"}
              </span>

              <h1 className="text-xl font-semibold">
                {selectedSection}
              </h1>

            </div>


            {/* Header buttons */}
            <div className="flex items-center gap-2">

              <button
                type="button"
                onClick={handleImport}
                className="rounded-lg bg-white px-5 py-2 text-sm font-medium shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
              >
                Import
              </button>

              <button
                type="button"
                onClick={handleAddUser}
                className="rounded-lg bg-[#161c2c] px-5 py-2 text-sm font-semibold text-white hover:bg-[#252e45]"
              >
                Add user
              </button>

            </div>

          </div>


          {/* =================================================
              SETTINGS SECTION CONTENT
          ================================================= */}

          {selectedSection === "Users" ? (

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              {/* Tabs */}
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">

                <div className="flex items-center gap-1">

                  {userTabs.map((tab) => (

                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`rounded-lg px-4 py-2 text-sm transition ${
                        activeTab === tab
                          ? "bg-[#f0f0f0] font-medium"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {tab}
                    </button>

                  ))}

                </div>


                {/* Controls */}
                <div className="flex items-center gap-2">

                  <button
                    type="button"
                    onClick={handleSearch}
                    className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 hover:bg-slate-50"
                  >
                    <span>
                      ⌕
                    </span>

                    <span>
                      ☰
                    </span>
                  </button>


                  <button
                    type="button"
                    onClick={handleSort}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50"
                  >
                    ↕
                  </button>

                </div>

              </div>


              {/* Table heading */}
              <div className="grid grid-cols-[55px_1fr_200px_1fr] border-b border-slate-200 bg-[#fafafa] px-4 py-3 text-sm font-medium text-slate-600">

                <div>
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                  />
                </div>

                <div>
                  User
                </div>

                <div>
                  Status
                </div>

                <div>
                  Role
                </div>

              </div>


              {/* User search */}
              <div className="border-b border-slate-200 px-4 py-3">

                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                />

              </div>


              {/* Empty state */}
              <div className="flex min-h-[360px] items-center justify-center">

                <div className="max-w-md px-6 text-center">

                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">

                    <span className="text-2xl text-slate-500">
                      ♙
                    </span>

                  </div>


                  <h3 className="mt-5 text-lg font-semibold">
                    No users yet
                  </h3>


                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    There are currently no users in your store.
                    Add users when you are ready to give team
                    members access.
                  </p>


                  <button
                    type="button"
                    onClick={handleAddUser}
                    className="mt-5 rounded-lg bg-[#161c2c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#252e45]"
                  >
                    Add user
                  </button>

                </div>

              </div>

            </section>

          ) : (

            /* =================================================
               OTHER SETTINGS SECTIONS
            ================================================= */
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="flex min-h-[500px] items-center justify-center px-6">

                <div className="max-w-lg text-center">

                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">

                    <span className="text-2xl text-slate-500">
                      {
                        settingsMenu.find(
                          (item) =>
                            item.label === selectedSection
                        )?.icon
                      }
                    </span>

                  </div>


                  <h2 className="mt-5 text-xl font-semibold">
                    {selectedSection}
                  </h2>


                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    No {selectedSection.toLowerCase()} data is
                    available yet. This section is ready for
                    configuration when the backend data is
                    available.
                  </p>


                  <button
                    type="button"
                    onClick={() =>
                      alert(`${selectedSection} configuration clicked`)
                    }
                    className="mt-5 rounded-lg bg-[#161c2c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#252e45]"
                  >
                    Configure {selectedSection}
                  </button>

                </div>

              </div>

            </section>

          )}


          {/* Learn more */}
          <div className="pt-7 text-center">

            <button
              type="button"
              onClick={handleLearnMore}
              className="text-sm font-medium hover:underline"
            >
              Learn more about {selectedSection.toLowerCase()}
            </button>

          </div>

        </main>

      </div>

    </div>
  );
}