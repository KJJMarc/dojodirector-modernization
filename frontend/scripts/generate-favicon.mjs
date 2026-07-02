#!/usr/bin/env node
/**
 * Backwards-compatible wrapper for generate-pwa-icons.mjs.
 *
 * Usage: node scripts/generate-favicon.mjs
 */

import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const result = spawnSync(
  process.execPath,
  [resolve(__dirname, "generate-pwa-icons.mjs")],
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);
