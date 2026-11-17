import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";

const clickSchema = z.object({ token: z.string().min(10).max(200) });

export async function POST(
  request: Request,
  context: { params: Promise<{ orderNumber: string }> },
) {
  const { orderNumber } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = clickSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  await connectToDatabase();
  const order = await Order.findOneAndUpdate(
    { orderNumber, token: parsed.data.token },
    { $inc: { "whatsapp.clickCount": 1 }, $set: { "whatsapp.lastClickedAt": new Date() } },
    { new: true },
  )
    .select("whatsapp.clickCount")
    .lean();

  if (!order) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json({ ok: true, clickCount: order.whatsapp.clickCount });
}
