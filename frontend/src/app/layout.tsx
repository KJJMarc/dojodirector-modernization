import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import {
  PWA_DESCRIPTION,
  PWA_ICON_PATHS,
  PWA_NAME,
  PWA_SHORT_NAME,
  PWA_THEME_COLOR,
} from "@/lib/pwa.shared";
import { PwaServiceWorkerRegister } from "@/components/pwa/pwa-service-worker-register";
import { CookieConsentProvider } from "@/components/cookie-consent/cookie-consent-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Dojo Director | Martial arts academy management",
  description: PWA_DESCRIPTION,
  applicationName: PWA_NAME,
  manifest: PWA_ICON_PATHS.manifest,
  appleWebApp: {
    capable: true,
    title: PWA_SHORT_NAME,
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: PWA_ICON_PATHS.favicon16, type: "image/png", sizes: "16x16" },
      { url: PWA_ICON_PATHS.favicon32, type: "image/png", sizes: "32x32" },
      { url: PWA_ICON_PATHS.icon192, type: "image/png", sizes: "192x192" },
      { url: PWA_ICON_PATHS.icon512, type: "image/png", sizes: "512x512" },
      { url: PWA_ICON_PATHS.faviconIco, type: "image/x-icon", sizes: "48x48" },
    ],
    apple: [
      { url: PWA_ICON_PATHS.apple180, sizes: "180x180", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: PWA_THEME_COLOR,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="apple-touch-startup-image"
          href={PWA_ICON_PATHS.splash1290}
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href={PWA_ICON_PATHS.splash1290}
          media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
      </head>
      <body className={`${inter.className} min-h-screen`}>
        <CookieConsentProvider>
          {children}
        </CookieConsentProvider>
        <PwaServiceWorkerRegister />
      </body>
    </html>
  );
}
