import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, zodDetails } from "@/lib/api";
import { subscribeToNewsletter } from "@/lib/store";

const newsletterSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = newsletterSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Please enter a valid email address.", 422, zodDetails(parsed.error));
  }

  const result = await subscribeToNewsletter(parsed.data.email);
  return NextResponse.json({
    ok: true,
    alreadySubscribed: result.alreadySubscribed,
    message: result.alreadySubscribed
      ? "This email is already subscribed."
      : "Thanks for subscribing! Check your inbox for the latest solar offers.",
  });
}
