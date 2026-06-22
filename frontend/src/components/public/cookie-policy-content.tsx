import { LegalContactLink, LegalDocumentFooter } from "@/components/public/legal-document-footer";
import { PublicLegalSection } from "@/components/public/public-legal-document";
import { LEGAL_COMPANY_NAME } from "@/lib/public-legal.shared";

export function CookiePolicyContent() {
  return (
    <>
      <p>
        This Cookie Policy explains how Dojo Director uses cookies and similar
        technologies when you visit our website and use academy public pages
        hosted on the platform. It should be read alongside our{" "}
        <a href="/privacy-policy" className="text-dojo-red transition hover:underline">
          Privacy Policy
        </a>
        .
      </p>

      <PublicLegalSection title="What are cookies?">
        <p>
          Cookies are small text files stored on your device when you visit a
          website. Similar technologies, such as local storage, may also be used
          to remember settings or preferences.
        </p>
      </PublicLegalSection>

      <PublicLegalSection title="How we use cookies">
        <p>
          Dojo Director uses cookies and similar technologies for the following
          purposes:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-dojo-white">Strictly necessary</strong> —
            to keep the platform secure, maintain sign-in sessions, support
            bookings and attendance, and deliver core functionality.
          </li>
          <li>
            <strong className="text-dojo-white">Analytics</strong> — to help
            understand how public academy pages are used when an academy has
            enabled analytics tools such as Google Analytics.
          </li>
          <li>
            <strong className="text-dojo-white">Marketing</strong> — to measure
            advertising performance when an academy has enabled tools such as
            Meta Pixel or Google Ads conversion tracking.
          </li>
        </ul>
      </PublicLegalSection>

      <PublicLegalSection title="Academy-configured tracking">
        <p>
          Some martial arts academies using Dojo Director may enable optional
          third-party analytics or advertising tags on their public pages, such
          as trial enquiry forms or class booking pages. Those tags are only
          loaded after you have given the relevant consent through our cookie
          banner or preferences settings.
        </p>
        <p>
          Where an academy enables such tools, the academy may act as the data
          controller for related marketing or analytics activity. {LEGAL_COMPANY_NAME}{" "}
          provides the software platform that allows those tags to be configured
          and consent-gated.
        </p>
      </PublicLegalSection>

      <PublicLegalSection title="Managing your preferences">
        <p>
          When you first visit Dojo Director, you can accept all cookies,
          reject non-essential cookies, or manage your preferences by category.
          Your choices are stored locally in your browser.
        </p>
        <p>
          You can change your preferences at any time using the{" "}
          <strong className="text-dojo-white">Cookie Preferences</strong> link in
          the site footer.
        </p>
      </PublicLegalSection>

      <PublicLegalSection title="Strictly necessary technologies">
        <p>
          Some technologies are essential for the service to work and cannot be
          disabled through our preference centre. These may include
          authentication cookies used by Supabase for secure sign-in, session
          cookies for instructor portal preferences, and first-party storage used
          to keep the application functioning correctly.
        </p>
      </PublicLegalSection>

      <PublicLegalSection title="Contact">
        <p>
          If you have questions about this Cookie Policy, contact{" "}
          <LegalContactLink />.
        </p>
      </PublicLegalSection>

      <LegalDocumentFooter />
    </>
  );
}
