"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Field, FieldGrid, FormSection } from "@/components/admin/FormSection";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { SettingsSectionForm, fieldError } from "@/components/admin/settings/SettingsForm";
import { ContentCardHeader } from "@/components/admin/content/HeaderHeroEditors";
import { ProductPicker, type ProductOption } from "@/components/admin/content/ProductPicker";
import { useHomepageSection } from "@/components/admin/content/useHomepageSection";
import type { SiteContentData } from "@/types";

function CtaFields({
  label,
  href,
  onChange,
  idPrefix,
  onRemove,
}: {
  label: string;
  href: string;
  onChange: (value: { label: string; href: string }) => void;
  idPrefix: string;
  onRemove?: () => void;
}) {
  return (
    <div className="grid gap-2 rounded-[6px] border border-admin-line p-3 md:grid-cols-[1fr_1.4fr_40px]">
      <input
        className="admin-field"
        aria-label={`${idPrefix} button label`}
        placeholder="Button label"
        value={label}
        onChange={(event) => onChange({ label: event.target.value, href })}
      />
      <input
        className="admin-field"
        aria-label={`${idPrefix} button link`}
        placeholder="/category/solar-panels"
        value={href}
        onChange={(event) => onChange({ label, href: event.target.value })}
      />
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-admin-line text-admin-muted hover:border-danger/40 hover:text-danger"
          aria-label={`Remove ${idPrefix} button`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function SaleEditor({ initial }: { initial: SiteContentData["sale"] }) {
  const form = useHomepageSection("sale", initial);
  const { value, setValue } = form;

  return (
    <SettingsSectionForm form={form}>
      <ContentCardHeader
        number={2}
        title="Sale strip"
        description="Promotional strip directly below the hero. It shows this copy unless an active campaign is taking over."
      />
      <FormSection title="Strip content">
        <FieldGrid>
          <Field label="Title" htmlFor="sale-title" error={fieldError(form, "title")}>
            <input
              id="sale-title"
              className="admin-field"
              value={value.title}
              onChange={(event) => setValue({ ...value, title: event.target.value })}
            />
          </Field>
          <Field label="Description" htmlFor="sale-description" error={fieldError(form, "description")}>
            <input
              id="sale-description"
              className="admin-field"
              value={value.description}
              onChange={(event) => setValue({ ...value, description: event.target.value })}
            />
          </Field>
        </FieldGrid>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="admin-label mb-0">Buttons</span>
            {value.buttons.length < 3 ? (
              <button
                type="button"
                onClick={() => setValue({ ...value, buttons: [...value.buttons, { label: "", href: "" }] })}
                className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
              >
                <Plus className="h-3.5 w-3.5" />
                Add button
              </button>
            ) : null}
          </div>
          {value.buttons.map((button, index) => (
            <CtaFields
              key={index}
              idPrefix={`Sale button ${index + 1}`}
              label={button.label}
              href={button.href}
              onChange={(next) =>
                setValue({
                  ...value,
                  buttons: value.buttons.map((row, position) => (position === index ? next : row)),
                })
              }
              onRemove={() => setValue({ ...value, buttons: value.buttons.filter((_, position) => position !== index) })}
            />
          ))}
          {!value.buttons.length ? (
            <p className="rounded-[6px] border border-dashed border-admin-line px-3 py-3 text-center text-[12px] text-admin-muted">
              No buttons. The strip will only show its heading and text.
            </p>
          ) : null}
        </div>
      </FormSection>

      <FormSection title="Visibility" description="Control whether the strip appears and when campaign content should take precedence.">
        <div className="space-y-3">
          <label className="flex items-start gap-2 text-[13px] text-ink">
            <input
              type="checkbox"
              checked={value.enabled}
              onChange={(event) => setValue({ ...value, enabled: event.target.checked })}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              Show the strip on the homepage
              <span className="mt-0.5 block text-[11px] text-admin-muted">
                Keep this on to display the promotional strip below the hero banner.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-[13px] text-ink">
            <input
              type="checkbox"
              checked={value.manualOverride}
              onChange={(event) => setValue({ ...value, manualOverride: event.target.checked })}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              Always use this copy, even when a campaign is active
              <span className="mt-0.5 block text-[11px] text-admin-muted">
                When off, an active campaign&apos;s sale strip content takes precedence. If no campaign is active, this copy is used.
              </span>
            </span>
          </label>
        </div>
      </FormSection>
    </SettingsSectionForm>
  );
}

export function PromosEditor({ initial }: { initial: SiteContentData["promos"] }) {
  const form = useHomepageSection("promos", initial);
  const { value, setValue } = form;

  const update = (index: number, patch: Partial<SiteContentData["promos"][number]>) => {
    setValue(value.map((promo, position) => (position === index ? { ...promo, ...patch } : promo)));
  };

  return (
    <SettingsSectionForm form={form}>
      <ContentCardHeader
        number={3}
        title="Promo banners"
        description="Two side-by-side banners. The first banner can be overridden by an active campaign."
      />
      <FormSection
        title="Banners"
        description="Keep two banners for the balanced storefront layout. Up to four are allowed."
        aside={
          value.length < 4 ? (
            <button
              type="button"
              onClick={() =>
                setValue([
                  ...value,
                  {
                    id: `promo-${Date.now().toString(36)}`,
                    eyebrow: "",
                    title: "",
                    discount: "",
                    cta: { label: "SHOP NOW", href: "/search" },
                    image: "",
                    tone: value.length % 2 === 0 ? "blue" : "pale",
                  },
                ])
              }
              className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
            >
              <Plus className="h-3.5 w-3.5" />
              Add banner
            </button>
          ) : null
        }
      >
        <div className="space-y-4">
          {value.map((promo, index) => (
            <div key={promo.id} className="rounded-[6px] border border-admin-line p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-semibold text-ink">Banner {index + 1}</p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (index === 0) return;
                      const next = [...value];
                      [next[index - 1], next[index]] = [next[index], next[index - 1]];
                      setValue(next);
                    }}
                    disabled={index === 0}
                    className="rounded-[4px] p-1 text-admin-muted hover:bg-tile hover:text-ink disabled:opacity-30"
                    aria-label={`Move banner ${index + 1} up`}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (index === value.length - 1) return;
                      const next = [...value];
                      [next[index + 1], next[index]] = [next[index], next[index + 1]];
                      setValue(next);
                    }}
                    disabled={index === value.length - 1}
                    className="rounded-[4px] p-1 text-admin-muted hover:bg-tile hover:text-ink disabled:opacity-30"
                    aria-label={`Move banner ${index + 1} down`}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue(value.filter((_, position) => position !== index))}
                    className="rounded-[4px] p-1 text-admin-muted hover:bg-danger-pale hover:text-danger"
                    aria-label={`Remove banner ${index + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Field label="Eyebrow" htmlFor={`promo-eyebrow-${index}`}>
                  <input
                    id={`promo-eyebrow-${index}`}
                    className="admin-field"
                    value={promo.eyebrow}
                    onChange={(event) => update(index, { eyebrow: event.target.value })}
                  />
                </Field>
                <Field label="Title" htmlFor={`promo-title-${index}`} error={fieldError(form, `promos.${index}.title`)}>
                  <input
                    id={`promo-title-${index}`}
                    className="admin-field"
                    value={promo.title}
                    onChange={(event) => update(index, { title: event.target.value })}
                  />
                </Field>
                <Field label="Discount line" htmlFor={`promo-discount-${index}`}>
                  <input
                    id={`promo-discount-${index}`}
                    className="admin-field"
                    value={promo.discount}
                    onChange={(event) => update(index, { discount: event.target.value })}
                  />
                </Field>
                <Field label="Tone" htmlFor={`promo-tone-${index}`}>
                  <select
                    id={`promo-tone-${index}`}
                    className="admin-field"
                    value={promo.tone}
                    onChange={(event) => update(index, { tone: event.target.value as "blue" | "pale" })}
                  >
                    <option value="blue">Blue background</option>
                    <option value="pale">Pale background</option>
                  </select>
                </Field>
                <Field label="Button label" htmlFor={`promo-cta-label-${index}`}>
                  <input
                    id={`promo-cta-label-${index}`}
                    className="admin-field"
                    value={promo.cta.label}
                    onChange={(event) => update(index, { cta: { ...promo.cta, label: event.target.value } })}
                  />
                </Field>
                <Field
                  label="Button link"
                  htmlFor={`promo-cta-href-${index}`}
                  error={fieldError(form, `promos.${index}.cta.href`)}
                >
                  <input
                    id={`promo-cta-href-${index}`}
                    className="admin-field"
                    value={promo.cta.href}
                    onChange={(event) => update(index, { cta: { ...promo.cta, href: event.target.value } })}
                  />
                </Field>
                <div className="md:col-span-2">
                  <ImagePicker
                    label="Banner image"
                    value={promo.image}
                    onChange={(image) => update(index, { image })}
                    hint="Portrait or square crops work best. The right half of the banner shows the image."
                  />
                </div>
              </div>
            </div>
          ))}
          {!value.length ? (
            <p className="rounded-[6px] border border-dashed border-admin-line px-3 py-4 text-center text-[12px] text-admin-muted">
              No promo banners. The promo section will render empty.
            </p>
          ) : null}
        </div>
      </FormSection>
    </SettingsSectionForm>
  );
}

export function CategoriesHeadingEditor({ initial }: { initial: SiteContentData["categories"] }) {
  const form = useHomepageSection("categories", initial);
  const { value, setValue } = form;

  return (
    <SettingsSectionForm form={form}>
      <ContentCardHeader
        number={4}
        title="Categories heading"
        description="Heading above the category tiles. Categories themselves are managed in Catalog."
        previewHref="/#categories"
      />
      <FormSection title="Heading">
        <FieldGrid columns={3}>
          <Field label="Eyebrow" htmlFor="categories-eyebrow">
            <input
              id="categories-eyebrow"
              className="admin-field"
              value={value.eyebrow}
              onChange={(event) => setValue({ ...value, eyebrow: event.target.value })}
            />
          </Field>
          <Field label="Title" htmlFor="categories-title" error={fieldError(form, "title")}>
            <input
              id="categories-title"
              className="admin-field"
              value={value.title}
              onChange={(event) => setValue({ ...value, title: event.target.value })}
            />
          </Field>
          <Field label="Empty label" htmlFor="categories-empty">
            <input
              id="categories-empty"
              className="admin-field"
              value={value.emptyLabel}
              onChange={(event) => setValue({ ...value, emptyLabel: event.target.value })}
            />
          </Field>
        </FieldGrid>
      </FormSection>
    </SettingsSectionForm>
  );
}

export function ProductSectionEditor({
  section,
  number,
  title,
  description,
  initial,
  initialOptions,
}: {
  section: "bestSelling" | "featured";
  number: number;
  title: string;
  description: string;
  initial: SiteContentData["bestSelling"];
  initialOptions: ProductOption[];
}) {
  const form = useHomepageSection(section, initial);
  const { value, setValue } = form;

  return (
    <SettingsSectionForm form={form}>
      <ContentCardHeader number={number} title={title} description={description} />
      <FormSection title="Heading and product source">
        <FieldGrid>
          <Field label="Eyebrow" htmlFor={`${section}-eyebrow`}>
            <input
              id={`${section}-eyebrow`}
              className="admin-field"
              value={value.eyebrow}
              onChange={(event) => setValue({ ...value, eyebrow: event.target.value })}
            />
          </Field>
          <Field label="Title" htmlFor={`${section}-title`} error={fieldError(form, "title")}>
            <input
              id={`${section}-title`}
              className="admin-field"
              value={value.title}
              onChange={(event) => setValue({ ...value, title: event.target.value })}
            />
          </Field>
        </FieldGrid>

        <div className="mt-4 rounded-[6px] border border-admin-line p-3">
          <p className="admin-label mb-0">Which products appear</p>
          <div className="mt-2 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-[13px] text-ink">
              <input
                type="radio"
                name={`${section}-mode`}
                checked={value.mode === "automatic"}
                onChange={() => setValue({ ...value, mode: "automatic" })}
              />
              Automatic ordering
            </label>
            <label className="flex items-center gap-2 text-[13px] text-ink">
              <input
                type="radio"
                name={`${section}-mode`}
                checked={value.mode === "manual"}
                onChange={() => setValue({ ...value, mode: "manual" })}
              />
              Choose products manually
            </label>
          </div>
          <p className="admin-help">
            {value.mode === "automatic"
              ? "Uses the storefront ordering from the catalog, limited to the products marked for this section."
              : "Only the products below are shown, in this exact order."}
          </p>
        </div>

        {value.mode === "manual" ? (
          <div className="mt-4">
            <ProductPicker
              value={value.productIds}
              onChange={(productIds) => setValue({ ...value, productIds })}
              initialOptions={initialOptions}
              label="Manual product selection"
            />
          </div>
        ) : null}
      </FormSection>

      <FormSection title="Side banner" description="Tall promotional card shown beside the product grid.">
        <FieldGrid>
          <Field label="Eyebrow" htmlFor={`${section}-banner-eyebrow`}>
            <input
              id={`${section}-banner-eyebrow`}
              className="admin-field"
              value={value.banner.eyebrow}
              onChange={(event) => setValue({ ...value, banner: { ...value.banner, eyebrow: event.target.value } })}
            />
          </Field>
          <Field label="Title" htmlFor={`${section}-banner-title`} error={fieldError(form, "banner.title")}>
            <input
              id={`${section}-banner-title`}
              className="admin-field"
              value={value.banner.title}
              onChange={(event) => setValue({ ...value, banner: { ...value.banner, title: event.target.value } })}
            />
          </Field>
          <Field label="Title accent" htmlFor={`${section}-banner-title-light`}>
            <input
              id={`${section}-banner-title-light`}
              className="admin-field"
              value={value.banner.titleLight}
              onChange={(event) => setValue({ ...value, banner: { ...value.banner, titleLight: event.target.value } })}
            />
          </Field>
          <Field label="Button label" htmlFor={`${section}-banner-cta-label`}>
            <input
              id={`${section}-banner-cta-label`}
              className="admin-field"
              value={value.banner.cta.label}
              onChange={(event) =>
                setValue({ ...value, banner: { ...value.banner, cta: { ...value.banner.cta, label: event.target.value } } })
              }
            />
          </Field>
          <Field label="Button link" htmlFor={`${section}-banner-cta-href`} error={fieldError(form, "banner.cta.href")}>
            <input
              id={`${section}-banner-cta-href`}
              className="admin-field"
              value={value.banner.cta.href}
              onChange={(event) =>
                setValue({ ...value, banner: { ...value.banner, cta: { ...value.banner.cta, href: event.target.value } } })
              }
            />
          </Field>
        </FieldGrid>
        <div className="mt-4">
          <ImagePicker
            label="Banner image"
            value={value.banner.image}
            onChange={(image) => setValue({ ...value, banner: { ...value.banner, image } })}
          />
        </div>
      </FormSection>
    </SettingsSectionForm>
  );
}

export function MeetEditor({ initial }: { initial: SiteContentData["meet"] }) {
  const form = useHomepageSection("meet", initial);
  const { value, setValue } = form;

  return (
    <SettingsSectionForm form={form}>
      <ContentCardHeader
        number={7}
        title="Meet us and newsletter"
        description="Section heading, campaign promo block and the newsletter sign-up card."
      />
      <FormSection title="Section heading">
        <Field label="Title" htmlFor="meet-title" error={fieldError(form, "title")}>
          <input
            id="meet-title"
            className="admin-field"
            value={value.title}
            onChange={(event) => setValue({ ...value, title: event.target.value })}
          />
        </Field>
      </FormSection>

      <FormSection
        title="Campaign promo block"
        description="The dark card appears only while a campaign has its promo block enabled. Its image and title come from the campaign."
      >
        <FieldGrid>
          <Field label="Default discount text" htmlFor="meet-navy-discount">
            <input
              id="meet-navy-discount"
              className="admin-field"
              value={value.navy.discount}
              onChange={(event) => setValue({ ...value, navy: { ...value.navy, discount: event.target.value } })}
            />
          </Field>
          <Field label="Default title" htmlFor="meet-navy-title">
            <input
              id="meet-navy-title"
              className="admin-field"
              value={value.navy.title}
              onChange={(event) => setValue({ ...value, navy: { ...value.navy, title: event.target.value } })}
            />
          </Field>
          <Field label="Button label" htmlFor="meet-navy-cta-label">
            <input
              id="meet-navy-cta-label"
              className="admin-field"
              value={value.navy.cta.label}
              onChange={(event) =>
                setValue({ ...value, navy: { ...value.navy, cta: { ...value.navy.cta, label: event.target.value } } })
              }
            />
          </Field>
          <Field label="Button link fallback" htmlFor="meet-navy-cta-href" error={fieldError(form, "navy.cta.href")}>
            <input
              id="meet-navy-cta-href"
              className="admin-field"
              value={value.navy.cta.href}
              onChange={(event) =>
                setValue({ ...value, navy: { ...value.navy, cta: { ...value.navy.cta, href: event.target.value } } })
              }
            />
          </Field>
        </FieldGrid>
        <div className="mt-4">
          <Field label="Description" htmlFor="meet-navy-description">
            <input
              id="meet-navy-description"
              className="admin-field"
              value={value.navy.description}
              onChange={(event) => setValue({ ...value, navy: { ...value.navy, description: event.target.value } })}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Newsletter card">
        <FieldGrid>
          <Field label="Eyebrow" htmlFor="meet-newsletter-eyebrow">
            <input
              id="meet-newsletter-eyebrow"
              className="admin-field"
              value={value.newsletter.eyebrow}
              onChange={(event) =>
                setValue({ ...value, newsletter: { ...value.newsletter, eyebrow: event.target.value } })
              }
            />
          </Field>
          <Field label="Title" htmlFor="meet-newsletter-title" error={fieldError(form, "newsletter.title")}>
            <input
              id="meet-newsletter-title"
              className="admin-field"
              value={value.newsletter.title}
              onChange={(event) => setValue({ ...value, newsletter: { ...value.newsletter, title: event.target.value } })}
            />
          </Field>
          <Field label="Description" htmlFor="meet-newsletter-description">
            <input
              id="meet-newsletter-description"
              className="admin-field"
              value={value.newsletter.description}
              onChange={(event) =>
                setValue({ ...value, newsletter: { ...value.newsletter, description: event.target.value } })
              }
            />
          </Field>
          <Field label="Input placeholder" htmlFor="meet-newsletter-placeholder">
            <input
              id="meet-newsletter-placeholder"
              className="admin-field"
              value={value.newsletter.placeholder}
              onChange={(event) =>
                setValue({ ...value, newsletter: { ...value.newsletter, placeholder: event.target.value } })
              }
            />
          </Field>
          <Field label="Button label" htmlFor="meet-newsletter-button" error={fieldError(form, "newsletter.button")}>
            <input
              id="meet-newsletter-button"
              className="admin-field"
              value={value.newsletter.button}
              onChange={(event) => setValue({ ...value, newsletter: { ...value.newsletter, button: event.target.value } })}
            />
          </Field>
          <Field label="Success message" htmlFor="meet-newsletter-success">
            <input
              id="meet-newsletter-success"
              className="admin-field"
              value={value.newsletter.success}
              onChange={(event) => setValue({ ...value, newsletter: { ...value.newsletter, success: event.target.value } })}
            />
          </Field>
          <Field label="Error message" htmlFor="meet-newsletter-error">
            <input
              id="meet-newsletter-error"
              className="admin-field"
              value={value.newsletter.error}
              onChange={(event) => setValue({ ...value, newsletter: { ...value.newsletter, error: event.target.value } })}
            />
          </Field>
        </FieldGrid>
      </FormSection>
    </SettingsSectionForm>
  );
}

export function ClientsEditor({ initial }: { initial: SiteContentData["clients"] }) {
  const form = useHomepageSection("clients", initial);
  const { value, setValue } = form;

  const update = (index: number, patch: Partial<SiteContentData["clients"]["logos"][number]>) => {
    setValue({
      ...value,
      logos: value.logos.map((logo, position) => (position === index ? { ...logo, ...patch } : logo)),
    });
  };

  return (
    <SettingsSectionForm form={form}>
      <ContentCardHeader
        number={8}
        title="Client logos"
        description="Logo strip below the newsletter section. Hide all logos to remove the row."
      />
      <FormSection
        title="Logos"
        description="Use transparent PNG or SVG-style images on a light background."
        aside={
          value.logos.length < 12 ? (
            <button
              type="button"
              onClick={() => setValue({ ...value, logos: [...value.logos, { name: "", image: "", href: "#" }] })}
              className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
            >
              <Plus className="h-3.5 w-3.5" />
              Add logo
            </button>
          ) : null
        }
      >
        <Field label="Section title" htmlFor="clients-title" error={fieldError(form, "title")}>
          <input
            id="clients-title"
            className="admin-field"
            value={value.title}
            onChange={(event) => setValue({ ...value, title: event.target.value })}
          />
        </Field>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {value.logos.map((logo, index) => (
            <div key={index} className="rounded-[6px] border border-admin-line p-3">
              <div className="flex items-start justify-between">
                <p className="text-[12px] font-semibold text-ink">Logo {index + 1}</p>
                <button
                  type="button"
                  onClick={() => setValue({ ...value, logos: value.logos.filter((_, position) => position !== index) })}
                  className="rounded-[4px] p-1 text-admin-muted hover:bg-danger-pale hover:text-danger"
                  aria-label={`Remove logo ${index + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-2 space-y-2">
                <input
                  className="admin-field"
                  aria-label={`Logo ${index + 1} name`}
                  placeholder="Client name"
                  value={logo.name}
                  onChange={(event) => update(index, { name: event.target.value })}
                />
                <input
                  className="admin-field"
                  aria-label={`Logo ${index + 1} link`}
                  placeholder="https://client.example or #"
                  value={logo.href}
                  onChange={(event) => update(index, { href: event.target.value })}
                />
                <ImagePicker label="Logo image" value={logo.image} onChange={(image) => update(index, { image })} />
              </div>
            </div>
          ))}
        </div>
        {!value.logos.length ? (
          <p className="mt-3 rounded-[6px] border border-dashed border-admin-line px-3 py-4 text-center text-[12px] text-admin-muted">
            No client logos. The client strip will be hidden.
          </p>
        ) : null}
      </FormSection>
    </SettingsSectionForm>
  );
}

