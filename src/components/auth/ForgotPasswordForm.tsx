"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { forgotPasswordAction } from "@/app/(auth)/actions/forgot-password-actions";
import type { ActionResult } from "@/lib/admin/action-result";

const inputClass = "w-full h-11 rounded-[12px] border border-gray-300 bg-white pl-10 pr-4 text-[14px] text-ink outline-none transition-all duration-150 placeholder:text-gray-400 focus:border-brand focus:ring-1 focus:ring-brand";
const labelClass = "mb-2 block text-[14px] font-bold text-ink";
const errorClass = "mt-1 text-[12px] text-danger";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<ActionResult<null> | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const response = await forgotPasswordAction({ email });
      setResult(response);
      if (response.ok) setSent(true);
    });
  };

  if (sent) {
    return (
      <div className="space-y-4">
        <div className="rounded-[8px] border border-success/20 bg-success-pale px-4 py-3 text-[13px] text-success">
          If that email belongs to an account, a reset link has been sent. The link expires in one hour.
        </div>
        <Link href="/login" className="text-[13px] font-medium text-brand hover:underline">
          Back to sign in
        </Link>
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

      <button
        type="submit"
        disabled={pending}
        className="w-full h-11 items-center justify-center gap-2 rounded-[12px] bg-ink text-[14px] font-semibold text-white transition-all duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        Send reset link
      </button>

      <Link href="/login" className="block text-center text-[13px] font-medium text-brand hover:underline">
        <ArrowLeft className="inline h-4 w-4 mr-1" />
        Back to sign in
      </Link>
    </form>
  );
}