import { useEffect, useRef } from "react";

export function GradientRibbon() {
  const ribbonRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const ribbon = ribbonRef.current;
    if (!ribbon) return;

    let offset = 0;
    const animate = () => {
      offset += 0.08;
      ribbon.style.transform = `translateY(${Math.sin(offset * 0.015) * 12}px)`;
      requestAnimationFrame(animate);
    };
    
    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Ribbon width (height of the tube)
  const ribbonWidth = 80;

  // Main center path - S-curve through the middle
  const centerPath = `
    M -100 700
    C 200 650, 400 450, 600 400
    S 900 250, 1100 300
    S 1400 450, 1600 400
    S 1900 250, 2100 300
  `;

  // Calculate offset paths for top and bottom edges
  const topPath = `
    M -100 ${700 - ribbonWidth}
    C 200 ${650 - ribbonWidth}, 400 ${450 - ribbonWidth}, 600 ${400 - ribbonWidth}
    S 900 ${250 - ribbonWidth}, 1100 ${300 - ribbonWidth}
    S 1400 ${450 - ribbonWidth}, 1600 ${400 - ribbonWidth}
    S 1900 ${250 - ribbonWidth}, 2100 ${300 - ribbonWidth}
  `;

  const bottomPath = `
    M -100 ${700 + ribbonWidth}
    C 200 ${650 + ribbonWidth}, 400 ${450 + ribbonWidth}, 600 ${400 + ribbonWidth}
    S 900 ${250 + ribbonWidth}, 1100 ${300 + ribbonWidth}
    S 1400 ${450 + ribbonWidth}, 1600 ${400 + ribbonWidth}
    S 1900 ${250 + ribbonWidth}, 2100 ${300 + ribbonWidth}
  `;

  // Closed ribbon body path
  const ribbonBodyPath = `
    M -100 ${700 - ribbonWidth}
    C 200 ${650 - ribbonWidth}, 400 ${450 - ribbonWidth}, 600 ${400 - ribbonWidth}
    S 900 ${250 - ribbonWidth}, 1100 ${300 - ribbonWidth}
    S 1400 ${450 - ribbonWidth}, 1600 ${400 - ribbonWidth}
    S 1900 ${250 - ribbonWidth}, 2100 ${300 - ribbonWidth}
    L 2100 ${300 + ribbonWidth}
    C 1900 ${250 + ribbonWidth}, 1600 ${400 + ribbonWidth}, 1400 ${450 + ribbonWidth}
    S 1100 ${300 + ribbonWidth}, 900 ${250 + ribbonWidth}
    S 600 ${400 + ribbonWidth}, 400 ${450 + ribbonWidth}
    S 200 ${650 + ribbonWidth}, -100 ${700 + ribbonWidth}
    Z
  `;

  // Highlight path (top third of ribbon)
  const highlightPath = `
    M -100 ${700 - ribbonWidth}
    C 200 ${650 - ribbonWidth}, 400 ${450 - ribbonWidth}, 600 ${400 - ribbonWidth}
    S 900 ${250 - ribbonWidth}, 1100 ${300 - ribbonWidth}
    S 1400 ${450 - ribbonWidth}, 1600 ${400 - ribbonWidth}
    S 1900 ${250 - ribbonWidth}, 2100 ${300 - ribbonWidth}
    L 2100 ${300 - ribbonWidth + 35}
    C 1900 ${250 - ribbonWidth + 35}, 1600 ${400 - ribbonWidth + 35}, 1400 ${450 - ribbonWidth + 35}
    S 1100 ${300 - ribbonWidth + 35}, 900 ${250 - ribbonWidth + 35}
    S 600 ${400 - ribbonWidth + 35}, 400 ${450 - ribbonWidth + 35}
    S 200 ${650 - ribbonWidth + 35}, -100 ${700 - ribbonWidth + 35}
    Z
  `;

  // Shadow path (bottom third)
  const shadowPath = `
    M -100 ${700 + ribbonWidth - 35}
    C 200 ${650 + ribbonWidth - 35}, 400 ${450 + ribbonWidth - 35}, 600 ${400 + ribbonWidth - 35}
    S 900 ${250 + ribbonWidth - 35}, 1100 ${300 + ribbonWidth - 35}
    S 1400 ${450 + ribbonWidth - 35}, 1600 ${400 + ribbonWidth - 35}
    S 1900 ${250 + ribbonWidth - 35}, 2100 ${300 + ribbonWidth - 35}
    L 2100 ${300 + ribbonWidth}
    C 1900 ${250 + ribbonWidth}, 1600 ${400 + ribbonWidth}, 1400 ${450 + ribbonWidth}
    S 1100 ${300 + ribbonWidth}, 900 ${250 + ribbonWidth}
    S 600 ${400 + ribbonWidth}, 400 ${450 + ribbonWidth}
    S 200 ${650 + ribbonWidth}, -100 ${700 + ribbonWidth}
    Z
  `;

  // Shine line path (very thin bright line near top)
  const shinePath = `
    M -100 ${700 - ribbonWidth + 12}
    C 200 ${650 - ribbonWidth + 12}, 400 ${450 - ribbonWidth + 12}, 600 ${400 - ribbonWidth + 12}
    S 900 ${250 - ribbonWidth + 12}, 1100 ${300 - ribbonWidth + 12}
    S 1400 ${450 - ribbonWidth + 12}, 1600 ${400 - ribbonWidth + 12}
    S 1900 ${250 - ribbonWidth + 12}, 2100 ${300 - ribbonWidth + 12}
  `;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
      <svg
        viewBox="0 0 1920 1080"
        className="absolute w-[200%] h-[150%] -left-[25%] -top-[25%] md:w-[140%] md:h-[120%] md:-left-[10%] md:-top-[10%]"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Main horizontal gradient along the ribbon */}
          <linearGradient id="ribbonGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff1493" />
            <stop offset="20%" stopColor="#ff69b4" />
            <stop offset="40%" stopColor="#da70d6" />
            <stop offset="60%" stopColor="#9370db" />
            <stop offset="80%" stopColor="#8a2be2" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>

          {/* Vertical gradient for 3D cylindrical effect - applied to main body */}
          <linearGradient id="cylinderShading" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="25%" stopColor="rgba(255,255,255,0.1)" />
            <stop offset="50%" stopColor="rgba(0,0,0,0)" />
            <stop offset="75%" stopColor="rgba(0,0,0,0.15)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
          </linearGradient>

          {/* Highlight gradient for top edge */}
          <linearGradient id="highlightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
            <stop offset="50%" stopColor="rgba(255,192,203,0.4)" />
            <stop offset="100%" stopColor="rgba(255,105,180,0)" />
          </linearGradient>

          {/* Shadow gradient for bottom edge */}
          <linearGradient id="shadowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(75,0,130,0)" />
            <stop offset="50%" stopColor="rgba(75,0,130,0.3)" />
            <stop offset="100%" stopColor="rgba(30,0,50,0.6)" />
          </linearGradient>

          {/* Glow filter for ambient light */}
          <filter id="glowFilter" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="40" result="blur" />
            <feComposite in="blur" in2="SourceGraphic" operator="over" />
          </filter>

          {/* Soft outer glow */}
          <filter id="outerGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="50" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Drop shadow for depth */}
          <filter id="dropShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="30" stdDeviation="50" floodColor="#ff1493" floodOpacity="0.35" />
          </filter>
        </defs>
        
        <g ref={ribbonRef}>
          {/* Layer 1: Diffuse glow behind the ribbon */}
          <path
            d={ribbonBodyPath}
            fill="url(#ribbonGradient)"
            opacity="0.3"
            filter="url(#glowFilter)"
          />

          {/* Layer 2: Main ribbon body with gradient */}
          <path
            d={ribbonBodyPath}
            fill="url(#ribbonGradient)"
            filter="url(#dropShadow)"
          />

          {/* Layer 3: Cylindrical shading overlay for 3D depth */}
          <path
            d={ribbonBodyPath}
            fill="url(#cylinderShading)"
          />

          {/* Layer 4: Top highlight for glossy effect */}
          <path
            d={highlightPath}
            fill="url(#highlightGradient)"
          />

          {/* Layer 5: Bottom shadow for depth */}
          <path
            d={shadowPath}
            fill="url(#shadowGradient)"
          />

          {/* Layer 6: Thin shine line at the top */}
          <path
            d={shinePath}
            fill="none"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}
