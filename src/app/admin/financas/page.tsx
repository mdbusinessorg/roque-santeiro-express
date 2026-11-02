"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "@/components/ui/native-link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { rpcError } from "@/lib/rpc-error";
import { kz } from "@/lib/utils";
import { AdminShell } from "@/components/admin/admin-shell";

type Summary = Record<string, number> & { diffs: { id: string; number: number; total: number; ledger: number; gateway: number | null; split: number; payment_status: string }[] };
type Payout = { id: string; amount: number; status: string; iban: string; account_holder: string | null; bank_name: string | null; created_at: string; stores: { name: string } };
type Entry = { id: number; created_at: string; entry_type: string; account: string; amount: number; memo: string | null; idempotency_key: string; order_id: string | null; payout_id: string | null; stores: { name: string } | null; orders: { number: number } | null };
type Sub = { id: string; seller_net: number; commission_amount: number; shipping_fee: number; status: string; stores: { name: string } };
type Store = { id: string; name: string };

const STATUS: Record<string, string> = { pending: "Pendente", in_review: "Em análise", approved: "Aprovado", processing: "Em processamento", paid: "Pago", rejected: "Rejeitado" };
const NEXT: Record<string, string[]> = { pending: ["in_review", "approved", "rejected"], in_review: ["approved", "rejected"], approved: ["processing", "rejected"], processing: ["paid", "rejected"] };
const CARDS: [string, string][] = [["received", "Recebido (pagamentos confirmados)"], ["attributed", "Atribuído aos vendedores"], ["commissions", "Comissões da plataforma"], ["shipping", "Portes da plataforma"],
  ["pending", "Vendedores: pendente"], ["available", "Vendedores: disponível"], ["reserved", "Reservado / disputa"], ["in_payout", "Em liquidação"], ["paid_out", "Liquidado (transferido)"], ["refunds", "Reembolsos"], ["cash", "Saldo no prestador (ledger)"], ["gateway_charges", "Confirmado pelo gateway"]];

