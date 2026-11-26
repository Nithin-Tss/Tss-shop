import { useState } from "react";
import { Eye, EyeOff, Check } from "lucide-react";
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
            : "border-slate-300 focus:border-orange-600 focus:ring-slate-100"
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
        {visible ? (
          <EyeOff className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <Eye className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        )}
      </button>
    </div>
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
              <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
            ) : null}
          </span>

          <span>{requirement.label}</span>
        </div>
      ))}
    </div>
  );
}
    </div>
  );
}
