import { HomeHeader } from "@/components/layout/home-header";
import { HomeAppBanner } from "@/components/layout/home-app-banner";
import { HomeFeatureSection } from "@/components/layout/home-feature-section";
import { HomeHeroSection } from "@/components/layout/home-hero-section";
import { HomeLoginProvider } from "@/components/layout/home-login-context";
import { PublicSiteFooter } from "@/components/layout/public-site-footer";
import { HOME_PLATFORM_SECTIONS } from "@/lib/home-platform-content";

export default function Home() {
  return (
    <HomeLoginProvider>
      <div className="min-h-screen bg-neutral-50 text-neutral-900">
        <HomeHeader />

        <main>
          <HomeHeroSection />
          <HomeAppBanner />
          {HOME_PLATFORM_SECTIONS.map((section) => (
            <HomeFeatureSection key={section.id} {...section} />
          ))}
        </main>

        <PublicSiteFooter />
      </div>
    </HomeLoginProvider>
  );
}
