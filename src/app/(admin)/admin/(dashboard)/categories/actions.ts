"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { assertSameOrigin, requirePermission } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { actionError, actionOk, fieldErrorsFromZod, runAdminAction, type ActionResult } from "@/lib/admin/action-result";
import { revalidateStorefront } from "@/lib/admin/revalidate";
import { categoryBulkDeleteSchema, categoryInputSchema } from "@/schemas/catalog";
import { idSchema } from "@/schemas/common";

export async function saveCategoryAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("categories:write");
    const parsed = categoryInputSchema.safeParse(input);
    if (!parsed.success) return actionError("Check the category fields.", fieldErrorsFromZod(parsed.error));

    await connectToDatabase();
    const data = parsed.data;
    const duplicate = await Category.findOne({ slug: data.slug, _id: { $ne: data.id ?? null } })
      .select("_id")
      .lean();
    if (duplicate) return actionError("That URL slug is already in use.", { slug: "Slug already in use." });

    if (data.id) {
      const category = await Category.findById(data.id);
      if (!category) return actionError("Category not found.");
      const before = {
        name: category.name,
        slug: category.slug,
        active: category.active,
        showOnHome: category.showOnHome,
        order: category.order,
      };
      category.name = data.name;
      category.slug = data.slug;
      category.description = data.description;
      category.image = data.image;
      category.bannerImage = data.bannerImage;
      category.showOnHome = data.showOnHome;
      category.order = data.order;
      category.active = data.active;
      category.seoTitle = data.seoTitle;
      category.seoDescription = data.seoDescription;
      await category.save();

      await recordAudit({
        actor: session,
        action: "update",
        entity: "category",
        entityId: String(category._id),
        summary: `Updated category ${category.name}`,
        before,
        after: {
          name: category.name,
          slug: category.slug,
          active: category.active,
          showOnHome: category.showOnHome,
          order: category.order,
        },
      });
      revalidateStorefront(["categories", "products", "homepage", "navigation", "site-content"]);
      return actionOk({ id: String(category._id) });
    }

    const created = await Category.create(data);
    await recordAudit({
      actor: session,
      action: "create",
      entity: "category",
      entityId: String(created._id),
      summary: `Created category ${created.name}`,
      after: { name: created.name, slug: created.slug, active: created.active },
    });
    revalidateStorefront(["categories", "products", "homepage", "navigation", "site-content"]);
    return actionOk({ id: String(created._id) });
  });
}

export async function deleteCategoryAction(input: unknown): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("categories:write");
    const parsed = z.object({ id: idSchema }).safeParse(input);
    if (!parsed.success) return actionError("Invalid category.");

    await connectToDatabase();
    const category = await Category.findById(parsed.data.id);
    if (!category) return actionError("Category not found.");

    const products = await Product.countDocuments({ category: category._id });
    if (products > 0) {
      return actionError(
        `This category still has ${products} product${products === 1 ? "" : "s"}. Move them to another category or deactivate this category instead.`,
      );
    }

    await category.deleteOne();
    await recordAudit({
      actor: session,
      action: "delete",
      entity: "category",
      entityId: parsed.data.id,
      summary: `Deleted category ${category.name}`,
      before: { name: category.name, slug: category.slug },
    });
    revalidateStorefront(["categories", "products", "homepage", "navigation", "site-content"]);
    return actionOk(null);
  });
}

export async function bulkCategoryDeleteAction(input: unknown): Promise<ActionResult<{ deleted: number }>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("categories:write");
    const parsed = categoryBulkDeleteSchema.safeParse(input);
    if (!parsed.success) return actionError("Invalid categories.");

    await connectToDatabase();
    const { ids } = parsed.data;
    const categories = await Category.find({ _id: { $in: ids } });
    if (!categories.length) return actionError("No matching categories were found.");

    let deleted = 0;

    for (const category of categories) {
      const products = await Product.countDocuments({ category: category._id });
      if (products > 0) {
        return actionError(
          `Category ${category.name} still has ${products} product${products === 1 ? "" : "s"}. Move them to another category or deactivate this category instead.`
        );
      }

      await category.deleteOne();
      deleted += 1;
    }

    await recordAudit({
      actor: session,
      action: "delete",
      entity: "category",
      entityId: null,
      summary: `Bulk deleted ${deleted} category${deleted === 1 ? "" : "s"}`,
      after: { ids, deleted },
    });

    revalidateStorefront(["categories", "products", "homepage", "navigation", "site-content"]);
    return actionOk({ deleted });
  });
}

export async function bulkCategoryDeleteFormAction(formData: FormData): Promise<void> {
  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const intent = String(formData.get("intent") ?? "");
  await bulkCategoryDeleteAction({ ids, intent });
  revalidatePath("/admin/categories");
}
