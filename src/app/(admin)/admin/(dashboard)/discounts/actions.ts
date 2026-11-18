"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/mongodb";
import { Campaign } from "@/models/Campaign";
import { Coupon } from "@/models/Coupon";
import { assertSameOrigin, requirePermission } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { actionError, actionOk, fieldErrorsFromZod, runAdminAction, type ActionResult } from "@/lib/admin/action-result";
import { revalidateStorefront } from "@/lib/admin/revalidate";
import { normalizeCouponCode } from "@/lib/coupons";
import {
  campaignBulkDeleteSchema,
  campaignDeleteSchema,
  campaignInputSchema,
  campaignToggleSchema,
  couponBulkDeleteSchema,
  couponDeleteSchema,
  couponInputSchema,
  couponStatusSchema,
} from "@/schemas/campaigns";

export async function bulkDeleteCampaignsAction(input: unknown): Promise<ActionResult<{ deleted: number }>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("campaigns:write");
    const parsed = campaignBulkDeleteSchema.safeParse(input);
    if (!parsed.success) return actionError("Invalid campaigns.");

    await connectToDatabase();
    const { ids } = parsed.data;
    const campaigns = await Campaign.find({ _id: { $in: ids } });
    if (!campaigns.length) return actionError("No matching campaigns were found.");

    let deleted = 0;

    for (const campaign of campaigns) {
      await campaign.deleteOne();
      deleted += 1;
    }

    await recordAudit({
      actor: session,
      action: "delete",
      entity: "campaign",
      entityId: null,
      summary: `Bulk deleted ${deleted} campaign${deleted === 1 ? "" : "s"}`,
      after: { ids, deleted },
    });

    revalidateStorefront(["campaigns", "products", "homepage", "categories"]);
    return actionOk({ deleted });
  });
}

export async function bulkDeleteCampaignsFormAction(formData: FormData): Promise<void> {
  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const intent = String(formData.get("intent") ?? "");
  await bulkDeleteCampaignsAction({ ids, intent });
  revalidatePath("/admin/discounts/campaigns");
}

function campaignPayload(data: ReturnType<typeof campaignInputSchema.parse>) {
  return {
    name: data.name,
    slug: data.slug,
    description: data.description,
    startsAt: new Date(data.startsAt),
    endsAt: new Date(data.endsAt),
    discountType: data.discountType,
    value: data.value,
    scope: data.scope,
    categoryIds: data.categoryIds,
    productIds: data.productIds,
    excludedProductIds: data.excludedProductIds,
    priority: data.priority,
    stackWithCoupons: data.stackWithCoupons,
    promoCode: data.promoCode.toUpperCase(),
    usageLimit: data.usageLimit,
    active: data.active,
    pausedAt: data.active ? null : new Date(),
    notes: data.notes,
    storefront: data.storefront,
  };
}

export async function saveCampaignAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("campaigns:write");
    const parsed = campaignInputSchema.safeParse(input);
    if (!parsed.success) return actionError("Check the campaign fields.", fieldErrorsFromZod(parsed.error));

    await connectToDatabase();
    const data = parsed.data;
    const duplicate = await Campaign.findOne({ slug: data.slug, _id: { $ne: data.id ?? null } })
      .select("_id")
      .lean();
    if (duplicate) return actionError("That URL slug is already used by another campaign.", { slug: "Slug already in use." });

    if (data.id) {
      const campaign = await Campaign.findById(data.id);
      if (!campaign) return actionError("Campaign not found.");
      const before = {
        name: campaign.name,
        active: campaign.active,
        value: campaign.value,
        startsAt: campaign.startsAt,
        endsAt: campaign.endsAt,
      };
      campaign.set(campaignPayload(data));
      campaign.endedAt = null;
      await campaign.save();

      await recordAudit({
        actor: session,
        action: "update",
        entity: "campaign",
        entityId: String(campaign._id),
        summary: `Updated campaign ${campaign.name}`,
        before,
        after: {
          name: campaign.name,
          active: campaign.active,
          value: campaign.value,
          startsAt: campaign.startsAt,
          endsAt: campaign.endsAt,
        },
      });
      revalidateStorefront(["campaigns", "products", "homepage", "categories"]);
      revalidatePath("/admin/discounts/campaigns");
      revalidatePath(`/admin/discounts/campaigns/${String(campaign._id)}`);
      return actionOk({ id: String(campaign._id) });
    }

    const created = await Campaign.create(campaignPayload(data));
    await recordAudit({
      actor: session,
      action: "create",
      entity: "campaign",
      entityId: String(created._id),
      summary: `Created campaign ${created.name}`,
      after: { name: created.name, slug: created.slug, value: created.value, scope: created.scope },
    });
    revalidateStorefront(["campaigns", "products", "homepage", "categories"]);
    revalidatePath("/admin/discounts/campaigns");
    return actionOk({ id: String(created._id) });
  });
}

