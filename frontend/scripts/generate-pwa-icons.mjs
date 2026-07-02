#!/usr/bin/env node
/**
 * Generate favicon, Apple touch icon, and PWA icon assets from
 * public/assets/dojo-director-icon.png (single source of truth).
 *
 * Usage: node scripts/generate-pwa-icons.mjs
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const PWA_BACKGROUND_COLOR = "#0a0a0a";
const MASKABLE_PADDING_RATIO = 0.2;

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "../public");
const publicPwaDir = resolve(publicDir, "pwa");
const sourceIconPath = resolve(publicDir, "assets/dojo-director-icon.png");
const sourceIcon = readFileSync(sourceIconPath);

mkdirSync(publicPwaDir, { recursive: true });

async function renderFullBleedIcon(size) {
  return sharp(sourceIcon).resize(size, size, { fit: "cover" }).png().toBuffer();
}

async function renderMaskableIcon(size, paddingRatio = MASKABLE_PADDING_RATIO) {
  const contentSize = Math.max(1, Math.round(size * (1 - paddingRatio * 2)));
  const icon = await sharp(sourceIcon)
    .resize(contentSize, contentSize, { fit: "cover" })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: PWA_BACKGROUND_COLOR,
    },
  })
    .composite([{ input: icon, gravity: "centre" }])
    .png()
    .toBuffer();
}

const png16 = await renderFullBleedIcon(16);
const png32 = await renderFullBleedIcon(32);
const png180 = await renderFullBleedIcon(180);
const png192 = await renderFullBleedIcon(192);
const png512 = await renderFullBleedIcon(512);
const maskable512 = await renderMaskableIcon(512, MASKABLE_PADDING_RATIO);

writeFileSync(resolve(publicDir, "favicon-16x16.png"), png16);
writeFileSync(resolve(publicDir, "favicon-32x32.png"), png32);
writeFileSync(resolve(publicDir, "apple-touch-icon.png"), png180);
writeFileSync(resolve(publicDir, "android-chrome-192x192.png"), png192);
writeFileSync(resolve(publicDir, "android-chrome-512x512.png"), png512);
writeFileSync(resolve(publicPwaDir, "icon-maskable-512.png"), maskable512);

const splashIcon = await renderFullBleedIcon(180);
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
writeFileSync(resolve(publicDir, "favicon.ico"), ico);

console.log(
  "Generated favicon, Apple touch icon, and PWA icons from public/assets/dojo-director-icon.png",
);
