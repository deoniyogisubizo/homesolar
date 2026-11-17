"use client";

import { Plus, Trash2 } from "lucide-react";
import { saveShippingSettingsAction } from "@/app/(admin)/admin/settings/actions";
import { Field, FieldGrid, FormSection } from "@/components/admin/FormSection";
import { useSectionForm, SettingsSectionForm, fieldError } from "@/components/admin/settings/SettingsForm";
import type { ShippingSettings } from "@/lib/admin/settings-defaults";

const paymentLabels: Array<{ key: keyof ShippingSettings["payments"]; label: string; hint: string }> = [
  { key: "cashOnDelivery", label: "Cash on delivery", hint: "Enabled by default." },
  { key: "mobileMoney", label: "Mobile Money", hint: "Provider adapter not configured yet." },
  { key: "card", label: "Card payment", hint: "Provider adapter not configured yet." },
];

export function ShippingSettingsForm({ initial }: { initial: ShippingSettings }) {
  const form = useSectionForm(initial, saveShippingSettingsAction);
  const { value, setValue } = form;

  return (
    <SettingsSectionForm form={form}>
      <FormSection title="Delivery pricing" description="The threshold and tax rate are applied by the pricing engine at order creation.">
        <FieldGrid columns={3}>
          <Field label="Free shipping threshold" htmlFor="freeShippingThreshold" error={fieldError(form, "freeShippingThreshold")}>
            <input
              id="freeShippingThreshold"
              type="number"
              min={0}
              step="0.01"
              className="admin-field"
              value={value.freeShippingThreshold}
              onChange={(event) =>
                setValue({ ...value, freeShippingThreshold: Number(event.target.value) })
              }
            />
          </Field>
          <Field label="Tax rate (%)" htmlFor="taxRate" error={fieldError(form, "taxRate")}>
            <input
              id="taxRate"
              type="number"
              min={0}
              max={100}
              step="0.01"
              className="admin-field"
              value={value.taxRate}
              onChange={(event) => setValue({ ...value, taxRate: Number(event.target.value) })}
            />
          </Field>
          <Field label="Shipping note" htmlFor="shippingNote" error={fieldError(form, "shippingNote")}>
            <input
              id="shippingNote"
              className="admin-field"
              value={value.shippingNote}
              onChange={(event) => setValue({ ...value, shippingNote: event.target.value })}
            />
          </Field>
        </FieldGrid>
      </FormSection>

      <FormSection
        title="Shipping zones"
        description="District-based rates used by checkout and by orders created in the dashboard."
        aside={
          <button
            type="button"
            onClick={() => setValue({ ...value, zones: [...value.zones, { district: "", rate: 0, eta: "" }] })}
            className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
          >
            <Plus className="h-3.5 w-3.5" />
            Add zone
          </button>
        }
      >
        <div className="space-y-2">
          {value.zones.map((zone, index) => (
            <div key={index} className="grid gap-2 rounded-[6px] border border-admin-line p-3 md:grid-cols-[1.2fr_140px_1fr_40px]">
              <input
                className="admin-field"
                aria-label={`Zone district ${index + 1}`}
                placeholder="District or province"
                value={zone.district}
                onChange={(event) =>
                  setValue({
                    ...value,
                    zones: value.zones.map((row, position) =>
                      position === index ? { ...row, district: event.target.value } : row,
                    ),
                  })
                }
              />
              <input
                className="admin-field"
                type="number"
                min={0}
                step="0.01"
                aria-label={`Zone rate ${index + 1}`}
                placeholder="Rate"
                value={zone.rate}
                onChange={(event) =>
                  setValue({
                    ...value,
                    zones: value.zones.map((row, position) =>
                      position === index ? { ...row, rate: Number(event.target.value) } : row,
                    ),
                  })
                }
              />
              <input
                className="admin-field"
                aria-label={`Zone delivery time ${index + 1}`}
                placeholder="1-2 business days"
                value={zone.eta}
                onChange={(event) =>
                  setValue({
                    ...value,
                    zones: value.zones.map((row, position) =>
                      position === index ? { ...row, eta: event.target.value } : row,
                    ),
                  })
                }
              />
              <button
                type="button"
                onClick={() => setValue({ ...value, zones: value.zones.filter((_, position) => position !== index) })}
                className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-admin-line text-admin-muted hover:border-danger/40 hover:text-danger"
                aria-label={`Remove zone ${index + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection title="Payment methods" description="Only enabled methods appear at checkout. Provider adapters can be added later without changing settings.">
        <div className="grid gap-2 md:grid-cols-3">
          {paymentLabels.map((payment) => (
            <label key={payment.key} className="flex items-start gap-2 rounded-[6px] border border-admin-line p-3 text-[13px] text-ink">
              <input
                type="checkbox"
                checked={value.payments[payment.key]}
                onChange={(event) =>
                  setValue({
                    ...value,
                    payments: { ...value.payments, [payment.key]: event.target.checked },
                  })
                }
                className="mt-0.5 h-4 w-4"
              />
              <span>
                {payment.label}
                <span className="mt-0.5 block text-[11px] text-admin-muted">{payment.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </FormSection>

      <FormSection
        title="Trust badges"
        description="Shown below the buy button on product pages. Up to four badges."
        aside={
          value.trustBadges.length < 4 ? (
            <button
              type="button"
              onClick={() =>
                setValue({
                  ...value,
                  trustBadges: [...value.trustBadges, { icon: "truck", title: "", subtitle: "" }],
                })
              }
              className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
            >
              <Plus className="h-3.5 w-3.5" />
              Add badge
            </button>
          ) : null
        }
      >
        <div className="space-y-2">
          {value.trustBadges.map((badge, index) => (
            <div key={index} className="grid gap-2 rounded-[6px] border border-admin-line p-3 md:grid-cols-[120px_1fr_1.2fr_40px]">
              <input
                className="admin-field"
                aria-label={`Badge icon ${index + 1}`}
                placeholder="truck"
                value={badge.icon}
                onChange={(event) =>
                  setValue({
                    ...value,
                    trustBadges: value.trustBadges.map((row, position) =>
                      position === index ? { ...row, icon: event.target.value } : row,
                    ),
                  })
                }
              />
              <input
                className="admin-field"
                aria-label={`Badge title ${index + 1}`}
                placeholder="Free Shipping"
                value={badge.title}
                onChange={(event) =>
                  setValue({
                    ...value,
                    trustBadges: value.trustBadges.map((row, position) =>
                      position === index ? { ...row, title: event.target.value } : row,
                    ),
                  })
                }
              />
              <input
                className="admin-field"
                aria-label={`Badge subtitle ${index + 1}`}
                placeholder="On orders over $50"
                value={badge.subtitle}
                onChange={(event) =>
                  setValue({
                    ...value,
                    trustBadges: value.trustBadges.map((row, position) =>
                      position === index ? { ...row, subtitle: event.target.value } : row,
                    ),
                  })
                }
              />
              <button
                type="button"
                onClick={() =>
                  setValue({
                    ...value,
                    trustBadges: value.trustBadges.filter((_, position) => position !== index),
                  })
                }
                className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-admin-line text-admin-muted hover:border-danger/40 hover:text-danger"
                aria-label={`Remove badge ${index + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </FormSection>
    </SettingsSectionForm>
  );
}
