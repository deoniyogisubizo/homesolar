import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { apiError, zodDetails } from "@/lib/api";
import { getProductBySlugOrId, getProductReviews } from "@/lib/data";
import { checkRateLimit } from "@/lib/rate-limit";
import { ensureSessionId } from "@/lib/session";
import { Review } from "@/models/Review";
import { Product } from "@/models/Product";

const reviewSchema = z.object({
  author: z.string().trim().min(2).max(80),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(10).max(2000),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const product = await getProductBySlugOrId(slug);
  if (!product) return apiError("Product not found.", 404);

  const page = clampNumber(request.nextUrl.searchParams.get("page"), 1, 1, 1000);
  const limit = clampNumber(request.nextUrl.searchParams.get("limit"), 6, 1, 50);
  const reviews = await getProductReviews(product.id, page, limit);

  return NextResponse.json(reviews);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const product = await getProductBySlugOrId(slug);
  if (!product) return apiError("Product not found.", 404);

  const body = await request.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid review.", 422, zodDetails(parsed.error));
  }

  const sessionId = await ensureSessionId();
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(`review:${ip}:${sessionId}`)) {
    return apiError("Too many reviews submitted. Please try again later.", 429);
  }

  const review = await Review.create({
    productId: product.id,
    author: parsed.data.author,
    rating: parsed.data.rating,
    title: parsed.data.title,
    body: parsed.data.body,
  });

  try {
    await Product.updateOne({ _id: product.id }, [
      {
        $set: {
          nextRatingCount: { $add: [{ $ifNull: ["$ratingCount", "$reviewCount"] }, 1] },
          nextRatingAverage: {
            $divide: [
              {
                $add: [
                  {
                    $multiply: [
                      { $ifNull: ["$ratingAverage", "$rating"] },
                      { $ifNull: ["$ratingCount", "$reviewCount"] },
                    ],
                  },
                  parsed.data.rating,
                ],
              },
              { $add: [{ $ifNull: ["$ratingCount", "$reviewCount"] }, 1] },
            ],
          },
        },
      },
      {
        $set: {
          ratingCount: "$nextRatingCount",
          reviewCount: "$nextRatingCount",
          ratingAverage: "$nextRatingAverage",
          rating: "$nextRatingAverage",
        },
      },
      { $unset: ["nextRatingCount", "nextRatingAverage"] },
    ]);
  } catch (error) {
    await Review.deleteOne({ _id: review._id }).catch(() => undefined);
    throw error;
  }

  revalidateTag("products", "max");
  revalidateTag(`reviews-${product.id}`, "max");

  return NextResponse.json(
    {
      review: {
        id: review._id.toString(),
        productId: product.id,
        author: review.author,
        rating: review.rating,
        title: review.title,
        body: review.body,
        createdAt: review.createdAt?.toISOString() ?? new Date().toISOString(),
      },
    },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}

function clampNumber(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}
