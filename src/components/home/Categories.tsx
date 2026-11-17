import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Category } from "@/types";

export function Categories({ categories }: { categories: Category[] }) {
  return (
    <section>
      <div className="container-page grid grid-cols-1 gap-[22px] sm:grid-cols-3">
        {categories.map((category) => (
          <article key={category.id} className="group text-center">
            <Link href={`/category/${category.slug}`} className="block">
              <div className="relative h-[180px] overflow-hidden bg-tile sm:h-[215px]">
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  sizes="(min-width: 1440px) 434px, 32vw"
                  className="object-cover"
                />
              </div>
            </Link>
            <div className="mt-5 sm:mt-7">
              <h3 className="text-[19px] font-semibold uppercase tracking-[0.04em] text-ink">
                <Link href={`/category/${category.slug}`}>{category.name}</Link>
              </h3>
              <div className="mt-2">
                <Link
                  href={`/search?q=${encodeURIComponent(category.name)}`}
                  className="category-view-all inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-1.5 text-[11px] font-semibold text-navy transition-colors"
                >
                  View all {category.name}
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
