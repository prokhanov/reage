import { useEffect, useRef } from "react";

export function GradientRibbon() {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    // Add subtle animation to the ribbon
    const path = pathRef.current;
    if (!path) return;

    let offset = 0;
    const animate = () => {
      offset += 0.2;
      path.style.transform = `translateY(${Math.sin(offset * 0.01) * 5}px)`;
      requestAnimationFrame(animate);
    };
    
    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
      <svg
        viewBox="0 0 1920 1080"
        className="absolute w-[200%] h-[150%] -left-[25%] -top-[25%] md:w-[150%] md:h-[120%] md:-left-[10%] md:-top-[10%]"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Main gradient for the ribbon */}
          <linearGradient id="ribbonGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(330, 85%, 55%)" />
            <stop offset="35%" stopColor="hsl(320, 90%, 60%)" />
            <stop offset="65%" stopColor="hsl(280, 80%, 65%)" />
            <stop offset="100%" stopColor="hsl(260, 70%, 65%)" />
          </linearGradient>
          
          {/* Highlight gradient for 3D effect */}
          <linearGradient id="ribbonHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
          </linearGradient>
          
          {/* Glow filter */}
          <filter id="ribbonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="20" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Blur for depth */}
          <filter id="softBlur">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>
        
        {/* Background glow layer */}
        <path
          d="M -100 900 
             Q 200 850, 400 750 
             T 800 550 
             T 1200 400 
             T 1600 350 
             T 2100 200"
          fill="none"
          stroke="url(#ribbonGradient)"
          strokeWidth="180"
          strokeLinecap="round"
          opacity="0.3"
          filter="url(#ribbonGlow)"
        />
        
        {/* Main ribbon path */}
        <path
          ref={pathRef}
          d="M -100 900 
             Q 200 850, 400 750 
             T 800 550 
             T 1200 400 
             T 1600 350 
             T 2100 200"
          fill="none"
          stroke="url(#ribbonGradient)"
          strokeWidth="80"
          strokeLinecap="round"
          className="drop-shadow-2xl"
        />
        
        {/* Highlight overlay for 3D effect */}
        <path
          d="M -100 885 
             Q 200 835, 400 735 
             T 800 535 
             T 1200 385 
             T 1600 335 
             T 2100 185"
          fill="none"
          stroke="url(#ribbonHighlight)"
          strokeWidth="40"
          strokeLinecap="round"
          opacity="0.6"
        />
      </svg>
    </div>
  );
}
