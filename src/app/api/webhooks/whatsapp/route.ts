import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { MessageOutbox } from "@/models/MessageOutbox";
import { getWhatsAppConfig } from "@/lib/whatsapp/config";


function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function GET(request: Request) {
  const config = getWhatsAppConfig();
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge") ?? "";

  if (!config.webhookVerifyToken) {
    return NextResponse.json({ ok: false, error: "Webhook verify token is not configured." }, { status: 503 });
  }
  if (mode === "subscribe" && token === config.webhookVerifyToken) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ ok: false, error: "Verification failed." }, { status: 403 });
}

type WebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        statuses?: Array<{
          id?: string;
          status?: string;
          timestamp?: string;
          errors?: Array<{ title?: string; message?: string }>;
        }>;
      };
    }>;
  }>;
};

export async function POST(request: Request) {
  const config = getWhatsAppConfig();
  if (!config.appSecret) {
    return NextResponse.json({ ok: false, error: "WHATSAPP_APP_SECRET is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  if (!verifySignature(rawBody, signature, config.appSecret)) {
    return NextResponse.json({ ok: false, error: "Invalid signature." }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid payload." }, { status: 400 });
  }

  await connectToDatabase();
  const statuses = (payload.entry ?? []).flatMap((entry) =>
    (entry.changes ?? []).flatMap((change) => change.value?.statuses ?? []),
  );

  for (const status of statuses) {
    if (!status.id || !status.status) continue;
    const error = status.errors?.[0]?.message ?? status.errors?.[0]?.title ?? "";
    await MessageOutbox.updateOne(
      { providerMessageId: status.id },
      {
        $set: {
          deliveryStatus: status.status,
          ...(error ? { lastError: error.slice(0, 1000) } : {}),
        },
      },
    );
  }

  return NextResponse.json({ ok: true, updated: statuses.length });
}
