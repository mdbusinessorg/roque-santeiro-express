"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "@/components/ui/native-link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { kz } from "@/lib/utils";
import type { Product } from "@/lib/types";
import { useMyStore } from "@/components/seller/use-my-store";
import { SellerNav } from "@/components/seller/seller-nav";
import { StoreGate } from "@/components/seller/store-gate";

const LABEL: Record<string, string> = { active: "Activo", inactive: "Inactivo", draft: "Rascunho", pending_review: "Em revisão", rejected: "Rejeitado" };

export default function SellerProducts() {
  const { store } = useMyStore("/vendedor/produtos");
  const [items, setItems] = useState<Product[] | null>(null);
  const load = useCallback(async () => {
    if (!store) return;
    const { data } = await supabaseBrowser().from("products").select("*").eq("store_id", store.id).order("created_at", { ascending: false });
    setItems((data as Product[]) ?? []);
  }, [store]);
  useEffect(() => { load(); }, [load]);

  async function toggle(p: Product) {
    await supabaseBrowser().from("products").update({ status: p.status === "active" ? "inactive" : "active" }).eq("id", p.id);
    load();
  }
  async function del(p: Product) {
    if (!confirm(`Apagar "${p.name}"?`)) return;
    await supabaseBrowser().from("products").delete().eq("id", p.id);
    load();
  }

  return (
    <div className="pt-5">
      <StoreGate store={store}>
        <SellerNav />
        <div className="mb-3 flex items-center justify-between px-1">
          <h1 className="text-xl font-extrabold">Produtos</h1>
          <Link href="/vendedor/produtos/novo" className="btn-primary px-4 py-2"><Plus className="h-4 w-4" />Novo produto</Link>
        </div>
        {!items ? <div className="skeleton h-40" /> : !items.length ? <p className="card p-8 text-center text-sm text-ink/60">Ainda não tem produtos. Crie o primeiro.</p> : (
          <div className="space-y-2">
            {items.map((p) => (
              <div key={p.id} className="card flex items-center gap-3 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.images[0] || "/p/smartphone.webp"} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-mist object-contain p-1" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-ink/55">{kz(p.price)} · Stock {p.stock} · {p.sold_count} vendidos</p>
                </div>
                <button onClick={() => toggle(p)} className={`rounded-full px-3 py-1 text-xs font-semibold ${p.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-brand-100 text-brand-800"}`}>{LABEL[p.status] ?? p.status}</button>
                <Link href={`/vendedor/produtos/${p.id}`} aria-label="Editar" className="grid h-9 w-9 place-items-center rounded-full hover:bg-brand-50"><Pencil className="h-4 w-4 text-brand-700" /></Link>
                <button onClick={() => del(p)} aria-label="Apagar" className="grid h-9 w-9 place-items-center rounded-full hover:bg-red-50"><Trash2 className="h-4 w-4 text-red-500" /></button>
              </div>
            ))}
          </div>
        )}
      </StoreGate>
    </div>
  );
}
