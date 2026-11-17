import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const out = "public/images";
const cache = "/tmp/stock-cache";

const pexels = (id, w = 2600) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

const jobs = [
  ["campaign/hero.jpg", 1808, 1044, pexels(12243093)],
  ["campaign/hero-side.jpg", 856, 368, pexels(9893731)],
  ["campaign/promo-left.jpg", 684, 768, pexels(35865182)],
  ["campaign/promo-right.jpg", 668, 768, pexels(37929911)],
  ["campaign/best-product.jpg", 868, 680, pexels(17762230)],
  ["campaign/featured-product.jpg", 848, 608, pexels(4320480)],

  ["categories/panels.jpg", 892, 432, pexels(37083400)],
  ["categories/inverters.jpg", 856, 432, pexels(33751638)],
  ["categories/batteries.jpg", 864, 432, pexels(9800025)],

  ["products/monocrystalline-panel.jpg", 572, 468, pexels(17965455)],
  ["products/hybrid-inverter.jpg", 564, 480, pexels(12349168)],
  ["products/lithium-battery.jpg", 552, 496, pexels(698485)],
  [
    "products/charge-controller.jpg",
    572,
    424,
    "https://upload.wikimedia.org/wikipedia/commons/6/6d/SUOER_SOLAR_CHARGE_CONTROLLER.jpg",
  ],
  ["products/solar-led-light.jpg", 564, 436, pexels(9799703)],
  ["products/solar-water-heater.jpg", 552, 424, pexels(34593293)],
  ["products/led-solar-bulb.jpg", 564, 412, pexels(29744511)],
  ["products/portable-power-station.jpg", 556, 416, pexels(37489593)],
  ["products/solar-garden-light.jpg", 564, 416, pexels(31197719)],
  ["products/solar-cable.jpg", 564, 372, pexels(8853526)],
  ["products/solar-tool-kit.jpg", 556, 348, pexels(4480531)],
  ["products/solar-mounting-kit.jpg", 560, 352, pexels(11645008)],

  ["social/instagram-grid.jpg", 628, 300, pexels(35501729)],
];

await mkdir(cache, { recursive: true });

async function download(url, key) {
  const file = path.join(cache, key);
  if (existsSync(file)) return readFile(file);
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) homesolar/1.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(file, buf);
  return buf;
}

let failed = 0;
for (const [name, width, height, url] of jobs) {
  const dest = path.join(out, name);
  await mkdir(path.dirname(dest), { recursive: true });
  try {
    const key = name.replace(/[^a-z0-9]+/gi, "_");
    const buf = await download(url, key);
    await sharp(buf)
      .resize(width, height, { fit: "cover", position: "centre", kernel: "lanczos3" })
      .toFormat("jpeg", { quality: 90, mozjpeg: true })
      .toFile(dest);
    console.log(`ok   ${name} -> ${width}x${height}`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${name}: ${e.message}`);
  }
}

console.log(`\n${jobs.length - failed}/${jobs.length} images written`);
if (failed) process.exitCode = 1;
