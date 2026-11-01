"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Heart, Minus, Plus, ShoppingCart } from "lucide-react";
import { useCart, type CartItem } from "@/lib/cart/cart";
import { useAuth } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function ProductActions({ item }: { item: Omit<CartItem, "quantity"> }) {
  const { add } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [fav, setFav] = useState(false);
  const out = item.stock <= 0;

  async function toggleFav() {
    if (!user) return router.push(`/entrar?next=/produto/${item.slug}`);
    const sb = supabaseBrowser();
    if (fav) await sb.from("wishlists").delete().eq("user_id", user.id).eq("product_id", item.product_id);
    else await sb.from("wishlists").upsert({ user_id: user.id, product_id: item.product_id });
    setFav(!fav);
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
          <Heart className={cn("h-5 w-5", fav ? "fill-red-500 text-red-500" : "text-brand-700")} />
        </button>
      </div>
      <div className="fixed inset-x-0 bottom-[84px] z-30 flex gap-2 px-3 md:static md:px-0">
        <button disabled={out} onClick={() => { add(item, qty); setAdded(true); setTimeout(() => setAdded(false), 1800); }} className="btn-ghost h-12 flex-1 border-brand-200 bg-white/90">
          {added ? <Check className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}{added ? "Adicionado" : "Adicionar"}
        </button>
        <button disabled={out} onClick={() => { add(item, qty); router.push("/carrinho"); }} className="btn-primary h-12 flex-1">Comprar agora</button>
      </div>
    </div>
  );
}
