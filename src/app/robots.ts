import type { MetadataRoute } from "next";
import { getSetting } from "@/lib/admin/settings";
import { buildRobots } from "@/lib/seo/robots";
import { getSiteUrl } from "@/lib/site";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const seo = await getSetting("seo");
  return buildRobots(seo, getSiteUrl());
}
