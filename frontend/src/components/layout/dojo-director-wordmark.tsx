import Link from "next/link";

interface DojoDirectorWordmarkProps {
  className?: string;
}

export function DojoDirectorWordmark({ className }: DojoDirectorWordmarkProps) {
  return (
    <Link
      href="/"
      aria-label="Dojo Director home"
      className={`inline-block transition-opacity hover:opacity-80 ${className ?? ""}`}
    >
      <span className="text-dojo-white">DOJO </span>
      <span className="text-dojo-red">DIRECTOR</span>
    </Link>
  );
}
