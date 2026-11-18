"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { saveSeoSettingsAction } from "@/app/(admin)/admin/settings/actions";
import { Field, FieldGrid, FormSection } from "@/components/admin/FormSection";
import { ImagePicker } from "@/components/admin/ImagePicker";
import {
  useSectionForm,
  SettingsSectionForm,
  fieldError,
} from "@/components/admin/settings/SettingsForm";
import {
  SEARCH_CRAWLERS,
  TRAINING_CRAWLERS,
  type SeoSettings,
  type TrainingCrawlerKey,
} from "@/lib/admin/settings-defaults";

function counterClass(length: number, min: number, max: number) {
  if (length === 0) return "text-admin-muted";
  if (length < min) return "text-warning";
  if (length > max) return "text-danger";
  return "text-success";
}

function CopyUrl({ label, path }: { label: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  const url = `${siteUrl}${path}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 border-b border-admin-line py-2 last:border-0">
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-ink">{label}</p>
        <p className="truncate text-[11px] text-admin-muted">{url || path}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-[5px] border border-admin-line px-2.5 py-1 text-[11px] text-ink hover:bg-canvas"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function SeoSettingsForm({ initial }: { initial: SeoSettings }) {
  const form = useSectionForm(initial, saveSeoSettingsAction);
  const { value, setValue } = form;

  const setSearchCrawler = (key: keyof SeoSettings["robots"]["search"], allowed: boolean) => {
    setValue({
      ...value,
      robots: {
        ...value.robots,
        search: { ...value.robots.search, [key]: allowed },
      },
    });
  };

  const setTrainingCrawler = (key: TrainingCrawlerKey, allowed: boolean) => {
    setValue({
      ...value,
      robots: {
        ...value.robots,
        training: { ...value.robots.training, [key]: allowed },
      },
    });
  };

  return (
    <SettingsSectionForm form={form}>
      <FormSection
        title="Meta defaults"
        description="Used when a product, category or page has no specific SEO fields."
      >
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
            <p className={`admin-help ${counterClass(value.metaDescription.length, 70, 160)}`}>
              {value.metaDescription.length}/160 characters
            </p>
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
                <span className="mt-0.5 block text-[11px] text-admin-muted">
                  Disabling adds a noindex directive to every page and blocks all crawlers in robots.txt.
                </span>
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
                <span className="mt-0.5 block text-[11px] text-admin-muted">
                  Includes active products, visible categories and published pages.
                </span>
              </span>
            </label>
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Store identity"
        description="Used by Organization, WebSite, Store and ContactPage structured data."
      >
        <FieldGrid>
          <Field label="Legal name" htmlFor="legalName" error={fieldError(form, "legalName")}>
            <input
              id="legalName"
              className="admin-field"
              value={value.legalName}
              onChange={(event) => setValue({ ...value, legalName: event.target.value })}
            />
          </Field>
          <Field
            label="Opening hours"
            htmlFor="openingHours"
            hint="Schema.org format, for example Mo-Sa 08:00-18:00."
            error={fieldError(form, "openingHours")}
          >
            <input
              id="openingHours"
              className="admin-field"
              value={value.openingHours}
              onChange={(event) => setValue({ ...value, openingHours: event.target.value })}
            />
          </Field>
        </FieldGrid>
        <div className="mt-4">
          <Field
            label="AI summary"
            htmlFor="llmsSummary"
            hint="Short factual summary published in llms.txt."
            error={fieldError(form, "llmsSummary")}
          >
            <textarea
              id="llmsSummary"
              className="admin-field admin-textarea"
              value={value.llmsSummary}
              onChange={(event) => setValue({ ...value, llmsSummary: event.target.value })}
            />
          </Field>
        </div>
        <FieldGrid>
          <Field
            label="Latitude"
            htmlFor="geoLatitude"
            hint="Optional. Leave blank to omit geo coordinates."
            error={fieldError(form, "geoLatitude")}
          >
            <input
              id="geoLatitude"
              className="admin-field"
              inputMode="decimal"
              value={value.geoLatitude}
              onChange={(event) => setValue({ ...value, geoLatitude: event.target.value })}
            />
          </Field>
          <Field
            label="Longitude"
            htmlFor="geoLongitude"
            hint="Optional. Used with latitude for Store markup."
            error={fieldError(form, "geoLongitude")}
          >
            <input
              id="geoLongitude"
              className="admin-field"
              inputMode="decimal"
              value={value.geoLongitude}
              onChange={(event) => setValue({ ...value, geoLongitude: event.target.value })}
            />
          </Field>
        </FieldGrid>
      </FormSection>

      <FormSection
        title="Search crawlers"
        description="Each crawler gets its own robots.txt group. Turn one off to block it completely."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {SEARCH_CRAWLERS.map((crawler) => (
            <label
              key={crawler.key}
              className="flex items-start gap-2 rounded-[6px] border border-admin-line px-3 py-2.5 text-[13px] text-ink"
            >
              <input
                type="checkbox"
                checked={value.robots.search[crawler.key]}
                onChange={(event) => setSearchCrawler(crawler.key, event.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                {crawler.label}
                <span className="mt-0.5 block font-mono text-[11px] text-admin-muted">
                  {crawler.userAgent}
                </span>
              </span>
            </label>
          ))}
        </div>

        <h3 className="mt-6 text-[13px] font-semibold text-ink">AI training crawlers</h3>
        <p className="mt-1 text-[11px] text-admin-muted">
          Blocked by default. Allowing a crawler removes the disallow rule for that user agent only.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {TRAINING_CRAWLERS.map((crawler) => (
            <label
              key={crawler.key}
              className="flex items-start gap-2 rounded-[6px] border border-admin-line px-3 py-2.5 text-[13px] text-ink"
            >
              <input
                type="checkbox"
                checked={value.robots.training[crawler.key]}
                onChange={(event) => setTrainingCrawler(crawler.key, event.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                {crawler.label}
                <span className="mt-0.5 block font-mono text-[11px] text-admin-muted">
                  {crawler.userAgent}
                </span>
              </span>
            </label>
          ))}
        </div>
      </FormSection>

      <FormSection
        title="Verification and IndexNow"
        description="Paste the verification tokens from search engine consoles."
      >
        <FieldGrid>
          <Field
            label="Google Search Console"
            htmlFor="googleSiteVerification"
            hint="The content value of the google-site-verification meta tag."
            error={fieldError(form, "googleSiteVerification")}
          >
            <input
              id="googleSiteVerification"
              className="admin-field"
              value={value.googleSiteVerification}
              onChange={(event) =>
                setValue({ ...value, googleSiteVerification: event.target.value })
              }
            />
          </Field>
          <Field
            label="Bing Webmaster Tools"
            htmlFor="bingSiteVerification"
            hint="The content value of the msvalidate.01 meta tag."
            error={fieldError(form, "bingSiteVerification")}
          >
            <input
              id="bingSiteVerification"
              className="admin-field"
              value={value.bingSiteVerification}
              onChange={(event) =>
                setValue({ ...value, bingSiteVerification: event.target.value })
              }
            />
          </Field>
        </FieldGrid>
        <label className="mt-4 flex items-start gap-2 text-[13px] text-ink">
          <input
            type="checkbox"
            checked={value.indexNowEnabled}
            onChange={(event) => setValue({ ...value, indexNowEnabled: event.target.checked })}
            className="mt-0.5 h-4 w-4"
          />
          <span>
            Enable IndexNow submission
            <span className="mt-0.5 block text-[11px] text-admin-muted">
              Requires INDEXNOW_KEY in the server environment. Submit URLs from SEO Health after
              publishing changes.
            </span>
          </span>
        </label>
      </FormSection>

      <FormSection title="Discoverability URLs" description="Copy these addresses for search consoles and Merchant Center.">
        <CopyUrl label="robots.txt" path="/robots.txt" />
        <CopyUrl label="Sitemap" path="/sitemap.xml" />
        <CopyUrl label="llms.txt" path="/llms.txt" />
        <CopyUrl label="Google Merchant XML feed" path="/feeds/google-merchant.xml" />
        <CopyUrl label="Google Merchant TSV feed" path="/feeds/google-merchant.tsv" />
      </FormSection>

      <FormSection title="Search preview" description="Approximate result appearance for the default template.">
        <div className="max-w-xl">
          <p className="text-[12px] text-admin-muted">
            {process.env.NEXT_PUBLIC_SITE_URL || "https://your-store.example"}
          </p>
          <p className="mt-1 text-[18px] text-brand-deep">
            {value.titleTemplate.replace(
              "%s",
              value.titleTemplate.includes("%s") ? "Store name" : value.titleTemplate,
            )}
          </p>
          <p className="mt-1 text-[13px] leading-6 text-ink">
            {value.metaDescription || "No meta description set."}
          </p>
        </div>
      </FormSection>
    </SettingsSectionForm>
  );
}
