"use client";

import { Plus, Trash2 } from "lucide-react";
import { saveContactSettingsAction } from "@/app/(admin)/admin/settings/actions";
import { Field, FieldGrid, FormSection } from "@/components/admin/FormSection";
import { useSectionForm, SettingsSectionForm, fieldError } from "@/components/admin/settings/SettingsForm";
import { buildWhatsAppLink, normalizePhone } from "@/lib/whatsapp-core";
import type { ContactSettings } from "@/lib/admin/settings-defaults";

const platforms: Array<ContactSettings["socials"][number]["platform"]> = [
  "facebook",
  "instagram",
  "twitter",
  "linkedin",
  "youtube",
];

export function ContactSettingsForm({ initial }: { initial: ContactSettings }) {
  const form = useSectionForm(initial, saveContactSettingsAction);
  const { value, setValue } = form;
  const normalizedWhatsApp = normalizePhone(value.whatsappNumber);

  const updateSocial = (index: number, patch: Partial<ContactSettings["socials"][number]>) => {
    setValue({
      ...value,
      socials: value.socials.map((social, position) => (position === index ? { ...social, ...patch } : social)),
    });
  };

  return (
    <SettingsSectionForm form={form}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <FormSection title="Phone and email" description="These values feed the storefront footer, contact page, invoices and email templates.">
            <FieldGrid>
              <Field
                label="Primary phone"
                htmlFor="primaryPhone"
                hint="Include the country code, for example +250788123456."
                error={fieldError(form, "primaryPhone")}
              >
                <input
                  id="primaryPhone"
                  className="admin-field"
                  value={value.primaryPhone}
                  onChange={(event) => setValue({ ...value, primaryPhone: event.target.value })}
                />
              </Field>
              <Field label="Secondary phone" htmlFor="secondaryPhone" error={fieldError(form, "secondaryPhone")}>
                <input
                  id="secondaryPhone"
                  className="admin-field"
                  value={value.secondaryPhone}
                  onChange={(event) => setValue({ ...value, secondaryPhone: event.target.value })}
                />
              </Field>
              <Field
                label="WhatsApp number"
                htmlFor="whatsappNumber"
                hint={
                  normalizedWhatsApp
                    ? `Saved as ${normalizedWhatsApp}`
                    : "Use an international number, for example +250788123456. Leave empty to pause WhatsApp ordering."
                }
                error={fieldError(form, "whatsappNumber")}
              >
                <input
                  id="whatsappNumber"
                  className="admin-field"
                  value={value.whatsappNumber}
                  onChange={(event) => setValue({ ...value, whatsappNumber: event.target.value })}
                />
              </Field>
              <Field label="Working hours" htmlFor="workingHours" error={fieldError(form, "workingHours")}>
                <input
                  id="workingHours"
                  className="admin-field"
                  value={value.workingHours}
                  onChange={(event) => setValue({ ...value, workingHours: event.target.value })}
                />
              </Field>
              <Field label="Support email" htmlFor="supportEmail" error={fieldError(form, "supportEmail")}>
                <input
                  id="supportEmail"
                  type="email"
                  className="admin-field"
                  value={value.supportEmail}
                  onChange={(event) => setValue({ ...value, supportEmail: event.target.value })}
                />
              </Field>
              <Field label="Sales email" htmlFor="salesEmail" error={fieldError(form, "salesEmail")}>
                <input
                  id="salesEmail"
                  type="email"
                  className="admin-field"
                  value={value.salesEmail}
                  onChange={(event) => setValue({ ...value, salesEmail: event.target.value })}
                />
              </Field>
            </FieldGrid>
            <div className="mt-4">
              <FieldGrid>
                <Field label="Physical address" htmlFor="address" error={fieldError(form, "address")}>
                  <textarea
                    id="address"
                    className="admin-field admin-textarea"
                    value={value.address}
                    onChange={(event) => setValue({ ...value, address: event.target.value })}
                  />
                </Field>
                <Field label="Map link" htmlFor="mapUrl" error={fieldError(form, "mapUrl")}>
                  <input
                    id="mapUrl"
                    className="admin-field"
                    value={value.mapUrl}
                    onChange={(event) => setValue({ ...value, mapUrl: event.target.value })}
                  />
                </Field>
              </FieldGrid>
            </div>
          </FormSection>

          <FormSection
            title="Social links"
            description="Icons appear in the footer and contact page. Remove a row to hide that network."
            aside={
              <button
                type="button"
                onClick={() =>
                  setValue({
                    ...value,
                    socials: [...value.socials, { platform: "facebook", label: "Facebook", href: "https://" }],
                  })
                }
                className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
              >
                <Plus className="h-3.5 w-3.5" />
                Add link
              </button>
            }
          >
            <div className="space-y-2">
              {value.socials.map((social, index) => (
                <div key={`${social.platform}-${index}`} className="grid gap-2 rounded-[6px] border border-admin-line p-3 md:grid-cols-[150px_1fr_1.4fr_40px]">
                  <select
                    className="admin-field"
                    aria-label={`Social platform row ${index + 1}`}
                    value={social.platform}
                    onChange={(event) =>
                      updateSocial(index, {
                        platform: event.target.value as ContactSettings["socials"][number]["platform"],
                      })
                    }
                  >
                    {platforms.map((platform) => (
                      <option key={platform} value={platform}>
                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </option>
                    ))}
                  </select>
                  <input
                    className="admin-field"
                    aria-label={`Social label row ${index + 1}`}
                    value={social.label}
                    placeholder="Label"
                    onChange={(event) => updateSocial(index, { label: event.target.value })}
                  />
                  <input
                    className="admin-field"
                    aria-label={`Social URL row ${index + 1}`}
                    value={social.href}
                    placeholder="https://"
                    onChange={(event) => updateSocial(index, { href: event.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setValue({ ...value, socials: value.socials.filter((_, position) => position !== index) })
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-admin-line text-admin-muted hover:border-danger/40 hover:text-danger"
                    aria-label={`Remove social link ${index + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {!value.socials.length ? (
                <p className="rounded-[6px] border border-dashed border-admin-line px-3 py-4 text-center text-[12px] text-admin-muted">
                  No social links yet.
                </p>
              ) : null}
            </div>
            {fieldError(form, "socials") ? <p className="admin-error">{fieldError(form, "socials")}</p> : null}
          </FormSection>
        </div>

        <aside className="h-fit rounded-[8px] border border-admin-line bg-navy p-5 text-white xl:sticky xl:top-[76px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">Footer preview</p>
          <p className="mt-3 text-[15px] font-semibold">Contact</p>
          <ul className="mt-3 space-y-2 text-[12px] leading-5 text-white/75">
            <li>{value.address || "Address not set"}</li>
            <li>{value.primaryPhone || "Phone not set"}</li>
            {value.secondaryPhone ? <li>{value.secondaryPhone}</li> : null}
            <li>{value.supportEmail || "Email not set"}</li>
            <li>{value.workingHours}</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {value.socials.map((social, index) => (
              <span
                key={`${social.label}-${index}`}
                className="rounded-full border border-white/20 px-2 py-1 text-[10px] text-white/80"
              >
                {social.label || social.platform}
              </span>
            ))}
          </div>
          {normalizedWhatsApp ? (
            <a
              href={buildWhatsAppLink(normalizedWhatsApp, "Hello, I have a question.") ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex h-8 items-center rounded-[5px] bg-white px-3 text-[11px] font-semibold text-navy"
            >
              WhatsApp link
            </a>
          ) : null}
        </aside>
      </div>
    </SettingsSectionForm>
  );
}
