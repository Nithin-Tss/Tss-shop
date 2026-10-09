 
import { useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { apiPost, logout } from "@/lib/api";
import { setTokens } from "@/lib/auth";
 
export default function ProfilePage() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
 
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobileNumber: "",
  });
 
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
 
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] =
    useState(false);
 
  // Handle profile input changes
  const handleProfileChange = (event) => {
    const { name, value } = event.target;
 
    setProfileData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
 
    setErrors((previousErrors) => ({
      ...previousErrors,
      [name]: "",
      form: "",
    }));
 
    setMessage("");
  };
 
  // Handle password input changes
  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
 
    setPasswordData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
 
    setErrors((previousErrors) => ({
      ...previousErrors,
      [name]: "",
      form: "",
    }));
 
    setMessage("");
  };
 
  // Validate profile form
  const validateProfile = () => {
    const newErrors = {};
 
    if (!profileData.firstName.trim()) {
      newErrors.firstName = "First name is required.";
    }
 
    if (!profileData.lastName.trim()) {
      newErrors.lastName = "Last name is required.";
    }
 
    if (!profileData.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        profileData.email
      )
    ) {
      newErrors.email = "Please enter a valid email address.";
    }
 
    if (!profileData.mobileNumber.trim()) {
      newErrors.mobileNumber =
        "Mobile number is required.";
    } else if (
      !/^[0-9]{10}$/.test(profileData.mobileNumber)
    ) {
      newErrors.mobileNumber =
        "Please enter a valid 10-digit mobile number.";
    }
 
    return newErrors;
  };
 
  // Save profile
  const handleProfileSubmit = async (event) => {
    event.preventDefault();
 
    setErrors({});
    setMessage("");
 
    const validationErrors = validateProfile();
 
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
 
    setIsSaving(true);
 
    try {
      /*
       * FRONTEND ONLY
       *
       * No backend API is connected.
       * The Django API will be connected later.
       */
 
      await new Promise((resolve) =>
        setTimeout(resolve, 700)
      );
 
      setMessage(
        "Profile changes are ready to be connected to the backend."
      );
 
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };
 
  // Validate password
  const validatePassword = () => {
    const newErrors = {};
 
    if (!passwordData.currentPassword) {
      newErrors.currentPassword =
        "Current password is required.";
    }
 
    if (!passwordData.newPassword) {
      newErrors.newPassword =
        "New password is required.";
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword =
        "Password must contain at least 8 characters.";
    }
 
    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword =
        "Please confirm your new password.";
    } else if (
      passwordData.newPassword !==
      passwordData.confirmPassword
    ) {
      newErrors.confirmPassword =
        "Passwords do not match.";
    }
 
    return newErrors;
  };
 
  // Change password
  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
 
    setErrors({});
    setMessage("");
 
    const validationErrors = validatePassword();
 
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
 
    setIsChangingPassword(true);
 
    try {
      // Other devices are signed out; this one gets fresh tokens and stays in
      const result = await apiPost("/api/v1/auth/password/", passwordData);

      if (!result.ok) {
        setErrors({ ...result.fieldErrors, form: result.formError });
        return;
      }

      setTokens(result.data);
      setMessage("Password changed. Other devices have been signed out.");

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
 
      setShowChangePassword(false);
    } finally {
      setIsChangingPassword(false);
    }
  };
 
  // Logout
  // Logout
