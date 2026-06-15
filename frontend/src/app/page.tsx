import { HomeHeader } from "@/components/layout/home-header";
import { HomeAppBanner } from "@/components/layout/home-app-banner";
import { HomeHeroSection } from "@/components/layout/home-hero-section";
import { HomeLoginProvider } from "@/components/layout/home-login-context";
import { HomePlatformFeatures } from "@/components/layout/home-platform-features";
import { PublicSiteFooter } from "@/components/layout/public-site-footer";

export default function Home() {
  return (
    <HomeLoginProvider>
      <div className="min-h-screen bg-neutral-50 text-neutral-900">
        <HomeHeader />

        <main>
          <HomeHeroSection />
          <HomeAppBanner />
          <HomePlatformFeatures />
        </main>

        <PublicSiteFooter />
      </div>
    </HomeLoginProvider>
  );
}
