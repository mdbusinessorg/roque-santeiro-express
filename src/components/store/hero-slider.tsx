"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { kz } from "@/lib/utils";

export type HeroSlide = { href: string; image: string; tag: string; title: string; subtitle: string; price: number; compare: number | null; cta: string };

export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const n = slides.length;
  useEffect(() => {
    if (paused || n < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % n), 5500);
    return () => clearInterval(t);
  }, [paused, n]);
  if (!n) return null;
  const s = slides[i];
  const go = (d: number) => setI((v) => (v + d + n) % n);

  return (
    <div
      className="relative overflow-hidden rounded-[1.6rem] border border-line bg-[linear-gradient(118deg,#fff2f1_0%,#fbf8f7_48%,#eef0f5_100%)] shadow-[0_24px_60px_-44px_rgba(24,24,27,0.5)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/70 blur-2xl" aria-hidden />
      <span className="pointer-events-none absolute right-[18%] top-[12%] hidden h-[70%] w-[38%] rounded-full border border-white/90 sm:block" aria-hidden />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={i}
          drag={n > 1 ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          onDragEnd={(_, info) => { if (info.offset.x < -50) go(1); else if (info.offset.x > 50) go(-1); }}
          initial={reduce ? false : { opacity: 0, x: 36 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? undefined : { opacity: 0, x: -36 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative grid h-[270px] grid-cols-[1.08fr_1fr] items-center sm:h-[340px] lg:h-[400px]"
        >
          <div className="z-10 pl-5 pr-1 sm:pl-10 lg:pl-12">
            <span className="inline-block rounded-full bg-promo/10 px-3 py-1 text-[10.5px] font-bold uppercase tracking-wide text-promo sm:text-xs">{s.tag}</span>
            <h2 className="mt-3 text-[25px] font-black uppercase leading-[0.95] tracking-[-0.02em] text-ink sm:text-5xl lg:text-[60px]">{s.title}</h2>
            <p className="mt-2 line-clamp-2 max-w-xs text-[12.5px] leading-snug text-ink/60 sm:mt-4 sm:text-base">{s.subtitle}</p>
            <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
              <b className="text-base font-extrabold text-ink sm:text-2xl">{kz(s.price)}</b>
              {s.compare && <s className="text-[11px] text-ink/40 sm:text-sm">{kz(s.compare)}</s>}
            </p>
            <Link href={s.href} draggable={false} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-promo px-4 py-2.5 text-[12.5px] font-bold text-white shadow-lg shadow-promo/30 transition hover:bg-accent-600 active:scale-95 sm:mt-6 sm:gap-2 sm:px-6 sm:py-3 sm:text-sm">
              {s.cta}<ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <Link href={s.href} draggable={false} aria-label={s.subtitle} className="relative flex h-full items-end justify-center">
            <span className="absolute bottom-[9%] left-1/2 h-[15%] w-[80%] -translate-x-1/2 rounded-[50%] bg-white shadow-[0_22px_30px_-14px_rgba(24,24,27,0.35),inset_0_-8px_14px_rgba(24,24,27,0.06)]" aria-hidden />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img
              src={s.image}
              alt={s.subtitle}
              draggable={false}
              initial={reduce ? false : { y: 22, scale: 0.94 }}
              animate={{ y: 0, scale: 1 }}
              transition={{ delay: 0.12, type: "spring", stiffness: 170, damping: 17 }}
              className="relative z-10 mb-[12%] h-[70%] w-auto max-w-[92%] object-contain mix-blend-multiply"
            />
          </Link>
        </motion.div>
      </AnimatePresence>
      {n > 1 && (
        <div className="absolute bottom-3 right-4 z-20 flex gap-1.5 sm:bottom-5 sm:left-10 sm:right-auto lg:left-12">
          {slides.map((_, k) => (
            <button key={k} type="button" aria-label={`Destaque ${k + 1}`} onClick={() => setI(k)} className={`h-1.5 rounded-full transition-all ${k === i ? "w-5 bg-promo" : "w-1.5 bg-ink/20"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
