"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/ToastProvider";
import { StickySaveBar, useDirtyState } from "@/components/admin/StickySaveBar";
import { FormError } from "@/components/admin/FormSection";
import type { ActionResult } from "@/lib/admin/action-result";

export type SectionFormState<T, R = null> = {
  value: T;
  setValue: React.Dispatch<React.SetStateAction<T>>;
  result: ActionResult<R> | null;
  pending: boolean;
  dirty: boolean;
  submit: (event: FormEvent<HTMLFormElement>) => void;
  discard: () => void;
};

export function useSectionForm<T, R = null>(
  initial: T,
  save: (value: T) => Promise<ActionResult<R>>,
): SectionFormState<T, R> {
  const router = useRouter();
  const { toast } = useToast();
  const [value, setValue] = useState<T>(initial);
  const [result, setResult] = useState<ActionResult<R> | null>(null);
  const [pending, startTransition] = useTransition();
  const { dirty, reset } = useDirtyState(value);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const response = await save(value);
      setResult(response);
      if (response.ok) {
        reset();
        toast("Settings saved.");
        router.refresh();
      } else {
        toast(response.error, "error");
      }
    });
  };

  const discard = () => {
    setValue(initial);
    reset(initial);
    setResult(null);
  };

  return { value, setValue, result, pending, dirty, submit, discard };
}

export function SettingsSectionForm<T, R = null>({
  form,
  children,
  label,
}: {
  form: SectionFormState<T, R>;
  children: ReactNode;
  label?: string;
}) {
  return (
    <form onSubmit={form.submit} noValidate>
      <div className="space-y-4">
        <FormError message={form.result && !form.result.ok ? form.result.error : null} />
        {children}
      </div>
      <StickySaveBar dirty={form.dirty} pending={form.pending} onDiscard={form.discard} label={label} />
    </form>
  );
}

export function fieldError<T, R = null>(form: SectionFormState<T, R>, key: string) {
  if (!form.result || form.result.ok) return undefined;
  return form.result.fieldErrors?.[key];
}
