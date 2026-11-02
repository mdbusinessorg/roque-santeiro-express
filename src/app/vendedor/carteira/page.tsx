"use client";

import { useCallback, useEffect, useState } from "react";
import { Info, Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { rpcError } from "@/lib/rpc-error";
import { kz } from "@/lib/utils";
import { useMyStore } from "@/components/seller/use-my-store";
import { SellerNav } from "@/components/seller/seller-nav";
import { StoreGate } from "@/components/seller/store-gate";

type Bal = { pending: number; available: number; reserved: number; in_payout: number; withdrawn: number; to_receive: number };
type Payout = { id: string; amount: number; status: string; iban: string; account_holder: string | null; bank_name: string | null; provider_reference: string | null; rejection_reason: string | null; created_at: string; processed_at: string | null };
type Entry = { id: number; created_at: string; entry_type: string; account: string; amount: number; memo: string | null; order_id: string | null };

const PAYOUT_STATUS: Record<string, [string, string]> = {
  pending: ["Pendente", "bg-amber-100 text-amber-800"], in_review: ["Em análise", "bg-sky-100 text-sky-800"],
  approved: ["Aprovado", "bg-indigo-100 text-indigo-800"], processing: ["Em processamento", "bg-violet-100 text-violet-800"],
  paid: ["Pago", "bg-emerald-100 text-emerald-800"], rejected: ["Rejeitado", "bg-red-100 text-red-700"],
};
const ENTRY: Record<string, string> = {
  seller_credit: "Venda (aguarda entrega)", shipping_fee: "Portes", release_to_available: "Entrega concluída", reserve: "Reserva", reserve_release: "Reserva libertada",
  refund: "Reembolso", adjustment: "Ajuste", payout_requested: "Pedido de liquidação", payout_paid: "Liquidação paga", payout_rejected: "Liquidação rejeitada",
};
const ACCOUNT: Record<string, string> = { seller_pending: "Pendente", seller_available: "Disponível", seller_reserved: "Reservado", seller_payout_hold: "Em liquidação", seller_paid: "Recebido" };

export default function SellerWallet() {
  const { store } = useMyStore("/vendedor/carteira");
  const [bal, setBal] = useState<Bal | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [mode, setMode] = useState<{ mode?: string; min_amount?: number }>({});
  const [form, setForm] = useState({ amount: "", iban: "", holder: "", bank: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (id: string) => {
    const sb = supabaseBrowser();
    const [b, p, e, s] = await Promise.all([
      sb.rpc("store_balance", { p_store: id }),
      sb.from("payouts").select("*").eq("store_id", id).order("created_at", { ascending: false }),
      sb.from("ledger_entries").select("id,created_at,entry_type,account,amount,memo,order_id").eq("store_id", id).like("account", "seller_%").order("id", { ascending: false }).limit(200),
      sb.from("settings").select("value").eq("key", "payout_mode").maybeSingle(),
    ]);
    setBal(b.data as Bal); setPayouts((p.data as Payout[]) ?? []); setEntries((e.data as Entry[]) ?? []);
    setMode((s.data?.value as typeof mode) ?? {});
    const last = (p.data as Payout[] | null)?.[0];
    if (last) setForm((f) => ({ ...f, iban: f.iban || last.iban, holder: f.holder || last.account_holder || "", bank: f.bank || last.bank_name || "" }));
  }, []);
  useEffect(() => { if (store) load(store.id); }, [store, load]);

  async function request(e: React.FormEvent) {
    e.preventDefault(); if (!store) return;
    setBusy(true); setMsg(null);
    const { error } = await supabaseBrowser().rpc("request_payout", { p_store: store.id, p_amount: Number(form.amount), p_iban: form.iban.trim(), p_holder: form.holder.trim(), p_bank: form.bank.trim() });
    setBusy(false);
    if (error) setMsg(rpcError(error)); else { setMsg("Pedido de liquidação enviado. Fica Pendente até a equipa analisar."); setForm((f) => ({ ...f, amount: "" })); load(store.id); }
  }

  const enabled = mode.mode && mode.mode !== "disabled";
  const min = Number(mode.min_amount ?? 0);
  const canRequest = enabled && bal && bal.available > 0 && bal.available >= min;

  return (
    <div className="pt-5">
      <StoreGate store={store}>
        <SellerNav />
        <h1 className="mb-3 px-1 text-xl font-extrabold tracking-tight">Carteira e liquidações</h1>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <div className="col-span-2 rounded-[1.6rem] bg-[#0d0d0f] p-5 text-white lg:col-span-1">
            <p className="text-sm text-white/70">Total a receber</p>
            <p className="gold-text text-3xl font-extrabold">{bal ? kz(bal.to_receive) : "…"}</p>
            {bal && (bal.reserved > 0 || bal.in_payout > 0) && <p className="mt-1 text-xs text-white/60">Reservado {kz(bal.reserved)} · Em liquidação {kz(bal.in_payout)}</p>}
          </div>
          {[["Saldo pendente", bal?.pending, "Pago pelo cliente, aguarda entrega"], ["Disponível para liquidação", bal?.available, "Entregue e sem disputa"], ["Total já recebido", bal?.withdrawn, "Transferências confirmadas"]].map(([l, v, h]) => (
            <div key={l as string} className="card p-4"><p className="text-xs text-ink/55">{l}</p><p className="mt-1 text-lg font-extrabold">{v === undefined ? "…" : kz(Number(v))}</p><p className="text-[11px] text-ink/45">{h}</p></div>
          ))}
        </div>
        <p className="mt-3 flex gap-2 rounded-2xl bg-ink/[0.04] p-3 text-xs text-ink/65"><Info className="h-4 w-4 shrink-0" />Estes valores são um registo contabilístico da Roque Santeiro, não uma conta bancária nem dinheiro electrónico. O dinheiro só chega a si quando a transferência é feita e confirmada pelo banco/prestador de pagamentos.</p>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <form onSubmit={request} className="card space-y-2 p-4">
            <p className="font-bold">Pedir liquidação</p>
            <p className="text-xs text-ink/55">Dados de recebimento</p>
            <input required value={form.holder} onChange={(e) => setForm({ ...form, holder: e.target.value })} placeholder="Titular da conta" className="input" />
            <div className="grid grid-cols-2 gap-2">
              <input value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} placeholder="Banco" className="input" />
              <input required inputMode="numeric" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Valor (Kz)" className="input" />
            </div>
            <input required value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} placeholder="IBAN AO06…" className="input" />
            {!enabled && <p className="text-xs text-amber-700">As liquidações ainda não estão activas no modelo de pagamento contratado.</p>}
            {enabled && !canRequest && <p className="text-xs text-ink/55">Ainda não há valores elegíveis{min ? ` (mínimo ${kz(min)})` : ""}.</p>}
            {msg && <p className="text-sm text-brand-800">{msg}</p>}
            <button disabled={busy || !canRequest} className="btn-primary w-full disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Pedir liquidação</button>
          </form>
          <div className="card p-4 text-sm">
            <p className="mb-2 font-bold">Histórico de liquidações</p>
            {payouts.length === 0 && <p className="text-xs text-ink/50">Sem pedidos.</p>}
            {payouts.map((p) => {
              const [l, c] = PAYOUT_STATUS[p.status] ?? [p.status, ""];
              return (
                <div key={p.id} className="border-t border-ink/5 py-2">
                  <div className="flex items-center justify-between gap-2"><span>{new Date(p.created_at).toLocaleDateString("pt-AO")}</span><b>{kz(p.amount)}</b><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c}`}>{l}</span></div>
                  {p.provider_reference && <p className="text-[11px] text-ink/50">Ref. transferência: {p.provider_reference}</p>}
                  {p.rejection_reason && <p className="text-[11px] text-red-600">Motivo: {p.rejection_reason}</p>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card mt-4 p-4 text-sm">
          <p className="mb-2 font-bold">Histórico de movimentos</p>
          {entries.length === 0 && <p className="text-xs text-ink/50">Sem movimentos. Aparecem quando um pagamento é confirmado.</p>}
          {entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-2 border-t border-ink/5 py-2">
              <div className="min-w-0"><p className="truncate font-medium">{ENTRY[e.entry_type] ?? e.entry_type}</p><p className="text-[11px] text-ink/50">{new Date(e.created_at).toLocaleString("pt-AO")} · {ACCOUNT[e.account] ?? e.account}{e.memo ? ` · ${e.memo}` : ""}</p></div>
              <span className={`shrink-0 font-bold ${Number(e.amount) < 0 ? "text-red-600" : "text-emerald-700"}`}>{Number(e.amount) > 0 ? "+" : ""}{kz(Number(e.amount))}</span>
            </div>
          ))}
        </div>
      </StoreGate>
    </div>
  );
}
