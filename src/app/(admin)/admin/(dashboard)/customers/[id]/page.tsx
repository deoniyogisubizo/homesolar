import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { Star, MapPin, Phone, Mail, Package, AlertTriangle } from "lucide-react";
import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge, labelize } from "@/components/admin/StatusBadge";
import { guardPage } from "@/lib/admin/page-guard";
import { getSetting } from "@/lib/admin/settings";
import { connectToDatabase } from "@/lib/mongodb";
import { Customer } from "@/models/Customer";
import { Order } from "@/models/Order";

export const metadata = { title: "Customer" };

function money(value: number, symbol: string) {
  return `${symbol} ${value.toLocaleString("en-US")}`;
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await guardPage("customers:read");
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();

  await connectToDatabase();
  const [customer, general] = await Promise.all([
    Customer.findById(id).lean(),
    getSetting("general"),
  ]);
  if (!customer) notFound();

  const orders = await Order.find({ customerId: id }).sort({ createdAt: -1 }).lean();

  return (
    <>
      <PageHeader
        title={customer.name}
        description={`${customer.orderCount} orders · ${money(customer.lifetimeValue, general.currencySymbol)} lifetime value`}
        breadcrumbs={[{ label: "Sales" }, { label: "Customers", href: "/admin/customers" }, { label: customer.name }]}
      />
      <PageBody>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-4">
            <section className="rounded-[8px] border border-admin-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-semibold text-ink">Contact</h2>
                  <p className="mt-0.5 text-[12px] text-admin-muted">
                    {customer.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {customer.email}</span>}
                    <span className="flex items-center gap-1 ml-2"><Phone className="h-3.5 w-3.5" /> {customer.phone}</span>
                  </p>
                </div>
                <StatusBadge label={customer.blocked ? "Blocked" : "Active"} tone={customer.blocked ? "danger" : "success"} />
              </div>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-[12px]">
                <div>
                  <dt className="text-admin-muted">Orders</dt>
                  <dd className="text-ink">{customer.orderCount}</dd>
                </div>
                <div>
                  <dt className="text-admin-muted">Lifetime value</dt>
                  <dd className="text-ink">{money(customer.lifetimeValue, general.currencySymbol)}</dd>
                </div>
                <div>
                  <dt className="text-admin-muted">First order</dt>
                  <dd className="text-ink">{customer.firstOrderAt ? new Date(customer.firstOrderAt).toLocaleDateString("en-GB") : "—"}</dd>
                </div>
                <div>
                  <dt className="text-admin-muted">Last order</dt>
                  <dd className="text-ink">{customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString("en-GB") : "—"}</dd>
                </div>
              </dl>
            </section>

            {customer.addresses.length ? (
              <section className="rounded-[8px] border border-admin-line bg-white p-5">
                <h2 className="text-[14px] font-semibold text-ink">Saved addresses</h2>
                <ul className="mt-3 divide-y divide-admin-line">
                  {customer.addresses.map((address, index) => (
                    <li key={index} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-ink">{address.label || `Address ${index + 1}`}</p>
                          <p className="mt-0.5 whitespace-pre-line text-[12px] text-ink">
                            {[
                              address.line1,
                              [address.sector, address.district, address.province]
                                .filter(Boolean)
                                .join(", "),
                              address.landmark ? `Landmark: ${address.landmark}` : "",
                              address.phone,
                            ]
                              .filter(Boolean)
                              .join("\n")}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {customer.notes.length ? (
              <section className="rounded-[8px] border border-admin-line bg-white p-5">
                <h2 className="text-[14px] font-semibold text-ink">Notes</h2>
                <ul className="mt-3 divide-y divide-admin-line">
                  {customer.notes.map((note, index) => (
                    <li key={index} className="py-3">
                      <p className="whitespace-pre-line text-[13px] text-ink">{note.body}</p>
                      <p className="mt-1 text-[11px] text-admin-muted">{note.by} · {new Date(note.at).toLocaleString("en-GB")}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="rounded-[8px] border border-admin-line bg-white">
              <div className="border-b border-admin-line px-4 py-3">
                <h2 className="text-[14px] font-semibold text-ink">Order history</h2>
              </div>
              {orders.length ? (
                <ul className="divide-y divide-admin-line">
                  {orders.map((order) => (
                    <li key={String(order._id)} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{order.orderNumber}</p>
                        <p className="text-[12px] text-admin-muted">
                          {order.items.length} item{order.items.length === 1 ? "" : "s"} ·
                          {order.createdAt?.toLocaleString("en-GB")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge label={labelize(order.status)} />
                        <Link
                          href={`/admin/orders/${order._id}`}
                          className="text-[12px] text-brand-deep hover:underline"
                        >
                          View
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-8 text-center text-[12px] text-admin-muted">No orders yet.</p>
              )}
            </section>
          </div>

          <aside className="h-fit space-y-3 xl:sticky xl:top-[84px]">
            <div className="rounded-[8px] border border-admin-line bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">Customer status</p>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2 text-[13px]">
                  {customer.blocked ? (
                    <AlertTriangle className="h-4 w-4 text-danger" />
                  ) : (
                    <Star className="h-4 w-4 text-brand" />
                  )}
                  <span className={customer.blocked ? "text-danger" : "text-ink"}>
                    {customer.blocked ? "Blocked" : "Active"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[13px]">
                  <Package className="h-4 w-4 text-admin-muted" />
                  <span>{customer.orderCount} order{customer.orderCount === 1 ? "" : "s"}</span>
                </div>
                <div className="flex items-center gap-2 text-[13px]">
                  <MapPin className="h-4 w-4 text-admin-muted" />
                  <span>{customer.addresses.length} saved address{customer.addresses.length === 1 ? "" : "es"}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[8px] border border-admin-line bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">Quick actions</p>
              <div className="mt-2 space-y-2">
                <button
                  type="button"
                  className={`inline-flex w-full h-9 items-center justify-center gap-2 rounded-[6px] ${
                    customer.blocked
                      ? "border border-admin-line bg-white text-ink hover:bg-tile"
                      : "border border-danger/30 bg-white text-danger hover:bg-danger-pale"
                  }`}
                >
                  {customer.blocked ? "Unblock customer" : "Block customer"}
                </button>
                <Link
                  href="#"
                  className="inline-flex w-full h-9 items-center justify-center gap-2 rounded-[6px] border border-admin-line bg-white text-ink hover:bg-tile"
                >
                  Export orders CSV
                </Link>
              </div>
            </div>

            <Link
              href="/admin/customers"
              className="inline-flex h-9 w-full items-center justify-center rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
            >
              Back to customers
            </Link>
          </aside>
        </div>
      </PageBody>
    </>
  );
}