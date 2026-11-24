import { after, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { getInvoiceByDeliveryToken } from "@/lib/invoices";
import { confirmDelivery } from "@/lib/delivery";
import { getClientIp, getUserAgent } from "@/lib/admin/auth";
import { enqueueDeliveryMessage, processOutbox } from "@/lib/whatsapp/outbox";

const confirmSchema = z.object({
  pin: z
    .string()
    .regex(/^\d{6}$/, "Enter the 6 digit delivery code.")
    .optional()
    .default("000000"),
  confirmedBy: z.string().trim().min(1, "Enter the confirming agent name.").max(120),
  collectedAmount: z.number().min(0).max(1000000),
  collectedMethod: z.enum(["cash", "mobile_money"]).default("cash"),
  coordinates: z
    .object({
      lat: z.number(),
      lng: z.number(),
      accuracy: z.number().optional(),
    })
    .nullable()
    .optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  const ip = await getClientIp();
  const allowedByIp = checkRateLimit(`delivery:confirm:ip:${ip}`, 10, 60 * 1000);
  const allowedByToken = checkRateLimit(`delivery:confirm:token:${token}`, 10, 60 * 1000);
  if (!allowedByIp || !allowedByToken) {
    return NextResponse.json({ ok: false, error: "Too many delivery attempts. Try again later." }, { status: 429 });
  }

  const invoice = await getInvoiceByDeliveryToken(token);
  if (!invoice) {
    return NextResponse.json({ ok: false, error: "Delivery link not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Check the delivery details.", details: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })) },
      { status: 422 },
    );
  }

  const result = await confirmDelivery({
    orderId: String(invoice.orderId),
    deliveryToken: token,
    pin: parsed.data.pin,
    confirmedBy: parsed.data.confirmedBy,
    collectedAmount: parsed.data.collectedAmount,
    collectedMethod: parsed.data.collectedMethod === "mobile_money" ? "mobile_money" : "cash_on_delivery",
    coordinates: parsed.data.coordinates ?? null,
    userAgent: await getUserAgent(),
    ip,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.locked ? 423 : 400 });
  }

  if (!result.alreadyDelivered) {
    const orderId = String(invoice.orderId);
    after(async () => {
      try {
        await enqueueDeliveryMessage(orderId);
        await processOutbox(5);
      } catch {
        // Pending outbox rows are retried by the cron route.
      }
    });
  }

  return NextResponse.json({
    ok: true,
    delivered: !result.alreadyDelivered,
    alreadyDelivered: result.alreadyDelivered,
    orderNumber: result.orderNumber,
    deliveredAt: result.deliveredAt ?? null,
    mismatch: result.mismatch ?? false,
  });
}
