"use client";

import Script from "next/script";
import { PublicAcademyPixelEventReporter } from "@/components/public/public-academy-pixel-event-reporter";
import type { AcademyPublicPixelSettings } from "@/lib/academy-pixel-settings.shared";

interface PublicAcademyPixelScriptsProps {
  settings: AcademyPublicPixelSettings;
}

export function PublicAcademyPixelScripts({
  settings,
}: PublicAcademyPixelScriptsProps) {
  const googleTagId = settings.googleTrackingEnabled ? settings.googleTagId : null;
  const metaPixelId = settings.metaPixelEnabled ? settings.metaPixelId : null;

  return (
    <>
      <PublicAcademyPixelEventReporter settings={settings} />
      {googleTagId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${googleTagId}`}
            strategy="afterInteractive"
          />
          <Script id={`google-tag-${settings.clubSlug}`} strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${googleTagId}');
            `}
          </Script>
        </>
      ) : null}

      {metaPixelId ? (
        <Script id={`meta-pixel-${settings.clubSlug}`} strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${metaPixelId}');
            fbq('track', 'PageView');
          `}
        </Script>
      ) : null}
    </>
  );
}
