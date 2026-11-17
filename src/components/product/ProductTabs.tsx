"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Check, Star } from "lucide-react";
import { ProductIcon } from "@/components/product/ProductIcon";
import type { Product, Review } from "@/types";

type Tab = "details" | "reviews" | "shipping";

const REVIEWS_PER_PAGE = 6;

export function ProductTabs({
  product,
  initialReviews,
  initialReviewTotal,
}: {
  product: Product;
  initialReviews: Review[];
  initialReviewTotal: number;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [reviews, setReviews] = useState(initialReviews);
  const [reviewTotal, setReviewTotal] = useState(initialReviewTotal);
  const [page, setPage] = useState(1);
  const [loadingPage, setLoadingPage] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const [average, setAverage] = useState(product.ratingAverage);
  const [rating, setRating] = useState(5);
  const [author, setAuthor] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [formState, setFormState] = useState<"idle" | "sending" | "sent">("idle");
  const [formMessage, setFormMessage] = useState("");

  const reviewCount = product.ratingCount + addedCount;

  useEffect(() => {
    const applyHash = () => {
      if (window.location.hash === "#reviews") setActiveTab("reviews");
    };

    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  const selectTab = (tab: Tab) => {
    setActiveTab(tab);
    const base = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, "", tab === "reviews" ? `${base}#reviews` : base);
  };

  const loadReviews = async (nextPage: number) => {
    setLoadingPage(true);
    try {
      const response = await fetch(
        `/api/products/${product.slug}/reviews?page=${nextPage}&limit=${REVIEWS_PER_PAGE}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("Unable to load reviews");
      const payload = (await response.json()) as {
        items: Review[];
        total: number;
        page: number;
      };
      setReviews(payload.items);
      setReviewTotal(payload.total);
      setPage(payload.page);
    } catch {
      setFormMessage("We could not load more reviews. Please try again.");
    } finally {
      setLoadingPage(false);
    }
  };

  const submitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (formState === "sending") return;

    setFormState("sending");
    setFormMessage("");

    try {
      const response = await fetch(`/api/products/${product.slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author, rating, title, body }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; details?: Array<{ message: string }> }
        | null;

      if (!response.ok) {
        throw new Error(payload?.details?.[0]?.message ?? payload?.error ?? "Unable to submit review");
      }

      setAverage((current) => (current * reviewCount + rating) / (reviewCount + 1));
      setAddedCount((current) => current + 1);
      setAuthor("");
      setTitle("");
      setBody("");
      setRating(5);
      setFormState("sent");
      setFormMessage("Your review has been published.");
      await loadReviews(1);
    } catch (error) {
      setFormState("idle");
      setFormMessage(error instanceof Error ? error.message : "Unable to submit review");
    }
  };

return (
    <div className="mt-[38px] lg:mt-[48px]">
      <div className="grid gap-8 lg:grid-cols-[464fr_481fr] lg:gap-x-[5.88%] lg:gap-y-0">
        <div className="min-w-0">
          <div className="flex gap-7 overflow-x-auto border-b border-[#E5E7EB] text-[14px] lg:gap-10 lg:overflow-visible">
            <TabButton active={activeTab === "details"} onClick={() => selectTab("details")}>
              Details
            </TabButton>
            <TabButton active={activeTab === "reviews"} onClick={() => selectTab("reviews")}>
              Reviews ({reviewCount})
            </TabButton>
            <TabButton active={activeTab === "shipping"} onClick={() => selectTab("shipping")}>
              Shipping & Returns
            </TabButton>
          </div>

          <div className="pt-5">
            {activeTab === "details" ? (
              <div>
                <p className="text-[14px]! leading-[1.65] text-ink lg:text-[15px]! lg:leading-[1.6]">
                  {product.detailsIntro}
                </p>

                {product.features.length ? (
                  <ul className="mt-6 space-y-[9px]">
                    {product.features.map((feature) => (
                      <li
                        key={feature.label}
                        className="flex items-center gap-[10px] text-[14px] text-ink lg:text-[14px]"
                      >
                        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#333333] text-white">
                          <Check
                            className="h-[11px] w-[11px]"
                            strokeWidth={2.5}
                          />
                        </span>
                        {feature.label}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {activeTab === "reviews" ? (
              <div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="text-[28px] font-bold leading-none text-ink">{average.toFixed(1)}</span>
                  <span className="flex items-center gap-[2px] text-ink" aria-hidden="true">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} className="h-[15px] w-[15px]" fill="currentColor" strokeWidth={0} />
                    ))}
                  </span>
                  <span className="text-[13px] text-muted">
                    Based on {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
                  </span>
                </div>

                {reviews.length ? (
                  <ul className="mt-5 divide-y divide-[#E5E7EB] border-y border-[#E5E7EB]">
                    {reviews.map((review) => (
                      <li key={review.id} className="py-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-ink">{review.author}</span>
                            <span className="flex items-center gap-[1px] text-ink" aria-label={`${review.rating} out of 5`}>
                              {Array.from({ length: 5 }).map((_, index) => (
                                <Star
                                  key={index}
                                  className="h-[11px] w-[11px]"
                                  fill={index < review.rating ? "currentColor" : "none"}
                                  strokeWidth={index < review.rating ? 0 : 1.4}
                                />
                              ))}
                            </span>
                          </div>
                          <time className="text-[11px] text-muted" dateTime={review.createdAt}>
                            {new Date(review.createdAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </time>
                        </div>
                        <h3 className="mt-2 text-[14px]! font-semibold text-ink">{review.title}</h3>
                        <p className="mt-1 text-[13px]! leading-6 text-muted">{review.body}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-5 border-y border-[#E5E7EB] py-6 text-[13px]! leading-6 text-muted">
                    No written reviews yet. Be the first to share your experience.
                  </p>
                )}

                {reviewTotal > REVIEWS_PER_PAGE ? (
                  <div className="mt-5 flex items-center gap-3 text-[12px]">
                    <button
                      type="button"
                      onClick={() => void loadReviews(page - 1)}
                      disabled={page <= 1 || loadingPage}
                      className="h-9 border border-[#E5E7EB] px-4 text-ink transition-colors duration-150 hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span className="text-muted">
                      Page {page} of {Math.max(1, Math.ceil(reviewTotal / REVIEWS_PER_PAGE))}
                    </span>
                    <button
                      type="button"
                      onClick={() => void loadReviews(page + 1)}
                      disabled={page >= Math.ceil(reviewTotal / REVIEWS_PER_PAGE) || loadingPage}
                      className="h-9 border border-[#E5E7EB] px-4 text-ink transition-colors duration-150 hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                ) : null}

                <form onSubmit={submitReview} className="mt-7">
                  <h3 className="text-[15px]! font-semibold text-ink">Write a review</h3>
                  <div className="mt-4 grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                        Name
                        <input
                          value={author}
                          onChange={(event) => setAuthor(event.target.value)}
                          required
                          minLength={2}
                          maxLength={80}
                          className="mt-1.5 h-10 w-full border border-[#E5E7EB] px-3 text-[13px] font-normal normal-case tracking-normal text-ink outline-none transition-colors duration-150 focus:border-ink"
                        />
                      </label>
                      <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                        Rating
                        <select
                          value={rating}
                          onChange={(event) => setRating(Number(event.target.value))}
                          className="mt-1.5 h-10 w-full border border-[#E5E7EB] bg-white px-3 text-[13px] font-normal normal-case tracking-normal text-ink outline-none transition-colors duration-150 focus:border-ink"
                        >
                          {[5, 4, 3, 2, 1].map((value) => (
                            <option key={value} value={value}>
                              {value} {value === 1 ? "star" : "stars"}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                      Title
                      <input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        required
                        minLength={3}
                        maxLength={120}
                        className="mt-1.5 h-10 w-full border border-[#E5E7EB] px-3 text-[13px] font-normal normal-case tracking-normal text-ink outline-none transition-colors duration-150 focus:border-ink"
                      />
                    </label>
                    <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                      Review
                      <textarea
                        value={body}
                        onChange={(event) => setBody(event.target.value)}
                        required
                        minLength={10}
                        maxLength={2000}
                        rows={4}
                        className="mt-1.5 w-full border border-[#E5E7EB] px-3 py-2 text-[13px] font-normal normal-case tracking-normal text-ink outline-none transition-colors duration-150 focus:border-ink"
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <button
                      type="submit"
                      disabled={formState === "sending"}
                      className="flex h-10 items-center gap-2 bg-ink px-6 text-[12px] font-semibold text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {formState === "sending" ? "Submitting" : "Submit Review"}
                      <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </button>
                    {formMessage ? (
                      <p
                        aria-live="polite"
                        className={`text-[12px] ${formState === "sent" ? "text-ink" : "text-muted"}`}
                      >
                        {formMessage}
                      </p>
                    ) : null}
                  </div>
                </form>
              </div>
            ) : null}

            {activeTab === "shipping" ? (
              <div className="space-y-4 text-[14px] leading-[1.7] text-muted">
                {product.shippingReturns
                  .split(/\n{2,}/)
                  .filter(Boolean)
                  .map((paragraph) => (
                    <p key={paragraph.slice(0, 32)} className="text-[14px]!">
                      {paragraph}
                    </p>
                  ))}
              </div>
            ) : null}
          </div>
        </div>

        {product.detailBanner ? (
          <div className="relative aspect-[481/313] overflow-hidden rounded-[16px] bg-tile">
            <Image
              src={product.detailBanner.image}
              alt={`${product.category.name} solar detail`}
              fill
              sizes="(min-width: 1440px) 700px, (min-width: 1024px) 48vw, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(0,0,0,0.02)_0%,rgba(0,0,0,0.08)_38%,rgba(0,0,0,0.4)_100%)]" />
            <div className="absolute inset-0">
              <ProductIcon
                name={product.detailBanner.icon}
                className="absolute left-[63.1%] top-[44.7%] h-[34px] w-[34px] -translate-x-1/2 -translate-y-1/2 text-white"
                strokeWidth={1.35}
              />
              <div className="absolute left-[65.8%] top-[50.8%] -translate-x-1/2 text-center text-[20px] font-bold leading-[1.5] tracking-[0.01em] text-white">
                {product.detailBanner.lines.map((line) => (
                  <span key={line} className="block whitespace-nowrap">
                    {line}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative shrink-0 pb-3 text-left transition-colors duration-150 ${
        active ? "font-bold text-ink" : "font-normal text-muted hover:text-ink"
      }`}
    >
      {children}
      {active ? (
        <span className="absolute inset-x-0 bottom-[-1px] h-[3px] bg-ink" />
      ) : null}
    </button>
  );
}
