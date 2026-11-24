"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, RotateCcw, Send, Trash2 } from "lucide-react";
import {
  saveInvoiceSettingsAction,
  sendTestWhatsAppAction,
} from "@/app/(admin)/admin/settings/actions";
import { Field, FieldGrid, FormSection } from "@/components/admin/FormSection";
import { useSectionForm, SettingsSectionForm, fieldError } from "@/components/admin/settings/SettingsForm";
import { useToast } from "@/components/admin/ToastProvider";
import type {
  InvoiceSettings,
  InvoiceTemplateKey,
  WhatsAppRecipient,
} from "@/lib/admin/settings-defaults";

type WhatsAppStatus = {
  enabled: boolean;
  configured: boolean;
  graphVersion: string;
  webhookReady: boolean;
  cronReady: boolean;
  missing: string[];
};

const TEMPLATE_LABELS: Record<InvoiceTemplateKey, string> = {
  order_invoice_customer: "Customer order invoice",
  order_invoice_staff: "Staff new-order alert",
  order_delivered_customer: "Customer delivered update",
};

const TEMPLATE_VARIABLES: Record<InvoiceTemplateKey, string[]> = {
  order_invoice_customer: ["customerName", "orderNumber", "storeName", "total", "primaryNumber", "invoiceUrl"],
  order_invoice_staff: ["orderNumber", "customerName", "total", "invoiceUrl"],
  order_delivered_customer: ["customerName", "orderNumber", "storeName", "invoiceUrl"],
};

