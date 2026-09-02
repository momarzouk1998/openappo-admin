import sharp from "sharp";
import toIco from "to-ico";
import { writeFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, "../admin logo.png");

const [s16, s32, s48] = await Promise.all([
  sharp(src).resize(16,16).png().toBuffer(),
  sharp(src).resize(32,32).png().toBuffer(),
  sharp(src).resize(48,48).png().toBuffer(),
]);

const ico = await toIco([s16, s32, s48]);
await writeFile(join(__dirname, "../src/app/favicon.ico"), ico);
await writeFile(join(__dirname, "../public/favicon.ico"), ico);
console.log("✅ favicon.ico (16+32+48px)");
