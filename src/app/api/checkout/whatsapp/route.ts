import { after, NextResponse } from "next/server";
import { apiError, zodDetails } from "@/lib/api";
import { ensureSessionId } from "@/lib/session";
import { checkoutSchema } from "@/schemas/checkout";
import { checkRateLimit } from "@/lib/rate-limit";
import { CheckoutError, createWhatsAppOrder } from "@/lib/orders/create-order";
import { notifyNewOrder } from "@/lib/orders/notifications";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Check the checkout details.", 422, zodDetails(parsed.error));
  }
  if (parsed.data.honeypot.trim()) {
    return apiError("The checkout request could not be processed.", 400);
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const allowedByIp = checkRateLimit(`checkout:ip:${ip}`, 5, 60 * 60 * 1000);
  const allowedByPhone = checkRateLimit(
    `checkout:phone:${parsed.data.customer.phone}`,
    5,
    60 * 60 * 1000,
  );
  if (!allowedByIp || !allowedByPhone) {
    return apiError("Too many checkout attempts. Please wait an hour or contact us on WhatsApp.", 429);
  }

  const sessionId = await ensureSessionId();

  try {
    const order = await createWhatsAppOrder(sessionId, parsed.data);
    if (order.created && order.orderId) {
      after(async () => {
        await notifyNewOrder(order.orderId);
      });
    }
    return NextResponse.json(
      {
        orderNumber: order.orderNumber,
        token: order.token,
        whatsappUrl: order.whatsappUrl,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof CheckoutError) {
      return apiError(error.message, error.status, error.fieldErrors);
    }
    throw error;
  }
}
