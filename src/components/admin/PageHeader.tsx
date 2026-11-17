import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Crumb = { label: string; href?: string };

export function PageHeader({
  title,
  description,
  breadcrumbs = [],
  action,
}: {
  title: string;
  description?: string;
  breadcrumbs?: Crumb[];
  action?: React.ReactNode;
}) {
  return (
    <header className="border-b border-admin-line bg-white px-5 py-5 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1 text-[12px] text-admin-muted">
        {breadcrumbs.length ? (
          breadcrumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
              {index > 0 ? <ChevronRight className="h-3 w-3" aria-hidden="true" /> : null}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-ink">
                  {crumb.label}
                </Link>
              ) : (
                <span>{crumb.label}</span>
              )}
            </span>
          ))
        ) : (
          <span>Dashboard</span>
        )}
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold text-ink lg:text-[24px]">{title}</h1>
          {description ? <p className="mt-1 max-w-3xl text-[13px] text-admin-muted">{description}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
      </div>
    </header>
  );
}

export function PageBody({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-6 lg:px-8">{children}</div>;
}
