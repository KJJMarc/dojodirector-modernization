/** @type {import('next').NextConfig} */
const STUDENT_PORTAL_USER_ID =
  "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

const ICON_CACHE_HEADERS = [
  {
    key: "Cache-Control",
    value: "public, max-age=0, must-revalidate",
  },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: "/favicon.ico",
        headers: ICON_CACHE_HEADERS,
      },
      {
        source: "/favicon-16x16.png",
        headers: ICON_CACHE_HEADERS,
      },
      {
        source: "/favicon-32x32.png",
        headers: ICON_CACHE_HEADERS,
      },
      {
        source: "/apple-touch-icon.png",
        headers: ICON_CACHE_HEADERS,
      },
      {
        source: "/android-chrome-192x192.png",
        headers: ICON_CACHE_HEADERS,
      },
      {
        source: "/android-chrome-512x512.png",
        headers: ICON_CACHE_HEADERS,
      },
      {
        source: "/manifest.webmanifest",
        headers: ICON_CACHE_HEADERS,
      },
      {
        source: "/pwa/:path*",
        headers: ICON_CACHE_HEADERS,
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/icon.svg",
        destination: "/favicon-32x32.png",
        permanent: false,
      },
      {
        source: "/icon-16.png",
        destination: "/favicon-16x16.png",
        permanent: false,
      },
      {
        source: "/icon.png",
        destination: "/favicon-32x32.png",
        permanent: false,
      },
      {
        source: "/apple-icon.png",
        destination: "/apple-touch-icon.png",
        permanent: false,
      },
      {
        source: "/pwa/icon-192.png",
        destination: "/android-chrome-192x192.png",
        permanent: false,
      },
      {
        source: "/pwa/icon-512.png",
        destination: "/android-chrome-512x512.png",
        permanent: false,
      },
      {
        source: `/student-portal/:userId(${STUDENT_PORTAL_USER_ID})/:section*`,
        destination: "/student-portal/legacy/:userId/:section*",
        permanent: false,
      },
      {
        source: `/student-portal/:userId(${STUDENT_PORTAL_USER_ID})`,
        destination: "/student-portal/legacy/:userId",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
