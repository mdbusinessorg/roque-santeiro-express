"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Eye, ExternalLink, MessageSquare, Package, Plus, ShoppingBag, Star, Truck, Users, Wallet } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { kz } from "@/lib/utils";
import { useMyStore } from "@/components/seller/use-my-store";
import { SellerNav } from "@/components/seller/seller-nav";
import { StoreGate } from "@/components/seller/store-gate";
import { StoreAvatar } from "@/components/store/store-avatar";
import { MiniChart } from "@/components/seller/mini-chart";

type Item = { id: string; name: string; slug?: string; img?: string; n?: number; stock?: number };
type A = {
  series: { d: string; views: number; orders: number; revenue: number }[];
  views: number; visitors: number; carts: number; wishlists: number; orders: number; paid_orders: number; revenue: number; net: number; to_ship: number;
  top_viewed: Item[]; top_sold: Item[]; low_stock: Item[];
  products: { active: number; draft: number; out: number };
  reviews: { n: number; avg: number; unanswered: number };
  activity: { kind: string; at: string; label: string; ref: number | null }[];
};
type Bal = { available: number; pending: number; to_receive: number; withdrawn: number };

const EVENT: Record<string, string> = { new: "Nova encomenda", confirmed: "Encomenda confirmada", preparing: "Em preparação", ready: "Pronta a enviar", shipped: "Saiu do armazém/loja", in_transit: "Em trânsito", delivered: "Entregue", cancelled: "Cancelada", returned: "Devolvida", payment_processing: "Pagamento em verificação", payment_confirmed: "Pagamento confirmado" };
const PAYOUT: Record<string, string> = { pending: "Liquidação pedida", in_review: "Liquidação em análise", approved: "Liquidação aprovada", processing: "Liquidação em processamento", paid: "Liquidação paga", rejected: "Liquidação rejeitada" };

function Kpi({ icon: I, label, value, hint }: { icon: typeof Eye; label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-xs text-ink/55"><span className="grid h-7 w-7 place-items-center rounded-full bg-ink/[0.05]"><I className="h-3.5 w-3.5 text-gold-700" /></span>{label}</div>
      <p className="mt-2 text-xl font-extrabold tracking-tight">{value}</p>
      {hint && <p className="text-[11px] text-ink/45">{hint}</p>}
    </div>
  );
}

function Rank({ title, items, unit, empty }: { title: string; items: Item[]; unit: string; empty: string }) {
  const max = Math.max(1, ...items.map((x) => Number(x.n ?? 0)));
  return (
    <div className="card p-4 text-sm">
      <p className="mb-2 font-bold">{title}</p>
      {items.length === 0 && <p className="text-xs text-ink/50">{empty}</p>}
      {items.map((x) => (
        <a key={x.id} href={`/vendedor/produtos/${x.id}`} className="flex items-center gap-2.5 border-t border-ink/5 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {x.img ? <img src={x.img} alt="" className="h-10 w-10 rounded-xl border border-ink/5 bg-white object-contain p-0.5" /> : <span className="h-10 w-10 rounded-xl bg-ink/5" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">{x.name}</p>
            <div className="mt-1 h-1.5 rounded-full bg-ink/5"><div className="h-full rounded-full bg-gradient-to-r from-gold-700 to-gold" style={{ width: `${(Number(x.n ?? 0) / max) * 100}%` }} /></div>
          </div>
          <span className="shrink-0 text-xs font-bold">{x.n} {unit}</span>
        </a>
      ))}
    </div>
  );
}

