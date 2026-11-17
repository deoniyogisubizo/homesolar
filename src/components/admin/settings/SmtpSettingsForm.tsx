"use client";

import { useState, useTransition } from "react";
import { saveSmtpSettingsAction, sendTestEmailAction } from "@/app/(admin)/admin/settings/actions";
import { Field, FieldGrid, FormSection, FormError, FormSuccess } from "@/components/admin/FormSection";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { useSectionForm, SettingsSectionForm, fieldError } from "@/components/admin/settings/SettingsForm";
import type { ActionResult } from "@/lib/admin/action-result";

export type SmtpFormValues = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
};

export function SmtpSettingsForm({
  initial,
  hasPassword,
  envConfigured,
}: {
  initial: SmtpFormValues;
  hasPassword: boolean;
  envConfigured: boolean;
}) {
  const form = useSectionForm(initial, saveSmtpSettingsAction);
  const { value, setValue } = form;
  const [testTo, setTestTo] = useState(value.fromEmail);
  const [testResult, setTestResult] = useState<ActionResult<{ logId: string }> | null>(null);
  const [testing, startTest] = useTransition();

  const sendTest = () => {
    startTest(async () => {
      setTestResult(await sendTestEmailAction({ to: testTo }));
    });
  };

  return (
    <SettingsSectionForm form={form}>
      <FormSection
        title="SMTP connection"
        description="Used for order emails, password resets, newsletter campaigns and staff alerts."
        aside={
          <div className="space-y-2 text-[12px] text-admin-muted">
            <p className="font-medium text-ink">Environment fallback</p>
            <p>
              {envConfigured
                ? "SMTP environment variables are present. Saved values override them."
                : "No SMTP environment variables detected."}
            </p>
            <p>Passwords are encrypted with AES-256-GCM and never returned to the browser.</p>
          </div>
        }
      >
        <FieldGrid>
          <Field label="Host" htmlFor="host" error={fieldError(form, "host")}>
            <input
              id="host"
              className="admin-field"
              placeholder="smtp.example.com"
              value={value.host}
              onChange={(event) => setValue({ ...value, host: event.target.value })}
            />
          </Field>
          <Field label="Port" htmlFor="port" error={fieldError(form, "port")}>
            <input
              id="port"
              type="number"
              min={1}
              max={65535}
              className="admin-field"
              value={value.port}
              onChange={(event) => setValue({ ...value, port: Number(event.target.value) })}
            />
          </Field>
          <Field label="Username" htmlFor="username" error={fieldError(form, "username")}>
            <input
              id="username"
              className="admin-field"
              autoComplete="off"
              value={value.username}
              onChange={(event) => setValue({ ...value, username: event.target.value })}
            />
          </Field>
          <Field
            label="Password"
            htmlFor="password"
            hint={hasPassword ? "A password is stored. Leave blank to keep it." : "No password stored yet."}
          >
            <input
              id="password"
              type="password"
              className="admin-field"
              autoComplete="new-password"
              value={value.password}
              onChange={(event) => setValue({ ...value, password: event.target.value })}
            />
          </Field>
          <Field label="From name" htmlFor="fromName" error={fieldError(form, "fromName")}>
            <input
              id="fromName"
              className="admin-field"
              value={value.fromName}
              onChange={(event) => setValue({ ...value, fromName: event.target.value })}
            />
          </Field>
          <Field label="From email" htmlFor="fromEmail" error={fieldError(form, "fromEmail")}>
            <input
              id="fromEmail"
              type="email"
              className="admin-field"
              value={value.fromEmail}
              onChange={(event) => setValue({ ...value, fromEmail: event.target.value })}
            />
          </Field>
          <Field label="Reply-to" htmlFor="replyTo" error={fieldError(form, "replyTo")}>
            <input
              id="replyTo"
              type="email"
              className="admin-field"
              value={value.replyTo}
              onChange={(event) => setValue({ ...value, replyTo: event.target.value })}
            />
          </Field>
          <Field label="Encryption" htmlFor="secure">
            <label className="flex h-9 items-center gap-2 text-[13px] text-ink">
              <input
                id="secure"
                type="checkbox"
                checked={value.secure}
                onChange={(event) => setValue({ ...value, secure: event.target.checked })}
                className="h-4 w-4"
              />
              Use implicit TLS (usually port 465)
            </label>
          </Field>
        </FieldGrid>
      </FormSection>

      <FormSection title="Send a test email" description="Save the connection first, then send a message to verify delivery.">
        <div className="max-w-md space-y-3">
          <FormError message={testResult && !testResult.ok ? testResult.error : null} />
          <FormSuccess
            message={testResult?.ok ? `Test email accepted by the server. Log entry ${testResult.data.logId}.` : null}
          />
          <Field label="Recipient" htmlFor="testTo">
            <input
              id="testTo"
              type="email"
              className="admin-field"
              value={testTo}
              onChange={(event) => setTestTo(event.target.value)}
            />
          </Field>
          <SubmitButton type="button" variant="secondary" pending={testing} onClick={sendTest}>
            Send test email
          </SubmitButton>
        </div>
      </FormSection>
    </SettingsSectionForm>
  );
}
