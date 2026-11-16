"use client";

import { motion, AnimatePresence } from "motion/react";
import { interact, track } from "@/lib/tracking";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Heart, Minus, Plus, ShoppingCart } from "lucide-react";
import { useCart, type CartItem } from "@/lib/cart/cart";
import { useAuth } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { tapFeedback } from "@/lib/native";

export function ProductActions({ item }: { item: Omit<CartItem, "quantity"> }) {
  const { add } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [fav, setFav] = useState(false);
  const out = item.stock <= 0;

  async function toggleFav() {
    tapFeedback();
    if (!user) return router.push(`/entrar?next=/produto/${item.slug}`);
    const sb = supabaseBrowser();
    if (fav) await sb.from("wishlists").delete().eq("user_id", user.id).eq("product_id", item.product_id);
    else await sb.from("wishlists").upsert({ user_id: user.id, product_id: item.product_id });
    if (!fav) { track("AddToWishlist", { content_ids: [item.product_id], content_type: "product", value: Number(item.price), currency: "AOA" }); interact({ kind: "wishlist", product_id: item.product_id }); }
    setFav(!fav);
  }
  function addCart(go?: boolean) {
    tapFeedback();
    add(item, qty);
    track("AddToCart", { content_ids: [item.product_id], content_type: "product", value: Number(item.price) * qty, currency: "AOA", num_items: qty });
    interact({ kind: "cart", product_id: item.product_id });
    if (go) router.push("/carrinho"); else { setAdded(true); setTimeout(() => setAdded(false), 1800); }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="glass flex items-center rounded-full p-1">
          <button aria-label="Menos" className="grid h-9 w-9 place-items-center rounded-full active:bg-brand-100" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="h-4 w-4" /></button>
          <span className="w-8 text-center font-semibold">{qty}</span>
          <button aria-label="Mais" className="grid h-9 w-9 place-items-center rounded-full active:bg-brand-100" onClick={() => setQty(Math.min(item.stock, qty + 1))}><Plus className="h-4 w-4" /></button>
        </div>
        <span className={cn("text-sm font-medium", out ? "text-red-600" : item.stock < 10 ? "text-amber-600" : "text-emerald-600")}>
          {out ? "Esgotado" : item.stock < 10 ? `Só restam ${item.stock}` : "Em stock"}
        </span>
        <button onClick={toggleFav} aria-label="Favorito" className="glass ml-auto grid h-11 w-11 place-items-center rounded-full">
          <motion.span key={String(fav)} initial={{ scale: 0.6 }} animate={{ scale: [0.6, 1.25, 1] }} transition={{ duration: 0.35 }} className="grid place-items-center">
            <Heart className={cn("h-5 w-5", fav ? "fill-brand-600 text-brand-600" : "text-ink/70")} />
          </motion.span>
        </button>
      </div>
      <div className="fixed inset-x-0 bottom-[84px] z-30 flex gap-2 px-3 md:static md:px-0">
        <button disabled={out} onClick={() => addCart()} className="btn-ghost h-12 flex-1 border-brand-200 bg-white/90">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={String(added)} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={{ duration: 0.18 }} className="flex items-center gap-2">
              {added ? <Check className="h-5 w-5 text-emerald-600" /> : <ShoppingCart className="h-5 w-5" />}{added ? "Adicionado" : "Adicionar"}
            </motion.span>
          </AnimatePresence>
        </button>
        <button disabled={out} onClick={() => addCart(true)} className="btn-primary h-12 flex-1">Comprar agora</button>
      </div>
    </div>
  );
}
