"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock, Eye, EyeOff } from "lucide-react";
import { resetPasswordAction } from "@/app/(auth)/actions/forgot-password-actions";
import type { ActionResult } from "@/lib/admin/action-result";

const inputClass = "w-full h-11 rounded-[12px] border border-gray-300 bg-white pl-10 pr-4 text-[14px] text-ink outline-none transition-all duration-150 placeholder:text-gray-400 focus:border-brand focus:ring-1 focus:ring-brand";
const labelClass = "mb-2 block text-[14px] font-bold text-ink";
const errorClass = "mt-1 text-[12px] text-danger";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<ActionResult<null> | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirm) {
      setResult({ ok: false, error: "Passwords do not match." });
      return;
    }
    if (!token) {
      setResult({ ok: false, error: "This reset link is incomplete. Request a new one." });
      return;
    }
    startTransition(async () => {
      const response = await resetPasswordAction({ token, password });
      setResult(response);
      if (response.ok) {
        router.replace("/login");
      }
    });
  };

  if (!token) {
    return (
      <div className="rounded-[8px] border border-danger/20 bg-danger-pale px-4 py-3 text-[13px] text-danger">
        This reset link is incomplete. Request a new one.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {result && !result.ok && result.error && (
        <div className="rounded-[8px] border border-danger/20 bg-danger-pale px-4 py-3 text-[13px] text-danger" role="alert">
          {result.error}
        </div>
      )}

      <div>
        <label className={labelClass} htmlFor="password">New password</label>
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
            placeholder="Create a new password"
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
        <div className="mt-1.5 text-[11px] text-gray-500">At least 8 characters with letters and numbers</div>
        {result && !result.ok && result.fieldErrors?.password && <div className={errorClass}>{result.fieldErrors.password}</div>}
      </div>

      <div>
        <label className={labelClass} htmlFor="confirm">Confirm new password</label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" strokeWidth={1.8} />
          <input
            id="confirm"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className={inputClass}
            placeholder="Confirm your new password"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
            aria-label={showConfirm ? "Hide password" : "Show password"}
          >
            {showConfirm ? <EyeOff className="h-5 w-5" strokeWidth={1.8} /> : <Eye className="h-5 w-5" strokeWidth={1.8} />}
          </button>
        </div>
        {result && !result.ok && result.fieldErrors?.confirm && <div className={errorClass}>{result.fieldErrors.confirm}</div>}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full h-11 items-center justify-center gap-2 rounded-[12px] bg-ink text-[14px] font-semibold text-white transition-all duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        Set new password
      </button>
    </form>
  );
}