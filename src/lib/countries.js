import {
  getCountries,
  getCountryCallingCode,
  isPossiblePhoneNumber,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
} from "libphonenumber-js";

// Regional indicator symbol offset for Unicode flag generation
function getCountryFlag(countryCode) {
  if (!countryCode || countryCode.length !== 2) return "🌐";
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

const regionNames =
  typeof Intl !== "undefined" && Intl.DisplayNames
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

// Dynamically generate all countries worldwide using libphonenumber-js & Intl
export const ALL_COUNTRIES = getCountries()
  .map((code) => {
    const name = regionNames?.of(code) || code;
    let callingCode = "";
    try {
      callingCode = `+${getCountryCallingCode(code)}`;
    } catch {
      callingCode = "";
    }
    return {
      code,
      name,
      callingCode,
      flag: getCountryFlag(code),
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

// Default country fallback
export const DEFAULT_COUNTRY = ALL_COUNTRIES.find((c) => c.code === "AU") ||
  ALL_COUNTRIES[0] || {
    code: "AU",
    name: "Australia",
    callingCode: "+61",
    flag: "🇦🇺",
  };

/**
 * Find country by name, ISO-2 code, or common aliases.
 */
export function findCountry(query) {
  if (!query) return DEFAULT_COUNTRY;
  const q = String(query).trim().toLowerCase();

  // Alias lookup
  if (q === "usa" || q === "united states of america" || q === "us") {
    return ALL_COUNTRIES.find((c) => c.code === "US") || DEFAULT_COUNTRY;
  }
  if (q === "uk" || q === "great britain" || q === "united kingdom" || q === "gb") {
    return ALL_COUNTRIES.find((c) => c.code === "GB") || DEFAULT_COUNTRY;
  }

  // Exact code match
  const byCode = ALL_COUNTRIES.find((c) => c.code.toLowerCase() === q);
  if (byCode) return byCode;

  // Exact name match
  const byName = ALL_COUNTRIES.find((c) => c.name.toLowerCase() === q);
  if (byName) return byName;

  // Calling code match (e.g. "+61" or "61")
  const cleanCalling = q.startsWith("+") ? q : `+${q}`;
  const byCalling = ALL_COUNTRIES.find((c) => c.callingCode === cleanCalling);
  if (byCalling) return byCalling;

  // Starts with match
  const byStarts = ALL_COUNTRIES.find((c) => c.name.toLowerCase().startsWith(q));
  if (byStarts) return byStarts;

  // Substring match
  const byContains = ALL_COUNTRIES.find((c) => c.name.toLowerCase().includes(q));
  if (byContains) return byContains;

  return DEFAULT_COUNTRY;
}

/**
 * Validate phone number according to country rules.
 * Phone is optional; if provided, it must be valid for the country.
 */
export function validatePhone(phone, countryCode) {
  if (!phone || !phone.trim()) {
    return { isValid: true };
  }

  const clean = phone.trim();
  const country = ALL_COUNTRIES.find((c) => c.code === countryCode) || DEFAULT_COUNTRY;
  const callingCode = country.callingCode;

  try {
    // 1. Try direct check with country
    if (isValidPhoneNumber(clean, countryCode)) {
      return { isValid: true };
    }

    // 2. Try with country code prefix
    const withPrefix = clean.startsWith("+") ? clean : `${callingCode}${clean}`;
    if (isValidPhoneNumber(withPrefix, countryCode) || isValidPhoneNumber(withPrefix)) {
      return { isValid: true };
    }

    // 3. Fallback to isPossiblePhoneNumber
    if (
      isPossiblePhoneNumber(clean, countryCode) ||
      isPossiblePhoneNumber(withPrefix, countryCode)
    ) {
      return { isValid: true };
    }
  } catch {
    // If parsing throws on very strange input
  }

  return {
    isValid: false,
    error: `Please enter a valid phone number for ${country.name} (${callingCode}).`,
  };
}

/**
 * Format phone for saving: ensures calling code is attached.
 */
export function formatPhoneForSave(phone, countryCode) {
  if (!phone || !phone.trim()) return "";
  const clean = phone.trim();
  const country = ALL_COUNTRIES.find((c) => c.code === countryCode) || DEFAULT_COUNTRY;

  try {
    const parsed = parsePhoneNumberFromString(clean, countryCode);
    if (parsed && parsed.isValid()) {
      return parsed.formatInternational();
    }
    const withPrefix = clean.startsWith("+") ? clean : `${country.callingCode} ${clean}`;
    const parsedPrefix = parsePhoneNumberFromString(withPrefix, countryCode);
    if (parsedPrefix && parsedPrefix.isValid()) {
      return parsedPrefix.formatInternational();
    }
  } catch {}

  // Fallback if not strictly parseable
  if (clean.startsWith("+")) return clean;
  return `${country.callingCode} ${clean}`;
}

/**
 * Parse an existing stored phone into national number and country.
 */
export function parseStoredPhone(storedPhone, savedCountryName = "Australia") {
  const defaultC = findCountry(savedCountryName);
  if (!storedPhone || !storedPhone.trim()) {
    return { nationalNumber: "", country: defaultC };
  }

  const clean = storedPhone.trim();

  try {
    // If starts with +, parse country from it
    if (clean.startsWith("+")) {
      const parsed = parsePhoneNumberFromString(clean);
      if (parsed) {
        const matchedCountry = ALL_COUNTRIES.find((c) => c.code === parsed.country) || defaultC;
        return {
          nationalNumber: parsed.nationalNumber || clean,
          country: matchedCountry,
        };
      }
    }

    // Try parsing with default country
    const parsedWithCountry = parsePhoneNumberFromString(clean, defaultC.code);
    if (parsedWithCountry) {
      return {
        nationalNumber: parsedWithCountry.nationalNumber || clean,
        country: defaultC,
      };
    }
  } catch {}

  // Strip calling code if manually prefixed (e.g. "+61 412345678" -> "412345678")
  if (clean.startsWith(defaultC.callingCode)) {
    const stripped = clean.slice(defaultC.callingCode.length).trim();
    return { nationalNumber: stripped, country: defaultC };
  }

  return { nationalNumber: clean, country: defaultC };
}
