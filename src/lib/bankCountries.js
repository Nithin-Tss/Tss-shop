/**
 * Bank Country Configurations, Mathematical Checksums, and Validation Rules.
 *
 * All functions map clean country-specific banking fields to the existing API schema:
 * { account_holder_name, bank_name, account_number, routing_code, currency }
 *
 * DOES NOT MODIFY OR ASSUME ANY POSTGRESQL CHANGES.
 */

// ISO 13616 standard IBAN lengths for SEPA / international countries
export const IBAN_LENGTHS = {
  AL: 28,
  AD: 24,
  AT: 20,
  AZ: 28,
  BH: 22,
  BY: 28,
  BE: 16,
  BA: 20,
  BR: 29,
  BG: 22,
  CR: 22,
  HR: 21,
  CY: 28,
  CZ: 24,
  DK: 18,
  DO: 28,
  EE: 20,
  EG: 29,
  FO: 18,
  FI: 18,
  FR: 27,
  GE: 22,
  DE: 22,
  GI: 23,
  GR: 27,
  GL: 18,
  GT: 28,
  HU: 28,
  IS: 26,
  IE: 22,
  IL: 23,
  IT: 27,
  JO: 30,
  KZ: 20,
  XK: 20,
  KW: 30,
  LV: 21,
  LB: 28,
  LI: 21,
  LT: 20,
  LU: 20,
  MK: 19,
  MT: 31,
  MR: 27,
  MU: 30,
  MD: 24,
  MC: 27,
  ME: 22,
  NL: 18,
  NO: 15,
  PK: 24,
  PS: 29,
  PL: 28,
  PT: 25,
  QA: 29,
  RO: 24,
  LC: 32,
  SM: 27,
  ST: 25,
  SA: 24,
  RS: 22,
  SC: 31,
  SK: 24,
  SI: 19,
  ES: 24,
  SE: 24,
  CH: 21,
  TL: 23,
  TN: 24,
  TR: 26,
  UA: 29,
  AE: 23,
  GB: 22,
  VA: 22,
  VG: 24,
};

// Recognized SEPA country codes
export const SEPA_COUNTRIES = new Set([
  "AT",
  "BE",
  "BG",
  "CH",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GR",
  "HR",
  "HU",
  "IE",
  "IS",
  "IT",
  "LI",
  "LT",
  "LU",
  "LV",
  "MC",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
  "SM",
  "VA",
]);

/**
 * Validates a 9-digit US ABA routing transit number using the Federal Reserve Mod-10 checksum algorithm.
 * Weight vector: [3, 7, 1, 3, 7, 1, 3, 7, 1]
 * Checksum: (3*(d1+d4+d7) + 7*(d2+d5+d8) + (d3+d6+d9)) % 10 === 0
 */
export function validateAbaRouting(routing) {
  if (!routing) return { isValid: false, error: "ABA routing number is required." };
  const clean = String(routing).replace(/[\s-]/g, "");
  if (!/^\d{9}$/.test(clean)) {
    return { isValid: false, error: "ABA routing number must be exactly 9 digits." };
  }
  const d = clean.split("").map(Number);
  const sum = 3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8]);
  if (sum % 10 !== 0) {
    return {
      isValid: false,
      error: "Invalid ABA routing number checksum. Please check for typos.",
    };
  }
  return { isValid: true, normalized: clean };
}

/**
 * Validates an IBAN using the ISO 7064 / ISO 13616 Mod 97-10 algorithm.
 * Uses integer chunking to safely compute modulo on arbitrarily long numeric strings in JavaScript.
 */
export function validateIban(iban, expectedCountryCode) {
  if (!iban) return { isValid: false, error: "IBAN is required." };
  const clean = String(iban).replace(/[\s-]/g, "").toUpperCase();

  if (clean.length < 15 || clean.length > 34) {
    return { isValid: false, error: "IBAN must be between 15 and 34 characters." };
  }

  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(clean)) {
    return {
      isValid: false,
      error: "IBAN must begin with a 2-letter country code followed by 2 digits.",
    };
  }

  const ibanCountry = clean.substring(0, 2);
  if (expectedCountryCode && ibanCountry !== expectedCountryCode.toUpperCase()) {
    return {
      isValid: false,
      error: `IBAN prefix (${ibanCountry}) must match the selected country (${expectedCountryCode}).`,
    };
  }

  const expectedLength = IBAN_LENGTHS[ibanCountry];
  if (expectedLength && clean.length !== expectedLength) {
    return {
      isValid: false,
      error: `${ibanCountry} IBAN must be exactly ${expectedLength} characters (entered ${clean.length}).`,
    };
  }

  // Move the first 4 characters to the end
  const rearranged = clean.substring(4) + clean.substring(0, 4);

  // Convert letters to numbers (A=10 ... Z=35)
  let numericString = "";
  for (let i = 0; i < rearranged.length; i++) {
    const code = rearranged.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      numericString += (code - 55).toString();
    } else if (code >= 48 && code <= 57) {
      numericString += rearranged[i];
    } else {
      return { isValid: false, error: "IBAN contains invalid characters." };
    }
  }

  // Modulo 97 chunking algorithm
  let remainder = 0;
  for (let i = 0; i < numericString.length; i += 7) {
    const chunk = remainder.toString() + numericString.substring(i, i + 7);
    remainder = parseInt(chunk, 10) % 97;
  }

  if (remainder !== 1) {
    return { isValid: false, error: "Invalid IBAN checksum. Please check for typos." };
  }

  return { isValid: true, normalized: clean };
}

