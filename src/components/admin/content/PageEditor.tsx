"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { archivePageAction, savePageAction } from "@/app/(admin)/admin/(dashboard)/storefront/actions";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Field, FieldGrid, FormSection } from "@/components/admin/FormSection";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { SettingsSectionForm, fieldError, useSectionForm } from "@/components/admin/settings/SettingsForm";
import { useToast } from "@/components/admin/ToastProvider";
import type { PageFaq } from "@/types";

export type PageFormValues = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  noindex: boolean;
  faqs: PageFaq[];
  status: "draft" | "published" | "archived";
  showInFooter: boolean;
  order: number;
};

export const EMPTY_PAGE: PageFormValues = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  seoTitle: "",
  seoDescription: "",
  noindex: false,
  faqs: [],
  status: "draft",
  showInFooter: false,
  order: 0,
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

export function PageEditor({ initial }: { initial: PageFormValues }) {
  const router = useRouter();
  const { toast } = useToast();
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [archiving, startArchive] = useTransition();
  const isNew = !initial.id;

  const form = useSectionForm<PageFormValues, { id: string }>(initial, async (value) => {
    const result = await savePageAction(value);
    if (result.ok && isNew) {
      router.replace(`/admin/storefront/pages/${result.data.id}`);
    }
    return result;
  });
  const { value, setValue } = form;

  const excludeSlug = value.slug || "page";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <SettingsSectionForm form={form} label="Page changes are not saved yet.">
          <FormSection title="Page content" description="The body is rendered on the storefront at the page URL.">
            <div className="space-y-4">
              <FieldGrid>
                <Field label="Title" htmlFor="page-title" error={fieldError(form, "title")}>
                  <input
                    id="page-title"
                    className="admin-field"
                    value={value.title}
                    onChange={(event) => {
                      const title = event.target.value;
                      setValue({
                        ...value,
                        title,
                        ...(slugTouched ? {} : { slug: slugify(title) }),
                      });
                    }}
                  />
                </Field>
                <Field
                  label="URL slug"
                  htmlFor="page-slug"
                  hint={`The page will live at /${excludeSlug}.`}
                  error={fieldError(form, "slug")}
                >
                  <div className="flex gap-2">
                    <input
                      id="page-slug"
                      className="admin-field"
                      value={value.slug}
                      onChange={(event) => {
                        setSlugTouched(true);
                        setValue({ ...value, slug: event.target.value.toLowerCase() });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setValue({ ...value, slug: slugify(value.title) });
                        setSlugTouched(true);
                      }}
                      className="inline-flex h-9 shrink-0 items-center rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
                    >
                      From title
                    </button>
                  </div>
                  {initial.id && initial.slug !== value.slug ? (
                    <p className="admin-help text-warning">
                      The old address /{initial.slug} will redirect here with a 308 response.
                    </p>
                  ) : null}
                </Field>
              </FieldGrid>
              <Field label="Excerpt" htmlFor="page-excerpt" error={fieldError(form, "excerpt")}>
                <textarea
                  id="page-excerpt"
                  className="admin-field admin-textarea min-h-[70px]"
                  value={value.excerpt}
                  onChange={(event) => setValue({ ...value, excerpt: event.target.value })}
                />
              </Field>
              <RichTextEditor
                id="page-content"
                value={value.content}
                onChange={(content) => setValue({ ...value, content })}
                label="Body content"
              />
            </div>
          </FormSection>

          <FormSection title="Search appearance" description="Optional overrides for the browser title and search result description.">
            <div className="space-y-4">
              <FieldGrid>
                <Field label="SEO title" htmlFor="page-seo-title" error={fieldError(form, "seoTitle")}>
                  <input
                    id="page-seo-title"
                    className="admin-field"
                    value={value.seoTitle}
                    onChange={(event) => setValue({ ...value, seoTitle: event.target.value })}
                  />
                  <p className={`admin-help ${seoCounterClass(value.seoTitle.length, 30, 60)}`}>
                    {value.seoTitle.length}/60 characters
                  </p>
                </Field>
                <Field label="SEO description" htmlFor="page-seo-description" error={fieldError(form, "seoDescription")}>
                  <textarea
                    id="page-seo-description"
                    className="admin-field admin-textarea min-h-[70px]"
                    value={value.seoDescription}
                    onChange={(event) => setValue({ ...value, seoDescription: event.target.value })}
                  />
                  <p className={`admin-help ${seoCounterClass(value.seoDescription.length, 70, 160)}`}>
                    {value.seoDescription.length}/160 characters
                  </p>
                </Field>
              </FieldGrid>
              <div className="rounded-[6px] border border-admin-line bg-white p-4">
                <p className="text-[12px] text-admin-muted">
                  {process.env.NEXT_PUBLIC_SITE_URL || "https://your-store.example"}/{value.slug || "page"}
                </p>
                <p className="mt-1 text-[18px] text-brand-deep">
                  {value.seoTitle || value.title || "Page title"}
                </p>
                <p className="mt-1 text-[12px] leading-5 text-ink">
                  {value.seoDescription || value.excerpt || "Add a meta description to improve search previews."}
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
                    Adds noindex and removes the page from the sitemap. FAQ structured data is also
                    suppressed.
                  </span>
                </span>
              </label>
            </div>
          </FormSection>

          <FormSection
            title="Frequently asked questions"
            description="Questions appear on the page and generate FAQPage structured data when the page is published and indexable. Only add questions that are genuinely answered here."
          >
            <div className="space-y-4">
              {value.faqs.map((faq, index) => (
                <div key={index} className="rounded-[6px] border border-admin-line bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[12px] font-semibold text-ink">Question {index + 1}</p>
                    <button
                      type="button"
                      onClick={() =>
                        setValue({
                          ...value,
                          faqs: value.faqs.filter((_, position) => position !== index),
                        })
                      }
                      className="inline-flex h-7 w-7 items-center justify-center rounded-[5px] border border-admin-line text-admin-muted hover:border-danger/40 hover:text-danger"
                      aria-label={`Remove question ${index + 1}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <Field
                    label="Question"
                    htmlFor={`page-faq-question-${index}`}
                    error={fieldError(form, `faqs.${index}.question`)}
                  >
                    <input
                      id={`page-faq-question-${index}`}
                      className="admin-field"
                      value={faq.question}
                      onChange={(event) =>
                        setValue({
                          ...value,
                          faqs: value.faqs.map((entry, position) =>
                            position === index ? { ...entry, question: event.target.value } : entry,
                          ),
                        })
                      }
                    />
                  </Field>
                  <div className="mt-3">
                    <Field
                      label="Answer"
                      htmlFor={`page-faq-answer-${index}`}
                      error={fieldError(form, `faqs.${index}.answer`)}
                    >
                      <textarea
                        id={`page-faq-answer-${index}`}
                        className="admin-field admin-textarea min-h-[90px]"
                        value={faq.answer}
                        onChange={(event) =>
                          setValue({
                            ...value,
                            faqs: value.faqs.map((entry, position) =>
                              position === index ? { ...entry, answer: event.target.value } : entry,
                            ),
                          })
                        }
                      />
                    </Field>
                  </div>
                </div>
              ))}
              {value.faqs.length < 20 ? (
                <button
                  type="button"
                  onClick={() => setValue({ ...value, faqs: [...value.faqs, { question: "", answer: "" }] })}
                  className="inline-flex h-9 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add question
                </button>
              ) : null}
            </div>
          </FormSection>

          <FormSection title="Publishing" description="Draft pages are hidden. Published pages are public and appear in the sitemap.">
            <FieldGrid columns={3}>
              <Field label="Status" htmlFor="page-status">
                <select
                  id="page-status"
                  className="admin-field"
                  value={value.status}
                  onChange={(event) =>
                    setValue({ ...value, status: event.target.value as PageFormValues["status"] })
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </Field>
              <Field label="Footer order" htmlFor="page-order" hint="Lower numbers appear first in footer lists.">
                <input
                  id="page-order"
                  type="number"
                  min={0}
                  max={999}
                  className="admin-field"
                  value={value.order}
                  onChange={(event) => setValue({ ...value, order: Number(event.target.value) })}
                />
              </Field>
              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 text-[13px] text-ink">
                  <input
                    type="checkbox"
                    checked={value.showInFooter}
                    onChange={(event) => setValue({ ...value, showInFooter: event.target.checked })}
                    className="h-4 w-4"
                  />
                  Show in footer
                </label>
              </div>
            </FieldGrid>
          </FormSection>
        </SettingsSectionForm>
      </div>

      <aside className="h-fit space-y-3 xl:sticky xl:top-[84px]">
        <div className="rounded-[8px] border border-admin-line bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">Page status</p>
          <p className="mt-2 text-[13px] font-medium text-ink">
            {value.status === "published" ? "Published" : value.status === "draft" ? "Draft" : "Archived"}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-admin-muted">
            {value.status === "published"
              ? `Available at /${value.slug || "…"}.`
              : "Only staff can see this page in the editor."}
          </p>
          {value.status === "published" && value.slug ? (
            <a
              href={`/${value.slug}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line px-3 text-[11px] font-medium text-ink hover:bg-tile"
            >
              View page
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>

        <Link
          href="/admin/storefront/pages"
          className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
        >
          <Plus className="h-3.5 w-3.5 rotate-45" />
          Back to pages
        </Link>

        {!isNew && value.status !== "archived" ? (
          <div className="rounded-[8px] border border-danger/25 bg-white p-4">
            <p className="text-[12px] font-semibold text-ink">Archive page</p>
            <p className="mt-1 text-[11px] leading-5 text-admin-muted">
              Archived pages return a not-found response on the storefront. The content stays available here.
            </p>
            <div className="mt-3">
              <ConfirmDialog
                trigger={
                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-danger/30 bg-white px-3 text-[11px] font-medium text-danger hover:bg-danger-pale"
                  >
                    <Trash2 className="h-3 w-3" />
                    Archive page
                  </button>
                }
                title="Archive this page"
                description={`Archive ${value.title || "this page"}? The public URL will stop working immediately.`}
                confirmLabel="Archive"
                pending={archiving}
                onConfirm={() =>
                  startArchive(async () => {
                    if (!value.id) return;
                    const result = await archivePageAction({ id: value.id });
                    if (result.ok) {
                      toast("Page archived.");
                      router.push("/admin/storefront/pages");
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
