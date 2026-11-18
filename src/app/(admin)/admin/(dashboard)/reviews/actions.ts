"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { Review } from "@/models/Review";
import { assertSameOrigin, requirePermission } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { actionError, actionOk, fieldErrorsFromZod, runAdminAction, type ActionResult } from "@/lib/admin/action-result";
import { revalidateStorefront } from "@/lib/admin/revalidate";
import {
  reviewBulkDeleteSchema,
  reviewDeleteSchema,
  reviewModerateSchema,
  reviewReplySchema,
} from "@/schemas/reviews";

async function refreshProductRating(productId: unknown) {
  const [summary] = await Review.aggregate<{ count: number; average: number }>([
    { $match: { productId, status: "approved" } },
    { $group: { _id: null, count: { $sum: 1 }, average: { $avg: "$rating" } } },
  ]);
  const count = summary?.count ?? 0;
  const average = summary?.average ?? 0;
  await Product.updateOne(
    { _id: productId },
    {
      $set: {
        ratingAverage: count ? Math.round(average * 10) / 10 : 0,
        ratingCount: count,
        reviewCount: count,
        rating: count ? Math.round(average * 10) / 10 : 0,
      },
    },
  );
}

async function revalidateForReview(productId: unknown) {
  const product = await Product.findById(productId).select("slug").lean();
  revalidateStorefront([
    "reviews",
    `reviews-${String(productId)}`,
    "products",
    "homepage",
    ...(product?.slug ? [`product-${product.slug}` as const] : []),
  ]);
}

export async function moderateReviewAction(input: unknown): Promise<ActionResult<{ status: string }>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("reviews:write");
    const parsed = reviewModerateSchema.safeParse(input);
    if (!parsed.success) return actionError("Choose a valid moderation status.", fieldErrorsFromZod(parsed.error));

    await connectToDatabase();
    const review = await Review.findById(parsed.data.id);
    if (!review) return actionError("Review not found.");

    const before = review.status;
    review.status = parsed.data.status;
    review.moderatedBy = session.email;
    review.moderatedAt = new Date();
    await review.save();
    await refreshProductRating(review.productId);

    await recordAudit({
      actor: session,
      action: "update",
      entity: "review",
      entityId: String(review._id),
      summary: `Set review by ${review.author} to ${parsed.data.status}`,
      before: { status: before },
      after: { status: parsed.data.status },
    });

    await revalidateForReview(review.productId);
    revalidatePath("/admin/reviews");
    revalidatePath(`/admin/reviews/${String(review._id)}`);
    return actionOk({ status: review.status });
  });
}

export async function replyToReviewAction(input: unknown): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("reviews:write");
    const parsed = reviewReplySchema.safeParse(input);
    if (!parsed.success) return actionError("Check the reply.", fieldErrorsFromZod(parsed.error));

    await connectToDatabase();
    const review = await Review.findById(parsed.data.id);
    if (!review) return actionError("Review not found.");

    const reply = parsed.data.reply;
    const before = review.reply;
    review.reply = reply;
    review.repliedAt = reply ? new Date() : null;
    review.repliedBy = reply ? session.email : null;
    await review.save();

    await recordAudit({
      actor: session,
      action: "update",
      entity: "review",
      entityId: String(review._id),
      summary: reply ? `Replied to review by ${review.author}` : `Removed reply on review by ${review.author}`,
      before: { reply: before || null },
      after: { reply: reply || null },
    });

    await revalidateForReview(review.productId);
    revalidatePath("/admin/reviews");
    revalidatePath(`/admin/reviews/${String(review._id)}`);
    return actionOk(null);
  });
}

export async function deleteReviewAction(input: unknown): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("reviews:write");
    const parsed = reviewDeleteSchema.safeParse(input);
    if (!parsed.success) return actionError("Invalid review.");

    await connectToDatabase();
    const review = await Review.findById(parsed.data.id);
    if (!review) return actionError("Review not found.");

    const productId = review.productId;
    const snapshot = {
      author: review.author,
      rating: review.rating,
      title: review.title,
      status: review.status,
    };
    await review.deleteOne();
    await refreshProductRating(productId);

    await recordAudit({
      actor: session,
      action: "delete",
      entity: "review",
      entityId: parsed.data.id,
      summary: `Deleted review by ${snapshot.author}`,
      before: snapshot,
    });

    await revalidateForReview(productId);
    revalidatePath("/admin/reviews");
    return actionOk(null);
  });
}

export async function bulkDeleteReviewsAction(input: unknown): Promise<ActionResult<{ deleted: number }>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("reviews:write");
    const parsed = reviewBulkDeleteSchema.safeParse(input);
    if (!parsed.success) return actionError("Invalid reviews.");

    await connectToDatabase();
    const { ids } = parsed.data;
    let deleted = 0;

    for (const review of await Review.find({ _id: { $in: ids } })) {
      await review.deleteOne();
      deleted += 1;
    }

    await recordAudit({
      actor: session,
      action: "delete",
      entity: "review",
      entityId: null,
      summary: `Bulk deleted ${deleted} review${deleted === 1 ? "" : "s"}`,
      after: { ids, deleted },
    });

    revalidateStorefront(["reviews", "products", "homepage"]);
    return actionOk({ deleted });
  });
}

export async function bulkDeleteReviewsFormAction(formData: FormData): Promise<void> {
  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const intent = String(formData.get("intent") ?? "");
  await bulkDeleteReviewsAction({ ids, intent });
}
