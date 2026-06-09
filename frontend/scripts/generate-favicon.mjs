#!/usr/bin/env node
/**
 * Generate favicon.ico, icon.png, and apple-icon.png from src/app/icon.svg.
 *
 * Usage: node scripts/generate-favicon.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(__dirname, "../src/app");
const svg = readFileSync(resolve(appDir, "icon.svg"));

const png16 = await sharp(svg).resize(16, 16).png().toBuffer();
const png32 = await sharp(svg).resize(32, 32).png().toBuffer();
const png180 = await sharp(svg).resize(180, 180).png().toBuffer();

writeFileSync(resolve(appDir, "icon.png"), png32);
writeFileSync(resolve(appDir, "apple-icon.png"), png180);

const ico = await pngToIco([png16, png32]);
writeFileSync(resolve(appDir, "favicon.ico"), ico);

console.log("Generated src/app/favicon.ico, icon.png, and apple-icon.png");
