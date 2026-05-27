"use client";

import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { SignupField } from "@/lib/services/auth";

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  password: string;
  passwordConfirm: string;
};

type ApiError = {
  ok: false;
  error: string;
  field?: SignupField;
  capReached?: boolean;
};

const initialForm: FormState = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  password: "",
  passwordConfirm: "",
};

export function SignupForm({
  initialError,
  capReached,
  betaCap,
}: {
  initialError?: string;
  capReached?: boolean;
  betaCap: string;
}) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [errorField, setErrorField] = useState<SignupField | null>(
    capReached ? "form" : null,
  );
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const passwordsMatch = useMemo(
    () => form.password.length > 0 && form.password === form.passwordConfirm,
    [form.password, form.passwordConfirm],
  );

  const update = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errorField === field) {
      setError(null);
      setErrorField(null);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setErrorField(null);

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      setErrorField("password");
      return;
    }
    if (form.password !== form.passwordConfirm) {
      setError("Passwords do not match.");
      setErrorField("passwordConfirm");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        const apiError = result as ApiError;
        setError(apiError.error ?? "Could not create account.");
        setErrorField(apiError.field ?? "form");
        return;
      }

      window.location.assign(result.redirect);
    } catch {
      setError("Could not reach the server. Please try again.");
      setErrorField("form");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      {capReached && (
        <div className="mb-4 text-sm rounded-md border border-[var(--warning)]/30 bg-[var(--warning)]/10 text-[var(--warning)] px-3 py-2">
          Closed beta is full ({betaCap} users). Email{" "}
          <a href="mailto:beta@tradex.in" className="underline">
            beta@tradex.in
          </a>{" "}
          to join the waitlist.
        </div>
      )}

      <form
        onSubmit={submit}
        className="rounded-2xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-6 space-y-4"
        noValidate
      >
        <Field
          label="Full name"
          name="fullName"
          type="text"
          required
          autoComplete="name"
          value={form.fullName}
          onChange={(value) => update("fullName", value)}
          error={errorField === "fullName" ? error : null}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(value) => update("email", value)}
          error={errorField === "email" ? error : null}
        />
        <Field
          label="Phone"
          name="phone"
          type="tel"
          required
          autoComplete="tel"
          placeholder="+919876543210"
          hint="With country code (e.g. +91 for India)"
          value={form.phone}
          onChange={(value) => update("phone", value)}
          error={errorField === "phone" ? error : null}
        />

        <div>
          <label className="text-xs text-[var(--neutral-400)] uppercase tracking-wider">
            Address
            <span className="text-[var(--neutral-600)] normal-case ml-1">· optional</span>
          </label>
          <textarea
            name="address"
            rows={3}
            autoComplete="street-address"
            value={form.address}
            onChange={(event) => update("address", event.target.value)}
            className={cn(
              "mt-1 w-full rounded-md bg-[var(--neutral-950)] border px-3 py-2 text-sm text-[var(--neutral-50)] focus:outline-none focus:border-[var(--tradex-orange-500)] resize-none",
              errorField === "address"
                ? "border-[var(--danger)]"
                : "border-[var(--neutral-700)]",
            )}
            placeholder="Optional · house, street, city, state, pincode"
          />
          {errorField === "address" && error ? (
            <div className="text-[10px] text-[var(--danger)] mt-1">{error}</div>
          ) : (
            <div className="text-[10px] text-[var(--neutral-500)] mt-1">Optional</div>
          )}
        </div>

        <PasswordField
          label="Password"
          name="password"
          value={form.password}
          onChange={(value) => update("password", value)}
          visible={showPassword}
          onToggle={() => setShowPassword((v) => !v)}
          autoComplete="new-password"
          hint="Minimum 8 characters"
          error={errorField === "password" ? error : null}
        />

        <PasswordField
          label="Confirm password"
          name="passwordConfirm"
          value={form.passwordConfirm}
          onChange={(value) => update("passwordConfirm", value)}
          visible={showConfirm}
          onToggle={() => setShowConfirm((v) => !v)}
          autoComplete="new-password"
          error={errorField === "passwordConfirm" ? error : null}
          suffix={
            <CheckCircle2
              size={18}
              className={cn(
                "transition",
                passwordsMatch ? "text-[var(--success)]" : "text-[var(--neutral-700)]",
              )}
              aria-hidden="true"
            />
          }
        />

        {errorField === "form" && error && (
          <div className="text-sm rounded-md border border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)] px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-[var(--tradex-orange-500)] hover:bg-[var(--tradex-orange-600)] disabled:opacity-60 text-white py-2.5 text-sm font-medium transition mt-2"
        >
          {pending ? "Creating account…" : "Create account"}
        </button>

        <p className="text-[10px] text-[var(--neutral-500)] text-center pt-2 leading-relaxed">
          By signing up you agree this is a closed beta of a paper-trading platform.{" "}
          <span className="text-[var(--tradex-orange-300)] font-medium">
            No real money is involved.
          </span>{" "}
          Practice ₹ only.
        </p>
      </form>
    </>
  );
}

function Field({
  label,
  name,
  type,
  required,
  autoComplete,
  placeholder,
  hint,
  value,
  onChange,
  error,
}: {
  label: string;
  name: keyof FormState;
  type: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}) {
  return (
    <div>
      <label className="text-xs text-[var(--neutral-400)] uppercase tracking-wider">
        {label}
        {!required && <span className="text-[var(--neutral-600)] normal-case ml-1">· optional</span>}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "mt-1 w-full rounded-md bg-[var(--neutral-950)] border px-3 py-2 text-sm text-[var(--neutral-50)] focus:outline-none focus:border-[var(--tradex-orange-500)]",
          error ? "border-[var(--danger)]" : "border-[var(--neutral-700)]",
        )}
      />
      {error ? (
        <div className="text-[10px] text-[var(--danger)] mt-1">{error}</div>
      ) : (
        hint && <div className="text-[10px] text-[var(--neutral-500)] mt-1">{hint}</div>
      )}
    </div>
  );
}

function PasswordField({
  label,
  name,
  value,
  onChange,
  visible,
  onToggle,
  autoComplete,
  hint,
  error,
  suffix,
}: {
  label: string;
  name: "password" | "passwordConfirm";
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  autoComplete: string;
  hint?: string;
  error?: string | null;
  suffix?: ReactNode;
}) {
  return (
    <div>
      <label className="text-xs text-[var(--neutral-400)] uppercase tracking-wider">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          name={name}
          type={visible ? "text" : "password"}
          required
          autoComplete={autoComplete}
          minLength={8}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "w-full rounded-md bg-[var(--neutral-950)] border py-2 pl-3 pr-20 text-sm text-[var(--neutral-50)] focus:outline-none focus:border-[var(--tradex-orange-500)]",
            error ? "border-[var(--danger)]" : "border-[var(--neutral-700)]",
          )}
        />
        <div className="absolute inset-y-0 right-2 flex items-center gap-2">
          {suffix}
          <button
            type="button"
            onClick={onToggle}
            className="text-[var(--neutral-500)] hover:text-[var(--neutral-200)] transition"
            aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      {error ? (
        <div className="text-[10px] text-[var(--danger)] mt-1">{error}</div>
      ) : (
        hint && <div className="text-[10px] text-[var(--neutral-500)] mt-1">{hint}</div>
      )}
    </div>
  );
}
