import { useState } from "react";
import { passwordChecks } from "@/lib/validation";

// Password pieces shared by Signup, Profile and Reset Password

// Password field with an eye button to show or hide what was typed
export function PasswordInput({ id, value, onChange, placeholder, autoComplete, hasError }) {
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

// Live list of the password rules, each turning green once met
export function PasswordChecklist({ password }) {
  return (
    <div className="mt-5 space-y-2">
      {passwordChecks(password).map((requirement) => (
        <div
          key={requirement.label}
          className={`flex items-center gap-3 text-sm transition-colors ${
            requirement.valid ? "text-green-600" : "text-slate-400"
          }`}
        >
          <span
            className={`flex h-4 w-4 items-center justify-center rounded-sm border ${
              requirement.valid ? "border-green-600" : "border-slate-400"
            }`}
          >
            {requirement.valid ? (
              <svg
                viewBox="0 0 16 16"
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m3 8 3 3 7-7" />
              </svg>
            ) : null}
          </span>

          <span>{requirement.label}</span>
        </div>
      ))}
    </div>
  );
}
