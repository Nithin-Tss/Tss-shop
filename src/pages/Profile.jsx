import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiDelete, apiGet, apiPatch, apiPost, logout } from "@/lib/api";
import { getSession, setTokens, setUser, useSession } from "@/lib/auth";
import { MOBILE_PATTERN, NAME_PATTERN, emailError, passwordError } from "@/lib/validation";
import { PasswordChecklist, PasswordInput } from "@/components/PasswordFields";
import AddressModal from "@/components/AddressModal";
import DeleteAddressModal from "@/components/DeleteAddressModal";

// The form's fields, filled from the signed-in user
function profileFromUser(user) {
  return {
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    mobileNumber: user?.mobileNumber || "",
  };
}
export default function ProfilePage() {
  const navigate = useNavigate();
   const session = useSession();
  const user = session?.user;
  const [isEditing, setIsEditing] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const [profileData, setProfileData] = useState(() =>
    profileFromUser(getSession()?.user)
  );

  // The saved copy may be old (changed on another device): read it again
  
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
  const [isResending, setIsResending] = useState(false);

  // Address Management State
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [addressMessage, setAddressMessage] = useState("");
  const [addressError, setAddressError] = useState("");
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [deletingAddress, setDeletingAddress] = useState(null);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isDeletingAddress, setIsDeletingAddress] = useState(false);
  const [modalApiError, setModalApiError] = useState("");

  const loadAddresses = async () => {
    setLoadingAddresses(true);
    const res = await apiGet("/api/v1/customers/addresses/?customer=me");
    if (res.ok && Array.isArray(res.data)) {
      setAddresses(res.data);
    } else {
      setAddresses([]);
    }
    setLoadingAddresses(false);
  };

  useEffect(() => {
    if (session?.token) {
      loadAddresses();
    }
  }, [session?.token]);

  const handleOpenAddAddress = () => {
    setEditingAddress(null);
    setModalApiError("");
    setShowAddressModal(true);
  };

  const handleOpenEditAddress = (addr) => {
    setEditingAddress(addr);
    setModalApiError("");
    setShowAddressModal(true);
  };

  const handleSaveAddress = async (formData) => {
    setIsSavingAddress(true);
    setModalApiError("");

    const isEdit = Boolean(editingAddress);
    const url = isEdit
      ? `/api/v1/customers/addresses/${editingAddress.id}/`
      : "/api/v1/customers/addresses/";

    const res = isEdit
      ? await apiPatch(url, formData)
      : await apiPost(url, formData);

    setIsSavingAddress(false);

    if (res.ok) {
      setShowAddressModal(false);
      setEditingAddress(null);
      setAddressMessage(
        isEdit ? "Address updated successfully." : "Address added successfully."
      );
      setAddressError("");
      loadAddresses();
    } else {
      const err =
        res.formError ||
        (res.fieldErrors && Object.values(res.fieldErrors)[0]) ||
        "Failed to save address. Please check required fields.";
      setModalApiError(err);
    }
  };

  const handleOpenDeleteAddress = (addr) => {
    setDeletingAddress(addr);
  };

  const handleConfirmDeleteAddress = async () => {
    if (!deletingAddress) return;
    setIsDeletingAddress(true);
    const res = await apiDelete(`/api/v1/customers/addresses/${deletingAddress.id}/`);
    setIsDeletingAddress(false);
    setDeletingAddress(null);

    if (res.ok) {
      setAddressMessage("Address deleted successfully.");
      setAddressError("");
      loadAddresses();
    } else {
      setAddressError(res.error || "Failed to delete address.");
    }
  };

  const handleSetDefaultAddress = async (addr) => {
    setAddressMessage("");
    setAddressError("");
    const res = await apiPost(`/api/v1/customers/addresses/${addr.id}/set-default/`, {});
    if (res.ok) {
      setAddressMessage(`Default ${addr.address_type || "shipping"} address updated.`);
      loadAddresses();
    } else {
      setAddressError(res.formError || res.error || "Failed to set default address.");
    }
  };
 
  // Handle profile input changes
  const handleProfileChange = (event) => {
    const { name, value } = event.target;

    // Allow alphabets and spaces only for names, as on signup
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
 
    if (emailError(profileData.email)) {
      newErrors.email = emailError(profileData.email);
    }

    if (!profileData.mobileNumber.trim()) {
      newErrors.mobileNumber =
        "Mobile number is required.";
    } else if (
      !MOBILE_PATTERN.test(profileData.mobileNumber.trim())
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
          : "Profile saved."
      );

      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Send the verification link again
  const handleResendVerification = async () => {
    setErrors({});
    setMessage("");
    setIsResending(true);

    try {
      const result = await apiPost("/api/v1/auth/verify-email/resend/", {});

      if (!result.ok) {
        setErrors({ form: result.formError || "Could not send the link. Please try again." });
        return;
      }

      setMessage(result.data.message);
    } finally {
      setIsResending(false);
    }
  };
 
  // Validate password
  const validatePassword = () => {
    const newErrors = {};
 
    // The backend trims spaces from every field, so check the trimmed values
    if (!passwordData.currentPassword.trim()) {
      newErrors.currentPassword =
        "Current password is required.";
    }

    if (!passwordData.newPassword.trim()) {
      newErrors.newPassword =
        "New password is required.";
    } else if (passwordError(passwordData.newPassword)) {
      newErrors.newPassword = passwordError(passwordData.newPassword);
    }

    if (!passwordData.confirmPassword.trim()) {
      newErrors.confirmPassword =
        "Please confirm your new password.";
    } else if (
      passwordData.newPassword.trim() !==
      passwordData.confirmPassword.trim()
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
const handleLogout = () => {
  logout();
  navigate("/", { replace: true });
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
      readOnly
      placeholder="Enter first name"
      className="mt-2 w-full bg-transparent text-sm text-slate-700 outline-none"
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
      readOnly
      placeholder="Enter last name"
      className="mt-2 w-full bg-transparent text-sm text-slate-700 outline-none"
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
      readOnly
      placeholder="Enter email"
      className="mt-2 w-full bg-transparent text-sm text-slate-700 outline-none"
    />

    {user && !user.emailVerified && (
      <p className="mt-2 text-xs text-amber-700">
        Not verified yet.{" "}
        <button
          type="button"
          onClick={handleResendVerification}
          disabled={isResending}
          className="font-semibold underline disabled:opacity-60"
        >
          {isResending ? "Sending..." : "Send verification link"}
        </button>
      </p>
    )}
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
      readOnly
      placeholder="Enter mobile number"
      maxLength={10}
      className="mt-2 w-full bg-transparent text-sm text-slate-700 outline-none"
    />
  </div>

</div>

                {/* ================================================= */}
                {/* SAVED ADDRESSES SECTION                          */}
                {/* ================================================= */}
                <div className="mt-8 border-t border-slate-200 pt-8">
                  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">
                        Saved Addresses
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Manage your delivery and billing addresses for faster checkout.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenAddAddress}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-charcoal-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 shadow-xs"
                    >
                      <span className="text-base leading-none">⊕</span>
                      <span>Add Address</span>
                    </button>
                  </div>

                  {/* Address feedback messages */}
                  {addressMessage && (
                    <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center justify-between">
                      <span>✓ {addressMessage}</span>
                      <button
                        type="button"
                        onClick={() => setAddressMessage("")}
                        className="text-emerald-600 hover:text-emerald-900 font-bold ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {addressError && (
                    <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
                      <span>{addressError}</span>
                      <button
                        type="button"
                        onClick={() => setAddressError("")}
                        className="text-red-500 hover:text-red-800 font-bold ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Loading skeleton */}
                  {loadingAddresses ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[1, 2].map((i) => (
                        <div key={i} className="animate-pulse rounded-xl border border-slate-200 p-5 space-y-3 bg-white">
                          <div className="flex justify-between">
                            <div className="h-5 w-20 bg-slate-200 rounded-full" />
                            <div className="h-5 w-16 bg-slate-200 rounded-full" />
                          </div>
                          <div className="h-4 w-32 bg-slate-200 rounded" />
                          <div className="h-4 w-48 bg-slate-100 rounded" />
                          <div className="h-4 w-28 bg-slate-100 rounded" />
                          <div className="h-8 w-full bg-slate-100 rounded-lg pt-2 mt-4" />
                        </div>
                      ))}
                    </div>
                  ) : addresses.length > 0 ? (
                    /* Address Grid */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {addresses.map((addr) => {
                        const fullName = [addr.first_name, addr.last_name].filter(Boolean).join(" ");
                        return (
                          <div
                            key={addr.id}
                            className={`flex flex-col justify-between rounded-xl border p-5 transition shadow-xs bg-white ${
                              addr.is_default
                                ? "border-slate-400/80 ring-1 ring-slate-400/20"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <div>
                              {/* Top Badges */}
                              <div className="flex items-center justify-between gap-2 mb-3">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                                  {addr.address_type || "Shipping"}
                                </span>

                                {addr.is_default ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <span>✓</span> Default
                                  </span>
                                ) : null}
                              </div>

                              {/* Recipient info */}
                              {fullName && (
                                <h3 className="font-bold text-slate-900 text-sm">
                                  {fullName}
                                </h3>
                              )}

                              {addr.company && (
                                <p className="text-xs font-medium text-slate-500 mt-0.5">
                                  {addr.company}
                                </p>
                              )}

                              {/* Address lines */}
                              <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                                {addr.address_line_1}
                                {addr.address_line_2 && (
                                  <>
                                    <br />
                                    {addr.address_line_2}
                                  </>
                                )}
                                <br />
                                {[addr.city, addr.state, addr.postal_code].filter(Boolean).join(", ")}
                                <br />
                                <span className="font-medium text-slate-800">{addr.country}</span>
                              </p>

                              {addr.phone && (
                                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                                  <span>📞</span>
                                  <span>{addr.phone}</span>
                                </p>
                              )}
                            </div>

                            {/* Card Footer Actions */}
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                              <div>
                                {!addr.is_default ? (
                                  <button
                                    type="button"
                                    onClick={() => handleSetDefaultAddress(addr)}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition hover:underline"
                                  >
                                    Set as default
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-slate-400 font-medium">
                                    Primary address
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditAddress(addr)}
                                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md transition"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDeleteAddress(addr)}
                                  className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Empty State */
                    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center bg-slate-50/50">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-400 mb-3">
                        📍
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">
                        No saved addresses
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                        You haven't saved any addresses yet. Add an address to use during checkout.
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenAddAddress}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-charcoal-navy px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 shadow-xs"
                      >
                        <span>⊕</span>
                        <span>Add your first address</span>
                      </button>
                    </div>
                  )}
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
              <form onSubmit={handleProfileSubmit} noValidate>
 
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
                      setProfileData(profileFromUser(user));
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
              <form onSubmit={handlePasswordSubmit} noValidate>
 
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

                    <PasswordChecklist password={passwordData.newPassword} />

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

      {/* Address Management Modals */}
      <AddressModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onSave={handleSaveAddress}
        initialData={editingAddress}
        title={editingAddress ? "Edit Address" : "Add New Address"}
        saving={isSavingAddress}
        apiError={modalApiError}
      />

      <DeleteAddressModal
        isOpen={Boolean(deletingAddress)}
        onClose={() => setDeletingAddress(null)}
        onConfirm={handleConfirmDeleteAddress}
        address={deletingAddress}
        deleting={isDeletingAddress}
      />
    </main>
  );
}