export async function toggleCampaignAction(input: unknown): Promise<ActionResult<{ active: boolean }>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("campaigns:write");
    const parsed = campaignToggleSchema.safeParse(input);
    if (!parsed.success) return actionError("Invalid campaign.");

    await connectToDatabase();
    const campaign = await Campaign.findById(parsed.data.id);
    if (!campaign) return actionError("Campaign not found.");

    const before = campaign.active;
    campaign.active = parsed.data.active;
    campaign.pausedAt = parsed.data.active ? null : new Date();
    await campaign.save();

    await recordAudit({
      actor: session,
      action: "update",
      entity: "campaign",
      entityId: String(campaign._id),
      summary: `${parsed.data.active ? "Resumed" : "Paused"} campaign ${campaign.name}`,
      before: { active: before },
      after: { active: campaign.active },
    });

    revalidateStorefront(["campaigns", "products", "homepage", "categories"]);
    revalidatePath("/admin/discounts/campaigns");
    revalidatePath(`/admin/discounts/campaigns/${String(campaign._id)}`);
    return actionOk({ active: campaign.active });
  });
}

export async function deleteCampaignAction(input: unknown): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("campaigns:write");
    const parsed = campaignDeleteSchema.safeParse(input);
    if (!parsed.success) return actionError("Invalid campaign.");

    await connectToDatabase();
    const campaign = await Campaign.findById(parsed.data.id);
    if (!campaign) return actionError("Campaign not found.");

    const snapshot = { name: campaign.name, slug: campaign.slug, active: campaign.active };
    await campaign.deleteOne();
    await recordAudit({
      actor: session,
      action: "delete",
      entity: "campaign",
      entityId: parsed.data.id,
      summary: `Deleted campaign ${snapshot.name}`,
      before: snapshot,
    });

    revalidateStorefront(["campaigns", "products", "homepage", "categories"]);
    revalidatePath("/admin/discounts/campaigns");
    return actionOk(null);
  });
}

export async function saveCouponAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("coupons:write");
    const parsed = couponInputSchema.safeParse(input);
    if (!parsed.success) return actionError("Check the coupon fields.", fieldErrorsFromZod(parsed.error));

    await connectToDatabase();
    const data = parsed.data;
    const code = normalizeCouponCode(data.code);
    const codeLower = code.toLowerCase();
    const duplicate = await Coupon.findOne({ codeLower, _id: { $ne: data.id ?? null } })
      .select("_id")
      .lean();
    if (duplicate) return actionError("That coupon code already exists.", { code: "Code already in use." });

    const payload = {
      code,
      codeLower,
      description: data.description,
      type: data.type,
      value: data.type === "free_shipping" ? 0 : data.value,
      minSubtotal: data.minSubtotal,
      maxDiscount: data.maxDiscount,
      usageLimit: data.usageLimit,
      perCustomerLimit: data.perCustomerLimit,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      scope: data.scope,
      productIds: data.productIds,
      categoryIds: data.categoryIds,
      status: data.status,
    };

    if (data.id) {
      const coupon = await Coupon.findById(data.id);
      if (!coupon) return actionError("Coupon not found.");
      const before = {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        status: coupon.status,
      };
      coupon.set(payload);
      await coupon.save();

      await recordAudit({
        actor: session,
        action: "update",
        entity: "coupon",
        entityId: String(coupon._id),
        summary: `Updated coupon ${coupon.code}`,
        before,
        after: { code: coupon.code, type: coupon.type, value: coupon.value, status: coupon.status },
      });
      revalidateStorefront(["coupons", "products", "campaigns"]);
      revalidatePath("/admin/discounts/coupons");
      revalidatePath(`/admin/discounts/coupons/${String(coupon._id)}`);
      return actionOk({ id: String(coupon._id) });
    }

    const created = await Coupon.create(payload);
    await recordAudit({
      actor: session,
      action: "create",
      entity: "coupon",
      entityId: String(created._id),
      summary: `Created coupon ${created.code}`,
      after: { code: created.code, type: created.type, value: created.value, status: created.status },
    });
    revalidateStorefront(["coupons", "products", "campaigns"]);
    revalidatePath("/admin/discounts/coupons");
    return actionOk({ id: String(created._id) });
  });
}

