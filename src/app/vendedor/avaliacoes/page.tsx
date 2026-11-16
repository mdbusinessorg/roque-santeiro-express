"use client";

import { useCallback, useEffect, useState } from "react";
import { Star } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { rpcError } from "@/lib/rpc-error";
import { useMyStore } from "@/components/seller/use-my-store";
import { SellerNav } from "@/components/seller/seller-nav";
import { StoreGate } from "@/components/seller/store-gate";

type R = { id: string; rating: number; title: string | null; comment: string | null; verified: boolean; seller_reply: string | null; created_at: string; products: { name: string } | null };

export default function SellerReviews() {
  const { store } = useMyStore("/vendedor/avaliacoes");
  const [rows, setRows] = useState<R[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!store) return;
    const { data } = await supabaseBrowser().from("reviews").select("id,rating,title,comment,verified,seller_reply,created_at,products!inner(name,store_id)").eq("products.store_id", store.id).eq("status", "published").order("created_at", { ascending: false }).limit(100);
    setRows((data as unknown as R[]) ?? []);
  }, [store]);
  useEffect(() => { load(); }, [load]);
  async function reply(id: string, text: string) {
    const { error } = await supabaseBrowser().rpc("reply_review", { p_review: id, p_reply: text });
    setMsg(error ? rpcError(error) : "Resposta publicada. O comentário do cliente não é alterado."); load();
  }
  return (
    <div className="pt-5">
      <StoreGate store={store}>
        <SellerNav />
        <h1 className="mb-3 px-1 text-xl font-extrabold">Avaliações dos clientes</h1>
        {msg && <p className="mb-3 rounded-xl bg-brand-50 p-3 text-sm">{msg}</p>}
        {!rows ? <div className="skeleton h-40" /> : !rows.length ? <p className="card p-8 text-center text-sm text-ink/60">Ainda não tem avaliações. Aparecem aqui quando clientes com encomendas entregues avaliarem os seus produtos.</p> : (
          <div className="space-y-3">{rows.map((r) => (
            <div key={r.id} className="card p-4 text-sm">
              <div className="flex justify-between gap-2"><p className="font-bold">{r.products?.name}</p><span className="text-xs text-ink/50">{new Date(r.created_at).toLocaleDateString("pt-AO")}</span></div>
              <p className="mt-1 flex gap-0.5">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`h-3.5 w-3.5 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-line"}`} />)}</p>
              {r.title && <p className="font-semibold">{r.title}</p>}<p className="text-ink/75">{r.comment}</p>
              <form onSubmit={(e) => { e.preventDefault(); reply(r.id, String(new FormData(e.currentTarget).get("r") ?? "")); }} className="mt-2 flex gap-2">
                <input name="r" defaultValue={r.seller_reply ?? ""} placeholder="Responder publicamente" className="input h-10 py-1.5 text-sm" />
                <button className="btn-ghost h-10 px-3">{r.seller_reply ? "Actualizar" : "Responder"}</button>
              </form>
            </div>
          ))}</div>
        )}
      </StoreGate>
    </div>
  );
}
