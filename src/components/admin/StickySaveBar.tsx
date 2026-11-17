"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export function useDirtyState(value: unknown) {
  const [snapshot, setSnapshot] = useState(() => JSON.stringify(value));
  const dirty = JSON.stringify(value) !== snapshot;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return {
    dirty,
    reset: (next?: unknown) => {
      setSnapshot(JSON.stringify(next === undefined ? value : next));
    },
  };
}

export function StickySaveBar({
  dirty,
  pending,
  onDiscard,
  label = "You have unsaved changes.",
}: {
  dirty: boolean;
  pending?: boolean;
  onDiscard: () => void;
  label?: string;
}) {
  if (!dirty) return null;

  return (
    <div className="sticky bottom-0 z-30 -mx-5 mt-6 border-t border-admin-line bg-white/95 px-5 py-3 backdrop-blur lg:-mx-8 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-admin-muted">{label}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDiscard}
            className="inline-flex h-9 items-center rounded-[6px] border border-admin-line bg-white px-3.5 text-[13px] font-medium text-ink hover:bg-tile"
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-9 items-center gap-2 rounded-[6px] bg-navy px-4 text-[13px] font-medium text-white hover:bg-navy-deep disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
