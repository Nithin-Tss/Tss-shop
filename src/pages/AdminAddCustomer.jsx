import { useState, useRef, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar, { AdminHeader, NavIcon } from "@/components/AdminSidebar";
import { apiPost } from "@/lib/api";
import Icon from "@/components/Icons";
import {
  ALL_COUNTRIES,
  DEFAULT_COUNTRY,
  validatePhone,
  formatPhoneForSave,
} from "@/lib/countries";

const LANGUAGES = [
  "English [Default]",
  "Spanish",
  "French",
  "German",
  "Japanese",
  "Chinese (Simplified)",
];

export default function AdminAddCustomer() {
  const navigate = useNavigate();

  // Overview fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [language, setLanguage] = useState("English [Default]");
  const [email, setEmail] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [marketingEmail, setMarketingEmail] = useState(false);

  const countryDropdownRef = useRef(null);
  const countrySearchInputRef = useRef(null);

  // Close country dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target)) {
        setIsCountryDropdownOpen(false);
      }
    }
    if (isCountryDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCountryDropdownOpen]);

  // Focus search input when country dropdown opens
  useEffect(() => {
    if (isCountryDropdownOpen && countrySearchInputRef.current) {
      countrySearchInputRef.current.focus();
    }
  }, [isCountryDropdownOpen]);

  // Filter countries for search
  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return ALL_COUNTRIES;
    const q = countrySearch.trim().toLowerCase();
    const cleanQ = q.startsWith("+") ? q : `+${q}`;
    return ALL_COUNTRIES.filter((c) => {
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase() === q ||
        c.callingCode === cleanQ ||
        c.callingCode.includes(q) ||
        (q === "usa" && c.code === "US") ||
        (q === "uk" && c.code === "GB")
      );
    }).sort((a, b) => {
      const isUAlias = (c) => (q === "usa" && c.code === "US") || (q === "uk" && c.code === "GB");
      if (isUAlias(a) && !isUAlias(b)) return -1;
      if (!isUAlias(a) && isUAlias(b)) return 1;
      if (a.code.toLowerCase() === q && b.code.toLowerCase() !== q) return -1;
      if (b.code.toLowerCase() === q && a.code.toLowerCase() !== q) return 1;
      if (a.callingCode === cleanQ && b.callingCode !== cleanQ) return -1;
      if (b.callingCode === cleanQ && a.callingCode !== cleanQ) return 1;
      if (a.name.toLowerCase() === q) return -1;
      if (b.name.toLowerCase() === q) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [countrySearch]);

  const handleSelectCountry = (country) => {
    setSelectedCountry(country);
    setIsCountryDropdownOpen(false);
    setCountrySearch("");
    if (phone.trim()) {
      const check = validatePhone(phone, country.code);
      setPhoneError(check.valid ? "" : check.error);
    } else {
      setPhoneError("");
    }
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value;
    setPhone(val);
    if (phoneError) {
      const check = validatePhone(val, selectedCountry.code);
      if (check.valid || !val.trim()) {
        setPhoneError("");
      }
    }
  };

  // Address fields
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [addressCountry, setAddressCountry] = useState("Australia");
  const [company] = useState("");

  // Tax & Sidebars
  const [taxSetting, setTaxSetting] = useState("Collect tax");
  const [notes, setNotes] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);

  // Status
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleAddTag = (e) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const clean = tagInput.trim().replace(/^,|,$/g, "");
      if (clean && !tags.includes(clean)) {
        setTags([...tags, clean]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (t) => {
    setTags(tags.filter((item) => item !== t));
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!email.trim() && !firstName.trim() && !lastName.trim()) {
      setError("Please provide at least a name or email for this customer.");
      return;
    }

    if (phone.trim()) {
      const check = validatePhone(phone, selectedCountry.code);
      if (!check.valid) {
        setPhoneError(check.error);
        return;
      }
    }

    setSaving(true);
    setError("");

    const subscriptionStatus = marketingEmail ? "subscribed" : "not_subscribed";
    const formattedPhone = phone.trim()
      ? formatPhoneForSave(phone.trim(), selectedCountry.code)
      : "";

    const customerPayload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || null,
      email_subscription_status: subscriptionStatus,
      city: city.trim() || null,
      state: state.trim() || null,
      country: addressCountry.trim() || selectedCountry.name,
    };

    const res = await apiPost("/api/v1/customers/", customerPayload);

    if (!res.ok) {
      setSaving(false);
      setError(
        res.formError ||
        res.fieldErrors?.email ||
        res.fieldErrors?.first_name ||
        "Failed to save customer."
      );
      return;
    }

    const createdCustomer = res.data;

    // If an address or phone was specified, save customer address so phone is persisted
    const shouldSaveAddress = Boolean(addressLine1.trim() || formattedPhone);
    if (shouldSaveAddress && createdCustomer?.id) {
      await apiPost("/api/v1/customers/addresses/", {
        customer: createdCustomer.id,
        address_type: "shipping",
        first_name: firstName.trim() || createdCustomer.first_name || "—",
        last_name: lastName.trim() || createdCustomer.last_name || "—",
        company: company.trim() || "",
        address_line_1: addressLine1.trim() || "—",
        address_line_2: addressLine2.trim() || "",
        city: city.trim() || "—",
        state: state.trim() || "—",
        postal_code: postalCode.trim() || "—",
        country: addressCountry.trim() || selectedCountry.name,
        phone: formattedPhone,
        is_default: true,
      });
    }

    setSaving(false);
    navigate("/admin/online-store/customers");
  };

  return (
    <div className="min-h-screen bg-slate-100 text-charcoal-navy">
      <AdminHeader />

      {/* 2. BODY LAYOUT */}
      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        {/* SIDEBAR */}
        <AdminSidebar />

        {/* MAIN ADD CUSTOMER CONTENT */}
        <main className="min-w-0 flex-1 px-4 sm:px-8 py-6 max-w-6xl mx-auto w-full">
          {/* Breadcrumb / Page Title Bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-slate-700">
              <Link
                to="/admin/online-store/customers"
                className="hover:text-orange-600 transition-colors flex items-center gap-1 text-slate-500 hover:underline"
              >
                <NavIcon name="customers" className="h-4 w-4" />
                <span>›</span>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                New customer
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/admin/online-store/customers"
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-orange-600 hover:bg-slate-200/60 rounded-lg transition-colors"
              >
                Discard
              </Link>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-600/90 disabled:opacity-50 text-white text-sm font-semibold transition-all shadow-xs"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                className="text-red-400 hover:text-red-700 font-bold"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* 2-COLUMN MAIN CONTENT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT / MAIN COLUMN (8 cols) */}
            <div className="lg:col-span-8 space-y-5">
              {/* CARD 1: CUSTOMER OVERVIEW */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                <h2 className="text-base font-bold text-slate-900">Customer overview</h2>

                {/* First & Last Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      First name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-slate-500 bg-white"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Last name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-slate-500 bg-white"
                    />
                  </div>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Language
                  </label>
                  <div className="relative">
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full appearance-none bg-white px-3.5 py-2 text-sm rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-slate-500 cursor-pointer pr-9"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang} value={lang}>
                          {lang}
                        </option>
                      ))}
                    </select>
                    <span className="absolute right-3 top-2.5 text-slate-400 pointer-events-none text-xs">
                      ↕
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    This customer will receive notifications in this language.
                  </p>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-slate-500 bg-white"
                  />
                </div>

                {/* Phone number */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Phone number
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative" ref={countryDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsCountryDropdownOpen((prev) => !prev)}
                        className={`flex items-center gap-1.5 h-9.5 px-3 border rounded-lg bg-white text-sm hover:border-slate-400 focus:outline-none transition cursor-pointer select-none ${isCountryDropdownOpen
                            ? "border-orange-600 ring-1 ring-orange-600"
                            : "border-slate-300"
                          }`}
                        title={`${selectedCountry.name} (${selectedCountry.callingCode})`}
                        aria-haspopup="listbox"
                        aria-expanded={isCountryDropdownOpen}
                      >
                        <span className="text-base leading-none">{selectedCountry.flag}</span>
                        <span className="font-mono text-xs font-semibold text-slate-700">
                          {selectedCountry.callingCode}
                        </span>
                        <span className="text-xs text-slate-400">▾</span>
                      </button>

                      {isCountryDropdownOpen && (
                        <div className="absolute left-0 top-full mt-1.5 w-72 max-h-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 flex flex-col overflow-hidden text-xs">
                          <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
                            <div className="relative flex items-center">
                              <span className="absolute left-2.5 text-slate-400 pointer-events-none">
                                <Icon name="search" className="h-3.5 w-3.5" />
                              </span>
                              <input
                                ref={countrySearchInputRef}
                                type="text"
                                value={countrySearch}
                                onChange={(e) => setCountrySearch(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (filteredCountries.length > 0) {
                                      handleSelectCountry(filteredCountries[0]);
                                    }
                                  } else if (e.key === "Escape") {
                                    setIsCountryDropdownOpen(false);
                                  }
                                }}
                                placeholder="Search country or code..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600 text-slate-800"
                              />
                            </div>
                          </div>

                          <div className="overflow-y-auto max-h-64 py-1 divide-y divide-slate-50">
                            {filteredCountries.length === 0 ? (
                              <div className="py-4 text-center text-slate-400">No countries found</div>
                            ) : (
                              filteredCountries.map((c) => {
                                const isSelected = c.code === selectedCountry.code;
                                return (
                                  <button
                                    key={c.code}
                                    type="button"
                                    onClick={() => handleSelectCountry(c)}
                                    className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition cursor-pointer ${isSelected
                                        ? "bg-amber-50/70 font-semibold text-slate-900"
                                        : "text-slate-700"
                                      }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0 pr-2">
                                      <span className="text-base leading-none shrink-0">{c.flag}</span>
                                      <span className="truncate">{c.name}</span>
                                      <span className="text-[10px] text-slate-400 shrink-0 uppercase">
                                        ({c.code})
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                        {c.callingCode}
                                      </span>
                                      {isSelected && (
                                        <Icon name="check" className="h-3.5 w-3.5 text-orange-600" />
                                      )}
                                    </div>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <input
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      onBlur={() => {
                        if (phone.trim()) {
                          const check = validatePhone(phone, selectedCountry.code);
                          setPhoneError(check.valid ? "" : check.error);
                        }
                      }}
                      placeholder={selectedCountry.placeholder || "412 345 678"}
                      className={`flex-1 px-3.5 py-2 text-sm rounded-lg border bg-white transition outline-none ${phoneError
                          ? "border-red-400 bg-red-50/20 focus:border-red-500"
                          : "border-slate-300 text-slate-900 focus:border-orange-600 focus:ring-1 focus:ring-orange-600"
                        }`}
                    />
                  </div>
                  {phoneError ? (
                    <p className="mt-1 text-xs text-red-500">{phoneError}</p>
                  ) : null}
                </div>

                {/* Checkboxes */}
                <div className="space-y-2.5 pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={marketingEmail}
                      onChange={(e) => setMarketingEmail(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-orange-600"
                    />
                    <span className="text-xs text-slate-600">
                      Customer agreed to receive marketing emails.
                    </span>
                  </label>
                </div>

                {/* Footer Note */}
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-500 leading-5">
                    You should ask your customers for permission before you subscribe them to your
                    marketing emails.
                  </p>
                </div>
              </div>

              {/* CARD 2: DEFAULT ADDRESS */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Default address</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    The primary address of this customer
                  </p>
                </div>

                {!showAddressForm ? (
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(true)}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50 text-sm font-medium text-slate-800 transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base text-slate-500">⊕</span>
                      <span>Add address</span>
                    </div>
                    <span className="text-slate-400">›</span>
                  </button>
                ) : (
                  <div className="space-y-3.5 pt-1">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Country / Region
                      </label>
                      <input
                        type="text"
                        value={addressCountry}
                        onChange={(e) => setAddressCountry(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-slate-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        value={addressLine1}
                        onChange={(e) => setAddressLine1(e.target.value)}
                        placeholder="Street address"
                        className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-slate-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Apartment, suite, etc.
                      </label>
                      <input
                        type="text"
                        value={addressLine2}
                        onChange={(e) => setAddressLine2(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-slate-500 bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-slate-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          State / Territory
                        </label>
                        <input
                          type="text"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-slate-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Postal code
                        </label>
                        <input
                          type="text"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-slate-500 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* CARD 3: TAX DETAILS */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-3">
                <h2 className="text-base font-bold text-slate-900">Tax details</h2>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Tax settings
                  </label>
                  <div className="relative">
                    <select
                      value={taxSetting}
                      onChange={(e) => setTaxSetting(e.target.value)}
                      className="w-full appearance-none bg-white px-3.5 py-2 text-sm rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-slate-500 cursor-pointer pr-9"
                    >
                      <option value="Collect tax">Collect tax</option>
                      <option value="Don't collect tax">Don't collect tax</option>
                      <option value="Exempt">Exempt</option>
                    </select>
                    <span className="absolute right-3 top-2.5 text-slate-400 pointer-events-none text-xs">
                      ↕
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (4 cols) */}
            <div className="lg:col-span-4 space-y-5">
              {/* CARD 1: NOTES */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">Notes</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingNotes((prev) => !prev)}
                    className="text-slate-400 hover:text-slate-700 text-sm transition"
                  >
                    <Icon name="pencil-line" className="h-4 w-4" />
                  </button>
                </div>

                {isEditingNotes ? (
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add a note for this customer..."
                    className="w-full text-xs text-slate-800 p-2.5 rounded-lg border border-slate-300 outline-none focus:border-slate-500 resize-none"
                    autoFocus
                  />
                ) : (
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {notes.trim()
                      ? notes
                      : "Notes are private and won't be shared with the customer."}
                  </p>
                )}
              </div>

              {/* CARD 2: TAGS */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
                <span className="text-sm font-bold text-slate-900">Tags</span>

                <div className="min-h-10.5 p-2 rounded-lg border border-slate-300 bg-white flex flex-wrap items-center gap-1.5 focus-within:border-slate-500">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-slate-100 text-xs text-slate-700"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-slate-400 hover:text-slate-700 font-bold"
                      >
                        <Icon name="x" className="h-4 w-4" />
                      </button>
                    </span>
                  ))}

                  {showTagInput ? (
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      placeholder="Add tag and hit enter..."
                      className="flex-1 min-w-30 bg-transparent outline-none text-xs text-slate-800 p-1"
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowTagInput(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 text-xs text-slate-600 hover:bg-slate-200 transition"
                    >
                      <span>⊕</span>
                      <span>Add tags</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
