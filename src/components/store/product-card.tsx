"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/ui/native-link";
import { BadgeCheck, Check, Heart, ShoppingCart, Star } from "lucide-react";
import type { Product } from "@/lib/types";
import { cn, discountPct, kz } from "@/lib/utils";
import { useCart } from "@/lib/cart/cart";
import { useAuth } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabase/client";
import { interact, track } from "@/lib/tracking";
import { tapFeedback } from "@/lib/native";

function toCartItem(p: Product) {
  return { product_id: p.id, slug: p.slug, name: p.name, image: p.images?.[0] ?? "", price: Number(p.price), compare_at_price: p.compare_at_price ? Number(p.compare_at_price) : null, store_id: p.store_id, store_name: p.stores?.name ?? "", store_slug: p.stores?.slug ?? "", stock: p.stock };
}

export function ProductCard({ p, compact, className }: { p: Product; compact?: boolean; className?: string }) {
  const router = useRouter();
  const { add } = useCart();
  const { user } = useAuth();
  const [added, setAdded] = useState(false);
  const [fav, setFav] = useState(false);
  const off = discountPct(Number(p.price), p.compare_at_price ? Number(p.compare_at_price) : null);
  const out = p.stock <= 0;

  function clickProduct() {
    interact({ kind: "click", product_id: p.id });
  }
  function addCart(e?: React.MouseEvent) {
    e?.preventDefault(); e?.stopPropagation();
    if (out) return;
    tapFeedback();
    add(toCartItem(p));
    track("AddToCart", { content_ids: [p.id], content_type: "product", value: Number(p.price), currency: "AOA", num_items: 1 });
    interact({ kind: "cart", product_id: p.id });
    setAdded(true); setTimeout(() => setAdded(false), 1400);
  }
  function buyNow(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (out) return;
    tapFeedback();
    add(toCartItem(p));
    track("AddToCart", { content_ids: [p.id], content_type: "product", value: Number(p.price), currency: "AOA", num_items: 1 });
    interact({ kind: "cart", product_id: p.id });
    router.push("/carrinho");
  }
  async function toggleFav(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    tapFeedback();
    if (!user) return router.push(`/entrar?next=/produto/${p.slug}`);
    const sb = supabaseBrowser();
    const { data } = await sb.from("wishlists").select("product_id").eq("user_id", user.id).eq("product_id", p.id).maybeSingle();
    if (data) { await sb.from("wishlists").delete().eq("user_id", user.id).eq("product_id", p.id); setFav(false); }
    else { await sb.from("wishlists").upsert({ user_id: user.id, product_id: p.id }); setFav(true); track("AddToWishlist", { content_ids: [p.id], content_type: "product", value: Number(p.price), currency: "AOA" }); interact({ kind: "wishlist", product_id: p.id }); }
  }

  return (
    <div className={cn("card group relative flex flex-col overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[0_18px_36px_-22px_rgba(23,54,92,0.4)]", className)}>
      <div className="relative">
        <Link href={`/produto/${p.slug}`} onClick={clickProduct} className="block aspect-square border-b border-line bg-mist active:scale-[0.98] transition">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.images?.[0]} alt={p.name} loading="lazy" className="h-full w-full object-contain p-3 mix-blend-multiply transition duration-300 group-hover:scale-105" />
          {off > 0 && <span className="absolute left-2 top-2 rounded-md bg-promo px-1.5 py-0.5 text-[11px] font-bold text-white shadow-sm">-{off}%</span>}
          {p.sponsored && <span className="glass absolute right-10 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold text-ink/70">Patrocinado</span>}
        </Link>
        <div className="absolute right-2 top-2 flex flex-col gap-1.5">
          <button type="button" onClick={toggleFav} aria-label="Favorito" className={cn("grid h-8 w-8 place-items-center rounded-full shadow-md transition active:scale-90", fav ? "bg-promo text-white" : "bg-white/95 text-ink/70 backdrop-blur")}>
            <Heart className={cn("h-4 w-4", fav && "fill-white")} />
          </button>
        </div>
        {!out && (
          <button type="button" onClick={addCart} aria-label={`Adicionar ${p.name} ao carrinho`} className={cn("absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full shadow-lg transition active:scale-90", added ? "bg-emerald-600 text-white" : "bg-ink text-gold hover:bg-ink/90")}>
            {added ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
          </button>
        )}
      </div>
      <Link href={`/produto/${p.slug}`} onClick={clickProduct} className={cn("flex flex-1 flex-col gap-1 p-3 pb-0", compact && "p-2.5 pb-0")}>
        <p className={cn("line-clamp-2 text-[13.5px] leading-snug text-ink", compact && "text-[12.5px]")}>{p.name}</p>
        {(p.rating_count > 0 || p.sold_count > 0) && (
          <p className="flex items-center gap-1 text-[11.5px] text-ink/60">{p.rating_count > 0 && <><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{Number(p.rating).toFixed(1)} <span>({p.rating_count})</span></>}{p.sold_count > 0 && <span>{p.rating_count > 0 && "· "}{p.sold_count} vendidos</span>}</p>
        )}
        <div className="mt-auto pt-1">
          <p className={cn("text-[16.5px] font-extrabold tracking-tight", off > 0 ? "text-promo" : "text-ink")}>{kz(p.price)}</p>
          {p.stock > 0 && p.stock <= 5 && <p className="text-[11px] font-semibold text-amber-600">Só restam {p.stock} em stock</p>}
          {off > 0 && <p className="flex items-center gap-1.5 text-[11.5px]"><span className="text-ink/45 line-through">{kz(p.compare_at_price)}</span><span className="font-semibold text-accent-700">Poupa {kz(Number(p.compare_at_price) - Number(p.price))}</span></p>}
        </div>
        {p.stores && !compact && (
          <p className="flex items-center gap-1 truncate text-[11.5px] text-ink/55">
            {p.stores.is_official && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-accent-600" />}{p.stores.name}
          </p>
        )}
      </Link>
      <div className={cn("px-3 pb-3 pt-2", compact && "px-2.5 pb-2.5")}>
        <button type="button" disabled={out} onClick={buyNow} className="flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-ink text-[12.5px] font-bold text-gold transition hover:bg-ink/90 active:scale-[0.98] disabled:bg-ink/30">
          {out ? "Esgotado" : "Comprar agora"}
        </button>
      </div>
    </div>
  );
}

export function ProductGrid({ products, className }: { products: Product[]; className?: string }) {
  if (!products.length) return <p className="card p-8 text-center text-sm text-ink/60">Nenhum produto encontrado.</p>;
  return (
    <div className={cn("grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5", className)}>
      {products.map((p) => <ProductCard key={p.id} p={p} />)}
    </div>
  );
}

export function Section({ title, href, children, subtitle }: { title: React.ReactNode; href?: string; children: React.ReactNode; subtitle?: string }) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-end justify-between gap-3 px-1">
        <div>
          <h2 className="flex items-center gap-2.5 text-[19px] font-extrabold tracking-tight text-ink sm:text-2xl"><span className="h-5 w-1 shrink-0 rounded-full bg-brand-600 sm:h-6" aria-hidden />{title}</h2>
          {subtitle && <p className="text-[13px] text-ink/55">{subtitle}</p>}
        </div>
        {href && <Link href={href} className="shrink-0 rounded-full border border-line bg-white px-3 py-1 text-[13px] font-semibold text-brand-600 transition hover:border-brand-300">Ver tudo</Link>}
      </div>
      {children}
    </section>
  );
}
