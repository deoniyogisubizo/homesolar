"use client";

import { ExternalLink } from "lucide-react";
import { Field, FieldGrid, FormSection } from "@/components/admin/FormSection";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { SettingsSectionForm, fieldError } from "@/components/admin/settings/SettingsForm";
import { useHomepageSection } from "@/components/admin/content/useHomepageSection";
import type { SiteContentData } from "@/types";

export function ContentCardHeader({
  number,
  title,
  description,
  previewHref = "/",
}: {
  number?: number;
  title: string;
  description: string;
  previewHref?: string;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-deep">
          {number ? `Block ${number}` : "Global"}
        </p>
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        <p className="text-[12px] text-admin-muted">{description}</p>
      </div>
      <a
        href={previewHref}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-2.5 text-[11px] font-medium text-ink hover:bg-tile"
      >
        Preview on site
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

export function HeaderEditor({ initial }: { initial: SiteContentData["header"] }) {
  const form = useHomepageSection("header", initial);
  const { value, setValue } = form;

  return (
    <SettingsSectionForm form={form}>
      <ContentCardHeader
        title="Header options"
        description="Logo, currency and language lists, search visibility and navigation."
        previewHref="/"
      />
      <FormSection title="Header assets and options">
        <div className="grid gap-4 md:grid-cols-2">
          <ImagePicker label="Header logo" value={value.logo} onChange={(logo) => setValue({ ...value, logo })} />
          <div>
            <Field label="Search placeholder" htmlFor="header-search">
              <input
                id="header-search"
                className="admin-field"
                value={value.searchPlaceholder}
                onChange={(event) => setValue({ ...value, searchPlaceholder: event.target.value })}
              />
            </Field>
            <label className="mt-3 flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={value.searchEnabled}
                onChange={(event) => setValue({ ...value, searchEnabled: event.target.checked })}
              />
              Show the product search box
            </label>
          </div>
        </div>
        <div className="mt-4">
          <FieldGrid>
            <Field label="Currencies" htmlFor="header-currencies" hint="Comma-separated three-letter codes.">
              <input
                id="header-currencies"
                className="admin-field"
                value={value.currencies.join(", ")}
                onChange={(event) =>
                  setValue({
                    ...value,
                    currencies: event.target.value
                      .split(",")
                      .map((code) => code.trim().toUpperCase())
                      .filter(Boolean),
                  })
                }
              />
            </Field>
            <Field label="Languages" htmlFor="header-languages" hint="Comma-separated labels such as ENG, FR, RW.">
              <input
                id="header-languages"
                className="admin-field"
                value={value.languages.join(", ")}
                onChange={(event) =>
                  setValue({
                    ...value,
                    languages: event.target.value
                      .split(",")
                      .map((code) => code.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Field>
            <Field label="Account label" htmlFor="header-account">
              <input
                id="header-account"
                className="admin-field"
                value={value.accountLabel}
                onChange={(event) => setValue({ ...value, accountLabel: event.target.value })}
              />
            </Field>
            <Field label="Wishlist label" htmlFor="header-wishlist">
              <input
                id="header-wishlist"
                className="admin-field"
                value={value.wishlistLabel}
                onChange={(event) => setValue({ ...value, wishlistLabel: event.target.value })}
              />
            </Field>
            <Field label="Cart label" htmlFor="header-cart">
              <input
                id="header-cart"
                className="admin-field"
                value={value.cartLabel}
                onChange={(event) => setValue({ ...value, cartLabel: event.target.value })}
              />
            </Field>
            <Field label="Language label" htmlFor="header-language">
              <input
                id="header-language"
                className="admin-field"
                value={value.language}
                onChange={(event) => setValue({ ...value, language: event.target.value })}
              />
            </Field>
          </FieldGrid>
        </div>
        <Field label="Store name in header" htmlFor="header-name" error={fieldError(form, "storeName")} className="mt-4">
          <input
            id="header-name"
            className="admin-field"
            value={value.storeName}
            onChange={(event) => setValue({ ...value, storeName: event.target.value })}
          />
        </Field>
        <p className="admin-help">
          Menu links are edited on the Navigation page, so dropdown structure and ordering stay consistent.
        </p>
      </FormSection>
    </SettingsSectionForm>
  );
}

export function HeroEditor({ initial }: { initial: SiteContentData["hero"] }) {
  const form = useHomepageSection("hero", initial);
  const { value, setValue } = form;

  return (
    <SettingsSectionForm form={form}>
      <ContentCardHeader number={2} title="Hero banners" description="Main headline banner and the smaller side banner." />
      <FormSection title="Main banner">
        <FieldGrid>
          <Field label="Eyebrow" htmlFor="hero-eyebrow">
            <input id="hero-eyebrow" className="admin-field" value={value.eyebrow} onChange={(event) => setValue({ ...value, eyebrow: event.target.value })} />
          </Field>
          <Field label="Subtitle" htmlFor="hero-subtitle">
            <input id="hero-subtitle" className="admin-field" value={value.subtitle} onChange={(event) => setValue({ ...value, subtitle: event.target.value })} />
          </Field>
          <Field label="Title, strong" htmlFor="hero-title-strong" error={fieldError(form, "titleStrong")}>
            <input id="hero-title-strong" className="admin-field" value={value.titleStrong} onChange={(event) => setValue({ ...value, titleStrong: event.target.value })} />
          </Field>
          <Field label="Title, light" htmlFor="hero-title-light">
            <input id="hero-title-light" className="admin-field" value={value.titleLight} onChange={(event) => setValue({ ...value, titleLight: event.target.value })} />
          </Field>
          <Field label="Button label" htmlFor="hero-cta-label">
            <input id="hero-cta-label" className="admin-field" value={value.cta.label} onChange={(event) => setValue({ ...value, cta: { ...value.cta, label: event.target.value } })} />
          </Field>
          <Field label="Button link" htmlFor="hero-cta-href" error={fieldError(form, "cta.href")}>
            <input id="hero-cta-href" className="admin-field" value={value.cta.href} onChange={(event) => setValue({ ...value, cta: { ...value.cta, href: event.target.value } })} />
          </Field>
        </FieldGrid>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ImagePicker label="Main image" value={value.image} onChange={(image) => setValue({ ...value, image })} />
          <Field label="Main image alt text" htmlFor="hero-image-alt" error={fieldError(form, "imageAlt")}>
            <input id="hero-image-alt" className="admin-field" value={value.imageAlt} onChange={(event) => setValue({ ...value, imageAlt: event.target.value })} />
          </Field>
        </div>
      </FormSection>
      <FormSection title="Side banner">
        <FieldGrid>
          <Field label="Eyebrow" htmlFor="side-eyebrow">
            <input id="side-eyebrow" className="admin-field" value={value.sideEyebrow} onChange={(event) => setValue({ ...value, sideEyebrow: event.target.value })} />
          </Field>
          <Field label="Subtitle" htmlFor="side-subtitle">
            <input id="side-subtitle" className="admin-field" value={value.sideSubtitle} onChange={(event) => setValue({ ...value, sideSubtitle: event.target.value })} />
          </Field>
          <Field label="Title" htmlFor="side-title">
            <input id="side-title" className="admin-field" value={value.sideTitle} onChange={(event) => setValue({ ...value, sideTitle: event.target.value })} />
          </Field>
          <Field label="Title accent" htmlFor="side-title-accent">
            <input id="side-title-accent" className="admin-field" value={value.sideTitleAccent} onChange={(event) => setValue({ ...value, sideTitleAccent: event.target.value })} />
          </Field>
        </FieldGrid>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ImagePicker label="Side image" value={value.sideImage} onChange={(sideImage) => setValue({ ...value, sideImage })} />
          <Field label="Side image alt text" htmlFor="side-image-alt" error={fieldError(form, "sideImageAlt")}>
            <input id="side-image-alt" className="admin-field" value={value.sideImageAlt} onChange={(event) => setValue({ ...value, sideImageAlt: event.target.value })} />
          </Field>
        </div>
      </FormSection>
    </SettingsSectionForm>
  );
}
