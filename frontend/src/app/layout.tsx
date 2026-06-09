import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Dojo Director | Martial arts academy management",
  description:
    "Class booking, attendance tracking and grading management for martial arts academies.",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon.ico", type: "image/x-icon", sizes: "16x16" },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen`}>{children}</body>
    </html>
  );
}
