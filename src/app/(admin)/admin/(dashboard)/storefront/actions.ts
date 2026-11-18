"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/mongodb";
import { SiteContent } from "@/models/SiteContent";
import { Page } from "@/models/Page";
import { assertSameOrigin, requirePermission } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { actionError, actionOk, fieldErrorsFromZod, runAdminAction, type ActionResult } from "@/lib/admin/action-result";
import { revalidateStorefront } from "@/lib/admin/revalidate";
import { normalizeSiteContent } from "@/lib/site-defaults";
import { sanitizeRichText } from "@/lib/sanitize";
import { idSchema, slugSchema } from "@/schemas/common";
import {
  footerContentSchema,
  headerContentSchema,
  homepageSectionSchemas,
  type HomepageSectionKey,
} from "@/schemas/content";
import type { SiteContentData } from "@/types";

async function loadContent() {
  await connectToDatabase();
  const document = await SiteContent.findOne({ key: "home" });
  return { document, content: normalizeSiteContent(document?.content) };
}

export async function saveHomepageSectionAction(input: unknown): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("homepage:write");
    const parsedInput = z
      .object({
        section: z.enum(Object.keys(homepageSectionSchemas) as [HomepageSectionKey, ...HomepageSectionKey[]]),
        value: z.unknown(),
      })
      .safeParse(input);
    if (!parsedInput.success) return actionError("Invalid section.");

    const schema = homepageSectionSchemas[parsedInput.data.section];
    const parsedValue = schema.safeParse(parsedInput.data.value);
    if (!parsedValue.success) {
      return actionError("Check the highlighted fields.", fieldErrorsFromZod(parsedValue.error));
    }

    const { document, content } = await loadContent();
    const before = { [parsedInput.data.section]: (content as Record<string, unknown>)[parsedInput.data.section] };
    (content as Record<string, unknown>)[parsedInput.data.section] = parsedValue.data;

    if (document) {
      document.content = content;
      document.markModified("content");
      await document.save();
    } else {
      await SiteContent.create({ key: "home", content });
    }

    await recordAudit({
      actor: session,
      action: "update",
      entity: "site_content",
      entityId: parsedInput.data.section,
      summary: `Updated homepage ${parsedInput.data.section}`,
      before,
      after: { [parsedInput.data.section]: parsedValue.data as Record<string, unknown> },
    });

    revalidateStorefront([
      "site-content",
      "homepage",
      "navigation",
      "footer",
      "media",
      ...(parsedInput.data.section === "header" ? (["navigation"] as const) : []),
    ]);
    revalidatePath("/");
    return actionOk(null);
  });
}

export async function saveNavigationAction(input: unknown): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("navigation:write");
    const parsed = z
      .object({
        nav: headerContentSchema.shape.nav,
        searchEnabled: z.boolean(),
        searchPlaceholder: z.string().trim().max(80),
        currency: z.string().trim().max(8),
        currencies: z.array(z.string().trim().min(3).max(3)).max(10),
        language: z.string().trim().max(8),
        languages: z.array(z.string().trim().min(2).max(8)).max(10),
      })
      .safeParse(input);
    if (!parsed.success) return actionError("Check the navigation links.", fieldErrorsFromZod(parsed.error));

    const { document, content } = await loadContent();
    const before = { ...content.header };
    content.header = { ...content.header, ...parsed.data };
    if (document) {
      document.content = content;
      document.markModified("content");
      await document.save();
    } else {
      await SiteContent.create({ key: "home", content });
    }

    await recordAudit({
      actor: session,
      action: "update",
      entity: "navigation",
      entityId: null,
      summary: "Updated navigation and header options",
      before,
      after: content.header as unknown as Record<string, unknown>,
    });

    revalidateStorefront(["site-content", "navigation", "homepage"]);
    return actionOk(null);
  });
}

export async function saveFooterAction(input: unknown): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("footer:write");
    const parsed = footerContentSchema.safeParse(input);
    if (!parsed.success) return actionError("Check the footer fields.", fieldErrorsFromZod(parsed.error));

    const { document, content } = await loadContent();
    const before = content.footer as unknown as Record<string, unknown>;
    content.footer = parsed.data;
    if (document) {
      document.content = content;
      document.markModified("content");
      await document.save();
    } else {
      await SiteContent.create({ key: "home", content });
    }

    await recordAudit({
      actor: session,
      action: "update",
      entity: "footer",
      entityId: null,
      summary: "Updated footer content",
      before,
      after: parsed.data as unknown as Record<string, unknown>,
    });

    revalidateStorefront(["site-content", "footer", "navigation"]);
    return actionOk(null);
  });
}

const pageInputSchema = z.object({
  id: idSchema.optional(),
  title: z.string().trim().min(2, "Enter a title.").max(160),
  slug: slugSchema,
  excerpt: z.string().trim().max(320).default(""),
  content: z.string().max(100000).default(""),
  seoTitle: z.string().trim().max(160).default(""),
  seoDescription: z.string().trim().max(320).default(""),
  status: z.enum(["draft", "published", "archived"]),
  showInFooter: z.boolean(),
  order: z.coerce.number().int().min(0).max(999),
});

