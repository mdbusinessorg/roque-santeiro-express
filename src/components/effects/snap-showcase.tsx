"use client";

import Link from "@/components/ui/native-link";
import { useEffect, useRef, useState } from "react";
import type { FlexItem } from "./flex-carousel";

export function SnapShowcase({ items }: { items: FlexItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const mid = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let bestD = Infinity;
      Array.from(el.children).forEach((c, i) => {
        const n = c as HTMLElement;
        const center = n.offsetLeft + n.offsetWidth / 2;
        const d = Math.abs(center - mid);
        const t = Math.min(d / n.offsetWidth, 1);
        n.style.transform = `scale(${1 - t * 0.1})`;
        n.style.opacity = String(1 - t * 0.35);
        if (d < bestD) { bestD = d; best = i; }
      });
      setActive(best);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { el.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, [items.length]);

  const go = (i: number) => {
    const el = ref.current;
    const n = el?.children[i] as HTMLElement | undefined;
    if (el && n) el.scrollTo({ left: n.offsetLeft - (el.clientWidth - n.offsetWidth) / 2, behavior: "smooth" });
  };

  if (!items.length) return null;
  return (
    <div>
      <div ref={ref} className="no-scrollbar -mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[14%] pb-2">
        {items.map((it, i) => (
          <Link
            key={it.href + i}
            href={it.href}
            className="relative block w-[72%] shrink-0 snap-center overflow-hidden rounded-[1.4rem] border border-line bg-white shadow-[0_18px_40px_-28px_rgba(24,24,27,0.45)] transition-[transform,opacity] duration-200 ease-out will-change-transform"
          >
            <div className="aspect-[4/5] bg-mist">
              <img src={it.src} alt={it.alt} decoding="async" className="h-full w-full object-contain p-5 mix-blend-multiply" />
            </div>
            <div className="glass absolute inset-x-2 bottom-2 rounded-2xl px-3 py-2">
              <p className="line-clamp-1 text-sm font-semibold text-ink">{it.title}</p>
              {it.subtitle && <p className="text-sm font-extrabold text-promo">{it.subtitle}</p>}
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-2 flex justify-center gap-1.5">
        {items.map((_, i) => (
          <button key={i} type="button" aria-label={`Ver ${i + 1}`} onClick={() => go(i)} className={`h-1.5 rounded-full transition-all ${i === active ? "w-5 bg-promo" : "w-1.5 bg-ink/20"}`} />
        ))}
      </div>
    </div>
  );
}
