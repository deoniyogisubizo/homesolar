import { ToastProvider } from "@/components/admin/ToastProvider";

export const metadata = {
  title: "Homesolar Admin",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-root min-h-screen bg-canvas text-ink">
      <ToastProvider>{children}</ToastProvider>
    </div>
  );
}
