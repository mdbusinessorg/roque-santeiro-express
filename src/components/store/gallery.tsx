"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Gallery({ images, name }: { images: string[]; name: string }) {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  const startX = useRef<number | null>(null);
  const n = images.length;
  const [dir, setDir] = useState(1);
  const go = (d: number) => { setDir(d); setI((x) => (x + d + n) % n); };
  const pick = (k: number) => { if (k !== i) { setDir(k > i ? 1 : -1); setI(k); } };

  return (
    <div>
      <div
        className="card relative aspect-square overflow-hidden bg-gradient-to-b from-white via-white to-ink/[0.04]"
        onTouchStart={(e) => { startX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => { if (startX.current === null || n < 2) return; const dx = e.changedTouches[0].clientX - startX.current; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); startX.current = null; }}
      >
        <div aria-hidden className="absolute inset-x-[14%] bottom-[9%] h-[12%] rounded-[50%] border border-neutral-900/10 bg-gradient-to-b from-ink/[0.06] to-transparent shadow-[0_18px_30px_-18px_rgba(17,17,19,0.45)]" />
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.img
            key={images[i]}
            src={images[i]}
            alt={name}
            fetchPriority={i === 0 ? "high" : "auto"}
            custom={dir}
            variants={{
              enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, rotate: d * 80, scale: 0.55, x: `${d * 46}%` }),
              center: { opacity: 1, rotate: 0, scale: 1, x: "0%" },
              exit: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, rotate: d * -80, scale: 0.55, x: `${d * -46}%` }),
            }}
            initial="enter" animate="center" exit="exit"
            transition={{ type: "spring", stiffness: 170, damping: 22, mass: 0.9 }}
            className="relative h-full w-full object-contain p-8 pb-[16%] drop-shadow-[0_20px_25px_rgba(17,17,19,0.18)]"
          />
        </AnimatePresence>
        {n > 1 && (
          <>
            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col items-center gap-1.5">
              {images.map((_, k) => <button key={k} aria-label={`Imagem ${k + 1}`} onClick={() => pick(k)} className={cn("rounded-full transition-all", k === i ? "h-3 w-3 border-2 border-neutral-900/20 bg-white" : "h-1.5 w-1.5 bg-neutral-900/25")} />)}
            </div>
            <div className="glass absolute bottom-[7%] left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full p-1">
              <button aria-label="Anterior" onClick={() => go(-1)} className="grid h-7 w-7 place-items-center rounded-full active:bg-neutral-900/10"><ChevronLeft className="h-4 w-4" /></button>
              <button aria-label="Seguinte" onClick={() => go(1)} className="grid h-7 w-7 place-items-center rounded-full active:bg-neutral-900/10"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, k) => (
            <button key={k} onClick={() => pick(k)} className={cn("h-16 w-16 shrink-0 overflow-hidden rounded-2xl border p-1.5 transition active:scale-95", k === i ? "border-neutral-900/20 bg-neutral-950" : "border-neutral-900/10 bg-white")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full rounded-xl bg-white object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
