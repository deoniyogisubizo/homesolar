"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Columns3, Download, Loader2, Trash2 } from "lucide-react";
import { StatusBadge, type StatusTone } from "@/components/admin/StatusBadge";
import { useToast } from "@/components/admin/ToastProvider";
import type { ActionResult } from "@/lib/admin/action-result";

type AlignMeta = { align?: "left" | "right" };

export type AdminTableCell = {
  label: string;
  sub?: string;
  tone?: StatusTone;
  href?: string;
  title?: string;
  sortValue?: string | number;
};

export type AdminTableRow = {
  id: string;
  cells: Record<string, AdminTableCell>;
};

export type AdminTableColumn = {
  key: string;
  header: string;
  align?: "left" | "right";
  hideByDefault?: boolean;
};

export type BulkOption = { value: string; label: string };

export type RowAction = {
  label: string;
  kind: "edit" | "delete";
  /** Base path for edit links. The row id is appended, e.g. `/admin/products` → `/admin/products/<id>`. */
  hrefPrefix?: string;
  /** Server action invoked with `{ id }` to delete the row. Must be exported from a `"use server"` module. */
  onDeleteAction?: (input: { id: string }) => Promise<ActionResult<null>>;
};

type RowData = AdminTableRow & { values: Record<string, AdminTableCell | undefined> };

