"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ExternalLink, Plus, Trash2 } from "lucide-react";
import { saveProductAction } from "@/app/(admin)/admin/(dashboard)/products/actions";
import { Field, FieldGrid, FormSection } from "@/components/admin/FormSection";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { SettingsSectionForm, fieldError, useSectionForm } from "@/components/admin/settings/SettingsForm";
import { ProductPicker, type ProductOption } from "@/components/admin/content/ProductPicker";
import { BASE_CURRENCY } from "@/lib/calculator";
import type { ProductInput } from "@/schemas/product";

export type ProductFormValues = Omit<ProductInput, "tags" | "highlights"> & {
  id?: string;
  tagsText: string;
  highlightsText: string;
};

export type CategoryOption = { id: string; name: string };

const MIN_IMAGE_SLOTS = 4;

function emptyImageSlots(count: number): ProductFormValues["images"] {
  return Array.from({ length: count }, () => ({ src: "", thumbSrc: null, alt: "" }));
}

export const EMPTY_PRODUCT: ProductFormValues = {
  name: "",
  pageTitle: null,
  slug: "",
  publishStatus: "draft",
  category: "",
  price: 0,
  compareAtPrice: null,
  stock: 0,
  lowStockThreshold: null,
  shortDescription: "",
  description: "",
  detailsIntro: "",
  shippingReturns: "",
  badge: null,
  images: emptyImageSlots(MIN_IMAGE_SLOTS),
  cardTitle: null,
  cardSubtitle: null,
  seoTitle: "",
  seoDescription: "",
  noindex: false,
  brand: "",
  gtin: "",
  mpn: "",
  featuredOrder: null,
  bestSellerOrder: null,
  options: { colors: [], sizes: [] },
  variants: [],
  features: [],
  specs: [],
  detailBanner: null,
  sizeGuide: null,
  relatedProductIds: [],
  tagsText: "",
  highlightsText: "",
};

type Tab = "basics" | "media" | "details" | "variants" | "related" | "seo";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "basics", label: "Basics" },
  { id: "media", label: "Media" },
  { id: "details", label: "Details" },
  { id: "variants", label: "Options and variants" },
  { id: "related", label: "Related products" },
  { id: "seo", label: "SEO" },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function seoCounterClass(length: number, min: number, max: number) {
  if (length === 0) return "text-admin-muted";
  if (length < min) return "text-warning";
  if (length > max) return "text-danger";
  return "text-success";
}

