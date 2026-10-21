import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { apiGet, apiPatch, apiPost, logout } from "@/lib/api";
import { getSession, setTokens, setUser, useSession } from "@/lib/auth";
import { MOBILE_PATTERN, NAME_PATTERN, emailError } from "@/lib/validation";
import { PasswordChecklist, PasswordInput } from "@/components/PasswordFields";

function profileFromUser(user) {
  return {
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    mobileNumber: user?.mobileNumber || "",
    currentPassword: "", // only needed (and sent) when the email changes
  };
}

export default function AccountPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const session = useSession();
  const user = session?.user;
  const userName = user?.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : session?.name || "Customer";

  const [isEditing, setIsEditing] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const [profileData, setProfileData] = useState(() => profileFromUser(getSession()?.user));

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Load profile from /api/v1/auth/me/
  useEffect(() => {
    let ignore = false;
    async function loadProfile() {
      if (!session?.token) {
        setProfileData(profileFromUser(null));
        return;
      }

      const result = await apiGet("/api/v1/auth/me/");
      if (ignore) return;

      if (!result.ok) {
        setErrors({
          form: result.error || "Unable to load profile.",
        });
        return;
      }

      const currentUser = result.data.user;
      setUser(currentUser);
      setProfileData(profileFromUser(currentUser));
    }

    loadProfile().catch(() => {
      if (!ignore) {
        setErrors({ form: "Unable to load profile." });
      }
    });

    return () => {
      ignore = true;
    };
  }, [session?.token]);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    if ((name === "firstName" || name === "lastName") && !NAME_PATTERN.test(value)) {
      return;
    }

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

  const emailChanging =
    profileData.email.trim().toLowerCase() !== (user?.email || "").toLowerCase();

  const validateProfile = () => {
    const newErrors = {};
    if (!profileData.firstName.trim()) {
      newErrors.firstName = "First name is required.";
    }
    if (!profileData.lastName.trim()) {
      newErrors.lastName = "Last name is required.";
    }
    if (emailError(profileData.email)) {
      newErrors.email = emailError(profileData.email);
    }
    if (emailChanging && !profileData.currentPassword) {
      newErrors.currentPassword = "Enter your current password to change your email.";
    }
    if (!profileData.mobileNumber.trim()) {
      newErrors.mobileNumber = "Mobile number is required.";
    } else if (!MOBILE_PATTERN.test(profileData.mobileNumber.trim())) {
      newErrors.mobileNumber = "Please enter a valid 10-digit mobile number.";
    }
    return newErrors;
  };

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
      const result = await apiPatch("/api/v1/auth/me/", profileData);
      if (!result.ok) {
        setErrors({ ...result.fieldErrors, form: result.formError });
        return;
      }

      const savedUser = result.data.user;
      const emailChanged = savedUser.email !== user?.email;

      setUser(savedUser);
      setProfileData(profileFromUser(savedUser));
      setMessage(
        emailChanged
          ? `Profile saved. We've sent a verification link to ${savedUser.email}.`
          : "Profile saved successfully."
      );
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    setMessage("");
    try {
      const result = await apiPost("/api/v1/auth/verify-email/send/", {});
      if (result.ok) {
        setMessage("Verification link sent. Please check your inbox.");
      } else {
        setErrors({
          form: result.error || "Unable to send verification link.",
        });
      }
    } finally {
      setIsResending(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setErrors({});
    setMessage("");

    const newErrors = {};
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = "Enter your current password.";
    }
    if (!passwordData.newPassword) {
      newErrors.newPassword = "Enter your new password.";
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsChangingPassword(true);
    try {
      const result = await apiPost("/api/v1/auth/password/", passwordData);
      if (!result.ok) {
        setErrors({ ...result.fieldErrors, form: result.formError });
        return;
      }

      setTokens(result.data);
      setMessage("Password updated successfully.");
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

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const handleBack = () => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
      return;
    }

    const from = searchParams.get("from") || location.state?.from;
    if (from && typeof from === "string" && from.startsWith("/") && !from.startsWith("//")) {
      navigate(from);
      return;
    }

    navigate("/");
  };

  return (
    <main className="min-h-screen bg-slate-50/60 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        {/* Shopify-style Customer Account Header */}
        <div className="mb-8 border-b border-slate-200 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                <button
                  type="button"
                  onClick={handleBack}
                  className="hover:text-slate-900 transition flex items-center gap-1 cursor-pointer"
                >
                  <span>←</span>
                  <span>Back</span>
                </button>
                <span>/</span>
                <span className="text-slate-700">Account</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                My Account
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                Welcome back, <span className="font-semibold text-slate-800">{userName}</span>
                {user?.email && <span className="text-slate-400"> ({user.email})</span>}
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            >
              <span>Log out</span>
              <span className="text-slate-400">→</span>
            </button>
          </div>

          {/* Subnav Tabs */}
          <div className="mt-6 flex items-center gap-2">
            <Link
              to="/account"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer bg-[#0B1020] text-white shadow-xs"
            >
              <span>👤</span>
              <span>Account & Addresses</span>
            </Link>
          </div>
        </div>

        {/* Feedback Banners */}
        {message && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs sm:text-sm text-emerald-800 flex items-center justify-between">
            <span>✓ {message}</span>
            <button
              type="button"
              onClick={() => setMessage("")}
              className="text-emerald-500 hover:text-emerald-700 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {errors.form && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs sm:text-sm text-red-700 flex items-center justify-between">
            <span>{errors.form}</span>
            <button
              type="button"
              onClick={() => setErrors((prev) => ({ ...prev, form: "" }))}
              className="text-red-500 hover:text-red-700 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Content Layout: Grid for Customer Details & Addresses */}
        <div className="space-y-8">
          {/* ================================================= */}
          {/* 1. CUSTOMER DETAILS SECTION                      */}
          {/* ================================================= */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-100 gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Customer Details</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Your personal identity and contact information.
                </p>
              </div>

              {!isEditing && !showChangePassword && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      setShowChangePassword(false);
                      setErrors({});
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <span>✎</span>
                    <span>Edit Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowChangePassword(true);
                      setIsEditing(false);
                      setErrors({});
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <span>Change Password</span>
                  </button>
                </div>
              )}
            </div>

            {/* View Mode: Customer Information */}
            {!isEditing && !showChangePassword && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* First Name */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    First Name
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-slate-800">
                    {profileData.firstName || "—"}
                  </span>
                </div>

                {/* Last Name */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Last Name
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-slate-800">
                    {profileData.lastName || "—"}
                  </span>
                </div>

                {/* Email */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Email Address
                    </span>
                    {user?.emailVerified ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Verified
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        Unverified
                      </span>
                    )}
                  </div>
                  <span
                    className="mt-1 block text-sm font-semibold text-slate-800 truncate"
                    title={profileData.email}
                  >
                    {profileData.email || "—"}
                  </span>
                  {user && !user.emailVerified && (
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={isResending}
                      className="mt-1 text-[11px] text-violet-600 hover:underline font-medium disabled:opacity-50"
                    >
                      {isResending ? "Sending..." : "Send verification link"}
                    </button>
                  )}
                </div>

                {/* Phone */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Mobile Phone
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-slate-800">
                    {profileData.mobileNumber || "—"}
                  </span>
                </div>
              </div>
            )}

            {/* Edit Mode: Profile Form */}
            {isEditing && (
              <form onSubmit={handleProfileSubmit} className="mt-6 space-y-4" noValidate>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={profileData.firstName}
                      onChange={handleProfileChange}
                      placeholder="Jane"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-charcoal-navy"
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={profileData.lastName}
                      onChange={handleProfileChange}
                      placeholder="Doe"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-charcoal-navy"
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-xs text-red-500">{errors.lastName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleProfileChange}
                      placeholder="jane@example.com"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-charcoal-navy"
                    />
                    {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                  </div>

                  {emailChanging && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Current Password *
                      </label>
                      <input
                        type="password"
                        name="currentPassword"
                        value={profileData.currentPassword}
                        onChange={handleProfileChange}
                        autoComplete="current-password"
                        placeholder="Needed to change your email"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-charcoal-navy"
                      />
                      {errors.currentPassword && (
                        <p className="mt-1 text-xs text-red-500">{errors.currentPassword}</p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      name="mobileNumber"
                      value={profileData.mobileNumber}
                      onChange={handleProfileChange}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-charcoal-navy"
                    />
                    {errors.mobileNumber && (
                      <p className="mt-1 text-xs text-red-500">{errors.mobileNumber}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setProfileData(profileFromUser(user));
                      setErrors({});
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 rounded-lg bg-[#0B1020] text-white text-xs font-semibold hover:bg-[#1C2347] transition disabled:opacity-50 cursor-pointer"
                  >
                    {isSaving ? "Saving..." : "Save Details"}
                  </button>
                </div>
              </form>
            )}

            {/* Change Password Mode */}
            {showChangePassword && (
              <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4 max-w-lg" noValidate>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Current Password *
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
                    <p className="mt-1 text-xs text-red-500">{errors.currentPassword}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Password *
                  </label>
                  <PasswordInput
                    id="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    hasError={Boolean(errors.newPassword)}
                  />
                  <PasswordChecklist password={passwordData.newPassword} />
                  {errors.newPassword && (
                    <p className="mt-1 text-xs text-red-500">{errors.newPassword}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm New Password *
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
                    <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangePassword(false);
                      setErrors({});
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="px-5 py-2 rounded-lg bg-[#0B1020] text-white text-xs font-semibold hover:bg-[#1C2347] transition disabled:opacity-50 cursor-pointer"
                  >
                    {isChangingPassword ? "Updating..." : "Update Password"}
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
