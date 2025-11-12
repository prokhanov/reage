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
    const particleCount = 40;

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * (radius - 20);
      particles.push({
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        radius: Math.random() * 1.5 + 0.8,
        opacity: Math.random() * 0.25 + 0.15,
        hue: color.hue + (Math.random() - 0.5) * 20,
      });
    }

    let animationFrameId: number;
    let time = 0;

    const animate = () => {
      time += 0.02;
      ctx.clearRect(0, 0, size, size);

      // Animate and draw particles
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        const dx = particle.x - centerX;
        const dy = particle.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Bounce particles within circle smoothly
        if (distance > radius - 20) {
          const angle = Math.atan2(dy, dx);
          particle.x = centerX + Math.cos(angle) * (radius - 20);
          particle.y = centerY + Math.sin(angle) * (radius - 20);
          particle.vx *= -0.5;
          particle.vy *= -0.5;
        }

        // Very gentle pulsing effect
        const pulse = Math.sin(time * 0.5 + particle.x * 0.005) * 0.15 + 1;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${particle.hue}, ${color.sat - 10}%, ${color.light}%, ${particle.opacity})`;
        ctx.fill();

        // Soft glow to particles
        const particleGlow = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.radius * pulse * 4
        );
        particleGlow.addColorStop(0, `hsla(${particle.hue}, ${color.sat - 10}%, ${color.light + 5}%, ${particle.opacity * 0.3})`);
        particleGlow.addColorStop(1, `hsla(${particle.hue}, ${color.sat - 10}%, ${color.light}%, 0)`);
        ctx.fillStyle = particleGlow;
        ctx.fill();
      });

      // Draw main circle border with gradient
      const borderGradient = ctx.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY);
      borderGradient.addColorStop(0, `hsl(${color.hue - 10}, ${color.sat}%, ${color.light}%)`);
      borderGradient.addColorStop(0.5, `hsl(${color.hue}, ${color.sat + 10}%, ${color.light + 5}%)`);
      borderGradient.addColorStop(1, `hsl(${color.hue + 10}, ${color.sat}%, ${color.light}%)`);
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = borderGradient;
      ctx.lineWidth = 6;
      ctx.stroke();

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
          filter: `drop-shadow(0 0 30px hsla(${color.hue}, ${color.sat}%, ${color.light}%, 0.4))`
        }}
      />
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 px-4">
        <div className="text-7xl font-bold animate-scale-in text-foreground">
          {biologicalAge ? biologicalAge.toFixed(1) : "—"}
        </div>
      </div>
    </div>
  );
}