function lines(value: string) {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function ProductEditor({
  initial,
  categories,
  relatedOptions,
}: {
  initial: ProductFormValues;
  categories: CategoryOption[];
  relatedOptions: ProductOption[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("basics");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const isNew = !initial.id;

  const form = useSectionForm<ProductFormValues, { id: string }>(initial, async (value) => {
    const { tagsText, highlightsText, images: imageSlots, ...rest } = value;
    const images = imageSlots
      .map((image) => ({
        src: image.src.trim(),
        thumbSrc: image.thumbSrc?.trim() || null,
        alt: image.alt.trim(),
      }))
      .filter((image) => image.src);
    const result = await saveProductAction({
      ...rest,
      images,
      tags: tagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      highlights: lines(highlightsText),
    });
    if (result.ok && isNew) router.replace(`/admin/products/${result.data.id}`);
    return result;
  });
  const { value, setValue } = form;

  const schemaPreview = useMemo(() => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
    const url = `${siteUrl}/product/${value.slug || "product"}`;
    const categoryName = categories.find((category) => category.id === value.category)?.name;
    const hasVariants =
      value.variants.length > 1 || value.options.colors.length > 0 || value.options.sizes.length > 0;
    const offerFor = (price: number, stock: number) => ({
      "@type": "Offer",
      url,
      priceCurrency: BASE_CURRENCY,
      price: price.toFixed(2),
      availability:
        stock <= 0
          ? "https://schema.org/OutOfStock"
          : stock <= 5
            ? "https://schema.org/LimitedAvailability"
            : "https://schema.org/InStock",
    });
    const base = {
      "@context": "https://schema.org",
      name: value.name || "Product name",
      ...(value.shortDescription ? { description: value.shortDescription } : {}),
      ...(value.images[0]?.src ? { image: [value.images[0].src] } : {}),
      ...(value.brand ? { brand: { "@type": "Brand", name: value.brand } } : {}),
      ...(value.gtin ? { gtin: value.gtin } : {}),
      ...(value.mpn ? { mpn: value.mpn } : {}),
      ...(categoryName ? { category: categoryName } : {}),
      url,
    };

    if (!hasVariants) {
      return {
        ...base,
        "@type": "Product",
        ...(value.variants[0]?.sku ? { sku: value.variants[0].sku } : {}),
        offers: offerFor(value.price, value.stock),
      };
    }

    return {
      ...base,
      "@type": "ProductGroup",
      productGroupID: "product-id",
      ...(value.options.colors.length || value.options.sizes.length
        ? {
            variesBy: [
              ...(value.options.colors.length ? ["color"] : []),
              ...(value.options.sizes.length ? ["size"] : []),
            ],
          }
        : {}),
      hasVariant: value.variants.map((variant) => ({
        "@type": "Product",
        name: value.name || "Product name",
        sku: variant.sku || "SKU",
        ...(variant.color ? { color: variant.color } : {}),
        ...(variant.size ? { size: variant.size } : {}),
        isVariantOf: { "@type": "ProductGroup", "@id": `${url}#product-group` },
        offers: offerFor(variant.price, variant.stock),
      })),
    };
  }, [categories, value]);

  const updateImage = (index: number, patch: Partial<ProductFormValues["images"][number]>) => {
    setValue({
      ...value,
      images: value.images.map((image, position) => (position === index ? { ...image, ...patch } : image)),
    });
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= value.images.length) return;
    const next = [...value.images];
    [next[index], next[target]] = [next[target], next[index]];
    setValue({ ...value, images: next });
  };

  const distributeUploadedImages = (startIndex: number, urls: string[]) => {
    if (!urls.length) return;
    setValue((current) => {
      const images = current.images.map((image) => ({ ...image }));
      let cursor = 0;

      if (images[startIndex]) {
        images[startIndex] = { ...images[startIndex], src: urls[cursor++], thumbSrc: null };
      }

      for (let position = 0; position < images.length && cursor < urls.length; position += 1) {
        if (!images[position].src.trim()) {
          images[position] = { ...images[position], src: urls[cursor++] };
        }
      }

      while (cursor < urls.length && images.length < 12) {
        images.push({ src: urls[cursor++], thumbSrc: null, alt: "" });
      }

      return { ...current, images };
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

        <SettingsSectionForm
          form={form}
          label={
            tab === "media" && !value.images.some((image) => image.src)
              ? "Add at least one product image before saving."
              : "Product changes are not saved yet."
          }
        >
          {tab === "basics" ? (
            <>
              <FormSection title="Product identity">
                <div className="space-y-4">
                  <FieldGrid>
                    <Field label="Name" htmlFor="product-name" error={fieldError(form, "name")}>
                      <input
                        id="product-name"
                        className="admin-field"
                        value={value.name}
                        onChange={(event) => {
                          const name = event.target.value;
                          setValue({ ...value, name, ...(slugTouched ? {} : { slug: slugify(name) }) });
                        }}
                      />
                    </Field>
                    <Field label="Page title" htmlFor="product-page-title" hint="Optional browser title. Defaults to the name.">
                      <input
                        id="product-page-title"
                        className="admin-field"
                        value={value.pageTitle ?? ""}
                        onChange={(event) => setValue({ ...value, pageTitle: event.target.value || null })}
                      />
                    </Field>
                    <Field
                      label="URL slug"
                      htmlFor="product-slug"
                      hint={`/product/${value.slug || "…"}`}
                      error={fieldError(form, "slug")}
                    >
                      <input
                        id="product-slug"
                        className="admin-field"
                        value={value.slug}
                        onChange={(event) => {
                          setSlugTouched(true);
                          setValue({ ...value, slug: event.target.value.toLowerCase() });
                        }}
                      />
                      {initial.id && initial.slug !== value.slug ? (
                        <p className="admin-help text-warning">
                          The old address /product/{initial.slug} will redirect here with a 308
                          response, so existing links keep working.
                        </p>
                      ) : null}
                    </Field>
                    <Field label="Category" htmlFor="product-category" error={fieldError(form, "category")}>
                      <select
                        id="product-category"
                        className="admin-field"
                        value={value.category}
                        onChange={(event) => setValue({ ...value, category: event.target.value })}
                      >
                        <option value="">Choose a category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </FieldGrid>
                  <Field label="Tags" htmlFor="product-tags" hint="Comma-separated keywords used by search and filters.">
                    <input
                      id="product-tags"
                      className="admin-field"
                      placeholder="solar, inverter, home"
                      value={value.tagsText}
                      onChange={(event) => setValue({ ...value, tagsText: event.target.value })}
                    />
                  </Field>
                  <FieldGrid columns={3}>
                    <Field label="Publish status" htmlFor="product-publish">
                      <select
                        id="product-publish"
                        className="admin-field"
                        value={value.publishStatus}
                        onChange={(event) =>
                          setValue({ ...value, publishStatus: event.target.value as ProductFormValues["publishStatus"] })
                        }
                      >
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="archived">Archived</option>
                      </select>
                    </Field>
                    <Field label="Badge" htmlFor="product-badge">
                      <select
                        id="product-badge"
                        className="admin-field"
                        value={value.badge ?? ""}
                        onChange={(event) =>
                          setValue({ ...value, badge: (event.target.value || null) as ProductFormValues["badge"] })
                        }
                      >
                        <option value="">No badge</option>
                        <option value="top">Top</option>
                        <option value="sale">Sale</option>
                      </select>
                    </Field>
                    <Field label="Low stock threshold" htmlFor="product-low-stock" hint="Defaults to 5 when empty.">
                      <input
                        id="product-low-stock"
                        type="number"
                        min={0}
                        className="admin-field"
                        value={value.lowStockThreshold ?? ""}
                        onChange={(event) =>
                          setValue({
                            ...value,
                            lowStockThreshold: event.target.value === "" ? null : Number(event.target.value),
                          })
                        }
                      />
                    </Field>
                  </FieldGrid>
                </div>
              </FormSection>

              <FormSection title="Price and stock">
                <FieldGrid columns={3}>
                  <Field label="Price" htmlFor="product-price" error={fieldError(form, "price")}>
                    <input
                      id="product-price"
                      type="number"
                      min={0}
                      step="0.01"
                      className="admin-field"
                      value={value.price}
                      onChange={(event) => setValue({ ...value, price: Number(event.target.value) })}
                    />
                  </Field>
                  <Field label="Compare-at price" htmlFor="product-compare" hint="Shown as a strikethrough original price.">
                    <input
                      id="product-compare"
                      type="number"
                      min={0}
                      step="0.01"
                      className="admin-field"
                      value={value.compareAtPrice ?? ""}
                      onChange={(event) =>
                        setValue({
                          ...value,
                          compareAtPrice: event.target.value === "" ? null : Number(event.target.value),
                        })
                      }
                    />
                  </Field>
                  <Field label="Stock quantity" htmlFor="product-stock">
                    <input
                      id="product-stock"
                      type="number"
                      min={0}
                      step={1}
                      className="admin-field"
                      value={value.stock}
                      onChange={(event) => setValue({ ...value, stock: Number(event.target.value) })}
                    />
                  </Field>
                </FieldGrid>
                <FieldGrid>
                  <Field label="Featured order" htmlFor="product-featured-order" hint="Blank hides it from featured ordering.">
                    <input
                      id="product-featured-order"
                      type="number"
                      min={0}
                      className="admin-field"
                      value={value.featuredOrder ?? ""}
                      onChange={(event) =>
                        setValue({
                          ...value,
                          featuredOrder: event.target.value === "" ? null : Number(event.target.value),
                        })
                      }
                    />
                  </Field>
                  <Field label="Best seller order" htmlFor="product-best-order" hint="Blank hides it from best-seller ordering.">
                    <input
                      id="product-best-order"
                      type="number"
                      min={0}
                      className="admin-field"
                      value={value.bestSellerOrder ?? ""}
                      onChange={(event) =>
                        setValue({
                          ...value,
                          bestSellerOrder: event.target.value === "" ? null : Number(event.target.value),
                        })
                      }
                    />
                  </Field>
                </FieldGrid>
              </FormSection>
            </>
          ) : null}

          {tab === "media" ? (
            <>
              <FormSection
                title="Product images"
                description="The first image is the card and product page hero. Upload from your device, take a photo now, or choose from the library. Up to twelve images."
                fullWidth
              >
                <div className="space-y-3">
                  {value.images.map((image, index) => (
                    <div key={index} className="rounded-[6px] border border-admin-line p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-semibold text-ink">
                          {index === 0 ? "Primary image" : `Image ${index + 1}`}
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveImage(index, -1)}
                            disabled={index === 0}
                            className="rounded-[4px] p-1 text-admin-muted hover:bg-tile hover:text-ink disabled:opacity-30"
                            aria-label={`Move image ${index + 1} up`}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveImage(index, 1)}
                            disabled={index === value.images.length - 1}
                            className="rounded-[4px] p-1 text-admin-muted hover:bg-tile hover:text-ink disabled:opacity-30"
                            aria-label={`Move image ${index + 1} down`}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setValue({ ...value, images: value.images.filter((_, position) => position !== index) })
                            }
                            disabled={value.images.length === 1}
                            className="rounded-[4px] p-1 text-admin-muted hover:bg-danger-pale hover:text-danger disabled:opacity-30"
                            aria-label={`Remove image ${index + 1}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                        <ImagePicker
                          label="Source"
                          value={image.src}
                          onChange={(src) => updateImage(index, { src })}
                          folder="products"
                          allowMultiple
                          onUploaded={(urls) => distributeUploadedImages(index, urls)}
                          hint={index === 0 ? "Used on product cards." : undefined}
                        />
                        <div className="space-y-3">
                          <Field label="Alt text" htmlFor={`product-image-alt-${index}`}>
                            <input
                              id={`product-image-alt-${index}`}
                              className="admin-field"
                              value={image.alt}
                              placeholder="Solar panel mounted on a roof"
                              onChange={(event) => updateImage(index, { alt: event.target.value })}
                            />
                          </Field>
                          <Field label="Thumbnail URL" htmlFor={`product-image-thumb-${index}`} hint="Optional. Defaults to the source image.">
                            <input
                              id={`product-image-thumb-${index}`}
                              className="admin-field"
                              value={image.thumbSrc ?? ""}
                              onChange={(event) => updateImage(index, { thumbSrc: event.target.value || null })}
                            />
                          </Field>
                        </div>
                      </div>
                      {fieldError(form, `images.${index}.src`) ? (
                        <p className="admin-error">{fieldError(form, `images.${index}.src`)}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  {value.images.length < 12 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setValue({ ...value, images: [...value.images, { src: "", thumbSrc: null, alt: "" }] })
                      }
                      className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add another image
                    </button>
                  ) : (
                    <p className="text-[12px] text-admin-muted">Maximum of 12 images reached.</p>
                  )}
                  <p className="text-[11px] text-admin-muted">
                    {value.images.filter((image) => image.src.trim()).length} of 12 used
                  </p>
                </div>
                {fieldError(form, "images") ? <p className="admin-error">{fieldError(form, "images")}</p> : null}
              </FormSection>

              <FormSection title="Card copy" description="Optional card-specific text used instead of the product name.">
                <FieldGrid>
                  <Field label="Card title" htmlFor="product-card-title">
                    <input
                      id="product-card-title"
                      className="admin-field"
                      value={value.cardTitle ?? ""}
                      onChange={(event) => setValue({ ...value, cardTitle: event.target.value || null })}
                    />
                  </Field>
                  <Field label="Card subtitle" htmlFor="product-card-subtitle">
                    <input
                      id="product-card-subtitle"
                      className="admin-field"
                      value={value.cardSubtitle ?? ""}
                      onChange={(event) => setValue({ ...value, cardSubtitle: event.target.value || null })}
                    />
                  </Field>
                </FieldGrid>
              </FormSection>
            </>
          ) : null}

          {tab === "details" ? (
            <>
              <FormSection title="Descriptions">
                <div className="space-y-4">
                  <Field label="Short description" htmlFor="product-short" error={fieldError(form, "shortDescription")}>
                    <textarea
                      id="product-short"
                      className="admin-field admin-textarea min-h-[80px]"
                      value={value.shortDescription}
                      onChange={(event) => setValue({ ...value, shortDescription: event.target.value })}
                    />
                  </Field>
                  <RichTextEditor
                    label="Full description"
                    id="product-description"
                    value={value.description}
                    onChange={(description) => setValue({ ...value, description })}
                  />
                  <Field label="Details introduction" htmlFor="product-details-intro" hint="Opening paragraph on the details tab.">
                    <textarea
                      id="product-details-intro"
                      className="admin-field admin-textarea min-h-[80px]"
                      value={value.detailsIntro}
                      onChange={(event) => setValue({ ...value, detailsIntro: event.target.value })}
                    />
                  </Field>
                  <Field label="Shipping and returns" htmlFor="product-shipping">
                    <textarea
                      id="product-shipping"
                      className="admin-field admin-textarea min-h-[80px]"
                      value={value.shippingReturns}
                      onChange={(event) => setValue({ ...value, shippingReturns: event.target.value })}
                    />
                  </Field>
                  <Field label="Highlights" htmlFor="product-highlights" hint="One highlight per line.">
                    <textarea
                      id="product-highlights"
                      className="admin-field admin-textarea"
                      value={value.highlightsText}
                      onChange={(event) => setValue({ ...value, highlightsText: event.target.value })}
                    />
                  </Field>
                </div>
              </FormSection>

              <FormSection
                title="Features"
                description="Icon and label pairs shown in the product details."
                aside={
                  value.features.length < 8 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setValue({ ...value, features: [...value.features, { icon: "shield", label: "" }] })
                      }
                      className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add feature
                    </button>
                  ) : null
                }
              >
                <div className="space-y-2">
                  {value.features.map((feature, index) => (
                    <div key={index} className="grid gap-2 sm:grid-cols-[140px_1fr_36px]">
                      <input
                        className="admin-field"
                        aria-label={`Feature ${index + 1} icon`}
                        placeholder="shield"
                        value={feature.icon}
                        onChange={(event) =>
                          setValue({
                            ...value,
                            features: value.features.map((row, position) =>
                              position === index ? { ...row, icon: event.target.value } : row,
                            ),
                          })
                        }
                      />
                      <input
                        className="admin-field"
                        aria-label={`Feature ${index + 1} label`}
                        placeholder="Five year warranty"
                        value={feature.label}
                        onChange={(event) =>
                          setValue({
                            ...value,
                            features: value.features.map((row, position) =>
                              position === index ? { ...row, label: event.target.value } : row,
                            ),
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setValue({ ...value, features: value.features.filter((_, position) => position !== index) })
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-admin-line text-admin-muted hover:border-danger/40 hover:text-danger"
                        aria-label={`Remove feature ${index + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </FormSection>

              <FormSection
                title="Specifications"
                description="Label and value rows shown in the specifications table."
                aside={
                  value.specs.length < 30 ? (
                    <button
                      type="button"
                      onClick={() => setValue({ ...value, specs: [...value.specs, { label: "", value: "" }] })}
                      className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add row
                    </button>
                  ) : null
                }
              >
                <div className="space-y-2">
                  {value.specs.map((spec, index) => (
                    <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_36px]">
                      <input
                        className="admin-field"
                        aria-label={`Specification ${index + 1} label`}
                        placeholder="Power output"
                        value={spec.label}
                        onChange={(event) =>
                          setValue({
                            ...value,
                            specs: value.specs.map((row, position) =>
                              position === index ? { ...row, label: event.target.value } : row,
                            ),
                          })
                        }
                      />
                      <input
                        className="admin-field"
                        aria-label={`Specification ${index + 1} value`}
                        placeholder="450 W"
                        value={spec.value}
                        onChange={(event) =>
                          setValue({
                            ...value,
                            specs: value.specs.map((row, position) =>
                              position === index ? { ...row, value: event.target.value } : row,
                            ),
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setValue({ ...value, specs: value.specs.filter((_, position) => position !== index) })
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-admin-line text-admin-muted hover:border-danger/40 hover:text-danger"
                        aria-label={`Remove specification ${index + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </FormSection>

              <FormSection
                title="Detail banner"
                description="Optional promotional banner inside the product details."
                aside={
                  <label className="flex items-center gap-2 text-[12px] text-ink">
                    <input
                      type="checkbox"
                      checked={Boolean(value.detailBanner)}
                      onChange={(event) =>
                        setValue({
                          ...value,
                          detailBanner: event.target.checked
                            ? { image: "", icon: "sun", lines: [] }
                            : null,
                        })
                      }
                    />
                    Enable
                  </label>
                }
              >
                {value.detailBanner ? (
                  <div className="space-y-3">
                    <ImagePicker
                      label="Banner image"
                      value={value.detailBanner.image}
                      onChange={(image) =>
                        setValue({ ...value, detailBanner: { ...value.detailBanner!, image } })
                      }
                    />
                    <FieldGrid>
                      <Field label="Icon" htmlFor="product-banner-icon">
                        <input
                          id="product-banner-icon"
                          className="admin-field"
                          value={value.detailBanner.icon}
                          onChange={(event) =>
                            setValue({ ...value, detailBanner: { ...value.detailBanner!, icon: event.target.value } })
                          }
                        />
                      </Field>
                      <Field label="Lines" htmlFor="product-banner-lines" hint="One line per row.">
                        <textarea
                          id="product-banner-lines"
                          className="admin-field admin-textarea"
                          value={value.detailBanner.lines.join("\n")}
                          onChange={(event) =>
                            setValue({
                              ...value,
                              detailBanner: { ...value.detailBanner!, lines: lines(event.target.value) },
                            })
                          }
                        />
                      </Field>
                    </FieldGrid>
                  </div>
                ) : (
                  <p className="text-[12px] text-admin-muted">No detail banner.</p>
                )}
              </FormSection>

              <FormSection
                title="Size guide"
                description="Optional table for sizing details."
                aside={
                  <label className="flex items-center gap-2 text-[12px] text-ink">
                    <input
                      type="checkbox"
                      checked={Boolean(value.sizeGuide)}
                      onChange={(event) =>
                        setValue({
                          ...value,
                          sizeGuide: event.target.checked ? { title: "", intro: "", rows: [] } : null,
                        })
                      }
                    />
                    Enable
                  </label>
                }
              >
                {value.sizeGuide ? (
                  <div className="space-y-3">
                    <FieldGrid>
                      <Field label="Title" htmlFor="product-size-title">
                        <input
                          id="product-size-title"
                          className="admin-field"
                          value={value.sizeGuide.title}
                          onChange={(event) =>
                            setValue({ ...value, sizeGuide: { ...value.sizeGuide!, title: event.target.value } })
                          }
                        />
                      </Field>
                      <Field label="Introduction" htmlFor="product-size-intro">
                        <input
                          id="product-size-intro"
                          className="admin-field"
                          value={value.sizeGuide.intro}
                          onChange={(event) =>
                            setValue({ ...value, sizeGuide: { ...value.sizeGuide!, intro: event.target.value } })
                          }
                        />
                      </Field>
                    </FieldGrid>
                    <div className="space-y-2">
                      {value.sizeGuide.rows.map((row, index) => (
                        <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_36px]">
                          <input
                            className="admin-field"
                            aria-label={`Size guide ${index + 1} label`}
                            placeholder="Panel width"
                            value={row.label}
                            onChange={(event) =>
                              setValue({
                                ...value,
                                sizeGuide: {
                                  ...value.sizeGuide!,
                                  rows: value.sizeGuide!.rows.map((entry, position) =>
                                    position === index ? { ...entry, label: event.target.value } : entry,
                                  ),
                                },
                              })
                            }
                          />
                          <input
                            className="admin-field"
                            aria-label={`Size guide ${index + 1} value`}
                            placeholder="1.2 m"
                            value={row.value}
                            onChange={(event) =>
                              setValue({
                                ...value,
                                sizeGuide: {
                                  ...value.sizeGuide!,
                                  rows: value.sizeGuide!.rows.map((entry, position) =>
                                    position === index ? { ...entry, value: event.target.value } : entry,
                                  ),
                                },
                              })
                            }
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setValue({
                                ...value,
                                sizeGuide: {
                                  ...value.sizeGuide!,
                                  rows: value.sizeGuide!.rows.filter((_, position) => position !== index),
                                },
                              })
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-admin-line text-admin-muted hover:border-danger/40 hover:text-danger"
                            aria-label={`Remove size guide row ${index + 1}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setValue({
                            ...value,
                            sizeGuide: {
                              ...value.sizeGuide!,
                              rows: [...value.sizeGuide!.rows, { label: "", value: "" }],
                            },
                          })
                        }
                        className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add row
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[12px] text-admin-muted">No size guide.</p>
                )}
              </FormSection>
            </>
          ) : null}

          {tab === "variants" ? (
            <>
              <FormSection
                title="Colour options"
                description="Colours offered on the product page. Variants can reference their value."
                aside={
                  value.options.colors.length < 20 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setValue({
                          ...value,
                          options: {
                            ...value.options,
                            colors: [...value.options.colors, { value: "", label: "", hex: "#000000" }],
                          },
                        })
                      }
                      className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add colour
                    </button>
                  ) : null
                }
              >
                <div className="space-y-2">
                  {value.options.colors.map((color, index) => (
                    <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_100px_36px]">
                      <input
                        className="admin-field"
                        aria-label={`Colour ${index + 1} value`}
                        placeholder="black"
                        value={color.value}
                        onChange={(event) =>
                          setValue({
                            ...value,
                            options: {
                              ...value.options,
                              colors: value.options.colors.map((entry, position) =>
                                position === index ? { ...entry, value: event.target.value } : entry,
                              ),
                            },
                          })
                        }
                      />
                      <input
                        className="admin-field"
                        aria-label={`Colour ${index + 1} label`}
                        placeholder="Black"
                        value={color.label}
                        onChange={(event) =>
                          setValue({
                            ...value,
                            options: {
                              ...value.options,
                              colors: value.options.colors.map((entry, position) =>
                                position === index ? { ...entry, label: event.target.value } : entry,
                              ),
                            },
                          })
                        }
                      />
                      <input
                        className="admin-field h-9 p-1"
                        type="color"
                        aria-label={`Colour ${index + 1} hex`}
                        value={color.hex}
                        onChange={(event) =>
                          setValue({
                            ...value,
                            options: {
                              ...value.options,
                              colors: value.options.colors.map((entry, position) =>
                                position === index ? { ...entry, hex: event.target.value } : entry,
                              ),
                            },
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setValue({
                            ...value,
                            options: {
                              ...value.options,
                              colors: value.options.colors.filter((_, position) => position !== index),
                            },
                          })
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-admin-line text-admin-muted hover:border-danger/40 hover:text-danger"
                        aria-label={`Remove colour ${index + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </FormSection>

              <FormSection
                title="Size options"
                description="Sizes offered on the product page."
                aside={
                  value.options.sizes.length < 20 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setValue({
                          ...value,
                          options: { ...value.options, sizes: [...value.options.sizes, { value: "", label: "" }] },
                        })
                      }
                      className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add size
                    </button>
                  ) : null
                }
              >
                <div className="space-y-2">
                  {value.options.sizes.map((size, index) => (
                    <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_36px]">
                      <input
                        className="admin-field"
                        aria-label={`Size ${index + 1} value`}
                        placeholder="m"
                        value={size.value}
                        onChange={(event) =>
                          setValue({
                            ...value,
                            options: {
                              ...value.options,
                              sizes: value.options.sizes.map((entry, position) =>
                                position === index ? { ...entry, value: event.target.value } : entry,
                              ),
                            },
                          })
                        }
                      />
                      <input
                        className="admin-field"
                        aria-label={`Size ${index + 1} label`}
                        placeholder="Medium"
                        value={size.label}
                        onChange={(event) =>
                          setValue({
                            ...value,
                            options: {
                              ...value.options,
                              sizes: value.options.sizes.map((entry, position) =>
                                position === index ? { ...entry, label: event.target.value } : entry,
                              ),
                            },
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setValue({
                            ...value,
                            options: {
                              ...value.options,
                              sizes: value.options.sizes.filter((_, position) => position !== index),
                            },
                          })
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-admin-line text-admin-muted hover:border-danger/40 hover:text-danger"
                        aria-label={`Remove size ${index + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </FormSection>

              <FormSection
                title="Variants"
                description="Stock and pricing per combination. Leave empty to sell the base product only."
                aside={
                  value.variants.length < 100 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setValue({
                          ...value,
                          variants: [
                            ...value.variants,
                            {
                              sku: "",
                              color: null,
                              size: null,
                              price: value.price,
                              compareAtPrice: null,
                              stock: 0,
                              isDefault: value.variants.length === 0,
                            },
                          ],
                        })
                      }
                      className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add variant
                    </button>
                  ) : null
                }
              >
                <div className="space-y-2">
                  {value.variants.map((variant, index) => (
                    <div key={index} className="grid gap-2 rounded-[6px] border border-admin-line p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_110px_110px_90px_70px_36px]">
                      <input
                        className="admin-field"
                        aria-label={`Variant ${index + 1} SKU`}
                        placeholder="SKU"
                        value={variant.sku}
                        onChange={(event) =>
                          setValue({
                            ...value,
                            variants: value.variants.map((entry, position) =>
                              position === index ? { ...entry, sku: event.target.value } : entry,
                            ),
                          })
                        }
                      />
                      <input
                        className="admin-field"
                        aria-label={`Variant ${index + 1} colour`}
                        placeholder="Colour value"
                        value={variant.color ?? ""}
                        onChange={(event) =>
                          setValue({
                            ...value,
                            variants: value.variants.map((entry, position) =>
                              position === index ? { ...entry, color: event.target.value || null } : entry,
                            ),
                          })
                        }
                      />
                      <input
                        className="admin-field"
                        aria-label={`Variant ${index + 1} size`}
                        placeholder="Size value"
                        value={variant.size ?? ""}
                        onChange={(event) =>
                          setValue({
                            ...value,
                            variants: value.variants.map((entry, position) =>
                              position === index ? { ...entry, size: event.target.value || null } : entry,
                            ),
                          })
                        }
                      />
                      <input
                        className="admin-field"
                        type="number"
                        min={0}
                        step="0.01"
                        aria-label={`Variant ${index + 1} price`}
                        placeholder="Price"
                        value={variant.price}
                        onChange={(event) =>
                          setValue({
                            ...value,
                            variants: value.variants.map((entry, position) =>
                              position === index ? { ...entry, price: Number(event.target.value) } : entry,
                            ),
                          })
                        }
                      />
                      <input
                        className="admin-field"
                        type="number"
                        min={0}
                        step="0.01"
                        aria-label={`Variant ${index + 1} compare-at price`}
                        placeholder="Compare"
                        value={variant.compareAtPrice ?? ""}
                        onChange={(event) =>
                          setValue({
                            ...value,
                            variants: value.variants.map((entry, position) =>
                              position === index
                                ? { ...entry, compareAtPrice: event.target.value === "" ? null : Number(event.target.value) }
                                : entry,
                            ),
                          })
                        }
                      />
                      <input
                        className="admin-field"
                        type="number"
                        min={0}
                        aria-label={`Variant ${index + 1} stock`}
                        placeholder="Stock"
                        value={variant.stock}
                        onChange={(event) =>
                          setValue({
                            ...value,
                            variants: value.variants.map((entry, position) =>
                              position === index ? { ...entry, stock: Number(event.target.value) } : entry,
                            ),
                          })
                        }
                      />
                      <label className="flex items-center gap-1.5 text-[11px] text-admin-muted">
                        <input
                          type="checkbox"
                          checked={variant.isDefault}
                          onChange={(event) =>
                            setValue({
                              ...value,
                              variants: value.variants.map((entry, position) =>
                                position === index
                                  ? { ...entry, isDefault: event.target.checked }
                                  : event.target.checked
                                    ? { ...entry, isDefault: false }
                                    : entry,
                              ),
                            })
                          }
                        />
                        Default
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setValue({
                            ...value,
                            variants: value.variants.filter((_, position) => position !== index),
                          })
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-admin-line text-admin-muted hover:border-danger/40 hover:text-danger"
                        aria-label={`Remove variant ${index + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {!value.variants.length ? (
                    <p className="rounded-[6px] border border-dashed border-admin-line px-3 py-4 text-center text-[12px] text-admin-muted">
                      No variants. Shoppers buy the base product using the price and stock above.
                    </p>
                  ) : null}
                </div>
              </FormSection>
            </>
          ) : null}

          {tab === "related" ? (
            <FormSection title="Related products" description="Suggested alongside this product on the detail page.">
              <ProductPicker
                value={value.relatedProductIds}
                onChange={(relatedProductIds) => setValue({ ...value, relatedProductIds })}
                initialOptions={relatedOptions}
                max={12}
                label="Related products"
                hint="Only active products are shown on the storefront. Order matters."
              />
            </FormSection>
          ) : null}

          {tab === "seo" ? (
            <>
              <FormSection title="Search engine listing" description="Defaults come from the product name and short description.">
                <div className="space-y-4">
                  <Field label="SEO title" htmlFor="product-seo-title" error={fieldError(form, "seoTitle")}>
                    <input
                      id="product-seo-title"
                      className="admin-field"
                      value={value.seoTitle}
                      onChange={(event) => setValue({ ...value, seoTitle: event.target.value })}
                    />
                    <p className={`admin-help ${seoCounterClass(value.seoTitle.length, 30, 60)}`}>
                      {value.seoTitle.length}/60 characters
                    </p>
                  </Field>
                  <Field label="SEO description" htmlFor="product-seo-description" error={fieldError(form, "seoDescription")}>
                    <textarea
                      id="product-seo-description"
                      className="admin-field admin-textarea"
                      value={value.seoDescription}
                      onChange={(event) => setValue({ ...value, seoDescription: event.target.value })}
                    />
                    <p className={`admin-help ${seoCounterClass(value.seoDescription.length, 70, 160)}`}>
                      {value.seoDescription.length}/160 characters
                    </p>
                  </Field>
                  <div className="rounded-[6px] border border-admin-line bg-white p-4">
                    <p className="text-[12px] text-admin-muted">
                      {process.env.NEXT_PUBLIC_SITE_URL || "https://your-store.example"}/product/
                      {value.slug || "product"}
                    </p>
                    <p className="mt-1 text-[18px] text-brand-deep">
                      {value.seoTitle || value.pageTitle || value.name || "Product title"}
                    </p>
                    <p className="mt-1 text-[12px] leading-5 text-ink">
                      {value.seoDescription || value.shortDescription || "Add a meta description to improve search previews."}
                    </p>
                  </div>
                  <label className="flex items-start gap-2 text-[13px] text-ink">
                    <input
                      type="checkbox"
                      checked={value.noindex}
                      onChange={(event) => setValue({ ...value, noindex: event.target.checked })}
                      className="mt-0.5 h-4 w-4"
                    />
                    <span>
                      Hide from search engines
                      <span className="mt-0.5 block text-[11px] text-admin-muted">
                        Adds noindex and removes the product from the sitemap. It stays available from
                        direct links.
                      </span>
                    </span>
                  </label>
                </div>
              </FormSection>

              <FormSection title="Product identifiers" description="Used in Product structured data and the Google Merchant feed.">
                <FieldGrid columns={3}>
                  <Field label="Brand" htmlFor="product-brand" error={fieldError(form, "brand")}>
                    <input
                      id="product-brand"
                      className="admin-field"
                      value={value.brand}
                      onChange={(event) => setValue({ ...value, brand: event.target.value })}
                    />
                  </Field>
                  <Field
                    label="GTIN"
                    htmlFor="product-gtin"
                    hint="8, 12, 13 or 14 digits."
                    error={fieldError(form, "gtin")}
                  >
                    <input
                      id="product-gtin"
                      className="admin-field"
                      inputMode="numeric"
                      value={value.gtin}
                      onChange={(event) => setValue({ ...value, gtin: event.target.value })}
                    />
                  </Field>
                  <Field label="MPN" htmlFor="product-mpn" error={fieldError(form, "mpn")}>
                    <input
                      id="product-mpn"
                      className="admin-field"
                      value={value.mpn}
                      onChange={(event) => setValue({ ...value, mpn: event.target.value })}
                    />
                  </Field>
                </FieldGrid>
                <p className="mt-3 text-[11px] leading-5 text-admin-muted">
                  When GTIN and MPN are both empty, the feed sends identifier_exists=no instead of
                  inventing an identifier.
                </p>
              </FormSection>

              <FormSection
                title="Structured data preview"
                description="List prices from this form. Live markup also applies campaign prices, shipping, ratings and approved reviews."
              >
                <pre className="max-h-[420px] overflow-auto rounded-[6px] border border-admin-line bg-canvas p-3 text-[11px] leading-5 text-ink">
                  {JSON.stringify(schemaPreview, null, 2)}
                </pre>
              </FormSection>
            </>
          ) : null}
        </SettingsSectionForm>
      </div>

      <aside className="h-fit space-y-3 xl:sticky xl:top-[84px]">
        <div className="rounded-[8px] border border-admin-line bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">Product status</p>
          <p className="mt-2 text-[13px] font-medium text-ink">
            {value.publishStatus === "active" ? "Active" : value.publishStatus === "draft" ? "Draft" : "Archived"}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-admin-muted">
            {value.publishStatus === "active"
              ? "Visible in the storefront catalog."
              : value.publishStatus === "draft"
                ? "Hidden from shoppers until published."
                : "Removed from the catalog but kept for records."}
          </p>
          <dl className="mt-3 space-y-1.5 border-t border-admin-line pt-3 text-[11px]">
            <div className="flex justify-between gap-2">
              <dt className="text-admin-muted">Stock</dt>
              <dd className="text-ink">{value.stock}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-admin-muted">Images</dt>
              <dd className="text-ink">{value.images.filter((image) => image.src).length}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-admin-muted">Variants</dt>
              <dd className="text-ink">{value.variants.length}</dd>
            </div>
          </dl>
          {value.publishStatus === "active" && value.slug ? (
            <a
              href={`/product/${value.slug}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line px-3 text-[11px] font-medium text-ink hover:bg-tile"
            >
              View product
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
        <Link
          href="/admin/products"
          className="inline-flex h-9 w-full items-center justify-center rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
        >
          Back to products
        </Link>
      </aside>
    </div>
  );
}
