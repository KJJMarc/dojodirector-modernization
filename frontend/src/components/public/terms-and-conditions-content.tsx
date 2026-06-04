import { LegalContactLink, LegalDocumentFooter } from "@/components/public/legal-document-footer";
import { PublicLegalSection } from "@/components/public/public-legal-document";
import { LEGAL_COMPANY_NAME } from "@/lib/public-legal.shared";

export function TermsAndConditionsContent() {
  return (
    <>
      <p>
        These Terms &amp; Conditions (&ldquo;Terms&rdquo;) apply to your use of Dojo
        Director, the platform used by martial arts academies to manage members,
        classes, bookings, attendance and related academy operations. By accessing or
        using the platform, you agree to these Terms.
      </p>

      <p>
        These Terms are provided by {LEGAL_COMPANY_NAME}.
      </p>
      <p>
        Contact: <LegalContactLink />
      </p>

      <PublicLegalSection title="Use of the platform">
        <p>
          Dojo Director is provided to support academy administration and member
          services. You may use the platform only for lawful purposes connected with
          academy activities and in line with any instructions given by your academy.
        </p>
        <p>
          We may update, suspend or withdraw features where needed for maintenance,
          security or improvement of the service.
        </p>
      </PublicLegalSection>

      <PublicLegalSection title="Academy Responsibilities">
        <p>
          Academies are responsible for the accuracy of data entered into the platform
          and for complying with applicable laws relating to their members&apos;
          information.
        </p>
      </PublicLegalSection>

      <PublicLegalSection title="Academy and admin responsibilities">
        <p>
          Each academy is responsible for the information it enters into the platform,
          including class schedules, membership records, instructor assignments and
          communications with members.
        </p>
        <p>
          Academy administrators must ensure that staff with access use the platform
          appropriately and only for legitimate academy purposes.
        </p>
      </PublicLegalSection>

      <PublicLegalSection title="Data Protection">
        <p>
          Academies remain the Data Controller for their member information. Dojo
          Director acts as a Data Processor where applicable. Further information is
          available in the{" "}
          <a href="/privacy" className="text-dojo-red transition hover:underline">
            Privacy Policy
          </a>
          .
        </p>
      </PublicLegalSection>

      <PublicLegalSection title="Student and member access">
        <p>
          Students and members may be given access to parts of the platform such as
          the member portal, class booking, messages and academy information relevant
          to their membership.
        </p>
        <p>
          Access is provided by the academy. If your membership ends or is paused, your
          access may be restricted or removed by the academy.
        </p>
      </PublicLegalSection>

      <PublicLegalSection title="Booking and attendance features">
        <p>
          Class booking, attendance registers and related features are provided to
          help academies run their timetable. Bookings and attendance records may be
          used by the academy for administration, safety and membership management.
        </p>
        <p>
          Booking availability, cancellation rules and attendance policies are set by
          the academy. Dojo Director does not guarantee that a booked place will
          always be available if academy rules, capacity or operational changes apply.
        </p>
      </PublicLegalSection>

      <PublicLegalSection title="Account security">
        <p>
          You are responsible for keeping your login details secure and for activity
          carried out through your account. Do not share passwords or portal access
          with anyone else unless the academy has authorised you to do so.
        </p>
        <p>
          Tell your academy promptly if you believe your account has been accessed
          without permission.
        </p>
      </PublicLegalSection>

      <PublicLegalSection title="Acceptable use">
        <p>You must not:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>misuse the platform or attempt to access data you are not permitted to see;</li>
          <li>upload false, misleading or harmful information;</li>
          <li>interfere with the security or normal operation of the service;</li>
          <li>use the platform in a way that breaches applicable law or academy rules.</li>
        </ul>
      </PublicLegalSection>

      <PublicLegalSection title="Data accuracy">
        <p>
          Academies and users should keep personal details, emergency contacts,
          membership information and other records as accurate and up to date as
          reasonably possible. Dojo Director relies on the information entered by
          academies and users.
        </p>
      </PublicLegalSection>

      <PublicLegalSection title="Service availability">
        <p>
          We aim to keep Dojo Director available and reliable, but we do not guarantee
          uninterrupted or error-free operation. Planned maintenance, technical issues
          or circumstances outside our reasonable control may affect access from time
          to time.
        </p>
      </PublicLegalSection>

      <PublicLegalSection title="Limitation of liability">
        <p>
          To the fullest extent permitted by law, Dojo Director is not liable for loss
          or damage arising from academy decisions, incorrect information entered into
          the platform, missed classes, booking changes, or indirect or consequential
          loss connected with use of the service.
        </p>
        <p>
          Nothing in these Terms excludes or limits liability that cannot be excluded
          or limited under applicable law.
        </p>
      </PublicLegalSection>

      <PublicLegalSection title="Changes to these Terms">
        <p>
          We may update these Terms from time to time. Updated Terms will be published
          on this page. Continued use of the platform after changes are published
          means you accept the updated Terms.
        </p>
      </PublicLegalSection>

      <PublicLegalSection title="Contact">
        <p>
          If you have questions about these Terms, please contact your academy in the
          first instance.
        </p>
        <p>
          Platform enquiries: <LegalContactLink />
        </p>
      </PublicLegalSection>

      <LegalDocumentFooter />
    </>
  );
}
