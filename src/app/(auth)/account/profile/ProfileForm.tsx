"use client";

import { useState, useTransition } from "react";
import { User, Loader2, CheckCircle2 } from "lucide-react";
import { updateCustomerProfile } from "@/app/(auth)/actions/dashboard-actions";

export default function ProfileForm({ initialName, initialPhone, initialEmail }: { initialName: string; initialPhone: string; initialEmail: string }) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const response = await updateCustomerProfile({ name, phone });
      if (response.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(response.error);
      }
    });
  };

  return (
    <div className="rounded-[12px] border border-line bg-white p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-[8px] bg-navy/10 p-3">
          <User className="h-6 w-6 text-navy" />
        </div>
        <h2 className="text-[18px] font-semibold text-ink">Profile Information</h2>
      </div>

      {success && (
        <div className="mb-4 rounded-[8px] border border-success/20 bg-success-pale px-4 py-3 text-sm text-success flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Profile updated successfully
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-[8px] border border-danger/20 bg-danger-pale px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-[6px] border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Email</label>
            <input
              type="email"
              value={initialEmail}
              className="w-full rounded-[6px] border border-line bg-tile px-3 py-2 text-sm text-muted"
              disabled
            />
            <p className="text-xs text-muted mt-1">Email cannot be changed. Contact support if needed.</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-[6px] border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            placeholder="+250 7XX XXX XXX"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-[6px] bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-deep disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save Changes
        </button>
      </form>
    </div>
  );
}