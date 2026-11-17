"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import {
  deleteCampaignAction,
  saveCampaignAction,
} from "@/app/(admin)/admin/(dashboard)/discounts/actions";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Field, FieldGrid, FormSection } from "@/components/admin/FormSection";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { SettingsSectionForm, fieldError, useSectionForm } from "@/components/admin/settings/SettingsForm";
import { useToast } from "@/components/admin/ToastProvider";
import { ProductPicker, type ProductOption } from "@/components/admin/content/ProductPicker";
import { getCampaignStatus } from "@/lib/pricing";
import type { CampaignStorefrontInput } from "@/schemas/campaigns";

export type CampaignFormValues = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  startsAt: string;
  endsAt: string;
  discountType: "percent" | "fixed";
  value: number;
  scope: "store" | "categories" | "products";
  categoryIds: string[];
  productIds: string[];
  excludedProductIds: string[];
  priority: number;
  stackWithCoupons: boolean;
  promoCode: string;
  usageLimit: number | null;
  active: boolean;
  notes: string;
  storefront: CampaignStorefrontInput;
};

export type CategoryChoice = { id: string; name: string };

export const EMPTY_STOREFRONT: CampaignStorefrontInput = {
  saleEnabled: true,
  saleHeading: "",
  saleText: "",
  primaryCtaLabel: "",
  primaryCtaHref: "/search",
  secondaryCtaLabel: "",
  secondaryCtaHref: "/search",
  promoEnabled: false,
  promoEyebrow: "",
  promoTitle: "",
  promoDiscountText: "",
  promoImage: "",
  promoHref: "/search",
  bannerEnabled: false,
  bannerEyebrow: "",
  bannerTitle: "",
  bannerSubtitle: "",
  bannerImage: "",
  bannerCtaLabel: "",
  bannerCtaHref: "/search",
  countdownEnabled: false,
};

