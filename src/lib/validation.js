// Form rules shared by the auth pages. The backend checks the same rules
// (apps/identity/serializers.py and password_validation.py) and trims spaces
// from every field, so these check trimmed values too.

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// English letters and spaces only
export const NAME_PATTERN = /^[a-zA-Z ]*$/;

export const MOBILE_PATTERN = /^[0-9]{10}$/;

const PASSWORD_RULES = [
  { label: "At least 8 characters", error: "Password must contain at least 8 characters.", test: (p) => p.length >= 8 },
  { label: "One uppercase letter", error: "Include at least one uppercase letter.", test: (p) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", error: "Include at least one lowercase letter.", test: (p) => /[a-z]/.test(p) },
  { label: "One number", error: "Include at least one number.", test: (p) => /[0-9]/.test(p) },
  { label: "One special character", error: "Include at least one special character.", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

// [{ label, valid }] for the live checklist under a password field
export function passwordChecks(password) {
  const trimmed = password.trim();
  return PASSWORD_RULES.map((rule) => ({ label: rule.label, valid: rule.test(trimmed) }));
}

// The first rule the password breaks, or "" when it meets them all
export function passwordError(password) {
  const trimmed = password.trim();
  const broken = PASSWORD_RULES.find((rule) => !rule.test(trimmed));
  return broken ? broken.error : "";
}

// Error for an email field, or "" when it is fine
export function emailError(email) {
  if (!email.trim()) return "Email is required.";
  if (!EMAIL_PATTERN.test(email.trim())) return "Please enter a valid email address.";
  return "";
}
