"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { Customer } from "@/models/Customer";
import { assertSameOrigin, requirePermission } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { actionError, actionOk, fieldErrorsFromZod, runAdminAction, type ActionResult } from "@/lib/admin/action-result";
import { customerInputSchema, customerBulkDeleteSchema } from "@/schemas/customers";
import { idSchema } from "@/schemas/common";

export async function deleteCustomerAction(input: unknown): Promise<ActionResult<null>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("customers:write");
    const parsed = z.object({ id: idSchema }).safeParse(input);
    if (!parsed.success) return actionError("Invalid customer.");

    await connectToDatabase();
    const customer = await Customer.findById(parsed.data.id);
    if (!customer) return actionError("Customer not found.");

    await customer.deleteOne();
    await recordAudit({
      actor: session,
      action: "delete",
      entity: "customer",
      entityId: parsed.data.id,
      summary: `Deleted customer ${customer.name}`,
      before: { name: customer.name, phone: customer.phone },
    });

    return actionOk(null);
  });
}

export async function saveCustomerAction(input: unknown): Promise<ActionResult<{ updated: number }>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("customers:write");
    const parsed = customerInputSchema.safeParse(input);
    if (!parsed.success) return actionError("Check the customer fields.", fieldErrorsFromZod(parsed.error));

    await connectToDatabase();
    const customer = await Customer.findById(parsed.data.id);
    if (!customer) return actionError("Customer not found.");

    customer.name = parsed.data.name;
    customer.email = parsed.data.email;
    customer.phone = parsed.data.phone;
    customer.blocked = parsed.data.blocked ?? false;
    customer.addresses = parsed.data.addresses ?? [];
    await customer.save();

    await recordAudit({
      actor: session,
      action: "update",
      entity: "customer",
      entityId: String(customer._id),
      summary: `Updated customer ${customer.name}`,
      before: { name: customer.name, phone: customer.phone },
      after: { name: customer.name, email: customer.email, phone: customer.phone, blocked: customer.blocked, addresses: customer.addresses },
    });


    revalidatePath("/admin/customers");
    return actionOk({ updated: 1 });
  });
}

export async function bulkDeleteCustomersAction(input: unknown): Promise<ActionResult<{ deleted: number }>> {
  return runAdminAction(async () => {
    await assertSameOrigin();
    const session = await requirePermission("customers:write");
    const parsed = customerBulkDeleteSchema.safeParse(input);
    if (!parsed.success) return actionError("Invalid customers.");

    await connectToDatabase();
    const { ids } = parsed.data;
    const customers = await Customer.find({ _id: { $in: ids } });
    if (!customers.length) return actionError("No matching customers were found.");

    let deleted = 0;

    for (const customer of customers) {
      await customer.deleteOne();
      deleted += 1;
    }

    await recordAudit({
      actor: session,
      action: "delete",
      entity: "customer",
      entityId: null,
      summary: `Bulk deleted ${deleted} customer${deleted === 1 ? "" : "s"}`,
      after: { ids, deleted },
    });

    return actionOk({ deleted });
  });
}

export async function bulkDeleteCustomersFormAction(formData: FormData): Promise<void> {
  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const intent = String(formData.get("intent") ?? "");
  await bulkDeleteCustomersAction({ ids, intent });
  revalidatePath("/admin/customers");
}