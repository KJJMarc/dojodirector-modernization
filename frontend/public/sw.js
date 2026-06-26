const CACHE_VERSION = "dojo-director-pwa-v2";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const ICON_ASSET_VERSION = "3";

function versionedAsset(path) {
  return `${path}?v=${ICON_ASSET_VERSION}`;
}

const STATIC_ASSETS = [
  versionedAsset("/manifest.webmanifest"),
  versionedAsset("/favicon.ico"),
  versionedAsset("/icon-16.png"),
  versionedAsset("/icon.png"),
  versionedAsset("/apple-icon.png"),
  versionedAsset("/pwa/icon-192.png"),
  versionedAsset("/pwa/icon-512.png"),
  versionedAsset("/pwa/icon-maskable-512.png"),
];

function isStaticAsset(pathname, search) {
  return STATIC_ASSETS.includes(`${pathname}${search}`);
}

function shouldBypassServiceWorker(request, requestUrl) {
  if (request.method !== "GET") {
    return true;
  }

  if (request.mode === "navigate") {
    return true;
  }

  if (requestUrl.pathname.startsWith("/api/")) {
    return true;
  }

  if (requestUrl.pathname.startsWith("/_next/")) {
    return true;
  }

  return false;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        Promise.allSettled(
          STATIC_ASSETS.map((asset) =>
            cache.add(asset).catch((error) => {
              console.warn("[PWA] Failed to cache static asset:", asset, error);
            }),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("dojo-director-pwa-") && key !== STATIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (shouldBypassServiceWorker(event.request, requestUrl)) {
    return;
  }

  if (isStaticAsset(requestUrl.pathname, requestUrl.search)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached ?? fetch(event.request)),
    );
    return;
  }
});
