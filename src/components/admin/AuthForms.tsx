"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import {
  changePasswordAction,
  loginAction,
  requestPasswordResetAction,
  resetPasswordAction,
} from "@/app/(admin)/admin/auth-actions";
import { useToast } from "@/components/admin/ToastProvider";
import type { ActionResult } from "@/lib/admin/action-result";

const inputClass = "admin-field";
const labelClass = "admin-label";
const errorClass = "admin-error";

function FieldError({ message }: { message?: string }) {
  return message ? <p className={errorClass}>{message}</p> : null;
}

function FormMessage({ result }: { result: ActionResult<unknown> | null }) {
  if (!result || result.ok) return null;
  return (
    <p className="rounded-[6px] border border-danger/20 bg-danger-pale px-3 py-2 text-[13px] text-danger" role="alert">
      {result.error}
    </p>
  );
}

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<ActionResult<{ forcePasswordChange: boolean }> | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const response = await loginAction({ email, password });
      setResult(response);
      if (response.ok) {
        router.replace(response.data.forcePasswordChange ? "/admin/change-password" : nextPath);
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormMessage result={result} />
      <div>
        <label className={labelClass} htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
        />
        <FieldError message={!result?.ok ? result?.fieldErrors?.email : undefined} />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className={labelClass} htmlFor="password">Password</label>
          <Link href="/admin/forgot-password" className="text-[12px] font-medium text-brand-deep hover:underline">
            Forgot password
          </Link>
        </div>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
        />
        <FieldError message={!result?.ok ? result?.fieldErrors?.password : undefined} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[6px] bg-navy px-4 text-[13px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Sign in
      </button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<ActionResult<null> | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const response = await requestPasswordResetAction({ email });
      setResult(response);
      if (response.ok) setSent(true);
    });
  };

  if (sent) {
    return (
      <div className="space-y-4">
        <p className="rounded-[6px] border border-success/20 bg-success-pale px-3 py-3 text-[13px] text-success">
          If that email belongs to an account, a reset link has been sent. The link expires in one hour.
        </p>
        <Link href="/admin/login" className="text-[13px] font-medium text-brand-deep hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormMessage result={result} />
      <div>
        <label className={labelClass} htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
        />
        <FieldError message={!result?.ok ? result?.fieldErrors?.email : undefined} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[6px] bg-navy px-4 text-[13px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Send reset link
      </button>
      <Link href="/admin/login" className="block text-center text-[13px] font-medium text-brand-deep hover:underline">
        Back to sign in
      </Link>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [result, setResult] = useState<ActionResult<null> | null>(null);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirm) {
      setResult({ ok: false, error: "Passwords do not match." });
      return;
    }
    startTransition(async () => {
      const response = await resetPasswordAction({ token, password });
      setResult(response);
      if (response.ok) {
        toast("Password updated. Sign in with your new password.");
        router.replace("/admin/login");
      }
    });
  };

  if (!token) {
    return (
      <p className="rounded-[6px] border border-danger/20 bg-danger-pale px-3 py-3 text-[13px] text-danger">
        This reset link is incomplete. Request a new one.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormMessage result={result} />
      <div>
        <label className={labelClass} htmlFor="password">New password</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
        />
        <p className="admin-help">At least 8 characters with letters and numbers.</p>
        <FieldError message={!result?.ok ? result?.fieldErrors?.password : undefined} />
      </div>
      <div>
        <label className={labelClass} htmlFor="confirm">Confirm password</label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[6px] bg-navy px-4 text-[13px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Set new password
      </button>
    </form>
  );
}

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [result, setResult] = useState<ActionResult<null> | null>(null);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirm) {
      setResult({ ok: false, error: "Passwords do not match." });
      return;
    }
    startTransition(async () => {
      const response = await changePasswordAction({ currentPassword, password });
      setResult(response);
      if (response.ok) {
        toast("Password changed.");
        router.replace("/admin");
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {forced ? (
        <p className="rounded-[6px] border border-warning/20 bg-warning-pale px-3 py-2 text-[13px] text-warning">
          Set a new password before continuing.
        </p>
      ) : null}
      <FormMessage result={result} />
      <div>
        <label className={labelClass} htmlFor="current">Current password</label>
        <input
          id="current"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          className={inputClass}
        />
        <FieldError message={!result?.ok ? result?.fieldErrors?.currentPassword : undefined} />
      </div>
      <div>
        <label className={labelClass} htmlFor="password">New password</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
        />
        <FieldError message={!result?.ok ? result?.fieldErrors?.password : undefined} />
      </div>
      <div>
        <label className={labelClass} htmlFor="confirm">Confirm new password</label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-[6px] bg-navy px-5 text-[13px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Update password
      </button>
    </form>
  );
}
