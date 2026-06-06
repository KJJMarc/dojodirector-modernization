import Link from "next/link";
import { POWERED_BY_DOJO_DIRECTOR_LABEL } from "@/lib/public-academy-branding.shared";

interface PoweredByDojoDirectorProps {
  className?: string;
}

export function PoweredByDojoDirector({ className }: PoweredByDojoDirectorProps) {
  return (
    <p className={className ?? "text-xs text-dojo-muted"}>
      <Link
        href="/"
        className="transition hover:text-dojo-white hover:underline hover:underline-offset-2"
      >
        {POWERED_BY_DOJO_DIRECTOR_LABEL}
      </Link>
    </p>
  );
}
