import { useEffect, useRef } from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  healthIndex: number | null;
  biomarkersMetadata?: any;
}

export function BiologicalAgeCircle({
  biologicalAge,
  chronologicalAge,
  healthIndex,
  biomarkersMetadata,
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
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2.5 + 1,
        opacity: Math.random() * 0.6 + 0.3,
        hue: color.hue + (Math.random() - 0.5) * 30,
      });
    }

    let animationFrameId: number;
    let time = 0;

    const animate = () => {
      time += 0.02;
      ctx.clearRect(0, 0, size, size);

      // Draw outer glow ring
      const glowGradient = ctx.createRadialGradient(centerX, centerY, radius - 10, centerX, centerY, radius + 20);
      glowGradient.addColorStop(0, `hsla(${color.hue}, ${color.sat}%, ${color.light}%, 0.3)`);
      glowGradient.addColorStop(1, `hsla(${color.hue}, ${color.sat}%, ${color.light}%, 0)`);
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 10, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();

      // Animate and draw particles
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        const dx = particle.x - centerX;
        const dy = particle.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Bounce particles within circle
        if (distance > radius - 10) {
          const angle = Math.atan2(dy, dx);
          particle.x = centerX + Math.cos(angle) * (radius - 10);
          particle.y = centerY + Math.sin(angle) * (radius - 10);
          particle.vx *= -0.8;
          particle.vy *= -0.8;
        }

        // Gentle pulsing effect
        const pulse = Math.sin(time + particle.x * 0.01) * 0.3 + 1;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${particle.hue}, ${color.sat}%, ${color.light}%, ${particle.opacity})`;
        ctx.fill();

        // Add glow to particles
        const particleGlow = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.radius * pulse * 3
        );
        particleGlow.addColorStop(0, `hsla(${particle.hue}, ${color.sat}%, ${color.light + 10}%, ${particle.opacity * 0.4})`);
        particleGlow.addColorStop(1, `hsla(${particle.hue}, ${color.sat}%, ${color.light}%, 0)`);
        ctx.fillStyle = particleGlow;
        ctx.fill();
      });

      // Draw connections between nearby particles
      particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach((p2) => {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 60) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `hsla(${color.hue}, ${color.sat}%, ${color.light}%, ${(1 - distance / 60) * 0.2})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
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

      // Inner subtle glow
      const innerGlow = ctx.createRadialGradient(centerX, centerY, radius - 30, centerX, centerY, radius);
      innerGlow.addColorStop(0, `hsla(${color.hue}, ${color.sat}%, ${color.light}%, 0)`);
      innerGlow.addColorStop(1, `hsla(${color.hue}, ${color.sat}%, ${color.light}%, 0.1)`);
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = innerGlow;
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
          filter: `drop-shadow(0 0 30px hsla(${color.hue}, ${color.sat}%, ${color.light}%, 0.4))`,
          animation: 'pulse 3s ease-in-out infinite'
        }}
      />
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 px-4">
        <div 
          className="text-6xl font-bold animate-scale-in transition-colors duration-1000"
          style={{ 
            color: `hsl(${color.hue}, ${color.sat}%, ${color.light - 10}%)`,
            textShadow: `0 0 20px hsla(${color.hue}, ${color.sat}%, ${color.light}%, 0.5)`
          }}
        >
          {biologicalAge ? biologicalAge.toFixed(1) : "—"}
        </div>
        <div className="text-sm text-muted-foreground mt-2">
          лет
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Биологический возраст
        </div>
        {biomarkersMetadata && (
          <div className="space-y-2 mt-3">
            {/* Базовая информация о биомаркерах */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-xs text-muted-foreground/70 flex items-center justify-center gap-1 cursor-help">
                    <Info className="h-3 w-3" />
                    <span>
                      {biomarkersMetadata.current_biomarkers_count} биомаркеров
                      {biomarkersMetadata.historical_biomarkers_count > 0 &&
                        ` (+${biomarkersMetadata.historical_biomarkers_count} из истории)`}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-1 text-xs">
                    <p>
                      <span className="font-medium">Текущий анализ:</span>{" "}
                      {biomarkersMetadata.current_biomarkers_count} биомаркеров
                    </p>
                    {biomarkersMetadata.historical_biomarkers_count > 0 && (
                      <>
                        <p>
                          <span className="font-medium">Исторические данные:</span>{" "}
                          {biomarkersMetadata.historical_biomarkers_count} биомаркеров
                        </p>
                        <p className="text-muted-foreground">
                          Включены данные за последние {biomarkersMetadata.window_months || 4}{" "}
                          месяца
                          {biomarkersMetadata.oldest_historical_date &&
                            ` (старейшие от ${new Date(
                              biomarkersMetadata.oldest_historical_date
                            ).toLocaleDateString("ru-RU")})`}
                        </p>
                      </>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* AI analysis confidence */}
            {biomarkersMetadata.ai_analysis?.confidence_score !== undefined && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-xs text-muted-foreground/70 flex items-center justify-center gap-1 cursor-help">
                      <Info className="h-3 w-3" />
                      <span>Достоверность: {biomarkersMetadata.ai_analysis.confidence_score}%</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      Уровень уверенности AI-анализа в расчёте биологического возраста на основе доступных данных
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
