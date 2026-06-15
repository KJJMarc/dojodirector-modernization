import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt";

export default function InstructorPortalLayout({
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
