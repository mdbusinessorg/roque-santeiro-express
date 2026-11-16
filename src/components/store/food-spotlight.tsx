"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Bike, ShoppingCart } from "lucide-react";
import type { Product } from "@/lib/types";
import { cn, kz } from "@/lib/utils";
import { useCart } from "@/lib/cart/cart";
import { interact, track } from "@/lib/tracking";
import { tapFeedback } from "@/lib/native";
import { toCartItem } from "@/components/store/product-card";

const EASE = [0.2, 0.7, 0.2, 1] as const;

/** Destaque de comida: o prato redondo sai a rodar enquanto o seguinte entra, o nome revela-se por máscara e há uma fila de miniaturas. */
export function FoodSpotlight({ dishes, className }: { dishes: Product[]; className?: string }) {
  const items = dishes.filter((p) => p.images?.[0] && p.stock > 0).slice(0, 8);
  const n = items.length;
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const reduce = useReducedMotion();
  const touched = useRef(false);
  const { add } = useCart();
  const pick = useCallback((k: number, d?: number) => { setI((cur) => { setDir(d ?? (k > cur ? 1 : -1)); return (k + n) % n; }); }, [n]);

  useEffect(() => {
    if (reduce || n < 2) return;
    const t = setInterval(() => { if (!touched.current && !document.hidden) setI((x) => { setDir(1); return (x + 1) % n; }); }, 4800);
    return () => clearInterval(t);
  }, [n, reduce]);

  if (!n) return null;
  const p = items[i];

  function order(buy: boolean) {
    tapFeedback();
    add(toCartItem(p));
    track("AddToCart", { content_ids: [p.id], content_type: "product", value: Number(p.price), currency: "AOA", num_items: 1 });
    interact({ kind: "cart", product_id: p.id });
    if (buy) window.location.href = "/carrinho";
  }

  return (
    <section className={cn("relative isolate overflow-hidden rounded-[2rem] bg-[#111113] text-white shadow-[0_30px_60px_-40px_rgba(0,0,0,.8)]", className)} onPointerDown={() => { touched.current = true; }} aria-roledescription="carrossel" aria-label="Comida em destaque">
      <span aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />
      <div className="grid sm:grid-cols-2 sm:items-center">
        <div className="relative z-10 px-5 pt-5 sm:py-9 sm:pl-9">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.18em] text-neutral-950">Comida</span>
            <span className="flex items-center gap-1 text-[11.5px] text-white/55"><Bike className="h-3.5 w-3.5" />Entrega em Luanda</span>
          </div>
          <div className="relative mt-3 h-[60px] overflow-hidden sm:h-[92px]">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.a key={p.id} href={`/produto/${p.slug}`} onClick={() => interact({ kind: "click", product_id: p.id })}
                initial={reduce ? false : { y: "105%" }} animate={{ y: 0 }} exit={reduce ? undefined : { y: "-105%" }} transition={{ duration: 0.6, ease: EASE }}
                className="line-clamp-2 block text-[25px] font-black leading-[30px] tracking-tight sm:text-[38px] sm:leading-[46px]">{p.name}</motion.a>
            </AnimatePresence>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={p.id} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0 }} transition={{ duration: 0.3 }}>
              <a href={`/loja/${p.stores?.slug}`} className="mt-1 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-white/85">{p.stores?.name}{p.stores?.is_demo && <span className="rounded-full border border-slate-900/20 px-1.5 py-px text-[9.5px] font-medium uppercase tracking-wide text-white/55">Demonstração</span>}</a>
              <p className="mt-1.5 line-clamp-2 max-w-[60%] text-[12.5px] leading-snug text-white/55 sm:max-w-sm">{p.description}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="relative mx-auto -mt-6 h-[250px] w-full sm:mt-0 sm:h-[340px]">
          <span aria-hidden className="absolute right-[-12%] top-1/2 aspect-square h-[104%] -translate-y-1/2 rounded-full border border-dashed border-slate-900/15 sm:right-[2%]" />
          <AnimatePresence initial={false} custom={dir}>
            <motion.div key={p.id} custom={dir} className="absolute right-[-8%] top-1/2 aspect-square h-[88%] overflow-hidden rounded-full shadow-[0_30px_50px_-20px_rgba(0,0,0,.9)] ring-4 ring-white/10 sm:right-[6%]" style={{ y: "-50%" }}
              initial={reduce ? { opacity: 0 } : { rotate: dir * 110, x: "70%", opacity: 0, scale: 0.7 }} animate={{ rotate: 0, x: "0%", opacity: 1, scale: 1 }} exit={reduce ? { opacity: 0 } : { rotate: dir * -110, x: "70%", opacity: 0, scale: 0.7 }} transition={{ duration: 0.85, ease: EASE }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" draggable={false} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-between gap-3 px-5 pb-3 sm:absolute sm:bottom-[92px] sm:left-9 sm:w-[44%] sm:p-0">
        <div className="relative h-[30px] min-w-[110px] overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p key={p.id} initial={reduce ? false : { y: 30 }} animate={{ y: 0 }} exit={reduce ? undefined : { y: -30 }} transition={{ duration: 0.5, ease: EASE }} className="whitespace-nowrap text-[22px] font-black leading-[30px] text-white">{kz(p.price)}</motion.p>
          </AnimatePresence>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => order(false)} aria-label="Adicionar ao carrinho" className="grid h-11 w-11 place-items-center rounded-full bg-slate-900/10 ring-1 ring-white/15 transition active:scale-90"><ShoppingCart className="h-[18px] w-[18px]" /></button>
          <button type="button" onClick={() => order(true)} className="flex h-11 items-center gap-1.5 rounded-full bg-gold px-4 text-[13px] font-bold text-white transition active:scale-95">Pedir agora<ArrowRight className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="no-scrollbar relative z-10 flex gap-2.5 overflow-x-auto px-5 pb-5 pt-1 sm:px-9">
        {items.map((it, k) => (
          <button key={it.id} type="button" onClick={() => pick(k)} aria-label={it.name} aria-current={k === i} className={cn("relative h-14 w-14 shrink-0 overflow-hidden rounded-full transition-all duration-500", k === i ? "scale-100 ring-2 ring-gold ring-offset-2 ring-offset-[#111113]" : "scale-90 opacity-55")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.images[0].replace("w=900&h=900", "w=160&h=160")} alt="" loading="lazy" className="h-full w-full object-cover" />
          </button>
        ))}
        <a href="/lojas?tipo=comida" className="ml-auto flex h-14 shrink-0 items-center gap-1 self-center rounded-full bg-slate-900/10 px-4 text-[12.5px] font-semibold ring-1 ring-white/15">Ver restaurantes<ArrowRight className="h-3.5 w-3.5" /></a>
      </div>
    </section>
  );
}
