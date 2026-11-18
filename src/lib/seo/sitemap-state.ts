import "server-only";

import { connectToDatabase } from "@/lib/mongodb";
import { Setting } from "@/models/Setting";

const ONE_HOUR = 60 * 60 * 1000;

export async function recordSitemapGeneration(): Promise<void> {
  try {
    await connectToDatabase();
    const setting = await Setting.findOne({ key: "seo" }).lean();
    const value = (setting?.value ?? {}) as Record<string, unknown>;
    const previous = typeof value.sitemapGeneratedAt === "string" ? value.sitemapGeneratedAt : "";
    const previousTime = previous ? new Date(previous).getTime() : 0;

    if (Number.isFinite(previousTime) && Date.now() - previousTime < ONE_HOUR) return;

    await Setting.updateOne(
      { key: "seo" },
      { $set: { "value.sitemapGeneratedAt": new Date().toISOString() } },
    );
  } catch (error) {
    console.error("Unable to record sitemap generation time:", error);
  }
}
