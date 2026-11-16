"use client";

import { motion, useReducedMotion } from "motion/react";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/store/product-card";

/** Grelha em que os cartões entram um a um ao aparecerem no ecrã. */
export function RevealGrid({ products, className }: { products: Product[]; className?: string }) {
  const reduce = useReducedMotion();
  if (!products.length) return <p className="card p-8 text-center text-sm text-cream/60">Ainda não há produtos aqui.</p>;
  return (
    <div className={cn("grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5", className)}>
      {products.map((p, k) => (
        <motion.div key={p.id} initial={reduce ? false : { opacity: 0, y: 26, scale: 0.97 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, margin: "0px 0px -8% 0px" }} transition={{ duration: 0.55, delay: (k % 5) * 0.06, ease: [0.2, 0.7, 0.2, 1] }}>
          <ProductCard p={p} className="h-full" />
        </motion.div>
      ))}
    </div>
  );
}
