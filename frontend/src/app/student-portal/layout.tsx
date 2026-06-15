import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt";

export default function StudentPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <PwaInstallPrompt />
    </>
  );
}