/**
 * Validates Indian Financial System Code (IFSC).
 * 11 characters: 4 letters (bank), '0', 6 alphanumeric characters.
 */
export function validateIfsc(ifsc) {
  if (!ifsc) return { isValid: false, error: "IFSC code is required." };
  const clean = String(ifsc).replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(clean)) {
    return {
      isValid: false,
      error:
        "IFSC code must be 11 characters: 4 letters, 0, and 6 alphanumeric characters (e.g. HDFC0001234).",
    };
  }
  return { isValid: true, normalized: clean };
}

/**
 * Validates Australian Bank State Branch (BSB) code.
 * 6 digits (e.g. 123-456 or 123456).
 */
export function validateBsb(bsb) {
  if (!bsb) return { isValid: false, error: "BSB number is required." };
  const clean = String(bsb).replace(/[\s-]/g, "");
  if (!/^\d{6}$/.test(clean)) {
    return { isValid: false, error: "BSB must be 6 digits (e.g. 123-456 or 123456)." };
  }
  return { isValid: true, normalized: clean };
}

/**
 * Validates UK Sort Code.
 * 6 digits (e.g. 12-34-56 or 123456).
 */
export function validateSortCode(sortCode) {
  if (!sortCode) return { isValid: false, error: "Sort code is required." };
  const clean = String(sortCode).replace(/[\s-]/g, "");
  if (!/^\d{6}$/.test(clean)) {
    return { isValid: false, error: "Sort code must be 6 digits (e.g. 12-34-56 or 123456)." };
  }
  return { isValid: true, normalized: clean };
}

/**
 * Validates Canadian Institution (3 digits) and Transit (5 digits) numbers.
 */
export function validateCanadaBankCodes(transit, institution) {
  const cleanTransit = String(transit || "").replace(/\D/g, "");
  const cleanInst = String(institution || "").replace(/\D/g, "");
  const errors = {};

  if (!cleanInst) {
    errors.institution_number = "Institution number is required.";
  } else if (!/^\d{3}$/.test(cleanInst)) {
    errors.institution_number = "Institution number must be exactly 3 digits (e.g. 004).";
  }

  if (!cleanTransit) {
    errors.transit_number = "Transit number is required.";
  } else if (!/^\d{5}$/.test(cleanTransit)) {
    errors.transit_number = "Transit / branch number must be exactly 5 digits (e.g. 12345).";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalized: { transit: cleanTransit, institution: cleanInst },
  };
}

/**
 * Validates Dual Bank Codes (e.g. Singapore, Hong Kong, Japan Bank Code + Branch Code).
 */
export function validateDualBankCodes(bankCode, branchCode, config) {
  const cleanBank = String(bankCode || "").replace(/\D/g, "");
  const cleanBranch = String(branchCode || "").replace(/\D/g, "");
  const errors = {};

  const minBank = config.bankCodeMin || 3;
  const maxBank = config.bankCodeMax || 4;

  if (!cleanBank) {
    errors.bank_code = `${config.bankCodeLabel || "Bank code"} is required.`;
  } else if (cleanBank.length < minBank || cleanBank.length > maxBank) {
    errors.bank_code = `${config.bankCodeLabel || "Bank code"} must be ${
      minBank === maxBank ? minBank : `${minBank}–${maxBank}`
    } digits (entered ${cleanBank.length}).`;
  }

  const branchLen = config.branchCodeLength || 3;
  if (!cleanBranch) {
    errors.branch_code = `${config.branchCodeLabel || "Branch code"} is required.`;
  } else if (cleanBranch.length !== branchLen) {
    errors.branch_code = `${config.branchCodeLabel || "Branch code"} must be ${branchLen} digits (entered ${cleanBranch.length}).`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalized: { bankCode: cleanBank, branchCode: cleanBranch },
  };
}

/**
 * Validates Generic Single Routing Code for countries using local clearing codes.
 */
