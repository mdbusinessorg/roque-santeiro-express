"use client";

import { motion, useReducedMotion } from "motion/react";

type Bar = { label: string; v: number };

export function BarPills({ data, format, height = 220 }: { data: Bar[]; format?: (v: number) => string; height?: number }) {
  const reduce = useReducedMotion();
  const max = Math.max(1, ...data.map((d) => d.v));
  const peak = data.reduce((m, d, i) => (d.v > data[m].v ? i : m), 0);
  const prev = peak > 0 ? data[peak - 1].v : 0;
  const delta = prev > 0 ? Math.round(((data[peak].v - prev) / prev) * 100) : null;
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((t) => Math.round(max * t));
  const short = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n));
  return (
    <div className="flex gap-2" style={{ height }}>
      <div className="flex flex-col justify-between pb-6 text-right text-[10px] text-ink/40">{ticks.map((t, i) => <span key={i}>{short(t)}</span>)}</div>
      <div className="relative flex flex-1 items-end justify-between gap-1.5 sm:gap-3">
        <div className="pointer-events-none absolute inset-x-0 bottom-6 top-1 flex flex-col justify-between">{ticks.map((_, i) => <span key={i} className="border-t border-dashed border-ink/10" />)}</div>
        {data.map((d, i) => {
          const hPct = Math.max(6, (d.v / max) * 100);
          const hi = i === peak && d.v > 0;
          return (
            <div key={d.label + i} className="relative flex h-full flex-1 flex-col items-center justify-end">
              <div className="relative flex w-full max-w-[56px] flex-1 items-end">
                <motion.div
                  initial={reduce ? false : { height: 0 }}
                  animate={{ height: `${hPct}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 18, delay: i * 0.04 }}
                  className={`relative w-full rounded-full ${hi ? "bg-ink" : "bg-ink/15"}`}
                  style={{ backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.18) 0 2px, transparent 2px 9px)" }}
                  title={format ? format(d.v) : String(d.v)}
                >
                  {hi && (
                    <>
                      <span className="absolute left-1/2 top-2 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white bg-gold" />
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-gold">
                        {delta !== null ? `${delta > 0 ? "+" : ""}${delta}%` : format ? format(d.v) : d.v}
                      </span>
                    </>
                  )}
                </motion.div>
              </div>
              <span className="mt-2 h-4 text-[10px] font-medium uppercase text-ink/50">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
