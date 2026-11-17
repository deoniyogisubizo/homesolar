import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Price } from "@/components/currency/Price";
import { WishlistButton } from "@/components/product/WishlistButton";
import type { Product } from "@/types";

export function RelatedProducts({
  products,
  categorySlug,
}: {
  products: Product[];
  categorySlug: string;
}) {
  if (!products.length) return null;

  return (
    <section className="mt-8 lg:mt-[30px]">
      <div className="border-t border-[#E5E7EB] pt-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[20px]! font-bold text-ink">You May Also Like</h2>
          <Link
            href={`/category/${categorySlug}`}
            className="flex items-center gap-[7px] text-[12px] font-medium text-ink transition-colors duration-150 hover:text-brand"
          >
            View All
            <ArrowRight className="h-[15px] w-[15px]" strokeWidth={1.7} />
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:mt-5 lg:grid-cols-4 lg:gap-4">
          {products.map((product) => {
            const image = product.images[0]?.src ?? product.image;
            return (
              <article
                key={product.id}
                className="group overflow-hidden rounded-[12px] border border-[#E5E7EB] bg-white"
              >
                <Link
                  href={`/product/${product.slug}`}
                  aria-label={product.name}
                  className="relative block aspect-[238/168] overflow-hidden bg-tile"
                >
                  <Image
                    src={image}
                    alt={product.images[0]?.alt ?? product.name}
                    fill
                    sizes="(min-width: 1440px) 330px, (min-width: 1024px) 24vw, (min-width: 640px) 48vw, 94vw"
                    className="object-cover"
                  />
                </Link>

                <div className="relative p-4">
                  <Link href={`/product/${product.slug}`} className="block pr-9">
                    <p className="text-[14px]! font-medium leading-[1.3] text-ink transition-colors duration-150 group-hover:text-brand">
                      {product.name}
                    </p>
                    {product.cardSubtitle ? (
                      <p className="mt-[1px] text-[13px]! leading-[1.3] text-ink">
                        {product.cardSubtitle}
                      </p>
                    ) : null}
                  </Link>

                  <div className="mt-3 flex items-end justify-between gap-2">
                    <span className="text-[14px] font-bold text-ink">
                      <Price value={product.price} compact />
                    </span>
                    <WishlistButton
                      productId={product.id}
                      productName={product.name}
                      className="flex h-8 w-8 items-center justify-center text-ink transition-colors duration-150 hover:text-brand"
                      iconClassName="h-[21px] w-[21px]"
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