export function validateGenericRouting(routing, config) {
  const label = config.routingLabel || "Routing code";
  if (!routing || !String(routing).trim()) {
    return { isValid: false, error: `${label} is required.` };
  }
  const clean = String(routing).replace(/[\s-]/g, "");

  if (config.routingType === "numeric") {
    if (/\D/.test(clean)) {
      return { isValid: false, error: `${label} must contain only numeric digits.` };
    }
    const min = config.routingMin || 3;
    const max = config.routingMax || 12;
    if (min === max && clean.length !== min) {
      return {
        isValid: false,
        error: `${label} must be exactly ${min} digits (entered ${clean.length}).`,
      };
    }
    if (clean.length < min || clean.length > max) {
      return {
        isValid: false,
        error: `${label} must be between ${min} and ${max} digits (entered ${clean.length}).`,
      };
    }
  } else {
    // Alphanumeric routing (e.g. SWIFT or clearing code)
    if (!/^[A-Za-z0-9]+$/.test(clean)) {
      return { isValid: false, error: `${label} allows only letters and digits.` };
    }
    const min = config.routingMin || 3;
    const max = config.routingMax || 20;
    if (clean.length < min || clean.length > max) {
      return {
        isValid: false,
        error: `${label} must be between ${min} and ${max} characters (entered ${clean.length}).`,
      };
    }
  }

  return { isValid: true, normalized: clean };
}

/**
 * Validates ISO 9362 BIC / SWIFT code (8 or 11 alphanumeric characters).
 */
export function validateBicSwift(bic, isRequired = false) {
  if (!bic || !String(bic).trim()) {
    if (isRequired) return { isValid: false, error: "BIC / SWIFT code is required." };
    return { isValid: true, normalized: "" };
  }
  const clean = String(bic).replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(clean)) {
    return {
      isValid: false,
      error: "BIC / SWIFT must be 8 or 11 characters (e.g. DEUTDEDD or DEUTDEDDXXX).",
    };
  }
  return { isValid: true, normalized: clean };
}

/**
 * Bank Country Metadata and Form Schema.
 */
