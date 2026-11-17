"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  deleteCouponAction,
  saveCouponAction,
} from "@/app/(admin)/admin/(dashboard)/discounts/actions";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Field, FieldGrid, FormSection } from "@/components/admin/FormSection";
import { SettingsSectionForm, fieldError, useSectionForm } from "@/components/admin/settings/SettingsForm";
import { useToast } from "@/components/admin/ToastProvider";
import { ProductPicker, type ProductOption } from "@/components/admin/content/ProductPicker";
import type { CategoryChoice } from "@/components/admin/discounts/CampaignEditor";

export type CouponFormValues = {
  id?: string;
  code: string;
  description: string;
  type: "percent" | "fixed" | "free_shipping";
  value: number;
  minSubtotal: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  perCustomerLimit: number;
  startsAt: string;
  endsAt: string;
  scope: "all" | "products" | "categories";
  productIds: string[];
  categoryIds: string[];
  status: "active" | "paused" | "archived";
};

export function CouponEditor({
  initial,
  categories,
  productOptions,
  usageCount,
}: {
  initial: CouponFormValues;
  categories: CategoryChoice[];
  productOptions: ProductOption[];
  usageCount: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [deleting, startDelete] = useTransition();
  const isNew = !initial.id;

  const form = useSectionForm<CouponFormValues, { id: string }>(initial, async (value) => {
    const result = await saveCouponAction({
      ...value,
      startsAt: value.startsAt || null,
      endsAt: value.endsAt || null,
    });
    if (result.ok && isNew) router.replace(`/admin/discounts/coupons/${result.data.id}`);
    return result;
  });
  const { value, setValue } = form;

  const toggleCategory = (id: string) => {
    setValue({
      ...value,
      categoryIds: value.categoryIds.includes(id)
        ? value.categoryIds.filter((entry) => entry !== id)
        : [...value.categoryIds, id],
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <SettingsSectionForm form={form} label="Coupon changes are not saved yet.">
          <FormSection title="Coupon code" description="The code customers type at checkout. Codes are not case sensitive.">
            <div className="space-y-4">
              <FieldGrid>
                <Field label="Code" htmlFor="coupon-code" error={fieldError(form, "code")}>
                  <input
                    id="coupon-code"
                    className="admin-field font-mono uppercase"
                    value={value.code}
                    onChange={(event) => setValue({ ...value, code: event.target.value.toUpperCase() })}
                    placeholder="WELCOME10"
                  />
                </Field>
                <Field label="Status" htmlFor="coupon-status">
                  <select
                    id="coupon-status"
                    className="admin-field"
                    value={value.status}
                    onChange={(event) => setValue({ ...value, status: event.target.value as CouponFormValues["status"] })}
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="archived">Archived</option>
                  </select>
                </Field>
              </FieldGrid>
              <Field label="Description" htmlFor="coupon-description" hint="Visible to staff only.">
                <input
                  id="coupon-description"
                  className="admin-field"
                  value={value.description}
                  onChange={(event) => setValue({ ...value, description: event.target.value })}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection title="Discount value" description="How much the coupon takes off an eligible order.">
            <FieldGrid columns={3}>
              <Field label="Type" htmlFor="coupon-type">
                <select
                  id="coupon-type"
                  className="admin-field"
                  value={value.type}
                  onChange={(event) => setValue({ ...value, type: event.target.value as CouponFormValues["type"] })}
                >
                  <option value="percent">Percentage off</option>
                  <option value="fixed">Fixed amount off</option>
                  <option value="free_shipping">Free shipping</option>
                </select>
              </Field>
              <Field
                label={value.type === "percent" ? "Percentage" : "Amount"}
                htmlFor="coupon-value"
                error={fieldError(form, "value")}
                hint={value.type === "free_shipping" ? "Not used for free shipping." : undefined}
              >
                <input
                  id="coupon-value"
                  type="number"
                  min={0}
                  step="0.01"
                  className="admin-field disabled:bg-tile"
                  disabled={value.type === "free_shipping"}
                  value={value.type === "free_shipping" ? 0 : value.value}
                  onChange={(event) => setValue({ ...value, value: Number(event.target.value) })}
                />
              </Field>
              <Field label="Minimum spend" htmlFor="coupon-minimum" error={fieldError(form, "minSubtotal")}>
                <input
                  id="coupon-minimum"
                  type="number"
                  min={0}
                  step="0.01"
                  className="admin-field"
                  value={value.minSubtotal}
                  onChange={(event) => setValue({ ...value, minSubtotal: Number(event.target.value) })}
                />
              </Field>
              <Field
                label="Maximum discount"
                htmlFor="coupon-max"
                hint="Optional cap for percentage coupons."
                error={fieldError(form, "maxDiscount")}
              >
                <input
                  id="coupon-max"
                  type="number"
                  min={0}
                  step="0.01"
                  className="admin-field"
                  value={value.maxDiscount ?? ""}
                  onChange={(event) =>
                    setValue({ ...value, maxDiscount: event.target.value === "" ? null : Number(event.target.value) })
                  }
                />
              </Field>
              <Field label="Total usage limit" htmlFor="coupon-usage-limit" hint="Leave empty for unlimited.">
                <input
                  id="coupon-usage-limit"
                  type="number"
                  min={0}
                  className="admin-field"
                  value={value.usageLimit ?? ""}
                  onChange={(event) =>
                    setValue({ ...value, usageLimit: event.target.value === "" ? null : Number(event.target.value) })
                  }
                />
              </Field>
              <Field label="Uses per customer" htmlFor="coupon-per-customer">
                <input
                  id="coupon-per-customer"
                  type="number"
                  min={1}
                  max={100}
                  className="admin-field"
                  value={value.perCustomerLimit}
                  onChange={(event) => setValue({ ...value, perCustomerLimit: Number(event.target.value) })}
                />
              </Field>
            </FieldGrid>
          </FormSection>

          <FormSection
            title="Applies to"
            description="Limit the coupon to specific products or categories. Minimum spend still applies to the whole cart."
          >
            <Field label="Scope" htmlFor="coupon-scope">
              <select
                id="coupon-scope"
                className="admin-field"
                value={value.scope}
                onChange={(event) => setValue({ ...value, scope: event.target.value as CouponFormValues["scope"] })}
              >
                <option value="all">Entire catalog</option>
                <option value="categories">Selected categories</option>
                <option value="products">Selected products</option>
              </select>
            </Field>

            {value.scope === "categories" ? (
              <div className="mt-3">
                <div className="max-h-[280px] space-y-1 overflow-y-auto rounded-[6px] border border-admin-line p-2">
                  {categories.map((category) => (
                    <label
                      key={category.id}
                      className="flex items-center gap-2 rounded-[4px] px-2 py-1.5 text-[13px] text-ink hover:bg-tile"
                    >
                      <input
                        type="checkbox"
                        checked={value.categoryIds.includes(category.id)}
                        onChange={() => toggleCategory(category.id)}
                        className="h-4 w-4"
                      />
                      {category.name}
                    </label>
                  ))}
                  {!categories.length ? (
                    <p className="px-2 py-4 text-center text-[12px] text-admin-muted">No categories yet.</p>
                  ) : null}
                </div>
                {fieldError(form, "categoryIds") ? <p className="admin-error">{fieldError(form, "categoryIds")}</p> : null}
              </div>
            ) : null}

            {value.scope === "products" ? (
              <div className="mt-3">
                <ProductPicker
                  value={value.productIds}
                  onChange={(productIds) => setValue({ ...value, productIds })}
                  initialOptions={productOptions}
                  max={500}
                  label="Eligible products"
                  hint="Only these products count toward the coupon discount."
                />
                {fieldError(form, "productIds") ? <p className="admin-error">{fieldError(form, "productIds")}</p> : null}
              </div>
            ) : null}
          </FormSection>

          <FormSection title="Schedule" description="Optional window when the coupon can be redeemed.">
            <FieldGrid>
              <Field label="Starts at" htmlFor="coupon-starts" error={fieldError(form, "startsAt")}>
                <input
                  id="coupon-starts"
                  type="datetime-local"
                  className="admin-field"
                  value={value.startsAt}
                  onChange={(event) => setValue({ ...value, startsAt: event.target.value })}
                />
              </Field>
              <Field label="Ends at" htmlFor="coupon-ends" error={fieldError(form, "endsAt")}>
                <input
                  id="coupon-ends"
                  type="datetime-local"
                  className="admin-field"
                  value={value.endsAt}
                  onChange={(event) => setValue({ ...value, endsAt: event.target.value })}
                />
              </Field>
            </FieldGrid>
            <p className="admin-help">Leave both empty for a coupon that never expires.</p>
          </FormSection>
        </SettingsSectionForm>
      </div>

      <aside className="h-fit space-y-3 xl:sticky xl:top-[84px]">
        <div className="rounded-[8px] border border-admin-line bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">Coupon summary</p>
          <p className="mt-2 font-mono text-[16px] font-semibold uppercase text-ink">{value.code || "CODE"}</p>
          <p className="mt-1 text-[12px] text-admin-muted">
            {value.type === "free_shipping"
              ? "Free shipping"
              : value.type === "percent"
                ? `${value.value}% off`
                : `${value.value.toLocaleString("en-US")} off`}
            {value.minSubtotal ? ` over ${value.minSubtotal.toLocaleString("en-US")}` : ""}
          </p>
          <dl className="mt-3 space-y-1.5 border-t border-admin-line pt-3 text-[11px]">
            <div className="flex justify-between gap-2">
              <dt className="text-admin-muted">Times used</dt>
              <dd className="text-ink">
                {usageCount}
                {value.usageLimit ? ` / ${value.usageLimit}` : ""}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-admin-muted">Per customer</dt>
              <dd className="text-ink">{value.perCustomerLimit}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-admin-muted">Status</dt>
              <dd className="capitalize text-ink">{value.status}</dd>
            </div>
          </dl>
        </div>

        <Link
          href="/admin/discounts/coupons"
          className="inline-flex h-9 w-full items-center justify-center rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
        >
          Back to coupons
        </Link>

        {!isNew ? (
          <div className="rounded-[8px] border border-danger/25 bg-white p-4">
            <p className="text-[12px] font-semibold text-ink">Delete coupon</p>
            <p className="mt-1 text-[11px] leading-5 text-admin-muted">
              The code stops working immediately. Past orders keep their discounts.
            </p>
            <div className="mt-3">
              <ConfirmDialog
                trigger={
                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-danger/30 bg-white px-3 text-[11px] font-medium text-danger hover:bg-danger-pale"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete coupon
                  </button>
                }
                title="Delete this coupon"
                description={`Delete ${value.code || "this coupon"}? Customers will no longer be able to use it.`}
                confirmLabel="Delete"
                pending={deleting}
                onConfirm={() =>
                  startDelete(async () => {
                    if (!value.id) return;
                    const result = await deleteCouponAction({ id: value.id });
                    if (!result.ok) {
                      toast(result.error, "error");
                      return;
                    }
                    toast("Coupon deleted.");
                    router.push("/admin/discounts/coupons");
                    router.refresh();
                  })
                }
              />
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
