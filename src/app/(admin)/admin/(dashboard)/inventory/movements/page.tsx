import Link from "next/link";
import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type AdminTableRow } from "@/components/admin/DataTable";
import { labelize } from "@/components/admin/StatusBadge";
import { guardPage } from "@/lib/admin/page-guard";
import { connectToDatabase } from "@/lib/mongodb";
import { InventoryMovement } from "@/models/InventoryMovement";
import { Product } from "@/models/Product";
import { STOCK_REASONS } from "@/schemas/inventory";

export const metadata = { title: "Stock movements" };

export default async function InventoryMovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; reason?: string; page?: string; size?: string }>;
}) {
  await guardPage("inventory:read");
  const params = await searchParams;
  await connectToDatabase();

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const pageSize = [10, 20, 50, 100].includes(Number(params.size)) ? Number(params.size) : 20;
  const filter: Record<string, unknown> = {};
  if (params.reason && STOCK_REASONS.includes(params.reason as (typeof STOCK_REASONS)[number])) {
    filter.reason = params.reason;
  }
  if (params.q?.trim()) {
    const pattern = new RegExp(params.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const products = await Product.find({ name: pattern }).select("_id").limit(200).lean();
    filter.$or = [
      { actorEmail: pattern },
      { note: pattern },
      { variantSku: pattern },
      { productId: { $in: products.map((product) => product._id) } },
    ];
  }

  const [movements, total] = await Promise.all([
    InventoryMovement.find(filter)
      .populate<{ productId: { _id: unknown; name: string; slug: string } | null }>("productId", "name slug")
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    InventoryMovement.countDocuments(filter),
  ]);

  const rows: AdminTableRow[] = movements.map((movement) => {
    const product = movement.productId;
    return {
      id: String(movement._id),
      cells: {
        product: {
          label: product?.name ?? "Deleted product",
          href: product ? `/admin/inventory/${String(product._id)}` : undefined,
          sub: movement.variantSku ?? undefined,
        },
        change: {
          label: `${movement.delta > 0 ? "+" : ""}${movement.delta}`,
          tone: movement.delta > 0 ? "success" : "danger",
          sortValue: movement.delta,
        },
        after: { label: String(movement.stockAfter), sortValue: movement.stockAfter },
        reason: { label: labelize(movement.reason), sortValue: movement.reason },
        actor: { label: movement.actorEmail },
        note: { label: movement.note || "—" },
        when: {
          label: (movement.createdAt ?? new Date()).toLocaleString("en-GB"),
          sortValue: (movement.createdAt ?? new Date()).toISOString(),
        },
      },
    };
  });

  const hasFilters = Boolean(params.q || params.reason);

  return (
    <>
      <PageHeader
        title="Stock movements"
        description="Every manual stock adjustment with the staff member, reason and note."
        breadcrumbs={[
          { label: "Catalog" },
          { label: "Inventory", href: "/admin/inventory" },
          { label: "Movements" },
        ]}
      />
      <PageBody>
        <form className="mb-4 flex flex-wrap items-end gap-2" action="/admin/inventory/movements">
          <div>
            <label className="admin-label" htmlFor="q">
              Search
            </label>
            <input
              id="q"
              name="q"
              defaultValue={params.q ?? ""}
              className="admin-field w-[240px]"
              placeholder="Product, staff, SKU or note"
            />
          </div>
          <div>
            <label className="admin-label" htmlFor="reason">
              Reason
            </label>
            <select id="reason" name="reason" defaultValue={params.reason ?? ""} className="admin-field w-[190px]">
              <option value="">All reasons</option>
              {STOCK_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {labelize(reason)}
                </option>
              ))}
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
              href="/admin/inventory/movements"
              className="inline-flex h-9 items-center rounded-[6px] border border-admin-line bg-white px-3 text-[13px] text-ink hover:bg-tile"
            >
              Clear
            </Link>
          ) : null}
        </form>

        <DataTable
          columns={[
            { key: "product", header: "Product" },
            { key: "change", header: "Change", align: "right" },
            { key: "after", header: "Stock after", align: "right" },
            { key: "reason", header: "Reason" },
            { key: "actor", header: "Staff member" },
            { key: "note", header: "Note", hideByDefault: true },
            { key: "when", header: "When" },
          ]}
          rows={rows}
          total={total}
          page={page}
          pageSize={pageSize}
          emptyTitle={hasFilters ? "No movements match these filters" : "No stock movements yet"}
          emptyDescription={
            hasFilters
              ? "Adjust the search or reason to see more movements."
              : "Adjust stock from the inventory page and the change will appear here."
          }
          defaultSort={{ key: "when", desc: true }}
        />
      </PageBody>
    </>
  );
}
