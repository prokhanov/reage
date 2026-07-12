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
        viewBox="0 0 1600 360"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          {/* Sky wash — cool on the left, warmer/settled on the right */}
          <linearGradient id="ev-sky" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="hsl(var(--muted))" stopOpacity="0.28" />
            <stop offset="50%" stopColor="hsl(var(--primary) / 0.05)" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0.10)" />
          </linearGradient>

          {/* Fade the panorama into the card edges so it feels embedded */}
          <linearGradient id="ev-fade-x" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="hsl(var(--card))" stopOpacity="1" />
            <stop offset="8%" stopColor="hsl(var(--card))" stopOpacity="0" />
            <stop offset="92%" stopColor="hsl(var(--card))" stopOpacity="0" />
            <stop offset="100%" stopColor="hsl(var(--card))" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="ev-fade-y" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--card))" stopOpacity="0.92" />
            <stop offset="35%" stopColor="hsl(var(--card))" stopOpacity="0" />
            <stop offset="100%" stopColor="hsl(var(--card))" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        {/* Sky */}
        <rect width="1600" height="360" fill="url(#ev-sky)" />

        {/*
          Far layer — most distant hills. Very low contrast, softly blurred.
          Left side sits a touch lower and rougher; right side rises into
          calm, ordered ridges.
        */}
        <g style={{ filter: "blur(2px)" }} opacity="0.24">
          <path
            fill="hsl(var(--primary))"
            d="M0,268 L60,254 L130,266 L190,244 L250,260 L320,242 L400,252 L470,230 L560,240 L640,220 L730,228 L820,210 L910,218 L1000,198 L1090,206 L1180,186 L1270,192 L1360,174 L1450,180 L1540,162 L1600,168 L1600,360 L0,360 Z"
          />
        </g>

        {/*
          Mid layer — rolling hills. Slight roughness on the left with
          gaps; gradually becomes an even, flowing ridge on the right.
        */}
        <g style={{ filter: "blur(0.6px)" }} opacity="0.38">
          <path
            fill="hsl(var(--primary))"
            d="M0,300 L40,284 L90,302 L140,274 L200,296 L260,270 L330,288 L400,262 L470,280 L550,252 L630,270 L720,246 L810,264 L900,238 L1000,254 L1100,232 L1200,240 L1310,220 L1420,228 L1540,210 L1600,216 L1600,360 L0,360 Z"
          />
        </g>

        {/* Front layer — closest hills, most saturated but still gentle */}
        <g opacity="0.50">
          <path
            fill="hsl(var(--primary))"
            d="M0,330 L50,318 L110,332 L170,310 L240,328 L310,304 L390,322 L470,298 L560,318 L650,292 L750,312 L850,288 L960,306 L1070,282 L1180,298 L1300,276 L1420,288 L1540,268 L1600,274 L1600,360 L0,360 Z"
          />
        </g>

        {/* --- Vegetation cues (very light silhouettes) --- */}
        {/* Left: sparse, uneven — a couple of small dry shapes */}
        <g fill="hsl(var(--muted-foreground))" opacity="0.20">
          <circle cx="120" cy="320" r="3.5" />
          <circle cx="180" cy="314" r="2.8" />
          <circle cx="255" cy="324" r="3" />
          <circle cx="360" cy="312" r="4" />
        </g>

        {/* Middle: small groves appearing */}
        <g fill="hsl(var(--primary))" opacity="0.30">
          <ellipse cx="640" cy="310" rx="7" ry="5" />
          <ellipse cx="654" cy="306" rx="5" ry="4" />
          <ellipse cx="780" cy="300" rx="8" ry="6" />
          <ellipse cx="795" cy="304" rx="5" ry="4" />
          <ellipse cx="900" cy="296" rx="9" ry="6" />
        </g>

        {/* Right: mature trees, ordered spacing */}
        <g fill="hsl(var(--primary))" opacity="0.40">
          <ellipse cx="1100" cy="288" rx="11" ry="8" />
          <ellipse cx="1220" cy="282" rx="12" ry="9" />
          <ellipse cx="1330" cy="276" rx="10" ry="8" />
          <ellipse cx="1440" cy="270" rx="13" ry="10" />
          <ellipse cx="1540" cy="266" rx="11" ry="8" />
        </g>

        {/*
          The thin winding trail — a single continuous path across the
          whole panorama. Kept extremely light so it never competes with
          the interactive timeline on top.
        */}
        <path
          d="M0,320 C120,314 180,298 260,304 S420,330 520,312 S700,280 820,294 S1000,324 1120,300 S1320,270 1440,286 S1560,302 1600,292"
          fill="none"
          stroke="hsl(var(--muted-foreground))"
          strokeOpacity="0.26"
          strokeWidth="1"
          strokeLinecap="round"
        />

        {/* Edge fades to blend into the card */}
        <rect width="1600" height="360" fill="url(#ev-fade-x)" />
        <rect width="1600" height="360" fill="url(#ev-fade-y)" />
      </svg>
    </div>
  );
}
