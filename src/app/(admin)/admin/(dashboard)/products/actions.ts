"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { assertSameOrigin, requirePermission } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { appendSlugHistory } from "@/lib/seo/slug";
import { actionError, actionOk, fieldErrorsFromZod, runAdminAction, type ActionResult } from "@/lib/admin/action-result";
import { revalidateStorefront } from "@/lib/admin/revalidate";
import { parseCsv } from "@/lib/csv";
import { idSchema } from "@/schemas/common";
import { productBulkSchema, productImportSchema, productInputSchema, type ProductInput } from "@/schemas/product";

function statusFor(stock: number, threshold: number | null) {
  const limit = threshold ?? 5;
  if (stock <= 0) return "out_of_stock" as const;
  if (stock <= limit) return "low_stock" as const;
  return "in_stock" as const;
}

function imageFields(data: ProductInput) {
  const images = data.images.map((image) => ({
    src: image.src,
    thumbSrc: image.thumbSrc || null,
    alt: image.alt || data.name,
  }));
  return {
    images,
    image: images[0].src,
    gallery: images.map((image) => image.src),
  };
}

export async function saveProductAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("products:write");
    const parsed = productInputSchema.safeParse(input);
    if (!parsed.success) return actionError("Check the product fields.", fieldErrorsFromZod(parsed.error));

    await connectToDatabase();
    const data = parsed.data;
    const category = await Category.findById(data.category).select("_id").lean();
    if (!category) {
      return actionError("Choose a valid category.", { category: "Category not found." });
    }

    const duplicate = await Product.findOne({ slug: data.slug, _id: { $ne: data.id ?? null } })
      .select("_id")
      .lean();
    if (duplicate) return actionError("That URL slug is already used by another product.", { slug: "Slug already in use." });

    const variantPrices = data.variants.map((variant) => variant.price);
    const priceMax = variantPrices.length && Math.max(...variantPrices) > data.price ? Math.max(...variantPrices) : null;
    const common = {
      name: data.name,
      pageTitle: data.pageTitle || null,
      slug: data.slug,
      publishStatus: data.publishStatus,
      tags: data.tags,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      noindex: data.noindex,
      brand: data.brand,
      gtin: data.gtin,
      mpn: data.mpn,
      lowStockThreshold: data.lowStockThreshold,
      description: data.description,
      shortDescription: data.shortDescription,
      price: data.price,
      compareAtPrice: data.compareAtPrice,
      priceMax,
      category: category._id,
      badge: data.badge,
      stock: data.stock,
      status: statusFor(data.stock, data.lowStockThreshold),
      ...imageFields(data),
      options: data.options,
      variants: data.variants,
      detailsIntro: data.detailsIntro,
      features: data.features,
      detailBanner: data.detailBanner,
      shippingReturns: data.shippingReturns,
      sizeGuide: data.sizeGuide,
      relatedProductIds: data.relatedProductIds,
      cardTitle: data.cardTitle,
      cardSubtitle: data.cardSubtitle,
      specs: data.specs,
      highlights: data.highlights,
      featuredOrder: data.featuredOrder,
      bestSellerOrder: data.bestSellerOrder,
      archivedAt: data.publishStatus === "archived" ? new Date() : null,
    };

    if (data.id) {
      const product = await Product.findById(data.id);
      if (!product) return actionError("Product not found.");
      const previousSlug = product.slug;
      const before = {
        name: product.name,
        slug: product.slug,
        price: product.price,
        stock: product.stock,
        publishStatus: product.publishStatus,
      };
      product.set(common);
      if (previousSlug !== data.slug) {
        product.slugHistory = appendSlugHistory(product.slugHistory, previousSlug, data.slug);
      }
      await product.save();

      await recordAudit({
        actor: session,
        action: "update",
        entity: "product",
        entityId: String(product._id),
        summary: `Updated product ${product.name}`,
        before,
        after: {
          name: product.name,
          slug: product.slug,
          price: product.price,
          stock: product.stock,
          publishStatus: product.publishStatus,
        },
      });
      revalidateStorefront([
        "products",
        `product-${product.slug}`,
        `product-${previousSlug}`,
        "homepage",
        "categories",
        "campaigns",
        "reviews",
      ]);
      return actionOk({ id: String(product._id) });
    }

    const created = await Product.create({ ...common, slugHistory: [] });
    await recordAudit({
      actor: session,
      action: "create",
      entity: "product",
      entityId: String(created._id),
      summary: `Created product ${created.name}`,
      after: {
        name: created.name,
        slug: created.slug,
        price: created.price,
        stock: created.stock,
        publishStatus: created.publishStatus,
      },
    });
    revalidateStorefront(["products", `product-${created.slug}`, "homepage", "categories", "campaigns"]);
    return actionOk({ id: String(created._id) });
  });
}

