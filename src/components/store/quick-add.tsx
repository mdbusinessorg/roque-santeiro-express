"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart/cart";
import { interact, track } from "@/lib/tracking";
import { tapFeedback } from "@/lib/native";
import type { Product } from "@/lib/types";

export function QuickAdd({ p }: { p: Product }) {
  const { add } = useCart();
  const [done, setDone] = useState(false);
  if (p.stock <= 0) return <span className="mt-2 block rounded-full bg-ink/5 py-2 text-center text-[12px] font-semibold text-ink/45">Esgotado</span>;
  return (
    <button
      type="button"
      onClick={() => {
        add({ product_id: p.id, slug: p.slug, name: p.name, image: p.images?.[0] ?? "", price: Number(p.price), compare_at_price: p.compare_at_price ? Number(p.compare_at_price) : null, store_id: p.store_id, store_name: p.stores?.name ?? "", store_slug: p.stores?.slug ?? "", stock: p.stock });
        tapFeedback();
        track("AddToCart", { content_ids: [p.id], content_type: "product", value: Number(p.price), currency: "AOA", num_items: 1 });
        interact({ kind: "cart", product_id: p.id });
        setDone(true); setTimeout(() => setDone(false), 1400);
      }}
      className={`mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-full text-[12.5px] font-bold transition active:scale-95 ${done ? "bg-emerald-600 text-white" : "bg-ink text-white hover:bg-ink/90"}`}
      aria-label={`Adicionar ${p.name} ao carrinho`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={done ? "d" : "a"} initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -6, opacity: 0 }} transition={{ duration: 0.15 }} className="flex items-center gap-1.5">
          {done ? <><Check className="h-4 w-4" />Adicionado</> : <><ShoppingCart className="h-4 w-4" />Adicionar</>}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