const handleLogout = () => {
  logout();

  // Go back to the page the account link was clicked from (same-site paths only)
  const from = new URLSearchParams(window.location.search).get("from");
  const returnTo =
    from && from.startsWith("/") && !from.startsWith("//") && from !== "/profile"
      ? from
      : "/";

  navigate(returnTo, { replace: true });
};
 
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
 
        {/* Back to Home */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-charcoal-navy"
          >
            ← Back to Home
          </Link>
        </div>
 
        {/* Profile Card */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
 
          {/* Profile Header */}
          <div className="bg-charcoal-navy px-6 py-8 sm:px-8">
            <div className="flex flex-col items-center gap-5 sm:flex-row">
 
              {/* Profile Image */}
              <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/20 bg-white text-3xl font-bold text-charcoal-navy">
                  ?
                </div>
 
                <button
                  type="button"
                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-charcoal-navy bg-white text-sm text-charcoal-navy shadow-sm transition hover:bg-slate-100"
                  title="Change profile image"
                >
                  ✎
                </button>
              </div>
 
              {/* Profile Heading */}
              <div className="text-center sm:text-left">
                <h1 className="text-2xl font-bold text-white">
                  My Profile
                </h1>
 
                <p className="mt-1 text-sm text-white/70">
                  Manage your personal information and account settings.
                </p>
              </div>
 
            </div>
          </div>
 
          {/* Content */}
          <div className="p-6 sm:p-8">
 
            {/* Success / Information Message */}
            {message && (
              <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                {message}
              </div>
            )}
 
            {/* General Error */}
            {errors.form && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {errors.form}
              </div>
            )}
 
            {/* =========================
                VIEW PROFILE
            ========================== */}
            {!isEditing && !showChangePassword && (
              <>
                {/* Section Header */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Profile Information
                    </h2>
 
                    <p className="mt-1 text-sm text-slate-500">
                      View and manage your account information.
                    </p>
                  </div>
 
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      setMessage("");
                      setErrors({});
                    }}
                    className="rounded-lg bg-charcoal-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    Edit Profile
                  </button>
                </div>
 
                {/* Profile Information */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

  {/* First Name */}
  <div className="w-full min-h-26 rounded-xl border border-slate-200 p-5 focus-within:border-black">
    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
      First Name
    </label>
    <input
      type="text"
      name="firstName"
      value={profileData.firstName}
      onChange={handleProfileChange}
      placeholder="Enter first name"
      className="mt-2 w-full cursor-text bg-transparent text-sm text-slate-700 outline-none"
    />
  </div>

  {/* Last Name */}
  <div className="rounded-xl border border-slate-200 p-5 focus-within:border-black">
    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
      Last Name
    </label>
    <input
      type="text"
      name="lastName"
      value={profileData.lastName}
      onChange={handleProfileChange}
      placeholder="Enter last name"
      className="mt-2 w-full cursor-text bg-transparent text-sm text-slate-700 outline-none"
    />
  </div>

  {/* Email */}
  <div className="rounded-xl border border-slate-200 p-5 focus-within:border-black">
    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
      Email
    </label>
    <input
      type="email"
      name="email"
      value={profileData.email}
      onChange={handleProfileChange}
      placeholder="Enter email"
      className="mt-2 w-full cursor-text bg-transparent text-sm text-slate-700 outline-none"
    />
  </div>

  {/* Mobile Number */}
  <div className="rounded-xl border border-slate-200 p-5 focus-within:border-black">
    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
      Mobile Number
    </label>
    <input
      type="tel"
      name="mobileNumber"
      value={profileData.mobileNumber}
      onChange={handleProfileChange}
      placeholder="Enter mobile number"
      maxLength={10}
      className="mt-2 w-full cursor-text bg-transparent text-sm text-slate-700 outline-none"
    />
  </div>

</div>
 
                {/* Account Settings */}
                <div className="mt-8 border-t border-slate-200 pt-8">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Account Settings
                  </h2>
 
                  <p className="mt-1 text-sm text-slate-500">
                    Manage your password and account.
                  </p>
 
                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
 
                    {/* Change Password */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowChangePassword(true);
                        setMessage("");
                        setErrors({});
                      }}
                      className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Change Password
                    </button>
 
                    {/* Logout */}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="rounded-lg border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      Logout
                    </button>
 
                  </div>
                </div>
              </>
            )}
 
            {/* =========================
                EDIT PROFILE
            ========================== */}
            {isEditing && (
              <form onSubmit={handleProfileSubmit}>
 
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Edit Profile
                  </h2>
 
                  <p className="mt-1 text-sm text-slate-500">
                    Update your personal information.
                  </p>
                </div>
 
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
 
                  {/* First Name */}
                  <div>
                    <label
                      htmlFor="firstName"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      First Name
                    </label>
 
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={profileData.firstName}
                      onChange={handleProfileChange}
                      placeholder="First name"
                      className={`w-full rounded-lg border px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                        errors.firstName
                          ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                          : "border-slate-300 focus:border-charcoal-navy focus:ring-slate-100"
                      }`}
                    />
 
                    {errors.firstName && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.firstName}
                      </p>
                    )}
                  </div>
 
                  {/* Last Name */}
                  <div>
                    <label
                      htmlFor="lastName"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Last Name
                    </label>
 
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={profileData.lastName}
                      onChange={handleProfileChange}
                      placeholder="Last name"
                      className={`w-full rounded-lg border px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                        errors.lastName
                          ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                          : "border-slate-300 focus:border-charcoal-navy focus:ring-slate-100"
                      }`}
                    />
 
                    {errors.lastName && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.lastName}
                      </p>
                    )}
                  </div>
 
                  {/* Email */}
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Email
                    </label>
 
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={profileData.email}
                      onChange={handleProfileChange}
                      placeholder="Email address"
                      className={`w-full rounded-lg border px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                        errors.email
                          ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                          : "border-slate-300 focus:border-charcoal-navy focus:ring-slate-100"
                      }`}
                    />
 
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.email}
                      </p>
                    )}
                  </div>
 
                  {/* Mobile Number */}
                  <div>
                    <label
                      htmlFor="mobileNumber"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Mobile Number
                    </label>
 
                    <input
                      id="mobileNumber"
                      name="mobileNumber"
                      type="tel"
                      value={profileData.mobileNumber}
                      onChange={handleProfileChange}
                      placeholder="10-digit mobile number"
                      inputMode="numeric"
                      maxLength={10}
                      className={`w-full rounded-lg border px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                        errors.mobileNumber
                          ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                          : "border-slate-300 focus:border-charcoal-navy focus:ring-slate-100"
                      }`}
                    />
 
                    {errors.mobileNumber && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.mobileNumber}
                      </p>
                    )}
                  </div>
 
                </div>
 
                {/* Buttons */}
                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-end">
 
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setErrors({});
                    }}
                    className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
 
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-lg bg-charcoal-navy px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving
                      ? "Saving..."
                      : "Save Changes"}
                  </button>
 
                </div>
              </form>
            )}
 
            {/* =========================
                CHANGE PASSWORD
            ========================== */}
            {showChangePassword && (
              <form onSubmit={handlePasswordSubmit}>
 
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Change Password
                  </h2>
 
                  <p className="mt-1 text-sm text-slate-500">
                    Update your account password.
                  </p>
                </div>
 
                <div className="space-y-5">
 
                  {/* Current Password */}
                  <div>
                    <label
                      htmlFor="currentPassword"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Current Password
                    </label>
 
                    <PasswordInput
                      id="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter current password"
                      autoComplete="current-password"
                      hasError={Boolean(errors.currentPassword)}
                    />
 
                    {errors.currentPassword && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.currentPassword}
                      </p>
                    )}
                  </div>
 
                  {/* New Password */}
                  <div>
                    <label
                      htmlFor="newPassword"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      New Password
                    </label>
 
                    <PasswordInput
                      id="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter new password"
                      autoComplete="new-password"
                      hasError={Boolean(errors.newPassword)}
                    />
 
                    {errors.newPassword && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.newPassword}
                      </p>
                    )}
                  </div>
 
                  {/* Confirm Password */}
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Confirm New Password
                    </label>
 
                    <PasswordInput
                      id="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                      hasError={Boolean(errors.confirmPassword)}
                    />
 
                    {errors.confirmPassword && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
 
                </div>
 
                {/* Buttons */}
                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-end">
 
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangePassword(false);
                      setErrors({});
                    }}
                    className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
 
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="rounded-lg bg-charcoal-navy px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isChangingPassword
                      ? "Changing..."
                      : "Change Password"}
                  </button>
 
                </div>
              </form>
            )}
 
          </div>
        </div>
      </div>
    </main>
  );
}

// Password field with an eye button to show or hide what was typed
function PasswordInput({ id, value, onChange, placeholder, autoComplete, hasError }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`w-full rounded-lg border py-3 pl-4 pr-12 text-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ${
          hasError
            ? "border-red-400 focus:border-red-500 focus:ring-red-100"
            : "border-slate-300 focus:border-charcoal-navy focus:ring-slate-100"
        }`}
      />

      <button
        type="button"
        onClick={() => setVisible((shown) => !shown)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-slate-400 transition hover:text-slate-700 focus:text-slate-700 focus:outline-none"
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M6.61 6.61A18.5 18.5 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <path d="M2 2l20 20" />
    </svg>
  );
}
