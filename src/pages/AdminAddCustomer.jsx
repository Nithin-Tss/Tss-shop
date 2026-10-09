import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar, { AdminHeader } from "@/components/AdminSidebar";
import { apiPost } from "@/lib/api";

const COUNTRIES = [
  { code: "AU", name: "Australia", prefix: "+61", flag: "🇦🇺" },
  { code: "US", name: "United States", prefix: "+1", flag: "🇺🇸" },
  { code: "IN", name: "India", prefix: "+91", flag: "🇮🇳" },
  { code: "GB", name: "United Kingdom", prefix: "+44", flag: "🇬🇧" },
  { code: "CA", name: "Canada", prefix: "+1", flag: "🇨🇦" },
  { code: "NZ", name: "New Zealand", prefix: "+64", flag: "🇳🇿" },
];

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
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [phone, setPhone] = useState("");
  const [marketingEmail, setMarketingEmail] = useState(false);
  const [marketingSms, setMarketingSms] = useState(false);
  const [marketingWhatsApp, setMarketingWhatsApp] = useState(false);

  // Address fields
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [addressCountry, setAddressCountry] = useState("Australia");
  const [company, setCompany] = useState("");

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

    setSaving(true);
    setError("");

    const subscriptionStatus = marketingEmail ? "subscribed" : "not_subscribed";
    const fullPhone = phone.trim() ? `${selectedCountry.prefix} ${phone.trim()}` : "";

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

    // If an address was specified, save customer address
    if (addressLine1.trim() && createdCustomer?.id) {
      await apiPost("/api/v1/customers/addresses/", {
        customer: createdCustomer.id,
        address_type: "shipping",
        first_name: firstName.trim() || "",
        last_name: lastName.trim() || "",
        company: company.trim() || "",
        address_line_1: addressLine1.trim(),
        address_line_2: addressLine2.trim() || "",
        city: city.trim(),
        state: state.trim(),
        postal_code: postalCode.trim(),
        country: addressCountry.trim(),
        phone: fullPhone,
        is_default: true,
      });
    }

    setSaving(false);
    navigate("/admin/online-store/customers");
  };

  return (
    <div className="min-h-screen bg-[#F1F2F4] text-[#161C2C]">
      <AdminHeader />

      {/* 2. BODY LAYOUT */}
      <div className="flex min-h-[calc(100vh-72px)]">
        {/* SIDEBAR */}
        <AdminSidebar />

        {/* MAIN ADD CUSTOMER CONTENT */}
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-6xl mx-auto w-full">
          {/* Breadcrumb / Page Title Bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-slate-700">
              <Link
                to="/admin/online-store/customers"
                className="hover:text-slate-900 transition-colors flex items-center gap-1 text-slate-500 hover:underline"
              >
                <span className="text-base">👤</span>
                <span>›</span>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                New customer
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/admin/online-store/customers"
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors"
              >
                Discard
              </Link>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#161C2C] hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-semibold transition-all shadow-xs"
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
                ✕
              </button>
            </div>
          )}

          {/* 2-COLUMN MAIN CONTENT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT / MAIN COLUMN (8 cols) */}
            <div className="lg:col-span-8 space-y-5">
              {/* CARD 1: CUSTOMER OVERVIEW */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                <h2 className="text-base font-bold text-slate-900">
                  Customer overview
                </h2>

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
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Email
                  </label>
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
                    <div className="relative">
                      <button
                        type="button"
                        className="flex items-center gap-1.5 h-[38px] px-3 border border-slate-300 rounded-lg bg-white text-sm"
                      >
                        <span className="text-base">{selectedCountry.flag}</span>
                        <span className="text-xs text-slate-400">↕</span>
                      </button>
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 412 345 678"
                      className="flex-1 px-3.5 py-2 text-sm rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-slate-500 bg-white"
                    />
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="space-y-2.5 pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={marketingEmail}
                      onChange={(e) => setMarketingEmail(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-[#161C2C]"
                    />
                    <span className="text-xs text-slate-600">
                      Customer agreed to receive marketing emails.
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={marketingSms}
                      onChange={(e) => setMarketingSms(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-[#161C2C]"
                    />
                    <span className="text-xs text-slate-600">
                      Customer agreed to receive SMS marketing text messages.
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={marketingWhatsApp}
                      onChange={(e) => setMarketingWhatsApp(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-[#161C2C]"
                    />
                    <span className="text-xs text-slate-600">
                      Customer agreed to receive WhatsApp marketing messages.
                    </span>
                  </label>
                </div>

                {/* Footer Note */}
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-500 leading-5">
                    You should ask your customers for permission before you subscribe
                    them to your marketing emails, SMS, or WhatsApp messages.
                  </p>
                </div>
              </div>

              {/* CARD 2: DEFAULT ADDRESS */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Default address
                  </h2>
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
                    ✎
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

                <div className="min-h-[42px] p-2 rounded-lg border border-slate-300 bg-white flex flex-wrap items-center gap-1.5 focus-within:border-slate-500">
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
                        ✕
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
                      className="flex-1 min-w-[120px] bg-transparent outline-none text-xs text-slate-800 p-1"
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