export const CONFIGURED_BANK_COUNTRIES = {
  IN: {
    code: "IN",
    name: "India",
    currencies: ["INR"],
    defaultCurrency: "INR",
    formType: "IN",
    hasAccountType: true,
    accountTypes: [
      { label: "Savings Account", value: "savings" },
      { label: "Current Account", value: "current" },
    ],
    accountNumberType: "numeric",
    accountNumberMin: 9,
    accountNumberMax: 18,
    routingLabel: "IFSC Code",
    routingPlaceholder: "e.g. HDFC0001234",
    routingHelp: "11 characters (4 letters, 0, 6 alphanumeric).",
    accountNumberHelp: "9 to 18 numeric digits.",
  },
  AU: {
    code: "AU",
    name: "Australia",
    currencies: ["AUD"],
    defaultCurrency: "AUD",
    formType: "AU",
    accountNumberType: "numeric",
    accountNumberMin: 5,
    accountNumberMax: 10,
    routingLabel: "BSB Number",
    routingPlaceholder: "e.g. 062-000",
    routingHelp: "6 digits (e.g. 123-456).",
    accountNumberHelp: "5 to 10 numeric digits.",
  },
  US: {
    code: "US",
    name: "United States",
    currencies: ["USD"],
    defaultCurrency: "USD",
    formType: "US",
    hasAccountType: true,
    accountTypes: [
      { label: "Checking", value: "checking" },
      { label: "Savings", value: "savings" },
    ],
    accountNumberType: "numeric",
    accountNumberMin: 4,
    accountNumberMax: 17,
    routingLabel: "ABA Routing Number",
    routingPlaceholder: "e.g. 021000021",
    routingHelp: "9 digits with Federal Reserve checksum.",
    accountNumberHelp: "4 to 17 numeric digits.",
  },
  GB: {
    code: "GB",
    name: "United Kingdom",
    currencies: ["GBP"],
    defaultCurrency: "GBP",
    formType: "GB",
    accountNumberType: "numeric",
    accountNumberMin: 8,
    accountNumberMax: 8,
    routingLabel: "Sort Code",
    routingPlaceholder: "e.g. 20-00-00",
    routingHelp: "6 digits (e.g. 12-34-56).",
    accountNumberHelp: "Exactly 8 numeric digits.",
  },
  CA: {
    code: "CA",
    name: "Canada",
    currencies: ["CAD"],
    defaultCurrency: "CAD",
    formType: "CA",
    accountNumberType: "numeric",
    accountNumberMin: 7,
    accountNumberMax: 12,
    institutionLabel: "Institution Number",
    institutionPlaceholder: "e.g. 004",
    institutionHelp: "3 digits.",
    transitLabel: "Transit Number",
    transitPlaceholder: "e.g. 12345",
    transitHelp: "5 digits.",
    accountNumberHelp: "7 to 12 numeric digits.",
  },
  NZ: {
    code: "NZ",
    name: "New Zealand",
    currencies: ["NZD"],
    defaultCurrency: "NZD",
    formType: "NZ",
    accountNumberType: "numeric",
    accountNumberMin: 15,
    accountNumberMax: 16,
    routingLabel: "Bank & Branch Code",
    routingPlaceholder: "e.g. 12-3456",
    routingHelp: "6 digits (2-digit bank code + 4-digit branch code).",
    routingType: "numeric",
    routingMin: 6,
    routingMax: 6,
    accountNumberHelp: "15 or 16 numeric digits (Bank-Branch-Account-Suffix).",
  },
  SG: {
    code: "SG",
    name: "Singapore",
    currencies: ["SGD", "USD"],
    defaultCurrency: "SGD",
    formType: "SG",
    hasDualRouting: true,
    bankCodeLabel: "Bank Code",
    bankCodePlaceholder: "e.g. 7171",
    bankCodeHelp: "3 or 4 digits (e.g. 7171 for DBS, 7339 for OCBC).",
    bankCodeMin: 3,
    bankCodeMax: 4,
    branchCodeLabel: "Branch Code",
    branchCodePlaceholder: "e.g. 081",
    branchCodeHelp: "3 digits.",
    branchCodeLength: 3,
    accountNumberType: "numeric",
    accountNumberMin: 7,
    accountNumberMax: 12,
    accountNumberHelp: "7 to 12 numeric digits.",
  },
  HK: {
    code: "HK",
    name: "Hong Kong",
    currencies: ["HKD", "USD"],
    defaultCurrency: "HKD",
    formType: "HK",
    hasDualRouting: true,
    bankCodeLabel: "Clearing / Bank Code",
    bankCodePlaceholder: "e.g. 004",
    bankCodeHelp: "3 digits (e.g. 004 for HSBC).",
    bankCodeMin: 3,
    bankCodeMax: 3,
    branchCodeLabel: "Branch Code",
    branchCodePlaceholder: "e.g. 123",
    branchCodeHelp: "3 digits.",
    branchCodeLength: 3,
    accountNumberType: "numeric",
    accountNumberMin: 6,
    accountNumberMax: 12,
    accountNumberHelp: "6 to 9 (or up to 12) numeric digits.",
  },
  JP: {
    code: "JP",
    name: "Japan",
    currencies: ["JPY"],
    defaultCurrency: "JPY",
    formType: "JP",
    hasDualRouting: true,
    bankCodeLabel: "Bank Code (Zengin)",
    bankCodePlaceholder: "e.g. 0001",
    bankCodeHelp: "4 digits (e.g. 0001 for Mizuho).",
    bankCodeMin: 4,
    bankCodeMax: 4,
    branchCodeLabel: "Branch Code",
    branchCodePlaceholder: "e.g. 123",
    branchCodeHelp: "3 digits.",
    branchCodeLength: 3,
    hasAccountType: true,
    accountTypes: [
      { label: "Ordinary / Savings (Futsu)", value: "savings" },
      { label: "Current / Checking (Toza)", value: "checking" },
    ],
    accountNumberType: "numeric",
    accountNumberMin: 7,
    accountNumberMax: 8,
    accountNumberHelp: "7 numeric digits.",
  },
  MX: {
    code: "MX",
    name: "Mexico",
    currencies: ["MXN"],
    defaultCurrency: "MXN",
    formType: "MX",
    accountNumberLabel: "CLABE",
    accountNumberPlaceholder: "18-digit CLABE number",
    accountNumberType: "numeric",
    accountNumberMin: 18,
    accountNumberMax: 18,
    accountNumberHelp: "Exactly 18 numeric digits (Clave Bancaria Estandarizada).",
    routingLabel: "Bank Code",
    routingPlaceholder: "e.g. 002 (or auto-filled from CLABE)",
    routingHelp: "3-digit bank clearing code (first 3 digits of CLABE).",
    routingType: "numeric",
    routingMin: 3,
    routingMax: 3,
  },
  ZA: {
    code: "ZA",
    name: "South Africa",
    currencies: ["ZAR"],
    defaultCurrency: "ZAR",
    formType: "ZA",
    routingLabel: "Branch Code",
    routingPlaceholder: "e.g. 250655",
    routingHelp: "6 numeric digits.",
    routingType: "numeric",
    routingMin: 6,
    routingMax: 6,
    hasAccountType: true,
    accountTypes: [
      { label: "Current / Cheque", value: "checking" },
      { label: "Savings", value: "savings" },
    ],
    accountNumberType: "numeric",
    accountNumberMin: 7,
    accountNumberMax: 11,
    accountNumberHelp: "7 to 11 numeric digits.",
  },
  MY: {
    code: "MY",
    name: "Malaysia",
    currencies: ["MYR"],
    defaultCurrency: "MYR",
    formType: "MY",
    routingLabel: "SWIFT / Bank Code",
    routingPlaceholder: "e.g. MBBEMYKL",
    routingHelp: "8 or 11 characters BIC/SWIFT or bank code.",
    routingType: "alphanumeric",
    routingMin: 3,
    routingMax: 11,
    accountNumberType: "numeric",
    accountNumberMin: 9,
    accountNumberMax: 14,
    accountNumberHelp: "9 to 14 numeric digits.",
  },
  PH: {
    code: "PH",
    name: "Philippines",
    currencies: ["PHP"],
    defaultCurrency: "PHP",
    formType: "PH",
    routingLabel: "BRSTN Code",
    routingPlaceholder: "e.g. 010140015",
    routingHelp: "9-digit Bank Routing Symbol Transit Number.",
    routingType: "numeric",
    routingMin: 9,
    routingMax: 9,
    accountNumberType: "numeric",
    accountNumberMin: 10,
    accountNumberMax: 12,
    accountNumberHelp: "10 to 12 numeric digits.",
  },
  TH: {
    code: "TH",
    name: "Thailand",
    currencies: ["THB"],
    defaultCurrency: "THB",
    formType: "TH",
    routingLabel: "Bank Code",
    routingPlaceholder: "e.g. 004",
    routingHelp: "3-digit bank code (e.g. 004 for Kasikornbank).",
    routingType: "numeric",
    routingMin: 3,
    routingMax: 4,
    accountNumberType: "numeric",
    accountNumberMin: 10,
    accountNumberMax: 12,
    accountNumberHelp: "10 to 12 numeric digits.",
  },
  ID: {
    code: "ID",
    name: "Indonesia",
    currencies: ["IDR"],
    defaultCurrency: "IDR",
    formType: "ID",
    routingLabel: "Bank Code (BI Code)",
    routingPlaceholder: "e.g. 014",
    routingHelp: "3-digit Bank Indonesia code (e.g. 014 for BCA, 008 for Mandiri).",
    routingType: "numeric",
    routingMin: 3,
    routingMax: 3,
    accountNumberType: "numeric",
    accountNumberMin: 9,
    accountNumberMax: 18,
    accountNumberHelp: "9 to 18 numeric digits.",
  },
  KR: {
    code: "KR",
    name: "South Korea",
    currencies: ["KRW"],
    defaultCurrency: "KRW",
    formType: "KR",
    routingLabel: "Bank Code",
    routingPlaceholder: "e.g. 004",
    routingHelp: "2 or 3-digit bank code (e.g. 004 for Kookmin, 088 for Shinhan).",
    routingType: "numeric",
    routingMin: 2,
    routingMax: 3,
    accountNumberType: "numeric",
    accountNumberMin: 10,
    accountNumberMax: 16,
    accountNumberHelp: "10 to 16 numeric digits.",
  },
  AR: {
    code: "AR",
    name: "Argentina",
    currencies: ["ARS"],
    defaultCurrency: "ARS",
    formType: "AR",
    accountNumberLabel: "CBU",
    accountNumberPlaceholder: "22-digit CBU number",
    accountNumberType: "numeric",
    accountNumberMin: 22,
    accountNumberMax: 22,
    accountNumberHelp: "Exactly 22 numeric digits (Clave Bancaria Uniforme).",
    routingLabel: "Bank & Branch Prefix",
    routingPlaceholder: "e.g. 01700015 (first 8 digits of CBU)",
    routingHelp: "8-digit bank and branch identifier (first 8 digits of CBU).",
    routingType: "numeric",
    routingMin: 8,
    routingMax: 8,
  },
  CL: {
    code: "CL",
    name: "Chile",
    currencies: ["CLP"],
    defaultCurrency: "CLP",
    formType: "CL",
    routingLabel: "Bank Code",
    routingPlaceholder: "e.g. 001",
    routingHelp: "3-digit bank code.",
    routingType: "numeric",
    routingMin: 3,
    routingMax: 3,
    hasAccountType: true,
    accountTypes: [
      { label: "Cuenta Corriente (Checking)", value: "checking" },
      { label: "Cuenta Vista / RUT", value: "vista" },
      { label: "Cuenta de Ahorro (Savings)", value: "savings" },
    ],
    accountNumberType: "numeric",
    accountNumberMin: 8,
    accountNumberMax: 12,
    accountNumberHelp: "8 to 12 numeric digits.",
  },
  CO: {
    code: "CO",
    name: "Colombia",
    currencies: ["COP"],
    defaultCurrency: "COP",
    formType: "CO",
    routingLabel: "Bank Code",
    routingPlaceholder: "e.g. 007",
    routingHelp: "3 or 4-digit bank code.",
    routingType: "numeric",
    routingMin: 3,
    routingMax: 4,
    hasAccountType: true,
    accountTypes: [
      { label: "Cuenta de Ahorros (Savings)", value: "savings" },
      { label: "Cuenta Corriente (Checking)", value: "checking" },
    ],
    accountNumberType: "numeric",
    accountNumberMin: 10,
    accountNumberMax: 12,
    accountNumberHelp: "10 to 12 numeric digits.",
  },
  PE: {
    code: "PE",
    name: "Peru",
    currencies: ["PEN", "USD"],
    defaultCurrency: "PEN",
    formType: "PE",
    accountNumberLabel: "CCI",
    accountNumberPlaceholder: "20-digit CCI number",
    accountNumberType: "numeric",
    accountNumberMin: 20,
    accountNumberMax: 20,
    accountNumberHelp: "Exactly 20 numeric digits (Código de Cuenta Interbancario).",
    routingLabel: "Bank & Branch Prefix",
    routingPlaceholder: "e.g. 002194 (first 6 digits of CCI)",
    routingHelp: "6-digit bank & branch identifier (first 6 digits of CCI).",
    routingType: "numeric",
    routingMin: 6,
    routingMax: 6,
  },
  NG: {
    code: "NG",
    name: "Nigeria",
    currencies: ["NGN"],
    defaultCurrency: "NGN",
    formType: "NG",
    accountNumberLabel: "NUBAN",
    accountNumberPlaceholder: "10-digit NUBAN number",
    accountNumberType: "numeric",
    accountNumberMin: 10,
    accountNumberMax: 10,
    accountNumberHelp: "Exactly 10 numeric digits (Nigeria Uniform Bank Account Number).",
    routingLabel: "Bank / Sort Code",
    routingPlaceholder: "e.g. 058 or 058152",
    routingHelp: "3-digit bank code or 6-digit sort code.",
    routingType: "numeric",
    routingMin: 3,
    routingMax: 6,
  },
  KE: {
    code: "KE",
    name: "Kenya",
    currencies: ["KES"],
    defaultCurrency: "KES",
    formType: "KE",
    routingLabel: "Bank & Branch Code",
    routingPlaceholder: "e.g. 01001",
    routingHelp: "5-digit bank and branch clearing code.",
    routingType: "numeric",
    routingMin: 5,
    routingMax: 7,
    accountNumberType: "numeric",
    accountNumberMin: 10,
    accountNumberMax: 14,
    accountNumberHelp: "10 to 14 numeric digits.",
  },
  CN: {
    code: "CN",
    name: "China",
    currencies: ["CNY"],
    defaultCurrency: "CNY",
    formType: "CN",
    routingLabel: "CNAPS / Bank Code",
    routingPlaceholder: "e.g. 102100000010",
    routingHelp: "12-digit CNAPS clearing code or SWIFT code.",
    routingType: "alphanumeric",
    routingMin: 8,
    routingMax: 12,
    accountNumberType: "numeric",
    accountNumberMin: 16,
    accountNumberMax: 19,
    accountNumberHelp: "16 to 19 numeric digits.",
  },
  VN: {
    code: "VN",
    name: "Vietnam",
    currencies: ["VND"],
    defaultCurrency: "VND",
    formType: "VN",
    routingLabel: "CITAD / Bank Code",
    routingPlaceholder: "e.g. 01201001",
    routingHelp: "8-digit CITAD clearing code or bank code.",
    routingType: "numeric",
    routingMin: 8,
    routingMax: 8,
    accountNumberType: "numeric",
    accountNumberMin: 6,
    accountNumberMax: 19,
    accountNumberHelp: "6 to 19 numeric digits.",
  },
};

