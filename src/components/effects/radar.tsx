"use client";

import { useEffect, useRef } from "react";

export function Radar({ color = "#e5484d", speed = 1, rings = 5, spokes = 12, className = "" }: { color?: string; speed?: number; rings?: number; spokes?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let visible = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      c.width = c.offsetWidth * dpr;
      c.height = c.offsetHeight * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(draw);
    });
    io.observe(c);
    const t0 = performance.now();
    function draw(now: number) {
      raf = 0;
      if (!visible || !ctx || !c) return;
      const w = c.width, h = c.height, cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 2 * dpr;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = dpr;
      for (let i = 1; i <= rings; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (r * i) / rings, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        ctx.stroke();
      }
      const ang = reduce ? -Math.PI / 4 : (((now - t0) / 1000) * speed * Math.PI * 0.9) % (Math.PI * 2);
      const steps = 40;
      for (let i = 0; i < steps; i++) {
        ctx.globalAlpha = (1 - i / steps) * 0.35;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, ang - (i + 1) * 0.02, ang - i * 0.02);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
      ctx.lineWidth = 2 * dpr;
      ctx.stroke();
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(cx, cy, 3 * dpr, 0, Math.PI * 2);
      ctx.fill();
      if (!reduce) raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [color, speed, rings, spokes]);
  return <canvas ref={ref} aria-hidden className={`block aspect-square w-full ${className}`} />;
}
