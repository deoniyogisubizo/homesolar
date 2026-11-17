"use client";

import { saveNotificationSettingsAction } from "@/app/(admin)/admin/settings/actions";
import { Field, FormSection } from "@/components/admin/FormSection";
import { useSectionForm, SettingsSectionForm, fieldError } from "@/components/admin/settings/SettingsForm";
import type { NotificationSettings } from "@/lib/admin/settings-defaults";

const events: Array<{
  key: keyof NotificationSettings["recipients"];
  title: string;
  description: string;
}> = [
  { key: "orders", title: "New orders", description: "Send an alert when an order is placed." },
  { key: "lowStock", title: "Low stock", description: "Send an alert when a variant reaches its threshold." },
  { key: "messages", title: "New messages", description: "Send an alert for contact form submissions." },
  { key: "reviews", title: "New reviews", description: "Send an alert when a review needs moderation." },
];

export function NotificationSettingsForm({ initial }: { initial: NotificationSettings }) {
  const form = useSectionForm(initial, saveNotificationSettingsAction);
  const { value, setValue } = form;

  return (
    <SettingsSectionForm form={form}>
      <FormSection
        title="Recipients by event"
        description="Separate multiple addresses with commas. Alerts are sent using the saved SMTP settings."
      >
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.key} className="rounded-[6px] border border-admin-line p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-[13px] font-semibold text-ink">{event.title}</h3>
                  <p className="text-[12px] text-admin-muted">{event.description}</p>
                </div>
                <label className="flex items-center gap-2 text-[12px] text-ink">
                  <input
                    type="checkbox"
                    checked={value.enabled[event.key]}
                    onChange={(event_) =>
                      setValue({
                        ...value,
                        enabled: { ...value.enabled, [event.key]: event_.target.checked },
                      })
                    }
                    className="h-4 w-4"
                  />
                  Enabled
                </label>
              </div>
              <div className="mt-3">
                <Field
                  label="Recipient emails"
                  htmlFor={`recipients-${event.key}`}
                  error={fieldError(form, `recipients.${event.key}`)}
                >
                  <input
                    id={`recipients-${event.key}`}
                    className="admin-field"
                    placeholder="owner@example.com, operations@example.com"
                    value={value.recipients[event.key].join(", ")}
                    onChange={(event_) =>
                      setValue({
                        ...value,
                        recipients: {
                          ...value.recipients,
                          [event.key]: event_.target.value
                            .split(",")
                            .map((email) => email.trim())
                            .filter(Boolean),
                        },
                      })
                    }
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </FormSection>
    </SettingsSectionForm>
  );
}
