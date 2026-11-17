"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { registerAction } from "@/app/(auth)/actions/auth-actions";
import type { ActionResult } from "@/lib/admin/action-result";

const inputClass = "w-full h-11 rounded-[12px] border border-gray-300 bg-white pl-10 pr-4 text-[14px] text-ink outline-none transition-all duration-150 placeholder:text-gray-400 focus:border-brand focus:ring-1 focus:ring-brand";
const labelClass = "mb-2 block text-[14px] font-bold text-ink";
const errorClass = "mt-1 text-[12px] text-danger";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [result, setResult] = useState<ActionResult<null> | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResult(null);

    startTransition(async () => {
      const response = await registerAction({ name, email, phone, password, confirmPassword });
      setResult(response);
      if (response.ok) {
        router.replace("/account");
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {result && !result.ok && result.error && (
        <div className="rounded-[8px] border border-danger/20 bg-danger-pale px-4 py-3 text-[13px] text-danger" role="alert">
          {result.error}
        </div>
      )}

      <div>
        <label className={labelClass} htmlFor="name">Full Name</label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" strokeWidth={1.8} />
          <input
            id="name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
            placeholder="Enter your full name"
          />
        </div>
        {result && !result.ok && result.fieldErrors?.name && <div className={errorClass}>{result.fieldErrors.name}</div>}
      </div>

      <div>
        <label className={labelClass} htmlFor="email">Email</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" strokeWidth={1.8} />
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
            placeholder="Enter your email"
          />
        </div>
        {result && !result.ok && result.fieldErrors?.email && <div className={errorClass}>{result.fieldErrors.email}</div>}
      </div>

      <div>
        <label className={labelClass} htmlFor="phone">Phone Number</label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" strokeWidth={1.8} />
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={inputClass}
            placeholder="Enter your phone number"
          />
        </div>
        {result && !result.ok && result.fieldErrors?.phone && <div className={errorClass}>{result.fieldErrors.phone}</div>}
      </div>

      <div>
        <label className={labelClass} htmlFor="password">Password</label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" strokeWidth={1.8} />
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
            placeholder="Create a password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-5 w-5" strokeWidth={1.8} /> : <Eye className="h-5 w-5" strokeWidth={1.8} />}
          </button>
        </div>
        {result && !result.ok && result.fieldErrors?.password && <div className={errorClass}>{result.fieldErrors.password}</div>}
        <div className="mt-1.5 text-[11px] text-gray-500">At least 8 characters with letters and numbers</div>
      </div>

      <div>
        <label className={labelClass} htmlFor="confirmPassword">Confirm Password</label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" strokeWidth={1.8} />
          <input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className={inputClass}
            placeholder="Confirm your password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? <EyeOff className="h-5 w-5" strokeWidth={1.8} /> : <Eye className="h-5 w-5" strokeWidth={1.8} />}
          </button>
        </div>
        {result && !result.ok && result.fieldErrors?.confirmPassword && <div className={errorClass}>{result.fieldErrors.confirmPassword}</div>}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full h-11 items-center justify-center gap-2 rounded-[12px] bg-ink text-[14px] font-semibold text-white transition-all duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        Create account
      </button>

      <div className="flex items-start gap-2">
        <input type="checkbox" id="terms" required className="mt-1 h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand" />
        <label htmlFor="terms" className="text-[12px] text-gray-500">
          I agree to the <Link href="/terms" className="text-brand hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-brand hover:underline">Privacy Policy</Link>
        </label>
      </div>
    </form>
  );
}