export function InvoiceSettingsForm({
  initial,
  status,
  currencySymbol,
}: {
  initial: InvoiceSettings;
  status: WhatsAppStatus;
  currencySymbol: string;
}) {
  const form = useSectionForm(initial, saveInvoiceSettingsAction);
  const { value, setValue } = form;
  const { toast } = useToast();
  const [testNumber, setTestNumber] = useState(initial.recipients[0]?.number ?? "");
  const [testPending, startTest] = useTransition();

  const update = (patch: Partial<InvoiceSettings>) => setValue({ ...value, ...patch });
  const updateBusiness = (patch: Partial<InvoiceSettings["business"]>) =>
    setValue({ ...value, business: { ...value.business, ...patch } });
  const updateTemplate = (
    key: InvoiceTemplateKey,
    patch: Partial<InvoiceSettings["templates"][InvoiceTemplateKey]>,
  ) =>
    setValue({
      ...value,
      templates: { ...value.templates, [key]: { ...value.templates[key], ...patch } },
    });
  const updateMapping = (key: InvoiceTemplateKey, name: string, position: string) =>
    updateTemplate(key, {
      variableMapping: { ...value.templates[key].variableMapping, [name]: position },
    });
  const updateRecipient = (index: number, patch: Partial<WhatsAppRecipient>) => {
    const recipients = value.recipients.map((recipient, itemIndex) =>
      itemIndex === index ? { ...recipient, ...patch } : recipient,
    );
    update({ recipients });
  };
  const toggleRecipientEvent = (index: number, event: string, checked: boolean) => {
    const recipient = value.recipients[index];
    if (!recipient) return;
    const events = checked
      ? [...new Set([...recipient.events, event])]
      : recipient.events.filter((entry) => entry !== event);
    updateRecipient(index, { events });
  };

  const sendTest = () => {
    startTest(async () => {
      const result = await sendTestWhatsAppAction({ to: testNumber });
      if (result.ok) {
        toast("Test message sent.");
      } else {
        toast(result.error, "error");
      }
    });
  };

  const previews = Object.entries(value.templates) as Array<
    [InvoiceTemplateKey, InvoiceSettings["templates"][InvoiceTemplateKey]]
  >;

  return (
    <SettingsSectionForm form={form}>
      <div
        className={`rounded-[8px] border px-4 py-3 text-[12px] ${
          status.configured
            ? "border-success/30 bg-success-pale text-success"
            : "border-warning/30 bg-warning-pale text-warning"
        }`}
      >
        {status.configured ? (
          <p>
            WhatsApp Cloud API is configured (Graph {status.graphVersion}). Outbox sending is active when this
            setting is enabled.
          </p>
        ) : (
          <div className="space-y-1">
            <p className="font-semibold">WhatsApp Cloud API is not ready.</p>
            <p>
              Credentials are read from environment variables only. Missing:{" "}
              {status.missing.length ? status.missing.join(", ") : "enable WHATSAPP_ENABLED and add credentials"}
              .
            </p>
            <p>Orders and invoices keep working. Messages stay pending until credentials are added.</p>
          </div>
        )}
      </div>

      <FormSection
        title="Invoice identity"
        description="Shown on the hosted invoice, the PDF and the delivery slip."
        fullWidth
      >
        <FieldGrid columns={2}>
          <Field label="Business name" htmlFor="invoice-business-name" error={fieldError(form, "business.businessName")}>
            <input
              id="invoice-business-name"
              className="admin-field"
              value={value.business.businessName}
              onChange={(event) => updateBusiness({ businessName: event.target.value })}
            />
          </Field>
          <Field label="TIN" htmlFor="invoice-tin" error={fieldError(form, "business.tin")}>
            <input
              id="invoice-tin"
              className="admin-field"
              value={value.business.tin}
              onChange={(event) => updateBusiness({ tin: event.target.value })}
            />
          </Field>
          <Field label="Address" htmlFor="invoice-address" error={fieldError(form, "business.address")}>
            <input
              id="invoice-address"
              className="admin-field"
              value={value.business.address}
              onChange={(event) => updateBusiness({ address: event.target.value })}
            />
          </Field>
          <Field label="Phone" htmlFor="invoice-phone" error={fieldError(form, "business.phone")}>
            <input
              id="invoice-phone"
              className="admin-field"
              value={value.business.phone}
              onChange={(event) => updateBusiness({ phone: event.target.value })}
            />
          </Field>
          <Field label="Email" htmlFor="invoice-email" error={fieldError(form, "business.email")}>
            <input
              id="invoice-email"
              type="email"
              className="admin-field"
              value={value.business.email}
              onChange={(event) => updateBusiness({ email: event.target.value })}
            />
          </Field>
          <Field label="Logo path or URL" htmlFor="invoice-logo" error={fieldError(form, "business.logo")}>
            <input
              id="invoice-logo"
              className="admin-field"
              value={value.business.logo}
              onChange={(event) => updateBusiness({ logo: event.target.value })}
            />
          </Field>
          <Field label="VAT rate (%)" htmlFor="invoice-vat" error={fieldError(form, "business.vatRate")}>
            <input
              id="invoice-vat"
              type="number"
              min={0}
              max={100}
              step="0.01"
              className="admin-field"
              value={value.business.vatRate}
              onChange={(event) => updateBusiness({ vatRate: Number(event.target.value) })}
            />
          </Field>
          <label className="flex items-start gap-2 text-[13px] text-ink md:mt-6">
            <input
              type="checkbox"
              checked={value.business.pricesIncludeVat}
              onChange={(event) => updateBusiness({ pricesIncludeVat: event.target.checked })}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              Prices include VAT
              <span className="mt-0.5 block text-[11px] text-admin-muted">
                Adds a VAT note to the invoice using the rate above.
              </span>
            </span>
          </label>
        </FieldGrid>
        <div className="mt-4">
          <Field label="Invoice terms" htmlFor="invoice-terms" error={fieldError(form, "terms")}>
            <textarea
              id="invoice-terms"
              className="admin-field admin-textarea min-h-[90px]"
              value={value.terms}
              onChange={(event) => update({ terms: event.target.value })}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Numbering and validity"
        description="Invoice numbers are gapless and never reused. Reissues keep the same number and increase the revision."
        aside={
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-admin-muted">Example</p>
            <p className="rounded-[6px] bg-tile px-3 py-2 font-mono text-[13px] text-ink">
              {(value.invoicePrefix || "INV")}-000123
            </p>
            <p className="text-[11px] text-admin-muted">Revision {value.reissueOnConfirm ? "increases on confirmation" : "changes only on manual reissue"}.</p>
          </div>
        }
      >
        <FieldGrid columns={3}>
          <Field label="Invoice prefix" htmlFor="invoice-prefix" error={fieldError(form, "invoicePrefix")}>
            <input
              id="invoice-prefix"
              className="admin-field"
              maxLength={8}
              value={value.invoicePrefix}
              onChange={(event) => update({ invoicePrefix: event.target.value.toUpperCase() })}
            />
          </Field>
          <Field
            label="Link expiry (days)"
            htmlFor="invoice-expiry"
            hint="Applies to hosted invoice and delivery links."
            error={fieldError(form, "tokenExpiryDays")}
          >
            <input
              id="invoice-expiry"
              type="number"
              min={1}
              max={365}
              className="admin-field"
              value={value.tokenExpiryDays}
              onChange={(event) => update({ tokenExpiryDays: Number(event.target.value) })}
            />
          </Field>
          <label className="flex items-start gap-2 text-[13px] text-ink md:mt-6">
            <input
              type="checkbox"
              checked={value.reissueOnConfirm}
              onChange={(event) => update({ reissueOnConfirm: event.target.checked })}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              Reissue on confirmation
              <span className="mt-0.5 block text-[11px] text-admin-muted">
                Creates a new revision with the same invoice number when an order is confirmed.
              </span>
            </span>
          </label>
        </FieldGrid>
      </FormSection>

      <FormSection
        title="Delivery confirmation"
        description="Controls what the courier sees at /delivery/<token> and how the delivery code is verified."
      >
        <FieldGrid columns={2}>
          <Field label="Confirmation mode" htmlFor="invoice-confirmation-mode" error={fieldError(form, "confirmationMode")}>
            <select
              id="invoice-confirmation-mode"
              className="admin-field"
              value={value.confirmationMode}
              onChange={(event) =>
                update({ confirmationMode: event.target.value as InvoiceSettings["confirmationMode"] })
              }
            >
              <option value="pin_and_scan">QR scan and delivery code</option>
              <option value="scan_only">QR scan only</option>
            </select>
          </Field>
          <Field
            label="Wrong-code attempts before lock"
            htmlFor="invoice-pin-attempts"
            error={fieldError(form, "pinAttempts")}
          >
            <input
              id="invoice-pin-attempts"
              type="number"
              min={3}
              max={10}
              className="admin-field"
              value={value.pinAttempts}
              onChange={(event) => update({ pinAttempts: Number(event.target.value) })}
            />
          </Field>
          <Field label="Lock duration (minutes)" htmlFor="invoice-pin-lock" error={fieldError(form, "pinLockMinutes")}>
            <input
              id="invoice-pin-lock"
              type="number"
              min={1}
              max={1440}
              className="admin-field"
              value={value.pinLockMinutes}
              onChange={(event) => update({ pinLockMinutes: Number(event.target.value) })}
            />
          </Field>
          <label className="flex items-start gap-2 text-[13px] text-ink md:mt-6">
            <input
              type="checkbox"
              checked={value.geolocationRequired}
              onChange={(event) => update({ geolocationRequired: event.target.checked })}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              Require the courier location
              <span className="mt-0.5 block text-[11px] text-admin-muted">
                The browser asks for location before confirming delivery.
              </span>
            </span>
          </label>
        </FieldGrid>
      </FormSection>

      <FormSection
        title="WhatsApp sending"
        description="Credentials live in environment variables. This switch only controls whether the storefront enqueues and sends messages."
        aside={
          <div className="space-y-2 text-[11px] text-admin-muted">
            <p>
              Enabled: <span className="font-semibold text-ink">{status.enabled ? "yes" : "no"}</span>
            </p>
            <p>
              Credentials: <span className="font-semibold text-ink">{status.configured ? "ready" : "missing"}</span>
            </p>
            <p>
              Webhook: <span className="font-semibold text-ink">{status.webhookReady ? "ready" : "not set"}</span>
            </p>
            <p>
              Cron: <span className="font-semibold text-ink">{status.cronReady ? "ready" : "not set"}</span>
            </p>
            <p className="pt-2">
              Required: WHATSAPP_ENABLED, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, WHATSAPP_APP_SECRET,
              WHATSAPP_WEBHOOK_VERIFY_TOKEN, CRON_SECRET.
            </p>
          </div>
        }
      >
        <label className="flex items-start gap-2 text-[13px] text-ink">
          <input
            type="checkbox"
            checked={value.whatsappApi.enabled}
            onChange={(event) =>
              update({ whatsappApi: { ...value.whatsappApi, enabled: event.target.checked } })
            }
            className="mt-0.5 h-4 w-4"
          />
          <span>
            Send automatic WhatsApp messages
            <span className="mt-0.5 block text-[11px] text-admin-muted">
              When off, no messages are queued. The manual WhatsApp handoff at checkout still works.
            </span>
          </span>
        </label>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {(
            [
              ["onPlacement", "On order placement"],
              ["onConfirmation", "On confirmation"],
              ["onDelivery", "On delivery"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-[12px] text-ink">
              <input
                type="checkbox"
                checked={value.autoSend[key]}
                onChange={(event) =>
                  update({ autoSend: { ...value.autoSend, [key]: event.target.checked } })
                }
                className="h-4 w-4"
              />
              {label}
            </label>
          ))}
        </div>

        <div className="mt-5 rounded-[6px] border border-admin-line bg-tile p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-admin-muted">Send a test</p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <div>
              <label className="admin-label" htmlFor="invoice-test-number">
                WhatsApp number
              </label>
              <input
                id="invoice-test-number"
                className="admin-field w-[220px]"
                value={testNumber}
                onChange={(event) => setTestNumber(event.target.value)}
                placeholder="+250788123456"
              />
            </div>
            <button
              type="button"
              onClick={sendTest}
              disabled={testPending || !status.configured || !value.whatsappApi.enabled}
              className="inline-flex h-9 items-center gap-1.5 rounded-[6px] bg-navy px-3 text-[12px] font-medium text-white hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {testPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send test
            </button>
          </div>
          {!status.configured ? (
            <p className="mt-2 text-[11px] text-admin-muted">Add credentials and enable sending to test.</p>
          ) : null}
        </div>
      </FormSection>

      <FormSection
        title="Staff recipients"
        description="Numbers that receive a new-order alert. Use international format."
        fullWidth
      >
        <div className="space-y-3">
          {value.recipients.map((recipient, index) => (
            <div key={index} className="rounded-[6px] border border-admin-line p-3">
              <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)_auto] md:items-end">
                <Field label="Number" htmlFor={`recipient-number-${index}`}>
                  <input
                    id={`recipient-number-${index}`}
                    className="admin-field"
                    value={recipient.number}
                    onChange={(event) => updateRecipient(index, { number: event.target.value })}
                    placeholder="+250788123456"
                  />
                </Field>
                <Field label="Label" htmlFor={`recipient-label-${index}`}>
                  <input
                    id={`recipient-label-${index}`}
                    className="admin-field"
                    value={recipient.label}
                    onChange={(event) => updateRecipient(index, { label: event.target.value })}
                    placeholder="Dispatch team"
                  />
                </Field>
                <button
                  type="button"
                  onClick={() =>
                    update({ recipients: value.recipients.filter((_, itemIndex) => itemIndex !== index) })
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-[6px] border border-admin-line px-3 text-[12px] font-medium text-danger hover:bg-danger-pale"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-4">
                {[
                  ["new_order", "New orders"],
                  ["delivered", "Delivered orders"],
                ].map(([event, label]) => (
                  <label key={event} className="flex items-center gap-2 text-[12px] text-ink">
                    <input
                      type="checkbox"
                      checked={recipient.events.includes(event)}
                      onChange={(changeEvent) =>
                        toggleRecipientEvent(index, event, changeEvent.target.checked)
                      }
                      className="h-4 w-4"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          ))}
          {value.recipients.length >= 10 ? null : (
            <button
              type="button"
              onClick={() =>
                update({
                  recipients: [
                    ...value.recipients,
                    { number: "", label: "", events: ["new_order"] },
                  ],
                })
              }
              className="inline-flex h-9 items-center gap-1.5 rounded-[6px] border border-admin-line px-3 text-[12px] font-medium text-ink hover:bg-tile"
            >
              <Plus className="h-3.5 w-3.5" />
              Add recipient
            </button>
          )}
        </div>
      </FormSection>

      <FormSection
        title="Message templates"
        description="These must match approved WhatsApp templates. Positions are the body variable order used by Meta."
        fullWidth
      >
        <div className="space-y-4">
          {previews.map(([key, template]) => (
            <div key={key} className="rounded-[6px] border border-admin-line p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[13px] font-semibold text-ink">{TEMPLATE_LABELS[key]}</h3>
                <button
                  type="button"
                  onClick={() => {
                    const fallback = initial.templates[key];
                    updateTemplate(key, { ...fallback });
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-2.5 text-[11px] font-medium text-ink hover:bg-tile"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore
                </button>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Field label="Meta template name" htmlFor={`template-name-${key}`}>
                  <input
                    id={`template-name-${key}`}
                    className="admin-field font-mono"
                    value={template.metaTemplateName}
                    onChange={(event) => updateTemplate(key, { metaTemplateName: event.target.value })}
                  />
                </Field>
                <Field label="Language code" htmlFor={`template-language-${key}`}>
                  <input
                    id={`template-language-${key}`}
                    className="admin-field font-mono"
                    value={template.languageCode}
                    onChange={(event) => updateTemplate(key, { languageCode: event.target.value })}
                  />
                </Field>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {TEMPLATE_VARIABLES[key].map((name) => (
                  <label key={name} className="flex items-center gap-2 text-[11px] text-admin-muted">
                    <span className="min-w-[100px] font-mono text-ink">{`{{${name}}}`}</span>
                    <input
                      className="admin-field h-8 w-16 text-center font-mono"
                      inputMode="numeric"
                      value={template.variableMapping[name] ?? ""}
                      onChange={(event) => updateMapping(key, name, event.target.value.replace(/\D/g, ""))}
                      placeholder="—"
                    />
                  </label>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-admin-muted">
                Preview total format: {currencySymbol} 250,000
              </p>
            </div>
          ))}
        </div>
      </FormSection>
    </SettingsSectionForm>
  );
}
