import { PublicSiteFooter } from "@/components/layout/public-site-footer";
import { AppStandaloneCloseButton } from "@/components/pwa/app-standalone-close-button";

export default function JuniorBeltRankingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="junior-belt-rankings-page flex min-h-screen flex-col bg-dojo-black text-dojo-white antialiased">
      <AppStandaloneCloseButton />
      <div className="flex-1">{children}</div>
      <PublicSiteFooter variant="academy" />
    </div>
  );
}
