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
const ICON_PADDING_RATIO = 0.18;
const MASKABLE_PADDING_RATIO = 0.24;

const __dirname = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(__dirname, "../src/app");
const publicPwaDir = resolve(__dirname, "../public/pwa");
const svg = readFileSync(resolve(appDir, "icon.svg"));

mkdirSync(publicPwaDir, { recursive: true });

async function renderPaddedIcon(size, paddingRatio = ICON_PADDING_RATIO) {
  const contentSize = Math.max(
    1,
    Math.round(size * (1 - paddingRatio * 2)),
  );
  const icon = await sharp(svg).resize(contentSize, contentSize).png().toBuffer();

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

const png16 = await renderPaddedIcon(16, 0.12);
const png32 = await renderPaddedIcon(32, 0.14);
const png180 = await renderPaddedIcon(180);
const png192 = await renderPaddedIcon(192);
const png512 = await renderPaddedIcon(512);
const maskable512 = await renderPaddedIcon(512, MASKABLE_PADDING_RATIO);

writeFileSync(resolve(appDir, "icon.png"), png32);
writeFileSync(resolve(appDir, "apple-icon.png"), png180);
writeFileSync(resolve(publicPwaDir, "icon-192.png"), png192);
writeFileSync(resolve(publicPwaDir, "icon-512.png"), png512);
writeFileSync(resolve(publicPwaDir, "icon-maskable-512.png"), maskable512);

const splashIcon = await renderPaddedIcon(180, 0.2);
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