export default function AdminFinance() {
  const [sum, setSum] = useState<Summary | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [mode, setMode] = useState<{ mode?: string; min_amount?: number }>({});
  const [q, setQ] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [subs, setSubs] = useState<Sub[] | null>(null);
  const [adj, setAdj] = useState({ store: "", amount: "", memo: "", kind: "adjust" });
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    const [s, p, e, st, m] = await Promise.all([
      sb.rpc("admin_finance_summary"),
      sb.from("payouts").select("*, stores(name)").not("status", "in", "(paid,rejected)").order("created_at"),
      sb.from("ledger_entries").select("*, stores(name), orders(number)").order("id", { ascending: false }).limit(300),
      sb.from("stores").select("id,name").order("name"),
      sb.from("settings").select("value").eq("key", "payout_mode").maybeSingle(),
    ]);
    if (s.error) setMsg(rpcError(s.error));
    setSum(s.data as Summary); setPayouts((p.data as Payout[]) ?? []); setEntries((e.data as Entry[]) ?? []); setStores((st.data as Store[]) ?? []);
    setMode((m.data?.value as typeof mode) ?? {});
  }, []);
  useEffect(() => { load(); }, [load]);

  async function run(fn: string, args: Record<string, unknown>, ok: string) {
    setMsg(null);
    const { error } = await supabaseBrowser().rpc(fn, args);
    if (error) setMsg(rpcError(error)); else { setMsg(ok); load(); }
    return !error;
  }
  function payout(p: Payout, status: string) {
    let ref: string | null = null, note: string | null = null;
    if (status === "paid") { ref = prompt("Referência da transferência confirmada pelo banco/prestador:"); if (!ref) return; }
    if (status === "rejected") { note = prompt("Motivo da rejeição:"); if (!note) return; }
    run("admin_set_payout_status", { p_payout: p.id, p_status: status, p_reference: ref, p_note: note }, `Liquidação: ${STATUS[status]}`);
  }
  async function findOrder(e: React.FormEvent) {
    e.preventDefault();
    const { data } = await supabaseBrowser().from("orders").select("id, sub_orders(id,seller_net,commission_amount,shipping_fee,status,stores(name))").eq("number", Number(orderNo)).maybeSingle();
    setSubs(((data?.sub_orders as Sub[] | undefined) ?? []));
  }
  function refund(s: Sub) {
    const reason = prompt(`Motivo do reembolso de ${kz(Number(s.seller_net) + Number(s.commission_amount) + Number(s.shipping_fee))} (${s.stores.name}):`);
    if (reason) run("admin_refund_sub", { p_sub: s.id, p_reason: reason }, "Reembolso registado no ledger. Execute a devolução real no banco/prestador.").then(() => setSubs(null));
  }
  async function adjust(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(adj.amount);
    const ok = adj.kind === "adjust"
      ? await run("admin_ledger_adjust", { p_store: adj.store, p_amount: amount, p_memo: adj.memo }, "Ajuste registado.")
      : await run("admin_reserve", { p_store: adj.store, p_amount: amount, p_memo: adj.memo, p_release: adj.kind === "release" }, adj.kind === "release" ? "Reserva libertada." : "Valor reservado.");
    if (ok) setAdj({ ...adj, amount: "", memo: "" });
  }
  async function saveMode(next: string) {
    const { error } = await supabaseBrowser().from("settings").upsert({ key: "payout_mode", value: { ...mode, mode: next } });
    if (error) setMsg(rpcError(error)); else load();
  }

  const shown = entries.filter((x) => !q || String(x.orders?.number ?? "").includes(q) || (x.stores?.name ?? "").toLowerCase().includes(q.toLowerCase()) || x.idempotency_key.includes(q));

  return (
    <AdminShell>
      {msg && <p className="mb-3 rounded-2xl bg-brand-50 p-3 text-sm text-brand-900">{msg}</p>}
      <p className="mb-3 rounded-2xl bg-ink/[0.04] p-3 text-xs text-ink/65">Ledger contabilístico interno. A Roque Santeiro não guarda dinheiro de terceiros: os valores são movimentados pelo banco/prestador de pagamentos. Uma liquidação só passa a &quot;Pago&quot; com a referência real da transferência.</p>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {CARDS.map(([k, l]) => <div key={k} className="card p-4"><p className="text-xs text-ink/55">{l}</p><p className="mt-1 text-lg font-extrabold">{sum ? kz(Number(sum[k] ?? 0)) : "…"}</p></div>)}
      </div>

      <div className="card mt-4 p-4 text-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="font-bold">Pedidos de liquidação ({payouts.length})</p>
          <label className="flex items-center gap-2 text-xs">Modelo contratado:
            <select value={mode.mode ?? "disabled"} onChange={(e) => saveMode(e.target.value)} className="input h-8 py-0 text-xs">
              <option value="bank_transfer_manual">Transferência bancária confirmada</option>
              <option value="disabled">Liquidações desactivadas</option>
            </select>
          </label>
        </div>
        {payouts.length === 0 && <p className="text-xs text-ink/50">Sem pedidos em aberto.</p>}
        {payouts.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-2 border-t border-ink/5 py-2">
            <div className="min-w-0 flex-1"><p className="font-semibold">{p.stores.name} · {kz(p.amount)}</p><p className="text-[11px] text-ink/50">{new Date(p.created_at).toLocaleString("pt-AO")} · {p.account_holder ?? "—"} · {p.bank_name ?? ""} {p.iban}</p></div>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{STATUS[p.status]}</span>
            {(NEXT[p.status] ?? []).map((s) => <button key={s} onClick={() => payout(p, s)} className={`rounded-full px-3 py-1 text-xs font-semibold ${s === "rejected" ? "bg-red-100 text-red-700" : s === "paid" ? "bg-emerald-600 text-white" : "bg-ink text-white"}`}>{STATUS[s]}</button>)}
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <form onSubmit={findOrder} className="card space-y-2 p-4 text-sm">
          <p className="font-bold">Reembolso por subencomenda</p>
          <div className="flex gap-2"><input required inputMode="numeric" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} placeholder="N.º da encomenda" className="input" /><button className="btn-ghost px-4">Procurar</button></div>
          {subs?.length === 0 && <p className="text-xs text-ink/50">Encomenda não encontrada.</p>}
          {subs?.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 border-t border-ink/5 pt-2">
              <span>{s.stores.name} · {kz(Number(s.seller_net) + Number(s.commission_amount) + Number(s.shipping_fee))}</span>
              <button type="button" onClick={() => refund(s)} className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">Reembolsar</button>
            </div>
          ))}
        </form>
        <form onSubmit={adjust} className="card space-y-2 p-4 text-sm">
          <p className="font-bold">Ajuste ou reserva</p>
          <select required value={adj.store} onChange={(e) => setAdj({ ...adj, store: e.target.value })} className="input"><option value="">Loja…</option>{stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <div className="grid grid-cols-2 gap-2">
            <select value={adj.kind} onChange={(e) => setAdj({ ...adj, kind: e.target.value })} className="input"><option value="adjust">Ajuste (+/−)</option><option value="reserve">Reservar</option><option value="release">Libertar reserva</option></select>
            <input required inputMode="decimal" value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })} placeholder="Valor (Kz)" className="input" />
          </div>
          <input required value={adj.memo} onChange={(e) => setAdj({ ...adj, memo: e.target.value })} placeholder="Motivo (fica no registo)" className="input" />
          <button className="btn-primary w-full">Registar movimento</button>
        </form>
      </div>

      <div className="card mt-4 p-4 text-sm">
        <p className="mb-2 font-bold">Reconciliação</p>
        {sum && sum.diffs.length === 0 && <p className="text-xs text-emerald-700">Sem diferenças entre encomendas, ledger e gateway.</p>}
        {sum?.diffs.map((d) => (
          <div key={d.id} className="flex flex-wrap justify-between gap-2 border-t border-ink/5 py-2 text-xs">
            <Link href={`/conta/encomendas/${d.id}`} className="font-semibold underline">#{d.number}</Link>
            <span>Total {kz(d.total)}</span><span>Ledger {kz(d.ledger)}</span><span>Gateway {d.gateway === null ? "—" : kz(d.gateway)}</span><span>Divisão {kz(d.split)}</span>
          </div>
        ))}
      </div>

      <div className="card mt-4 p-4 text-sm">
        <div className="mb-2 flex items-center justify-between gap-2"><p className="font-bold">Operações (origem)</p><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="N.º encomenda, loja ou chave" className="input h-9 max-w-56 text-xs" /></div>
        {shown.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-2 border-t border-ink/5 py-1.5 text-xs">
            <div className="min-w-0"><p className="truncate font-medium">{e.entry_type} · {e.account}{e.stores ? ` · ${e.stores.name}` : ""}</p>
              <p className="truncate text-[11px] text-ink/50">{new Date(e.created_at).toLocaleString("pt-AO")}{e.orders ? ` · encomenda #${e.orders.number}` : ""}{e.payout_id ? " · liquidação" : ""} · {e.idempotency_key}{e.memo ? ` · ${e.memo}` : ""}</p></div>
            <span className={`shrink-0 font-bold ${Number(e.amount) < 0 ? "text-red-600" : "text-emerald-700"}`}>{kz(Number(e.amount))}</span>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