export async function savePageAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("pages:write");
    const parsed = pageInputSchema.safeParse(input);
    if (!parsed.success) return actionError("Check the page fields.", fieldErrorsFromZod(parsed.error));

    await connectToDatabase();
    const data = parsed.data;
    const cleanContent = sanitizeRichText(data.content);
    const duplicate = await Page.findOne({ slug: data.slug, _id: { $ne: data.id ?? null } }).select("_id").lean();
    if (duplicate) return actionError("That slug is already used by another page.", { slug: "Slug already in use." });

    if (data.id) {
      const page = await Page.findById(data.id);
      if (!page) return actionError("Page not found.");
      const before = {
        title: page.title,
        slug: page.slug,
        status: page.status,
        content: page.content,
      };
      page.title = data.title;
      page.slug = data.slug;
      page.excerpt = data.excerpt;
      page.content = cleanContent;
      page.seoTitle = data.seoTitle;
      page.seoDescription = data.seoDescription;
      page.showInFooter = data.showInFooter;
      page.order = data.order;
      if (page.status !== data.status) {
        page.status = data.status;
        page.publishedAt = data.status === "published" ? new Date() : page.publishedAt;
        page.archivedAt = data.status === "archived" ? new Date() : null;
      }
      await page.save();
      await recordAudit({
        actor: session,
        action: "update",
        entity: "page",
        entityId: String(page._id),
        summary: `Updated page ${page.title}`,
        before,
        after: { title: page.title, slug: page.slug, status: page.status },
      });
      revalidateStorefront(["pages", `page-${page.slug}`, "site-content", "footer"]);
      return actionOk({ id: String(page._id) });
    }

    const created = await Page.create({
      ...data,
      content: cleanContent,
      publishedAt: data.status === "published" ? new Date() : null,
      archivedAt: data.status === "archived" ? new Date() : null,
    });
    await recordAudit({
      actor: session,
      action: "create",
      entity: "page",
      entityId: String(created._id),
      summary: `Created page ${created.title}`,
      after: { title: created.title, slug: created.slug, status: created.status },
    });
    revalidateStorefront(["pages", `page-${created.slug}`, "site-content", "footer"]);
    return actionOk({ id: String(created._id) });
  });
}

export async function archivePageAction(input: unknown): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("pages:write");
    const parsed = z.object({ id: idSchema }).safeParse(input);
    if (!parsed.success) return actionError("Invalid page.");

    await connectToDatabase();
    const page = await Page.findById(parsed.data.id);
    if (!page) return actionError("Page not found.");
    page.status = "archived";
    page.archivedAt = new Date();
    await page.save();

    await recordAudit({
      actor: session,
      action: "archive",
      entity: "page",
      entityId: String(page._id),
      summary: `Archived page ${page.title}`,
      before: { status: "published" },
      after: { status: page.status },
    });
    revalidateStorefront(["pages", `page-${page.slug}`, "footer", "site-content"]);
    return actionOk(null);
  });
}

export async function deletePageAction(input: unknown): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("pages:write");
    const parsed = z.object({ id: idSchema }).safeParse(input);
    if (!parsed.success) return actionError("Invalid page.");

    await connectToDatabase();
    const page = await Page.findById(parsed.data.id);
    if (!page) return actionError("Page not found.");

    await page.deleteOne();
    await recordAudit({
      actor: session,
      action: "delete",
      entity: "page",
      entityId: parsed.data.id,
      summary: `Deleted page ${page.title}`,
      before: { title: page.title, slug: page.slug, status: page.status },
    });

    revalidateStorefront(["pages", `page-${page.slug}`, "site-content", "footer"]);
    return actionOk(null);
  });
}

export async function bulkDeletePagesAction(input: unknown): Promise<ActionResult<{ deleted: number }>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("pages:write");
    const parsed = z.object({ ids: z.array(idSchema).min(1, "Select at least one page.") }).safeParse(input);
    if (!parsed.success) return actionError("Invalid pages.");

    await connectToDatabase();
    const ids = parsed.data.ids;
    const pages = await Page.find({ _id: { $in: ids } });
    if (!pages.length) return actionError("No matching pages were found.");

    let deleted = 0;

    for (const page of pages) {
      await page.deleteOne();
      deleted += 1;
    }

    await recordAudit({
      actor: session,
      action: "delete",
      entity: "page",
      entityId: null,
      summary: `Bulk deleted ${deleted} page${deleted === 1 ? "" : "s"}`,
      after: { ids, deleted },
    });

    revalidateStorefront(["pages", "site-content", "footer"]);
    return actionOk({ deleted });
  });
}

export async function bulkDeletePagesFormAction(formData: FormData): Promise<void> {
  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const intent = String(formData.get("intent") ?? "");
  await bulkDeletePagesAction({ ids, intent });
}

export type SiteContentSaveKey = keyof SiteContentData;
