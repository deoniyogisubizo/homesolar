import "server-only";

import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { Campaign } from "@/models/Campaign";
import { Page } from "@/models/Page";
import { SiteContent } from "@/models/SiteContent";
import { Setting } from "@/models/Setting";

export type MediaUsage = { label: string; href: string };

export async function findMediaUsage(url: string): Promise<MediaUsage[]> {
  await connectToDatabase();
  const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(escaped, "i");

  const [products, categories, campaigns, pages, content, settings] = await Promise.all([
    Product.find({
      $or: [{ image: pattern }, { gallery: pattern }, { "images.src": pattern }, { "images.thumbSrc": pattern }],
    })
      .select("name slug")
      .limit(10)
      .lean(),
    Category.find({ image: pattern }).select("name slug").limit(10).lean(),
    Campaign.find({
      $or: [
        { "storefront.promoImage": pattern },
        { "storefront.bannerImage": pattern },
      ],
    })
      .select("name")
      .limit(10)
      .lean(),
    Page.find({ content: pattern }).select("title slug").limit(10).lean(),
    SiteContent.find({}).select("key content").lean(),
    Setting.find({}).select("key value").lean(),
  ]);

  const usage: MediaUsage[] = products.map((product) => ({
    label: `Product: ${product.name}`,
    href: `/admin/products/${product._id}`,
  }));
  usage.push(
    ...categories.map((category) => ({
      label: `Category: ${category.name}`,
      href: `/admin/categories/${category._id}`,
    })),
  );
  usage.push(
    ...campaigns.map((campaign) => ({
      label: `Campaign: ${campaign.name}`,
      href: `/admin/discounts/campaigns/${campaign._id}`,
    })),
  );
  usage.push(
    ...pages.map((page) => ({
      label: `Page: ${page.title}`,
      href: `/admin/storefront/pages/${page._id}`,
    })),
  );

  for (const document of content) {
    if (JSON.stringify(document.content ?? "").includes(url)) {
      usage.push({ label: "Homepage content", href: "/admin/storefront/homepage" });
      break;
    }
  }
  for (const document of settings) {
    if (JSON.stringify(document.value ?? "").includes(url)) {
      usage.push({ label: `Settings: ${document.key}`, href: "/admin/settings/general" });
      break;
    }
  }

  return usage;
}
