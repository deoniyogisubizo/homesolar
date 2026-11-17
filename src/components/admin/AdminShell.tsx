"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AtSign,
  BarChart3,
  Bell,
  Boxes,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Gauge,
  History,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  MessageSquare,
  Package,
  PanelBottom,
  Phone,
  Receipt,
  Search,
  Send,
  Settings,
  Shield,
  Star,
  Store,
  Tag,
  Truck,
  Users,
  X,
} from "lucide-react";
import { logoutAction } from "@/app/(admin)/admin/auth-actions";
import { ROLE_LABELS, type AdminRole } from "@/lib/admin/permissions";
import type { AdminNavGroup } from "@/lib/admin/nav";

const icons: Record<string, React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  gauge: Gauge,
  receipt: Receipt,
  users: Users,
  megaphone: Megaphone,
  tag: Tag,
  package: Package,
  layers: Layers,
  boxes: Boxes,
  star: Star,
  layout: LayoutDashboard,
  menu: Menu,
  "panel-bottom": PanelBottom,
  "file-text": FileText,
  image: ImageIcon,
  send: Send,
  mail: Mail,
  "message-square": MessageSquare,
  "bar-chart": BarChart3,
  settings: Settings,
  phone: Phone,
  bell: Bell,
  truck: Truck,
  "at-sign": AtSign,
  search: Search,
  shield: Shield,
  history: History,
};

type SearchResult = {
  group: string;
  items: Array<{ id: string; label: string; sub: string; href: string }>;
};

type NotificationItem = {
  id: string;
  label: string;
  sub: string;
  href: string;
  at: string;
};

type NotificationsPayload = {
  orders: number;
  lowStock: number;
  messages: number;
  reviews: number;
  items: NotificationItem[];
};

