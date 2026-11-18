import Link from "next/link";
import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type AdminTableRow } from "@/components/admin/DataTable";
import { guardPage } from "@/lib/admin/page-guard";
import { getSetting } from "@/lib/admin/settings";
import { connectToDatabase } from "@/lib/mongodb";
import { Customer } from "@/models/Customer";
import { bulkDeleteCustomersFormAction, deleteCustomerAction } from "@/app/(admin)/admin/(dashboard)/customers/actions";

export const metadata = { title: "Customers" };

function money(value: number, symbol: string) {
  return `${symbol} ${value.toLocaleString("en-US")}`;
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; blocked?: string; page?: string; size?: string }>;
}) {
  await guardPage("customers:read");
  const params = await searchParams;
  await connectToDatabase();
  const general = await getSetting("general");

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const pageSize = [10, 20, 50, 100].includes(Number(params.size)) ? Number(params.size) : 20;

  const filter: Record<string, unknown> = {};
  if (params.blocked === "true") filter.blocked = true;
  if (params.blocked === "false") filter.blocked = false;
  if (params.q?.trim()) {
    const pattern = new RegExp(params.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
  }

  const [customers, total] = await Promise.all([
    Customer.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    Customer.countDocuments(filter),
  ]);

  const rows: AdminTableRow[] = customers.map((customer) => ({
    id: String(customer._id),
    cells: {
      name: {
        label: customer.name,
        href: `/admin/customers/${customer._id}`,
        sub: customer.email || customer.phone,
      },
      contact: { label: customer.email ? `${customer.email} · ${customer.phone}` : customer.phone },
      orders: { label: String(customer.orderCount), sortValue: customer.orderCount, align: "right" },
      value: { label: money(customer.lifetimeValue, general.currencySymbol), sortValue: customer.lifetimeValue, align: "right" },
      status: {
        label: customer.blocked ? "Blocked" : "Active",
        tone: customer.blocked ? "danger" : "success",
        sortValue: customer.blocked ? 1 : 0,
      },
      firstOrder: {
        label: customer.firstOrderAt ? new Date(customer.firstOrderAt).toLocaleDateString("en-GB") : "—",
        sortValue: customer.firstOrderAt?.toISOString() ?? "",
      },
      lastOrder: {
        label: customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString("en-GB") : "—",
        sortValue: customer.lastOrderAt?.toISOString() ?? "",
      },
      created: {
        label: customer.createdAt?.toLocaleDateString("en-GB") ?? "—",
        sortValue: customer.createdAt?.toISOString() ?? "",
      },
    },
  }));

  const hasFilters = Boolean(params.q || params.blocked);

  return (
    <>
      <PageHeader
        title="Customers"
        description="All shoppers who have placed orders. Blocked customers cannot place new orders."
        breadcrumbs={[{ label: "Sales" }, { label: "Customers" }]}
      />
      <PageBody>
        <form className="mb-4 flex flex-wrap items-end gap-2" action="/admin/customers">
          <div>
            <label className="admin-label" htmlFor="q">
              Search
            </label>
            <input
              id="q"
              name="q"
              defaultValue={params.q ?? ""}
              className="admin-field w-[260px]"
              placeholder="Name, email or phone"
            />
          </div>
          <div>
            <label className="admin-label" htmlFor="blocked">
              Status
            </label>
            <select id="blocked" name="blocked" defaultValue={params.blocked ?? ""} className="admin-field w-[140px]">
              <option value="">All</option>
              <option value="false">Active</option>
              <option value="true">Blocked</option>
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-[6px] bg-navy px-4 text-[13px] font-medium text-white hover:bg-navy-deep"
          >
            Apply filters
          </button>
          {hasFilters ? (
            <Link
              href="/admin/customers"
              className="inline-flex h-9 items-center rounded-[6px] border border-admin-line bg-white px-3 text-[13px] text-ink hover:bg-tile"
            >
              Clear
            </Link>
          ) : null}
        </form>

        <DataTable
          columns={[
            { key: "name", header: "Customer" },
            { key: "contact", header: "Contact" },
            { key: "orders", header: "Orders", align: "right" },
            { key: "value", header: "Lifetime value", align: "right" },
            { key: "status", header: "Status" },
            { key: "firstOrder", header: "First order", hideByDefault: true },
            { key: "lastOrder", header: "Last order", hideByDefault: true },
            { key: "created", header: "Registered" },
          ]}
          rows={rows}
          total={total}
          page={page}
          pageSize={pageSize}
          emptyTitle={hasFilters ? "No customers match these filters" : "No customers yet"}
          emptyDescription={
            hasFilters
              ? "Adjust the search or status filter to see more customers."
              : "Customers are created automatically when orders are placed."
          }
          defaultSort={{ key: "created", desc: true }}
          bulkOptions={[{ value: "delete", label: "Delete" }]}
          bulkAction={bulkDeleteCustomersFormAction}
          rowActions={[
            { label: "Edit", kind: "edit", href: (id) => `/admin/customers/${id}` },
            {
              label: "Delete",
              kind: "delete",
              onDelete: (id) =>
                deleteCustomerAction({ id }).then((r) => {
                  if (!r.ok) throw new Error(r.error);
                }),
            },
          ]}
        />
      </PageBody>
    </>
  );
}