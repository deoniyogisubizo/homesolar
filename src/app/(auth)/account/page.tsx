import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/auth/customer";
import { getCustomerOverview } from "@/app/(auth)/actions/dashboard-actions";
import { AccountLayout } from "@/components/account/AccountLayout";
import Link from "next/link";
import { Package, Heart, MapPin, Star, Truck, ChevronRight } from "lucide-react";

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_STYLES: Record<string, string> = {
  new: "bg-warning/10 text-warning border-warning/20",
  contacted: "bg-tile text-ink border-line",
  confirmed: "bg-info/10 text-info border-info/20",
  processing: "bg-brand/10 text-brand border-brand/20",
  out_for_delivery: "bg-info/10 text-info border-info/20",
  delivered: "bg-success/10 text-success border-success/20",
  cancelled: "bg-danger/10 text-danger border-danger/20",
};

const STATUS_LABELS: Record<string, string> = {
  new: "Order received",
  contacted: "Contacted",
  confirmed: "Confirmed",
  processing: "Processing",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function getStatusBadge(status: string) {
  return (
    <span
      className={`inline-flex items-center rounded-[4px] border px-2 py-0.5 text-[11px] font-medium ${
        STATUS_STYLES[status] ?? STATUS_STYLES.new
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export const instant = false;

export const metadata = { title: "My Account" };

export default async function AccountPage() {
  const session = await getCustomerSession();
  if (!session) {
    redirect("/login?next=/account");
  }

  const overview = await getCustomerOverview();

  return (
    <AccountLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-[28px] font-bold text-ink">My Account</h1>
          <p className="mt-1 text-muted">Welcome back, {session.name}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[12px] border border-line bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-[8px] bg-brand/10 p-3">
                <Package className="h-6 w-6 text-brand" />
              </div>
              <div>
                <p className="text-[12px] font-medium text-muted">Recent Orders</p>
                <p className="text-[24px] font-bold text-ink">{overview.ok ? overview.data.recentOrders.length : 0}</p>
              </div>
            </div>
          </div>
          <div className="rounded-[12px] border border-line bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-[8px] bg-info/10 p-3">
                <Truck className="h-6 w-6 text-info" />
              </div>
              <div>
                <p className="text-[12px] font-medium text-muted">In Progress</p>
                <p className="text-[24px] font-bold text-ink">{overview.ok ? overview.data.inProgressOrders.length : 0}</p>
              </div>
            </div>
          </div>
          <div className="rounded-[12px] border border-line bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-[8px] bg-purple/10 p-3">
                <Heart className="h-6 w-6 text-purple" />
              </div>
              <div>
                <p className="text-[12px] font-medium text-muted">Wishlist Items</p>
                <p className="text-[24px] font-bold text-ink">{overview.ok ? overview.data.wishlistCount : 0}</p>
              </div>
            </div>
          </div>
          <div className="rounded-[12px] border border-line bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-[8px] bg-green/10 p-3">
                <Star className="h-6 w-6 text-green" />
              </div>
              <div>
                <p className="text-[12px] font-medium text-muted">Reviews</p>
                <p className="text-[24px] font-bold text-ink">0</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[12px] border border-line bg-white">
            <div className="border-b border-line px-6 py-4 flex items-center justify-between">
              <h2 className="text-[18px] font-semibold text-ink">Recent Orders</h2>
              <Link href="/account/orders" className="text-sm font-medium text-brand hover:underline">
                View all
              </Link>
            </div>
            <div className="divide-y divide-line">
              {overview.ok && overview.data.recentOrders.length > 0 ? (
                overview.data.recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/account/orders/${order.id}`}
                    className="px-6 py-4 flex items-center justify-between hover:bg-tile/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-[8px] bg-tile flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted" />
                      </div>
                      <div>
                        <p className="font-medium text-ink">{order.orderNumber}</p>
                        <p className="text-sm text-muted">{order.formattedTotal} • {order.itemsCount} item{order.itemsCount !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(order.status)}
                      <span className="text-sm text-muted">{formatDate(order.createdAt)}</span>
                      <ChevronRight className="h-4 w-4 text-muted" />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="px-6 py-8 text-center text-muted">
                  No orders yet. <Link href="/search" className="text-brand hover:underline">Start shopping</Link>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[12px] border border-line bg-white">
            <div className="border-b border-line px-6 py-4 flex items-center justify-between">
              <h2 className="text-[18px] font-semibold text-ink">In Progress</h2>
            </div>
            <div className="divide-y divide-line">
              {overview.ok && overview.data.inProgressOrders.length > 0 ? (
                overview.data.inProgressOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/account/orders/${order.id}`}
                    className="px-6 py-4 flex items-center justify-between hover:bg-tile/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-ink">{order.orderNumber}</p>
                      <p className="text-sm text-muted">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(order.status)}
                      <ChevronRight className="h-4 w-4 text-muted" />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="px-6 py-8 text-center text-muted">No orders in progress</div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Link href="/account/orders" className="rounded-[12px] border border-line bg-white p-6 hover:border-brand/40 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-[8px] bg-navy/10 p-3">
                <Package className="h-6 w-6 text-navy" />
              </div>
              <h3 className="text-[16px] font-semibold text-ink">My Orders</h3>
            </div>
            <p className="text-muted">View order history, track deliveries, download invoices</p>
          </Link>
          <Link href="/account/addresses" className="rounded-[12px] border border-line bg-white p-6 hover:border-brand/40 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-[8px] bg-green/10 p-3">
                <MapPin className="h-6 w-6 text-green" />
              </div>
              <h3 className="text-[16px] font-semibold text-ink">Addresses</h3>
            </div>
            <p className="text-muted">Manage delivery addresses across Rwanda</p>
          </Link>
          <Link href="/account/wishlist" className="rounded-[12px] border border-line bg-white p-6 hover:border-brand/40 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-[8px] bg-purple/10 p-3">
                <Heart className="h-6 w-6 text-purple" />
              </div>
              <h3 className="text-[16px] font-semibold text-ink">Wishlist</h3>
            </div>
            <p className="text-muted">Save products for later</p>
          </Link>
        </div>
      </div>
    </AccountLayout>
  );
}