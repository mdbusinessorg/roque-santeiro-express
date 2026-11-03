"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Eye, Plus, Star, Users } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { kz } from "@/lib/utils";
import { useAuth, isStaff } from "@/lib/auth";
import { useMyStore } from "@/components/seller/use-my-store";
import { StoreGate } from "@/components/seller/store-gate";
import { StoreAvatar } from "@/components/store/store-avatar";
import { MiniChart } from "@/components/seller/mini-chart";
import { BarPills } from "@/components/seller/bar-pills";
import { DashShell, Panel, CornerLink } from "@/components/seller/dash-shell";
import type { Store } from "@/lib/types";

type Item = { id: string; name: string; img?: string; n?: number; stock?: number };
type A = {
  series: { d: string; views: number; orders: number; revenue: number }[];
  views: number; visitors: number; carts: number; orders: number; paid_orders: number; revenue: number; net: number; to_ship: number;
  top_viewed: Item[]; top_sold: Item[]; low_stock: Item[];
  products: { active: number; draft: number; out: number };
  reviews: { n: number; avg: number; unanswered: number };
};
type Bal = { available: number; pending: number; to_receive: number; withdrawn: number };
type Row = { id: string; created_at: string; status: string; subtotal: number; orders: { number: number; contact_name: string; payment_status: string } | null; order_items: { name: string; image: string | null }[] };

