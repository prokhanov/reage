import { useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  opacity: number;
}

const LINK_DISTANCE = 150;
const LINK_DISTANCE_SQ = LINK_DISTANCE * LINK_DISTANCE;
const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) return; // на мобильных canvas не рендерим вообще
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!ctx) return;

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particleCount = 50;
    const colors = [
      "rgba(168, 85, 247, 0.6)",
      "rgba(236, 72, 153, 0.6)",
      "rgba(147, 197, 253, 0.4)",
      "rgba(196, 181, 253, 0.5)",
    ];

    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 3 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.5 + 0.3,
      });
    }

    let animationFrameId: number;
    let lastFrame = 0;
    let paused = document.hidden;

    const onVisibility = () => {
      paused = document.hidden;
      if (!paused) {
        lastFrame = 0;
        animationFrameId = requestAnimationFrame(animate);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const cellSize = LINK_DISTANCE;
    const grid = new Map<number, number[]>();
    const cellKey = (cx: number, cy: number) => cx * 100000 + cy;

    const animate = (ts?: number) => {
      if (paused) return;
      animationFrameId = requestAnimationFrame(animate);

      if (ts !== undefined) {
        if (ts - lastFrame < FRAME_INTERVAL) return;
        lastFrame = ts;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      grid.clear();
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!reducedMotion) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        }
        const key = cellKey(Math.floor(p.x / cellSize), Math.floor(p.y / cellSize));
        const bucket = grid.get(key);
        if (bucket) bucket.push(i);
        else grid.set(key, [i]);
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const cx = Math.floor(p.x / cellSize);
        const cy = Math.floor(p.y / cellSize);
        for (let ox = -1; ox <= 1; ox++) {
          for (let oy = -1; oy <= 1; oy++) {
            const bucket = grid.get(cellKey(cx + ox, cy + oy));
            if (!bucket) continue;
            for (let k = 0; k < bucket.length; k++) {
              const j = bucket[k];
              if (j <= i) continue;
              const o = particles[j];
              const dx = p.x - o.x;
              const dy = p.y - o.y;
              const distSq = dx * dx + dy * dy;
              if (distSq < LINK_DISTANCE_SQ) {
                const dist = Math.sqrt(distSq);
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(o.x, o.y);
                ctx.strokeStyle = p.color;
                ctx.globalAlpha = (1 - dist / LINK_DISTANCE) * 0.3;
                ctx.lineWidth = 0.5;
                ctx.stroke();
              }
            }
          }
        }
      }

      ctx.globalAlpha = 1;
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isMobile]);

  if (isMobile) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none opacity-40"
      style={{ zIndex: 0 }}
    />
  );
}
