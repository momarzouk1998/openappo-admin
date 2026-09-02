import sharp from "sharp";
import toIco from "to-ico";
import { readFile, writeFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, "../public/logo.png");
const pub = join(__dirname, "../public");
const app = join(__dirname, "../src/app");

// Favicon sizes: 16, 32, 48 — combined into one .ico
const faviconSizes = [16, 32, 48];
const pngBuffers = await Promise.all(
  faviconSizes.map((size) =>
    sharp(src)
      .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer()
  )
);

const icoBuffer = await toIco(pngBuffers);
await writeFile(join(app, "favicon.ico"), icoBuffer);
console.log("✅ src/app/favicon.ico (16+32+48px)");

// Also save to public/
await writeFile(join(pub, "favicon.ico"), icoBuffer);
console.log("✅ public/favicon.ico");

// apple-touch-icon (180x180) — used by iOS/Safari
await sharp(src)
  .resize(180, 180, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
  .png()
  .toFile(join(pub, "apple-touch-icon.png"));
console.log("✅ public/apple-touch-icon.png (180x180)");

// OG image (1200x630) for social sharing
await sharp(src)
  .resize(630, 630, { fit: "contain", background: { r: 37, g: 99, b: 235, alpha: 1 } })
  .extend({ top: 0, bottom: 0, left: 285, right: 285, background: { r: 37, g: 99, b: 235 } })
  .png()
  .toFile(join(pub, "og-image.png"));
console.log("✅ public/og-image.png (1200x630)");

// Favicon PNG (32x32) for modern browsers as standalone PNG
await sharp(src)
  .resize(32, 32, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
  .png()
  .toFile(join(pub, "favicon-32.png"));
console.log("✅ public/favicon-32.png");

await sharp(src)
  .resize(16, 16, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
  .png()
  .toFile(join(pub, "favicon-16.png"));
console.log("✅ public/favicon-16.png");

console.log("\nDone! All favicon formats generated.");
