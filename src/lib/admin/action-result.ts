import type { ZodError } from "zod";
import { AdminAuthError } from "@/lib/admin/auth";

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function actionOk<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function actionError(error: string, fieldErrors?: Record<string, string>): ActionResult<never> {
  return { ok: false, error, ...(fieldErrors ? { fieldErrors } : {}) };
}

export function fieldErrorsFromZod(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "form";
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export function actionErrorFromUnknown(error: unknown): ActionResult<never> {
  if (error instanceof AdminAuthError) {
    return actionError(error.message);
  }
  if (error instanceof Error) {
    if ("code" in error && error.code === 11000) {
      return actionError("A record with this unique value already exists.");
    }
    return actionError(error.message);
  }
  return actionError("Something went wrong. Please try again.");
}

export async function runAdminAction<T>(
  handler: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    return await handler();
  } catch (error) {
    return actionErrorFromUnknown(error);
  }
}

export async function runAction<T>(
  handler: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return actionError(error.message);
    }
    if (error instanceof Error) {
      if ("code" in error && error.code === 11000) {
        return actionError("A record with this unique value already exists.");
      }
      return actionError(error.message);
    }
    return actionError("Something went wrong. Please try again.");
  }
}
