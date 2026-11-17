import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { Star } from "lucide-react";
import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge, labelize, statusToneFor } from "@/components/admin/StatusBadge";
import { ReviewActions } from "@/components/admin/catalog/ReviewActions";
import { guardPage } from "@/lib/admin/page-guard";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { Review } from "@/models/Review";

export const metadata = { title: "Review" };

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await guardPage("reviews:read");
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();

  await connectToDatabase();
  const review = await Review.findById(id).lean();
  if (!review) notFound();
  const product = await Product.findById(review.productId).select("name slug").lean();

  return (
    <>
      <PageHeader
        title={review.title}
        description={`Review by ${review.author}${product ? ` on ${product.name}` : ""}.`}
        breadcrumbs={[{ label: "Catalog" }, { label: "Reviews", href: "/admin/reviews" }, { label: "Review" }]}
      />
      <PageBody>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-4">
            <section className="rounded-[8px] border border-admin-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-0.5 text-orange" aria-label={`Rated ${review.rating} out of 5`}>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        className={`h-4 w-4 ${index < review.rating ? "fill-orange text-orange" : "text-admin-line"}`}
                      />
                    ))}
                  </div>
                  <h2 className="mt-2 text-[18px] font-semibold text-ink">{review.title}</h2>
                  <p className="mt-0.5 text-[12px] text-admin-muted">
                    {review.author} · {review.rating} star{review.rating === 1 ? "" : "s"} ·{" "}
                    {(review.createdAt ?? new Date()).toLocaleString("en-GB")}
                  </p>
                </div>
                <StatusBadge label={labelize(review.status)} tone={statusToneFor(review.status)} />
              </div>
              <p className="mt-4 whitespace-pre-line text-[13px] leading-6 text-ink">{review.body}</p>
            </section>

            {review.reply ? (
              <section className="rounded-[8px] border border-admin-line bg-tile p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">Current reply</p>
                <p className="mt-2 whitespace-pre-line text-[13px] leading-6 text-ink">{review.reply}</p>
                <p className="mt-2 text-[11px] text-admin-muted">
                  {review.repliedBy ?? "Staff"} ·{" "}
                  {review.repliedAt ? new Date(review.repliedAt).toLocaleString("en-GB") : "Date unavailable"}
                </p>
              </section>
            ) : null}

            <section className="rounded-[8px] border border-admin-line bg-white p-4">
              <h2 className="text-[12px] font-semibold text-ink">Moderation record</h2>
              <dl className="mt-2 space-y-1.5 text-[12px]">
                <div className="flex justify-between gap-2">
                  <dt className="text-admin-muted">Moderated by</dt>
                  <dd className="text-ink">{review.moderatedBy ?? "Not yet moderated"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-admin-muted">Moderated at</dt>
                  <dd className="text-ink">
                    {review.moderatedAt ? new Date(review.moderatedAt).toLocaleString("en-GB") : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-admin-muted">Last updated</dt>
                  <dd className="text-ink">{new Date(review.updatedAt ?? new Date()).toLocaleString("en-GB")}</dd>
                </div>
              </dl>
            </section>
          </div>

          <aside className="h-fit space-y-3 xl:sticky xl:top-[84px]">
            <div className="rounded-[8px] border border-admin-line bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">Product</p>
              <p className="mt-2 text-[13px] font-medium text-ink">{product?.name ?? "Deleted product"}</p>
              {product ? (
                <div className="mt-2 flex flex-col gap-1.5 text-[12px]">
                  <Link href={`/admin/products/${product._id}`} className="text-brand-deep hover:underline">
                    Edit product
                  </Link>
                  <a
                    href={`/product/${product.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-deep hover:underline"
                  >
                    View product page
                  </a>
                </div>
              ) : null}
            </div>

            <ReviewActions id={String(review._id)} status={review.status} reply={review.reply} />

            <Link
              href="/admin/reviews"
              className="inline-flex h-9 w-full items-center justify-center rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
            >
              Back to reviews
            </Link>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