export function DataTable({
  columns,
  rows,
  total,
  page,
  pageSize,
  emptyTitle,
  emptyDescription,
  bulkOptions,
  bulkAction,
  defaultSort,
  rowActions,
}: {
  columns: AdminTableColumn[];
  rows: AdminTableRow[];
  total: number;
  page: number;
  pageSize: number;
  emptyTitle: string;
  emptyDescription: string;
  bulkOptions?: BulkOption[];
  bulkAction?: (formData: FormData) => Promise<void>;
  defaultSort?: { key: string; desc?: boolean };
  rowActions?: RowAction[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [sorting, setSorting] = useState<SortingState>(
    defaultSort ? [{ id: defaultSort.key, desc: Boolean(defaultSort.desc) }] : [],
  );
  const [visibility, setVisibility] = useState<VisibilityState>(
    Object.fromEntries(columns.filter((column) => column.hideByDefault).map((column) => [column.key, false])),
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkIntent, setBulkIntent] = useState(bulkOptions?.[0]?.value ?? "");
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<string | null>(null);

  const data = useMemo<RowData[]>(
    () => rows.map((row) => ({ ...row, values: row.cells })),
    [rows],
  );

  const tableColumns = useMemo<ColumnDef<RowData>[]>(
    () =>
      columns.map((column) => ({
        id: column.key,
        accessorFn: (row) => row.values[column.key]?.sortValue ?? row.values[column.key]?.label ?? "",
        header: column.header,
        enableSorting: true,
        sortingFn: "basic",
        meta: { align: column.align },
      })),
    [columns],
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table API is intentionally un-memoized
  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting, columnVisibility: visibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const allOnPageSelected = rows.length > 0 && rows.every((row) => selected.includes(row.id));

  useEffect(() => {
    setSelected([]);
  }, [rows]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== "page") params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const exportCsv = () => {
    const header = columns.map((column) => `"${column.header.replace(/"/g, '""')}"`).join(",");
    const body = rows.map((row) =>
      columns
        .map((column) => `"${(row.cells[column.key]?.label ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header, ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "export.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const runBulk = () => {
    if (!bulkAction || !selected.length || !bulkIntent) return;
    const formData = new FormData();
    formData.set("ids", selected.join(","));
    formData.set("intent", bulkIntent);
    startTransition(async () => {
      await bulkAction(formData);
      setSelected([]);
    });
  };

  const runDelete = async (action: RowAction, id: string) => {
    if (!action.onDeleteAction) return;
    setDeleting(id);
    try {
      const result = await action.onDeleteAction({ id });
      setDeleting(null);
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      router.refresh();
      toast("Record deleted.");
    } catch (error) {
      setDeleting(null);
      toast(error instanceof Error ? error.message : "Delete failed.", "error");
    }
  };

  return (
    <div className="rounded-[8px] border border-admin-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-admin-line px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {bulkOptions?.length && bulkAction ? (
            selected.length ? (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-admin-muted">{selected.length} selected</span>
                <select
                  value={bulkIntent}
                  onChange={(event) => setBulkIntent(event.target.value)}
                  className="h-8 rounded-[5px] border border-admin-line bg-white px-2 text-[12px]"
                  aria-label="Bulk action"
                >
                  {bulkOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={runBulk}
                  disabled={pending}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[5px] bg-navy px-3 text-[12px] font-medium text-white hover:bg-navy-deep disabled:opacity-60"
                >
                  {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Apply
                </button>
              </div>
            ) : (
              <span className="text-[12px] text-admin-muted">Select rows for bulk actions</span>
            )
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-8 items-center gap-1.5 rounded-[5px] border border-admin-line bg-white px-2.5 text-[12px] font-medium text-ink hover:bg-tile"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-[5px] border border-admin-line bg-white px-2.5 text-[12px] font-medium text-ink hover:bg-tile"
              >
                <Columns3 className="h-3.5 w-3.5" />
                Columns
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                className="z-[80] w-48 rounded-[6px] border border-admin-line bg-white p-1 shadow-[0_12px_32px_rgba(16,24,40,0.12)]"
              >
                {table.getAllLeafColumns().map((column) => (
                  <DropdownMenu.CheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(checked) => column.toggleVisibility(checked)}
                    onSelect={(event) => event.preventDefault()}
                    className="flex cursor-pointer items-center gap-2 rounded-[4px] px-2 py-1.5 text-[12px] text-ink outline-none data-[highlighted]:bg-tile"
                  >
                    <input type="checkbox" readOnly checked={column.getIsVisible()} aria-hidden="true" className="h-3.5 w-3.5" />
                    {columns.find((entry) => entry.key === column.id)?.header ?? column.id}
                  </DropdownMenu.CheckboxItem>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead className="bg-tile">
            <tr>
              {bulkAction ? (
                <th className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Select all rows on this page"
                    checked={allOnPageSelected}
                    onChange={(event) =>
                      setSelected(event.target.checked ? rows.map((row) => row.id) : [])
                    }
                    className="h-4 w-4 rounded border-admin-line"
                  />
                </th>
              ) : null}
              {table.getHeaderGroups()[0]?.headers.map((header) => (
                <th key={header.id} className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-admin-muted">
                  {header.isPlaceholder ? null : (
                    <button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      className={`flex items-center gap-1 ${(header.column.columnDef.meta as AlignMeta | undefined)?.align === "right" ? "ml-auto" : ""}`}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : header.column.getIsSorted() === "desc" ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : null}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.original.id} className="border-t border-admin-line hover:bg-tile/60">
                {bulkAction ? (
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      aria-label={`Select row ${row.original.id}`}
                      checked={selected.includes(row.original.id)}
                      onChange={(event) =>
                        setSelected((current) =>
                          event.target.checked
                            ? [...current, row.original.id]
                            : current.filter((id) => id !== row.original.id),
                        )
                      }
                      className="h-4 w-4 rounded border-admin-line"
                    />
                  </td>
                ) : null}
                {row.getVisibleCells().map((cell) => {
                  const value = row.original.values[cell.column.id];
                  const align = (cell.column.columnDef.meta as AlignMeta | undefined)?.align;
                  return (
                    <td key={cell.id} className={`px-3 py-2.5 text-[13px] ${align === "right" ? "text-right" : ""}`}>
                      {value ? (
                        <div className={align === "right" ? "flex flex-col items-end" : ""}>
                          {value.tone ? (
                            <StatusBadge label={value.label} tone={value.tone} />
                          ) : value.href ? (
                            <Link href={value.href} className="font-medium text-brand-deep hover:underline">
                              {value.label}
                            </Link>
                          ) : (
                            <span className="text-ink" title={value.title}>
                              {value.label}
                            </span>
                          )}
                          {value.sub ? <span className="mt-0.5 text-[11px] text-admin-muted">{value.sub}</span> : null}
                        </div>
                      ) : (
                        <span className="text-admin-muted">—</span>
                      )}
                    </td>
                  );
                })}
                {rowActions?.length && (
                  <td key="actions" className={`px-3 py-2.5 text-[11px] flex items-center gap-1 ${deleting === row.original.id ? "bg-admin-line/10" : ""}`}>
                    {rowActions.map((action) => {
                      if (action.kind === "edit" && action.hrefPrefix) {
                        return (
                          <Link
                            key="edit"
                            href={`${action.hrefPrefix}/${row.original.id}`}
                            className="font-medium text-brand-deep hover:underline text-[11px]"
                          >
                            Edit
                          </Link>
                        );
                      }
                      if (action.kind === "delete" && action.onDeleteAction) {
                        return (
                          <button
                            key="delete"
                            onClick={() => runDelete(action, row.original.id)}
                            disabled={deleting === row.original.id}
                            className={`inline-flex h-8 items-center gap-1.5 rounded-[5px] px-2.5 text-[11px] font-medium text-danger hover:text-danger/90 ${deleting === row.original.id ? "bg-danger/10" : ""}`}
                          >
                            {deleting === row.original.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </button>
                        );
                      }
                      return null;
                    })}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!rows.length ? (
        <div className="px-6 py-12 text-center">
          <h3 className="text-[14px] font-semibold text-ink">{emptyTitle}</h3>
          <p className="mt-1 text-[12px] text-admin-muted">{emptyDescription}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-admin-line px-4 py-2.5">
        <div className="flex items-center gap-2 text-[12px] text-admin-muted">
          <span>
            {total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} of {total}
          </span>
          <select
            value={pageSize}
            onChange={(event) => {
              window.localStorage.setItem("admin.pageSize", event.target.value);
              updateParam("size", event.target.value);
            }}
            className="h-8 rounded-[5px] border border-admin-line bg-white px-2 text-[12px]"
            aria-label="Rows per page"
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => updateParam("page", String(page - 1))}
            disabled={page <= 1}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[5px] border border-admin-line text-ink hover:bg-tile disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 text-[12px] text-admin-muted">
            Page {page} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() => updateParam("page", String(page + 1))}
            disabled={page >= pageCount}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[5px] border border-admin-line text-ink hover:bg-tile disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
