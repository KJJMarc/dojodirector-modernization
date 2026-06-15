#!/usr/bin/env node
/**
 * Generate favicon, Apple touch icon, and PWA icon assets from src/app/icon.svg.
 *
 * Usage: node scripts/generate-pwa-icons.mjs
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const PWA_BACKGROUND_COLOR = "#0a0a0a";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(__dirname, "../src/app");
const publicPwaDir = resolve(__dirname, "../public/pwa");
const svg = readFileSync(resolve(appDir, "icon.svg"));

mkdirSync(publicPwaDir, { recursive: true });

const png16 = await sharp(svg).resize(16, 16).png().toBuffer();
const png32 = await sharp(svg).resize(32, 32).png().toBuffer();
const png180 = await sharp(svg).resize(180, 180).png().toBuffer();
const png192 = await sharp(svg).resize(192, 192).png().toBuffer();
const png512 = await sharp(svg).resize(512, 512).png().toBuffer();

writeFileSync(resolve(appDir, "icon.png"), png32);
writeFileSync(resolve(appDir, "apple-icon.png"), png180);
writeFileSync(resolve(publicPwaDir, "icon-192.png"), png192);
writeFileSync(resolve(publicPwaDir, "icon-512.png"), png512);

const maskableIconSize = Math.round(512 * 0.8);
const maskableIcon = await sharp(svg).resize(maskableIconSize, maskableIconSize).png().toBuffer();
const maskable512 = await sharp({
  create: {
    width: 512,
    height: 512,
    channels: 4,
    background: PWA_BACKGROUND_COLOR,
  },
})
  .composite([{ input: maskableIcon, gravity: "centre" }])
  .png()
  .toBuffer();

writeFileSync(resolve(publicPwaDir, "icon-maskable-512.png"), maskable512);

const splashIcon = await sharp(svg).resize(180, 180).png().toBuffer();
const appleSplash = await sharp({
  create: {
    width: 1290,
    height: 2796,
    channels: 4,
    background: PWA_BACKGROUND_COLOR,
  },
})
  .composite([{ input: splashIcon, gravity: "centre" }])
  .png()
  .toBuffer();

writeFileSync(resolve(publicPwaDir, "apple-splash-1290x2796.png"), appleSplash);

const ico = await pngToIco([png16, png32]);
writeFileSync(resolve(appDir, "favicon.ico"), ico);

console.log(
  "Generated favicon, Apple touch icon, and PWA icons in src/app/ and public/pwa/",
);
