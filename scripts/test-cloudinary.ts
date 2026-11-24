import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";
import path from "path";

async function main() {
  console.log("Cloudinary config check:");
  console.log("  CLOUDINARY_CLOUD_NAME:", process.env.CLOUDINARY_CLOUD_NAME);
  console.log("  CLOUDINARY_API_KEY:", process.env.CLOUDINARY_API_KEY);
  console.log("  CLOUDINARY_API_SECRET:", process.env.CLOUDINARY_API_SECRET ? "***" : "MISSING");
  
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.log("\n❌ Missing Cloudinary credentials");
    return;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  // Create a simple test image (1x1 pixel PNG)
  const testImageBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );

  console.log("\nUploading test image to Cloudinary...");
  try {
    const result = await cloudinary.uploader.upload(
      `data:image/png;base64,${testImageBuffer.toString("base64")}`,
      {
        folder: "solarhome/test",
        resource_type: "image",
        format: "webp",
      }
    );
    console.log("✅ Upload successful!");
    console.log("  URL:", result.secure_url);
    console.log("  Public ID:", result.public_id);
    console.log("  Format:", result.format);
    console.log("  Bytes:", result.bytes);
  } catch (error) {
    console.log("❌ Upload failed:");
    console.log("  Error:", JSON.stringify(error, null, 2));
    if (error && typeof error === "object" && "http_code" in error) {
      console.log("  HTTP Code:", (error as any).http_code);
    }
  }
}

main();