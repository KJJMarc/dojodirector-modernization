import type { Metadata } from "next";
import { AppEntryScreen } from "@/components/app/app-entry-screen";
import { PWA_DESCRIPTION, PWA_NAME } from "@/lib/pwa.shared";

export const metadata: Metadata = {
  title: `${PWA_NAME} | App`,
  description: PWA_DESCRIPTION,
  robots: { index: false, follow: false },
};

export default function AppEntryPage() {
  return <AppEntryScreen />;
}
