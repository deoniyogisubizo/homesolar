"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package,
  Heart,
  MapPin,
  Star,
  User,
  Bell,
  MessageSquare,
  LayoutDashboard,
  LogOut,
  ArrowLeft,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/account", label: "Overview", icon: LayoutDashboard },
  { href: "/account/orders", label: "My Orders", icon: Package },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/reviews", label: "My Reviews", icon: Star },
  { href: "/account/profile", label: "Profile & Security", icon: User },
  { href: "/account/preferences", label: "Preferences", icon: Bell },
  { href: "/account/support", label: "Support", icon: MessageSquare },
];

export function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-tile">
      <div className="flex">
<aside
            className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-line transform transition-transform duration-200 lg:relative lg:translate-x-0 ${
              mobileOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex h-16 items-center justify-between border-b border-line px-4 lg:justify-center">
              <Link href="/account" className="font-bold text-ink lg:hidden">
                My Account
              </Link>
              <button
                className="lg:hidden p-2 rounded text-muted hover:bg-tile"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            </div>
            <nav className="p-4 space-y-1 overflow-y-auto flex-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/account" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-lg font-bold transition-colors ${
                      isActive
                        ? "bg-navy/10 text-navy"
                        : "text-ink hover:bg-tile"
                    }`}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          <div className="border-t border-line p-4">
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-[8px] border border-danger/30 bg-danger-pale px-3 py-2.5 text-sm font-medium text-danger hover:bg-danger/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </form>
          </div>
        </aside>

        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        <main className="flex-1 lg:ml-0">
          <header className="sticky top-0 z-20 bg-white border-b border-line lg:hidden">
            <div className="flex h-16 items-center justify-between px-4">
              <button
                className="p-2 rounded text-muted hover:bg-tile"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <LayoutDashboard className="h-6 w-6" />
              </button>
              <span className="font-semibold text-ink">My Account</span>
              <div className="w-10" />
            </div>
          </header>
          <div className="p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}