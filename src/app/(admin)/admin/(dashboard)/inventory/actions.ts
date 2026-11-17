"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { InventoryMovement } from "@/models/InventoryMovement";
import { assertSameOrigin, requirePermission } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { actionError, actionOk, fieldErrorsFromZod, runAdminAction, type ActionResult } from "@/lib/admin/action-result";
import { revalidateStorefront } from "@/lib/admin/revalidate";
import { inventoryAdjustSchema } from "@/schemas/inventory";

function statusFor(stock: number, threshold: number | null) {
  const limit = threshold ?? 5;
  if (stock <= 0) return "out_of_stock" as const;
  if (stock <= limit) return "low_stock" as const;
  return "in_stock" as const;
}

export async function adjustInventoryAction(
  input: unknown,
): Promise<ActionResult<{ stockAfter: number; delta: number }>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("inventory:write");
    const parsed = inventoryAdjustSchema.safeParse(input);
    if (!parsed.success) return actionError("Check the stock adjustment fields.", fieldErrorsFromZod(parsed.error));

    const data = parsed.data;
    await connectToDatabase();
    const product = await Product.findById(data.productId);
    if (!product) return actionError("Product not found.");

    const variant = data.variantSku
      ? product.variants.find((entry) => entry.sku === data.variantSku)
      : undefined;
    if (data.variantSku && !variant) return actionError("That variant no longer exists on this product.");

    const current = variant ? variant.stock : product.stock;
    const next = data.mode === "set" ? data.value : current + data.value;
    if (next < 0) {
      return actionError(`Stock cannot go below zero. Current stock is ${current}.`, {
        value: "Enter a value that leaves at least zero units.",
      });
    }
    if (next > 10_000_000) {
      return actionError("That stock level is too large.", { value: "Enter a smaller stock level." });
    }

    const delta = next - current;
    if (delta === 0) {
      return actionError("The stock level is unchanged. Enter a different value.");
    }

    if (variant) {
      variant.stock = next;
      await product.save();
    } else {
      product.stock = next;
      product.status = statusFor(next, product.lowStockThreshold ?? null);
      await product.save();
    }

    await InventoryMovement.create({
      productId: product._id,
      variantSku: data.variantSku,
      delta,
      stockAfter: next,
      reason: data.reason,
      note: data.note,
      actorId: session.id,
      actorEmail: session.email,
    });

    await recordAudit({
      actor: session,
      action: "update",
      entity: "inventory",
      entityId: String(product._id),
      summary: `Adjusted stock for ${product.name}${data.variantSku ? ` (${data.variantSku})` : ""} by ${delta > 0 ? "+" : ""}${delta}`,
      before: { stock: current },
      after: { stock: next, reason: data.reason, note: data.note || null },
    });

    revalidateStorefront(["products", `product-${product.slug}`, "homepage", "categories"]);
    revalidatePath("/admin/inventory");
    revalidatePath(`/admin/inventory/${product._id}`);
    return actionOk({ stockAfter: next, delta });
  });
}
