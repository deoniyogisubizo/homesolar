"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Download, Loader2, Upload, X } from "lucide-react";
import { importProductsAction } from "@/app/(admin)/admin/(dashboard)/products/actions";
import { useToast } from "@/components/admin/ToastProvider";

type ImportResult = { created: number; updated: number; errors: string[] };

export function ProductImportDialog() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setCsv("");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const runImport = () => {
    if (!csv.trim()) {
      toast("Paste CSV content or choose a file first.", "error");
      return;
    }
    startTransition(async () => {
      const response = await importProductsAction({ csv });
      if (!response.ok) {
        toast(response.error, "error");
        return;
      }
      setResult(response.data);
      toast(
        `Import finished: ${response.data.created} created, ${response.data.updated} updated.`,
        response.data.errors.length ? "error" : "success",
      );
      router.refresh();
    });
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[13px] font-medium text-ink hover:bg-tile"
        >
          <Upload className="h-3.5 w-3.5" />
          Import CSV
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-navy-deep/45" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] max-h-[calc(100vh-48px)] w-[min(620px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[8px] border border-admin-line bg-white p-5 shadow-[0_24px_60px_rgba(16,24,40,0.2)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-[16px] font-semibold text-ink">Import products</Dialog.Title>
              <Dialog.Description className="mt-1 text-[12px] leading-5 text-admin-muted">
                Upload a CSV exported from this page or built from the template. Existing slugs are updated, new slugs
                are created. At most 500 rows per import.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-[4px] p-1 text-admin-muted hover:bg-tile hover:text-ink"
                aria-label="Close import dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- CSV downloads must bypass client navigation */}
            <a
              href="/api/admin/products/export?template=1"
              className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
            >
              <Download className="h-3.5 w-3.5" />
              Download template
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- CSV downloads must bypass client navigation */}
            <a
              href="/api/admin/products/export"
              className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
            >
              <Download className="h-3.5 w-3.5" />
              Export all products
            </a>
          </div>

          <div className="mt-4">
            <label className="admin-label" htmlFor="product-csv-file">
              CSV file
            </label>
            <input
              ref={fileRef}
              id="product-csv-file"
              type="file"
              accept=".csv,text/csv,text/plain"
              className="admin-field file:mr-3 file:rounded-[4px] file:border-0 file:bg-tile file:px-2 file:py-1 file:text-[12px]"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (file.size > 1_000_000) {
                  toast("The CSV file is larger than 1 MB. Split it into smaller imports.", "error");
                  return;
                }
                setCsv(await file.text());
              }}
            />
          </div>

          <div className="mt-3">
            <label className="admin-label" htmlFor="product-csv-text">
              CSV content
            </label>
            <textarea
              id="product-csv-text"
              className="admin-field admin-textarea min-h-[160px] font-mono text-[11px]"
              value={csv}
              onChange={(event) => setCsv(event.target.value)}
              placeholder={"slug,name,category,price,stock,image,publish_status\nsolar-panel-450w,Solar Panel 450W,solar-panels,185000,12,/uploads/panel.webp,active"}
            />
            <p className="admin-help">
              Required for new products: slug, name, category, price, stock and image. Category is the category slug.
            </p>
          </div>

          {result ? (
            <div className="mt-4 rounded-[6px] border border-admin-line bg-tile p-3">
              <p className="text-[12px] font-medium text-ink">
                {result.created} created, {result.updated} updated, {result.errors.length} row
                {result.errors.length === 1 ? "" : "s"} skipped.
              </p>
              {result.errors.length ? (
                <ul className="mt-2 max-h-[160px] space-y-1 overflow-y-auto text-[11px] leading-5 text-danger">
                  {result.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex h-9 items-center rounded-[6px] border border-admin-line bg-white px-3.5 text-[13px] font-medium text-ink hover:bg-tile"
              >
                Close
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={runImport}
              disabled={pending}
              className="inline-flex h-9 items-center gap-1.5 rounded-[6px] bg-navy px-4 text-[13px] font-medium text-white hover:bg-navy-deep disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Import products
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
