"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import type { Product } from "@/lib/types";
import { cn, discountPct, kz } from "@/lib/utils";
import { useCart } from "@/lib/cart/cart";
import { interact, track } from "@/lib/tracking";
import { tapFeedback } from "@/lib/native";
import { toCartItem } from "@/components/store/product-card";

const TONES = ["#f4ead4", "#e8e9ee", "#f2e3dc", "#e2e9e4", "#ece7f0", "#eff6ff"];
const SPRING = { type: "spring", stiffness: 170, damping: 24, mass: 0.9 } as const;

/** Montra em arco: o produto activo fica grande dentro do arco, os vizinhos esbatidos aos lados e o fundo muda de tom. */
export function ArcSpotlight({ products, label = "Em destaque", className }: { products: Product[]; label?: string; className?: string }) {
  const items = products.filter((p) => p.images?.[0]).slice(0, 8);
  const n = items.length;
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const reduce = useReducedMotion();
  const touched = useRef(false);
  const { add } = useCart();
  const go = useCallback((d: number) => { setDir(d); setI((x) => (x + d + n) % n); }, [n]);

  useEffect(() => {
    if (reduce || n < 2) return;
    const t = setInterval(() => { if (!touched.current && !document.hidden) go(1); }, 5200);
    return () => clearInterval(t);
  }, [go, n, reduce]);

  if (!n) return null;
  const p = items[i];
  const off = discountPct(Number(p.price), p.compare_at_price ? Number(p.compare_at_price) : null);
  const rel = (k: number) => { let d = k - i; if (d > n / 2) d -= n; if (d < -n / 2) d += n; return d; };

  function cart(buy: boolean) {
    if (p.stock <= 0) return;
    tapFeedback();
    add(toCartItem(p));
    track("AddToCart", { content_ids: [p.id], content_type: "product", value: Number(p.price), currency: "AOA", num_items: 1 });
    interact({ kind: "cart", product_id: p.id });
    if (buy) window.location.href = "/carrinho";
  }

  return (
    <motion.section
      className={cn("relative isolate overflow-hidden rounded-[2rem] border border-slate-900/70 shadow-[0_30px_60px_-40px_rgba(24,24,27,.55)]", className)}
      animate={{ backgroundColor: TONES[i % TONES.length] }}
      transition={{ duration: 0.7, ease: [0.3, 0.7, 0.2, 1] }}
      onPointerDown={() => { touched.current = true; }}
      aria-roledescription="carrossel"
    >
      <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
        <div className="relative z-10 px-5 pt-5 lg:order-1 lg:py-10 lg:pl-10">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-neutral-950 px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.18em] text-white">{label}</span>
            <span className="font-mono text-[11px] text-ink/50">{String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}</span>
          </div>
          <div className="relative mt-3 h-[58px] overflow-hidden lg:h-[104px]">
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.a key={p.id} href={`/produto/${p.slug}`} onClick={() => interact({ kind: "click", product_id: p.id })} custom={dir}
                initial={reduce ? false : { y: dir * 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={reduce ? undefined : { y: dir * -40, opacity: 0 }} transition={SPRING}
                className="line-clamp-2 block text-[23px] font-black leading-[1.12] tracking-tight text-ink lg:text-[44px]">{p.name}</motion.a>
            </AnimatePresence>
          </div>
          <p className="mt-1 truncate text-[12px] text-ink/55">{p.stores?.name}{p.categories?.name ? ` · ${p.categories.name}` : ""}</p>
        </div>

        <motion.div
          className="relative mx-auto mt-2 h-[270px] w-full touch-pan-y select-none lg:order-2 lg:mt-0 lg:h-[420px]"
          drag={n > 1 ? "x" : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.18} dragSnapToOrigin
          onDragEnd={(_e, info) => { if (Math.abs(info.offset.x) > 46) go(info.offset.x < 0 ? 1 : -1); }}
        >
          <div aria-hidden className="absolute bottom-0 left-1/2 h-[96%] w-[68%] max-w-[380px] -translate-x-1/2 rounded-t-full border border-slate-900/80" />
          {items.map((it, k) => {
            const d = rel(k);
            const far = Math.abs(d) > 1;
            return (
              <motion.div key={it.id} className="pointer-events-none absolute bottom-0 left-1/2 h-[90%] w-[58%] max-w-[330px] overflow-hidden rounded-t-full bg-white shadow-[0_-18px_50px_-30px_rgba(24,24,27,.45)] ring-1 ring-white/80" style={{ x: "-50%", zIndex: d === 0 ? 3 : 1, transformOrigin: "50% 100%" }}
                initial={false}
                animate={{ translateX: `${d * 86}%`, scale: d === 0 ? 1 : 0.5, opacity: far ? 0 : d === 0 ? 1 : 0.5, rotate: d * 7, filter: d === 0 ? "blur(0px)" : "blur(2px)" }}
                transition={reduce ? { duration: 0 } : SPRING}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.images[0]} alt={d === 0 ? it.name : ""} draggable={false} loading={Math.abs(d) <= 1 ? "eager" : "lazy"} className="h-full w-full object-cover" />
              </motion.div>
            );
          })}
          {off > 0 && <span className="absolute right-[14%] top-[10%] z-10 grid h-12 w-12 place-items-center rounded-full bg-promo text-[12px] font-extrabold text-white shadow-lg">-{off}%</span>}
        </motion.div>
      </div>

      <div className="relative z-10 flex items-end justify-between gap-3 px-5 pb-5 pt-3 lg:absolute lg:bottom-9 lg:left-10 lg:w-[42%] lg:p-0">
        <div className="min-w-0">
          <div className="relative h-[30px] overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.p key={p.id} initial={reduce ? false : { y: 30 }} animate={{ y: 0 }} exit={reduce ? undefined : { y: -30 }} transition={SPRING} className="whitespace-nowrap text-[21px] font-black leading-[30px] tracking-tight text-ink sm:text-[24px]">{kz(p.price)}</motion.p>
            </AnimatePresence>
          </div>
          {off > 0 && <p className="text-[11.5px] text-ink/45 line-through">{kz(p.compare_at_price)}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => cart(false)} disabled={p.stock <= 0} aria-label="Adicionar ao carrinho" className="grid h-11 w-11 place-items-center rounded-full bg-white text-ink shadow-md transition active:scale-90 disabled:opacity-40"><ShoppingCart className="h-[18px] w-[18px]" /></button>
          <button type="button" onClick={() => cart(true)} disabled={p.stock <= 0} className="flex h-11 items-center gap-1.5 rounded-full bg-neutral-950 px-4 text-[13px] font-bold text-white shadow-lg transition active:scale-95 disabled:bg-neutral-900/30">{p.stock <= 0 ? "Esgotado" : "Comprar agora"}<ArrowRight className="h-4 w-4" /></button>
        </div>
      </div>

      {n > 1 && (
        <>
          <button aria-label="Anterior" onClick={() => go(-1)} className="glass absolute left-3 top-[52%] z-10 hidden h-9 w-9 place-items-center rounded-full lg:left-auto lg:right-[52%] lg:grid"><ChevronLeft className="h-4 w-4" /></button>
          <button aria-label="Seguinte" onClick={() => go(1)} className="glass absolute right-3 top-[52%] z-10 hidden h-9 w-9 place-items-center rounded-full lg:grid"><ChevronRight className="h-4 w-4" /></button>
          <div className="absolute left-1/2 top-[calc(100%-8px)] z-10 flex -translate-x-1/2 -translate-y-full gap-1 lg:left-auto lg:right-8 lg:translate-x-0">
            {items.map((it, k) => <button key={it.id} aria-label={`Produto ${k + 1}`} onClick={() => { setDir(k > i ? 1 : -1); setI(k); }} className={cn("h-1 rounded-full transition-all duration-500", k === i ? "w-5 bg-neutral-950" : "w-1.5 bg-neutral-900/20")} />)}
          </div>
        </>
      )}
    </motion.section>
  );
}
