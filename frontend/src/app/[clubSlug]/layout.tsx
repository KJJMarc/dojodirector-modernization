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
    <>
      <PublicAcademyPixelTracking clubSlug={params.clubSlug} />
      {children}
    </>
  );
}
