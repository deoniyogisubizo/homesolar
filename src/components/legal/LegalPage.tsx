import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function LegalPage({
  title,
  description,
  updatedAt,
  children,
}: {
  title: string;
  description: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <article className="container-page pb-16 pt-6 lg:pb-24 lg:pt-10">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[11px] text-muted">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        <span className="text-ink">{title}</span>
      </nav>

      <header className="mt-5 max-w-[820px] border-b border-line pb-6">
        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em] text-ink lg:text-[38px]">
          {title}
        </h1>
        <p className="mt-3 text-[14px] leading-6 text-muted">{description}</p>
        <p className="mt-2 text-[12px] text-muted">Last updated: {updatedAt}</p>
      </header>

      <div className="mt-8 max-w-[820px]">{children}</div>
    </article>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-[14px] leading-7 text-muted">{children}</div>
    </section>
  );
}