/**
 * Get configuration for a country code.
 */
export function getCountryBankConfig(code) {
  if (!code) return null;
  const upper = code.toUpperCase();
  if (CONFIGURED_BANK_COUNTRIES[upper]) {
    return CONFIGURED_BANK_COUNTRIES[upper];
  }
  if (IBAN_LENGTHS[upper]) {
    const isSepa = SEPA_COUNTRIES.has(upper);
    let currencies = ["EUR"];
    if (upper === "CH") currencies = ["CHF", "EUR"];
    else if (upper === "SE") currencies = ["SEK", "EUR"];
    else if (upper === "NO") currencies = ["NOK", "EUR"];
    else if (upper === "DK") currencies = ["DKK", "EUR"];
    else if (upper === "PL") currencies = ["PLN", "EUR"];
    else if (upper === "CZ") currencies = ["CZK", "EUR"];
    else if (upper === "HU") currencies = ["HUF", "EUR"];
    else if (upper === "RO") currencies = ["RON", "EUR"];
    else if (upper === "BG") currencies = ["BGN", "EUR"];
    else if (upper === "AE") currencies = ["AED", "USD"];
    else if (upper === "SA") currencies = ["SAR", "USD"];
    else if (upper === "QA") currencies = ["QAR", "USD"];
    else if (upper === "BH") currencies = ["BHD", "USD"];
    else if (upper === "KW") currencies = ["KWD", "USD"];
    else if (upper === "IL") currencies = ["ILS", "USD"];
    else if (upper === "TR") currencies = ["TRY", "USD", "EUR"];
    else if (upper === "BR") currencies = ["BRL", "USD"];
    else if (upper === "EG") currencies = ["EGP", "USD"];
    else if (upper === "PK") currencies = ["PKR", "USD"];
    else if (upper === "UA") currencies = ["UAH", "EUR", "USD"];
    else if (upper === "KZ") currencies = ["KZT", "USD"];
    else if (upper === "RS") currencies = ["RSD", "EUR"];
    else if (upper === "CR") currencies = ["CRC", "USD"];
    else if (upper === "DO") currencies = ["DOP", "USD"];
    else if (upper === "GT") currencies = ["GTQ", "USD"];
    else if (upper === "JO") currencies = ["JOD", "USD"];
    else if (upper === "LB") currencies = ["LBP", "USD"];
    else if (upper === "MD") currencies = ["MDL", "EUR"];
    else if (upper === "MK") currencies = ["MKD", "EUR"];
    else if (upper === "MU") currencies = ["MUR", "USD"];
    else if (upper === "TN") currencies = ["TND", "EUR"];
    else if (upper === "BA") currencies = ["BAM", "EUR"];
    else if (upper === "AL") currencies = ["ALL", "EUR"];
    else if (upper === "GE") currencies = ["GEL", "USD"];
    else if (upper === "AZ") currencies = ["AZN", "USD"];
    else if (upper === "BY") currencies = ["BYN", "USD"];

    return {
      code: upper,
      name: upper,
      currencies,
      defaultCurrency: currencies[0],
      formType: isSepa ? "SEPA" : "IBAN",
      isIban: true,
      isSepa,
      accountNumberType: "alphanumeric",
      ibanLength: IBAN_LENGTHS[upper],
      ibanPlaceholder: `e.g. ${upper}89... (${IBAN_LENGTHS[upper]} chars)`,
      ibanHelp: `Standardized ${upper} IBAN (${IBAN_LENGTHS[upper]} characters) with MOD-97 check digits.`,
    };
  }
  return null;
}

