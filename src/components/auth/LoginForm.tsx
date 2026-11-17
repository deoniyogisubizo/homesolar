"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { loginAction } from "@/app/(auth)/actions/auth-actions";
import type { ActionResult } from "@/lib/admin/action-result";

const inputClass = "w-full h-11 rounded-[12px] border border-gray-300 bg-white pl-10 pr-4 text-[14px] text-ink outline-none transition-all duration-150 placeholder:text-gray-400 focus:border-brand focus:ring-1 focus:ring-brand";
const labelClass = "mb-2 block text-[14px] font-bold text-ink";
const errorClass = "mt-1 text-[12px] text-danger";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [result, setResult] = useState<ActionResult<null> | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResult(null);
    startTransition(async () => {
      const response = await loginAction({ email, password });
      setResult(response);
      if (response.ok) {
        router.replace("/account");
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {result && !result.ok && (
        <div className="rounded-[8px] border border-danger/20 bg-danger-pale px-4 py-3 text-[13px] text-danger" role="alert">
          {result.error}
        </div>
      )}

      <div>
        <label className={labelClass} htmlFor="email">Email</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" strokeWidth={1.8} />
          <input
            id="email"
            type="email"
            autoComplete="username"
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
        <div className="flex items-center justify-between">
          <label className={labelClass} htmlFor="password">Password</label>
          <Link href="/forgot-password" className="text-[13px] font-medium text-brand hover:underline">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" strokeWidth={1.8} />
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
            placeholder="Enter your password"
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
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full h-11 items-center justify-center gap-2 rounded-[12px] bg-ink text-[14px] font-semibold text-white transition-all duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        Sign in
      </button>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand" />
          <span className="text-[13px] text-gray-500">Remember me</span>
        </label>
      </div>
    </form>
  );
}