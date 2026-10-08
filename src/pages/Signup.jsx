 
import { useState } from "react";

import { useNavigate } from "react-router-dom";

import { Link } from "react-router-dom";
import { apiPost } from "@/lib/api";
import { signIn } from "@/lib/auth";
 
export default function SignUpPage() {

  const navigate = useNavigate();
 
  const [formData, setFormData] = useState({

    firstName: "",

    lastName: "",

    email: "",

    password: "",

    confirmPassword: "",

    mobileNumber: "",

    agreeTerms: false,

  });
 
  const [errors, setErrors] = useState({});

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [message, setMessage] = useState("");
 
  const handleChange = (event) => {

    const { name, value, checked, type } = event.target;
 
    setFormData((previousData) => ({

      ...previousData,

      [name]: type === "checkbox" ? checked : value,

    }));
 
    setErrors((previousErrors) => ({

      ...previousErrors,

      [name]: "",

      form: "",

    }));
 
    setMessage("");

  };
 
  const validateForm = () => {

    const newErrors = {};
 
    // First Name

    if (!formData.firstName.trim()) {

      newErrors.firstName = "First name is required.";

    }
 
    // Last Name

    if (!formData.lastName.trim()) {

      newErrors.lastName = "Last name is required.";

    }
 
    // Email

    if (!formData.email.trim()) {

      newErrors.email = "Email is required.";

    } else if (

      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)

    ) {

      newErrors.email = "Please enter a valid email address.";

    }
 
    // Password

    if (!formData.password) {

      newErrors.password = "Password is required.";

    } else if (formData.password.length < 8) {

      newErrors.password =

        "Password must contain at least 8 characters.";

    }
 
    // Confirm Password

    if (!formData.confirmPassword) {

      newErrors.confirmPassword =

        "Please confirm your password.";

    } else if (

      formData.password !== formData.confirmPassword

    ) {

      newErrors.confirmPassword = "Passwords do not match.";

    }
 
    // Mobile Number

    if (!formData.mobileNumber.trim()) {

      newErrors.mobileNumber = "Mobile number is required.";

    } else if (!/^[0-9]{10}$/.test(formData.mobileNumber)) {

      newErrors.mobileNumber =

        "Please enter a valid 10-digit mobile number.";

    }
 
    // Terms & Conditions

    if (!formData.agreeTerms) {

      newErrors.agreeTerms =

        "You must agree to the Terms & Conditions.";

    }
 
    return newErrors;

  };
 
  const handleSubmit = async (event) => {

    event.preventDefault();
 
    setMessage("");

    setErrors({});
 
    const validationErrors = validateForm();
 
    if (Object.keys(validationErrors).length > 0) {

      setErrors(validationErrors);

      return;

    }
 
    setIsSubmitting(true);
 
    try {
      const result = await apiPost("/api/v1/auth/signup/", formData);

      if (!result.ok) {
        setErrors({ ...result.fieldErrors, form: result.formError });
        return;
      }

      signIn(result.data);
      setMessage("Account created. Let's set up your store...");
      navigate("/auth/onboarding");
    } finally {

      setIsSubmitting(false);

    }

  };
 
  return (
<main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">

      {/* Reduced width from max-w-2xl to max-w-lg */}
<div className="mx-auto w-full max-w-lg">
<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

          {/* Heading */}
<div className="mb-8 text-center">
<h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">

              Create Your Account
</h1>
 
            <p className="mt-2 text-sm text-slate-500">

              Create an account to start building your online store.
</p>
</div>
 
          {/* Form Error */}

          {errors.form && (
<div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">

              {errors.form}
</div>

          )}
 
          {/* Success / Frontend Message */}

          {message && (
<div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">

              {message}
</div>

          )}
 
          <form onSubmit={handleSubmit} noValidate>
 
            {/* First Name + Last Name */}
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

                  value={formData.firstName}

                  onChange={handleChange}

                  placeholder="Enter first name"

                  autoComplete="given-name"

                  className={`w-full rounded-lg border px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ${

                    errors.firstName

                      ? "border-red-400 focus:border-red-500 focus:ring-red-100"

                      : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"

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

                  value={formData.lastName}

                  onChange={handleChange}

                  placeholder="Enter last name"

                  autoComplete="family-name"

                  className={`w-full rounded-lg border px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ${

                    errors.lastName

                      ? "border-red-400 focus:border-red-500 focus:ring-red-100"

                      : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"

                  }`}

                />
 
                {errors.lastName && (
<p className="mt-1 text-xs text-red-500">

                    {errors.lastName}
</p>

                )}
</div>
</div>
 
            {/* Email */}
<div className="mt-5">
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

                value={formData.email}

                onChange={handleChange}

                placeholder="Enter your email"

                autoComplete="email"

                className={`w-full rounded-lg border px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ${

                  errors.email

                    ? "border-red-400 focus:border-red-500 focus:ring-red-100"

                    : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"

                }`}

              />
 
              {errors.email && (
<p className="mt-1 text-xs text-red-500">

                  {errors.email}
</p>

              )}
</div>
 
            {/* Mobile Number */}
<div className="mt-5">
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

                value={formData.mobileNumber}

                onChange={handleChange}

                placeholder="Enter 10-digit mobile number"

                autoComplete="tel"

                inputMode="numeric"

                maxLength={10}

                className={`w-full rounded-lg border px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ${

                  errors.mobileNumber

                    ? "border-red-400 focus:border-red-500 focus:ring-red-100"

                    : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"

                }`}

              />
 
              {errors.mobileNumber && (
<p className="mt-1 text-xs text-red-500">

                  {errors.mobileNumber}
</p>

              )}
</div>
 
            {/* Password */}
<div className="mt-5">
<label

                htmlFor="password"

                className="mb-2 block text-sm font-medium text-slate-700"
>

                Password
</label>
 
              <div className="relative">
<input

                  id="password"

                  name="password"

                  type={showPassword ? "text" : "password"}

                  value={formData.password}

                  onChange={handleChange}

                  placeholder="Create a password"

                  autoComplete="new-password"

                  className={`w-full rounded-lg border px-4 py-3 pr-20 text-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ${

                    errors.password

                      ? "border-red-400 focus:border-red-500 focus:ring-red-100"

                      : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"

                  }`}

                />
 
                <button

                  type="button"

                  onClick={() =>

                    setShowPassword((previous) => !previous)

                  }

                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-blue-600 hover:text-blue-700"
>

                  {showPassword ? "Hide" : "Show"}
</button>
</div>
 
              {errors.password && (
<p className="mt-1 text-xs text-red-500">

                  {errors.password}
</p>

              )}
</div>
 
            {/* Confirm Password */}
<div className="mt-5">
<label

                htmlFor="confirmPassword"

                className="mb-2 block text-sm font-medium text-slate-700"
>

                Confirm Password
</label>
 
              <div className="relative">
<input

                  id="confirmPassword"

                  name="confirmPassword"

                  type={

                    showConfirmPassword ? "text" : "password"

                  }

                  value={formData.confirmPassword}

                  onChange={handleChange}

                  placeholder="Confirm your password"

                  autoComplete="new-password"

                  className={`w-full rounded-lg border px-4 py-3 pr-20 text-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ${

                    errors.confirmPassword

                      ? "border-red-400 focus:border-red-500 focus:ring-red-100"

                      : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"

                  }`}

                />
 
                <button

                  type="button"

                  onClick={() =>

                    setShowConfirmPassword(

                      (previous) => !previous

                    )

                  }

                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-blue-600 hover:text-blue-700"
>

                  {showConfirmPassword ? "Hide" : "Show"}
</button>
</div>
 
              {errors.confirmPassword && (
<p className="mt-1 text-xs text-red-500">

                  {errors.confirmPassword}
</p>

              )}
</div>
 
            {/* Terms & Conditions */}
<div className="mt-6">
<label className="flex cursor-pointer items-start gap-3">
<input

                  type="checkbox"

                  name="agreeTerms"

                  checked={formData.agreeTerms}

                  onChange={handleChange}

                  className="mt-1 h-4 w-4 shrink-0 accent-blue-600"

                />
 
                <span className="text-sm leading-6 text-slate-600">

                  I agree to the{" "}
<Link

                    to="/terms"

                    className="font-medium text-blue-600 hover:underline"
>

                    Terms & Conditions
</Link>{" "}

                  and{" "}
<Link

                    to="/privacy"

                    className="font-medium text-blue-600 hover:underline"
>

                    Privacy Policy
</Link>

                  .
</span>
</label>
 
              {errors.agreeTerms && (
<p className="mt-1 text-xs text-red-500">

                  {errors.agreeTerms}
</p>

              )}
</div>
 
            {/* Sign Up Button */}
<button

              type="submit"

              disabled={isSubmitting}

              className="mt-7 w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
>

              {isSubmitting ? "Creating Account..." : "Sign Up"}
</button>
</form>
 
          {/* Sign In */}
<div className="mt-7 border-t border-slate-200 pt-6 text-center">
<p className="text-sm text-slate-500">

              Already have an account?
</p>
 
            <Link

              to="/auth/signin"

              className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-blue-600 px-5 py-3 font-semibold text-blue-600 transition hover:bg-blue-50"
>

              Sign In
</Link>
</div>
</div>
</div>
</main>

  );

}
 