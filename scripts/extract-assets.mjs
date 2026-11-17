import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const src = "design/home.png";
const out = "public/images";
const scale = 3;

const jobs = [
  ["brand/logo-dark.png", [236, 0, 478, 53]],
  ["brand/logo-light.png", [24, 1911, 200, 1946]],

  ["clients/client-1.png", [18, 1778, 118, 1840]],
  ["clients/client-2.png", [140, 1778, 258, 1840]],
  ["clients/client-3.png", [265, 1778, 365, 1840]],
  ["clients/client-4.png", [378, 1778, 475, 1840]],
  ["clients/client-5.png", [487, 1778, 595, 1840]],
  ["clients/client-6.png", [605, 1778, 716, 1840]],
];

for (const [name, box, opts = {}] of jobs) {
  const [left, top, right, bottom] = box;
  const width = right - left;
  const height = bottom - top;
  const dest = path.join(out, name);
  await mkdir(path.dirname(dest), { recursive: true });

  let image = sharp(src).extract({ left, top, width, height });

  if (opts.cleanHero) {
    const region = { left: 200, top: 8, width: 268, height: 185 };
    const blurred = await sharp(src)
      .extract({ left: left + region.left, top: top + region.top, width: region.width, height: region.height })
      .blur(16)
      .toBuffer();
    const mask = Buffer.from(
      `<svg width="${region.width}" height="${region.height}"><rect width="100%" height="100%" fill="white"/></svg>`,
    );
    const regionWithAlpha = await sharp(blurred)
      .ensureAlpha()
      .joinChannel(await sharp(mask).blur(8).raw().toBuffer(), { raw: { width: region.width, height: region.height, channels: 1 } })
      .png()
      .toBuffer();
    image = sharp(src)
      .extract({ left, top, width, height })
      .composite([{ input: regionWithAlpha, left: region.left, top: region.top }]);
  }

  await image
    .resize(width * scale, height * scale, { kernel: "lanczos3" })
    .modulate({ saturation: 1.04 })
    .sharpen({ sigma: 0.7 })
    .toFormat(name.endsWith(".png") ? "png" : "jpeg", { quality: 91, mozjpeg: true, compressionLevel: 9 })
    .toFile(dest);

  console.log(`${name} ${width}x${height} -> ${width * scale}x${height * scale}`);
}

const productSrc = "design/product.png";
const productScale = 2;

const productJobs = [
  ["products/monocrystalline-panel-main.jpg", [153, 0, 609, 687], {}],
  ["products/monocrystalline-panel-thumb-1.jpg", [31, 20, 134, 144], {}],
  ["products/monocrystalline-panel-thumb-2.jpg", [31, 160, 134, 285], {}],
  ["products/monocrystalline-panel-thumb-3.jpg", [31, 299, 135, 425], {}],
  ["products/monocrystalline-panel-thumb-4.jpg", [31, 436, 135, 568], {}],
  [
    "products/solar-detail-banner.jpg",
    [555, 744, 1037, 1059],
    { cleanText: { left: 175, top: 165, width: 280, height: 85 } },
  ],
  ["products/related-charge-controller.jpg", [37, 1136, 276, 1303], { inset: 6 }],
  ["products/related-hybrid-inverter.jpg", [291, 1136, 530, 1303], { inset: 6 }],
  ["products/related-lithium-battery.jpg", [544, 1136, 778, 1303], { inset: 6 }],
  [
    "products/related-solar-mounting-kit.jpg",
    [793, 1136, 1036, 1303],
    { cleanArtifacts: true },
  ],
];

function cleanOverlayArtifacts(data, width, height) {
  const masked = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x < width * 0.6) continue;
      const index = (y * width + x) * 3;
      const luminance = (data[index] + data[index + 1] + data[index + 2]) / 3;
      if (luminance < 150) masked[y * width + x] = 1;
    }
  }

  const expanded = new Uint8Array(masked);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!masked[y * width + x]) continue;
      for (let offsetY = -2; offsetY <= 2; offsetY += 1) {
        for (let offsetX = -2; offsetX <= 2; offsetX += 1) {
          const nextY = y + offsetY;
          const nextX = x + offsetX;
          if (nextY >= 0 && nextY < height && nextX >= 0 && nextX < width) {
            expanded[nextY * width + nextX] = 1;
          }
        }
      }
    }
  }

  const output = Buffer.from(data);
  for (let y = 0; y < height; y += 1) {
    let x = 0;
    while (x < width) {
      if (!expanded[y * width + x]) {
        x += 1;
        continue;
      }

      const start = x;
      let end = x;
      while (end < width && expanded[y * width + end]) end += 1;

      const leftIndex = start > 0 && !expanded[y * width + start - 1] ? (y * width + start - 1) * 3 : null;
      const rightIndex = end < width && !expanded[y * width + end] ? (y * width + end) * 3 : null;

      for (let fillX = start; fillX < end; fillX += 1) {
        const ratio = (fillX - start + 0.5) / (end - start + 1);
        for (let channel = 0; channel < 3; channel += 1) {
          const left = leftIndex === null ? null : data[leftIndex + channel];
          const right = rightIndex === null ? null : data[rightIndex + channel];
          const value =
            left !== null && right !== null
              ? left * (1 - ratio) + right * ratio
              : left ?? right ?? 240;
          output[(y * width + fillX) * 3 + channel] = Math.round(value);
        }
      }

      x = end;
    }
  }

  return output;
}

for (const [name, box, opts = {}] of productJobs) {
  const inset = opts.inset ?? 0;
  const [left, top, right, bottom] = box;
  const width = right - left - inset * 2;
  const height = bottom - top - inset * 2;
  const dest = path.join(out, name);
  await mkdir(path.dirname(dest), { recursive: true });

  let image = sharp(productSrc).extract({ left: left + inset, top: top + inset, width, height });

  if (opts.cleanArtifacts) {
    const { data, info } = await sharp(productSrc)
      .extract({ left, top, width, height })
      .raw()
      .toBuffer({ resolveWithObject: true });
    image = sharp(cleanOverlayArtifacts(data, info.width, info.height), {
      raw: { width: info.width, height: info.height, channels: 3 },
    });
  }

  const targetWidth = width * productScale;
  const targetHeight = height * productScale;

  await image
    .resize(
      opts.contain ? Math.round(478) : targetWidth,
      opts.contain ? Math.round(336) : targetHeight,
      opts.contain
        ? { fit: "contain", background: { r: 240, g: 241, b: 243, alpha: 1 } }
        : { kernel: "lanczos3" },
    )
    .modulate({ saturation: 1.04 })
    .sharpen({ sigma: 0.6 })
    .toFormat("jpeg", { quality: 90, mozjpeg: true, compressionLevel: 9 })
    .toFile(dest);

  console.log(`${name} ${width}x${height} -> ${targetWidth}x${targetHeight}`);
}
