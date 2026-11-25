import { useEffect, useState, useRef } from "react";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { ALL_COUNTRIES } from "@/lib/countries";
import {
  getCountryBankConfig,
  isCountryConfigured,
  mapBankDetailsToApiPayload,
  validateAbaRouting,
  validateAccountHolderName,
  validateAccountNumber,
  validateAccountConfirmation,
  validateBsb,
  validateCanadaBankCodes,
  validateDualBankCodes,
  validateGenericRouting,
  validateIfsc,
  validateSortCode,
  validateBicSwift,
} from "@/lib/bankCountries";

// Settings > Payments: two ways to get paid out — a direct bank account, or the
// store's own Stripe account (Stripe Connect). The backend enforces permissions.
export default function PaymentsSettings() {
  return (
    <div className="space-y-5">
      <BankPayoutSettings />
      <StripeSettings />
    </div>
  );
}

const fieldClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-orange-600 focus:ring-1 focus:ring-orange-600";

const EMPTY_BANK_FORM = {
  account_holder_name: "",
  bank_name: "",
  bank_branch: "",
  account_number: "",
  confirm_account_number: "",
  routing_code: "",
  ifsc_code: "",
  bsb_number: "",
  aba_routing: "",
  sort_code: "",
  institution_number: "",
  transit_number: "",
  bank_code: "",
  branch_code: "",
  account_type: "checking",
  iban: "",
  confirm_iban: "",
  bic_swift: "",
  currency: "USD",
};

