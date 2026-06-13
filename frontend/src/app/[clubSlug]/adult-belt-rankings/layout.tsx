import { PublicSiteFooter } from "@/components/layout/public-site-footer";

export default function AdultBeltRankingsClubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="adult-belt-rankings-page flex min-h-screen flex-col bg-dojo-black text-white antialiased">
      <div className="flex-1">{children}</div>
      <PublicSiteFooter variant="academy" />
    </div>
  );
}
