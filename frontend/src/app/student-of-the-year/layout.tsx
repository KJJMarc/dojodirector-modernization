import { PublicSiteFooter } from "@/components/layout/public-site-footer";
import { PublicAcademyPixelTracking } from "@/components/public/public-academy-pixel-tracking";
import { KINGSTON_CLUB_SLUG } from "@/lib/clubs.shared";

export default async function StudentOfTheYearLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="student-of-the-year-page flex min-h-screen flex-col bg-dojo-black text-white antialiased">
      <PublicAcademyPixelTracking clubSlug={KINGSTON_CLUB_SLUG} />
      <div className="flex-1">{children}</div>
      <PublicSiteFooter variant="academy" />
    </div>
  );
}
