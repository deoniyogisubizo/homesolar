"use client";

import { useMemo, useState } from "react";
import { ExternalLink, RotateCcw } from "lucide-react";
import { saveWhatsAppSettingsAction } from "@/app/(admin)/admin/settings/actions";
import { Field, FieldGrid, FormSection } from "@/components/admin/FormSection";
import { useSectionForm, SettingsSectionForm, fieldError } from "@/components/admin/settings/SettingsForm";
import {
  DEFAULT_ORDER_MESSAGE_TEMPLATE,
  DEFAULT_STAFF_REPLY_TEMPLATE,
  type WhatsAppOrderSettings,
} from "@/lib/admin/settings-defaults";
import { buildOrderMessage, buildWhatsAppLink, normalizePhone, renderWhatsAppTemplate } from "@/lib/whatsapp-core";

type CheckoutSettingsValue = {
  whatsappOrder: WhatsAppOrderSettings;
  freeShippingThreshold: number;
};

const VARIABLES = [
  "storeName",
  "customerName",
  "customerPhone",
  "orderNumber",
  "items",
  "itemCount",
  "subtotal",
  "discount",
  "total",
  "deliveryLocation",
  "notes",
];

export function WhatsAppSettingsForm({
  initial,
  whatsappNumber,
  storeName,
}: {
  initial: CheckoutSettingsValue;
  whatsappNumber: string;
  storeName: string;
}) {
  const form = useSectionForm(initial, saveWhatsAppSettingsAction);
  const { value, setValue } = form;
  const [testOpen, setTestOpen] = useState(false);
  const settings = value.whatsappOrder;

  const preview = useMemo(
    () =>
      buildOrderMessage({
        template: settings.messageTemplate,
        storeName,
        customerName: "Aline Uwase",
        customerPhone: whatsappNumber || "+250788123456",
        orderNumber: `${settings.orderPrefix || "SH"}-000123`,
        items: [
          {
            name: "Monocrystalline Solar Panel 550W",
            options: ["Blue", "550W"],
            quantity: 2,
            lineTotal: 598,
          },
        ],
        subtotal: 598,
        discount: 0,
        total: 598,
        deliveryLocation: "Gasabo, Kimironko",
        notes: "Please call before delivery.",
      }),
    [settings.messageTemplate, settings.orderPrefix, storeName, whatsappNumber],
  );

  const staffPreview = renderWhatsAppTemplate(settings.staffReplyTemplate, {
    storeName,
    customerName: "Aline Uwase",
    customerPhone: "+250788123456",
    orderNumber: `${settings.orderPrefix || "SH"}-000123`,
  });
  const normalized = normalizePhone(whatsappNumber);
  const testLink = normalized ? buildWhatsAppLink(normalized, staffPreview) : null;

  const update = (patch: Partial<WhatsAppOrderSettings>) =>
    setValue({ ...value, whatsappOrder: { ...settings, ...patch } });

  return (
    <SettingsSectionForm form={form}>
      <FormSection
        title="Order handoff"
        description="The order is saved before WhatsApp opens. The link always uses the number saved under Contact and social."
        aside={
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-admin-muted">Order reference</p>
            <p className="rounded-[6px] bg-tile px-3 py-2 font-mono text-[13px] text-ink">
              {(settings.orderPrefix || "SH")}-000123
            </p>
            {normalized ? (
              <p className="text-[11px] text-admin-muted">Sending to {normalized}</p>
            ) : (
              <p className="rounded-[6px] border border-warning/30 bg-warning-pale px-3 py-2 text-[11px] text-warning">
                No WhatsApp number is configured. Checkout stays disabled until you add one under Contact and social.
              </p>
            )}
          </div>
        }
      >
        <FieldGrid columns={3}>
          <Field label="Order prefix" htmlFor="orderPrefix" error={fieldError(form, "whatsappOrder.orderPrefix")}>
            <input
              id="orderPrefix"
              className="admin-field"
              value={settings.orderPrefix}
              maxLength={8}
              onChange={(event) => update({ orderPrefix: event.target.value.toUpperCase() })}
            />
          </Field>
          <Field
            label="Follow-up threshold (minutes)"
            htmlFor="followUpMinutes"
            hint="New orders older than this appear in Needs follow-up."
            error={fieldError(form, "whatsappOrder.followUpMinutes")}
          >
            <input
              id="followUpMinutes"
              type="number"
              min={5}
              max={1440}
              className="admin-field"
              value={settings.followUpMinutes}
              onChange={(event) => update({ followUpMinutes: Number(event.target.value) })}
            />
          </Field>
          <Field
            label="Free shipping threshold"
            htmlFor="freeShippingThreshold"
            hint="Stored with shipping settings and used by the pricing engine."
            error={fieldError(form, "freeShippingThreshold")}
          >
            <input
              id="freeShippingThreshold"
              type="number"
              min={0}
              step="0.01"
              className="admin-field"
              value={value.freeShippingThreshold}
              onChange={(event) => setValue({ ...value, freeShippingThreshold: Number(event.target.value) })}
            />
          </Field>
        </FieldGrid>
        <div className="mt-4">
          <FieldGrid>
            <Field label="Cart helper text" htmlFor="cartHelperText" error={fieldError(form, "whatsappOrder.cartHelperText")}>
              <input
                id="cartHelperText"
                className="admin-field"
                value={settings.cartHelperText}
                onChange={(event) => update({ cartHelperText: event.target.value })}
              />
            </Field>
            <Field
              label="Checkout helper text"
              htmlFor="checkoutHelperText"
              error={fieldError(form, "whatsappOrder.checkoutHelperText")}
            >
              <input
                id="checkoutHelperText"
                className="admin-field"
                value={settings.checkoutHelperText}
                onChange={(event) => update({ checkoutHelperText: event.target.value })}
              />
            </Field>
          </FieldGrid>
        </div>
        <label className="mt-4 flex items-start gap-2 text-[13px] text-ink">
          <input
            type="checkbox"
            checked={settings.customerOrderEmail}
            onChange={(event) => update({ customerOrderEmail: event.target.checked })}
            className="mt-0.5 h-4 w-4"
          />
          <span>
            Email the customer a copy of the order
            <span className="mt-0.5 block text-[11px] text-admin-muted">
              Sent after the order is saved. A failed email never blocks or cancels the order.
            </span>
          </span>
        </label>
      </FormSection>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <FormSection
          title="WhatsApp message"
          description="Insert variables with double braces. Empty variables render as nothing."
          aside={
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">Variables</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {VARIABLES.map((name) => (
                  <code key={name} className="rounded-[4px] bg-tile px-1.5 py-0.5 text-[10px] text-ink">
                    {`{{${name}}}`}
                  </code>
                ))}
              </div>
            </div>
          }
        >
          <Field
            label="Order message template"
            htmlFor="messageTemplate"
            error={fieldError(form, "whatsappOrder.messageTemplate")}
          >
            <textarea
              id="messageTemplate"
              className="admin-field admin-textarea min-h-[240px] font-mono text-[12px]"
              value={settings.messageTemplate}
              onChange={(event) => update({ messageTemplate: event.target.value })}
            />
          </Field>
          <button
            type="button"
            onClick={() => update({ messageTemplate: DEFAULT_ORDER_MESSAGE_TEMPLATE })}
            className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restore default message
          </button>
        </FormSection>

        <FormSection title="Preview" description="Rendered with sample order SH-000123.">
          <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap rounded-[6px] border border-admin-line bg-tile p-3 text-[12px] leading-5 text-ink">
            {preview}
          </pre>
          <p className="mt-2 text-[11px] text-admin-muted">
            {encodeURIComponent(preview).length} encoded characters. Long orders drop item lines and keep the total and
            order number.
          </p>
        </FormSection>
      </div>

      <FormSection
        title="Staff reply"
        description="Used by the open-chat and send-test actions in order management."
      >
        <Field
          label="Staff reply template"
          htmlFor="staffReplyTemplate"
          error={fieldError(form, "whatsappOrder.staffReplyTemplate")}
        >
          <textarea
            id="staffReplyTemplate"
            className="admin-field admin-textarea min-h-[110px] font-mono text-[12px]"
            value={settings.staffReplyTemplate}
            onChange={(event) => update({ staffReplyTemplate: event.target.value })}
          />
        </Field>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => update({ staffReplyTemplate: DEFAULT_STAFF_REPLY_TEMPLATE })}
            className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restore default reply
          </button>
          {testLink ? (
            <a
              href={testLink}
              target="_blank"
              rel="noreferrer"
              onClick={() => setTestOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-[6px] bg-navy px-3 text-[12px] font-medium text-white hover:bg-navy-deep"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Send test
            </a>
          ) : (
            <span className="text-[11px] text-admin-muted">Add a WhatsApp number to send a test.</span>
          )}
        </div>
        {testOpen ? (
          <p className="mt-2 text-[11px] text-admin-muted" role="status">
            The test link opens WhatsApp with the reply above.
          </p>
        ) : null}
        <p className="mt-4 whitespace-pre-line rounded-[6px] border border-admin-line bg-tile px-3 py-2 text-[12px] text-ink">
          {staffPreview}
        </p>
      </FormSection>
    </SettingsSectionForm>
  );
}
