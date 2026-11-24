import dotenv from "dotenv";
import mongoose from "mongoose";
import XLSX from "xlsx";
import { Category } from "../src/models/Category";
import { Product } from "../src/models/Product";
import { Order } from "../src/models/Order";
import { InventoryMovement } from "../src/models/InventoryMovement";
import { Cart } from "../src/models/Cart";
import { Wishlist } from "../src/models/Wishlist";
import { Review } from "../src/models/Review";

dotenv.config({ path: ".env.local" });

const EXCEL_PATH = "dataset/SHS_Website_Catalog_Images_Voltage_TemperatureFINAL.xlsx";

function parseStatus(listingStatus: string): "draft" | "active" | "archived" {
  if (!listingStatus) return "draft";
  const status = listingStatus.toUpperCase().trim();
  if (status.includes("DO NOT PUBLISH")) return "archived";
  if (status.includes("VERIFY") || status.includes("CHECK") || status.includes("IDENTIFICATION")) return "draft";
  if (status === "ACTIVE" || status === "PUBLISH") return "active";
  return "draft";
}

function parseStock(stockQty: unknown): number {
  if (stockQty === null || stockQty === undefined || stockQty === "") return 0;
  const num = Number(stockQty);
  return Number.isFinite(num) && num >= 0 ? Math.floor(num) : 0;
}

