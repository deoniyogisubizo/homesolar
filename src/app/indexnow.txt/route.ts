import { indexNowKey } from "@/lib/seo/indexnow";

export async function GET() {
  const key = indexNowKey();
  if (!key) {
    return new Response("IndexNow key is not configured.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(key, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
