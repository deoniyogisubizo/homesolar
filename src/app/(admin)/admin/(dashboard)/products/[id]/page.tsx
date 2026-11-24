import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import {
  ProductEditor,
  type CategoryOption,
  type ProductFormValues,
} from "@/components/admin/catalog/ProductEditor";
import type { ProductOption } from "@/components/admin/content/ProductPicker";
import { guardPage } from "@/lib/admin/page-guard";
import { connectToDatabase } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";

export const metadata = { title: "Edit product" };

const MIN_IMAGE_SLOTS = 4;

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await guardPage("products:write");
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();

  await connectToDatabase();
  const product = await Product.findById(id).lean();
  if (!product) notFound();

  const [categories, relatedProducts] = await Promise.all([
    Category.find({}).sort({ name: 1 }).select("name").lean(),
    Product.find({ _id: { $in: product.relatedProductIds } }).select("name slug image").lean(),
  ]);

  const categoryOptions: CategoryOption[] = categories.map((category) => ({
    id: String(category._id),
    name: category.name,
  }));

  const relatedOptions: ProductOption[] = relatedProducts.map((entry) => ({
    id: String(entry._id),
    name: entry.name,
    slug: entry.slug,
    image: entry.image,
  }));

  const productImages = product.images.length
    ? product.images.map((image) => ({
        src: image.src,
        thumbSrc: image.thumbSrc ?? null,
        alt: image.alt ?? "",
      }))
    : [{ src: product.image, thumbSrc: null, alt: product.name }];
  const imageSlots = [
    ...productImages,
    ...Array.from({ length: Math.max(0, MIN_IMAGE_SLOTS - productImages.length) }, () => ({
      src: "",
      thumbSrc: null,
      alt: "",
    })),
  ];

  const initial: ProductFormValues = {
    id: String(product._id),
    name: product.name,
    pageTitle: product.pageTitle ?? null,
    slug: product.slug,
    publishStatus: product.publishStatus,
    category: String(product.category),
    price: product.price,
    compareAtPrice: product.compareAtPrice ?? null,
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold ?? null,
    shortDescription: product.shortDescription,
    description: product.description,
    detailsIntro: product.detailsIntro ?? "",
    shippingReturns: product.shippingReturns ?? "",
    badge: product.badge ?? null,
    images: imageSlots,
    cardTitle: product.cardTitle ?? null,
    cardSubtitle: product.cardSubtitle ?? null,
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
    noindex: product.noindex ?? false,
    brand: product.brand ?? "",
    gtin: product.gtin ?? "",
    mpn: product.mpn ?? "",
    featuredOrder: product.featuredOrder ?? null,
    bestSellerOrder: product.bestSellerOrder ?? null,
    options: {
      colors: (product.options?.colors ?? []).map((color) => ({ ...color })),
      sizes: (product.options?.sizes ?? []).map((size) => ({ ...size })),
    },
    variants: product.variants?.map((variant) => ({
      sku: variant.sku,
      color: variant.color ?? null,
      size: variant.size ?? null,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice ?? null,
      stock: variant.stock,
      isDefault: Boolean(variant.isDefault),
    })),
    features: product.features?.map((feature) => ({ ...feature })) ?? [],
    specs: product.specs?.map((spec) => ({ ...spec })) ?? [],
    detailBanner: product.detailBanner
      ? {
          image: product.detailBanner.image,
          icon: product.detailBanner.icon,
          lines: [...product.detailBanner.lines],
        }
      : null,
    sizeGuide: product.sizeGuide
      ? {
          title: product.sizeGuide.title,
          intro: product.sizeGuide.intro,
          rows: product.sizeGuide.rows.map((row) => ({ ...row })),
        }
      : null,
    relatedProductIds: product.relatedProductIds?.map((entry) => String(entry)) ?? null,
    tagsText: product.tags?.join(", ") ?? "",
    highlightsText: product.highlights?.join("\n") ?? "",
  };

  return (
    <>
      <PageHeader
        title={product.name}
        description={`Editing /product/${product.slug}. Published changes appear on the storefront immediately.`}
        breadcrumbs={[
          { label: "Catalog" },
          { label: "Products", href: "/admin/products" },
          { label: product.name },
        ]}
      />
      <PageBody>
        <ProductEditor initial={initial} categories={categoryOptions} relatedOptions={relatedOptions} />
      </PageBody>
    </>
  );
}