const SECTION_LABELS: Record<SiteContentData["sectionOrder"][number], string> = {
  hero: "Hero banners",
  sale: "Sale strip",
  promos: "Promo banners",
  categories: "Categories",
  bestSelling: "Best selling products",
  featured: "Featured products",
  inStock: "In stock products",
  meet: "Meet us and newsletter",
  clients: "Client logos",
};

const ALL_SECTIONS = Object.keys(SECTION_LABELS) as Array<SiteContentData["sectionOrder"][number]>;

export function SectionOrderEditor({ initial }: { initial: SiteContentData["sectionOrder"] }) {
  const form = useHomepageSection("sectionOrder", initial);
  const { value, setValue } = form;

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    setValue(next);
  };

  const missing = ALL_SECTIONS.filter((section) => !value.includes(section));

  return (
    <SettingsSectionForm form={form}>
      <ContentCardHeader
        number={9}
        title="Section order"
        description="Control the order of homepage blocks and hide the ones you do not need."
      />
      <FormSection title="Homepage blocks">
        <ol className="space-y-2">
          {value.map((section, index) => (
            <li
              key={section}
              className="flex items-center gap-2 rounded-[6px] border border-admin-line bg-white px-3 py-2"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-tile text-[10px] font-semibold text-admin-muted">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 text-[13px] text-ink">{SECTION_LABELS[section]}</span>
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                className="rounded-[4px] p-1 text-admin-muted hover:bg-tile hover:text-ink disabled:opacity-30"
                aria-label={`Move ${SECTION_LABELS[section]} up`}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === value.length - 1}
                className="rounded-[4px] p-1 text-admin-muted hover:bg-tile hover:text-ink disabled:opacity-30"
                aria-label={`Move ${SECTION_LABELS[section]} down`}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setValue(value.filter((entry) => entry !== section))}
                className="rounded-[4px] p-1 text-admin-muted hover:bg-danger-pale hover:text-danger"
                aria-label={`Hide ${SECTION_LABELS[section]}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ol>
        {!value.length ? (
          <p className="mt-3 rounded-[6px] border border-danger/25 bg-danger-pale px-3 py-2 text-[12px] text-danger">
            At least one section must remain visible.
          </p>
        ) : null}
        {missing.length ? (
          <div className="mt-4">
            <p className="admin-label">Hidden sections</p>
            <div className="flex flex-wrap gap-2">
              {missing.map((section) => (
                <button
                  key={section}
                  type="button"
                  onClick={() => setValue([...value, section])}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-dashed border-admin-line bg-white px-3 text-[12px] text-admin-muted hover:border-brand hover:text-ink"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {SECTION_LABELS[section]}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <p className="admin-help">
          Hidden sections stop rendering on the storefront but keep their saved content. Add them back at any time.
        </p>
      </FormSection>
    </SettingsSectionForm>
  );
}
