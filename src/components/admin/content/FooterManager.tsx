"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ExternalLink, Plus, Trash2 } from "lucide-react";
import { saveFooterAction } from "@/app/(admin)/admin/(dashboard)/storefront/actions";
import { Field, FormSection } from "@/components/admin/FormSection";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { SettingsSectionForm, fieldError, useSectionForm } from "@/components/admin/settings/SettingsForm";
import type { SiteContentData } from "@/types";

export function FooterManager({ initial }: { initial: SiteContentData["footer"] }) {
  const form = useSectionForm(initial, saveFooterAction);
  const { value, setValue } = form;

  const updateColumn = (index: number, patch: Partial<SiteContentData["footer"]["columns"][number]>) => {
    setValue({
      ...value,
      columns: value.columns.map((column, position) => (position === index ? { ...column, ...patch } : column)),
    });
  };

  const updateLink = (columnIndex: number, linkIndex: number, patch: Partial<{ label: string; href: string }>) => {
    updateColumn(columnIndex, {
      links: value.columns[columnIndex].links.map((link, position) =>
        position === linkIndex ? { ...link, ...patch } : link,
      ),
    });
  };

  return (
    <SettingsSectionForm form={form} label="Footer changes are not saved yet.">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <FormSection
            title="Contact details"
            description="The address, phone, email and social icons shown in the footer come from Contact and social settings."
          >
            <div className="rounded-[6px] border border-admin-line bg-tile px-3 py-2 text-[12px] leading-6 text-admin-muted">
              <p>{value.address || "No address set"}</p>
              <p>{value.phone || "No phone set"}</p>
              <p>{value.email || "No email set"}</p>
              <p>
                {value.socials.length} social icon{value.socials.length === 1 ? "" : "s"} configured
              </p>
            </div>
            <Link
              href="/admin/settings/contact"
              className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
            >
              Edit contact and social details
              <ExternalLink className="h-3 w-3" />
            </Link>
          </FormSection>

          <FormSection
            title="Link columns"
            description="Two columns fit the storefront layout. Each column can hold up to twelve links."
            aside={
              value.columns.length < 6 ? (
                <button
                  type="button"
                  onClick={() => setValue({ ...value, columns: [...value.columns, { title: "", links: [] }] })}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add column
                </button>
              ) : null
            }
          >
            <div className="space-y-3">
              {value.columns.map((column, index) => (
                <div key={index} className="rounded-[6px] border border-admin-line p-3">
                  <div className="flex items-end gap-2">
                    <Field
                      label={`Column ${index + 1} title`}
                      htmlFor={`footer-column-${index}`}
                      error={fieldError(form, `columns.${index}.title`)}
                      className="flex-1"
                    >
                      <input
                        id={`footer-column-${index}`}
                        className="admin-field"
                        value={column.title}
                        onChange={(event) => updateColumn(index, { title: event.target.value })}
                      />
                    </Field>
                    <div className="flex items-center gap-1 pb-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (index === 0) return;
                          const next = [...value.columns];
                          [next[index - 1], next[index]] = [next[index], next[index - 1]];
                          setValue({ ...value, columns: next });
                        }}
                        disabled={index === 0}
                        className="rounded-[4px] p-1 text-admin-muted hover:bg-tile hover:text-ink disabled:opacity-30"
                        aria-label={`Move column ${index + 1} up`}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (index === value.columns.length - 1) return;
                          const next = [...value.columns];
                          [next[index + 1], next[index]] = [next[index], next[index + 1]];
                          setValue({ ...value, columns: next });
                        }}
                        disabled={index === value.columns.length - 1}
                        className="rounded-[4px] p-1 text-admin-muted hover:bg-tile hover:text-ink disabled:opacity-30"
                        aria-label={`Move column ${index + 1} down`}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setValue({ ...value, columns: value.columns.filter((_, position) => position !== index) })}
                        className="rounded-[4px] p-1 text-admin-muted hover:bg-danger-pale hover:text-danger"
                        aria-label={`Remove column ${index + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {column.links.map((link, linkIndex) => (
                      <div key={linkIndex} className="grid gap-1.5 sm:grid-cols-[1fr_1.3fr_32px]">
                        <input
                          className="admin-field h-8 text-[12px]"
                          aria-label={`Column ${index + 1} link label ${linkIndex + 1}`}
                          placeholder="Label"
                          value={link.label}
                          onChange={(event) => updateLink(index, linkIndex, { label: event.target.value })}
                        />
                        <input
                          className="admin-field h-8 text-[12px]"
                          aria-label={`Column ${index + 1} link URL ${linkIndex + 1}`}
                          placeholder="/shipping-and-delivery"
                          value={link.href}
                          onChange={(event) => updateLink(index, linkIndex, { href: event.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateColumn(index, {
                              links: column.links.filter((_, position) => position !== linkIndex),
                            })
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-[4px] text-admin-muted hover:bg-danger-pale hover:text-danger"
                          aria-label={`Remove column ${index + 1} link ${linkIndex + 1}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {column.links.length < 12 ? (
                      <button
                        type="button"
                        onClick={() => updateColumn(index, { links: [...column.links, { label: "", href: "/" }] })}
                        className="inline-flex h-7 items-center gap-1 rounded-[4px] px-2 text-[11px] font-medium text-brand-deep hover:bg-brand-pale"
                      >
                        <Plus className="h-3 w-3" />
                        Add link
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
              {!value.columns.length ? (
                <p className="rounded-[6px] border border-dashed border-admin-line px-3 py-4 text-center text-[12px] text-admin-muted">
                  No link columns. Only the contact block, Instagram card and copyright will show.
                </p>
              ) : null}
            </div>
          </FormSection>

          <FormSection title="Instagram card" description="Image card in the last footer column.">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Heading" htmlFor="footer-instagram-title" error={fieldError(form, "instagram.title")}>
                <input
                  id="footer-instagram-title"
                  className="admin-field"
                  value={value.instagram.title}
                  onChange={(event) =>
                    setValue({ ...value, instagram: { ...value.instagram, title: event.target.value } })
                  }
                />
              </Field>
              <Field label="Profile link" htmlFor="footer-instagram-href" error={fieldError(form, "instagram.href")}>
                <input
                  id="footer-instagram-href"
                  className="admin-field"
                  value={value.instagram.href}
                  onChange={(event) =>
                    setValue({ ...value, instagram: { ...value.instagram, href: event.target.value } })
                  }
                />
              </Field>
            </div>
            <div className="mt-3">
              <ImagePicker
                label="Card image"
                value={value.instagram.image}
                onChange={(image) => setValue({ ...value, instagram: { ...value.instagram, image } })}
                hint="Wide image, around 470 by 225 pixels."
              />
            </div>
          </FormSection>

          <FormSection title="Copyright line" description="Shown at the bottom of every storefront page.">
            <Field label="Copyright text" htmlFor="footer-copyright" error={fieldError(form, "copyright")}>
              <input
                id="footer-copyright"
                className="admin-field"
                value={value.copyright}
                onChange={(event) => setValue({ ...value, copyright: event.target.value })}
              />
            </Field>
          </FormSection>
        </div>

        <aside className="h-fit space-y-3 xl:sticky xl:top-[84px]">
          <div className="rounded-[8px] bg-navy p-5 text-white">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">Footer preview</p>
            <p className="mt-3 text-[12px] leading-5 text-white/75">{value.address}</p>
            <p className="text-[12px] text-white/75">{value.phone}</p>
            <p className="text-[12px] text-white/75">{value.email}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {value.columns.map((column, index) => (
                <div key={index}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em]">{column.title || "Untitled"}</p>
                  <ul className="mt-1.5 space-y-1 text-[11px] text-white/65">
                    {column.links.map((link, linkIndex) => (
                      <li key={linkIndex}>{link.label || "Untitled"}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-5 border-t border-white/15 pt-3 text-[10px] text-white/55">{value.copyright}</p>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
          >
            Preview footer on site
            <ExternalLink className="h-3 w-3" />
          </a>
        </aside>
      </div>
    </SettingsSectionForm>
  );
}
