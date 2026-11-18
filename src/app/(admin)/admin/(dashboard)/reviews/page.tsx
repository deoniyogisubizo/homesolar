import Link from "next/link";
import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type AdminTableRow } from "@/components/admin/DataTable";
import { labelize, statusToneFor } from "@/components/admin/StatusBadge";
import { guardPage } from "@/lib/admin/page-guard";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { Review } from "@/models/Review";
import { bulkDeleteReviewsFormAction } from "@/app/(admin)/admin/(dashboard)/reviews/actions";

export const metadata = { title: "Reviews" };

const STATUSES = ["pending", "approved", "rejected"];

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; rating?: string; page?: string; size?: string }>;
}) {
  await guardPage("reviews:read");
  const params = await searchParams;
  await connectToDatabase();

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const pageSize = [10, 20, 50, 100].includes(Number(params.size)) ? Number(params.size) : 20;
  const filter: Record<string, unknown> = {};
  if (params.status && STATUSES.includes(params.status)) filter.status = params.status;
  const rating = Number(params.rating);
  if (Number.isInteger(rating) && rating >= 1 && rating <= 5) filter.rating = rating;
  if (params.q?.trim()) {
    const pattern = new RegExp(params.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const products = await Product.find({ name: pattern }).select("_id").limit(200).lean();
    filter.$or = [
      { author: pattern },
      { title: pattern },
      { body: pattern },
      { productId: { $in: products.map((product) => product._id) } },
    ];
  }

  const [reviews, total, summary] = await Promise.all([
    Review.find(filter)
      .populate<{ productId: { _id: unknown; name: string; slug: string } | null }>("productId", "name slug")
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Review.countDocuments(filter),
    Review.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  const summaryMap = new Map(summary.map((entry) => [entry._id, entry.count]));
  const hasFilters = Boolean(params.q || params.status || params.rating);

  const rows: AdminTableRow[] = reviews.map((review) => {
    const product = review.productId;
    return {
      id: String(review._id),
      cells: {
        review: {
          label: review.title,
          href: `/admin/reviews/${review._id}`,
          sub: review.body.length > 90 ? `${review.body.slice(0, 90)}…` : review.body,
        },
        product: {
          label: product?.name ?? "Deleted product",
          href: product ? `/admin/reviews?q=${encodeURIComponent(product.name)}` : undefined,
        },
        author: { label: review.author },
        rating: { label: `${review.rating} / 5`, sortValue: review.rating },
        status: {
          label: labelize(review.status),
          tone: statusToneFor(review.status),
          sortValue: review.status,
        },
        reply: { label: review.reply ? "Replied" : "No reply", sortValue: review.reply ? 1 : 0 },
        created: {
          label: (review.createdAt ?? new Date()).toLocaleDateString("en-GB"),
          sortValue: (review.createdAt ?? new Date()).toISOString(),
        },
      },
    };
  });

  return (
    <>
      <PageHeader
        title="Reviews"
        description="Moderate customer reviews before they appear on product pages."
        breadcrumbs={[{ label: "Catalog" }, { label: "Reviews" }]}
      />
      <PageBody>
        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          {[
            { label: "Pending", value: summaryMap.get("pending") ?? 0, href: "/admin/reviews?status=pending" },
            { label: "Approved", value: summaryMap.get("approved") ?? 0, href: "/admin/reviews?status=approved" },
            { label: "Rejected", value: summaryMap.get("rejected") ?? 0, href: "/admin/reviews?status=rejected" },
          ].map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-[8px] border border-admin-line bg-white px-4 py-3 hover:border-brand/40"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">{card.label}</p>
              <p className="mt-1 text-[22px] font-semibold leading-none text-ink">{card.value}</p>
            </Link>
          ))}
        </div>

        <form className="mb-4 flex flex-wrap items-end gap-2" action="/admin/reviews">
          <div>
            <label className="admin-label" htmlFor="q">
              Search
            </label>
            <input
              id="q"
              name="q"
              defaultValue={params.q ?? ""}
              className="admin-field w-[240px]"
              placeholder="Author, title, body or product"
            />
          </div>
          <div>
            <label className="admin-label" htmlFor="status">
              Status
            </label>
            <select id="status" name="status" defaultValue={params.status ?? ""} className="admin-field w-[160px]">
              <option value="">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {labelize(status)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="admin-label" htmlFor="rating">
              Rating
            </label>
            <select id="rating" name="rating" defaultValue={params.rating ?? ""} className="admin-field w-[140px]">
              <option value="">Any rating</option>
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} stars
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
              href="/admin/reviews"
              className="inline-flex h-9 items-center rounded-[6px] border border-admin-line bg-white px-3 text-[13px] text-ink hover:bg-tile"
            >
              Clear
            </Link>
          ) : null}
        </form>

        <DataTable
          columns={[
            { key: "review", header: "Review" },
            { key: "product", header: "Product" },
            { key: "author", header: "Author" },
            { key: "rating", header: "Rating", align: "right" },
            { key: "status", header: "Status" },
            { key: "reply", header: "Reply", hideByDefault: true },
            { key: "created", header: "Submitted" },
          ]}
          rows={rows}
          total={total}
          page={page}
          pageSize={pageSize}
          emptyTitle={hasFilters ? "No reviews match these filters" : "No reviews yet"}
          emptyDescription={
            hasFilters
              ? "Adjust the search, status or rating filters to see more reviews."
              : "Reviews submitted on product pages will appear here for moderation."
          }
          defaultSort={{ key: "created", desc: true }}
          bulkOptions={[{ value: "delete", label: "Delete" }]}
          bulkAction={bulkDeleteReviewsFormAction}
        />
      </PageBody>
    </>
  );
}
