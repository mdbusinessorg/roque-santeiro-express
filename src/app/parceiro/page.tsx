"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Share2 } from "lucide-react";
import Link from "@/components/ui/native-link";
import { useAuth } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabase/client";
import { rpcError } from "@/lib/rpc-error";
import { kz } from "@/lib/utils";
import { shareLink } from "@/lib/native";

type Partner = { id: string; code: string; kind: string; status: string; display_name: string; iban: string | null; account_holder: string | null; bank_name: string | null };
type Comm = { id: string; order_number: number; sale_amount: number; platform_commission: number; rate: number; amount: number; status: string; created_at: string; note: string | null };
type Pay = { id: string; amount: number; method: string; reference: string; created_at: string };

const SITE = "https://roque-santeiro-express.netlify.app";
const ST: Record<string, [string, string]> = { pending: ["Pendente (aguarda entrega)", "bg-amber-100 text-amber-800"], approved: ["Aprovada", "bg-indigo-100 text-indigo-800"], paid: ["Paga", "bg-emerald-100 text-emerald-800"], reversed: ["Anulada", "bg-red-100 text-red-700"] };
const KIND: Record<string, string> = { affiliate: "Afiliado", agent: "Agente comercial", regional: "Representante regional" };

export default function PartnerDashboard() {
  const { user, loading } = useAuth();
  const [p, setP] = useState<Partner | null | undefined>(undefined);
  const [comms, setComms] = useState<Comm[]>([]);
  const [pays, setPays] = useState<Pay[]>([]);
  const [clicks, setClicks] = useState(0);
  const [bank, setBank] = useState({ iban: "", holder: "", bank: "" });
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const sb = supabaseBrowser();
    const { data } = await sb.from("partners").select("*").eq("user_id", user.id).maybeSingle();
    setP(data as Partner | null);
    if (!data) return;
    setBank({ iban: data.iban ?? "", holder: data.account_holder ?? "", bank: data.bank_name ?? "" });
    const [c, y, k] = await Promise.all([
      sb.from("partner_commissions").select("*").eq("partner_id", data.id).order("created_at", { ascending: false }),
      sb.from("partner_payments").select("*").eq("partner_id", data.id).order("created_at", { ascending: false }),
      sb.from("partner_clicks").select("id", { count: "exact", head: true }).eq("partner_id", data.id),
    ]);
    setComms((c.data as Comm[]) ?? []); setPays((y.data as Pay[]) ?? []); setClicks(k.count ?? 0);
  }, [user]);
  useEffect(() => { if (!loading && !user) location.href = "/entrar?next=/parceiro"; else load(); }, [loading, user, load]);

  async function saveBank(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabaseBrowser().rpc("partner_set_payout", { p_iban: bank.iban, p_holder: bank.holder, p_bank: bank.bank });
    setMsg(error ? rpcError(error) : "Dados de recebimento guardados.");
  }

  if (loading || p === undefined) return <div className="skeleton mt-6 h-60" />;
  if (!p) return <div className="card mx-auto mt-8 max-w-md p-8 text-center text-sm">Ainda não és parceiro.<br /><Link href="/partners" className="btn-primary mt-3 inline-flex px-6">Candidatar-me ao Roque Partners</Link></div>;

  const link = `${SITE}/?ref=${p.code}`;
  const sum = (s: string) => comms.filter((c) => c.status === s).reduce((a, c) => a + Number(c.amount), 0);
  const sales = comms.filter((c) => c.status !== "reversed");
  const orders = new Set(sales.map((c) => c.order_number)).size;

  return (
    <div className="pt-5">
      <div className="relative overflow-hidden rounded-[28px] bg-ink p-5 text-white">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/20 blur-3xl" />
        <p className="gold-text text-[11px] font-bold uppercase tracking-[0.3em]">Roque Partners · {KIND[p.kind]}</p>
        <h1 className="mt-1 text-2xl font-extrabold">{p.display_name}</h1>
        {p.status !== "active" && <p className="mt-2 rounded-xl bg-white/10 px-3 py-2 text-xs">{p.status === "pending" ? "Candidatura em análise. O link começa a contar quando for aprovada." : `Conta ${p.status === "suspended" ? "suspensa" : "rejeitada"}.`}</p>}
        <div className="mt-4 rounded-2xl bg-white/10 p-3">
          <p className="text-[11px] text-white/60">O teu link · código <b className="text-gold">{p.code}</b></p>
          <p className="truncate text-sm font-semibold">{link}</p>
          <div className="mt-2 flex gap-2">
            <button onClick={async () => { await navigator.clipboard.writeText(link); setMsg("Link copiado."); }} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink active:scale-95"><Copy className="h-3.5 w-3.5" />Copiar</button>
            <button onClick={() => shareLink("Roque Santeiro Express", link, "Compra no Roque Santeiro Express:")} className="inline-flex items-center gap-1 rounded-full bg-gold px-3 py-1.5 text-xs font-bold text-ink active:scale-95"><Share2 className="h-3.5 w-3.5" />Partilhar</button>
          </div>
          <p className="mt-2 text-[11px] text-white/50">Para um produto: junta <b>?ref={p.code}</b> ao link do produto.</p>
        </div>
      </div>
      {msg && <p className="mt-3 rounded-2xl bg-brand-50 p-3 text-sm">{msg}</p>}

      <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-6">
        {[["Visitas pelo link", String(clicks)], ["Encomendas atribuídas", String(orders)], ["Vendas atribuídas", kz(sales.reduce((a, c) => a + Number(c.sale_amount), 0))], ["Pendente", kz(sum("pending"))], ["Aprovado (a pagar)", kz(sum("approved"))], ["Já recebido", kz(sum("paid"))]].map(([l, v]) => (
          <div key={l} className="card p-4"><p className="text-xs text-ink/55">{l}</p><p className="mt-1 text-lg font-extrabold">{v}</p></div>
        ))}
      </div>

      <div className="card mt-4 p-4 text-sm">
        <p className="mb-2 font-bold">Vendas e comissões</p>
        {comms.length === 0 && <p className="text-xs text-ink/50">Ainda sem vendas. A comissão aparece quando uma compra feita pelo teu link é paga.</p>}
        {comms.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-2 border-t border-ink/5 py-2">
            <div className="min-w-0"><p className="font-medium">Encomenda #{c.order_number} · venda {kz(c.sale_amount)}</p><p className="text-[11px] text-ink/50">{new Date(c.created_at).toLocaleDateString("pt-AO")} · {Math.round(c.rate * 100)}% de {kz(c.platform_commission)} de comissão{c.note ? ` · ${c.note}` : ""}</p></div>
            <div className="shrink-0 text-right"><p className="font-bold">{kz(c.amount)}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ST[c.status][1]}`}>{ST[c.status][0]}</span></div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card p-4 text-sm">
          <p className="mb-2 font-bold">Histórico de pagamentos</p>
          {pays.length === 0 && <p className="text-xs text-ink/50">Sem pagamentos.</p>}
          {pays.map((y) => <div key={y.id} className="flex justify-between border-t border-ink/5 py-2"><span>{new Date(y.created_at).toLocaleDateString("pt-AO")} · {y.method} · ref. {y.reference}</span><b>{kz(y.amount)}</b></div>)}
        </div>
        <form onSubmit={saveBank} className="card space-y-2 p-4 text-sm">
          <p className="font-bold">Dados de recebimento</p>
          <input value={bank.holder} onChange={(e) => setBank({ ...bank, holder: e.target.value })} placeholder="Titular da conta" className="input" />
          <input value={bank.bank} onChange={(e) => setBank({ ...bank, bank: e.target.value })} placeholder="Banco" className="input" />
          <input value={bank.iban} onChange={(e) => setBank({ ...bank, iban: e.target.value })} placeholder="IBAN" className="input" />
          <button className="btn-primary w-full">Guardar</button>
        </form>
      </div>
    </div>
 
  );
}