/**
 * Checks whether a given country code has a configured banking form.
 */
export function isCountryConfigured(code) {
  if (!code) return false;
  const upper = code.toUpperCase();
  return Boolean(CONFIGURED_BANK_COUNTRIES[upper] || IBAN_LENGTHS[upper]);
}

/**
 * Comprehensive Account Number Validation based on country configuration.
 */
export function validateAccountNumber(accountNumber, countryCode, isExistingAccount) {
  const config = getCountryBankConfig(countryCode);
  if (!config) {
    return {
      isValid: false,
      error: "Banking payout forms are not currently configured for this region.",
    };
  }

  const raw = String(accountNumber || "").trim();

  // If editing an existing account and left blank, preserve existing
  if (!raw) {
    if (isExistingAccount) {
      return { isValid: true, normalized: "" };
    }
    const label = config.accountNumberLabel || "Account number";
    return { isValid: false, error: `${label} is required.` };
  }

  // Country using IBAN
  if (config.isIban || config.formType === "SEPA" || config.formType === "IBAN") {
    return validateIban(raw, countryCode);
  }

  // Country with numeric-only bank account numbers
  if (config.accountNumberType === "numeric") {
    const label = config.accountNumberLabel || `${config.name} bank account number`;
    // Check for alphabets, special characters, symbols
    if (/\D/.test(raw)) {
      return {
        isValid: false,
        error: `${label} must contain only numeric digits (0–9). Letters and special characters are not allowed.`,
      };
    }

    if (config.accountNumberMin === config.accountNumberMax) {
      if (raw.length !== config.accountNumberMin) {
        return {
          isValid: false,
          error: `${label} must be exactly ${config.accountNumberMin} numeric digits (entered ${raw.length}).`,
        };
      }
    } else {
      if (raw.length < config.accountNumberMin || raw.length > config.accountNumberMax) {
        return {
          isValid: false,
          error: `${label} must be between ${config.accountNumberMin} and ${config.accountNumberMax} numeric digits (entered ${raw.length}).`,
        };
      }
    }

    return { isValid: true, normalized: raw };
  }

  return { isValid: true, normalized: raw };
}

