"use client";

import { useState, useTransition } from "react";
import { Bell, Mail, Shield, Loader2, CheckCircle2 } from "lucide-react";

export default function PreferencesForm() {
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [promotionalEmails, setPromotionalEmails] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    startTransition(async () => {
      // In a real app, this would save to a preferences collection
      // For now, just show success
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    });
  };

  return (
    <div className="space-y-6">
      {success && (
        <div className="rounded-[8px] border border-success/20 bg-success-pale px-4 py-3 text-sm text-success flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Preferences saved successfully
        </div>
      )}

      <div className="rounded-[12px] border border-line bg-white p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-[8px] bg-brand/10 p-3">
            <Mail className="h-6 w-6 text-brand" />
          </div>
          <h2 className="text-[18px] font-semibold text-ink">Email Notifications</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="rounded-[8px] border border-line p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted" />
                <div>
                  <p className="font-medium text-ink">Order Updates</p>
                  <p className="text-sm text-muted">Receive emails for order confirmations, shipping updates, and delivery notifications</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={orderUpdates}
                  onChange={(e) => setOrderUpdates(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-line peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-line after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
              </label>
            </div>
          </div>

          <div className="rounded-[8px] border border-line p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted" />
                <div>
                  <p className="font-medium text-ink">Promotional Emails</p>
                  <p className="text-sm text-muted">Receive emails about sales, new products, and special offers</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={promotionalEmails}
                  onChange={(e) => setPromotionalEmails(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-line peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-line after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
              </label>
            </div>
          </div>
        </form>
      </div>

      <div className="rounded-[12px] border border-line bg-white p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-[8px] bg-purple/10 p-3">
            <Mail className="h-6 w-6 text-purple" />
          </div>
          <h2 className="text-[18px] font-semibold text-ink">Newsletter</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="rounded-[8px] border border-line p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted" />
                <div>
                  <p className="font-medium text-ink">Weekly Newsletter</p>
                  <p className="text-sm text-muted">Get the latest solar tips, product updates, and exclusive deals</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={newsletter}
                  onChange={(e) => setNewsletter(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-line peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-line after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 rounded-[6px] bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-deep disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save Preferences
          </button>
        </form>
      </div>

      <div className="rounded-[12px] border border-line bg-white p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-[8px] bg-brand/10 p-3">
            <Shield className="h-6 w-6 text-brand" />
          </div>
          <h2 className="text-[18px] font-semibold text-ink">Data & Privacy</h2>
        </div>

        <div className="space-y-4">
          <p className="text-muted">
            We respect your privacy. Your personal data is used only to process orders, improve our services, and communicate with you according to your preferences above.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="inline-flex items-center gap-2 rounded-[6px] border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-tile transition-colors">
              Download My Data
            </button>
            <button type="button" className="inline-flex items-center gap-2 rounded-[6px] border border-danger/30 bg-danger-pale px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10 transition-colors">
              Delete My Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}