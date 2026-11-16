"use client";

import { useEffect, useRef, useState } from "react";
import Link from "@/components/ui/native-link";
import { motion } from "motion/react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { anonId, interact } from "@/lib/tracking";
import { PRODUCT_SELECT, type Product } from "@/lib/types";
import { ProductCard } from "@/components/store/product-card";

export type RecoKind = "similar" | "bought_together" | "for_you" | "popular_week" | "top_rated" | "best_sellers" | "category_new";

export function RecoRail({ kind, title, subtitle, productId, exclude = [], limit = 10, href }: { kind: RecoKind; title: string; subtitle?: string; productId?: string; exclude?: string[]; limit?: number; href?: string }) {
  const [items, setItems] = useState<Product[] | null>(null);
  const logged = useRef(false);
  const ex = exclude.join(",");
  useEffect(() => {
    let on = true;
    supabaseBrowser().rpc("recommend", { p_kind: kind, p_product: productId ?? null, p_anon: anonId(), p_limit: limit + 4 }).select(PRODUCT_SELECT)
      .then(({ data }) => { if (on) setItems(((data as Product[]) ?? []).filter((p) => !ex.split(",").includes(p.id)).slice(0, limit)); });
    return () => { on = false; };
  }, [kind, productId, limit, ex]);
  useEffect(() => {
    if (items?.length && !logged.current) { logged.current = true; items.slice(0, 4).forEach((p) => interact({ kind: "rec_impression", product_id: p.id, context: kind })); }
  }, [items, kind]);
  if (items === null) return <div className="mt-6"><div className="skeleton h-5 w-48" /><div className="mt-3 flex gap-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-56 w-40 shrink-0" />)}</div></div>;
  if (!items.length) return null;
  return (
    <section className="mt-6" aria-label={title}>
      <div className="flex items-end justify-between gap-3">
        <div><h2 className="text-lg font-extrabold tracking-tight">{title}</h2>{subtitle && <p className="text-xs text-ink/55">{subtitle}</p>}</div>
        {href && <Link href={href} className="text-sm font-semibold text-brand-600">Ver mais</Link>}
      </div>
      <div className="no-scrollbar -mx-3 mt-3 flex snap-x gap-3 overflow-x-auto px-3 pb-2">
        {items.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(i, 6) * 0.05 }}
            className="w-[44%] shrink-0 snap-start sm:w-48" onClickCapture={() => interact({ kind: "rec_click", product_id: p.id, context: kind })}>
            <ProductCard p={p} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
