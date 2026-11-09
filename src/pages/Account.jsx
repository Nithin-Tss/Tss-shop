import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { getSession, setTokens, setUser, useSession } from "@/lib/auth";
import { MOBILE_PATTERN, NAME_PATTERN, emailError } from "@/lib/validation";
import { PasswordChecklist, PasswordInput } from "@/components/PasswordFields";
import MfaSettings from "@/components/MfaSettings";
import Icon from "@/components/Icons";
import AccountSidebar from "@/components/AccountSidebar";

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
      const result = await apiPost("/api/v1/auth/verify-email/resend/", {});
      if (result.ok) {
        setMessage(result.data?.message || "Verification link sent. Please check your inbox.");
      } else {
        setErrors({
          form: result.formError || "Unable to send verification link.",
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

  const emailVerified = Boolean(user?.emailVerified);
  const hasPhone = Boolean(profileData.mobileNumber);
  const completed = [emailVerified, hasPhone].filter(Boolean).length;
  const busyForm = isEditing;

  const startEdit = () => {
    setIsEditing(true);
    setShowChangePassword(false);
    setErrors({});
  };
  const startPassword = () => {
    setShowChangePassword(true);
    setIsEditing(false);
    setErrors({});
  };

  const inputCls = (hasError) =>
    `w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-orange-200 ${
      hasError ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-orange-500"
    }`;
  const labelCls = "mb-1.5 block text-xs font-medium text-slate-700";
  const primaryBtn =
    "inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer";
  const ghostBtn =
    "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 cursor-pointer";

  const detailRows = [
    { icon: "user", label: "First name", value: profileData.firstName },
    { icon: "user", label: "Last name", value: profileData.lastName },
    { icon: "mail", label: "Email address", value: profileData.email, email: true },
    { icon: "phone", label: "Mobile phone", value: profileData.mobileNumber },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex items-center gap-2 text-sm text-slate-500"
        >
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 transition hover:text-slate-900 cursor-pointer"
          >
            <Icon name="arrow-left" className="h-4 w-4" />
            Back
          </button>
          <Icon name="chevron-right" className="h-3.5 w-3.5 text-slate-300" />
          <span className="font-medium text-slate-900">Account</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <AccountSidebar active="profile" />

          {/* ---------- Content ---------- */}
          <div className="min-w-0 space-y-6">
            <header>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                My account
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage your personal details, sign-in methods and account security.
              </p>
            </header>

            {message && (
              <div
                role="status"
                className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
              >
                <Icon name="check-circle" className="mt-0.5 h-[18px] w-[18px] text-emerald-600" />
                <span className="flex-1">{message}</span>
                <button
                  type="button"
                  onClick={() => setMessage("")}
                  aria-label="Dismiss"
                  className="text-emerald-700/70 transition hover:text-emerald-900 cursor-pointer"
                >
                  <Icon name="x" className="h-4 w-4" />
                </button>
              </div>
            )}

            {errors.form && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
              >
                <Icon name="alert" className="mt-0.5 h-[18px] w-[18px] text-red-600" />
                <span className="flex-1">{errors.form}</span>
                <button
                  type="button"
                  onClick={() => setErrors((prev) => ({ ...prev, form: "" }))}
                  aria-label="Dismiss"
                  className="text-red-700/70 transition hover:text-red-900 cursor-pointer"
                >
                  <Icon name="x" className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Profile completeness */}
            <section
              aria-label="Profile completeness"
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Account checklist</h3>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {completed === 2
                      ? "Everything is in place."
                      : `${2 - completed} step${2 - completed === 1 ? "" : "s"} left to secure your account.`}
                  </p>
                </div>
                <span className="text-sm font-medium text-slate-900">{completed} / 2</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-orange-500 transition-all"
                  style={{ width: `${(completed / 2) * 100}%` }}
                />
              </div>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {[
                  { done: emailVerified, text: "Verify your email address" },
                  { done: hasPhone, text: "Add a mobile phone number" },
                ].map((item) => (
                  <li key={item.text} className="flex items-center gap-2.5 text-sm">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                        item.done
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-slate-300 text-transparent"
                      }`}
                    >
                      <Icon name="check" className="h-3 w-3" strokeWidth="2.5" />
                    </span>
                    <span className={item.done ? "text-slate-500 line-through" : "text-slate-800"}>
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Personal information */}
            <section className="rounded-xl border border-slate-200 bg-white">
              <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <Icon name="user" className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Personal information</h3>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Your name and contact details used for orders and receipts.
                    </p>
                  </div>
                </div>
                {!busyForm && (
                  <button type="button" onClick={startEdit} className={ghostBtn}>
                    <Icon name="pencil" className="h-4 w-4" />
                    Edit profile
                  </button>
                )}
              </div>

              {!isEditing && (
                <dl className="divide-y divide-slate-200">
                  {detailRows.map((row) => (
                    <div
                      key={row.label}
                      className="grid gap-1 px-5 py-4 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center sm:px-6"
                    >
                      <dt className="flex items-center gap-2.5 text-sm text-slate-500">
                        <Icon name={row.icon} className="h-4 w-4 text-slate-400" />
                        {row.label}
                      </dt>
                      <dd className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-slate-900">
                        <span className="break-all">
                          {row.value || (
                            <span className="font-normal text-slate-400">Not added</span>
                          )}
                        </span>
                        {row.email && row.value && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              emailVerified
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            <Icon
                              name={emailVerified ? "check-circle" : "alert"}
                              className="h-3 w-3"
                            />
                            {emailVerified ? "Verified" : "Unverified"}
                          </span>
                        )}
                        {row.email && user && !emailVerified && (
                          <button
                            type="button"
                            onClick={handleResendVerification}
                            disabled={isResending}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-700 underline-offset-2 hover:underline disabled:opacity-50 cursor-pointer"
                          >
                            <Icon name="send" className="h-3.5 w-3.5" />
                            {isResending ? "Sending…" : "Send verification link"}
                          </button>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              {isEditing && (
                <form onSubmit={handleProfileSubmit} className="p-5 sm:p-6" noValidate>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="firstName" className={labelCls}>
                        First name
                      </label>
                      <input
                        id="firstName"
                        type="text"
                        name="firstName"
                        value={profileData.firstName}
                        onChange={handleProfileChange}
                        placeholder="Jane"
                        className={inputCls(errors.firstName)}
                      />
                      {errors.firstName && (
                        <p className="mt-1.5 text-xs text-red-600">{errors.firstName}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="lastName" className={labelCls}>
                        Last name
                      </label>
                      <input
                        id="lastName"
                        type="text"
                        name="lastName"
                        value={profileData.lastName}
                        onChange={handleProfileChange}
                        placeholder="Doe"
                        className={inputCls(errors.lastName)}
                      />
                      {errors.lastName && (
                        <p className="mt-1.5 text-xs text-red-600">{errors.lastName}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="email" className={labelCls}>
                        Email address
                      </label>
                      <input
                        id="email"
                        type="email"
                        name="email"
                        value={profileData.email}
                        onChange={handleProfileChange}
                        placeholder="jane@example.com"
                        className={inputCls(errors.email)}
                      />
                      {errors.email && (
                        <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="mobileNumber" className={labelCls}>
                        Mobile number
                      </label>
                      <input
                        id="mobileNumber"
                        type="tel"
                        name="mobileNumber"
                        value={profileData.mobileNumber}
                        onChange={handleProfileChange}
                        placeholder="10-digit mobile number"
                        maxLength={10}
                        className={inputCls(errors.mobileNumber)}
                      />
                      {errors.mobileNumber && (
                        <p className="mt-1.5 text-xs text-red-600">{errors.mobileNumber}</p>
                      )}
                    </div>

                    {emailChanging && (
                      <div className="sm:col-span-2">
                        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                          <Icon name="lock" className="mt-0.5 h-4 w-4 text-amber-700" />
                          <div className="flex-1">
                            <label htmlFor="emailCurrentPassword" className={labelCls}>
                              Confirm with your current password
                            </label>
                            <input
                              id="emailCurrentPassword"
                              type="password"
                              name="currentPassword"
                              value={profileData.currentPassword}
                              onChange={handleProfileChange}
                              autoComplete="current-password"
                              placeholder="Needed to change your email"
                              className={`${inputCls(errors.currentPassword)} max-w-sm`}
                            />
                            {errors.currentPassword && (
                              <p className="mt-1.5 text-xs text-red-600">
                                {errors.currentPassword}
                              </p>
                            )}
                            <p className="mt-2 text-xs text-slate-600">
                              We'll send a new verification link to the updated address.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-200 pt-5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setProfileData(profileFromUser(user));
                        setErrors({});
                      }}
                      className={ghostBtn}
                    >
                      Cancel
                    </button>
                    <button type="submit" disabled={isSaving} className={primaryBtn}>
                      {isSaving ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                </form>
              )}
            </section>

            {/* Sign-in & security */}
            <section className="rounded-xl border border-slate-200 bg-white">
              <div className="flex items-start gap-3 border-b border-slate-200 p-5 sm:p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <Icon name="shield" className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Sign-in & security</h3>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Control how you sign in and keep your account protected.
                  </p>
                </div>
              </div>

              {/* Password */}
              <div className="border-b border-slate-200 p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <Icon name="key" className="mt-0.5 h-[18px] w-[18px] text-slate-400" />
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">Password</h4>
                      <p className="mt-0.5 text-sm text-slate-500">
                        Use a strong password you don't use anywhere else.
                      </p>
                    </div>
                  </div>
                  {!showChangePassword && (
                    <button type="button" onClick={startPassword} className={ghostBtn}>
                      Change password
                    </button>
                  )}
                </div>

                {showChangePassword && (
                  <form
                    onSubmit={handlePasswordSubmit}
                    className="mt-5 max-w-lg space-y-5"
                    noValidate
                  >
                    <div>
                      <label htmlFor="currentPassword" className={labelCls}>
                        Current password
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
                        <p className="mt-1.5 text-xs text-red-600">{errors.currentPassword}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="newPassword" className={labelCls}>
                        New password
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
                        <p className="mt-1.5 text-xs text-red-600">{errors.newPassword}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className={labelCls}>
                        Confirm new password
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
                        <p className="mt-1.5 text-xs text-red-600">{errors.confirmPassword}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 border-t border-slate-200 pt-5">
                      <button type="submit" disabled={isChangingPassword} className={primaryBtn}>
                        {isChangingPassword ? "Updating…" : "Update password"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowChangePassword(false);
                          setErrors({});
                        }}
                        className={ghostBtn}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Two-factor */}
              <MfaSettings />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
