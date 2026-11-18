"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { deleteCategoryAction, saveCategoryAction } from "@/app/(admin)/admin/(dashboard)/categories/actions";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Field, FieldGrid, FormSection } from "@/components/admin/FormSection";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { SettingsSectionForm, fieldError, useSectionForm } from "@/components/admin/settings/SettingsForm";
import { useToast } from "@/components/admin/ToastProvider";

export type CategoryFormValues = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  bannerImage: string;
  showOnHome: boolean;
  order: number;
  active: boolean;
  seoTitle: string;
  seoDescription: string;
  noindex: boolean;
  googleProductCategory: string;
};

export const EMPTY_CATEGORY: CategoryFormValues = {
  name: "",
  slug: "",
  description: "",
  image: "",
  bannerImage: "",
  showOnHome: false,
  order: 0,
  active: true,
  seoTitle: "",
  seoDescription: "",
  noindex: false,
  googleProductCategory: "",
};

function seoCounterClass(length: number, min: number, max: number) {
  if (length === 0) return "text-admin-muted";
  if (length < min) return "text-warning";
  if (length > max) return "text-danger";
  return "text-success";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function CategoryEditor({ initial, productCount }: { initial: CategoryFormValues; productCount?: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [deleting, startDelete] = useTransition();
  const isNew = !initial.id;

  const form = useSectionForm<CategoryFormValues, { id: string }>(initial, async (value) => {
    const result = await saveCategoryAction(value);
    if (result.ok && isNew) router.replace(`/admin/categories/${result.data.id}`);
    return result;
  });
  const { value, setValue } = form;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <SettingsSectionForm form={form} label="Category changes are not saved yet.">
          <FormSection title="Category details">
            <div className="space-y-4">
              <FieldGrid>
                <Field label="Name" htmlFor="category-name" error={fieldError(form, "name")}>
                  <input
                    id="category-name"
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
                  htmlFor="category-slug"
                  hint={`/category/${value.slug || "…"}`}
                  error={fieldError(form, "slug")}
                >
                  <input
                    id="category-slug"
                    className="admin-field"
                    value={value.slug}
                    onChange={(event) => {
                      setSlugTouched(true);
                      setValue({ ...value, slug: event.target.value.toLowerCase() });
                    }}
                  />
                  {initial.id && initial.slug !== value.slug ? (
                    <p className="admin-help text-warning">
                      The old address /category/{initial.slug} will redirect here with a 308
                      response.
                    </p>
                  ) : null}
                </Field>
              </FieldGrid>
              <Field label="Description" htmlFor="category-description" error={fieldError(form, "description")}>
                <textarea
                  id="category-description"
                  className="admin-field admin-textarea"
                  value={value.description}
                  onChange={(event) => setValue({ ...value, description: event.target.value })}
                />
              </Field>
              <ImagePicker
                label="Category image"
                value={value.image}
                onChange={(image) => setValue({ ...value, image })}
                hint="Used on category tiles and category page headers."
              />
              {fieldError(form, "image") ? <p className="admin-error">{fieldError(form, "image")}</p> : null}
              <ImagePicker
                label="Hero banner image (wide HD)"
                value={value.bannerImage}
                onChange={(bannerImage) => setValue({ ...value, bannerImage })}
                hint="Shown in the animated homepage hero banner. Recommended 1920 × 1080 or wider. Falls back to the category image when empty."
              />
              {fieldError(form, "bannerImage") ? <p className="admin-error">{fieldError(form, "bannerImage")}</p> : null}
            </div>
          </FormSection>

          <FormSection title="Visibility and placement">
            <FieldGrid columns={3}>
              <Field label="Order" htmlFor="category-order" hint="Lower numbers appear first.">
                <input
                  id="category-order"
                  type="number"
                  min={0}
                  max={999}
                  className="admin-field"
                  value={value.order}
                  onChange={(event) => setValue({ ...value, order: Number(event.target.value) })}
                />
              </Field>
              <label className="flex items-center pt-5 text-[13px] text-ink">
                <input
                  type="checkbox"
                  checked={value.active}
                  onChange={(event) => setValue({ ...value, active: event.target.checked })}
                  className="mr-2 h-4 w-4"
                />
                Visible on the storefront
              </label>
              <label className="flex items-center pt-5 text-[13px] text-ink">
                <input
                  type="checkbox"
                  checked={value.showOnHome}
                  onChange={(event) => setValue({ ...value, showOnHome: event.target.checked })}
                  className="mr-2 h-4 w-4"
                />
                Show in homepage categories
              </label>
            </FieldGrid>
          </FormSection>

          <FormSection
            title="Search appearance"
            description="Optional overrides for search engines and the category page."
          >
            <div className="space-y-4">
              <FieldGrid>
                <Field label="SEO title" htmlFor="category-seo-title" error={fieldError(form, "seoTitle")}>
                  <input
                    id="category-seo-title"
                    className="admin-field"
                    value={value.seoTitle}
                    onChange={(event) => setValue({ ...value, seoTitle: event.target.value })}
                  />
                  <p className={`admin-help ${seoCounterClass(value.seoTitle.length, 30, 60)}`}>
                    {value.seoTitle.length}/60 characters
                  </p>
                </Field>
                <Field label="SEO description" htmlFor="category-seo-description" error={fieldError(form, "seoDescription")}>
                  <textarea
                    id="category-seo-description"
                    className="admin-field admin-textarea min-h-[70px]"
                    value={value.seoDescription}
                    onChange={(event) => setValue({ ...value, seoDescription: event.target.value })}
                  />
                  <p className={`admin-help ${seoCounterClass(value.seoDescription.length, 70, 160)}`}>
                    {value.seoDescription.length}/160 characters
                  </p>
                </Field>
              </FieldGrid>
              <Field
                label="Google product category"
                htmlFor="category-google-product-category"
                hint="Google Merchant taxonomy path or ID, for example Home & Garden > Lighting. Used by every product in this category when a product has no override."
                error={fieldError(form, "googleProductCategory")}
              >
                <input
                  id="category-google-product-category"
                  className="admin-field"
                  value={value.googleProductCategory}
                  onChange={(event) =>
                    setValue({ ...value, googleProductCategory: event.target.value })
                  }
                />
              </Field>
              <div className="rounded-[6px] border border-admin-line bg-white p-4">
                <p className="text-[12px] text-admin-muted">
                  {process.env.NEXT_PUBLIC_SITE_URL || "https://your-store.example"}/category/
                  {value.slug || "category"}
                </p>
                <p className="mt-1 text-[18px] text-brand-deep">
                  {value.seoTitle || value.name || "Category title"}
                </p>
                <p className="mt-1 text-[12px] leading-5 text-ink">
                  {value.seoDescription || value.description || "Add a meta description to improve search previews."}
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
                    Adds noindex and removes the category from the sitemap.
                  </span>
                </span>
              </label>
            </div>
          </FormSection>
        </SettingsSectionForm>
      </div>

      <aside className="h-fit space-y-3 xl:sticky xl:top-[84px]">
        <div className="rounded-[8px] border border-admin-line bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">Category</p>
          <p className="mt-2 text-[13px] font-medium text-ink">{value.name || "Untitled category"}</p>
          <p className="mt-1 text-[11px] leading-5 text-admin-muted">
            {value.active ? "Visible on the storefront." : "Hidden from shoppers."}
          </p>
          {typeof productCount === "number" ? (
            <p className="mt-2 text-[11px] text-admin-muted">
              {productCount} product{productCount === 1 ? "" : "s"} in this category.
            </p>
          ) : null}
          {value.active && value.slug ? (
            <a
              href={`/category/${value.slug}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line px-3 text-[11px] font-medium text-ink hover:bg-tile"
            >
              View category
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>

        <Link
          href="/admin/categories"
          className="inline-flex h-9 w-full items-center justify-center rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
        >
          Back to categories
        </Link>

        {!isNew ? (
          <div className="rounded-[8px] border border-danger/25 bg-white p-4">
            <p className="text-[12px] font-semibold text-ink">Delete category</p>
            <p className="mt-1 text-[11px] leading-5 text-admin-muted">
              Categories with products cannot be deleted. Move or archive those products first.
            </p>
            <div className="mt-3">
              <ConfirmDialog
                trigger={
                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-danger/30 bg-white px-3 text-[11px] font-medium text-danger hover:bg-danger-pale"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete category
                  </button>
                }
                title="Delete this category"
                description={`Delete ${value.name || "this category"}? This cannot be undone.`}
                confirmLabel="Delete"
                pending={deleting}
                onConfirm={() =>
                  startDelete(async () => {
                    if (!value.id) return;
                    const result = await deleteCategoryAction({ id: value.id });
                    if (result.ok) {
                      toast("Category deleted.");
                      router.push("/admin/categories");
                      router.refresh();
                    } else {
                      toast(result.error, "error");
                    }
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