export async function deleteProductAction(input: unknown): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("products:write");
    const parsed = z.object({ id: idSchema }).safeParse(input);
    if (!parsed.success) return actionError("Invalid product.");

    await connectToDatabase();
    const product = await Product.findById(parsed.data.id);
    if (!product) return actionError("Product not found.");

    await product.deleteOne();
    await recordAudit({
      actor: session,
      action: "delete",
      entity: "product",
      entityId: parsed.data.id,
      summary: `Deleted product ${product.name}`,
      before: { name: product.name, slug: product.slug, price: product.price, stock: product.stock },
    });

    revalidateStorefront(["products", `product-${product.slug}`, "homepage", "categories", "campaigns"]);
    return actionOk(null);
  });
}

export async function bulkProductsAction(input: unknown): Promise<ActionResult<{ updated: number }>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("products:write");
    const parsed = productBulkSchema.safeParse(input);
    if (!parsed.success) return actionError("Select products and a bulk action.", fieldErrorsFromZod(parsed.error));

    await connectToDatabase();
    const { ids, intent } = parsed.data;
    const products = await Product.find({ _id: { $in: ids } });
    if (!products.length) return actionError("No matching products were found.");

    let updated = 0;
    let nextFeature: number | null = null;
    let nextBestSeller: number | null = null;

    if (intent === "feature" || intent === "best-seller") {
      const field = intent === "feature" ? "featuredOrder" : "bestSellerOrder";
      const highest = await Product.findOne({ [field]: { $ne: null } })
        .sort({ [field]: -1 })
        .select(field)
        .lean();
      const start = Number((highest as Record<string, unknown> | null)?.[field] ?? 0);
      if (intent === "feature") nextFeature = start;
      else nextBestSeller = start;
    }

    for (const product of products) {
      switch (intent) {
        case "publish":
          product.publishStatus = "active";
          product.archivedAt = null;
          break;
        case "draft":
          product.publishStatus = "draft";
          product.archivedAt = null;
          break;
        case "archive":
          product.publishStatus = "archived";
          product.archivedAt = new Date();
          break;
        case "feature":
          nextFeature = (nextFeature ?? 0) + 1;
          product.featuredOrder = nextFeature;
          break;
        case "unfeature":
          product.featuredOrder = null;
          break;
        case "best-seller":
          nextBestSeller = (nextBestSeller ?? 0) + 1;
          product.bestSellerOrder = nextBestSeller;
          break;
        case "remove-best-seller":
          product.bestSellerOrder = null;
          break;
        case "delete":
          await Product.findByIdAndDelete(product._id);
          updated += 1;
          continue;
      }
      await product.save();
      updated += 1;
    }

    await recordAudit({
      actor: session,
      action: "update",
      entity: "product",
      entityId: null,
      summary: `Bulk ${intent} applied to ${updated} product${updated === 1 ? "" : "s"}`,
      after: { ids, intent, updated },
    });

    revalidateStorefront(["products", "homepage", "categories", "campaigns"]);
    return actionOk({ updated });
  });
}

