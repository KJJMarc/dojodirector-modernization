import { PIXEL_TRACKING_SETUP_GUIDE } from "@/lib/academy-pixel-tracking.shared";

const guideSectionClassName = "space-y-2";
const guideTitleClassName = "text-sm font-semibold text-dojo-white";
const guideListClassName = "list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-dojo-muted";

export function AcademyPixelSetupGuide() {
  return (
    <details className="group rounded-lg border border-dojo-border bg-dojo-elevated">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-dojo-white marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-3">
          View Setup Guide
          <span
            aria-hidden="true"
            className="text-xs text-dojo-muted transition group-open:rotate-180"
          >
            ▼
          </span>
        </span>
      </summary>

      <div className="space-y-5 border-t border-dojo-border px-4 py-4">
        <section className={guideSectionClassName}>
          <h4 className={guideTitleClassName}>
            {PIXEL_TRACKING_SETUP_GUIDE.metaPixelId.title}
          </h4>
          <ol className={guideListClassName}>
            {PIXEL_TRACKING_SETUP_GUIDE.metaPixelId.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className={guideSectionClassName}>
          <h4 className={guideTitleClassName}>
            {PIXEL_TRACKING_SETUP_GUIDE.googleTagId.title}
          </h4>
          <ol className={guideListClassName}>
            {PIXEL_TRACKING_SETUP_GUIDE.googleTagId.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className={guideSectionClassName}>
          <h4 className={guideTitleClassName}>
            {PIXEL_TRACKING_SETUP_GUIDE.googleAdsConversionAction.title}
          </h4>
          <ol className={guideListClassName}>
            {PIXEL_TRACKING_SETUP_GUIDE.googleAdsConversionAction.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className={guideSectionClassName}>
          <h4 className={guideTitleClassName}>
            {PIXEL_TRACKING_SETUP_GUIDE.metaVerification.title}
          </h4>
          <ol className={guideListClassName}>
            {PIXEL_TRACKING_SETUP_GUIDE.metaVerification.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className={guideSectionClassName}>
          <h4 className={guideTitleClassName}>
            {PIXEL_TRACKING_SETUP_GUIDE.googleVerification.title}
          </h4>
          <ol className={guideListClassName}>
            {PIXEL_TRACKING_SETUP_GUIDE.googleVerification.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      </div>
    </details>
  );
}
