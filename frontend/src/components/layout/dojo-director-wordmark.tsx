interface DojoDirectorWordmarkProps {
  className?: string;
}

export function DojoDirectorWordmark({ className }: DojoDirectorWordmarkProps) {
  return (
    <p className={className}>
      <span className="text-dojo-white">DOJO </span>
      <span className="text-dojo-red">DIRECTOR</span>
    </p>
  );
}