function parsePrice(price: unknown): number {
  if (price === null || price === undefined || price === "") return 0;
  const num = Number(price);
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

function generateSlug(name: string, sku: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}-${sku.toLowerCase()}`;
}

function generateShortDescription(specs: string, model: string): string {
  if (specs && specs.trim()) return specs.trim().slice(0, 400);
  if (model && model.trim()) return model.trim().slice(0, 400);
  return "Electronic component";
}

function generateDescription(name: string, specs: string, model: string, voltageTempMeaning: string, datasheet: string): string {
  let desc = `${name}`;
  if (model && model.trim()) desc += ` (${model.trim()})`;
  desc += ".\n\n";
  if (specs && specs.trim()) desc += `${specs.trim()}\n\n`;
  if (voltageTempMeaning && voltageTempMeaning.trim()) desc += `Operating conditions: ${voltageTempMeaning.trim()}\n\n`;
  if (datasheet && datasheet.trim()) desc += `Datasheet: ${datasheet.trim()}`;
  return desc.slice(0, 10000);
}

function generateImage(imageUrl: string, name: string): string {
  if (imageUrl && imageUrl.trim() && (imageUrl.startsWith("http") || imageUrl.startsWith("/"))) {
    return imageUrl.trim();
  }
  // Return placeholder based on category
  return "/images/products/component-placeholder.jpg";
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is missing from .env.local");

  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 12000 });
  console.log("Connected.");

  // 1. CLEAN DATABASE
  console.log("\n=== CLEANING DATABASE ===");
  
  console.log("Deleting all products...");
  const productDeleteResult = await Product.deleteMany({});
  console.log(`  Deleted ${productDeleteResult.deletedCount} products`);

  console.log("Deleting all categories...");
  const categoryDeleteResult = await Category.deleteMany({});
  console.log(`  Deleted ${categoryDeleteResult.deletedCount} categories`);

  console.log("Deleting all orders...");
  const orderDeleteResult = await Order.deleteMany({});
  console.log(`  Deleted ${orderDeleteResult.deletedCount} orders`);

  console.log("Deleting all inventory movements...");
  const movementDeleteResult = await InventoryMovement.deleteMany({});
  console.log(`  Deleted ${movementDeleteResult.deletedCount} movements`);

  console.log("Deleting all carts...");
  const cartDeleteResult = await Cart.deleteMany({});
  console.log(`  Deleted ${cartDeleteResult.deletedCount} carts`);

  console.log("Deleting all wishlists...");
  const wishlistDeleteResult = await Wishlist.deleteMany({});
  console.log(`  Deleted ${wishlistDeleteResult.deletedCount} wishlists`);

  console.log("Deleting all reviews...");
  const reviewDeleteResult = await Review.deleteMany({});
  console.log(`  Deleted ${reviewDeleteResult.deletedCount} reviews`);

  console.log("Database cleaned successfully.");

  // 2. READ EXCEL FILE
  console.log("\n=== READING EXCEL FILE ===");
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheet = workbook.Sheets["Website Products"];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Skip header row
  const dataRows = rows.slice(1) as unknown[][];
  console.log(`Found ${dataRows.length} product rows in Excel`);

  // 3. EXTRACT UNIQUE CATEGORIES
  const categorySet = new Set<string>();
  for (const row of dataRows) {
    const category = row[2] as string;
    if (category && category.trim()) {
      categorySet.add(category.trim());
    }
  }

  const categories = Array.from(categorySet).sort();
  console.log(`\nFound ${categories.length} unique categories:`);
  categories.forEach(c => console.log(`  - ${c}`));

  // 4. CREATE CATEGORIES
  console.log("\n=== CREATING CATEGORIES ===");
  const categoryMap = new Map<string, mongoose.Types.ObjectId>();
  
  for (let i = 0; i < categories.length; i++) {
    const categoryName = categories[i];
    const slug = categoryName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const category = await Category.findOneAndUpdate(
      { slug },
      {
        $set: {
          name: categoryName,
          slug,
          description: `${categoryName} components and parts`,
          active: true,
          order: i + 1,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    ).select("_id slug");

    if (category) {
      categoryMap.set(categoryName, category._id);
      console.log(`  ✓ ${categoryName} (${slug}) -> ${category._id}`);
    }
  }

  // 5. CREATE PRODUCTS
  console.log("\n=== CREATING PRODUCTS ===");
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const lineNumber = i + 2; // Excel line number (1-indexed + header)

    try {
      const sku = (row[0] as string)?.trim();
      const name = (row[1] as string)?.trim();
      const categoryName = (row[2] as string)?.trim();
      const model = (row[3] as string)?.trim();
      const specs = (row[4] as string)?.trim();
      const stockQty = row[5];
      const price = row[6];
      const imageUrl = (row[7] as string)?.trim();
      const listingStatus = (row[8] as string)?.trim();
      const refUrl = (row[9] as string)?.trim();
      const photoSearch = (row[10] as string)?.trim();
      const minVoltage = row[11];
      const maxVoltage = row[12];
      const minTemp = row[13];
      const maxTemp = row[14];
      const voltageTempMeaning = (row[15] as string)?.trim();
      const datasheet = (row[16] as string)?.trim();
      const photoStatus = (row[17] as string)?.trim();

      // Validate required fields
      if (!sku) {
        errors.push(`Line ${lineNumber}: Missing SKU`);
        skipped++;
        continue;
      }
      if (!name) {
        errors.push(`Line ${lineNumber}: Missing product name`);
        skipped++;
        continue;
      }
      if (!categoryName || !categoryMap.has(categoryName)) {
        errors.push(`Line ${lineNumber}: Category "${categoryName}" not found`);
        skipped++;
        continue;
      }

      const categoryId = categoryMap.get(categoryName)!;
      const publishStatus = parseStatus(listingStatus);
      const stock = parseStock(stockQty);
      const unitPrice = parsePrice(price);
      const slug = generateSlug(name, sku);
      const shortDescription = generateShortDescription(specs, model);
      const description = generateDescription(name, specs, model, voltageTempMeaning, datasheet);
      const image = generateImage(imageUrl, name);

      // Build voltage/temp specs for specs array
      const specItems: Array<{ label: string; value: string }> = [];
      if (model) specItems.push({ label: "Model", value: model });
      if (minVoltage !== null && minVoltage !== undefined && minVoltage !== "") 
        specItems.push({ label: "Min Voltage (V)", value: String(minVoltage) });
      if (maxVoltage !== null && maxVoltage !== undefined && maxVoltage !== "") 
        specItems.push({ label: "Max Voltage (V)", value: String(maxVoltage) });
      if (minTemp !== null && minTemp !== undefined && minTemp !== "") 
        specItems.push({ label: "Min Temp (°C)", value: String(minTemp) });
      if (maxTemp !== null && maxTemp !== undefined && maxTemp !== "") 
        specItems.push({ label: "Max Temp (°C)", value: String(maxTemp) });
      if (voltageTempMeaning) specItems.push({ label: "Voltage/Temp Meaning", value: voltageTempMeaning });
      if (datasheet) specItems.push({ label: "Datasheet", value: datasheet });

      // Determine status based on stock
      let status: "in_stock" | "low_stock" | "out_of_stock";
      if (stock <= 0) status = "out_of_stock";
      else if (stock <= 5) status = "low_stock";
      else status = "in_stock";

      // Check if product already exists (by slug)
      const existing = await Product.findOne({ slug });
      if (existing) {
        errors.push(`Line ${lineNumber}: Product with slug "${slug}" already exists`);
        skipped++;
        continue;
      }

      // Create product
      await Product.create({
        name,
        pageTitle: name,
        slug,
        slugHistory: [],
        publishStatus,
        tags: [],
        seoTitle: "",
        seoDescription: "",
        noindex: false,
        brand: "",
        gtin: "",
        mpn: sku,
        lowStockThreshold: 5,
        archivedAt: publishStatus === "archived" ? new Date() : null,
        description,
        shortDescription,
        price: unitPrice,
        priceMax: null,
        image,
        gallery: [image],
        category: categoryId,
        badge: null,
        rating: 0,
        reviewCount: 0,
        ratingAverage: 0,
        ratingCount: 0,
        stock,
        status,
        compareAtPrice: null,
        images: [{ src: image, thumbSrc: null, alt: name }],
        options: { colors: [], sizes: [] },
        variants: [],
        detailsIntro: description,
        features: [],
        detailBanner: null,
        shippingReturns: "Contact us for shipping and return information.",
        sizeGuide: null,
        relatedProductIds: [],
        cardTitle: null,
        cardSubtitle: null,
        specs: specItems,
        highlights: [],
        featuredOrder: null,
        bestSellerOrder: null,
        campaignIds: [],
      });

      created++;
      if (created % 20 === 0) {
        console.log(`  Created ${created} products...`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Line ${lineNumber}: ${errorMsg}`);
      skipped++;
    }
  }

  console.log(`\n=== IMPORT COMPLETE ===`);
  console.log(`Products created: ${created}`);
  console.log(`Products skipped: ${skipped}`);
  console.log(`Errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log("\nErrors:");
    errors.forEach(e => console.log(`  - ${e}`));
  }

  // 6. VERIFY
  const productCount = await Product.countDocuments();
  const categoryCount = await Category.countDocuments();
  console.log(`\nVerification:`);
  console.log(`  Categories in DB: ${categoryCount}`);
  console.log(`  Products in DB: ${productCount}`);

  await mongoose.disconnect();
  console.log("\nDisconnected from MongoDB.");
}

main().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});