export default function SellerHome() {
  const { store } = useMyStore();
  const [days, setDays] = useState(30);
  const [a, setA] = useState<A | null>(null);
  const [bal, setBal] = useState<Bal | null>(null);
  const [metric, setMetric] = useState<"revenue" | "orders" | "views">("revenue");

  useEffect(() => {
    if (!store) return;
    const sb = supabaseBrowser();
    sb.rpc("store_analytics", { p_store: store.id, p_days: days }).then(({ data }) => setA(data as A));
    sb.rpc("store_balance", { p_store: store.id }).then(({ data }) => setBal(data as Bal));
  }, [store, days]);

  const conv = a && a.visitors > 0 ? `${((a.paid_orders / a.visitors) * 100).toFixed(1)}%` : "—";
  const ticket = a && a.paid_orders > 0 ? kz(a.revenue / a.paid_orders) : "—";
  const series = (a?.series ?? []).map((p) => ({ d: p.d, v: Number(p[metric]) }));
  const funnel: [string, number][] = a ? [["Visitas", a.views], ["Carrinho", a.carts], ["Encomendas", a.orders], ["Pagas", a.paid_orders]] : [];
  const fmax = Math.max(1, ...funnel.map((f) => f[1]));

  return (
    <div className="pt-5">
      <StoreGate store={store}>
        {store && (
          <>
            <div className="relative mb-4 overflow-hidden rounded-[28px] bg-ink p-5 text-white">
              <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-gold/25 blur-3xl" />
              <div className="relative flex items-center gap-3">
                <span className="rounded-[30%] bg-white p-0.5 ring-2 ring-gold/50"><StoreAvatar store={store} size={56} /></span>
                <div className="min-w-0 flex-1">
                  <p className="gold-text text-[10px] font-bold uppercase tracking-[0.3em]">Painel da loja</p>
                  <p className="truncate text-xl font-extrabold">{store.name}</p>
                  <p className="text-xs text-white/60">Comissão {store.commission_rate ?? 5}% · {a?.products.active ?? "…"} produtos activos</p>
                </div>
              </div>
              <div className="relative mt-4 grid grid-cols-3 gap-2">
                <a href="/vendedor/produtos/novo" className="flex flex-col items-center gap-1 rounded-2xl bg-white/10 py-3 text-[11px] font-semibold active:scale-95"><Plus className="h-5 w-5 text-gold" />Adicionar produto</a>
                <a href="/vendedor/produtos" className="flex flex-col items-center gap-1 rounded-2xl bg-white/10 py-3 text-[11px] font-semibold active:scale-95"><Package className="h-5 w-5 text-gold" />Editar produtos</a>
                {store.status === "approved"
                  ? <a href={`/loja/${store.slug}`} className="flex flex-col items-center gap-1 rounded-2xl bg-white/10 py-3 text-[11px] font-semibold active:scale-95"><ExternalLink className="h-5 w-5 text-gold" />Ver a minha loja</a>
                  : <a href="/vendedor/loja" className="flex flex-col items-center gap-1 rounded-2xl bg-white/10 py-3 text-[11px] font-semibold active:scale-95"><ExternalLink className="h-5 w-5 text-gold" />Perfil da loja</a>}
              </div>
            </div>
            <SellerNav />

            {a && (a.to_ship > 0 || a.low_stock.length > 0 || a.reviews.unanswered > 0) && (
              <div className="mb-4 flex flex-wrap gap-2 text-xs">
                {a.to_ship > 0 && <a href="/vendedor/encomendas" className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 font-semibold text-amber-900"><Truck className="h-3.5 w-3.5" />{a.to_ship} por enviar</a>}
                {a.low_stock.length > 0 && <a href="/vendedor/produtos" className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 font-semibold text-red-700"><AlertTriangle className="h-3.5 w-3.5" />{a.low_stock.length} com stock baixo</a>}
                {a.reviews.unanswered > 0 && <a href="/vendedor/avaliacoes" className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1.5 font-semibold text-sky-800"><MessageSquare className="h-3.5 w-3.5" />{a.reviews.unanswered} avaliações por responder</a>}
              </div>
            )}

            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="px-1 text-lg font-extrabold">Desempenho</p>
              <div className="flex rounded-full bg-ink/[0.05] p-1 text-xs font-semibold">
                {[7, 30, 90].map((d) => <button key={d} onClick={() => setDays(d)} className={`rounded-full px-3 py-1 transition ${days === d ? "bg-ink text-white" : "text-ink/60"}`}>{d} dias</button>)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-6">
              <Kpi icon={ShoppingBag} label="Vendas pagas" value={a ? kz(a.revenue) : "…"} hint={a ? `Líquido ${kz(a.net)}` : undefined} />
              <Kpi icon={Package} label="Encomendas" value={a ? String(a.orders) : "…"} hint={a ? `${a.paid_orders} pagas` : undefined} />
              <Kpi icon={Eye} label="Visitas a produtos" value={a ? String(a.views) : "…"} />
              <Kpi icon={Users} label="Visitantes" value={a ? String(a.visitors) : "…"} />
              <Kpi icon={Activity} label="Conversão" value={conv} hint="encomendas pagas / visitantes" />
              <Kpi icon={Star} label="Avaliação" value={a && a.reviews.n > 0 ? `${Number(a.reviews.avg).toFixed(1)} ★` : "—"} hint={a ? `${a.reviews.n} avaliações` : undefined} />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
              <div className="card p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-bold">Evolução</p>
                  <div className="flex gap-1 text-[11px] font-semibold">
                    {([["revenue", "Vendas"], ["orders", "Encomendas"], ["views", "Visitas"]] as const).map(([k, l]) => <button key={k} onClick={() => setMetric(k)} className={`rounded-full px-2.5 py-1 ${metric === k ? "bg-ink text-white" : "bg-ink/[0.05] text-ink/60"}`}>{l}</button>)}
                  </div>
                </div>
                {a ? <MiniChart key={metric + days} data={series} color={metric === "revenue" ? "#b9780a" : "#111113"} fill={metric === "revenue" ? "rgba(242,178,27,0.15)" : "rgba(17,17,19,0.07)"} format={metric === "revenue" ? kz : undefined} /> : <div className="skeleton h-36" />}
                <p className="mt-1 text-[11px] text-ink/45">Últimos {days} dias · dados reais da loja</p>
              </div>
              <div className="card p-4 text-sm">
                <p className="mb-3 font-bold">Funil de vendas</p>
                {funnel.map(([l, v]) => (
                  <div key={l} className="mb-2.5">
                    <div className="mb-1 flex justify-between text-xs"><span className="text-ink/60">{l}</span><b>{v}</b></div>
                    <div className="h-2.5 rounded-full bg-ink/5"><div className="h-full rounded-full bg-ink transition-all duration-700" style={{ width: `${Math.max(3, (v / fmax) * 100)}%` }} /></div>
                  </div>
                ))}
                <p className="mt-2 text-[11px] text-ink/45">Ticket médio: {ticket}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <Rank title="Mais vistos" items={a?.top_viewed ?? []} unit="visitas" empty="Ainda sem visitas registadas neste período." />
              <Rank title="Mais vendidos" items={a?.top_sold ?? []} unit="un." empty="Ainda sem vendas pagas neste período." />
              <div className="card p-4 text-sm">
                <p className="mb-2 font-bold">Stock baixo</p>
                {a?.low_stock.length === 0 && <p className="text-xs text-ink/50">Todos os produtos têm stock.</p>}
                {a?.low_stock.map((x) => <a key={x.id} href={`/vendedor/produtos/${x.id}`} className="flex justify-between gap-2 border-t border-ink/5 py-2"><span className="truncate text-[13px]">{x.name}</span><span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${x.stock === 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>{x.stock === 0 ? "Esgotado" : `${x.stock} un.`}</span></a>)}
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_2fr]">
              <a href="/vendedor/carteira" className="relative block overflow-hidden rounded-[1.6rem] bg-ink p-5 text-white active:scale-[0.99]">
                <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-gold/25 blur-2xl" />
                <p className="flex items-center gap-1.5 text-sm text-white/70"><Wallet className="h-4 w-4 text-gold" />Total a receber</p>
                <p className="text-3xl font-extrabold">{bal ? kz(bal.to_receive ?? 0) : "…"}</p>
                <p className="mt-2 text-xs text-white/70">Disponível {bal ? kz(bal.available) : "…"} · Pendente {bal ? kz(bal.pending) : "…"}</p>
                <p className="mt-3 text-xs font-semibold text-gold">Carteira e liquidações →</p>
              </a>
              <div className="card p-4 text-sm">
                <p className="mb-2 font-bold">Actividade recente</p>
                {a?.activity.length === 0 && <p className="text-xs text-ink/50">Sem actividade ainda.</p>}
                {a?.activity.slice(0, 10).map((e, k) => (
                  <div key={k} className="flex items-center gap-2.5 border-t border-ink/5 py-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink/[0.05]">{e.kind === "review" ? <Star className="h-3.5 w-3.5 text-gold-700" /> : e.kind === "payout" ? <Wallet className="h-3.5 w-3.5 text-gold-700" /> : <Package className="h-3.5 w-3.5 text-gold-700" />}</span>
                    <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium">{e.kind === "review" ? `Nova avaliação de ${e.label} ★` : e.kind === "payout" ? (PAYOUT[e.label] ?? e.label) : `${EVENT[e.label] ?? e.label}${e.ref ? ` · #${e.ref}` : ""}`}</p></div>
                    <span className="shrink-0 text-[11px] text-ink/45">{new Date(e.at).toLocaleString("pt-AO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </StoreGate>
    </div>
  );
}
