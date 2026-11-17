"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Grid2X2, List, Pencil, Search, Trash2, Upload } from "lucide-react";
import { deleteMediaAction, updateMediaAction, uploadMediaAction } from "@/app/(admin)/admin/(dashboard)/media/actions";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { FormError } from "@/components/admin/FormSection";
import { useToast } from "@/components/admin/ToastProvider";
import * as Dialog from "@radix-ui/react-dialog";

export type MediaRow = {
  id: string;
  url: string;
  thumbUrl: string | null;
  alt: string;
  originalName: string;
  folder: string;
  tags: string[];
  size: number;
  width: number | null;
  height: number | null;
  createdAt: string | null;
};

type ApiMedia = Omit<MediaRow, "id" | "tags"> & { id: string; tags?: string[] };

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaLibrary({
  initialItems,
  canWrite,
}: {
  initialItems: MediaRow[];
  canWrite: boolean;
}) {
  const { toast } = useToast();
  const [items, setItems] = useState<MediaRow[]>(initialItems);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [folder, setFolder] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<MediaRow | null>(null);
  const [editValues, setEditValues] = useState({ alt: "", folder: "general", tags: "" });
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async (search: string, nextFolder: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/media?q=${encodeURIComponent(search)}&folder=${encodeURIComponent(nextFolder)}&limit=72`,
      );
      const payload = (await response.json()) as { ok: boolean; data?: { items: ApiMedia[] } };
      if (payload.ok && payload.data) {
        setItems(
          payload.data.items.map((item) => ({
            ...item,
            tags: item.tags ?? [],
            width: item.width ?? null,
            height: item.height ?? null,
            createdAt: item.createdAt ?? null,
          })),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(query, folder);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [query, folder]);

  const upload = (files: FileList | null) => {
    if (!files?.length) return;
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("files", file));
    formData.set("folder", folder || "general");
    setUploadError(null);
    startTransition(async () => {
      const response = await uploadMediaAction(formData);
      if (response.ok) {
        toast(`${response.data.uploaded} image${response.data.uploaded === 1 ? "" : "s"} uploaded.`);
        if (response.data.errors.length) setUploadError(response.data.errors.join(" "));
        await load(query, folder);
      } else {
        setUploadError(response.error);
        toast(response.error, "error");
      }
    });
  };

  const saveEdit = () => {
    if (!editing) return;
    startTransition(async () => {
      const response = await updateMediaAction({ id: editing.id, ...editValues });
      if (response.ok) {
        toast("Media updated.");
        setEditing(null);
        await load(query, folder);
      } else {
        toast(response.error, "error");
      }
    });
  };

  const remove = (item: MediaRow) => {
    startTransition(async () => {
      const response = await deleteMediaAction({ id: item.id });
      if (response.ok) {
        toast("Media deleted.");
        setItems((current) => current.filter((row) => row.id !== item.id));
      } else {
        toast(response.error, "error");
      }
    });
  };

  const folders = Array.from(new Set(items.map((item) => item.folder)));

  return (
    <div className="space-y-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (canWrite) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (canWrite) upload(event.dataTransfer.files);
        }}
        className={`rounded-[8px] border-2 border-dashed p-6 text-center transition-colors ${
          dragging ? "border-brand bg-brand-pale" : "border-admin-line bg-white"
        }`}
      >
        <Upload className="mx-auto h-6 w-6 text-admin-muted" aria-hidden="true" />
        <p className="mt-2 text-[13px] font-medium text-ink">
          Drop images here or choose files
        </p>
        <p className="mt-1 text-[11px] text-admin-muted">JPEG, PNG, WebP or GIF. Up to 5 MB each, 10 files at a time.</p>
        {canWrite ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={(event) => upload(event.target.files)}
              className="sr-only"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={pending}
              className="mt-3 inline-flex h-9 items-center rounded-[6px] bg-navy px-4 text-[13px] font-medium text-white hover:bg-navy-deep disabled:opacity-60"
            >
              {pending ? "Uploading..." : "Choose images"}
            </button>
          </>
        ) : null}
        {uploadError ? <p className="mt-2 text-[12px] text-danger">{uploadError}</p> : null}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search media"
            className="admin-field pl-9"
            aria-label="Search media"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={folder}
            onChange={(event) => setFolder(event.target.value)}
            className="h-9 rounded-[6px] border border-admin-line bg-white px-2 text-[12px]"
            aria-label="Filter by folder"
          >
            <option value="">All folders</option>
            {folders.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <div className="flex overflow-hidden rounded-[6px] border border-admin-line">
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              className={`p-2 ${view === "grid" ? "bg-tile text-ink" : "bg-white text-admin-muted"}`}
            >
              <Grid2X2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              aria-label="List view"
              aria-pressed={view === "list"}
              className={`p-2 ${view === "list" ? "bg-tile text-ink" : "bg-white text-admin-muted"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="aspect-[4/3] animate-pulse rounded-[6px] bg-admin-line/60" />
          ))}
        </div>
      ) : items.length ? (
        view === "grid" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((item) => (
              <figure key={item.id} className="overflow-hidden rounded-[8px] border border-admin-line bg-white">
                <div className="relative aspect-[4/3] bg-tile">
                  <Image
                    src={item.thumbUrl || item.url}
                    alt={item.alt}
                    fill
                    sizes="(min-width: 1280px) 220px, (min-width: 640px) 30vw, 45vw"
                    className="object-cover"
                  />
                </div>
                <figcaption className="p-2">
                  <p className="truncate text-[12px] font-medium text-ink" title={item.originalName}>{item.originalName}</p>
                  <p className="truncate text-[10px] text-admin-muted">
                    {item.folder} · {formatBytes(item.size)}
                  </p>
                  {canWrite ? (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(item);
                          setEditValues({ alt: item.alt, folder: item.folder, tags: item.tags.join(", ") });
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-deep hover:underline"
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                      <ConfirmDialog
                        trigger={
                          <button type="button" className="inline-flex items-center gap-1 text-[11px] font-medium text-admin-muted hover:text-danger">
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        }
                        title="Delete image"
                        description={`Delete ${item.originalName}? Images used on the storefront cannot be deleted.`}
                        confirmLabel="Delete image"
                        onConfirm={() => remove(item)}
                        pending={pending}
                      />
                    </div>
                  ) : null}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[8px] border border-admin-line bg-white">
            <table className="w-full min-w-[640px] text-left">
              <thead className="bg-tile">
                <tr>
                  {["Image", "Name", "Folder", "Size", "Dimensions", "Actions"].map((header) => (
                    <th key={header} className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-admin-muted">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-admin-line">
                    <td className="px-3 py-2">
                      <div className="relative h-12 w-16 overflow-hidden rounded border border-admin-line bg-tile">
                        <Image src={item.thumbUrl || item.url} alt={item.alt} fill sizes="64px" className="object-cover" />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <p className="max-w-[220px] truncate text-[12px] text-ink">{item.originalName}</p>
                      <p className="max-w-[220px] truncate text-[11px] text-admin-muted">{item.alt}</p>
                    </td>
                    <td className="px-3 py-2 text-[12px]">{item.folder}</td>
                    <td className="px-3 py-2 text-[12px]">{formatBytes(item.size)}</td>
                    <td className="px-3 py-2 text-[12px]">{item.width ?? "—"} × {item.height ?? "—"}</td>
                    <td className="px-3 py-2">
                      {canWrite ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(item);
                              setEditValues({ alt: item.alt, folder: item.folder, tags: item.tags.join(", ") });
                            }}
                            className="text-[12px] font-medium text-brand-deep hover:underline"
                          >
                            Edit
                          </button>
                          <ConfirmDialog
                            trigger={<button type="button" className="text-[12px] text-admin-muted hover:text-danger">Delete</button>}
                            title="Delete image"
                            description={`Delete ${item.originalName}? Images used on the storefront cannot be deleted.`}
                            confirmLabel="Delete image"
                            onConfirm={() => remove(item)}
                            pending={pending}
                          />
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <EmptyState
          title="No media yet"
          description={canWrite ? "Upload storefront images to reuse them across products, campaigns and pages." : "No images match the current filters."}
        />
      )}

      <Dialog.Root open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-navy-deep/45" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[min(480px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-[8px] border border-admin-line bg-white p-5">
            <Dialog.Title className="text-[16px] font-semibold text-ink">Edit image details</Dialog.Title>
            <Dialog.Description className="mt-1 truncate text-[12px] text-admin-muted">{editing?.originalName}</Dialog.Description>
            <div className="mt-4 space-y-3">
              <FormError message={null} />
              <div>
                <label className="admin-label" htmlFor="media-alt">Alt text</label>
                <input
                  id="media-alt"
                  className="admin-field"
                  value={editValues.alt}
                  onChange={(event) => setEditValues({ ...editValues, alt: event.target.value })}
                />
              </div>
              <div>
                <label className="admin-label" htmlFor="media-folder">Folder</label>
                <input
                  id="media-folder"
                  className="admin-field"
                  value={editValues.folder}
                  onChange={(event) => setEditValues({ ...editValues, folder: event.target.value })}
                />
              </div>
              <div>
                <label className="admin-label" htmlFor="media-tags">Tags</label>
                <input
                  id="media-tags"
                  className="admin-field"
                  placeholder="homepage, summer, panels"
                  value={editValues.tags}
                  onChange={(event) => setEditValues({ ...editValues, tags: event.target.value })}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="inline-flex h-9 items-center rounded-[6px] border border-admin-line px-3.5 text-[13px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={pending}
                className="inline-flex h-9 items-center rounded-[6px] bg-navy px-4 text-[13px] font-medium text-white disabled:opacity-60"
              >
                Save details
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
