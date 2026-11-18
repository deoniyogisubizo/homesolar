"use server";

import { recordAudit } from "@/lib/admin/audit";
import { assertSameOrigin, requirePermission } from "@/lib/admin/auth";
import {
  actionError,
  actionOk,
  runAdminAction,
  type ActionResult,
} from "@/lib/admin/action-result";
import { getSetting } from "@/lib/admin/settings";
import { submitIndexNow } from "@/lib/seo/indexnow";

export async function submitIndexNowAction(): Promise<ActionResult<{ submitted: number }>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("seo:write");
    const seo = await getSetting("seo");
    if (!seo.indexNowEnabled) {
      return actionError("Enable IndexNow in SEO settings before submitting URLs.");
    }

    const result = await submitIndexNow();
    if (!result.ok) return actionError(result.error);

    await recordAudit({
      actor: session,
      action: "settings",
      entity: "seo",
      entityId: "indexnow",
      summary: `Submitted ${result.submitted} URLs to IndexNow`,
      after: { submitted: result.submitted, status: result.status },
    });

    return actionOk({ submitted: result.submitted });
  });
}
