import { useEffect, useState, useRef, useMemo } from "react";
import {
  ALL_COUNTRIES,
  DEFAULT_COUNTRY,
  validatePhone,
  formatPhoneForSave,
  parseStoredPhone,
} from "@/lib/countries";

const INITIAL_FORM = {
  address_type: "shipping",
  first_name: "",
  last_name: "",
  company: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  state: "",
  postal_code: "",
  country: DEFAULT_COUNTRY.name,
  phone: "",
  is_default: false,
};

export default function AddressModal({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  title = "Add Address",
  saving = false,
  apiError = "",
}) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [errors, setErrors] = useState({});

  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Reset the form whenever the modal opens or gets different data (during render, not in an effect)
  const [formSource, setFormSource] = useState(null);
  if (!formSource || formSource.initialData !== initialData || formSource.isOpen !== isOpen) {
    setFormSource({ initialData, isOpen });
    if (initialData) {
      const parsed = parseStoredPhone(initialData.phone || "", initialData.country || "Australia");
      setSelectedCountry(parsed.country);
      setPhoneNumber(parsed.nationalNumber || "");
      setFormData({
        address_type: initialData.address_type || "shipping",
        first_name: initialData.first_name || "",
        last_name: initialData.last_name || "",
        company: initialData.company || "",
        address_line_1: initialData.address_line_1 || "",
        address_line_2: initialData.address_line_2 || "",
        city: initialData.city || "",
        state: initialData.state || "",
        postal_code: initialData.postal_code || "",
        country: parsed.country.name,
        phone: parsed.nationalNumber || "",
        is_default: Boolean(initialData.is_default),
      });
    } else {
      setSelectedCountry(DEFAULT_COUNTRY);
      setPhoneNumber("");
      setFormData({
        ...INITIAL_FORM,
        country: DEFAULT_COUNTRY.name,
      });
    }
    setCountrySearch("");
    setIsCountryDropdownOpen(false);
    setErrors({});
  }

  // Click-outside listener to close country dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
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

  // Focus search input automatically when country dropdown opens
  useEffect(() => {
    if (isCountryDropdownOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isCountryDropdownOpen]);

  // Filter and prioritize countries based on user query
  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return ALL_COUNTRIES;
    const q = countrySearch.trim().toLowerCase();
    const cleanQ = q.startsWith("+") ? q : `+${q}`;
    const matches = ALL_COUNTRIES.filter((c) => {
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase() === q ||
        c.callingCode === cleanQ ||
        c.callingCode.includes(q) ||
        (q === "usa" && c.code === "US") ||
        (q === "uk" && c.code === "GB")
      );
    });

    return matches.sort((a, b) => {
      const isUAlias = (c) => (q === "usa" && c.code === "US") || (q === "uk" && c.code === "GB");
      if (isUAlias(a) && !isUAlias(b)) return -1;
      if (!isUAlias(a) && isUAlias(b)) return 1;

      if (a.code.toLowerCase() === q && b.code.toLowerCase() !== q) return -1;
      if (b.code.toLowerCase() === q && a.code.toLowerCase() !== q) return 1;

      if (a.callingCode === cleanQ && b.callingCode !== cleanQ) return -1;
      if (b.callingCode === cleanQ && a.callingCode !== cleanQ) return 1;

      if (a.name.toLowerCase() === q) return -1;
      if (b.name.toLowerCase() === q) return 1;

      const aStarts = a.name.toLowerCase().startsWith(q);
      const bStarts = b.name.toLowerCase().startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return a.name.localeCompare(b.name);
    });
  }, [countrySearch]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    setPhoneNumber(value);
    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: "" }));
    }
  };

  const handleSelectCountry = (country) => {
    setSelectedCountry(country);
    // Only update country field; keep all other address fields unchanged
    setFormData((prev) => ({ ...prev, country: country.name }));
    setIsCountryDropdownOpen(false);
    setCountrySearch("");
    if (errors.country) {
      setErrors((prev) => ({ ...prev, country: "" }));
    }
    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: "" }));
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCountries.length > 0) {
        handleSelectCountry(filteredCountries[0]);
      }
    } else if (e.key === "Escape") {
      setIsCountryDropdownOpen(false);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.first_name.trim()) {
      newErrors.first_name = "First name is required.";
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = "Last name is required.";
    }
    if (!formData.address_line_1.trim()) {
      newErrors.address_line_1 = "Address line 1 is required.";
    }
    if (!formData.city.trim()) {
      newErrors.city = "City is required.";
    }
    if (!formData.state.trim()) {
      newErrors.state = "State is required.";
    }
    if (!formData.postal_code.trim()) {
      newErrors.postal_code = "Postal code is required.";
    }
    if (!formData.country.trim() && !selectedCountry?.name) {
      newErrors.country = "Country is required.";
    }
    if (phoneNumber.trim()) {
      const phoneCheck = validatePhone(phoneNumber, selectedCountry.code);
      if (!phoneCheck.isValid) {
        newErrors.phone = phoneCheck.error;
      }
    }
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const formattedPhone = phoneNumber.trim()
      ? formatPhoneForSave(phoneNumber, selectedCountry.code)
      : "";

    onSave({
      ...formData,
      country: selectedCountry.name,
      phone: formattedPhone,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50 rounded-t-2xl">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Fill in the address details below.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Global Error Banner */}
        {apiError && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {apiError}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs rounded-b-2xl" noValidate>
          {/* Address Type */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Address Type *</label>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border cursor-pointer font-medium transition ${
                  formData.address_type === "shipping"
                    ? "border-charcoal-navy bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="address_type"
                  value="shipping"
                  checked={formData.address_type === "shipping"}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span>Shipping Address</span>
              </label>

              <label
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border cursor-pointer font-medium transition ${
                  formData.address_type === "billing"
                    ? "border-charcoal-navy bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="address_type"
                  value="billing"
                  checked={formData.address_type === "billing"}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span>Billing Address</span>
              </label>
            </div>
          </div>

          {/* First & Last Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="first_name" className="block font-semibold text-slate-700 mb-1">
                First Name *
              </label>
              <input
                id="first_name"
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="e.g. Jane"
                className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition ${
                  errors.first_name
                    ? "border-red-400 bg-red-50/30 focus:border-red-500"
                    : "border-slate-300 focus:border-charcoal-navy"
                }`}
              />
              {errors.first_name && (
                <p className="mt-1 text-[11px] text-red-500">{errors.first_name}</p>
              )}
            </div>

            <div>
              <label htmlFor="last_name" className="block font-semibold text-slate-700 mb-1">
                Last Name *
              </label>
              <input
                id="last_name"
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="e.g. Doe"
                className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition ${
                  errors.last_name
                    ? "border-red-400 bg-red-50/30 focus:border-red-500"
                    : "border-slate-300 focus:border-charcoal-navy"
                }`}
              />
              {errors.last_name && (
                <p className="mt-1 text-[11px] text-red-500">{errors.last_name}</p>
              )}
            </div>
          </div>

          {/* Company Name (Optional) */}
          <div>
            <label htmlFor="company" className="block font-semibold text-slate-700 mb-1">
              Company Name <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="company"
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="e.g. Acme Corp"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-charcoal-navy"
            />
          </div>

          {/* Address Line 1 */}
          <div>
            <label htmlFor="address_line_1" className="block font-semibold text-slate-700 mb-1">
              Address Line 1 *
            </label>
            <input
              id="address_line_1"
              type="text"
              name="address_line_1"
              value={formData.address_line_1}
              onChange={handleChange}
              placeholder="Street address, P.O. box"
              className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition ${
                errors.address_line_1
                  ? "border-red-400 bg-red-50/30 focus:border-red-500"
                  : "border-slate-300 focus:border-charcoal-navy"
              }`}
            />
            {errors.address_line_1 && (
              <p className="mt-1 text-[11px] text-red-500">{errors.address_line_1}</p>
            )}
          </div>

          {/* Address Line 2 (Optional) */}
          <div>
            <label htmlFor="address_line_2" className="block font-semibold text-slate-700 mb-1">
              Address Line 2 <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="address_line_2"
              type="text"
              name="address_line_2"
              value={formData.address_line_2}
              onChange={handleChange}
              placeholder="Apartment, suite, unit, building, floor, etc."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-charcoal-navy"
            />
          </div>

          {/* City, State, Postal Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label htmlFor="city" className="block font-semibold text-slate-700 mb-1">
                City *
              </label>
              <input
                id="city"
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="City / Suburb"
                className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition ${
                  errors.city
                    ? "border-red-400 bg-red-50/30 focus:border-red-500"
                    : "border-slate-300 focus:border-charcoal-navy"
                }`}
              />
              {errors.city && <p className="mt-1 text-[11px] text-red-500">{errors.city}</p>}
            </div>

            <div>
              <label htmlFor="state" className="block font-semibold text-slate-700 mb-1">
                State / Province *
              </label>
              <input
                id="state"
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="State / Region"
                className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition ${
                  errors.state
                    ? "border-red-400 bg-red-50/30 focus:border-red-500"
                    : "border-slate-300 focus:border-charcoal-navy"
                }`}
              />
              {errors.state && <p className="mt-1 text-[11px] text-red-500">{errors.state}</p>}
            </div>

            <div>
              <label htmlFor="postal_code" className="block font-semibold text-slate-700 mb-1">
                Postal Code *
              </label>
              <input
                id="postal_code"
                type="text"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
                placeholder="ZIP / Postcode"
                className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition ${
                  errors.postal_code
                    ? "border-red-400 bg-red-50/30 focus:border-red-500"
                    : "border-slate-300 focus:border-charcoal-navy"
                }`}
              />
              {errors.postal_code && (
                <p className="mt-1 text-[11px] text-red-500">{errors.postal_code}</p>
              )}
            </div>
          </div>

          {/* Country & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Searchable Country Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <label htmlFor="country-btn" className="block font-semibold text-slate-700 mb-1">
                Country *
              </label>
              <button
                id="country-btn"
                type="button"
                onClick={() => setIsCountryDropdownOpen((prev) => !prev)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg border text-left bg-white transition cursor-pointer ${
                  errors.country
                    ? "border-red-400 bg-red-50/30 focus:border-red-500"
                    : isCountryDropdownOpen
                      ? "border-charcoal-navy ring-1 ring-charcoal-navy"
                      : "border-slate-300 hover:border-slate-400"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-base shrink-0 leading-none">{selectedCountry.flag}</span>
                  <span className="font-medium text-slate-900 truncate">
                    {selectedCountry.name}
                  </span>
                </div>
                <span className="text-slate-400 text-xs ml-1 shrink-0">
                  {isCountryDropdownOpen ? "▲" : "▼"}
                </span>
              </button>
              {errors.country && <p className="mt-1 text-[11px] text-red-500">{errors.country}</p>}

              {/* Floating Country Dropdown Menu */}
              {isCountryDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
                  {/* Search Input Header */}
                  <div className="p-2 border-b border-slate-100 bg-slate-50/70">
                    <div className="relative">
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="Search country or code (e.g. India, +91)..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 bg-white outline-none focus:border-charcoal-navy focus:ring-1 focus:ring-charcoal-navy"
                      />
                    </div>
                  </div>

                  {/* Country Items List */}
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-50 text-xs">
                    {filteredCountries.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-xs">
                        No countries found matching "{countrySearch}"
                      </div>
                    ) : (
                      filteredCountries.map((c) => {
                        const isSelected = c.code === selectedCountry.code;
                        return (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => handleSelectCountry(c)}
                            className={`w-full flex items-center justify-between px-3 py-2 text-left transition cursor-pointer ${
                              isSelected
                                ? "bg-slate-100 font-semibold text-slate-900"
                                : "hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-base shrink-0 leading-none">{c.flag}</span>
                              <span className="truncate">{c.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {c.callingCode}
                              </span>
                              {isSelected && <span className="text-slate-900 font-bold">✓</span>}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Phone Number Field with Dynamic Calling Code */}
            <div>
              <label htmlFor="phone" className="block font-semibold text-slate-700 mb-1">
                Phone Number <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <div
                className={`flex items-center rounded-lg border bg-white transition overflow-hidden ${
                  errors.phone
                    ? "border-red-400 bg-red-50/20"
                    : "border-slate-300 focus-within:border-charcoal-navy focus-within:ring-1 focus-within:ring-charcoal-navy"
                }`}
              >
                <div
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border-r border-slate-200 text-xs font-semibold text-slate-700 select-none shrink-0"
                  title={`${selectedCountry.name} (${selectedCountry.callingCode})`}
                >
                  <span className="text-sm leading-none">{selectedCountry.flag}</span>
                  <span className="font-mono text-xs">{selectedCountry.callingCode}</span>
                </div>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  placeholder={
                    selectedCountry.code === "AU"
                      ? "412 345 678"
                      : selectedCountry.code === "IN"
                        ? "98765 43210"
                        : selectedCountry.code === "US"
                          ? "202 555 0123"
                          : selectedCountry.code === "GB"
                            ? "7911 123456"
                            : "Local phone number"
                  }
                  className="w-full px-3 py-2 text-sm outline-none bg-transparent text-slate-800"
                />
              </div>
              {errors.phone ? (
                <p className="mt-1 text-[11px] text-red-500">{errors.phone}</p>
              ) : null}
            </div>
          </div>

          {/* Set as Default Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                name="is_default"
                checked={formData.is_default}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#161C2C]"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800">
                  Set as default {formData.address_type} address
                </span>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  This address will be selected automatically during checkout for{" "}
                  {formData.address_type}.
                </p>
              </div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-[#161C2C] hover:bg-[#252E45] text-white font-semibold transition disabled:opacity-50 shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              {saving ? (
                <>
                  <span className="inline-block animate-spin">↻</span>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Address</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
