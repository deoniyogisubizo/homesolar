"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  destructive = true,
  pending,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  destructive?: boolean;
  pending?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-navy-deep/45" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-[8px] border border-admin-line bg-white p-5 shadow-[0_24px_60px_rgba(16,24,40,0.2)]">
          <Dialog.Title className="text-[16px] font-semibold text-ink">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-[13px] leading-6 text-admin-muted">{description}</Dialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex h-9 items-center rounded-[6px] border border-admin-line bg-white px-3.5 text-[13px] font-medium text-ink hover:bg-tile"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                onConfirm();
                setOpen(false);
              }}
              className={`inline-flex h-9 items-center rounded-[6px] px-4 text-[13px] font-medium text-white disabled:opacity-60 ${
                destructive ? "bg-danger hover:bg-danger/90" : "bg-navy hover:bg-navy-deep"
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