export function AdminShell({
  session,
  nav,
  children,
}: {
  session: { name: string; email: string; role: AdminRole };
  nav: AdminNavGroup[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [notifications, setNotifications] = useState<NotificationsPayload | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!paletteOpen) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [paletteOpen]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDrawerOpen(false), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (!query.trim()) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      if (active) setSearching(true);
      try {
        const response = await fetch(`/api/admin/search?q=${encodeURIComponent(query.trim())}`);
        const payload = (await response.json()) as { ok: boolean; data?: { groups: SearchResult[] } };
        if (active && payload.ok && payload.data) setResults(payload.data.groups);
      } finally {
        if (active) setSearching(false);
      }
    }, 220);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const refreshNotifications = useCallback(async () => {
    const response = await fetch("/api/admin/notifications");
    const payload = (await response.json()) as { ok: boolean; data?: NotificationsPayload };
    if (payload.ok && payload.data) setNotifications(payload.data);
  }, []);

  const loadNotifications = useCallback(async () => {
    setNotificationOpen(true);
    await refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshNotifications(), 0);
    return () => window.clearTimeout(timer);
  }, [pathname, refreshNotifications]);

  const notificationCount = notifications
    ? notifications.orders + notifications.lowStock + notifications.messages + notifications.reviews
    : 0;

  const navContent = useMemo(
    () => (
      <nav aria-label="Dashboard navigation" className="flex-1 overflow-y-auto px-2 py-3">
        {nav.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed ? (
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">{group.label}</p>
            ) : null}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = icons[item.icon] ?? Gauge;
                const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const badge = item.href === "/admin/orders" ? notifications?.orders ?? 0 : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-[13px] transition-colors ${
                        active ? "bg-white/12 font-medium text-white" : "text-white/70 hover:bg-white/8 hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden={true} />
                      {!collapsed ? <span className="truncate">{item.label}</span> : null}
                      {badge ? (
                        <span className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-orange px-1 text-[9px] font-semibold text-white">
                          {badge > 9 ? "9+" : badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    ),
    [collapsed, nav, notifications, pathname],
  );

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 hidden flex-col bg-navy text-white transition-[width] duration-200 lg:flex ${
          collapsed ? "w-[76px]" : "w-[260px]"
        }`}
      >
        <div className={`flex h-[60px] shrink-0 items-center border-b border-white/10 ${collapsed ? "justify-center px-2" : "px-4"}`}>
          {collapsed ? (
            <Store className="h-5 w-5" aria-hidden="true" />
          ) : (
            <span className="truncate text-[14px] font-semibold tracking-[-0.01em]">Homesolar Admin</span>
          )}
        </div>
        {navContent}
        <div className="border-t border-white/10 p-2">
          <button
            type="button"
            onClick={() => setCollapsed((current) => !current)}
            className="flex w-full items-center justify-center gap-2 rounded-[6px] px-2 py-2 text-[12px] text-white/60 hover:bg-white/8 hover:text-white"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            {!collapsed ? <span>Collapse</span> : null}
          </button>
        </div>
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-navy-deep/50"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[280px] flex-col bg-navy text-white">
            <div className="flex h-[60px] items-center justify-between border-b border-white/10 px-4">
              <span className="text-[14px] font-semibold">Homesolar Admin</span>
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close navigation" className="p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            {navContent}
          </div>
        </div>
      ) : null}

      <div className={`flex min-w-0 flex-1 flex-col ${collapsed ? "lg:pl-[76px]" : "lg:pl-[260px]"}`}>
        <header className="no-print sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b border-admin-line bg-white px-4 lg:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-[5px] p-1.5 text-ink hover:bg-tile lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex h-9 min-w-0 flex-1 max-w-[420px] items-center gap-2 rounded-[6px] border border-admin-line bg-tile px-3 text-left text-[12px] text-admin-muted hover:border-brand/40"
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Search orders, products, customers</span>
            <span className="ml-auto hidden shrink-0 rounded border border-admin-line bg-white px-1.5 py-0.5 text-[10px] text-admin-muted sm:inline">
              Ctrl K
            </span>
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <Link
              href="/"
              target="_blank"
              rel="noreferrer"
              className="hidden h-9 items-center gap-1.5 rounded-[6px] border border-admin-line px-3 text-[12px] font-medium text-ink hover:bg-tile sm:inline-flex"
            >
              <Store className="h-3.5 w-3.5" />
              View site
            </Link>
            <div className="relative">
              <button
                type="button"
                onClick={() => (notificationOpen ? setNotificationOpen(false) : loadNotifications())}
                className="relative flex h-9 w-9 items-center justify-center rounded-[6px] text-ink hover:bg-tile"
                aria-label="Notifications"
                aria-expanded={notificationOpen}
              >
                <Bell className="h-4 w-4" />
                {notificationCount ? (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange px-1 text-[9px] font-semibold text-white">
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </span>
                ) : null}
              </button>
              {notificationOpen ? (
                <div className="absolute right-0 top-11 z-50 w-[min(360px,calc(100vw-32px))] rounded-[8px] border border-admin-line bg-white shadow-[0_16px_40px_rgba(16,24,40,0.14)]">
                  <div className="flex items-center justify-between border-b border-admin-line px-3 py-2.5">
                    <span className="text-[13px] font-semibold text-ink">Notifications</span>
                    <button
                      type="button"
                      onClick={() => setNotificationOpen(false)}
                      className="p-1 text-admin-muted hover:text-ink"
                      aria-label="Close notifications"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="max-h-[360px] overflow-y-auto">
                    {notifications?.items.length ? (
                      notifications.items.map((item) => (
                        <Link
                          key={item.id}
                          href={item.href}
                          onClick={() => setNotificationOpen(false)}
                          className="block border-b border-admin-line px-3 py-2.5 last:border-b-0 hover:bg-tile"
                        >
                          <p className="text-[12px] font-medium text-ink">{item.label}</p>
                          <p className="text-[11px] text-admin-muted">{item.sub}</p>
                        </Link>
                      ))
                    ) : (
                      <p className="px-3 py-6 text-center text-[12px] text-admin-muted">No new notifications.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="flex h-9 items-center gap-2 rounded-[6px] px-1.5 text-left hover:bg-tile"
                  aria-label="User menu"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-[11px] font-semibold text-white">
                    {session.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="hidden min-w-0 sm:block">
                    <span className="block max-w-[150px] truncate text-[12px] font-medium text-ink">{session.name}</span>
                    <span className="block text-[10px] text-admin-muted">{ROLE_LABELS[session.role]}</span>
                  </span>
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={6}
                  className="z-[80] w-56 rounded-[6px] border border-admin-line bg-white p-1 shadow-[0_12px_32px_rgba(16,24,40,0.12)]"
                >
                  <div className="px-2 py-2">
                    <p className="truncate text-[12px] font-medium text-ink">{session.email}</p>
                    <p className="text-[11px] text-admin-muted">{ROLE_LABELS[session.role]}</p>
                  </div>
                  <DropdownMenu.Separator className="my-1 h-px bg-admin-line" />
                  <DropdownMenu.Item asChild>
                    <Link href="/admin/profile" className="block rounded-[4px] px-2 py-1.5 text-[12px] text-ink outline-none data-[highlighted]:bg-tile">
                      Profile
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild>
                    <Link href="/admin/change-password" className="block rounded-[4px] px-2 py-1.5 text-[12px] text-ink outline-none data-[highlighted]:bg-tile">
                      Security
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="my-1 h-px bg-admin-line" />
                  <DropdownMenu.Item
                    onSelect={() => {
                      void logoutAction().then(() => {
                        router.replace("/admin/login");
                        router.refresh();
                      });
                    }}
                    className="flex cursor-pointer items-center gap-2 rounded-[4px] px-2 py-1.5 text-[12px] text-danger outline-none data-[highlighted]:bg-danger-pale"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <Dialog.Root open={paletteOpen} onOpenChange={setPaletteOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-navy-deep/45" />
          <Dialog.Content className="fixed left-1/2 top-[12vh] z-[101] w-[min(620px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-[8px] border border-admin-line bg-white shadow-[0_24px_60px_rgba(16,24,40,0.2)]">
            <Dialog.Title className="sr-only">Global search</Dialog.Title>
            <div className="flex items-center gap-2 border-b border-admin-line px-4">
              <Search className="h-4 w-4 text-admin-muted" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  const next = event.target.value;
                  setQuery(next);
                  if (!next.trim()) {
                    setResults([]);
                    setSearching(false);
                  }
                }}
                placeholder="Search orders, products and customers"
                className="h-12 flex-1 border-0 bg-transparent text-[14px] text-ink outline-none placeholder:text-admin-muted"
                aria-label="Search orders, products and customers"
              />
              {searching ? <span className="text-[11px] text-admin-muted">Searching...</span> : null}
            </div>
            <div className="max-h-[420px] overflow-y-auto p-2">
              {results.length ? (
                results.map((group) => (
                  <div key={group.group} className="mb-2">
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">
                      {group.group}
                    </p>
                    {group.items.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setPaletteOpen(false)}
                        className="block rounded-[5px] px-2 py-2 hover:bg-tile"
                      >
                        <span className="block text-[13px] font-medium text-ink">{item.label}</span>
                        <span className="block text-[11px] text-admin-muted">{item.sub}</span>
                      </Link>
                    ))}
                  </div>
                ))
              ) : (
                <p className="px-3 py-8 text-center text-[12px] text-admin-muted">
                  {query ? "No matches found." : "Type to search across the dashboard."}
                </p>
              )}
            </div>
            <div className="border-t border-admin-line px-4 py-2 text-[10px] text-admin-muted">
              Press Esc to close
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
