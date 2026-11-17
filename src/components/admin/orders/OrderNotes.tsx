"use client";

import { useState, useTransition } from "react";
import { Send, Loader2 } from "lucide-react";
import { addOrderNoteAction } from "@/app/(admin)/admin/(dashboard)/orders/actions";
import { Field } from "@/components/admin/FormSection";
import { useToast } from "@/components/admin/ToastProvider";

export function OrderNotes({
  id,
  initialNotes,
}: {
  id: string;
  initialNotes: Array<{ body: string; by: string; at: string | Date }>;
}) {
  const { toast } = useToast();
  const [newNote, setNewNote] = useState("");
  const [adding, startAdd] = useTransition();

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    startAdd(async () => {
      const result = await addOrderNoteAction({ id, body: newNote.trim() });
      if (result.ok) {
        toast("Note added.");
        setNewNote("");
      } else {
        toast(result.error ?? "Failed to add note", "error");
      }
    });
  };

  const sortedNotes = [...initialNotes].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <section className="rounded-[8px] border border-admin-line bg-white p-5">
      <h2 className="text-[14px] font-semibold text-ink">Internal notes</h2>
      {sortedNotes.length ? (
        <ul className="mt-3 divide-y divide-admin-line">
          {sortedNotes.map((note, index) => (
            <li key={index} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="whitespace-pre-line text-[13px] text-ink">{note.body}</p>
                  <p className="mt-1 text-[11px] text-admin-muted">
                    {note.by} · {new Date(note.at).toLocaleString("en-GB")}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[12px] text-admin-muted">No internal notes yet.</p>
      )}
      <div className="mt-4 flex items-end gap-2">
        <Field label="Note" className="flex-1">
          <textarea
            value={newNote}
            onChange={(event) => setNewNote(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleAddNote();
              }
            }}
            placeholder="Add an internal note (Enter to save, Shift+Enter for new line)"
            className="admin-field admin-textarea min-h-[70px]"
            disabled={adding}
          />
        </Field>
        <button
          type="button"
          onClick={handleAddNote}
          disabled={adding || !newNote.trim()}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[6px] bg-navy px-4 text-[12px] font-medium text-white hover:bg-navy-deep disabled:opacity-60"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Add note
        </button>
      </div>
    </section>
  );
}