type Tab = "basics" | "discount" | "storefront" | "schedule";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "basics", label: "Basics" },
  { id: "discount", label: "Discount and scope" },
  { id: "storefront", label: "Storefront content" },
  { id: "schedule", label: "Schedule and notes" },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function toDateTimeLocal(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
  id: string;
}) {
  return (
    <label className="flex items-start gap-2 text-[13px] text-ink" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4"
      />
      <span>
        {label}
        {hint ? <span className="mt-0.5 block text-[11px] text-admin-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

export function CampaignEditor({
  initial,
  categories,
  productOptions,
  excludedOptions,
}: {
  initial: CampaignFormValues;
  categories: CategoryChoice[];
  productOptions: ProductOption[];
  excludedOptions: ProductOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("basics");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [deleting, startDelete] = useTransition();
  const isNew = !initial.id;

  const form = useSectionForm<CampaignFormValues, { id: string }>(initial, async (value) => {
    const result = await saveCampaignAction(value);
    if (result.ok && isNew) router.replace(`/admin/discounts/campaigns/${result.data.id}`);
    return result;
  });
  const { value, setValue } = form;

  const setStorefront = (patch: Partial<CampaignStorefrontInput>) => {
    setValue({ ...value, storefront: { ...value.storefront, ...patch } });
  };

  const status = getCampaignStatus({
    active: value.active,
    startsAt: value.startsAt || new Date(),
    endsAt: value.endsAt || new Date(),
    pausedAt: null,
    endedAt: null,
  });

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
        <div className="mb-4 flex gap-1 overflow-x-auto rounded-[8px] border border-admin-line bg-white p-1">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              aria-current={tab === entry.id ? "page" : undefined}
              className={`shrink-0 rounded-[5px] px-3 py-1.5 text-[12px] font-medium ${
                tab === entry.id ? "bg-navy text-white" : "text-admin-muted hover:bg-tile hover:text-ink"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <SettingsSectionForm form={form} label="Campaign changes are not saved yet.">
          {tab === "basics" ? (
            <>
              <FormSection title="Campaign identity" description="Internal name and the URL used in reports and links.">
                <div className="space-y-4">
                  <FieldGrid>
                    <Field label="Name" htmlFor="campaign-name" error={fieldError(form, "name")}>
                      <input
                        id="campaign-name"
                        className="admin-field"
                        value={value.name}
                        onChange={(event) => {
                          const name = event.target.value;
                          setValue({ ...value, name, ...(slugTouched ? {} : { slug: slugify(name) }) });
                        }}
                      />
                    </Field>
                    <Field
                      label="URL slug"
                      htmlFor="campaign-slug"
                      hint="Lowercase letters, numbers and hyphens."
                      error={fieldError(form, "slug")}
                    >
                      <input
                        id="campaign-slug"
                        className="admin-field"
                        value={value.slug}
                        onChange={(event) => {
                          setSlugTouched(true);
                          setValue({ ...value, slug: event.target.value.toLowerCase() });
                        }}
                      />
                    </Field>
                  </FieldGrid>
                  <Field label="Description" htmlFor="campaign-description" error={fieldError(form, "description")}>
                    <textarea
                      id="campaign-description"
                      className="admin-field admin-textarea"
                      value={value.description}
                      onChange={(event) => setValue({ ...value, description: event.target.value })}
                    />
                  </Field>
                  <FieldGrid>
                    <Field label="Priority" htmlFor="campaign-priority" hint="Higher numbers win when campaigns overlap.">
                      <input
                        id="campaign-priority"
                        type="number"
                        min={0}
                        max={999}
                        className="admin-field"
                        value={value.priority}
                        onChange={(event) => setValue({ ...value, priority: Number(event.target.value) })}
                      />
                    </Field>
                    <div className="pt-5">
                      <Toggle
                        id="campaign-active"
                        checked={value.active}
                        onChange={(active) => setValue({ ...value, active })}
                        label="Campaign is active"
                        hint="Turning this off pauses pricing and storefront promotional content immediately."
                      />
                    </div>
                  </FieldGrid>
                </div>
              </FormSection>

              <FormSection
                title="Promo code"
                description="Optional code customers can enter at checkout. Coupon codes are managed separately."
              >
                <FieldGrid>
                  <Field label="Code" htmlFor="campaign-code" error={fieldError(form, "promoCode")}>
                    <input
                      id="campaign-code"
                      className="admin-field font-mono uppercase"
                      value={value.promoCode}
                      onChange={(event) => setValue({ ...value, promoCode: event.target.value.toUpperCase() })}
                    />
                  </Field>
                  <Field label="Usage limit" htmlFor="campaign-usage-limit" hint="Leave empty for unlimited uses.">
                    <input
                      id="campaign-usage-limit"
                      type="number"
                      min={0}
                      className="admin-field"
                      value={value.usageLimit ?? ""}
                      onChange={(event) =>
                        setValue({ ...value, usageLimit: event.target.value === "" ? null : Number(event.target.value) })
                      }
                    />
                  </Field>
                </FieldGrid>
              </FormSection>
            </>
          ) : null}

          {tab === "discount" ? (
            <>
              <FormSection title="Discount" description="Applied automatically to matching products while the campaign runs.">
                <FieldGrid columns={3}>
                  <Field label="Discount type" htmlFor="campaign-discount-type">
                    <select
                      id="campaign-discount-type"
                      className="admin-field"
                      value={value.discountType}
                      onChange={(event) =>
                        setValue({ ...value, discountType: event.target.value as CampaignFormValues["discountType"] })
                      }
                    >
                      <option value="percent">Percentage</option>
                      <option value="fixed">Fixed amount</option>
                    </select>
                  </Field>
                  <Field
                    label={value.discountType === "percent" ? "Percentage off" : "Amount off"}
                    htmlFor="campaign-value"
                    error={fieldError(form, "value")}
                  >
                    <input
                      id="campaign-value"
                      type="number"
                      min={0}
                      step="0.01"
                      className="admin-field"
                      value={value.value}
                      onChange={(event) => setValue({ ...value, value: Number(event.target.value) })}
                    />
                  </Field>
                  <Field label="Scope" htmlFor="campaign-scope">
                    <select
                      id="campaign-scope"
                      className="admin-field"
                      value={value.scope}
                      onChange={(event) => setValue({ ...value, scope: event.target.value as CampaignFormValues["scope"] })}
                    >
                      <option value="store">Entire store</option>
                      <option value="categories">Selected categories</option>
                      <option value="products">Selected products</option>
                    </select>
                  </Field>
                </FieldGrid>
                <div className="mt-4">
                  <Toggle
                    id="campaign-stack"
                    checked={value.stackWithCoupons}
                    onChange={(stackWithCoupons) => setValue({ ...value, stackWithCoupons })}
                    label="Stack with coupon codes"
                    hint="When off, checkout coupons replace this campaign instead of combining with it."
                  />
                </div>
              </FormSection>

              {value.scope === "categories" ? (
                <FormSection
                  title="Categories"
                  description="Every product in the selected categories receives the discount."
                >
                  <div className="max-h-[320px] space-y-1 overflow-y-auto rounded-[6px] border border-admin-line p-2">
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
                      <p className="px-2 py-4 text-center text-[12px] text-admin-muted">
                        No categories yet. Create categories first.
                      </p>
                    ) : null}
                  </div>
                  {fieldError(form, "categoryIds") ? (
                    <p className="admin-error">{fieldError(form, "categoryIds")}</p>
                  ) : null}
                </FormSection>
              ) : null}

              {value.scope === "products" ? (
                <FormSection title="Products" description="Only the selected products receive the discount.">
                  <ProductPicker
                    value={value.productIds}
                    onChange={(productIds) => setValue({ ...value, productIds })}
                    initialOptions={productOptions}
                    max={500}
                    label="Discounted products"
                    hint="Search by name, slug or tag. The order is not shown to shoppers."
                  />
                  {fieldError(form, "productIds") ? <p className="admin-error">{fieldError(form, "productIds")}</p> : null}
                </FormSection>
              ) : null}

              <FormSection
                title="Excluded products"
                description="Products that never receive this campaign, even when their category or the entire store is selected."
              >
                <ProductPicker
                  value={value.excludedProductIds}
                  onChange={(excludedProductIds) => setValue({ ...value, excludedProductIds })}
                  initialOptions={excludedOptions}
                  max={500}
                  label="Exclusions"
                  hint="Use exclusions for products with protected pricing."
                />
              </FormSection>
            </>
          ) : null}

          {tab === "storefront" ? (
            <>
              <FormSection
                title="Sale strip"
                description="Copy used on the storefront sale strip while this campaign is active."
                aside={
                  <Toggle
                    id="campaign-sale-enabled"
                    checked={value.storefront.saleEnabled}
                    onChange={(saleEnabled) => setStorefront({ saleEnabled })}
                    label="Use campaign copy"
                  />
                }
              >
                <FieldGrid>
                  <Field label="Heading" htmlFor="campaign-sale-heading">
                    <input
                      id="campaign-sale-heading"
                      className="admin-field"
                      value={value.storefront.saleHeading}
                      onChange={(event) => setStorefront({ saleHeading: event.target.value })}
                    />
                  </Field>
                  <Field label="Text" htmlFor="campaign-sale-text">
                    <input
                      id="campaign-sale-text"
                      className="admin-field"
                      value={value.storefront.saleText}
                      onChange={(event) => setStorefront({ saleText: event.target.value })}
                    />
                  </Field>
                  <Field label="Primary button label" htmlFor="campaign-sale-primary-label">
                    <input
                      id="campaign-sale-primary-label"
                      className="admin-field"
                      value={value.storefront.primaryCtaLabel}
                      onChange={(event) => setStorefront({ primaryCtaLabel: event.target.value })}
                    />
                  </Field>
                  <Field label="Primary button link" htmlFor="campaign-sale-primary-href">
                    <input
                      id="campaign-sale-primary-href"
                      className="admin-field"
                      value={value.storefront.primaryCtaHref}
                      onChange={(event) => setStorefront({ primaryCtaHref: event.target.value })}
                    />
                  </Field>
                  <Field label="Secondary button label" htmlFor="campaign-sale-secondary-label">
                    <input
                      id="campaign-sale-secondary-label"
                      className="admin-field"
                      value={value.storefront.secondaryCtaLabel}
                      onChange={(event) => setStorefront({ secondaryCtaLabel: event.target.value })}
                    />
                  </Field>
                  <Field label="Secondary button link" htmlFor="campaign-sale-secondary-href">
                    <input
                      id="campaign-sale-secondary-href"
                      className="admin-field"
                      value={value.storefront.secondaryCtaHref}
                      onChange={(event) => setStorefront({ secondaryCtaHref: event.target.value })}
                    />
                  </Field>
                </FieldGrid>
                <div className="mt-4">
                  <Toggle
                    id="campaign-countdown"
                    checked={value.storefront.countdownEnabled}
                    onChange={(countdownEnabled) => setStorefront({ countdownEnabled })}
                    label="Show a countdown timer"
                    hint="Uses the campaign end time. Automatically disappears when the campaign expires."
                  />
                </div>
              </FormSection>

              <FormSection
                title="Promo card"
                description="Dark card shown beside the newsletter block on the homepage."
                aside={
                  <Toggle
                    id="campaign-promo-enabled"
                    checked={value.storefront.promoEnabled}
                    onChange={(promoEnabled) => setStorefront({ promoEnabled })}
                    label="Show promo card"
                  />
                }
              >
                <FieldGrid>
                  <Field label="Eyebrow" htmlFor="campaign-promo-eyebrow">
                    <input
                      id="campaign-promo-eyebrow"
                      className="admin-field"
                      value={value.storefront.promoEyebrow}
                      onChange={(event) => setStorefront({ promoEyebrow: event.target.value })}
                    />
                  </Field>
                  <Field label="Title" htmlFor="campaign-promo-title">
                    <input
                      id="campaign-promo-title"
                      className="admin-field"
                      value={value.storefront.promoTitle}
                      onChange={(event) => setStorefront({ promoTitle: event.target.value })}
                    />
                  </Field>
                  <Field label="Discount text" htmlFor="campaign-promo-discount">
                    <input
                      id="campaign-promo-discount"
                      className="admin-field"
                      value={value.storefront.promoDiscountText}
                      onChange={(event) => setStorefront({ promoDiscountText: event.target.value })}
                    />
                  </Field>
                  <Field label="Link" htmlFor="campaign-promo-href">
                    <input
                      id="campaign-promo-href"
                      className="admin-field"
                      value={value.storefront.promoHref}
                      onChange={(event) => setStorefront({ promoHref: event.target.value })}
                    />
                  </Field>
                </FieldGrid>
                <div className="mt-3">
                  <ImagePicker
                    label="Promo image"
                    value={value.storefront.promoImage}
                    onChange={(promoImage) => setStorefront({ promoImage })}
                  />
                </div>
              </FormSection>

              <FormSection
                title="Wide banner"
                description="Optional banner used by campaign-aware storefront blocks."
                aside={
                  <Toggle
                    id="campaign-banner-enabled"
                    checked={value.storefront.bannerEnabled}
                    onChange={(bannerEnabled) => setStorefront({ bannerEnabled })}
                    label="Show banner"
                  />
                }
              >
                <FieldGrid>
                  <Field label="Eyebrow" htmlFor="campaign-banner-eyebrow">
                    <input
                      id="campaign-banner-eyebrow"
                      className="admin-field"
                      value={value.storefront.bannerEyebrow}
                      onChange={(event) => setStorefront({ bannerEyebrow: event.target.value })}
                    />
                  </Field>
                  <Field label="Title" htmlFor="campaign-banner-title">
                    <input
                      id="campaign-banner-title"
                      className="admin-field"
                      value={value.storefront.bannerTitle}
                      onChange={(event) => setStorefront({ bannerTitle: event.target.value })}
                    />
                  </Field>
                  <Field label="Subtitle" htmlFor="campaign-banner-subtitle">
                    <input
                      id="campaign-banner-subtitle"
                      className="admin-field"
                      value={value.storefront.bannerSubtitle}
                      onChange={(event) => setStorefront({ bannerSubtitle: event.target.value })}
                    />
                  </Field>
                  <Field label="Button label" htmlFor="campaign-banner-cta-label">
                    <input
                      id="campaign-banner-cta-label"
                      className="admin-field"
                      value={value.storefront.bannerCtaLabel}
                      onChange={(event) => setStorefront({ bannerCtaLabel: event.target.value })}
                    />
                  </Field>
                  <Field label="Button link" htmlFor="campaign-banner-cta-href">
                    <input
                      id="campaign-banner-cta-href"
                      className="admin-field"
                      value={value.storefront.bannerCtaHref}
                      onChange={(event) => setStorefront({ bannerCtaHref: event.target.value })}
                    />
                  </Field>
                </FieldGrid>
                <div className="mt-3">
                  <ImagePicker
                    label="Banner image"
                    value={value.storefront.bannerImage}
                    onChange={(bannerImage) => setStorefront({ bannerImage })}
                  />
                </div>
              </FormSection>
            </>
          ) : null}

          {tab === "schedule" ? (
            <>
              <FormSection title="Schedule" description="Discounts apply automatically between these times in the store timezone.">
                <FieldGrid>
                  <Field label="Starts at" htmlFor="campaign-starts" error={fieldError(form, "startsAt")}>
                    <input
                      id="campaign-starts"
                      type="datetime-local"
                      className="admin-field"
                      value={value.startsAt}
                      onChange={(event) => setValue({ ...value, startsAt: event.target.value })}
                    />
                  </Field>
                  <Field label="Ends at" htmlFor="campaign-ends" error={fieldError(form, "endsAt")}>
                    <input
                      id="campaign-ends"
                      type="datetime-local"
                      className="admin-field"
                      value={value.endsAt}
                      onChange={(event) => setValue({ ...value, endsAt: event.target.value })}
                    />
                  </Field>
                </FieldGrid>
                <p className="admin-help">
                  Current status: <span className="font-medium text-ink">{status}</span>. Storefront prices and campaign
                  blocks update immediately when a campaign starts, ends or is paused.
                </p>
              </FormSection>

              <FormSection title="Internal notes" description="Visible to staff only.">
                <Field label="Notes" htmlFor="campaign-notes">
                  <textarea
                    id="campaign-notes"
                    className="admin-field admin-textarea min-h-[120px]"
                    value={value.notes}
                    onChange={(event) => setValue({ ...value, notes: event.target.value })}
                  />
                </Field>
              </FormSection>
            </>
          ) : null}
        </SettingsSectionForm>
      </div>

      <aside className="h-fit space-y-3 xl:sticky xl:top-[84px]">
        <div className="rounded-[8px] border border-admin-line bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">Campaign status</p>
          <p className="mt-2 text-[15px] font-semibold capitalize text-ink">{status}</p>
          <dl className="mt-3 space-y-1.5 border-t border-admin-line pt-3 text-[11px]">
            <div className="flex justify-between gap-2">
              <dt className="text-admin-muted">Discount</dt>
              <dd className="text-ink">
                {value.discountType === "percent" ? `${value.value}%` : value.value.toLocaleString("en-US")}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-admin-muted">Scope</dt>
              <dd className="capitalize text-ink">{value.scope}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-admin-muted">Products</dt>
              <dd className="text-ink">
                {value.scope === "store"
                  ? "All"
                  : value.scope === "products"
                    ? value.productIds.length
                    : value.categoryIds.length}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-admin-muted">Exclusions</dt>
              <dd className="text-ink">{value.excludedProductIds.length}</dd>
            </div>
          </dl>
          {!isNew && value.promoCode ? (
            <p className="mt-3 rounded-[4px] bg-tile px-2 py-1.5 text-center font-mono text-[12px] uppercase text-ink">
              {value.promoCode}
            </p>
          ) : null}
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line px-3 text-[11px] font-medium text-ink hover:bg-tile"
          >
            Preview storefront
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <Link
          href="/admin/discounts/campaigns"
          className="inline-flex h-9 w-full items-center justify-center rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
        >
          Back to campaigns
        </Link>

        {!isNew ? (
          <div className="rounded-[8px] border border-danger/25 bg-white p-4">
            <p className="text-[12px] font-semibold text-ink">Delete campaign</p>
            <p className="mt-1 text-[11px] leading-5 text-admin-muted">
              Removing a campaign stops its discounts immediately. Order history keeps the prices customers paid.
            </p>
            <div className="mt-3">
              <ConfirmDialog
                trigger={
                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-danger/30 bg-white px-3 text-[11px] font-medium text-danger hover:bg-danger-pale"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete campaign
                  </button>
                }
                title="Delete this campaign"
                description={`Delete ${value.name || "this campaign"}? Storefront prices and promotional blocks update immediately.`}
                confirmLabel="Delete"
                pending={deleting}
                onConfirm={() =>
                  startDelete(async () => {
                    if (!value.id) return;
                    const result = await deleteCampaignAction({ id: value.id });
                    if (!result.ok) {
                      toast(result.error, "error");
                      return;
                    }
                    toast("Campaign deleted.");
                    router.push("/admin/discounts/campaigns");
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
