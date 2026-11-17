import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge, labelize, statusToneFor } from "@/components/admin/StatusBadge";
import { InventoryAdjustForm } from "@/components/admin/catalog/InventoryAdjustForm";
import { guardPage } from "@/lib/admin/page-guard";
import { getSetting } from "@/lib/admin/settings";
import { connectToDatabase } from "@/lib/mongodb";
import { InventoryMovement } from "@/models/InventoryMovement";
import { Product } from "@/models/Product";

export const metadata = { title: "Adjust stock" };

export default async function InventoryProductPage({ params }: { params: Promise<{ id: string }> }) {
  await guardPage("inventory:read");
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();

  await connectToDatabase();
  const [product, general, movements] = await Promise.all([
    Product.findById(id).populate<{ category: { name: string; slug: string } }>("category", "name slug").lean(),
    getSetting("general"),
    InventoryMovement.find({ productId: id }).sort({ createdAt: -1 }).limit(25).lean(),
  ]);
  if (!product) notFound();

  const money = (value: number) => `${general.currencySymbol} ${value.toLocaleString("en-US")}`;

  return (
    <>
      <PageHeader
        title={product.name}
        description={`Stock for /product/${product.slug}. Changes publish to the storefront immediately.`}
        breadcrumbs={[
          { label: "Catalog" },
          { label: "Inventory", href: "/admin/inventory" },
          { label: product.name },
        ]}
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/products/${product._id}`}
              className="inline-flex h-9 items-center rounded-[6px] border border-admin-line bg-white px-3.5 text-[13px] font-medium text-ink hover:bg-tile"
            >
              Edit product
            </Link>
            {product.publishStatus === "active" ? (
              <a
                href={`/product/${product.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center rounded-[6px] border border-admin-line bg-white px-3.5 text-[13px] font-medium text-ink hover:bg-tile"
              >
                View product
              </a>
            ) : null}
          </div>
        }
      />
      <PageBody>
        <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[8px] border border-admin-line bg-white px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">Base stock</p>
            <p className="mt-1 text-[22px] font-semibold leading-none text-ink">{product.stock}</p>
          </div>
          <div className="rounded-[8px] border border-admin-line bg-white px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">Status</p>
            <div className="mt-2">
              <StatusBadge
                label={
                  product.status === "out_of_stock"
                    ? "Out of stock"
                    : product.status === "low_stock"
                      ? "Low stock"
                      : "In stock"
                }
                tone={statusToneFor(product.status)}
              />
            </div>
          </div>
          <div className="rounded-[8px] border border-admin-line bg-white px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">Low stock alert at</p>
            <p className="mt-1 text-[22px] font-semibold leading-none text-ink">{product.lowStockThreshold ?? 5}</p>
          </div>
          <div className="rounded-[8px] border border-admin-line bg-white px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">Stock value</p>
            <p className="mt-1 text-[22px] font-semibold leading-none text-ink">{money(product.stock * product.price)}</p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-4">
            <InventoryAdjustForm
              productId={String(product._id)}
              productName={product.name}
              stock={product.stock}
              variants={product.variants.map((variant) => ({
                sku: variant.sku,
                label: [variant.color, variant.size].filter(Boolean).join(" / ") || variant.sku,
                stock: variant.stock,
              }))}
            />

            <section className="rounded-[8px] border border-admin-line bg-white">
              <div className="flex items-center justify-between border-b border-admin-line px-4 py-3">
                <h2 className="text-[14px] font-semibold text-ink">Movement history</h2>
                <Link href="/admin/inventory/movements" className="text-[12px] text-brand-deep hover:underline">
                  All movements
                </Link>
              </div>
              {movements.length ? (
                <ul className="divide-y divide-admin-line">
                  {movements.map((movement) => (
                    <li key={String(movement._id)} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-[13px] text-ink">
                          <span
                            className={`font-semibold ${movement.delta > 0 ? "text-success" : "text-danger"}`}
                          >
                            {movement.delta > 0 ? "+" : ""}
                            {movement.delta}
                          </span>{" "}
                          {labelize(movement.reason)}
                          {movement.variantSku ? (
                            <span className="text-admin-muted"> · {movement.variantSku}</span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-[11px] text-admin-muted">
                          Stock after {movement.stockAfter} ·{" "}
                          {(movement.createdAt ?? new Date()).toLocaleString("en-GB")} · {movement.actorEmail}
                        </p>
                        {movement.note ? (
                          <p className="mt-1 text-[12px] leading-5 text-admin-muted">{movement.note}</p>
                        ) : null}
                      </div>
                      <StatusBadge label={movement.delta > 0 ? "Added" : "Removed"} tone={movement.delta > 0 ? "success" : "danger"} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-8 text-center text-[12px] text-admin-muted">
                  No stock adjustments recorded for this product yet.
                </p>
              )}
            </section>
          </div>

          <aside className="h-fit space-y-3 xl:sticky xl:top-[84px]">
            <div className="rounded-[8px] border border-admin-line bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">Product</p>
              <p className="mt-2 text-[13px] font-medium text-ink">{product.name}</p>
              <dl className="mt-2 space-y-1.5 text-[11px]">
                <div className="flex justify-between gap-2">
                  <dt className="text-admin-muted">Category</dt>
                  <dd className="text-ink">{product.category?.name ?? "Uncategorised"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-admin-muted">Publish status</dt>
                  <dd className="text-ink">{labelize(product.publishStatus)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-admin-muted">Base price</dt>
                  <dd className="text-ink">{money(product.price)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-admin-muted">Variants</dt>
                  <dd className="text-ink">{product.variants.length}</dd>
                </div>
              </dl>
            </div>

            {product.variants.length ? (
              <div className="rounded-[8px] border border-admin-line bg-white p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">Variant stock</p>
                <ul className="mt-2 space-y-2">
                  {product.variants.map((variant) => (
                    <li key={variant.sku} className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="min-w-0 truncate text-ink">
                        {[variant.color, variant.size].filter(Boolean).join(" / ") || variant.sku}
                      </span>
                      <span
                        className={
                          variant.stock <= 0
                            ? "text-danger"
                            : variant.stock <= (product.lowStockThreshold ?? 5)
                              ? "text-warning"
                              : "text-ink"
                        }
                      >
                        {variant.stock}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <Link
              href="/admin/inventory"
              className="inline-flex h-9 w-full items-center justify-center rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
            >
              Back to inventory
            </Link>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
