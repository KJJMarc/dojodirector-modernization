import {
  LEGAL_COMPANY_NAME,
  LEGAL_CONTACT_EMAIL,
  LEGAL_LAST_UPDATED,
} from "@/lib/public-legal.shared";

export function LegalDocumentFooter() {
  return (
    <div className="mt-8 space-y-2 border-t border-dojo-border pt-6 text-sm text-dojo-muted">
      <p>Last Updated: {LEGAL_LAST_UPDATED}</p>
      <p>{LEGAL_COMPANY_NAME}</p>
      <p>
        <a
          href={`mailto:${LEGAL_CONTACT_EMAIL}`}
          className="text-dojo-red transition hover:underline"
        >
          {LEGAL_CONTACT_EMAIL}
        </a>
      </p>
    </div>
  );
}

export function LegalContactLink() {
  return (
    <a
      href={`mailto:${LEGAL_CONTACT_EMAIL}`}
      className="text-dojo-red transition hover:underline"
    >
      {LEGAL_CONTACT_EMAIL}
    </a>
  );
}
