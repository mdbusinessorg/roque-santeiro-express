"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type DriftItem = { image: string; title: string; href: string };

export function DriftWall({ items, columns = 4, tileHeight = 132, gap = 14, tilt = 16, turn = -14, speed = 40, className = "" }: {
  items: DriftItem[];
  columns?: number;
  tileHeight?: number;
  gap?: number;
  tilt?: number;
  turn?: number;
  speed?: number;
  className?: string;
}) {
  const [reduce, setReduce] = useState(false);
  useEffect(() => setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  if (!items.length) return null;
  const cols = Array.from({ length: columns }, (_, c) => {
    const list = items.filter((_, i) => i % columns === c);
    return list.length ? list : items;
  });
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden [perspective:1200px] ${className}`}>
      <div className="absolute -inset-[20%] flex justify-center" style={{ gap, transform: `rotateX(${tilt}deg) rotateZ(${turn}deg)`, transformStyle: "preserve-3d" }}>
        {cols.map((list, c) => {
          const dur = (list.length * (tileHeight + gap)) / (speed * (1 + ((c * 37) % 45) / 100));
          return (
            <div key={c} className="flex w-[22%] max-w-[200px] shrink-0 flex-col" style={{ gap, animation: reduce ? undefined : `drift-${c % 2 ? "down" : "up"} ${dur}s linear infinite` }}>
              {[...list, ...list].map((it, i) => (
                <Link key={i} href={it.href} tabIndex={-1} className="pointer-events-auto block overflow-hidden rounded-2xl bg-white/90 shadow-xl" style={{ height: tileHeight }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.image} alt="" loading="lazy" className="h-full w-full object-contain p-3" />
                </Link>
              ))}
            </div>
          );
        })}
      </div>
      <style>{`@keyframes drift-up{from{transform:translateY(0)}to{transform:translateY(-50%)}}@keyframes drift-down{from{transform:translateY(-50%)}to{transform:translateY(0)}}`}</style>
    </div>
  );
}