export async function bulkProductsFormAction(formData: FormData): Promise<void> {
  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const intent = String(formData.get("intent") ?? "");
  await bulkProductsAction({ ids, intent });
  revalidatePath("/admin/products");
}

export async function importProductsAction(input: unknown): Promise<ActionResult<{ created: number; updated: number; errors: string[] }>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("products:write");
    const parsed = productImportSchema.safeParse(input);
    if (!parsed.success) return actionError("Paste a CSV export or choose a file.", fieldErrorsFromZod(parsed.error));

    await connectToDatabase();
    const rows = parseCsv(parsed.data.csv);
    if (!rows.length) return actionError("The CSV did not contain any data rows.");
    if (rows.length > 500) return actionError("Import at most 500 rows at a time.");

    const categories = await Category.find({}).select("_id slug").lean();
    const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
    const errors: string[] = [];
    let created = 0;
    let updated = 0;

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const line = index + 2;
      const slug = row.slug?.toLowerCase();
      if (!slug) {
        errors.push(`Line ${line}: slug is required.`);
        continue;
      }
      const category = row.category ? categoryBySlug.get(row.category.toLowerCase()) : undefined;
      if (!category) {
        errors.push(`Line ${line}: category "${row.category || ""}" was not found.`);
        continue;
      }
      const price = Number(row.price);
      if (!Number.isFinite(price) || price < 0) {
        errors.push(`Line ${line}: price must be a positive number.`);
        continue;
      }
      const stock = Number(row.stock);
      if (!Number.isInteger(stock) || stock < 0) {
        errors.push(`Line ${line}: stock must be a whole number.`);
        continue;
      }
      const publishStatus = ["draft", "active", "archived"].includes(row.publish_status)
        ? (row.publish_status as "draft" | "active" | "archived")
        : "active";

      const existing = await Product.findOne({ slug });
      if (existing) {
        existing.name = row.name || existing.name;
        existing.price = price;
        existing.stock = stock;
        existing.status = statusFor(stock, existing.lowStockThreshold ?? 5);
        existing.category = category._id;
        existing.publishStatus = publishStatus;
        existing.archivedAt = publishStatus === "archived" ? new Date() : null;
        if (row.compare_at_price) {
          const compare = Number(row.compare_at_price);
          if (Number.isFinite(compare) && compare >= 0) existing.compareAtPrice = compare;
        }
        if (row.short_description) existing.shortDescription = row.short_description;
        if (row.image) {
          existing.image = row.image;
          existing.gallery = [row.image];
          existing.images = [{ src: row.image, thumbSrc: null, alt: existing.name }];
        }
        if (row.seo_title) existing.seoTitle = row.seo_title;
        if (row.seo_description) existing.seoDescription = row.seo_description;
        await existing.save();
        updated += 1;
        continue;
      }

      if (!row.name || !row.image) {
        errors.push(`Line ${line}: new products need a name and an image.`);
        continue;
      }

      await Product.create({
        name: row.name,
        slug,
        publishStatus,
        category: category._id,
        price,
        compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : null,
        stock,
        status: statusFor(stock, 5),
        shortDescription: row.short_description || row.name,
        description: row.description || row.short_description || row.name,
        image: row.image,
        gallery: [row.image],
        images: [{ src: row.image, thumbSrc: null, alt: row.name }],
        seoTitle: row.seo_title || "",
        seoDescription: row.seo_description || "",
        tags: row.tags ? row.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
      });
      created += 1;
    }

    await recordAudit({
      actor: session,
      action: "create",
      entity: "product",
      entityId: null,
      summary: `Imported products from CSV (${created} created, ${updated} updated)`,
      after: { created, updated, errors: errors.length },
    });

    revalidateStorefront(["products", "homepage", "categories", "campaigns"]);
    return actionOk({ created, updated, errors });
  });
}
