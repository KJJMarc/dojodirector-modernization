import { PublicAcademyAttributionCapture } from "@/components/public/public-academy-attribution-capture";
import { PublicAcademyPixelTracking } from "@/components/public/public-academy-pixel-tracking";

interface ClubPublicLayoutProps {
  children: React.ReactNode;
  params: { clubSlug: string };
}

export default async function ClubPublicLayout({
  children,
  params,
}: ClubPublicLayoutProps) {
  return (
    <div data-academy={params.clubSlug} className="min-h-screen bg-dojo-black text-dojo-white">
      <PublicAcademyAttributionCapture clubSlug={params.clubSlug} />
      <PublicAcademyPixelTracking clubSlug={params.clubSlug} />
      {children}
    </div>
  );
}
