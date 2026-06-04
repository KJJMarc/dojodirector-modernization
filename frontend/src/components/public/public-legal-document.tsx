import Link from "next/link";
import { PublicSiteFooter } from "@/components/layout/public-site-footer";
import { LEGAL_LAST_UPDATED } from "@/lib/public-legal.shared";

interface PublicLegalDocumentProps {
  title: string;
  children: React.ReactNode;
}

export function PublicLegalDocument({ title, children }: PublicLegalDocumentProps) {
  return (
    <div className="flex min-h-screen flex-col bg-dojo-black text-dojo-white antialiased">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/"
          className="inline-block text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
        >
          ← Back to Home
        </Link>

        <header className="mt-6 border-b border-dojo-border pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-dojo-red">
            Dojo Director
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-dojo-muted">
            Last updated: {LEGAL_LAST_UPDATED}
          </p>
        </header>

        <div className="legal-document mt-8 space-y-8 text-sm leading-relaxed text-neutral-300">
          {children}
        </div>
      </main>

      <PublicSiteFooter />
    </div>
  );
}

interface PublicLegalSectionProps {
  title: string;
  children: React.ReactNode;
}

export function PublicLegalSection({ title, children }: PublicLegalSectionProps) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
