"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";

export type FlexItem = { src: string; alt: string; title: string; subtitle?: string; href: string };

export function FlexCarousel({ items, height = 320, gap = 10 }: { items: FlexItem[]; height?: number; gap?: number }) {
  const [active, setActive] = useState(0);
  if (!items.length) return null;
  return (
    <div className="flex w-full" style={{ height, gap }} onMouseLeave={() => undefined}>
      {items.map((it, i) => {
        const on = i === active;
        return (
          <motion.div
            key={it.href + i}
            layout
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ layout: { type: "spring", stiffness: 260, damping: 30 }, delay: i * 0.06 }}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={(e) => { if (!on) { e.preventDefault(); setActive(i); } }}
            className="relative min-w-0 overflow-hidden rounded-[1.4rem] border border-line bg-white"
            style={{ flex: on ? 5 : 1 }}
          >
            <Link href={it.href} className="block h-full w-full" aria-label={it.title}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.src} alt={it.alt} className={`h-full w-full object-contain p-4 transition duration-500 ${on ? "scale-100" : "scale-110 opacity-80"}`} />
              <motion.div animate={{ opacity: on ? 1 : 0, y: on ? 0 : 12 }} className="glass absolute inset-x-2 bottom-2 rounded-2xl px-3 py-2">
                <p className="line-clamp-1 text-sm font-bold text-ink">{it.title}</p>
                {it.subtitle && <p className="text-[13px] font-extrabold text-promo">{it.subtitle}</p>}
              </motion.div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
