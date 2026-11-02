"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { rpcError } from "@/lib/rpc-error";
import { kz } from "@/lib/utils";
import { useMyStore } from "@/components/seller/use-my-store";
import { SellerNav } from "@/components/seller/seller-nav";
import { StoreGate } from "@/components/seller/store-gate";
import { StoreAvatar } from "@/components/store/store-avatar";

type Stats = { sales: number; orders: number; commission: number; published: number; outOfStock: number };
type Bal = { available: number; pending: number; withdrawn: number };
type Payout = { id: string; amount: number; status: string; created_at: string };

export default function SellerHome() {
  const { store } = useMyStore();
  const [s, setS] = useState<Stats | null>(null);
  const [bal, setBal] = useState<Bal | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [amount, setAmount] = useState("");
  const [iban, setIban] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(id: string) {
    const sb = supabaseBrowser();
    const [subs, prods, b, p] = await Promise.all([
      sb.from("sub_orders").select("subtotal,commission_amount,status").eq("store_id", id),
      sb.from("products").select("status,stock").eq("store_id", id),
      sb.rpc("store_balance", { p_store: id }),
      sb.from("payouts").select("id,amount,status,created_at").eq("store_id", id).order("created_at", { ascending: false }),
    ]);
    const valid = (subs.data ?? []).filter((x) => !["cancelled", "returned"].includes(x.status));
    setS({
      sales: valid.reduce((a, x) => a + Number(x.subtotal), 0), orders: valid.length,
      commission: valid.reduce((a, x) => a + Number(x.commission_amount), 0),
      published: (prods.data ?? []).filter((x) => x.status === "active").length,
      outOfStock: (prods.data ?? []).filter((x) => x.stock <= 0).length,
    });
    setBal(b.data as Bal); setPayouts((p.data as Payout[]) ?? []);
  }
  useEffect(() => { if (store) load(store.id); }, [store]);

  async function requestPayout(e: React.FormEvent) {
    e.preventDefault(); if (!store) return;
    setBusy(true); setMsg(null);
    const { error } = await supabaseBrowser().rpc("request_payout", { p_store: store.id, p_amount: Number(amount), p_iban: iban.trim() });
    setBusy(false);
    if (error) setMsg(rpcError(error)); else { setMsg("Pedido de levantamento enviado."); setAmount(""); load(store.id); }
  }

  return (
    <div className="pt-5">
      <StoreGate store={store}>
        {store && (
          <>
            <div className="mb-4 flex items-center gap-3">
              <StoreAvatar store={store} size={52} />
              <div className="min-w-0 flex-1"><p className="truncate text-xl font-extrabold">{store.name}</p><p className="text-xs text-ink/55">Comissão: {store.commission_rate ?? 5}%</p></div>
              {store.status === "approved" && <Link href={`/loja/${store.slug}`} className="btn-ghost px-3 py-2"><ExternalLink className="h-4 w-4" />Ver loja</Link>}
            </div>
            <SellerNav />
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
              {[["Vendas totais", s ? kz(s.sales) : "…"], ["Encomendas", s?.orders ?? "…"], ["Comissões", s ? kz(s.commission) : "…"], ["Publicados", s?.published ?? "…"], ["Sem stock", s?.outOfStock ?? "…"]].map(([l, v]) => (
                <div key={l as string} className="card p-4"><p className="text-xs text-ink/55">{l}</p><p className="mt-1 text-lg font-extrabold text-brand-800">{v}</p></div>
              ))}
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="brand-gradient rounded-[1.6rem] p-5 text-white">
                <p className="text-sm text-white/75">Saldo disponível</p>
                <p className="text-3xl font-extrabold">{bal ? kz(bal.available) : "…"}</p>
                <p className="mt-2 text-xs text-white/80">Pendente: {bal ? kz(bal.pending) : "…"} · Levantado: {bal ? kz(bal.withdrawn) : "…"}</p>
                <p className="mt-1 text-[11px] text-white/65">O saldo só fica disponível depois do pagamento confirmado e da entrega concluída.</p>
                <Link href="/vendedor/carteira" className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25">Carteira e liquidações →</Link>
              </div>
              <form onSubmit={requestPayout} className="card space-y-2 p-4">
                <p className="font-bold">Pedir levantamento</p>
                <input required inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Valor (Kz)" className="input" />
                <input required value={iban} onChange={(e) => setIban(e.target.value)} placeholder="IBAN AO06…" className="input" />
                {msg && <p className="text-sm text-brand-800">{msg}</p>}
                <button disabled={busy} className="btn-primary w-full">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Pedir levantamento</button>
              </form>
            </div>
            {payouts.length > 0 && (
              <div className="card mt-4 p-4 text-sm">
                <p className="mb-2 font-bold">Histórico de levantamentos</p>
                {payouts.map((p) => <div key={p.id} className="flex justify-between border-t border-brand-100 py-2"><span>{new Date(p.created_at).toLocaleDateString("pt-AO")}</span><span>{kz(p.amount)}</span><span className="font-semibold text-brand-700">{p.status}</span></div>)}
              </div>
            )}
          </>
        )}
      </StoreGate>
    </div>
  );
}
