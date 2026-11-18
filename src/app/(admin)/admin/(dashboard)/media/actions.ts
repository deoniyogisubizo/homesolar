"use server";

import { z } from "zod";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { connectToDatabase } from "@/lib/mongodb";
import { Media } from "@/models/Media";
import { assertSameOrigin, requirePermission } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { actionError, actionOk, fieldErrorsFromZod, runAdminAction, type ActionResult } from "@/lib/admin/action-result";
import { detectImageMime, storeImage } from "@/lib/admin/storage";
import { findMediaUsage } from "@/lib/admin/media-usage";
import { revalidateStorefront } from "@/lib/admin/revalidate";
import { idSchema, tagsSchema } from "@/schemas/common";

const MAX_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 10;

const updateSchema = z.object({
  id: idSchema,
  alt: z.string().trim().max(200).default(""),
  folder: z.string().trim().max(40).default("general"),
  tags: z.string().trim().max(300).default(""),
});

export async function uploadMediaAction(
  formData: FormData,
): Promise<ActionResult<{ uploaded: number; errors: string[]; items: Array<{ url: string; thumbUrl: string | null; alt: string }> }>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("media:write");
    const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);
    if (!files.length) return actionError("Choose at least one image to upload.");
    if (files.length > MAX_FILES) return actionError(`Upload at most ${MAX_FILES} images at a time.`);

    const folder = String(formData.get("folder") ?? "general").trim().slice(0, 40) || "general";
    const defaultAlt = String(formData.get("alt") ?? "").trim().slice(0, 200);
    const errors: string[] = [];
    const accepted: Array<{ buffer: Buffer; mimeType: string; name: string }> = [];

    for (const file of files) {
      if (file.size > MAX_SIZE) {
        errors.push(`${file.name}: larger than 5 MB.`);
        continue;
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const mimeType = detectImageMime(buffer);
      if (!mimeType) {
        errors.push(`${file.name}: only JPEG, PNG, WebP and GIF images are accepted.`);
        continue;
      }
      accepted.push({ buffer, mimeType, name: file.name });
    }

    await connectToDatabase();
    let uploaded = 0;
    const items: Array<{ url: string; thumbUrl: string | null; alt: string }> = [];
    for (const file of accepted) {
      try {
        const stored = await storeImage(file.buffer, file.mimeType);
        const alt = defaultAlt || file.name.replace(/\.[^.]+$/, "");
        const document = await Media.create({
          ...stored,
          alt,
          originalName: file.name,
          folder,
          tags: [],
          uploadedBy: session.id,
        });
        await recordAudit({
          actor: session,
          action: "create",
          entity: "media",
          entityId: String(document._id),
          summary: `Uploaded ${file.name}`,
          after: { url: stored.url, folder },
        });
        uploaded += 1;
        items.push({ url: stored.url, thumbUrl: stored.thumbUrl, alt });
      } catch (error) {
        errors.push(`${file.name}: ${error instanceof Error ? error.message : "upload failed"}.`);
      }
    }

    revalidateStorefront(["media"]);
    if (!uploaded && errors.length) return actionError(errors.join(" "));
    return actionOk({ uploaded, errors, items });
  });
}

export async function updateMediaAction(input: unknown): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("media:write");
    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) return actionError("Check the fields.", fieldErrorsFromZod(parsed.error));

    await connectToDatabase();
    const media = await Media.findById(parsed.data.id);
    if (!media) return actionError("Media not found.");

    const before = { alt: media.alt, folder: media.folder, tags: media.tags };
    media.alt = parsed.data.alt;
    media.folder = parsed.data.folder;
    media.tags = parsed.data.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 20);
    tagsSchema.parse(media.tags);
    await media.save();

    await recordAudit({
      actor: session,
      action: "update",
      entity: "media",
      entityId: String(media._id),
      summary: `Updated media ${media.originalName}`,
      before,
      after: { alt: media.alt, folder: media.folder, tags: media.tags },
    });

    revalidateStorefront(["media"]);
    return actionOk(null);
  });
}

async function removeLocalFiles(urls: string[]) {
  for (const url of urls) {
    if (!url.startsWith("/uploads/")) continue;
    const target = path.join(process.cwd(), "public", url.replace(/^\//, ""));
    if (!target.startsWith(path.join(process.cwd(), "public", "uploads"))) continue;
    try {
      await unlink(target);
    } catch {
      continue;
    }
  }
}

export async function deleteMediaAction(input: unknown): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("media:write");
    const parsed = z.object({ id: idSchema }).safeParse(input);
    if (!parsed.success) return actionError("Invalid media item.");

    await connectToDatabase();
    const media = await Media.findById(parsed.data.id);
    if (!media) return actionError("Media not found.");

    const usage = await findMediaUsage(media.url);
    if (usage.length) {
      return actionError(`This image is in use: ${usage.slice(0, 4).map((entry) => entry.label).join(", ")}.`);
    }

    await removeLocalFiles([media.url, media.thumbUrl ?? "", media.originalUrl]);
    await media.deleteOne();
    await recordAudit({
      actor: session,
      action: "delete",
      entity: "media",
      entityId: parsed.data.id,
      summary: `Deleted media ${media.originalName}`,
      before: { url: media.url, folder: media.folder },
    });

    revalidateStorefront(["media"]);
    return actionOk(null);
  });
}

export async function bulkDeleteMediaAction(input: unknown): Promise<ActionResult<{ deleted: number }>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("media:write");
    const parsed = z.object({ ids: z.array(idSchema).min(1, "Select at least one media item.") }).safeParse(input);
    if (!parsed.success) return actionError("Invalid media items.");

    await connectToDatabase();
    const ids = parsed.data.ids;
    const items = await Media.find({ _id: { $in: ids } });
    if (!items.length) return actionError("No matching media items were found.");

    let deleted = 0;

    for (const item of items) {
      const usage = await findMediaUsage(item.url);
      if (usage.length) {
        return actionError(
          `Media ${item.originalName} is in use: ${usage.slice(0, 4).map((entry) => entry.label).join(", ")}.`,
        );
      }

      await removeLocalFiles([item.url, item.thumbUrl ?? "", item.originalUrl]);
      await item.deleteOne();
      deleted += 1;
    }

    await recordAudit({
      actor: session,
      action: "delete",
      entity: "media",
      entityId: null,
      summary: `Bulk deleted ${deleted} media item${deleted === 1 ? "" : "s"}`,
      after: { ids, deleted },
    });

    revalidateStorefront(["media"]);
    return actionOk({ deleted });
  });
}

export async function bulkDeleteMediaFormAction(formData: FormData): Promise<void> {
  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const intent = String(formData.get("intent") ?? "");
  await bulkDeleteMediaAction({ ids, intent });
}
