import { useState, useEffect, useMemo } from "react";
import { apiGet } from "@/lib/api";

const DEFAULT_CHANNELS = [
  { id: "online-store", name: "Online Store" },
  { id: "point-of-sale", name: "Point of Sale" },
  { id: "shop", name: "Shop" },
];

export default function AssignMarketsModal({ isOpen, onClose, selectedMarkets = [], onConfirm }) {
  const [activeTab, setActiveTab] = useState("regions");
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState(() => new Set(selectedMarkets));
  const [channels, setChannels] = useState(DEFAULT_CHANNELS);

  // Load sales channels from API if available
  useEffect(() => {
    let cancelled = false;
    apiGet("/api/v1/catalog/sales-channels/").then((res) => {
      if (!cancelled && res.ok && Array.isArray(res.data) && res.data.length > 0) {
        setChannels(
          res.data.map((c) => ({
            id: c.id || c.name,
            name: c.name,
          }))
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Regions options: includes store's primary market "Melb" matching reference screenshot
  const regionsOptions = useMemo(() => [{ id: "Melb", name: "Melb" }], []);

  // B2B options: ready for future B2B companies/markets
  const b2bOptions = useMemo(() => [], []);

  // Get current tab options
  const currentOptions = useMemo(() => {
    if (activeTab === "regions") return regionsOptions;
    if (activeTab === "b2b") return b2bOptions;
    if (activeTab === "channels") return channels;
    return [];
  }, [activeTab, regionsOptions, b2bOptions, channels]);

  // Filter options by search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return currentOptions;
    const q = searchQuery.toLowerCase().trim();
    return currentOptions.filter((opt) => opt.name.toLowerCase().includes(q));
  }, [currentOptions, searchQuery]);

  const handleToggle = (name) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleDone = () => {
    onConfirm(Array.from(selected));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-markets-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-[560px] rounded-2xl bg-white shadow-2xl border border-[#E1E3E5] overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E1E3E5] bg-[#F6F6F7]">
          <h2 id="assign-markets-title" className="text-[15px] font-semibold text-[#1A1A1A]">
            Assign markets
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#5C5F62] hover:text-[#1A1A1A] text-lg font-bold p-1 rounded-md transition"
            aria-label="Close"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 flex-1 flex flex-col">
          {/* SEARCH INPUT */}
          <div className="relative mb-4">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5C5F62]">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-[#D2D5D8] pl-9 pr-3.5 py-2 text-sm text-[#1A1A1A] placeholder-[#5C5F62] focus:border-[#1A1A1A] focus:outline-none"
            />
          </div>

          {/* TABS: Regions, B2B, Channels */}
          <div className="flex items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab("regions")}
              className={`px-3.5 py-1.5 rounded-lg text-[13px] transition ${
                activeTab === "regions"
                  ? "bg-[#E4E5E7] text-[#1A1A1A] font-semibold"
                  : "text-[#5C5F62] hover:text-[#1A1A1A] font-medium"
              }`}
            >
              Regions
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("b2b")}
              className={`px-3.5 py-1.5 rounded-lg text-[13px] transition ${
                activeTab === "b2b"
                  ? "bg-[#E4E5E7] text-[#1A1A1A] font-semibold"
                  : "text-[#5C5F62] hover:text-[#1A1A1A] font-medium"
              }`}
            >
              B2B
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("channels")}
              className={`px-3.5 py-1.5 rounded-lg text-[13px] transition ${
                activeTab === "channels"
                  ? "bg-[#E4E5E7] text-[#1A1A1A] font-semibold"
                  : "text-[#5C5F62] hover:text-[#1A1A1A] font-medium"
              }`}
            >
              Channels
            </button>
          </div>

          {/* OPTIONS LIST */}
          <div className="flex-1 min-h-[160px] max-h-[260px] overflow-y-auto space-y-2 py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isChecked = selected.has(opt.name);
                return (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2.5 py-1.5 cursor-pointer select-none group"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggle(opt.name)}
                      className="h-4 w-4 rounded border-[#D2D5D8] text-[#1A1A1A] focus:ring-black cursor-pointer"
                    />
                    <span className="text-sm font-normal text-[#1A1A1A] group-hover:text-black">
                      {opt.name}
                    </span>
                  </label>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-[#8C9196]">
                {activeTab === "b2b" ? "No B2B markets available." : "No options found."}
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-[#E1E3E5] bg-white">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#D2D5D8] bg-white px-4 py-1.5 text-sm font-medium text-[#1A1A1A] hover:bg-[#F6F6F7] transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDone}
            className="rounded-lg bg-[#1A1A1A] px-4 py-1.5 text-sm font-medium text-white shadow-xs hover:bg-[#303030] transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
