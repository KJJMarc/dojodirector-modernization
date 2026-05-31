import {
  MEMBERSHIP_AGREEMENT_SECTIONS,
  MEMBERSHIP_AGREEMENT_VERSION,
  type MembershipAgreementSection,
} from "@/lib/student-portal-agreements.shared";

interface MembershipAgreementDocumentProps {
  agreementVersion?: string;
  sections?: MembershipAgreementSection[];
}

export function MembershipAgreementDocument({
  agreementVersion = MEMBERSHIP_AGREEMENT_VERSION,
  sections = MEMBERSHIP_AGREEMENT_SECTIONS,
}: MembershipAgreementDocumentProps) {
  return (
    <div className="max-h-[min(28rem,50vh)] space-y-5 overflow-y-auto rounded-lg border border-neutral-300 bg-white px-6 py-6 text-sm leading-7 text-black shadow-sm">
      {sections.map((section, index) => (
        <section key={index} className="space-y-3">
          {section.title ? (
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-700">
              {section.title}
            </h3>
          ) : null}
          {section.paragraphs.map((paragraph, paragraphIndex) => {
            if (!section.title && paragraphIndex === 0) {
              return (
                <p key={paragraphIndex} className="text-lg font-semibold text-black">
                  {paragraph}
                </p>
              );
            }

            if (!section.title && paragraphIndex === 1) {
              return (
                <p
                  key={paragraphIndex}
                  className="text-base font-semibold uppercase tracking-wide text-black"
                >
                  {paragraph}
                </p>
              );
            }

            if (!section.title && paragraphIndex === 2) {
              return (
                <p key={paragraphIndex} className="text-sm text-neutral-600">
                  Version {agreementVersion}
                </p>
              );
            }

            if (
              !section.title &&
              paragraph.startsWith("Version ")
            ) {
              return null;
            }

            return (
              <p key={paragraphIndex} className="text-neutral-900">
                {paragraph}
              </p>
            );
          })}
        </section>
      ))}
    </div>
  );
}
