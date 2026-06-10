import { PublicAcademyPixelScripts } from "@/components/public/public-academy-pixel-scripts";
import { getPublicAcademyPixelSettingsByClubSlug } from "@/lib/academy-pixel-settings.server";

interface PublicAcademyPixelTrackingProps {
  clubSlug: string;
}

export async function PublicAcademyPixelTracking({
  clubSlug,
}: PublicAcademyPixelTrackingProps) {
  const settings = await getPublicAcademyPixelSettingsByClubSlug(clubSlug);

  if (!settings) {
    return null;
  }

  return <PublicAcademyPixelScripts settings={settings} />;
}
