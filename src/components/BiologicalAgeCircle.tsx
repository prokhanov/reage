import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  hue: number;
}

interface BiologicalAgeCircleProps {
  biologicalAge: number | null;
  chronologicalAge: number | null;
}

export function BiologicalAgeCircle({
  biologicalAge,
  chronologicalAge,
}: BiologicalAgeCircleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ageDifference = biologicalAge && chronologicalAge ? chronologicalAge - biologicalAge : null;

  // Determine color based on age difference
  const getColorFromDifference = (diff: number | null) => {
    if (diff === null) return { hue: 280, sat: 70, light: 65 }; // primary purple
    if (diff > 5) return { hue: 140, sat: 70, light: 55 }; // green - great
    if (diff > 0) return { hue: 160, sat: 65, light: 60 }; // teal - good
    if (diff === 0) return { hue: 200, sat: 70, light: 60 }; // blue - neutral
    if (diff > -5) return { hue: 35, sat: 80, light: 60 }; // orange - warning
    return { hue: 0, sat: 75, light: 55 }; // red - danger
  };

  const color = getColorFromDifference(ageDifference);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 320;
    canvas.width = size;
    canvas.height = size;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = 130;

    const particles: Particle[] = [];
    const particleCount = 50;

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * (radius - 20);
      particles.push({
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        radius: Math.random() * 1.2 + 0.6,
        opacity: Math.random() * 0.2 + 0.1,
        hue: color.hue + (Math.random() - 0.5) * 30,
      });
    }

    let animationFrameId: number;
    let time = 0;

    const animate = () => {
      time += 0.015;
      ctx.clearRect(0, 0, size, size);

      // Animated gradient background fill
      const gradientAngle = time * 0.3;
      const x1 = centerX + Math.cos(gradientAngle) * radius;
      const y1 = centerY + Math.sin(gradientAngle) * radius;
      const x2 = centerX + Math.cos(gradientAngle + Math.PI) * radius;
      const y2 = centerY + Math.sin(gradientAngle + Math.PI) * radius;
      
      const bgGradient = ctx.createLinearGradient(x1, y1, x2, y2);
      
      // Beautiful shifting gradient colors
      const hueShift = Math.sin(time * 0.2) * 20;
      const color1Hue = color.hue + hueShift;
      const color2Hue = color.hue + 40 + hueShift;
      const color3Hue = color.hue - 30 + hueShift;
      
      bgGradient.addColorStop(0, `hsla(${color1Hue}, 75%, 70%, 0.15)`);
      bgGradient.addColorStop(0.5, `hsla(${color2Hue}, 80%, 65%, 0.25)`);
      bgGradient.addColorStop(1, `hsla(${color3Hue}, 70%, 75%, 0.15)`);
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 3, 0, Math.PI * 2);
      ctx.fillStyle = bgGradient;
      ctx.fill();

      // Animate and draw particles with shimmer
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        const dx = particle.x - centerX;
        const dy = particle.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Bounce particles within circle smoothly
        if (distance > radius - 25) {
          const angle = Math.atan2(dy, dx);
          particle.x = centerX + Math.cos(angle) * (radius - 25);
          particle.y = centerY + Math.sin(angle) * (radius - 25);
          particle.vx *= -0.5;
          particle.vy *= -0.5;
        }

        // Gentle pulsing and shimmer effect
        const pulse = Math.sin(time * 0.5 + particle.x * 0.01) * 0.2 + 1;
        const shimmer = Math.sin(time * 0.8 + particle.y * 0.015) * 0.3 + 0.7;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${particle.hue + hueShift}, 85%, 75%, ${particle.opacity * shimmer})`;
        ctx.fill();

        // Soft glow to particles
        const particleGlow = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.radius * pulse * 5
        );
        particleGlow.addColorStop(0, `hsla(${particle.hue + hueShift}, 85%, 80%, ${particle.opacity * 0.4 * shimmer})`);
        particleGlow.addColorStop(1, `hsla(${particle.hue + hueShift}, 80%, 75%, 0)`);
        ctx.fillStyle = particleGlow;
        ctx.fill();
      });

      // Animated border with gradient
      const borderGradientAngle = time * 0.4;
      const bx1 = centerX + Math.cos(borderGradientAngle) * radius * 1.5;
      const by1 = centerY + Math.sin(borderGradientAngle) * radius * 1.5;
      const bx2 = centerX + Math.cos(borderGradientAngle + Math.PI) * radius * 1.5;
      const by2 = centerY + Math.sin(borderGradientAngle + Math.PI) * radius * 1.5;
      
      const borderGradient = ctx.createLinearGradient(bx1, by1, bx2, by2);
      borderGradient.addColorStop(0, `hsla(${color.hue + hueShift - 10}, 80%, 65%, 0.5)`);
      borderGradient.addColorStop(0.3, `hsla(${color.hue + hueShift + 20}, 85%, 70%, 0.8)`);
      borderGradient.addColorStop(0.7, `hsla(${color.hue + hueShift + 30}, 90%, 75%, 0.8)`);
      borderGradient.addColorStop(1, `hsla(${color.hue + hueShift - 20}, 75%, 70%, 0.5)`);
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = borderGradient;
      ctx.lineWidth = 4;
      ctx.stroke();

      // Inner glow ring
      const innerGlowGradient = ctx.createRadialGradient(centerX, centerY, radius - 15, centerX, centerY, radius - 5);
      innerGlowGradient.addColorStop(0, `hsla(${color.hue + hueShift + 20}, 90%, 80%, 0)`);
      innerGlowGradient.addColorStop(1, `hsla(${color.hue + hueShift + 20}, 85%, 75%, 0.15)`);
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 5, 0, Math.PI * 2);
      ctx.fillStyle = innerGlowGradient;
      ctx.fill();

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [color.hue, color.sat, color.light]);

  return (
    <div className="relative flex items-center justify-center w-[320px] h-[320px]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ 
          filter: `drop-shadow(0 0 40px hsla(${color.hue}, 85%, 70%, 0.6)) drop-shadow(0 0 80px hsla(${color.hue + 30}, 80%, 65%, 0.3))`
        }}
      />
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 px-4">
        <div className="text-7xl font-bold animate-scale-in text-foreground leading-none">
          {biologicalAge ? biologicalAge.toFixed(1) : "—"}
        </div>
        <div className="text-xs font-medium text-muted-foreground/70 tracking-widest uppercase mt-2">
          био · возраст
        </div>
      </div>
    </div>
  );
}
