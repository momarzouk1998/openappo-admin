import sharp from "sharp";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, "../admin logo.png");
const iconsDir = join(__dirname, "../public/icons");
const pubDir  = join(__dirname, "../public");

mkdirSync(iconsDir, { recursive: true });

// PWA icons — direct resize, no padding (logo is already square)
for (const size of [192, 512]) {
  await sharp(src).resize(size, size).png().toFile(join(iconsDir, `icon-${size}.png`));
  console.log(`✅ public/icons/icon-${size}.png`);
}

// Apple touch icon (180x180)
await sharp(src).resize(180, 180).png().toFile(join(iconsDir, "apple-touch-icon.png"));
console.log("✅ public/icons/apple-touch-icon.png");

// Favicons
await sharp(src).resize(32, 32).png().toFile(join(pubDir, "favicon-32x32.png"));
await sharp(src).resize(16, 16).png().toFile(join(pubDir, "favicon-16x16.png"));
console.log("✅ public/favicon-32x32.png, favicon-16x16.png");

// OG image (1200x630) — logo centered on gradient background
await sharp(src)
  .resize(500, 500)
  .extend({ top: 65, bottom: 65, left: 350, right: 350,
            background: { r: 37, g: 99, b: 235 } })
  .png()
  .toFile(join(pubDir, "og-image.png"));
console.log("✅ public/og-image.png");

console.log("\nDone!");