const ST: Record<string, [string, string]> = { new: ["Nova", "bg-sky-500"], confirmed: ["Confirmada", "bg-sky-500"], preparing: ["Em preparação", "bg-amber-500"], ready: ["Pronta", "bg-amber-500"], shipped: ["Enviada", "bg-violet-500"], in_transit: ["Em trânsito", "bg-violet-500"], delivered: ["Entregue", "bg-emerald-500"], cancelled: ["Cancelada", "bg-red-500"], returned: ["Devolvida", "bg-red-500"] };
const MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const DAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function pct(cur: number, prev: number) { return prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null; }
function Badge({ v }: { v: number | null }) {
  if (v === null) return null;
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${v >= 0 ? "bg-ink text-gold" : "bg-red-100 text-red-700"}`}>{v >= 0 ? "+" : ""}{v}%</span>;
}

export default function SellerHome() {
  const { profile } = useAuth();
  const { store: mine } = useMyStore();
  const staff = isStaff(profile?.role);
  const [stores, setStores] = useState<Store[]>([]);
  const [pick, setPick] = useState<string>("");
  const [mode, setMode] = useState<"month" | "week">("month");
  const [a, setA] = useState<A | null>(null);
  const [bal, setBal] = useState<Bal | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => { if (staff) supabaseBrowser().from("stores").select("*").order("name").then(({ data }) => setStores((data as Store[]) ?? [])); }, [staff]);
  const store = ((pick && stores.find((s) => s.id === pick)) || mine) as Store | null | undefined;

  useEffect(() => {
    if (!store) return;
    const sb = supabaseBrowser();
    sb.rpc("store_analytics", { p_store: store.id, p_days: mode === "month" ? 180 : 14 }).then(({ data }) => setA(data as A));
    sb.rpc("store_balance", { p_store: store.id }).then(({ data }) => setBal(data as Bal));
    sb.from("sub_orders").select("id,created_at,status,subtotal,orders(number,contact_name,payment_status),order_items(name)").eq("store_id", store.id).order("created_at", { ascending: false }).limit(6).then(({ data }) => setRows((data as unknown as Row[]) ?? []));
  }, [store, mode]);

  const bars = useMemo(() => {
    const s = a?.series ?? [];
    if (mode === "week") return s.slice(-7).map((p) => ({ label: DAYS[new Date(p.d).getDay()], v: p.views }));
    const m = new Map<string, number>();
    s.forEach((p) => { const k = p.d.slice(0, 7); m.set(k, (m.get(k) ?? 0) + p.views); });
    return [...m.entries()].slice(-6).map(([k, v]) => ({ label: MONTHS[Number(k.slice(5, 7)) - 1], v }));
  }, [a, mode]);
  const rev = (a?.series ?? []).slice(-30).map((p) => ({ d: p.d, v: Number(p.revenue) }));
  const s14 = (a?.series ?? []).slice(-14);
  const week = s14.slice(-7).reduce((x, p) => x + Number(p.revenue), 0);
  const prevWeek = s14.slice(0, 7).reduce((x, p) => x + Number(p.revenue), 0);
  const conv = a && a.visitors > 0 ? (a.paid_orders / a.visitors) * 100 : 0;
  const first = (profile?.full_name ?? "").split(" ")[0];
  const today = new Date();
  const from = new Date(Date.now() - (mode === "month" ? 179 : 13) * 864e5);
  const fmt = (d: Date) => d.toLocaleDateString("pt-AO", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="pt-2">
      <StoreGate store={store ?? null}>
        {store && (
          <DashShell storeSlug={store.status === "approved" ? store.slug : undefined}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h1 className="text-[26px] font-medium leading-tight tracking-tight text-ink sm:text-4xl">Bem-vindo de volta, <span className="text-ink/45">{first || "vendedor"}</span></h1>
              <div className="flex flex-wrap gap-2">
                {staff && stores.length > 0 && (
                  <select value={store.id} onChange={(e) => setPick(e.target.value)} className="h-10 rounded-full bg-white px-4 text-[13px] font-medium shadow-sm outline-none">
                    {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
                <span className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-medium"><CalendarDays className="h-4 w-4" />{fmt(from)} - {fmt(today)}</span>
                <a href="/vendedor/produtos/novo" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-semibold active:scale-95"><Plus className="h-4 w-4" />Adicionar produto</a>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1.55fr_1fr]">
              <div className="flex flex-col gap-4">
                <Panel title="Saldo da loja" subtitle="Total a receber" action={<CornerLink href="/vendedor/carteira" label="Carteira" />}>
                  <div className="relative overflow-hidden rounded-[22px] bg-ink p-5 text-white">
                    <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-gold/25 blur-2xl" />
                    <div className="relative flex items-center justify-between"><span className="flex items-center gap-2"><StoreAvatar store={store} size={28} /><b className="gold-text text-sm tracking-wide">{store.name}</b></span><svg viewBox="0 0 24 24" className="h-5 w-5 text-white/70" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8.5 16.5a6 6 0 0 0 0-9M12 19a9.5 9.5 0 0 0 0-14M15.5 21.5a13 13 0 0 0 0-19" /></svg></div>
                    <p className="relative mt-4 text-xs text-white/60">Conta contabilística</p>
                    <p className="relative text-[28px] font-semibold tracking-tight">{bal ? kz(bal.to_receive ?? 0) : "…"}</p>
                    <div className="relative mt-3 flex justify-between text-[11px] text-white/70"><span>Disponível {bal ? kz(bal.available) : "…"}</span><span>Comissão {store.commission_rate ?? 5}%</span></div>
                  </div>
                </Panel>
                <Panel>
                  <p className="text-xs text-ink/55">Vendas desta semana</p>
                  <div className="mt-1 flex items-center justify-between gap-2"><p className="text-[26px] font-semibold tracking-tight">{kz(week)}</p><Badge v={pct(week, prevWeek)} /></div>
                </Panel>
              </div>

              <Panel title={<span className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#f2f2f3]"><Eye className="h-4 w-4" /></span>Visitas à loja</span>}
                action={<div className="flex items-center gap-2"><div className="flex rounded-full bg-[#f2f2f3] p-1 text-[12px] font-medium">{(["week", "month"] as const).map((m) => <button key={m} onClick={() => setMode(m)} className={`rounded-full px-3 py-1.5 transition ${mode === m ? "bg-ink text-white" : "text-ink/55"}`}>{m === "week" ? "Semanal" : "Mensal"}</button>)}</div><CornerLink href="#estatisticas" label="Estatísticas" /></div>}>
                {a ? <BarPills data={bars} /> : <div className="skeleton h-56" />}
              </Panel>

              <div className="flex flex-col gap-4">
                <Panel title="Vendas pagas" subtitle="Últimos 30 dias" action={<CornerLink href="/vendedor/encomendas" label="Encomendas" />} className="overflow-hidden">
                  <p className="text-center text-xs text-ink/50">Total vendido</p>
                  <p className="text-center text-[28px] font-semibold tracking-tight">{a ? kz(a.revenue) : "…"}</p>
                  <div className="-mx-5 -mb-5 mt-2">{a ? <MiniChart data={rev} color="#b9780a" fill="rgba(242,178,27,0.18)" height={120} /> : <div className="skeleton h-28" />}</div>
                </Panel>
                <Panel title="Conversão" subtitle="Encomendas pagas por visitante" action={<span className="grid h-10 w-10 place-items-center rounded-full bg-[#f2f2f3]"><Users className="h-4 w-4" /></span>}>
                  <div className="flex items-center gap-2"><p className="text-[30px] font-semibold tracking-tight">{conv.toFixed(1)}<span className="text-ink/40">%</span></p></div>
                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-[20px] bg-[#f2f2f3] p-3 text-center text-[11px] text-ink/55">
                    <div><b className="block text-base text-ink">{a?.visitors ?? "…"}</b>visitantes</div>
                    <div><b className="block text-base text-ink">{a?.orders ?? "…"}</b>encomendas</div>
                    <div><b className="flex items-center justify-center gap-0.5 text-base text-ink">{a && a.reviews.n ? Number(a.reviews.avg).toFixed(1) : "—"}<Star className="h-3.5 w-3.5 fill-gold text-gold" /></b>{a?.reviews.n ?? 0} aval.</div>
                  </div>
                </Panel>
              </div>
            </div>

            <div id="estatisticas" className="mt-4 grid gap-4 lg:grid-cols-[2.55fr_1fr]">
              <Panel title="Histórico de encomendas" subtitle="Encomendas recentes da loja" action={<CornerLink href="/vendedor/encomendas" label="Encomendas" />}>
                {rows.length === 0 && <p className="py-6 text-center text-xs text-ink/50">Ainda sem encomendas.</p>}
                {rows.length > 0 && (
                  <div className="-mx-2 overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-[13px]">
                      <thead className="text-[11px] text-ink/45"><tr><th className="px-2 py-2 font-medium">Produto</th><th className="px-2 font-medium">Data</th><th className="px-2 font-medium">Hora</th><th className="px-2 font-medium">Estado</th><th className="px-2 text-right font-medium">Valor</th></tr></thead>
                      <tbody>
                        {rows.map((r, i) => {
                          const d = new Date(r.created_at); const st = ST[r.status] ?? [r.status, "bg-ink/40"];
                          return (
                            <tr key={r.id} className={i % 2 ? "bg-[#f6f6f7]" : ""}>
                              <td className="rounded-l-2xl px-2 py-2.5"><p className="max-w-[200px] truncate font-medium">{r.order_items?.[0]?.name ?? "Encomenda"}</p><p className="text-[11px] text-ink/45">#{r.orders?.number} · {r.orders?.contact_name}</p></td>
                              <td className="px-2">{d.toLocaleDateString("pt-AO", { day: "2-digit", month: "short", year: "numeric" })}</td>
                              <td className="px-2">{d.toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" })}</td>
                              <td className="px-2"><span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5"><span className={`h-1.5 w-1.5 rounded-full ${st[1]}`} />{st[0]}</span></td>
                              <td className="rounded-r-2xl px-2 text-right font-semibold">{kz(r.subtotal)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
              <Panel title="Produtos" subtitle={a ? `${a.products.active} activos · ${a.products.out} esgotados` : "…"} action={<CornerLink href="/vendedor/produtos" label="Produtos" />}>
                <p className="text-xs text-ink/50">Mais vistos</p>
                <div className="mt-2 flex items-center">
                  {(a?.top_viewed.length ? a.top_viewed : a?.top_sold ?? []).slice(0, 4).map((x, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={x.id} src={x.img} alt={x.name} title={x.name} className="h-12 w-12 rounded-full border-2 border-white bg-white object-contain p-1 shadow-sm" style={{ marginLeft: i ? -10 : 0 }} />
                  ))}
                  <a href="/vendedor/produtos" className="-ml-2 grid h-12 w-12 place-items-center rounded-full border-2 border-white bg-ink text-sm font-bold text-gold">+{a?.products.active ?? 0}</a>
                </div>
                {a && a.low_stock.length > 0 && <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-[12px] text-amber-900">{a.low_stock.length} produto(s) com stock baixo</p>}
                {a && a.to_ship > 0 && <a href="/vendedor/encomendas" className="mt-2 block rounded-2xl bg-sky-50 px-3 py-2 text-[12px] text-sky-900">{a.to_ship} encomenda(s) por enviar →</a>}
              </Panel>
            </div>
          </DashShell>
        )}
      </StoreGate>
    </div>
  );
}
