"use client";

import { useState, useTransition } from "react";
import { Shield, Loader2, Eye, EyeOff, CheckCircle2, LogOut } from "lucide-react";
import { changeCustomerPassword } from "@/app/(auth)/actions/dashboard-actions";

export default function SecuritySection() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    if (newPassword.length < 8) {
      setFieldErrors({ newPassword: "Password must be at least 8 characters" });
      return;
    }

    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setFieldErrors({ newPassword: "Use letters and numbers" });
      return;
    }

    startTransition(async () => {
      const response = await changeCustomerPassword({ currentPassword, newPassword });
      if (response.ok) {
        setSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setSuccess(false), 3000);
      } else {
        if (response.fieldErrors) {
          setFieldErrors(response.fieldErrors);
        } else {
          setError(response.error);
        }
      }
    });
  };

  return (
    <div className="rounded-[12px] border border-line bg-white p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-[8px] bg-purple/10 p-3">
          <Shield className="h-6 w-6 text-purple" />
        </div>
        <h2 className="text-[18px] font-semibold text-ink">Change Password</h2>
      </div>

      {success && (
        <div className="mb-4 rounded-[8px] border border-success/20 bg-success-pale px-4 py-3 text-sm text-success flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Password changed successfully. You&apos;ll need to sign in again on other devices.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-[8px] border border-danger/20 bg-danger-pale px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Current Password</label>
          <div className="relative">
            <input
              type={showCurrentPassword ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-[6px] border border-line bg-white px-3 py-2 text-sm pr-10 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              aria-label={showCurrentPassword ? "Hide password" : "Show password"}
            >
              {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {fieldErrors.currentPassword && <p className="mt-1 text-sm text-danger">{fieldErrors.currentPassword}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1">New Password</label>
          <div className="relative">
            <input
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-[6px] border border-line bg-white px-3 py-2 text-sm pr-10 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              aria-label={showNewPassword ? "Hide password" : "Show password"}
            >
              {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <p className="mt-1 text-xs text-muted">At least 8 characters with letters and numbers</p>
          {fieldErrors.newPassword && <p className="mt-1 text-sm text-danger">{fieldErrors.newPassword}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1">Confirm New Password</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-[6px] border border-line bg-white px-3 py-2 text-sm pr-10 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {fieldErrors.confirmPassword && <p className="mt-1 text-sm text-danger">{fieldErrors.confirmPassword}</p>}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-[6px] bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-deep disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Change Password
        </button>
      </form>

      <div className="mt-8 pt-8 border-t border-line">
        <h3 className="text-[16px] font-semibold text-ink mb-4">Active Sessions</h3>
        <p className="text-muted mb-4">You&apos;re currently signed in on this device. Changing your password will sign you out everywhere else.</p>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-[6px] border border-danger/30 bg-danger-pale px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out Everywhere
        </button>
      </div>
    </div>
  );
}