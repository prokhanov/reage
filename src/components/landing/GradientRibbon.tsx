import { useEffect, useRef } from "react";

export function GradientRibbon() {
  const ribbonRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const ribbon = ribbonRef.current;
    if (!ribbon) return;

    let offset = 0;
    const animate = () => {
      offset += 0.15;
      ribbon.style.transform = `translateY(${Math.sin(offset * 0.02) * 8}px)`;
      requestAnimationFrame(animate);
    };
    
    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
      <svg
        viewBox="0 0 1920 1080"
        className="absolute w-[250%] h-[180%] -left-[50%] -top-[40%] md:w-[180%] md:h-[140%] md:-left-[20%] md:-top-[20%]"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Main gradient - vibrant pink to purple */}
          <linearGradient id="ribbonMain" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff1493" />
            <stop offset="25%" stopColor="#ff69b4" />
            <stop offset="50%" stopColor="#da70d6" />
            <stop offset="75%" stopColor="#9370db" />
            <stop offset="100%" stopColor="#8a2be2" />
          </linearGradient>
          
          {/* Lighter edge gradient for 3D effect */}
          <linearGradient id="ribbonLight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
            <stop offset="30%" stopColor="#ffb6c1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ff69b4" stopOpacity="0" />
          </linearGradient>
          
          {/* Darker edge gradient for depth */}
          <linearGradient id="ribbonDark" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#4b0082" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#8b008b" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#da70d6" stopOpacity="0" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="30" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          {/* Soft shadow */}
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="20" stdDeviation="40" floodColor="#ff1493" floodOpacity="0.4" />
          </filter>
        </defs>
        
        <g ref={ribbonRef}>
          {/* Background glow - large and diffuse */}
          <path
            d="M -200 950 
               C 100 900, 300 800, 500 700 
               S 800 550, 1000 500 
               S 1300 400, 1500 380 
               S 1800 300, 2100 200"
            fill="none"
            stroke="url(#ribbonMain)"
            strokeWidth="200"
            strokeLinecap="round"
            opacity="0.25"
            filter="url(#glow)"
          />
          
          {/* Main ribbon body - thick and bold */}
          <path
            d="M -200 950 
               C 100 900, 300 800, 500 700 
               S 800 550, 1000 500 
               S 1300 400, 1500 380 
               S 1800 300, 2100 200"
            fill="none"
            stroke="url(#ribbonMain)"
            strokeWidth="120"
            strokeLinecap="round"
            filter="url(#shadow)"
          />
          
          {/* Top highlight - for 3D volume */}
          <path
            d="M -200 920 
               C 100 870, 300 770, 500 670 
               S 800 520, 1000 470 
               S 1300 370, 1500 350 
               S 1800 270, 2100 170"
            fill="none"
            stroke="url(#ribbonLight)"
            strokeWidth="60"
            strokeLinecap="round"
            opacity="0.9"
          />
          
          {/* Bottom shadow edge - for depth */}
          <path
            d="M -200 980 
               C 100 930, 300 830, 500 730 
               S 800 580, 1000 530 
               S 1300 430, 1500 410 
               S 1800 330, 2100 230"
            fill="none"
            stroke="url(#ribbonDark)"
            strokeWidth="50"
            strokeLinecap="round"
            opacity="0.7"
          />
          
          {/* Inner shine line - bright accent */}
          <path
            d="M -200 910 
               C 100 860, 300 760, 500 660 
               S 800 510, 1000 460 
               S 1300 360, 1500 340 
               S 1800 260, 2100 160"
            fill="none"
            stroke="white"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.5"
          />
        </g>
      </svg>
    </div>
  );
}