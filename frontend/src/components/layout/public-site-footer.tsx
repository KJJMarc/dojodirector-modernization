import Link from "next/link";
import { PRODUCT_NAME } from "@/lib/branding";

const FOOTER_LINK_CLASSNAME =
  "text-neutral-400 underline-offset-4 transition hover:text-white hover:underline";

export function PublicSiteFooter() {
  return (
    <footer className="border-t border-neutral-800 bg-neutral-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4">
        <p className="shrink-0 text-sm font-semibold text-neutral-300">
          © {PRODUCT_NAME}
        </p>
        <nav
          aria-label="Legal"
          className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:justify-end"
        >
          <Link href="/terms" className={FOOTER_LINK_CLASSNAME}>
            Terms &amp; Conditions
          </Link>
          <Link href="/privacy" className={FOOTER_LINK_CLASSNAME}>
            Privacy Policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
