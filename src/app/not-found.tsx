import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[52vh] flex-col items-center justify-center py-16 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">404</p>
      <h1 className="mt-3 text-[40px] font-semibold tracking-[-0.03em] text-ink">Page not found</h1>
      <p className="mt-3 max-w-[420px] text-[13px] leading-6 text-muted">
        The page you are looking for may have moved. Explore our solar products or head back home.
      </p>
      <div className="mt-7 flex gap-3">
        <Link href="/" className="inline-flex h-11 items-center rounded-full bg-navy px-7 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
          Back home
        </Link>
        <Link href="/search" className="inline-flex h-11 items-center rounded-full border border-line px-7 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink">
          Shop products
        </Link>
      </div>
    </div>
  );
}
