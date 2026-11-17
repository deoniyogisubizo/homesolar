"use client";

import { saveSeoSettingsAction } from "@/app/(admin)/admin/settings/actions";
import { Field, FieldGrid, FormSection } from "@/components/admin/FormSection";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { useSectionForm, SettingsSectionForm, fieldError } from "@/components/admin/settings/SettingsForm";
import type { SeoSettings } from "@/lib/admin/settings-defaults";

export function SeoSettingsForm({ initial }: { initial: SeoSettings }) {
  const form = useSectionForm(initial, saveSeoSettingsAction);
  const { value, setValue } = form;

  return (
    <SettingsSectionForm form={form}>
      <FormSection title="Meta defaults" description="Used when a product, category or page has no specific SEO fields.">
        <FieldGrid>
          <Field
            label="Title template"
            htmlFor="titleTemplate"
            hint="Use %s where the page title should appear."
            error={fieldError(form, "titleTemplate")}
          >
            <input
              id="titleTemplate"
              className="admin-field"
              value={value.titleTemplate}
              onChange={(event) => setValue({ ...value, titleTemplate: event.target.value })}
            />
          </Field>
          <Field label="Meta description" htmlFor="metaDescription" error={fieldError(form, "metaDescription")}>
            <textarea
              id="metaDescription"
              className="admin-field admin-textarea"
              value={value.metaDescription}
              onChange={(event) => setValue({ ...value, metaDescription: event.target.value })}
            />
          </Field>
        </FieldGrid>
        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,300px)_1fr]">
          <ImagePicker
            label="Open Graph image"
            value={value.ogImage}
            onChange={(ogImage) => setValue({ ...value, ogImage })}
            hint="Used for social sharing previews."
          />
          <div className="space-y-3 pt-1">
            <label className="flex items-start gap-2 text-[13px] text-ink">
              <input
                type="checkbox"
                checked={value.indexable}
                onChange={(event) => setValue({ ...value, indexable: event.target.checked })}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                Allow search engine indexing
                <span className="mt-0.5 block text-[11px] text-admin-muted">Disabling adds a noindex directive to every page.</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-[13px] text-ink">
              <input
                type="checkbox"
                checked={value.sitemapEnabled}
                onChange={(event) => setValue({ ...value, sitemapEnabled: event.target.checked })}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                Publish sitemap.xml
                <span className="mt-0.5 block text-[11px] text-admin-muted">Includes active products, visible categories and published pages.</span>
              </span>
            </label>
          </div>
        </div>
      </FormSection>

      <FormSection title="Search preview" description="Approximate result appearance for the default template.">
        <div className="max-w-xl">
          <p className="text-[12px] text-admin-muted">https://your-store.example</p>
          <p className="mt-1 text-[18px] text-brand-deep">
            {value.titleTemplate.replace("%s", value.titleTemplate.includes("%s") ? "Store name" : value.titleTemplate)}
          </p>
          <p className="mt-1 text-[13px] leading-6 text-ink">{value.metaDescription || "No meta description set."}</p>
        </div>
      </FormSection>
    </SettingsSectionForm>
  );
}
