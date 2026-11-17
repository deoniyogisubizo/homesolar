"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { adjustInventoryAction } from "@/app/(admin)/admin/(dashboard)/inventory/actions";
import { Field, FieldGrid, FormSection } from "@/components/admin/FormSection";
import { useToast } from "@/components/admin/ToastProvider";
import type { InventoryAdjustInput } from "@/schemas/inventory";

const REASONS: Array<{ value: InventoryAdjustInput["reason"]; label: string }> = [
  { value: "restock", label: "Restock received" },
  { value: "correction", label: "Stock count correction" },
  { value: "damage", label: "Damaged or lost" },
  { value: "return", label: "Customer return" },
  { value: "sale", label: "Manual sale" },
  { value: "other", label: "Other" },
];

export function InventoryAdjustForm({
  productId,
  productName,
  stock,
  variants,
}: {
  productId: string;
  productName: string;
  stock: number;
  variants: Array<{ sku: string; label: string; stock: number }>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [variantSku, setVariantSku] = useState("");
  const [mode, setMode] = useState<"set" | "delta">("delta");
  const [value, setValue] = useState("0");
  const [reason, setReason] = useState<InventoryAdjustInput["reason"]>("restock");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const selected = useMemo(
    () => variants.find((variant) => variant.sku === variantSku),
    [variantSku, variants],
  );
  const current = selected ? selected.stock : stock;
  const parsedValue = Number(value);
  const projected =
    Number.isFinite(parsedValue) && value !== "" ? (mode === "set" ? parsedValue : current + parsedValue) : current;
  const delta = projected - current;

  const submit = () => {
    startTransition(async () => {
      const result = await adjustInventoryAction({
        productId,
        variantSku: variantSku || null,
        mode,
        value: parsedValue,
        reason,
        note,
      });
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      toast(
        `Stock updated to ${result.data.stockAfter} (${result.data.delta > 0 ? "+" : ""}${result.data.delta}).`,
        "success",
      );
      setValue("0");
      setNote("");
      router.refresh();
    });
  };

  return (
    <FormSection
      title="Adjust stock"
      description="Every change is recorded in the movement log with your name and reason."
    >
      <FieldGrid>
        <Field label="Stock level" htmlFor="inventory-variant">
          <select
            id="inventory-variant"
            className="admin-field"
            value={variantSku}
            onChange={(event) => setVariantSku(event.target.value)}
          >
            <option value="">Base product ({stock} in stock)</option>
            {variants.map((variant) => (
              <option key={variant.sku} value={variant.sku}>
                {variant.label} ({variant.stock} in stock)
              </option>
            ))}
          </select>
        </Field>
        <Field label="Adjustment type" htmlFor="inventory-mode">
          <select
            id="inventory-mode"
            className="admin-field"
            value={mode}
            onChange={(event) => setMode(event.target.value as "set" | "delta")}
          >
            <option value="delta">Add or remove units</option>
            <option value="set">Set exact stock level</option>
          </select>
        </Field>
        <Field
          label={mode === "set" ? "New stock level" : "Units to add or remove"}
          htmlFor="inventory-value"
          hint={mode === "delta" ? "Use a negative number to remove units, for example -3." : undefined}
        >
          <input
            id="inventory-value"
            type="number"
            step={1}
            className="admin-field"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </Field>
        <Field label="Reason" htmlFor="inventory-reason">
          <select
            id="inventory-reason"
            className="admin-field"
            value={reason}
            onChange={(event) => setReason(event.target.value as InventoryAdjustInput["reason"])}
          >
            {REASONS.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </Field>
      </FieldGrid>
      <div className="mt-3">
        <Field label="Note" htmlFor="inventory-note" hint="Optional. Reference a supplier delivery or stock count.">
          <input
            id="inventory-note"
            className="admin-field"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Supplier delivery 24 August"
          />
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[6px] bg-tile px-3 py-2.5">
        <div className="text-[12px] text-admin-muted">
          <span className="font-medium text-ink">{productName}</span>
          {selected ? ` · ${selected.label}` : ""} · current stock {current}
        </div>
        <div className="text-[12px]">
          <span className="text-admin-muted">After adjustment: </span>
          <span className={`font-semibold ${projected < 0 ? "text-danger" : "text-ink"}`}>{projected}</span>
          {delta !== 0 ? (
            <span className={`ml-1.5 ${delta > 0 ? "text-success" : "text-danger"}`}>
              ({delta > 0 ? "+" : ""}
              {delta})
            </span>
          ) : null}
        </div>
      </div>
      {projected < 0 ? <p className="mt-2 text-[12px] text-danger">Stock cannot go below zero.</p> : null}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={pending || projected < 0 || delta === 0}
          className="inline-flex h-9 items-center gap-1.5 rounded-[6px] bg-navy px-4 text-[13px] font-medium text-white hover:bg-navy-deep disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Apply adjustment
        </button>
      </div>
    </FormSection>
  );
}
