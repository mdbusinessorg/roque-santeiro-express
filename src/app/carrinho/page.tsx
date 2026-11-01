"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, Store, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart/cart";
import { kz } from "@/lib/utils";

export default function CartPage() {
  const { items, subtotal, setQty, remove, ready, count } = useCart();
  if (!ready) return <div className="skeleton mt-6 h-60" />;
  if (!items.length) return (
    <div className="card mx-auto mt-8 max-w-md p-8 text-center">
      <ShoppingBag className="mx-auto h-12 w-12 text-brand-400" />
      <h1 className="mt-3 text-xl font-bold">O seu carrinho está vazio</h1>
      <p className="mt-1 text-sm text-ink/60">Explore milhares de produtos de várias lojas.</p>
      <Link href="/" className="btn-primary mt-5">Começar a comprar</Link>
    </div>
  );
  const groups = items.reduce<Record<string, typeof items>>((acc, i) => { (acc[i.store_id] ||= []).push(i); return acc; }, {});

  return (
    <div className="pt-5 lg:grid lg:grid-cols-[1fr_340px] lg:gap-5">
      <div>
        <h1 className="mb-3 px-1 text-2xl font-extrabold tracking-tight">Carrinho <span className="text-base font-medium text-ink/50">({count})</span></h1>
        <div className="space-y-3">
          {Object.values(groups).map((g) => (
            <div key={g[0].store_id} className="card p-4">
              <Link href={`/loja/${g[0].store_slug}`} className="mb-2 flex items-center gap-2 text-sm font-bold text-brand-800"><Store className="h-4 w-4" />{g[0].store_name}</Link>
              {g.map((i) => (
                <div key={i.product_id} className="flex gap-3 border-t border-brand-100 py-3">
                  <Link href={`/produto/${i.slug}`} className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={i.image} alt={i.name} className="h-20 w-20 rounded-2xl bg-brand-50 object-contain p-1.5" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm">{i.name}</p>
                    <p className="mt-1 font-bold text-brand-800">{kz(i.price)}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="glass flex items-center rounded-full">
                        <button aria-label="Menos" onClick={() => setQty(i.product_id, i.quantity - 1)} className="grid h-8 w-8 place-items-center"><Minus className="h-3.5 w-3.5" /></button>
                        <span className="w-6 text-center text-sm font-semibold">{i.quantity}</span>
                        <button aria-label="Mais" onClick={() => setQty(i.product_id, i.quantity + 1)} className="grid h-8 w-8 place-items-center"><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                      <button aria-label="Remover" onClick={() => remove(i.product_id)} className="ml-auto grid h-8 w-8 place-items-center rounded-full text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <aside className="card mt-4 h-fit p-4 lg:sticky lg:top-36 lg:mt-12">
        <div className="flex justify-between text-sm"><span className="text-ink/60">Subtotal</span><span className="font-semibold">{kz(subtotal)}</span></div>
        <p className="mt-1 text-xs text-ink/50">Portes calculados no checkout, por loja.</p>
        <p className="mt-1 text-xs text-ink/50">{Object.keys(groups).length} {Object.keys(groups).length === 1 ? "loja" : "lojas"} neste carrinho</p>
        <Link href="/checkout" className="btn-primary mt-4 h-12 w-full">Finalizar compra</Link>
      </aside>
    </div>
  );
}
