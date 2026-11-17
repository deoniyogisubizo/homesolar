import Link from "next/link";

export default function AdminLoading() {
  return (
    <div className="px-5 py-6 lg:px-8" aria-busy="true" aria-label="Loading dashboard content">
      <div className="h-6 w-48 animate-pulse rounded bg-admin-line" />
      <div className="mt-2 h-4 w-80 animate-pulse rounded bg-admin-line/70" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-[8px] border border-admin-line bg-white" />
        ))}
      </div>
      <div className="mt-4 h-80 animate-pulse rounded-[8px] border border-admin-line bg-white" />
      <p className="mt-4 text-[12px] text-admin-muted">
        <Link href="/admin" className="text-brand-deep hover:underline">
          Reload
        </Link>
      </p>
    </div>
  );
}
