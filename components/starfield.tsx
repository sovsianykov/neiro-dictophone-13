"use client";

import { useEffect, useRef } from "react";

export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Respect reduced motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const STAR_COUNT = 200;
    const COLORS = [
      "255, 0, 255",   // magenta
      "0, 255, 255",   // cyan
      "180, 0, 255",   // violet
      "255, 100, 255", // pink
      "200, 200, 255", // white-ish
    ];
    const stars: Array<{ x: number; y: number; r: number; speed: number; opacity: number; twinkle: number; color: string }> = [];

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function initStars() {
      if (!canvas) return;
      stars.length = 0;
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 1.6 + 0.3,
          speed: prefersReduced ? 0 : (Math.random() * 0.15 + 0.02),
          opacity: Math.random() * 0.7 + 0.15,
          twinkle: Math.random() * Math.PI * 2,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        });
      }
    }

    resize();
    initStars();

    const resizeObserver = new ResizeObserver(() => {
      resize();
      initStars();
    });
    resizeObserver.observe(document.body);

    let raf = 0;
    let t = 0;

    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.008;

      for (const star of stars) {
        star.twinkle += 0.015;
        const alpha = star.opacity * (0.6 + 0.4 * Math.sin(star.twinkle));
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.shadowBlur = star.r > 1.2 ? 6 : 0;
        ctx.shadowColor = `rgba(${star.color}, 0.8)`;
        ctx.fillStyle = `rgba(${star.color}, ${alpha})`;
        ctx.fill();

        // Drift slowly downward
        if (!prefersReduced) {
          star.y += star.speed;
          if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
          }
        }
      }

      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: 0.85 }}
    />
  );
}
