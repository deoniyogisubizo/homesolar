import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { v2 as cloudinary } from "cloudinary";

export type StoredImage = {
  url: string;
  originalUrl: string;
  thumbUrl: string;
  filename: string;
  width: number;
  height: number;
  size: number;
  mimeType: string;
};

const MAX_DIMENSION = 1800;
const THUMB_DIMENSION = 480;

const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function detectImageMime(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }
  const header = buffer.subarray(0, 6).toString("ascii");
  if (header === "GIF87a" || header === "GIF89a") return "image/gif";
  return null;
}

function mediaRoot() {
  return path.join(process.cwd(), "public", "uploads");
}

async function storeLocal(buffer: Buffer, mimeType: string): Promise<StoredImage> {
  const now = new Date();
  const folder = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const filename = `${randomUUID()}.webp`;
  const originalName = `${randomUUID()}.${extensions[mimeType] ?? "bin"}`;
  const targetDirectory = path.join(mediaRoot(), folder);
  const originalDirectory = path.join(mediaRoot(), "originals");
  await Promise.all([mkdir(targetDirectory, { recursive: true }), mkdir(originalDirectory, { recursive: true })]);

  const image = sharp(buffer, { failOn: "error" }).rotate();
  const metadata = await image.metadata();
  const optimized = await image
    .clone()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  const thumb = await image
    .clone()
    .resize({ width: THUMB_DIMENSION, height: THUMB_DIMENSION, fit: "cover", withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer();

  await Promise.all([
    writeFile(path.join(targetDirectory, filename), optimized.data),
    writeFile(path.join(targetDirectory, `thumb-${filename}`), thumb),
    writeFile(path.join(originalDirectory, originalName), buffer),
  ]);

  return {
    url: `/uploads/${folder}/${filename}`,
    originalUrl: `/uploads/originals/${originalName}`,
    thumbUrl: `/uploads/${folder}/thumb-${filename}`,
    filename,
    width: optimized.info.width ?? metadata.width ?? 0,
    height: optimized.info.height ?? metadata.height ?? 0,
    size: optimized.info.size,
    mimeType: "image/webp",
  };
}

async function storeCloudinary(buffer: Buffer, mimeType: string): Promise<StoredImage> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary is not fully configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  const base64 = buffer.toString("base64");
  const dataUri = `data:${mimeType};base64,${base64}`;

  const uploadResult = await cloudinary.uploader.upload(dataUri, {
    folder: "solarhome",
    resource_type: "image",
    format: "webp",
    quality: "auto:good",
    transformation: [
      { width: MAX_DIMENSION, height: MAX_DIMENSION, crop: "limit" },
    ],
  });

  const thumbUrl = cloudinary.url(uploadResult.public_id, {
    width: THUMB_DIMENSION,
    height: THUMB_DIMENSION,
    crop: "fill",
    format: "webp",
    quality: "auto:good",
  });

  return {
    url: uploadResult.secure_url,
    originalUrl: uploadResult.secure_url,
    thumbUrl,
    filename: uploadResult.public_id,
    width: uploadResult.width,
    height: uploadResult.height,
    size: uploadResult.bytes,
    mimeType: "image/webp",
  };
}

export async function storeImage(buffer: Buffer, mimeType: string): Promise<StoredImage> {
  const adapter = process.env.MEDIA_STORAGE ?? "local";
  if (adapter === "cloudinary") return storeCloudinary(buffer, mimeType);
  if (adapter !== "local") throw new Error(`Unsupported media storage adapter: ${adapter}`);
  return storeLocal(buffer, mimeType);
}
