"use client";

import { sendServerPurchase } from "@/lib/tracking";

import { useCallback, useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { rpcError } from "@/lib/rpc-error";
import { PAY_METHOD, PAY_STATUS, SUB_STATUS, kz } from "@/lib/utils";
import { AdminShell } from "@/components/admin/admin-shell";

type Row = {
  id: string; number: number; total: number; payment_status: string; payment_method: string; payment_reference: string | null; payment_proof_url: string | null;
  contact_name: string; contact_phone: string; created_at: string;
  sub_orders: { id: string; status: string; subtotal: number; commission_amount: number; stores: { name: string } }[];
};
type Payout = { id: string; amount: number; status: string; iban: string; created_at: string; stores: { name: string } };
const FILTERS = ["awaiting_confirmation", "pending", "paid", "failed", "refunded"];

export default function AdminPayments() {
  const [filter, setFilter] = useState("awaiting_confirmation");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    const [o, p] = await Promise.all([
      sb.from("orders").select("*, sub_orders(id,status,subtotal,commission_amount,stores(name))").eq("payment_status", filter).order("created_at", { ascending: false }).limit(100),
      sb.from("payouts").select("*, stores(name)").eq("status", "requested").order("created_at"),
    ]);
    setRows((o.data as Row[]) ?? []); setPayouts((p.data as Payout[]) ?? []);
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  async function setPay(o: Row, status: string) {
    if (!confirm(`Marcar encomenda #${o.number} como "${PAY_STATUS[status]}"? Confirme que verificou o pagamento no banco.`)) return;
    const { error } = await supabaseBrowser().rpc("admin_set_payment", { p_order: o.id, p_status: status });
    if (!error && status === "paid") void sendServerPurchase(o.id);
    setMsg(error ? rpcError(error) : `#${o.number}: ${PAY_STATUS[status]}`); load();
  }
  async function setPayout(p: Payout, status: string) {
    const { error } = await supabaseBrowser().from("payouts").update({ status, processed_at: new Date().toISOString() }).eq("id", p.id);
    setMsg(error ? rpcError(error) : "Levantamento actualizado."); load();
  }

  return (
    <AdminShell>
      {payouts.length > 0 && (
        <div className="card mb-4 p-4 text-sm">
          <p className="mb-2 font-bold">Pedidos de levantamento</p>
          {payouts.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-2 border-t border-brand-100 py-2">
              <span className="flex-1">{p.stores.name} · {kz(p.amount)} · {p.iban}</span>
              <button onClick={() => setPayout(p, "paid")} className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">Marcar pago</button>
              <button onClick={() => setPayout(p, "rejected")} className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">Rejeitar</button>
            </div>
          ))}
        </div>
      )}
      <div className="no-scrollbar -mx-3 mb-3 flex gap-2 overflow-x-auto px-3">
        {FILTERS.map((f) => <button key={f} onClick={() => setFilter(f)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${filter === f ? "bg-brand-700 text-white" : "bg-white/80 text-brand-900"}`}>{PAY_STATUS[f]}</button>)}
      </div>
      {msg && <p className="mb-3 rounded-xl bg-brand-50 p-3 text-sm">{msg}</p>}
      {!rows ? <div className="skeleton h-40" /> : !rows.length ? <p className="card p-8 text-center text-sm text-ink/60">Sem encomendas neste estado.</p> : (
        <div className="space-y-3">
          {rows.map((o) => (
            <div key={o.id} className="card p-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-bold">#{o.number} · {kz(o.total)}</p>
                <p className="text-xs text-ink/55">{new Date(o.created_at).toLocaleString("pt-AO")} · {PAY_METHOD[o.payment_method]}</p>
              </div>
              <p className="text-xs text-ink/60">{o.contact_name} · {o.contact_phone}{o.payment_reference && <> · Ref. <b>{o.payment_reference}</b></>}</p>
              {o.payment_proof_url && <a href={o.payment_proof_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-600"><FileText className="h-3.5 w-3.5" />Ver comprovativo</a>}
              {o.sub_orders.map((s) => <p key={s.id} className="mt-1 text-xs text-ink/70">{s.stores.name}: {kz(s.subtotal)} · comissão {kz(s.commission_amount)} · {SUB_STATUS[s.status]}</p>)}
              <div className="mt-3 flex flex-wrap gap-2">
                {o.payment_status !== "paid" && <button onClick={() => setPay(o, "paid")} className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Confirmar pagamento</button>}
                {o.payment_status !== "failed" && o.payment_status !== "paid" && <button onClick={() => setPay(o, "failed")} className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700">Pagamento falhado</button>}
                {o.payment_status === "paid" && <button onClick={() => setPay(o, "refunded")} className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800">Reembolsado</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
