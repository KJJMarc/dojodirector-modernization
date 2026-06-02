import { PublicLegalSection } from "@/components/public/public-legal-document";
import { LEGAL_CONTACT_EMAIL } from "@/lib/public-legal.shared";

export function PrivacyPolicyContent() {
  return (
    <>
      <p>
        This Privacy Policy explains how personal data may be collected and used when
        you use Dojo Director. Dojo Director is used by martial arts academies to
        manage members, classes and academy operations. Your academy is responsible
        for deciding what information it collects about you and how that information
        is used in practice.
      </p>

      <PublicLegalSection title="What personal data may be collected">
        <p>
          Depending on how your academy uses the platform, personal data may include:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>name and contact details;</li>
          <li>date of birth and emergency contact information;</li>
          <li>membership and programme details;</li>
          <li>class bookings and attendance records;</li>
          <li>grading and belt progression records;</li>
          <li>agreement acceptance records;</li>
          <li>portal login and account information;</li>
          <li>messages or notes entered by academy staff where relevant.</li>
        </ul>
      </PublicLegalSection>

      <PublicLegalSection title="Student and member details">
        <p>
          Academies use Dojo Director to store member profiles, membership status,
          programme enrolment and related administrative information needed to run
          classes safely and effectively.
        </p>
      </PublicLegalSection>

      <PublicLegalSection title="Booking records">
        <p>
          When you book classes through the platform, booking records may be stored
          to manage capacity, attendance registers, cancellations and academy
          administration.
        </p>
      </PublicLegalSection>

      <PublicLegalSection title="Attendance records">
        <p>
          Attendance marked at classes may be stored to support academy records,
          membership management, grading progress and operational reporting.
        </p>
      </PublicLegalSection>

      <PublicLegalSection title="Grading records">
        <p>
          Belt awards, stripes and grading history may be stored to maintain an
          accurate record of a member&apos;s progression within the academy.
        </p>
      </PublicLegalSection>

      <PublicLegalSection title="Agreement acceptance records">
        <p>
          Where members accept training agreements, waivers or similar documents
          through the platform, the academy may store acceptance details such as the
          agreement version, date of acceptance and the name entered at sign-up.
        </p>
      </PublicLegalSection>

      <PublicLegalSection title="Login and account data">
        <p>
          Portal and staff login details may include email addresses, authentication
          records and access status. This helps academies manage secure access to the
          platform.
        </p>
      </PublicLegalSection>

      <PublicLegalSection title="How data is used">
        <p>Personal data is used to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>manage memberships and academy administration;</li>
          <li>run class timetables, bookings and attendance;</li>
          <li>maintain grading and progression records;</li>
          <li>provide portal access and member services;</li>
          <li>meet legal, safeguarding or operational requirements where applicable.</li>
        </ul>
      </PublicLegalSection>

      <PublicLegalSection title="Who can access data">
        <p>
          Access is limited to authorised academy staff and platform administrators who
          need the information to operate the service. Members can generally access
          their own portal information, and academies control what staff roles can
          see and change.
        </p>
      </PublicLegalSection>

      <PublicLegalSection title="Data storage and security">
        <p>
          Data is stored using secure infrastructure and access controls intended to
          protect personal information. No online system can guarantee absolute
          security, but reasonable measures are used to reduce risk of unauthorised
          access, loss or misuse.
        </p>
      </PublicLegalSection>

      <PublicLegalSection title="Data retention">
        <p>
          Academies decide how long member records should be kept, subject to their
          own policies and any legal or safeguarding requirements. Some historical
          records may be retained for academy administration, grading history or
          compliance purposes.
        </p>
      </PublicLegalSection>

      <PublicLegalSection title="Your rights">
        <p>
          Under UK data protection law, you may have rights to access, correct or
          request deletion of your personal data, or to object to certain processing,
          depending on the circumstances.
        </p>
        <p>
          To exercise these rights, contact your academy in the first instance. They
          are responsible for member records held in the platform.
        </p>
      </PublicLegalSection>

      <PublicLegalSection title="Contact">
        <p>
          For privacy questions about your member data, please contact your academy
          directly.
        </p>
        <p>Platform enquiries: {LEGAL_CONTACT_EMAIL}</p>
      </PublicLegalSection>
    </>
  );
}