/**
 * Validates Account Number Confirmation match.
 */
export function validateAccountConfirmation(
  accountNumber,
  confirmAccountNumber,
  formType,
  isExistingAccount
) {
  const acc = String(accountNumber || "").trim();
  const confirm = String(confirmAccountNumber || "").trim();

  // If editing an existing account and the account number was left blank to keep current:
  if (isExistingAccount && !acc) {
    return { isValid: true };
  }

  const isSepa = formType === "SEPA";
  const fieldLabel = isSepa ? "IBAN" : "account number";

  if (!confirm) {
    return { isValid: false, error: `Please confirm your ${fieldLabel}.` };
  }

  if (acc !== confirm) {
    return {
      isValid: false,
      error: isSepa ? "IBAN numbers do not match." : "Account numbers do not match.",
    };
  }

  return { isValid: true };
}

/**
 * Validates Account Holder Name:
 * - Mandatory for new accounts / non-empty on submit.
 * - Allows alphabetic characters (A–Z, a–z, accented letters), spaces, hyphens (-), and apostrophes (').
 * - Rejects numeric-only values (e.g. 123456, 1323131, 122222223333333333333).
 * - Rejects any numbers within names (e.g. John123).
 * - Rejects invalid special characters.
 * - Must contain at least one alphabetic letter.
 * - Max length 120 characters.
 */
