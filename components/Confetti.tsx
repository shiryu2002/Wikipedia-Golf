import { useEffect, useRef } from "react";

interface ConfettiProps {
  active: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  w: number;
  h: number;
  rotation: number;
  rotationSpeed: number;
  wobble: number;
  wobbleSpeed: number;
  shape: "rect" | "dot";
}

// Palette-matched confetti: fairway green, gold, cream, ink, rose.
const COLORS = ["#1F7A4D", "#2E9A64", "#C9A227", "#E8C86A", "#F7F3EA", "#1B1A17", "#BE3C46"];

export function Confetti({ active }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const width = () => window.innerWidth;
    const height = () => window.innerHeight;

    const particles: Particle[] = [];
    const spawn = (originX: number, originY: number, count: number, spread: number, power: number) => {
      for (let i = 0; i < count; i += 1) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread;
        const velocity = power * (0.55 + Math.random() * 0.75);
        const size = 5 + Math.random() * 7;
        particles.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          w: size,
          h: size * (0.45 + Math.random() * 0.6),
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.35,
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.08 + Math.random() * 0.1,
          shape: Math.random() < 0.25 ? "dot" : "rect",
        });
      }
    };

    // Two cannons from the bottom corners plus a burst from the centre.
    spawn(width() * 0.08, height() * 0.95, 70, 0.9, 22);
    spawn(width() * 0.92, height() * 0.95, 70, 0.9, 22);
    spawn(width() * 0.5, height() * 0.45, 60, Math.PI * 2, 9);

    const gravity = 0.32;
    const drag = 0.985;
    const start = performance.now();
    const duration = 4200;
    let frame: number | null = null;

    const tick = (now: number) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, width(), height());
      const fade = elapsed > duration - 800 ? Math.max(0, (duration - elapsed) / 800) : 1;

      for (const p of particles) {
        p.vy += gravity;
        p.vx *= drag;
        p.vy *= drag;
        p.x += p.vx + Math.sin(p.wobble) * 0.6;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.wobble += p.wobbleSpeed;

        if (p.y > height() + 40) continue;

        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        if (p.shape === "dot") {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2.4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Fake a paper flutter by squashing the height with the wobble.
          const h = p.h * (0.35 + Math.abs(Math.cos(p.wobble)) * 0.65);
          ctx.fillRect(-p.w / 2, -h / 2, p.w, h);
        }
        ctx.restore();
      }

      if (elapsed < duration) {
        frame = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, width(), height());
        frame = null;
      }
    };

    frame = requestAnimationFrame(tick);

    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resize, 100);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      if (resizeTimeout) clearTimeout(resizeTimeout);
      window.removeEventListener("resize", handleResize);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[200]"
      style={{ width: "100%", height: "100%" }}
      aria-hidden
    />
  );
}
