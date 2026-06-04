import type { MajorAdultBeltColor } from "@/lib/adult-belt-rankings.shared";

const ADULT_BELT_BAR_CLASS: Record<MajorAdultBeltColor, string> = {
  black: "bg-neutral-900",
  brown: "bg-amber-800",
  purple: "bg-purple-700",
  blue: "bg-blue-700",
  white: "bg-white",
};

const ADULT_BELT_RING_CLASS: Record<MajorAdultBeltColor, string> = {
  black: "ring-neutral-900/10",
  brown: "ring-amber-800/15",
  purple: "ring-purple-700/15",
  blue: "ring-blue-700/15",
  white: "ring-neutral-300",
};

export type JuniorBeltColourBarSectionKey =
  | "green-black"
  | "green"
  | "green-white"
  | "orange-black"
  | "orange"
  | "orange-white"
  | "yellow-black"
  | "yellow"
  | "yellow-white"
  | "grey-black"
  | "grey"
  | "grey-white"
  | "white";

type JuniorBeltBarSegment = "green" | "orange" | "yellow" | "grey" | "black" | "white";

const JUNIOR_BELT_BAR_SEGMENT_MAP: Record<
  JuniorBeltColourBarSectionKey,
  JuniorBeltBarSegment[]
> = {
  "green-black": ["green", "black", "green"],
  green: ["green"],
  "green-white": ["green", "white", "green"],
  "orange-black": ["orange", "black", "orange"],
  orange: ["orange"],
  "orange-white": ["orange", "white", "orange"],
  "yellow-black": ["yellow", "black", "yellow"],
  yellow: ["yellow"],
  "yellow-white": ["yellow", "white", "yellow"],
  "grey-black": ["grey", "black", "grey"],
  grey: ["grey"],
  "grey-white": ["grey", "white", "grey"],
  white: ["white"],
};

function isJuniorBeltColourBarSectionKey(
  sectionKey: string,
): sectionKey is JuniorBeltColourBarSectionKey {
  return sectionKey in JUNIOR_BELT_BAR_SEGMENT_MAP;
}

function resolveJuniorBeltBarSegments(sectionKey: string): JuniorBeltBarSegment[] {
  if (isJuniorBeltColourBarSectionKey(sectionKey)) {
    return JUNIOR_BELT_BAR_SEGMENT_MAP[sectionKey];
  }

  return JUNIOR_BELT_BAR_SEGMENT_MAP.white;
}

export function JuniorBeltColourBar({ sectionKey }: { sectionKey: string }) {
  const segments = resolveJuniorBeltBarSegments(sectionKey);
  const isMixed = segments.length === 3;
  const isWhiteBelt = sectionKey === "white";

  if (process.env.NODE_ENV !== "production") {
  }

  return (
    <div
      aria-hidden="true"
      className={`junior-belt-bar ${isMixed ? "is-mixed" : "is-solid"} ${isWhiteBelt ? "is-white-belt" : ""}`}
      data-section-key={sectionKey}
    >
      {segments.map((segment, index) => (
        <div
          key={`${sectionKey}-${segment}-${index}`}
          className={`bar-segment ${segment} ${segments.length === 1 ? "full" : ""}`}
        />
      ))}
    </div>
  );
}

export function AdultBeltColourBar({ beltColor }: { beltColor: MajorAdultBeltColor }) {
  return (
    <span
      aria-hidden="true"
      className={`h-12 w-5 shrink-0 rounded-sm ring-1 ${ADULT_BELT_BAR_CLASS[beltColor]} ${ADULT_BELT_RING_CLASS[beltColor]}`}
    />
  );
}