export function validateAccountHolderName(name, _isExistingAccount = false) {
  const raw = String(name || "").trim();

  if (!raw) {
    return {
      isValid: false,
      error: "Account holder name is required.",
    };
  }

  if (raw.length > 120) {
    return {
      isValid: false,
      error: "Account holder name is too long (max 120 characters).",
    };
  }

  // Reject if it contains any digits
  if (/\d/.test(raw)) {
    return {
      isValid: false,
      error: "Please enter a valid account holder name.",
    };
  }

  // Reject if it contains characters other than letters, spaces, hyphens, and apostrophes
  if (/[^A-Za-z\u00C0-\u024F\s'’-]/.test(raw)) {
    return {
      isValid: false,
      error: "Please enter a valid account holder name.",
    };
  }

  // Must contain at least one alphabetic letter
  if (!/[A-Za-z\u00C0-\u024F]/.test(raw)) {
    return {
      isValid: false,
      error: "Please enter a valid account holder name.",
    };
  }

  return {
    isValid: true,
    normalized: raw.replace(/’/g, "'"),
  };
}

/**
 * Prepares the 5-field API payload without modifying existing backend contracts.
 * Handles optional bank name and branch fields cleanly.
 */
export function mapBankDetailsToApiPayload(
  countryCode,
  formData,
  isExistingAccount,
  existingSaved
) {
  const config = getCountryBankConfig(countryCode);
  if (!config) return null;

  const holder = String(formData.account_holder_name || "").trim();
  const rawBank = String(formData.bank_name || "").trim();
  const rawBranch = String(formData.bank_branch || "").trim();

  let bank = "";
  if (rawBank && rawBranch) {
    bank = `${rawBank} (${rawBranch})`;
  } else if (rawBank) {
    bank = rawBank;
  } else if (rawBranch) {
    bank = rawBranch;
  } else {
    // If both bank name and branch are empty, provide a clean fallback to satisfy backend's non-empty constraint
    bank = isExistingAccount && existingSaved?.bank_name ? existingSaved.bank_name : "Bank";
  }

  if (bank.length > 120) {
    bank = bank.slice(0, 120);
  }

  const currency = String(formData.currency || config.defaultCurrency || "USD")
    .trim()
    .toUpperCase();

  let accountNumber = "";
  let routingCode = "";

  if (config.isIban || config.formType === "SEPA" || config.formType === "IBAN") {
    accountNumber = String(formData.iban || "")
      .replace(/[\s-]/g, "")
      .toUpperCase();
    routingCode = String(formData.bic_swift || "")
      .replace(/[\s-]/g, "")
      .toUpperCase();
    if (!routingCode) {
      routingCode = `${countryCode}IBAN01`;
    }
  } else if (config.formType === "CA") {
    accountNumber = String(formData.account_number || "")
      .replace(/[\s-]/g, "")
      .toUpperCase();
    const transit = String(formData.transit_number || "").replace(/\D/g, "");
    const inst = String(formData.institution_number || "").replace(/\D/g, "");
    routingCode = `${transit}${inst}`;
  } else if (config.hasDualRouting) {
    accountNumber = String(formData.account_number || "")
      .replace(/[\s-]/g, "")
      .toUpperCase();
    const bankCode = String(formData.bank_code || "").replace(/\D/g, "");
    const branchCode = String(formData.branch_code || "").replace(/\D/g, "");
    routingCode = `${bankCode}${branchCode}`;
  } else if (config.formType === "AU") {
    accountNumber = String(formData.account_number || "")
      .replace(/[\s-]/g, "")
      .toUpperCase();
    routingCode = String(formData.bsb_number || "").replace(/[\s-]/g, "");
  } else if (config.formType === "IN") {
    accountNumber = String(formData.account_number || "")
      .replace(/[\s-]/g, "")
      .toUpperCase();
    routingCode = String(formData.ifsc_code || "")
      .replace(/[\s-]/g, "")
      .toUpperCase();
  } else if (config.formType === "US") {
    accountNumber = String(formData.account_number || "")
      .replace(/[\s-]/g, "")
      .toUpperCase();
    routingCode = String(formData.aba_routing || "").replace(/[\s-]/g, "");
  } else if (config.formType === "GB") {
    accountNumber = String(formData.account_number || "")
      .replace(/[\s-]/g, "")
      .toUpperCase();
    routingCode = String(formData.sort_code || "").replace(/[\s-]/g, "");
  } else {
    // Other configured countries with single routing code
    accountNumber = String(formData.account_number || "")
      .replace(/[\s-]/g, "")
      .toUpperCase();
    let rawRouting = String(formData.routing_code || "")
      .replace(/[\s-]/g, "")
      .toUpperCase();
    if (rawRouting.length < 4) {
      rawRouting = `${countryCode}${rawRouting}`;
    }
    routingCode = rawRouting;
  }

  // Ensure routingCode satisfies backend constraint [A-Z0-9]{4,20}
  if (!routingCode || routingCode.length < 4) {
    routingCode = `${countryCode}BANK01`;
  }
  if (routingCode.length > 20) {
    routingCode = routingCode.slice(0, 20);
  }

  // If editing an existing account and account number was left blank, send empty string so backend retains existing
  if (!accountNumber && isExistingAccount) {
    accountNumber = "";
  }

  return {
    account_holder_name: holder,
    bank_name: bank,
    account_number: accountNumber,
    routing_code: routingCode,
    currency,
  };
}
