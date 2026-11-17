import Link from "next/link";
import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { guardPage } from "@/lib/admin/page-guard";
import { connectToDatabase } from "@/lib/mongodb";
import { AuditLog } from "@/models/AuditLog";
import { labelize } from "@/components/admin/StatusBadge";

export const metadata = { title: "Audit log" };

const ACTIONS = ["login", "login_failed", "logout", "create", "update", "delete", "settings", "send", "status"];

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entity?: string; q?: string; page?: string }>;
}) {
  await guardPage("audit:read");
  const params = await searchParams;
  await connectToDatabase();

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const limit = 40;
  const filter: Record<string, unknown> = {};
  if (params.action && ACTIONS.includes(params.action)) filter.action = params.action;
  if (params.entity) filter.entity = params.entity;
  if (params.q) {
    const pattern = new RegExp(params.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ actorEmail: pattern }, { summary: pattern }, { entityId: pattern }];
  }

  const [entries, total, entities] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    AuditLog.countDocuments(filter),
    AuditLog.distinct("entity"),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / limit));
  const pageHref = (next: number) => {
    const search = new URLSearchParams();
    if (params.action) search.set("action", params.action);
    if (params.entity) search.set("entity", params.entity);
    if (params.q) search.set("q", params.q);
    search.set("page", String(next));
    return `/admin/audit?${search.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Who changed what, when, and from which address."
        breadcrumbs={[{ label: "Settings" }, { label: "Audit log" }]}
      />
      <PageBody>
        <form className="mb-4 flex flex-wrap items-end gap-2" action="/admin/audit">
          <div>
            <label className="admin-label" htmlFor="q">Search</label>
            <input id="q" name="q" defaultValue={params.q ?? ""} className="admin-field w-[220px]" placeholder="Email, summary or record id" />
          </div>
          <div>
            <label className="admin-label" htmlFor="action">Action</label>
            <select id="action" name="action" defaultValue={params.action ?? ""} className="admin-field w-[160px]">
              <option value="">All actions</option>
              {ACTIONS.map((action) => (
                <option key={action} value={action}>{labelize(action)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="admin-label" htmlFor="entity">Entity</label>
            <select id="entity" name="entity" defaultValue={params.entity ?? ""} className="admin-field w-[180px]">
              <option value="">All entities</option>
              {entities.sort().map((entity) => (
                <option key={entity} value={entity}>{labelize(entity)}</option>
              ))}
            </select>
          </div>
          <button className="inline-flex h-9 items-center rounded-[6px] bg-navy px-4 text-[13px] font-medium text-white" type="submit">
            Apply filters
          </button>
          <Link href="/admin/audit" className="inline-flex h-9 items-center rounded-[6px] border border-admin-line px-3 text-[13px]">
            Clear
          </Link>
        </form>

        {entries.length ? (
          <div className="overflow-hidden rounded-[8px] border border-admin-line bg-white">
            <table className="w-full min-w-[780px] text-left">
              <thead className="bg-tile">
                <tr>
                  {["When", "Actor", "Action", "Entity", "Summary"].map((header) => (
                    <th key={header} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-admin-muted">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={String(entry._id)} className="border-t border-admin-line align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-[12px] text-admin-muted">
                      {(entry.createdAt ?? new Date()).toLocaleString("en-GB")}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[12px] text-ink">{entry.actorEmail}</p>
                      <p className="text-[11px] text-admin-muted">{entry.actorRole}</p>
                    </td>
                    <td className="px-4 py-3 text-[12px]">{labelize(entry.action)}</td>
                    <td className="px-4 py-3 text-[12px]">
                      {entry.entity}
                      {entry.entityId ? <span className="block max-w-[180px] truncate font-mono text-[10px] text-admin-muted">{entry.entityId}</span> : null}
                    </td>
                    <td className="px-4 py-3 text-[12px]">
                      {entry.summary}
                      {entry.before || entry.after ? (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-[11px] text-brand-deep">Show diff</summary>
                          <div className="mt-2 grid gap-2 lg:grid-cols-2">
                            <pre className="max-h-56 overflow-auto rounded border border-admin-line bg-tile p-2 text-[10px]">
                              {JSON.stringify(entry.before, null, 2) ?? "null"}
                            </pre>
                            <pre className="max-h-56 overflow-auto rounded border border-admin-line bg-tile p-2 text-[10px]">
                              {JSON.stringify(entry.after, null, 2) ?? "null"}
                            </pre>
                          </div>
                        </details>
                      ) : null}
                      <span className="mt-1 block font-mono text-[10px] text-admin-muted">{entry.ip}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-admin-line px-4 py-2.5 text-[12px] text-admin-muted">
              <span>{total} entries</span>
              <div className="flex items-center gap-2">
                {page > 1 ? <Link href={pageHref(page - 1)} className="text-brand-deep hover:underline">Previous</Link> : null}
                <span>Page {page} of {pageCount}</span>
                {page < pageCount ? <Link href={pageHref(page + 1)} className="text-brand-deep hover:underline">Next</Link> : null}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No audit entries match"
            description="Actions are recorded as soon as staff sign in or change store data. Adjust the filters to see more."
          />
        )}
      </PageBody>
    </>
  );
}