function BankPayoutSettings() {
  const [saved, setSaved] = useState(null); // API shape or { configured: false }
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Dynamic country state
  const [selectedCountry, setSelectedCountry] = useState("");
  const [form, setForm] = useState(EMPTY_BANK_FORM);

  // Country selector dropdown state
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const countryDropdownRef = useRef(null);

  // Load existing saved bank payout configuration on mount
  useEffect(() => {
    let cancelled = false;
    apiGet("/api/v1/payments/bank-payout/").then((res) => {
      if (cancelled) return;
      if (res.ok) setSaved(res.data);
      else setError(res.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Handle outside clicks to close country dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target)) {
        setIsCountryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const countryConfig = getCountryBankConfig(selectedCountry);
  const isConfigured = isCountryConfigured(selectedCountry);

  const clearFieldError = (key) => {
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const setField = (key) => (e) => {
    const val = e.target.value;
    setForm((f) => ({ ...f, [key]: val }));
    clearFieldError(key);
  };

  /**
   * Account number change handler:
   * Strips non-digits for numeric countries, or non-alphanumeric for SEPA.
   * Immediately validates and displays informative inline messages.
   */
  const handleAccountNumberChange = (key) => (e) => {
    const raw = e.target.value;
    const isNumeric = countryConfig?.accountNumberType === "numeric";

    if (isNumeric) {
      const clean = raw.replace(/\D/g, "");
      setForm((f) => ({ ...f, [key]: clean }));

      if (/\D/.test(raw)) {
        setFieldErrors((prev) => ({
          ...prev,
          [key]: `${countryConfig?.name || "This country's"} bank account numbers allow only numeric digits (0–9). Letters and special characters are not permitted.`,
        }));
      } else {
        clearFieldError(key);
      }
    } else {
      // Alphanumeric / SEPA IBAN
      const clean = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      setForm((f) => ({ ...f, [key]: clean }));

      if (/[^A-Za-z0-9]/.test(raw.replace(/[\s-]/g, ""))) {
        setFieldErrors((prev) => ({
          ...prev,
          [key]: `IBAN allows only letters and digits (A–Z, 0–9). Special characters are not permitted.`,
        }));
      } else {
        clearFieldError(key);
      }
    }
  };

  /**
   * KeyDown handler for numeric-only inputs:
   * Intercepts and blocks non-numeric keys during typing.
   */
  const handleNumericKeyDown = (fieldName, label) => (e) => {
    // Allow functional and navigation keys
    if (
      e.key === "Backspace" ||
      e.key === "Tab" ||
      e.key === "Enter" ||
      e.key === "Escape" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "ArrowUp" ||
      e.key === "ArrowDown" ||
      e.key === "Delete" ||
      e.key === "Home" ||
      e.key === "End" ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }

    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
      setFieldErrors((prev) => ({
        ...prev,
        [fieldName]: `${label || "This field"} allows only numeric digits (0–9). Letters and special characters are not permitted.`,
      }));
    }
  };

  /**
   * Paste handler for numeric-only inputs:
   * Strips invalid characters and informs user.
   */
  const handleNumericPaste = (fieldName, label) => (e) => {
    const paste = e.clipboardData?.getData("text") || "";
    if (/\D/.test(paste)) {
      e.preventDefault();
      const cleanDigits = paste.replace(/\D/g, "");
      setForm((prev) => ({ ...prev, [fieldName]: cleanDigits }));
      setFieldErrors((prev) => ({
        ...prev,
        [fieldName]: `Non-numeric characters were removed. ${label || "This field"} allows only digits (0–9).`,
      }));
    }
  };

  /**
   * KeyDown handler for alphanumeric inputs (e.g. IBAN, BIC, IFSC):
   * Blocks symbols and special characters.
   */
  const handleAlphanumericKeyDown = (fieldName, label) => (e) => {
    if (
      e.key === "Backspace" ||
      e.key === "Tab" ||
      e.key === "Enter" ||
      e.key === "Escape" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "ArrowUp" ||
      e.key === "ArrowDown" ||
      e.key === "Delete" ||
      e.key === "Home" ||
      e.key === "End" ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }

    if (!/^[A-Za-z0-9]$/.test(e.key)) {
      e.preventDefault();
      setFieldErrors((prev) => ({
        ...prev,
        [fieldName]: `${label || "This field"} allows only letters and digits (A–Z, 0–9). Special characters are not permitted.`,
      }));
    }
  };

  /**
   * Paste handler for alphanumeric inputs:
   */
  const handleAlphanumericPaste = (fieldName, label) => (e) => {
    const paste = e.clipboardData?.getData("text") || "";
    if (/[^A-Za-z0-9]/.test(paste.replace(/[\s-]/g, ""))) {
      e.preventDefault();
      const clean = paste.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      setForm((prev) => ({ ...prev, [fieldName]: clean }));
      setFieldErrors((prev) => ({
        ...prev,
        [fieldName]: `Special characters were removed. ${label || "This field"} allows only letters and numbers (A–Z, 0–9).`,
      }));
    }
  };

  /**
   * KeyDown handler for Account Holder Name:
   * Only allows alphabetic characters, spaces, hyphens, and apostrophes.
   * Immediately prevents digits or invalid special characters while typing.
   */
  const handleAccountHolderNameKeyDown = (e) => {
    if (
      e.key === "Backspace" ||
      e.key === "Tab" ||
      e.key === "Enter" ||
      e.key === "Escape" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "ArrowUp" ||
      e.key === "ArrowDown" ||
      e.key === "Delete" ||
      e.key === "Home" ||
      e.key === "End" ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey
    ) {
      return;
    }

    if (!/^[A-Za-z\u00C0-\u024F\s'’-]$/.test(e.key)) {
      e.preventDefault();
      setFieldErrors((prev) => ({
        ...prev,
        account_holder_name: "Please enter a valid account holder name.",
      }));
    }
  };

  /**
   * Paste handler for Account Holder Name:
   * Strips digits and invalid characters, sets error if invalid characters were found.
   */
  const handleAccountHolderNamePaste = (e) => {
    const paste = e.clipboardData?.getData("text") || "";
    if (/\d/.test(paste) || /[^A-Za-z\u00C0-\u024F\s'’-]/.test(paste)) {
      e.preventDefault();
      const clean = paste.replace(/[^A-Za-z\u00C0-\u024F\s'’-]/g, "").replace(/\d/g, "");
      setForm((prev) => ({ ...prev, account_holder_name: clean }));
      setFieldErrors((prev) => ({
        ...prev,
        account_holder_name: "Please enter a valid account holder name.",
      }));
    }
  };

  /**
   * Change handler for Account Holder Name:
   * Prevents invalid characters from entering the form state.
   */
  const handleAccountHolderNameChange = (e) => {
    const rawVal = e.target.value;
    const hasInvalid = /\d/.test(rawVal) || /[^A-Za-z\u00C0-\u024F\s'’-]/.test(rawVal);
    const cleanVal = rawVal.replace(/[^A-Za-z\u00C0-\u024F\s'’-]/g, "").replace(/\d/g, "");

    setForm((prev) => ({ ...prev, account_holder_name: cleanVal }));

    if (hasInvalid) {
      setFieldErrors((prev) => ({
        ...prev,
        account_holder_name: "Please enter a valid account holder name.",
      }));
    } else {
      setFieldErrors((prev) => {
        if (!prev.account_holder_name) return prev;
        const copy = { ...prev };
        delete copy.account_holder_name;
        return copy;
      });
    }
  };

  /**
   * Blur handler for Account Holder Name:
   * Validates when leaving the field.
   */
  const handleAccountHolderNameBlur = () => {
    const isExistingAccount = Boolean(saved?.configured);
    const res = validateAccountHolderName(form.account_holder_name, isExistingAccount);
    if (!res.isValid) {
      setFieldErrors((prev) => ({
        ...prev,
        account_holder_name: res.error,
      }));
    }
  };

  /**
   * Country switching logic:
   * 1. Preserves universal fields (account_holder_name, bank_name, bank_branch).
   * 2. Clears all incompatible country-specific banking fields.
   * 3. Clears previous validation errors.
   * 4. Updates currency to the new country's default currency.
   * 5. Recalculates state cleanly without submitting stale values.
   */
  const handleCountrySelect = (code) => {
    setSelectedCountry(code);
    setIsCountryDropdownOpen(false);
    setCountrySearch("");
    setFieldErrors({});
    setError("");

    const config = getCountryBankConfig(code);
    const newCurrency = config ? config.defaultCurrency : "USD";

    setForm((prev) => ({
      ...EMPTY_BANK_FORM,
      account_holder_name: prev.account_holder_name,
      bank_name: prev.bank_name,
      bank_branch: prev.bank_branch,
      account_type: config?.accountTypes?.[0]?.value || "checking",
      currency: newCurrency,
    }));
  };

  /**
   * Enter edit mode:
   * Never infer saved country. Require explicit manual country selection.
   */
  const startEdit = () => {
    setSelectedCountry("");
    setForm({
      ...EMPTY_BANK_FORM,
      account_holder_name: saved?.configured ? saved.account_holder_name : "",
      bank_name: saved?.configured && saved.bank_name !== "Bank" ? saved.bank_name : "",
      bank_branch: "",
      account_type: "checking",
      currency: saved?.configured ? saved.currency : "USD",
    });
    setFieldErrors({});
    setError("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setSelectedCountry("");
    setFieldErrors({});
    setError("");
    setIsCountryDropdownOpen(false);
  };

  /**
   * Form validation according to selected country rules.
   * Bank Name and Bank Branch are optional — not required to save!
   */
  const validateForm = () => {
    const errors = {};

    if (!selectedCountry) {
      errors.country = "Please select your bank account country / region.";
      return errors;
    }

    const config = getCountryBankConfig(selectedCountry);
    if (!config) {
      errors.country = "Banking payout forms are not currently configured for this region.";
      return errors;
    }

    const isExistingAccount = Boolean(saved?.configured);

    // Universal fields
    // Account holder name: REQUIRED & character-validated
    const holderRes = validateAccountHolderName(form.account_holder_name, isExistingAccount);
    if (!holderRes.isValid) {
      errors.account_holder_name = holderRes.error;
    }

    // Bank name: OPTIONAL (only validate length if entered)
    if (form.bank_name?.trim() && form.bank_name.trim().length > 120) {
      errors.bank_name = "Bank name is too long (max 120 characters).";
    }

    // Bank branch: OPTIONAL (only validate length if entered)
    if (form.bank_branch?.trim() && form.bank_branch.trim().length > 120) {
      errors.bank_branch = "Bank branch is too long (max 120 characters).";
    }

    // Country-specific validations & Account number / confirmation checks
    if (config.isIban || config.formType === "SEPA" || config.formType === "IBAN") {
      const ibanRes = validateAccountNumber(form.iban, selectedCountry, isExistingAccount);
      if (!ibanRes.isValid) errors.iban = ibanRes.error;

      const confirmIbanRes = validateAccountConfirmation(
        form.iban,
        form.confirm_iban,
        "SEPA",
        isExistingAccount
      );
      if (!confirmIbanRes.isValid) errors.confirm_iban = confirmIbanRes.error;

      const bicRes = validateBicSwift(form.bic_swift, false);
      if (!bicRes.isValid) errors.bic_swift = bicRes.error;
    } else {
      // Non-IBAN routing validation
      if (config.formType === "IN") {
        const ifscRes = validateIfsc(form.ifsc_code);
        if (!ifscRes.isValid) errors.ifsc_code = ifscRes.error;
      } else if (config.formType === "AU") {
        const bsbRes = validateBsb(form.bsb_number);
        if (!bsbRes.isValid) errors.bsb_number = bsbRes.error;
      } else if (config.formType === "US") {
        const abaRes = validateAbaRouting(form.aba_routing);
        if (!abaRes.isValid) errors.aba_routing = abaRes.error;
      } else if (config.formType === "GB") {
        const sortRes = validateSortCode(form.sort_code);
        if (!sortRes.isValid) errors.sort_code = sortRes.error;
      } else if (config.formType === "CA") {
        const caRes = validateCanadaBankCodes(form.transit_number, form.institution_number);
        if (!caRes.isValid) {
          Object.assign(errors, caRes.errors);
        }
      } else if (config.hasDualRouting) {
        const dualRes = validateDualBankCodes(form.bank_code, form.branch_code, config);
        if (!dualRes.isValid) {
          Object.assign(errors, dualRes.errors);
        }
      } else if (config.routingLabel) {
        const genRes = validateGenericRouting(form.routing_code, config);
        if (!genRes.isValid) errors.routing_code = genRes.error;
      }

      const accRes = validateAccountNumber(form.account_number, selectedCountry, isExistingAccount);
      if (!accRes.isValid) errors.account_number = accRes.error;

      const confirmRes = validateAccountConfirmation(
        form.account_number,
        form.confirm_account_number,
        config.formType,
        isExistingAccount
      );
      if (!confirmRes.isValid) errors.confirm_account_number = confirmRes.error;
    }

    if (!form.currency || !/^[A-Z]{3}$/.test(form.currency.trim().toUpperCase())) {
      errors.currency = "Select a valid 3-letter currency code.";
    }

    return errors;
  };

  /**
   * Save bank details to backend.
   */
  const save = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const clientErrors = validateForm();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    const payload = mapBankDetailsToApiPayload(
      selectedCountry,
      form,
      Boolean(saved?.configured),
      saved
    );

    if (!payload) {
      setError("Unable to prepare bank payload for the selected country.");
      return;
    }

    setSaving(true);
    const res = await apiPut("/api/v1/payments/bank-payout/", payload);
    setSaving(false);

    if (!res.ok) {
      setFieldErrors(res.fieldErrors || {});
      setError(res.formError || (Object.keys(res.fieldErrors || {}).length ? "" : res.error));
      return;
    }

    setSaved(res.data);
    setEditing(false);
    setSelectedCountry("");
  };

  const remove = async () => {
    if (!window.confirm("Remove your bank details? Payouts to this account will stop.")) return;
    setSaving(true);
    const res = await apiDelete("/api/v1/payments/bank-payout/");
    setSaving(false);
    if (res.ok) {
      setSaved({ configured: false });
      setSelectedCountry("");
    } else {
      setError(res.error);
    }
  };

  const selectedCountryObj = ALL_COUNTRIES.find((c) => c.code === selectedCountry);

  const filteredCountries = ALL_COUNTRIES.filter((c) => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
  });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-5">
        <h2 className="text-lg font-semibold text-ink">Bank account payout</h2>
        <p className="mt-1 text-sm text-slate-500">
          Add your international bank details to receive store payouts. The form automatically
          updates according to the selected country's banking requirements.
        </p>
      </div>

      <div className="space-y-4 px-5 py-5">
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : editing ? (
          <form onSubmit={save} className="space-y-5">
            {/* Country Selector */}
            <div className="relative" ref={countryDropdownRef}>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Country / Region <span className="text-red-500">*</span>
              </label>

              <button
                type="button"
                onClick={() => setIsCountryDropdownOpen((prev) => !prev)}
                className={`flex w-full items-center justify-between rounded-lg border bg-white px-3.5 py-2.5 text-sm transition-colors focus:border-orange-600 focus:outline-none focus:ring-1 focus:ring-orange-600 cursor-pointer ${
                  fieldErrors.country ? "border-red-400" : "border-slate-300 hover:border-slate-400"
                }`}
                aria-haspopup="listbox"
                aria-expanded={isCountryDropdownOpen}
              >
                <div className="flex items-center gap-2 truncate">
                  {selectedCountryObj ? (
                    <>
                      <span className="text-base">{selectedCountryObj.flag}</span>
                      <span className="font-medium text-slate-800">{selectedCountryObj.name}</span>
                      <span className="text-xs text-slate-400">({selectedCountryObj.code})</span>
                    </>
                  ) : (
                    <span className="text-slate-400">Select country / region…</span>
                  )}
                </div>
                <svg
                  className={`h-4 w-4 text-slate-400 transition-transform ${
                    isCountryDropdownOpen ? "rotate-180" : ""
                  }`}
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m6 8 4 4 4-4" />
                </svg>
              </button>

              {fieldErrors.country && (
                <span className="mt-1 block text-xs text-red-600">{fieldErrors.country}</span>
              )}

              {/* Country Selection Dropdown Popover */}
              {isCountryDropdownOpen && (
                <div className="absolute z-30 mt-1 max-h-72 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-100 p-2">
                    <input
                      type="text"
                      placeholder="Search country or code…"
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-orange-600"
                      autoFocus
                    />
                  </div>

                  <ul className="max-h-56 overflow-y-auto py-1">
                    {filteredCountries.length > 0 ? (
                      filteredCountries.map((c) => {
                        const configured = isCountryConfigured(c.code);
                        const isSelected = selectedCountry === c.code;
                        return (
                          <li key={c.code}>
                            <button
                              type="button"
                              onClick={() => handleCountrySelect(c.code)}
                              className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-sm transition-colors hover:bg-slate-50 cursor-pointer ${
                                isSelected
                                  ? "bg-orange-50/70 font-semibold text-orange-950"
                                  : "text-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <span className="text-base">{c.flag}</span>
                                <span className="truncate">{c.name}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                {configured ? (
                                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">
                                    Configured
                                  </span>
                                ) : (
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
                                    Unsupported
                                  </span>
                                )}
                                <span className="text-slate-400">{c.code}</span>
                              </div>
                            </button>
                          </li>
                        );
                      })
                    ) : (
                      <li className="px-4 py-3 text-center text-xs text-slate-500">
                        No countries found matching "{countrySearch}".
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* If no country selected yet */}
            {!selectedCountry ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-600">
                {saved?.configured ? (
                  <p>
                    The store's bank details do not record the country or region. Please select your
                    bank account country / region to update or verify these details.
                  </p>
                ) : (
                  <p>
                    Please select your bank account country or region above to load the appropriate
                    banking fields.
                  </p>
                )}
              </div>
            ) : !isConfigured ? (
              /* Informative message for unsupported countries */
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-medium">
                  Banking form not currently configured for{" "}
                  {selectedCountryObj?.name || selectedCountry}.
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  Direct bank payout forms are currently configured for over 90 countries and
                  regions worldwide (including Australia, United States, United Kingdom, Canada,
                  India, New Zealand, Singapore, Japan, Mexico, and SEPA/international IBAN
                  countries). To accept customer payments in this region, please configure Stripe
                  Connect below.
                </p>
              </div>
            ) : (
              /* Country-specific Dynamic Banking Fields */
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-800">
                  <div className="flex items-center gap-2 font-medium text-emerald-900">
                    <span className="text-base">{selectedCountryObj?.flag}</span>
                    <span>
                      {selectedCountryObj?.name} banking form configured (
                      {countryConfig?.isIban
                        ? "ISO 13616 IBAN standard"
                        : "Domestic clearing standard"}
                      )
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-emerald-700">
                    Direct bank details collection form is active. Note: Actual merchant payout
                    eligibility depends on your connected payment provider (e.g. Stripe Connect)
                    account configuration and currency settlement availability.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Account Holder Name (Universal - Required) */}
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Account holder name <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="text"
                      value={form.account_holder_name}
                      onChange={handleAccountHolderNameChange}
                      onKeyDown={handleAccountHolderNameKeyDown}
                      onPaste={handleAccountHolderNamePaste}
                      onBlur={handleAccountHolderNameBlur}
                      className={fieldClass}
                      placeholder="e.g. Acme Corp or John Doe"
                      autoComplete="name"
                      aria-invalid={Boolean(fieldErrors.account_holder_name)}
                    />
                    {fieldErrors.account_holder_name && (
                      <span className="mt-1 block text-xs text-red-600">
                        {fieldErrors.account_holder_name}
                      </span>
                    )}
                  </label>

                  {/* Bank Name (Universal - Optional) */}
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Bank name{" "}
                      <span className="text-xs font-normal text-slate-400">(optional)</span>
                    </span>
                    <input
                      type="text"
                      value={form.bank_name}
                      onChange={setField("bank_name")}
                      className={fieldClass}
                      placeholder="e.g. Commonwealth Bank, HDFC, Chase"
                      aria-invalid={Boolean(fieldErrors.bank_name)}
                    />
                    {fieldErrors.bank_name && (
                      <span className="mt-1 block text-xs text-red-600">
                        {fieldErrors.bank_name}
                      </span>
                    )}
                  </label>

                  {/* Bank Branch (Universal - Optional) */}
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Bank branch{" "}
                      <span className="text-xs font-normal text-slate-400">(optional)</span>
                    </span>
                    <input
                      type="text"
                      value={form.bank_branch}
                      onChange={setField("bank_branch")}
                      className={fieldClass}
                      placeholder="e.g. Sydney Central, Connaught Place, Downtown"
                      aria-invalid={Boolean(fieldErrors.bank_branch)}
                    />
                    {fieldErrors.bank_branch && (
                      <span className="mt-1 block text-xs text-red-600">
                        {fieldErrors.bank_branch}
                      </span>
                    )}
                  </label>

                  {/* INDIA SPECIFIC: IFSC Code */}
                  {countryConfig?.formType === "IN" && (
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">
                        IFSC Code <span className="text-red-500">*</span>
                      </span>
                      <input
                        type="text"
                        value={form.ifsc_code}
                        onChange={(e) => {
                          const val = e.target.value
                            .replace(/[^A-Za-z0-9]/g, "")
                            .toUpperCase()
                            .slice(0, 11);
                          setForm((f) => ({ ...f, ifsc_code: val }));
                          clearFieldError("ifsc_code");
                        }}
                        onKeyDown={handleAlphanumericKeyDown("ifsc_code", "IFSC code")}
                        onPaste={handleAlphanumericPaste("ifsc_code", "IFSC code")}
                        className={fieldClass}
                        placeholder={countryConfig.routingPlaceholder}
                        autoCapitalize="characters"
                        maxLength={11}
                        aria-invalid={Boolean(fieldErrors.ifsc_code)}
                      />
                      <span className="mt-1 block text-[11px] text-slate-400">
                        {countryConfig.routingHelp}
                      </span>
                      {fieldErrors.ifsc_code && (
                        <span className="mt-1 block text-xs text-red-600">
                          {fieldErrors.ifsc_code}
                        </span>
                      )}
                    </label>
                  )}

                  {/* AUSTRALIA SPECIFIC: BSB Number */}
                  {countryConfig?.formType === "AU" && (
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">
                        BSB Number <span className="text-red-500">*</span>
                      </span>
                      <input
                        type="text"
                        value={form.bsb_number}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^\d-]/g, "").slice(0, 7);
                          setForm((f) => ({ ...f, bsb_number: val }));
                          clearFieldError("bsb_number");
                        }}
                        onKeyDown={(e) => {
                          if (
                            e.key === "-" ||
                            e.key === "Backspace" ||
                            e.key === "Tab" ||
                            e.key === "ArrowLeft" ||
                            e.key === "ArrowRight" ||
                            e.ctrlKey ||
                            e.metaKey
                          )
                            return;
                          if (!/^\d$/.test(e.key)) {
                            e.preventDefault();
                            setFieldErrors((prev) => ({
                              ...prev,
                              bsb_number: "BSB allows only digits (0–9) and hyphen.",
                            }));
                          }
                        }}
                        className={fieldClass}
                        placeholder={countryConfig.routingPlaceholder}
                        maxLength={7}
                        aria-invalid={Boolean(fieldErrors.bsb_number)}
                      />
                      <span className="mt-1 block text-[11px] text-slate-400">
                        {countryConfig.routingHelp}
                      </span>
                      {fieldErrors.bsb_number && (
                        <span className="mt-1 block text-xs text-red-600">
                          {fieldErrors.bsb_number}
                        </span>
                      )}
                    </label>
                  )}

                  {/* USA SPECIFIC: ABA Routing Number */}
                  {countryConfig?.formType === "US" && (
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">
                        ABA Routing Number <span className="text-red-500">*</span>
                      </span>
                      <input
                        type="text"
                        value={form.aba_routing}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 9);
                          setForm((f) => ({ ...f, aba_routing: val }));
                          clearFieldError("aba_routing");
                        }}
                        onKeyDown={handleNumericKeyDown("aba_routing", "ABA routing number")}
                        onPaste={handleNumericPaste("aba_routing", "ABA routing number")}
                        className={fieldClass}
                        placeholder={countryConfig.routingPlaceholder}
                        maxLength={9}
                        aria-invalid={Boolean(fieldErrors.aba_routing)}
                      />
                      <span className="mt-1 block text-[11px] text-slate-400">
                        {countryConfig.routingHelp}
                      </span>
                      {fieldErrors.aba_routing && (
                        <span className="mt-1 block text-xs text-red-600">
                          {fieldErrors.aba_routing}
                        </span>
                      )}
                    </label>
                  )}

                  {/* UK SPECIFIC: Sort Code */}
                  {countryConfig?.formType === "GB" && (
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">
                        Sort Code <span className="text-red-500">*</span>
                      </span>
                      <input
                        type="text"
                        value={form.sort_code}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^\d-]/g, "").slice(0, 8);
                          setForm((f) => ({ ...f, sort_code: val }));
                          clearFieldError("sort_code");
                        }}
                        onKeyDown={(e) => {
                          if (
                            e.key === "-" ||
                            e.key === "Backspace" ||
                            e.key === "Tab" ||
                            e.key === "ArrowLeft" ||
                            e.key === "ArrowRight" ||
                            e.ctrlKey ||
                            e.metaKey
                          )
                            return;
                          if (!/^\d$/.test(e.key)) {
                            e.preventDefault();
                            setFieldErrors((prev) => ({
                              ...prev,
                              sort_code: "Sort code allows only digits (0–9) and hyphen.",
                            }));
                          }
                        }}
                        className={fieldClass}
                        placeholder={countryConfig.routingPlaceholder}
                        maxLength={8}
                        aria-invalid={Boolean(fieldErrors.sort_code)}
                      />
                      <span className="mt-1 block text-[11px] text-slate-400">
                        {countryConfig.routingHelp}
                      </span>
                      {fieldErrors.sort_code && (
                        <span className="mt-1 block text-xs text-red-600">
                          {fieldErrors.sort_code}
                        </span>
                      )}
                    </label>
                  )}

                  {/* CANADA SPECIFIC: Institution & Transit Numbers */}
                  {countryConfig?.formType === "CA" && (
                    <>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Institution Number <span className="text-red-500">*</span>
                        </span>
                        <input
                          type="text"
                          value={form.institution_number}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 3);
                            setForm((f) => ({ ...f, institution_number: val }));
                            clearFieldError("institution_number");
                          }}
                          onKeyDown={handleNumericKeyDown(
                            "institution_number",
                            "Institution number"
                          )}
                          onPaste={handleNumericPaste("institution_number", "Institution number")}
                          className={fieldClass}
                          placeholder={countryConfig.institutionPlaceholder}
                          maxLength={3}
                          aria-invalid={Boolean(fieldErrors.institution_number)}
                        />
                        <span className="mt-1 block text-[11px] text-slate-400">
                          {countryConfig.institutionHelp}
                        </span>
                        {fieldErrors.institution_number && (
                          <span className="mt-1 block text-xs text-red-600">
                            {fieldErrors.institution_number}
                          </span>
                        )}
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Transit Number <span className="text-red-500">*</span>
                        </span>
                        <input
                          type="text"
                          value={form.transit_number}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 5);
                            setForm((f) => ({ ...f, transit_number: val }));
                            clearFieldError("transit_number");
                          }}
                          onKeyDown={handleNumericKeyDown("transit_number", "Transit number")}
                          onPaste={handleNumericPaste("transit_number", "Transit number")}
                          className={fieldClass}
                          placeholder={countryConfig.transitPlaceholder}
                          maxLength={5}
                          aria-invalid={Boolean(fieldErrors.transit_number)}
                        />
                        <span className="mt-1 block text-[11px] text-slate-400">
                          {countryConfig.transitHelp}
                        </span>
                        {fieldErrors.transit_number && (
                          <span className="mt-1 block text-xs text-red-600">
                            {fieldErrors.transit_number}
                          </span>
                        )}
                      </label>
                    </>
                  )}

                  {/* DUAL ROUTING SPECIFIC: Bank Code & Branch Code (e.g. SG, HK, JP) */}
                  {countryConfig?.hasDualRouting && (
                    <>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          {countryConfig.bankCodeLabel || "Bank Code"}{" "}
                          <span className="text-red-500">*</span>
                        </span>
                        <input
                          type="text"
                          value={form.bank_code}
                          onChange={(e) => {
                            const val = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, countryConfig.bankCodeMax || 4);
                            setForm((f) => ({ ...f, bank_code: val }));
                            clearFieldError("bank_code");
                          }}
                          onKeyDown={handleNumericKeyDown(
                            "bank_code",
                            countryConfig.bankCodeLabel || "Bank Code"
                          )}
                          onPaste={handleNumericPaste(
                            "bank_code",
                            countryConfig.bankCodeLabel || "Bank Code"
                          )}
                          className={fieldClass}
                          placeholder={countryConfig.bankCodePlaceholder}
                          maxLength={countryConfig.bankCodeMax || 4}
                          aria-invalid={Boolean(fieldErrors.bank_code)}
                        />
                        <span className="mt-1 block text-[11px] text-slate-400">
                          {countryConfig.bankCodeHelp}
                        </span>
                        {fieldErrors.bank_code && (
                          <span className="mt-1 block text-xs text-red-600">
                            {fieldErrors.bank_code}
                          </span>
                        )}
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          {countryConfig.branchCodeLabel || "Branch Code"}{" "}
                          <span className="text-red-500">*</span>
                        </span>
                        <input
                          type="text"
                          value={form.branch_code}
                          onChange={(e) => {
                            const val = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, countryConfig.branchCodeLength || 3);
                            setForm((f) => ({ ...f, branch_code: val }));
                            clearFieldError("branch_code");
                          }}
                          onKeyDown={handleNumericKeyDown(
                            "branch_code",
                            countryConfig.branchCodeLabel || "Branch Code"
                          )}
                          onPaste={handleNumericPaste(
                            "branch_code",
                            countryConfig.branchCodeLabel || "Branch Code"
                          )}
                          className={fieldClass}
                          placeholder={countryConfig.branchCodePlaceholder}
                          maxLength={countryConfig.branchCodeLength || 3}
                          aria-invalid={Boolean(fieldErrors.branch_code)}
                        />
                        <span className="mt-1 block text-[11px] text-slate-400">
                          {countryConfig.branchCodeHelp}
                        </span>
                        {fieldErrors.branch_code && (
                          <span className="mt-1 block text-xs text-red-600">
                            {fieldErrors.branch_code}
                          </span>
                        )}
                      </label>
                    </>
                  )}

                  {/* GENERIC SINGLE ROUTING CODE (e.g. NZ, ZA, MX, MY, PH, TH, ID, KR, AR, CL, CO, PE, NG, KE, CN, VN) */}
                  {countryConfig?.routingLabel &&
                    !["IN", "AU", "US", "GB", "CA"].includes(countryConfig.formType) &&
                    !countryConfig.isIban &&
                    !countryConfig.hasDualRouting && (
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          {countryConfig.routingLabel} <span className="text-red-500">*</span>
                        </span>
                        <input
                          type="text"
                          value={form.routing_code}
                          onChange={(e) => {
                            const val = (
                              countryConfig.routingType === "numeric"
                                ? e.target.value.replace(/\D/g, "")
                                : e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
                            ).slice(0, countryConfig.routingMax || 12);
                            setForm((f) => ({ ...f, routing_code: val }));
                            clearFieldError("routing_code");
                          }}
                          onKeyDown={
                            countryConfig.routingType === "numeric"
                              ? handleNumericKeyDown("routing_code", countryConfig.routingLabel)
                              : handleAlphanumericKeyDown(
                                  "routing_code",
                                  countryConfig.routingLabel
                                )
                          }
                          onPaste={
                            countryConfig.routingType === "numeric"
                              ? handleNumericPaste("routing_code", countryConfig.routingLabel)
                              : handleAlphanumericPaste("routing_code", countryConfig.routingLabel)
                          }
                          className={fieldClass}
                          placeholder={countryConfig.routingPlaceholder}
                          maxLength={countryConfig.routingMax || 12}
                          aria-invalid={Boolean(fieldErrors.routing_code)}
                        />
                        <span className="mt-1 block text-[11px] text-slate-400">
                          {countryConfig.routingHelp}
                        </span>
                        {fieldErrors.routing_code && (
                          <span className="mt-1 block text-xs text-red-600">
                            {fieldErrors.routing_code}
                          </span>
                        )}
                      </label>
                    )}

                  {/* IBAN and Confirm IBAN (for SEPA and International IBAN countries) */}
                  {countryConfig?.isIban ||
                  countryConfig?.formType === "SEPA" ||
                  countryConfig?.formType === "IBAN" ? (
                    <>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          IBAN <span className="text-red-500">*</span>
                        </span>
                        <input
                          type="text"
                          value={form.iban}
                          onChange={handleAccountNumberChange("iban")}
                          onKeyDown={handleAlphanumericKeyDown("iban", "IBAN")}
                          onPaste={handleAlphanumericPaste("iban", "IBAN")}
                          className={fieldClass}
                          placeholder={
                            saved?.configured
                              ? `•••• ${saved.account_last4} (leave blank to keep)`
                              : countryConfig.ibanPlaceholder
                          }
                          autoCapitalize="characters"
                          maxLength={34}
                          aria-invalid={Boolean(fieldErrors.iban)}
                        />
                        <span className="mt-1 block text-[11px] text-slate-400">
                          {countryConfig.ibanHelp}
                        </span>
                        {fieldErrors.iban && (
                          <span className="mt-1 block text-xs text-red-600">
                            {fieldErrors.iban}
                          </span>
                        )}
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Confirm IBAN{" "}
                          {!saved?.configured || form.iban ? (
                            <span className="text-red-500">*</span>
                          ) : (
                            <span className="text-xs font-normal text-slate-400">
                              (optional if unchanged)
                            </span>
                          )}
                        </span>
                        <input
                          type="text"
                          value={form.confirm_iban}
                          onChange={handleAccountNumberChange("confirm_iban")}
                          onKeyDown={handleAlphanumericKeyDown("confirm_iban", "Confirm IBAN")}
                          onPaste={handleAlphanumericPaste("confirm_iban", "Confirm IBAN")}
                          className={fieldClass}
                          placeholder="Re-enter your IBAN"
                          autoCapitalize="characters"
                          maxLength={34}
                          aria-invalid={Boolean(fieldErrors.confirm_iban)}
                        />
                        {fieldErrors.confirm_iban && (
                          <span className="mt-1 block text-xs text-red-600">
                            {fieldErrors.confirm_iban}
                          </span>
                        )}
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          BIC / SWIFT{" "}
                          <span className="text-xs font-normal text-slate-400">
                            (optional for domestic/SEPA)
                          </span>
                        </span>
                        <input
                          type="text"
                          value={form.bic_swift}
                          onChange={(e) => {
                            const val = e.target.value
                              .replace(/[^A-Za-z0-9]/g, "")
                              .toUpperCase()
                              .slice(0, 11);
                            setForm((f) => ({ ...f, bic_swift: val }));
                            clearFieldError("bic_swift");
                          }}
                          onKeyDown={handleAlphanumericKeyDown("bic_swift", "BIC / SWIFT code")}
                          onPaste={handleAlphanumericPaste("bic_swift", "BIC / SWIFT code")}
                          className={fieldClass}
                          placeholder="e.g. DEUTDEDD or DEUTDEDDXXX"
                          autoCapitalize="characters"
                          maxLength={11}
                          aria-invalid={Boolean(fieldErrors.bic_swift)}
                        />
                        <span className="mt-1 block text-[11px] text-slate-400">
                          8 or 11 characters.
                        </span>
                        {fieldErrors.bic_swift && (
                          <span className="mt-1 block text-xs text-red-600">
                            {fieldErrors.bic_swift}
                          </span>
                        )}
                      </label>
                    </>
                  ) : (
                    /* NON-IBAN Standard Account Number & Confirmation */
                    <>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          {countryConfig?.accountNumberLabel || "Account number"}{" "}
                          <span className="text-red-500">*</span>
                        </span>
                        <input
                          type="text"
                          inputMode={
                            countryConfig?.accountNumberType === "numeric" ? "numeric" : "text"
                          }
                          pattern={
                            countryConfig?.accountNumberType === "numeric" ? "[0-9]*" : undefined
                          }
                          value={form.account_number}
                          onChange={(e) => {
                            const raw =
                              countryConfig?.accountNumberType === "numeric"
                                ? e.target.value.replace(/\D/g, "")
                                : e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
                            const max = countryConfig?.accountNumberMax || 34;
                            const val = raw.slice(0, max);

                            // Optional auto-fill for standardized national accounts
                            let autoRouting = form.routing_code;
                            if (selectedCountry === "MX" && !form.routing_code && val.length >= 3) {
                              autoRouting = val.slice(0, 3);
                            } else if (
                              selectedCountry === "AR" &&
                              !form.routing_code &&
                              val.length >= 8
                            ) {
                              autoRouting = val.slice(0, 8);
                            } else if (
                              selectedCountry === "PE" &&
                              !form.routing_code &&
                              val.length >= 6
                            ) {
                              autoRouting = val.slice(0, 6);
                            }

                            setForm((f) => ({
                              ...f,
                              account_number: val,
                              ...(autoRouting !== form.routing_code
                                ? { routing_code: autoRouting }
                                : {}),
                            }));
                            clearFieldError("account_number");
                          }}
                          onKeyDown={
                            countryConfig?.accountNumberType === "numeric"
                              ? handleNumericKeyDown(
                                  "account_number",
                                  countryConfig?.accountNumberLabel ||
                                    `${countryConfig?.name || "This country's"} account number`
                                )
                              : handleAlphanumericKeyDown(
                                  "account_number",
                                  countryConfig?.accountNumberLabel ||
                                    `${countryConfig?.name || "This country's"} account number`
                                )
                          }
                          onPaste={
                            countryConfig?.accountNumberType === "numeric"
                              ? handleNumericPaste(
                                  "account_number",
                                  countryConfig?.accountNumberLabel ||
                                    `${countryConfig?.name || "This country's"} account number`
                                )
                              : handleAlphanumericPaste(
                                  "account_number",
                                  countryConfig?.accountNumberLabel ||
                                    `${countryConfig?.name || "This country's"} account number`
                                )
                          }
                          className={fieldClass}
                          placeholder={
                            saved?.configured
                              ? `•••• ${saved.account_last4} (leave blank to keep)`
                              : countryConfig?.accountNumberPlaceholder ||
                                "Enter bank account number"
                          }
                          autoComplete="off"
                          maxLength={countryConfig?.accountNumberMax || 34}
                          aria-invalid={Boolean(fieldErrors.account_number)}
                        />
                        {countryConfig?.accountNumberHelp && (
                          <span className="mt-1 block text-[11px] text-slate-400">
                            {countryConfig.accountNumberHelp}
                          </span>
                        )}
                        {fieldErrors.account_number && (
                          <span className="mt-1 block text-xs text-red-600">
                            {fieldErrors.account_number}
                          </span>
                        )}
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Confirm{" "}
                          {countryConfig?.accountNumberLabel?.toLowerCase() || "account number"}{" "}
                          {!saved?.configured || form.account_number ? (
                            <span className="text-red-500">*</span>
                          ) : (
                            <span className="text-xs font-normal text-slate-400">
                              (optional if unchanged)
                            </span>
                          )}
                        </span>
                        <input
                          type="text"
                          inputMode={
                            countryConfig?.accountNumberType === "numeric" ? "numeric" : "text"
                          }
                          pattern={
                            countryConfig?.accountNumberType === "numeric" ? "[0-9]*" : undefined
                          }
                          value={form.confirm_account_number}
                          onChange={(e) => {
                            const raw =
                              countryConfig?.accountNumberType === "numeric"
                                ? e.target.value.replace(/\D/g, "")
                                : e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
                            const max = countryConfig?.accountNumberMax || 34;
                            setForm((f) => ({ ...f, confirm_account_number: raw.slice(0, max) }));
                            clearFieldError("confirm_account_number");
                          }}
                          onKeyDown={
                            countryConfig?.accountNumberType === "numeric"
                              ? handleNumericKeyDown(
                                  "confirm_account_number",
                                  `Confirm ${countryConfig?.accountNumberLabel?.toLowerCase() || "account number"}`
                                )
                              : handleAlphanumericKeyDown(
                                  "confirm_account_number",
                                  `Confirm ${countryConfig?.accountNumberLabel?.toLowerCase() || "account number"}`
                                )
                          }
                          onPaste={
                            countryConfig?.accountNumberType === "numeric"
                              ? handleNumericPaste(
                                  "confirm_account_number",
                                  `Confirm ${countryConfig?.accountNumberLabel?.toLowerCase() || "account number"}`
                                )
                              : handleAlphanumericPaste(
                                  "confirm_account_number",
                                  `Confirm ${countryConfig?.accountNumberLabel?.toLowerCase() || "account number"}`
                                )
                          }
                          className={fieldClass}
                          placeholder={`Re-enter ${countryConfig?.accountNumberLabel?.toLowerCase() || "bank account number"}`}
                          autoComplete="off"
                          maxLength={countryConfig?.accountNumberMax || 34}
                          aria-invalid={Boolean(fieldErrors.confirm_account_number)}
                        />
                        {fieldErrors.confirm_account_number && (
                          <span className="mt-1 block text-xs text-red-600">
                            {fieldErrors.confirm_account_number}
                          </span>
                        )}
                      </label>
                    </>
                  )}

                  {/* ACCOUNT TYPE (when supported by country e.g. US, IN, JP, ZA, CL, CO) */}
                  {countryConfig?.hasAccountType && (
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">
                        Account type
                      </span>
                      <select
                        value={form.account_type}
                        onChange={setField("account_type")}
                        className={fieldClass}
                      >
                        {countryConfig.accountTypes.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <span className="mt-1 block text-[11px] text-slate-400">
                        Payout routing preference for {countryConfig.name}.
                      </span>
                    </label>
                  )}

                  {/* Currency Selection */}
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Currency <span className="text-red-500">*</span>
                    </span>
                    {countryConfig?.currencies?.length > 1 ? (
                      <select
                        value={form.currency}
                        onChange={setField("currency")}
                        className={fieldClass}
                      >
                        {countryConfig.currencies.map((curr) => (
                          <option key={curr} value={curr}>
                            {curr}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={form.currency}
                        readOnly
                        className={`${fieldClass} bg-slate-50 cursor-not-allowed font-medium text-slate-600`}
                      />
                    )}
                  </label>
                </div>

                <p className="text-xs text-slate-500">
                  Your full account number is stored securely and never shown in full in the
                  browser.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={saving || (selectedCountry && !isConfigured)}
                className="rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600/90 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                {saving ? "Saving…" : "Save bank details"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : saved?.configured ? (
          /* Configured View (Displaying saved bank account details) */
          <>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Account holder</dt>
                <dd className="font-medium text-slate-800">{saved.account_holder_name}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Bank</dt>
                <dd className="font-medium text-slate-800">
                  {saved.bank_name && saved.bank_name !== "Bank" ? saved.bank_name : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Account</dt>
                <dd className="font-medium text-slate-800">•••• {saved.account_last4}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Routing / Clearing code</dt>
                <dd className="font-medium text-slate-800">{saved.routing_code}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Currency</dt>
                <dd className="font-medium text-slate-800">{saved.currency}</dd>
              </div>
            </dl>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={startEdit}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={saving}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60 cursor-pointer"
              >
                Remove
              </button>
            </div>
          </>
        ) : (
          /* Empty State */
          <>
            <p className="text-sm text-slate-700">No bank account added.</p>
            <button
              type="button"
              onClick={startEdit}
              className="rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600/90 cursor-pointer"
            >
              Add bank account
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function StripeSettings() {
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState({
    publishable_key: "",
    secret_key: "",
    webhook_secret: "",
  });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let cancelled = false;
    apiGet("/api/v1/payments/stripe/connect/").then((res) => {
      if (cancelled) return;
      if (res.ok) setStatus(res.data);
      else setError(res.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Sends the keys; the server checks them with Stripe before connecting
  const connect = async (e) => {
    e.preventDefault();
    setWorking(true);
    setError("");
    setFieldErrors({});
    const res = await apiPost("/api/v1/payments/stripe/connect/", form);
    setWorking(false);
    if (!res.ok) {
      setFieldErrors(res.fieldErrors || {});
      setError(res.formError || (Object.keys(res.fieldErrors || {}).length ? "" : res.error));
      return;
    }
    setStatus(res.data);
    setForm({ publishable_key: "", secret_key: "", webhook_secret: "" });
    setEditing(false);
  };

  const disconnect = async () => {
    if (!window.confirm("Disconnect Stripe? Your store will stop taking card payments.")) return;
    setWorking(true);
    const res = await apiDelete("/api/v1/payments/stripe/connect/");
    setWorking(false);
    if (res.ok) setStatus(res.data);
    else setError(res.error);
  };

  const input = (key, label, props = {}) => (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        value={form[key]}
        onChange={set(key)}
        className={fieldClass}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={Boolean(fieldErrors[key])}
        {...props}
      />
      {fieldErrors[key] && (
        <span className="mt-1 block text-xs text-red-700">{fieldErrors[key]}</span>
      )}
    </label>
  );

  const connected = status?.connected;
  const ready = status?.charges_enabled;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-5">
        <h2 className="text-lg font-semibold text-ink">Stripe</h2>
        <p className="mt-1 text-sm text-slate-500">
          Accept cards and wallets at checkout. Enter the API keys from your Stripe dashboard
          (Developers → API keys). We check them with Stripe before connecting, and payments go
          straight to your own Stripe account.
        </p>
      </div>
      <div className="space-y-4 px-5 py-5">
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : editing || !connected ? (
          <form onSubmit={connect} className="space-y-4">
            {input("publishable_key", "Publishable key", {
              required: true,
              placeholder: "pk_live_… or pk_test_…",
            })}
            {input("secret_key", "Secret key", {
              required: true,
              type: "password",
              placeholder: "sk_live_… or sk_test_…",
            })}
            {input("webhook_secret", "Webhook signing secret (optional)", {
              type: "password",
              placeholder: "whsec_…",
            })}
            <p className="text-xs text-slate-500">
              Use matching keys (both test or both live). Your secret key is encrypted and never
              shown again. Leave the webhook secret blank and we'll register the webhook for you; if
              you add it yourself in Stripe, point it at the URL shown after connecting.
            </p>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={working}
                className="rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600/90 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                {working ? "Verifying with Stripe…" : "Verify and connect"}
              </button>
              {connected && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        ) : (
          <>
            <p className="text-sm text-slate-700">
              {ready
                ? `Connected in ${status.livemode ? "live" : "test"} mode. Your store can take card payments.`
                : "Keys verified, but this Stripe account can't take payments yet. Finish setting it up in your Stripe dashboard."}
            </p>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Publishable key</dt>
                <dd className="truncate font-medium text-slate-800">{status.publishable_key}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Secret key</dt>
                <dd className="font-medium text-slate-800">••••{status.secret_key_last4}</dd>
              </div>
            </dl>
            {!status.webhook_configured && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Webhook not set up, so payments can't be confirmed automatically.
                {status.webhook_url
                  ? ` In Stripe, add an endpoint for ${status.webhook_url} and paste its signing secret by updating your keys.`
                  : " The server's public URL isn't configured yet."}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
              >
                Update keys
              </button>
              <button
                type="button"
                onClick={disconnect}
                disabled={working}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60 cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
