import type { CheckupShape } from "@/data/checkups";

const shapes: Record<CheckupShape, JSX.Element> = {
  spark: (
    <svg viewBox="0 0 100 100" className="h-full w-full fill-current">
      <path d="M55 5 25 55h20l-5 40 35-52H55l6-38Z" />
    </svg>
  ),
  diamond: (
    <svg viewBox="0 0 100 100" className="h-full w-full fill-current">
      <path d="M50 0 L100 50 L50 100 L0 50 Z" />
    </svg>
  ),
  circle: (
    <svg viewBox="0 0 100 100" className="h-full w-full fill-current">
      <circle cx="50" cy="50" r="40" />
    </svg>
  ),
  wave: (
    <svg viewBox="0 0 100 100" className="h-full w-full fill-current">
      <path d="M0 60 Q25 20 50 60 T100 60 V100 H0 Z" />
    </svg>
  ),
  square: (
    <svg viewBox="0 0 100 100" className="h-full w-full fill-current">
      <rect x="15" y="15" width="70" height="70" rx="18" />
    </svg>
  ),
  triangle: (
    <svg viewBox="0 0 100 100" className="h-full w-full fill-current">
      <path d="M50 10 L95 90 H5 Z" />
    </svg>
  ),
  ring: (
    <svg viewBox="0 0 100 100" className="h-full w-full fill-current">
      <path d="M50 5a45 45 0 1 0 0 90 45 45 0 0 0 0-90Zm0 22a23 23 0 1 1 0 46 23 23 0 0 1 0-46Z" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 100 100" className="h-full w-full fill-current">
      <rect x="35" y="10" width="30" height="80" rx="10" />
      <rect x="10" y="35" width="80" height="30" rx="10" />
    </svg>
  ),
};

export function checkupShape(shape: CheckupShape) {
  return shapes[shape];
}

export const accentClasses: Record<
  "primary" | "accent" | "info",
  { text: string; border: string; bg: string; glowFrom: string; glowTo: string }
> = {
  info: {
    text: "text-info",
    border: "border-info/30",
    bg: "bg-info/10",
    glowFrom: "from-info/40",
    glowTo: "to-info/10",
  },
  accent: {
    text: "text-accent",
    border: "border-accent/30",
    bg: "bg-accent/10",
    glowFrom: "from-accent/40",
    glowTo: "to-accent/10",
  },
  primary: {
    text: "text-primary",
    border: "border-primary/30",
    bg: "bg-primary/10",
    glowFrom: "from-primary/40",
    glowTo: "to-primary/10",
  },
};
