import Link from "next/link";
import { Star, Clock, CheckCircle } from "lucide-react";
import { getCustomerReviews } from "@/app/(auth)/actions/dashboard-actions";
import { AccountLayout } from "@/components/account/AccountLayout";

export const instant = false;

export const metadata = { title: "My Reviews" };

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    pending: "bg-warning/10 text-warning border-warning/20",
    approved: "bg-success/10 text-success border-success/20",
    rejected: "bg-danger/10 text-danger border-danger/20",
  };
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`inline-flex items-center rounded-[4px] border px-2 py-0.5 text-[11px] font-medium ${styles[status] || styles.pending}`}>
      {label}
    </span>
  );
}

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`h-${size / 4} w-${size / 4} ${star <= rating ? "text-warning fill-current" : "text-muted"}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export default async function ReviewsPage() {
  const reviewsResponse = await getCustomerReviews();

  return (
    <AccountLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-[28px] font-bold text-ink">My Reviews</h1>
          <p className="mt-1 text-muted">Reviews you&apos;ve written for purchased products</p>
        </div>

        <div className="rounded-[12px] border border-line bg-white overflow-hidden">
          {reviewsResponse.ok && reviewsResponse.data.reviews.length > 0 ? (
            <div className="divide-y divide-line">
              {reviewsResponse.data.reviews.map((review) => (
                <div key={review.id} className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-[8px] bg-tile flex-shrink-0 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element -- review images are remote and unoptimized */}
                        <img src={review.productImage} alt={review.productName} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <Link href={`/product/${review.productSlug}`} className="font-medium text-ink hover:text-brand">
                          {review.productName}
                        </Link>
                        <p className="text-sm text-muted mt-1">{formatDate(review.createdAt)}</p>
                        {review.isVerifiedPurchase && (
                          <span className="inline-flex items-center gap-1 rounded-[4px] bg-success/10 text-success px-2 py-0.5 text-[11px] font-medium mt-1">
                            <CheckCircle className="h-3 w-3" />
                            Verified Purchase
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(review.status)}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <StarRating rating={review.rating} size={20} />
                      <span className="font-medium text-ink">{review.rating}/5</span>
                    </div>
                    <h3 className="font-medium text-ink">{review.title}</h3>
                    <p className="text-muted">{review.body}</p>

                    {review.reply && (
                      <div className="rounded-[8px] bg-brand/5 p-4 border border-brand/20">
                        <div className="flex items-center gap-2 text-sm text-brand-deep mb-1">
                          <CheckCircle className="h-4 w-4" />
                          <span className="font-medium">Solar Home Team replied</span>
                          {review.repliedAt && <span className="text-muted">on {formatDate(review.repliedAt)}</span>}
                        </div>
                        <p className="text-brand">{review.reply}</p>
                      </div>
                    )}

                    {review.status === "pending" && (
                      <p className="text-sm text-muted flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Your review is pending moderation
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Star className="h-12 w-12 mx-auto text-muted mb-4" />
              <h3 className="text-[18px] font-semibold text-ink mb-2">No reviews yet</h3>
              <p className="text-muted mb-6">After you receive an order, you can review the products you purchased.</p>
              <Link href="/account/orders" className="inline-flex items-center gap-2 rounded-[6px] bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-deep">
                View Orders
              </Link>
            </div>
          )}
        </div>
      </div>
    </AccountLayout>
  );
}