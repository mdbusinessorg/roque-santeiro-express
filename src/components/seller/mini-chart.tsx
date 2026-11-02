"use client";

import { motion, useReducedMotion } from "motion/react";

type Point = { d: string; v: number };

export function MiniChart({ data, color = "#111113", fill = "rgba(17,17,19,0.08)", height = 140, format }: { data: Point[]; color?: string; fill?: string; height?: number; format?: (v: number) => string }) {
  const reduce = useReducedMotion();
  const w = 600, h = height, pad = 6;
  const max = Math.max(1, ...data.map((p) => p.v));
  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, data.length - 1);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2 - 14);
  const line = data.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${h} L${x(0)},${h} Z`;
  const peak = data.reduce((m, p, i) => (p.v > data[m].v ? i : m), 0);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Gráfico">
      {[0.25, 0.5, 0.75].map((t) => <line key={t} x1={0} x2={w} y1={h * t} y2={h * t} stroke="rgba(17,17,19,0.06)" />)}
      <motion.path d={area} fill={fill} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />
      <motion.path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: "easeOut" }} />
      {data.length > 0 && data[peak].v > 0 && (
        <g>
          <circle cx={x(peak)} cy={y(data[peak].v)} r={5} fill="#fff" stroke={color} strokeWidth={2.5} />
          <text x={Math.min(w - 4, Math.max(4, x(peak)))} y={Math.max(12, y(data[peak].v) - 10)} textAnchor="middle" fontSize={13} fontWeight={700} fill={color}>{format ? format(data[peak].v) : data[peak].v}</text>
        </g>
      )}
    </svg>
  );
}
