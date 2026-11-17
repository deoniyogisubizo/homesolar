"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { ImageIcon, Search, X } from "lucide-react";

type MediaItem = {
  id: string;
  url: string;
  thumbUrl: string | null;
  alt: string;
  originalName: string;
  folder: string;
};

export function ImagePicker({
  value,
  onChange,
  label = "Image",
  hint,
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      if (active) setLoading(true);
      try {
        const response = await fetch(`/api/admin/media?q=${encodeURIComponent(query)}&limit=36`);
        const payload = (await response.json()) as { ok: boolean; data?: { items: MediaItem[] } };
        if (active && payload.ok && payload.data) setItems(payload.data.items);
      } finally {
        if (active) setLoading(false);
      }
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open, query]);

  return (
    <div>
      <span className="admin-label">{label}</span>
      <div className="flex items-start gap-3">
        <div className="relative h-[72px] w-[104px] shrink-0 overflow-hidden rounded-[6px] border border-admin-line bg-tile">
          {value ? (
            <Image src={value} alt="" fill sizes="104px" className="object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-admin-muted">
              <ImageIcon className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <input
            className="admin-field"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="/images/example.jpg or https://..."
            aria-label={label}
          />
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                className="inline-flex h-8 items-center rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
              >
                Choose from library
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-[100] bg-navy-deep/45" />
              <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] flex h-[min(620px,calc(100vh-40px))] w-[min(860px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[8px] border border-admin-line bg-white">
                <div className="flex items-center justify-between border-b border-admin-line px-5 py-4">
                  <Dialog.Title className="text-[15px] font-semibold text-ink">Media library</Dialog.Title>
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      aria-label="Close"
                      className="rounded-[4px] p-1 text-admin-muted hover:bg-tile hover:text-ink"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </Dialog.Close>
                </div>
                <div className="border-b border-admin-line p-4">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-muted" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search by name, alt text or tag"
                      className="admin-field pl-9"
                      aria-label="Search media"
                    />
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  {loading ? (
                    <p className="py-10 text-center text-[13px] text-admin-muted">Loading media...</p>
                  ) : items.length ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onChange(item.url);
                            setOpen(false);
                          }}
                          className="group overflow-hidden rounded-[6px] border border-admin-line text-left hover:border-brand"
                        >
                          <span className="relative block aspect-[4/3] bg-tile">
                            <Image
                              src={item.thumbUrl || item.url}
                              alt={item.alt || item.originalName}
                              fill
                              sizes="200px"
                              className="object-cover"
                            />
                          </span>
                          <span className="block truncate px-2 py-1.5 text-[11px] text-admin-muted">{item.originalName}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="py-10 text-center text-[13px] text-admin-muted">No media matches this search.</p>
                  )}
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
      {hint ? <p className="admin-help">{hint}</p> : null}
    </div>
  );
}
