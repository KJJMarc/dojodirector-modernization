#!/usr/bin/env node
/**
 * Verify core PWA assets and manifest fields against a running server.
 *
 * Usage: node scripts/verify-pwa.mjs http://localhost:9876
 */

const baseUrl = process.argv[2] ?? "http://localhost:9876";
const portalLoginPath = "/student-portal/login";
const appEntryPath = "/app";

async function fetchText(path) {
  const response = await fetch(`${baseUrl}${path}`);
  return {
    path,
    ok: response.ok,
    status: response.status,
    contentType: response.headers.get("content-type") ?? "",
    body: response.ok ? await response.text() : "",
  };
}

async function fetchJson(path) {
  const result = await fetchText(path);
  if (!result.ok) {
    return { ...result, json: null };
  }

  try {
    return { ...result, json: JSON.parse(result.body) };
  } catch {
    return { ...result, json: null };
  }
}

function check(name, passed, detail = "") {
  const status = passed ? "PASS" : "FAIL";
  console.log(`${status} ${name}${detail ? ` — ${detail}` : ""}`);
  return passed;
}

const html = await fetchText(portalLoginPath);
const appEntry = await fetchText(appEntryPath);
const manifest = await fetchJson("/manifest.webmanifest");
const serviceWorker = await fetchText("/sw.js");
const icon192 = await fetchText("/pwa/icon-192.png");
const icon512 = await fetchText("/pwa/icon-512.png");
const maskable512 = await fetchText("/pwa/icon-maskable-512.png");
const appleIcon = await fetchText("/apple-icon.png");

let score = 0;
let total = 0;

total++;
if (check("Login page responds", html.ok, String(html.status))) score++;

total++;
if (check("App entry page responds", appEntry.ok, String(appEntry.status))) score++;

total++;
if (
  check(
    "App entry links to student login",
    appEntry.body.includes('href="/student-portal/login"'),
  )
) {
  score++;
}

total++;
if (
  check(
    "App entry links to instructor login",
    appEntry.body.includes('href="/instructor-portal/login"'),
  )
) {
  score++;
}

total++;
if (
  check(
    "App entry does not link to admin login",
    !appEntry.body.includes("/admin/login") &&
      !appEntry.body.includes("Admin Login"),
  )
) {
  score++;
}

total++;
if (
  check(
    "Manifest served",
    manifest.ok && manifest.json !== null,
    manifest.contentType,
  )
) {
  score++;
}

const manifestFields = manifest.json ?? {};
const requiredFields = [
  "name",
  "short_name",
  "start_url",
  "display",
  "background_color",
  "theme_color",
  "icons",
];

for (const field of requiredFields) {
  total++;
  if (check(`Manifest has ${field}`, Boolean(manifestFields[field]))) score++;
}

total++;
if (
  check(
    "Manifest display is standalone",
    manifestFields.display === "standalone",
    manifestFields.display ?? "missing",
  )
) {
  score++;
}

total++;
if (
  check(
    "Manifest start_url is /app",
    manifestFields.start_url === "/app",
    manifestFields.start_url ?? "missing",
  )
) {
  score++;
}

const icons = manifestFields.icons ?? [];
const has192 = icons.some((icon) => icon.sizes === "192x192");
const has512 = icons.some((icon) => icon.sizes === "512x512");
const hasMaskable = icons.some((icon) => icon.purpose === "maskable");

total++;
if (check("Manifest includes 192x192 icon", has192)) score++;

total++;
if (check("Manifest includes 512x512 icon", has512)) score++;

total++;
if (check("Manifest includes maskable icon", hasMaskable)) score++;

total++;
if (check("Service worker served", serviceWorker.ok, String(serviceWorker.status))) {
  score++;
}

total++;
if (
  check(
    "Service worker registers install/activate/fetch handlers",
    /install/.test(serviceWorker.body) &&
      /activate/.test(serviceWorker.body) &&
      /fetch/.test(serviceWorker.body),
  )
) {
  score++;
}

for (const asset of [
  ["192 icon", icon192],
  ["512 icon", icon512],
  ["maskable icon", maskable512],
  ["apple touch icon", appleIcon],
]) {
  total++;
  if (check(`${asset[0]} asset available`, asset[1].ok, String(asset[1].status))) {
    score++;
  }
}

total++;
if (
  check(
    "HTML references manifest",
    html.body.includes('rel="manifest"') || html.body.includes("/manifest.webmanifest"),
  )
) {
  score++;
}

total++;
if (
  check(
    "HTML includes theme color",
    html.body.includes('name="theme-color"') || html.body.includes("themeColor"),
  )
) {
  score++;
}

total++;
if (
  check(
    "HTML includes apple web app capable meta",
    html.body.includes("apple-mobile-web-app-capable"),
  )
) {
  score++;
}

const percentage = Math.round((score / total) * 100);
console.log(`\nPWA verification score: ${score}/${total} (${percentage}%)`);
console.log(
  "Note: Full Lighthouse PWA audit requires Chrome locally. Run: npm run audit:pwa",
);

process.exit(score === total ? 0 : 1);