export async function setCouponStatusAction(input: unknown): Promise<ActionResult<{ status: string }>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("coupons:write");
    const parsed = couponStatusSchema.safeParse(input);
    if (!parsed.success) return actionError("Invalid coupon status.");

    await connectToDatabase();
    const coupon = await Coupon.findById(parsed.data.id);
    if (!coupon) return actionError("Coupon not found.");

    const before = coupon.status;
    coupon.status = parsed.data.status;
    await coupon.save();

    await recordAudit({
      actor: session,
      action: "update",
      entity: "coupon",
      entityId: String(coupon._id),
      summary: `Set coupon ${coupon.code} to ${coupon.status}`,
      before: { status: before },
      after: { status: coupon.status },
    });

    revalidateStorefront(["coupons", "products", "campaigns"]);
    revalidatePath("/admin/discounts/coupons");
    revalidatePath(`/admin/discounts/coupons/${String(coupon._id)}`);
    return actionOk({ status: coupon.status });
  });
}

export async function deleteCouponAction(input: unknown): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("coupons:write");
    const parsed = couponDeleteSchema.safeParse(input);
    if (!parsed.success) return actionError("Invalid coupon.");

    await connectToDatabase();
    const coupon = await Coupon.findById(parsed.data.id);
    if (!coupon) return actionError("Coupon not found.");

    const snapshot = { code: coupon.code, type: coupon.type, value: coupon.value, status: coupon.status };
    await coupon.deleteOne();
    await recordAudit({
      actor: session,
      action: "delete",
      entity: "coupon",
      entityId: parsed.data.id,
      summary: `Deleted coupon ${snapshot.code}`,
      before: snapshot,
    });

    revalidateStorefront(["coupons", "products", "campaigns"]);
    revalidatePath("/admin/discounts/coupons");
    return actionOk(null);
  });
}

export async function bulkDeleteCouponsAction(input: unknown): Promise<ActionResult<{ deleted: number }>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("coupons:write");
    const parsed = couponBulkDeleteSchema.safeParse(input);
    if (!parsed.success) return actionError("Invalid coupons.");

    await connectToDatabase();
    const { ids } = parsed.data;
    const coupons = await Coupon.find({ _id: { $in: ids } });
    if (!coupons.length) return actionError("No matching coupons were found.");

    let deleted = 0;

    for (const coupon of coupons) {
      await coupon.deleteOne();
      deleted += 1;
    }

    await recordAudit({
      actor: session,
      action: "delete",
      entity: "coupon",
      entityId: null,
      summary: `Bulk deleted ${deleted} coupon${deleted === 1 ? "" : "s"}`,
      after: { ids, deleted },
    });

    revalidateStorefront(["coupons", "products", "campaigns"]);
    return actionOk({ deleted });
  });
}

export async function bulkDeleteCouponsFormAction(formData: FormData): Promise<void> {
  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const intent = String(formData.get("intent") ?? "");
  await bulkDeleteCouponsAction({ ids, intent });
  revalidatePath("/admin/discounts/coupons");
}
