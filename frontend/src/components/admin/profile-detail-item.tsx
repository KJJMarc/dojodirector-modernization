export function ProfileDetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-dojo-muted">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm leading-snug text-dojo-white">{value}</dd>
    </div>
  );
}

export function ProfileSectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wide text-dojo-red">
        {title}
      </h3>
      {description ? (
        <p className="mt-0.5 text-xs leading-snug text-dojo-muted">{description}</p>
      ) : null}
    </div>
  );
}

/** Shared compact card shell for admin student profile sections. */
export const profileSectionClassName =
  "space-y-2 rounded-xl border border-dojo-border bg-dojo-surface p-3";

/** Shared grid spacing for profile detail lists. */
export const profileDetailGridClassName = "grid gap-2 sm:grid-cols-2";
