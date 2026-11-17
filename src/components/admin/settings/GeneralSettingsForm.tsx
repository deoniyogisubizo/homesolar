"use client";

import { saveGeneralSettingsAction } from "@/app/(admin)/admin/settings/actions";
import { Field, FieldGrid, FormSection } from "@/components/admin/FormSection";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { useSectionForm, SettingsSectionForm, fieldError } from "@/components/admin/settings/SettingsForm";
import type { GeneralSettings } from "@/lib/admin/settings-defaults";

export function GeneralSettingsForm({ initial }: { initial: GeneralSettings }) {
  const form = useSectionForm(initial, saveGeneralSettingsAction);
  const { value, setValue } = form;

  return (
    <SettingsSectionForm form={form}>
      <FormSection title="Store identity" description="Shown in the browser tab, emails, invoices and storefront header.">
        <FieldGrid>
          <Field label="Store name" htmlFor="storeName" error={fieldError(form, "storeName")}>
            <input
              id="storeName"
              className="admin-field"
              value={value.storeName}
              onChange={(event) => setValue({ ...value, storeName: event.target.value })}
            />
          </Field>
          <Field label="Tagline" htmlFor="tagline" error={fieldError(form, "tagline")}>
            <input
              id="tagline"
              className="admin-field"
              value={value.tagline}
              onChange={(event) => setValue({ ...value, tagline: event.target.value })}
            />
          </Field>
        </FieldGrid>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <ImagePicker
            label="Logo"
            value={value.logo}
            onChange={(logo) => setValue({ ...value, logo })}
            hint="Used on light backgrounds."
          />
          <ImagePicker
            label="Light logo"
            value={value.logoLight}
            onChange={(logoLight) => setValue({ ...value, logoLight })}
            hint="Used on the dark footer."
          />
          <ImagePicker
            label="Favicon"
            value={value.favicon}
            onChange={(favicon) => setValue({ ...value, favicon })}
            hint="Square image, at least 32 by 32 pixels."
          />
        </div>
      </FormSection>

      <FormSection title="Currency and timezone" description="Applies to prices, orders and date fields across the dashboard.">
        <FieldGrid columns={3}>
          <Field label="Currency code" htmlFor="currency" error={fieldError(form, "currency")}>
            <input
              id="currency"
              className="admin-field"
              value={value.currency}
              maxLength={3}
              onChange={(event) => setValue({ ...value, currency: event.target.value.toUpperCase() })}
            />
          </Field>
          <Field label="Currency symbol" htmlFor="currencySymbol" error={fieldError(form, "currencySymbol")}>
            <input
              id="currencySymbol"
              className="admin-field"
              value={value.currencySymbol}
              onChange={(event) => setValue({ ...value, currencySymbol: event.target.value })}
            />
          </Field>
          <Field label="Price display" htmlFor="currencyFormat">
            <select
              id="currencyFormat"
              className="admin-field"
              value={value.currencyFormat}
              onChange={(event) =>
                setValue({ ...value, currencyFormat: event.target.value as GeneralSettings["currencyFormat"] })
              }
            >
              <option value="code">Code before amount (RWF 10,000)</option>
              <option value="symbol">Symbol before amount (FRw 10,000)</option>
            </select>
          </Field>
        </FieldGrid>
        <FieldGrid>
          <Field
            label="Timezone"
            htmlFor="timezone"
            hint="Campaign start and end times are entered in this timezone."
            error={fieldError(form, "timezone")}
          >
            <input
              id="timezone"
              className="admin-field"
              value={value.timezone}
              onChange={(event) => setValue({ ...value, timezone: event.target.value })}
            />
          </Field>
        </FieldGrid>
      </FormSection>

      <FormSection
        title="Maintenance mode"
        description="Admins keep full access while the storefront shows a maintenance notice."
        aside={
          <label className="flex items-start gap-2 text-[13px] text-ink">
            <input
              type="checkbox"
              checked={value.maintenanceMode}
              onChange={(event) => setValue({ ...value, maintenanceMode: event.target.checked })}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              Enable maintenance mode
              <span className="mt-1 block text-[12px] text-admin-muted">The storefront is hidden from shoppers.</span>
            </span>
          </label>
        }
      >
        <Field label="Maintenance message" htmlFor="maintenanceMessage" error={fieldError(form, "maintenanceMessage")}>
          <textarea
            id="maintenanceMessage"
            className="admin-field admin-textarea"
            value={value.maintenanceMessage}
            onChange={(event) => setValue({ ...value, maintenanceMessage: event.target.value })}
          />
        </Field>
      </FormSection>
    </SettingsSectionForm>
  );
}
