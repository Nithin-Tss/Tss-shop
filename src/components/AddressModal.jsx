import { useEffect, useState } from "react";

const COUNTRIES = [
  "Australia",
  "United States",
  "United Kingdom",
  "Canada",
  "India",
  "New Zealand",
  "Germany",
  "France",
  "Singapore",
  "Japan",
];

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
  country: "Australia",
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
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
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
        country: initialData.country || "Australia",
        phone: initialData.phone || "",
        is_default: Boolean(initialData.is_default),
      });
    } else {
      setFormData(INITIAL_FORM);
    }
    setErrors({});
  }, [initialData, isOpen]);

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
    if (!formData.country.trim()) {
      newErrors.country = "Country is required.";
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
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 my-8 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Fill in the address details below.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs" noValidate>
          {/* Address Type */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Address Type *
            </label>
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
              {errors.city && (
                <p className="mt-1 text-[11px] text-red-500">{errors.city}</p>
              )}
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
              {errors.state && (
                <p className="mt-1 text-[11px] text-red-500">{errors.state}</p>
              )}
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
            <div>
              <label htmlFor="country" className="block font-semibold text-slate-700 mb-1">
                Country *
              </label>
              <div className="relative">
                <input
                  id="country"
                  type="text"
                  name="country"
                  list="country-suggestions"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="Select or enter country"
                  className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition ${
                    errors.country
                      ? "border-red-400 bg-red-50/30 focus:border-red-500"
                      : "border-slate-300 focus:border-charcoal-navy"
                  }`}
                />
                <datalist id="country-suggestions">
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              {errors.country && (
                <p className="mt-1 text-[11px] text-red-500">{errors.country}</p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block font-semibold text-slate-700 mb-1">
                Phone Number <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. +61 412 345 678"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-charcoal-navy"
              />
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
                  This address will be selected automatically during checkout for {formData.address_type}.
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
              className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-[#161C2C] hover:bg-[#252E45] text-white font-semibold transition disabled:opacity-50 shadow-xs flex items-center gap-1.5"
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
