/**
 * Panoramic minimalist backdrop for the health roadmap.
 *
 * Metaphor: the organism's evolution across the year.
 *  - Left: sparse, uneven terrain — recovery is only starting.
 *  - Middle: smoother, more vegetation — stabilization.
 *  - Right: calm mature landscape — sustained health.
 *
 * Three layered silhouettes create depth; a very thin winding trail
 * runs through the whole panorama. Pure vector, no textures, no seasons.
 * Opacity is kept low so the backdrop supports the interface, not compete with it.
 */
export function EvolutionBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg"
    >
      <svg
        viewBox="0 0 1600 260"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          {/* Sky wash — cool on the left, warmer/settled on the right */}
          <linearGradient id="ev-sky" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="hsl(var(--muted))" stopOpacity="0.35" />
            <stop offset="50%" stopColor="hsl(var(--primary) / 0.06)" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0.12)" />
          </linearGradient>

          {/* Fade the panorama into the card edges so it feels embedded */}
          <linearGradient id="ev-fade-x" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="hsl(var(--card))" stopOpacity="1" />
            <stop offset="8%" stopColor="hsl(var(--card))" stopOpacity="0" />
            <stop offset="92%" stopColor="hsl(var(--card))" stopOpacity="0" />
            <stop offset="100%" stopColor="hsl(var(--card))" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="ev-fade-y" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--card))" stopOpacity="0.85" />
            <stop offset="40%" stopColor="hsl(var(--card))" stopOpacity="0" />
            <stop offset="100%" stopColor="hsl(var(--card))" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Sky */}
        <rect width="1600" height="260" fill="url(#ev-sky)" />

        {/*
          Far layer — most distant hills. Very low contrast, softly blurred.
          Left side sits a touch lower and rougher; right side rises into
          calm, ordered ridges.
        */}
        <g style={{ filter: "blur(2px)" }} opacity="0.28">
          <path
            fill="hsl(var(--primary))"
            d="M0,190 L60,178 L130,188 L190,170 L250,182 L320,168 L400,175 L470,158 L560,166 L640,150 L730,156 L820,142 L910,148 L1000,132 L1090,138 L1180,122 L1270,126 L1360,110 L1450,114 L1540,100 L1600,104 L1600,260 L0,260 Z"
          />
        </g>

        {/*
          Mid layer — rolling hills. Slight roughness on the left with
          gaps; gradually becomes an even, flowing ridge on the right.
        */}
        <g style={{ filter: "blur(0.6px)" }} opacity="0.42">
          <path
            fill="hsl(var(--primary))"
            d="M0,220 L40,208 L90,222 L140,196 L200,214 L260,192 L330,206 L400,184 L470,198 L550,176 L630,188 L720,168 L810,178 L900,158 L1000,166 L1100,150 L1200,156 L1310,142 L1420,146 L1540,134 L1600,138 L1600,260 L0,260 Z"
          />
        </g>

        {/* Front layer — closest hills, most saturated but still gentle */}
        <g opacity="0.55">
          <path
            fill="hsl(var(--primary))"
            d="M0,246 L50,238 L110,248 L170,230 L240,244 L310,224 L390,238 L470,218 L560,232 L650,212 L750,224 L850,206 L960,216 L1070,198 L1180,206 L1300,190 L1420,196 L1540,182 L1600,186 L1600,260 L0,260 Z"
          />
        </g>

        {/* --- Vegetation cues (very light silhouettes) --- */}
        {/* Left: sparse, uneven — a couple of small dry shapes */}
        <g fill="hsl(var(--muted-foreground))" opacity="0.22">
          <circle cx="120" cy="240" r="3.5" />
          <circle cx="180" cy="236" r="2.8" />
          <circle cx="255" cy="242" r="3" />
          <circle cx="360" cy="234" r="4" />
        </g>

        {/* Middle: small groves appearing */}
        <g fill="hsl(var(--primary))" opacity="0.32">
          <ellipse cx="640" cy="232" rx="7" ry="5" />
          <ellipse cx="654" cy="230" rx="5" ry="4" />
          <ellipse cx="780" cy="226" rx="8" ry="6" />
          <ellipse cx="795" cy="228" rx="5" ry="4" />
          <ellipse cx="900" cy="222" rx="9" ry="6" />
        </g>

        {/* Right: mature trees, ordered spacing */}
        <g fill="hsl(var(--primary))" opacity="0.42">
          <ellipse cx="1100" cy="214" rx="11" ry="8" />
          <ellipse cx="1220" cy="210" rx="12" ry="9" />
          <ellipse cx="1330" cy="206" rx="10" ry="8" />
          <ellipse cx="1440" cy="202" rx="13" ry="10" />
          <ellipse cx="1540" cy="200" rx="11" ry="8" />
        </g>

        {/*
          The thin winding trail — a single continuous path across the
          whole panorama. Kept extremely light so it never competes with
          the interactive timeline on top.
        */}
        <path
          d="M0,236 C120,232 180,220 260,224 S420,244 520,230 S700,206 820,218 S1000,242 1120,222 S1320,198 1440,208 S1560,220 1600,212"
          fill="none"
          stroke="hsl(var(--muted-foreground))"
          strokeOpacity="0.28"
          strokeWidth="1"
          strokeLinecap="round"
        />

        {/* Edge fades to blend into the card */}
        <rect width="1600" height="260" fill="url(#ev-fade-x)" />
        <rect width="1600" height="260" fill="url(#ev-fade-y)" />
      </svg>
    </div>
  );
}
