"use client";

import { useCallback, useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { rpcError } from "@/lib/rpc-error";
import { DELIVERY, PAY_STATUS, SUB_STATUS, kz } from "@/lib/utils";
import { useMyStore } from "@/components/seller/use-my-store";
import { SellerNav } from "@/components/seller/seller-nav";
import { StoreGate } from "@/components/seller/store-gate";

type Row = {
  id: string; status: string; delivery_method: string; shipping_fee: number; subtotal: number; commission_amount: number; seller_net: number; tracking_code: string | null; carrier: string | null; estimated_delivery: string | null; created_at: string;
  orders: { number: number; payment_status: string; contact_name: string; contact_phone: string; address: Record<string, string> };
  order_items: { id: string; name: string; quantity: number; line_total: number }[];
};
const NEXT = ["confirmed", "preparing", "packed", "left_store", "handed_over", "in_transit", "at_hub", "out_for_delivery", "delivered", "exception", "cancelled", "returned"];

export default function SellerOrders() {
  const { store } = useMyStore("/vendedor/encomendas");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!store) return;
    const { data } = await supabaseBrowser().from("sub_orders").select("*, orders(number,payment_status,contact_name,contact_phone,address), order_items(id,name,quantity,line_total)").eq("store_id", store.id).order("created_at", { ascending: false });
    setRows((data as Row[]) ?? []);
  }, [store]);
  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: string) {
    if (status === "cancelled" && !confirm("Cancelar esta encomenda? O stock é reposto.")) return;
    const note = ["exception", "cancelled", "returned", "at_hub"].includes(status) ? prompt(status === "at_hub" ? "Centro de distribuição (opcional)" : "Motivo (visível para o cliente)") : null;
    const { error } = await supabaseBrowser().rpc("set_sub_order_status", { p_sub: id, p_status: status, p_note: note });
    setMsg(error ? rpcError(error) : null); load();
  }
  async function setShipping(id: string, f: FormData) {
    const { error } = await supabaseBrowser().rpc("set_shipping", { p_sub: id, p_carrier: String(f.get("c") ?? ""), p_code: String(f.get("t") ?? ""), p_eta: String(f.get("eta") ?? "") || null });
    setMsg(error ? rpcError(error) : "Dados de envio guardados."); load();
  }

  return (
    <div className="pt-5">
      <StoreGate store={store}>
        <SellerNav />
        <h1 className="mb-3 px-1 text-xl font-extrabold">Encomendas</h1>
        {msg && <p className="mb-3 rounded-xl bg-brand-50 p-3 text-sm">{msg}</p>}
        {!rows ? <div className="skeleton h-40" /> : !rows.length ? <p className="card p-8 text-center text-sm text-ink/60">Ainda não recebeu encomendas.</p> : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="card p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold">#{r.orders.number} · {new Date(r.created_at).toLocaleDateString("pt-AO")}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.orders.payment_status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{PAY_STATUS[r.orders.payment_status]}</span>
                </div>
                {r.order_items.map((i) => <p key={i.id} className="mt-1 text-ink/75">{i.quantity}× {i.name} — {kz(i.line_total)}</p>)}
                <p className="mt-2 text-xs text-ink/55">{DELIVERY[r.delivery_method]} · {r.orders.contact_name} · {[r.orders.address?.street, r.orders.address?.city, r.orders.address?.province].filter(Boolean).join(", ")}</p>
                <a href={`tel:${r.orders.contact_phone}`} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-600"><Phone className="h-3.5 w-3.5" />{r.orders.contact_phone}</a>
                <p className="mt-2 text-xs">Subtotal {kz(r.subtotal)} · Comissão −{kz(r.commission_amount)} · <b>A receber {kz(r.seller_net)}</b></p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value)} disabled={["cancelled", "returned"].includes(r.status)} className="input h-10 w-auto py-1.5 text-sm">
                    <option value={r.status}>{SUB_STATUS[r.status]}</option>
                    {NEXT.filter((s) => s !== r.status).map((s) => <option key={s} value={s}>{SUB_STATUS[s]}</option>)}
                  </select>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); setShipping(r.id, new FormData(e.currentTarget)); }} className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
                  <input name="c" defaultValue={r.carrier ?? (r.delivery_method === "seller" ? store?.name ?? "" : "")} placeholder="Transportador" className="input h-10 py-1.5 text-sm" />
                  <input name="t" defaultValue={r.tracking_code ?? ""} placeholder="Código de seguimento" className="input h-10 py-1.5 text-sm" />
                  <input name="eta" type="date" defaultValue={r.estimated_delivery ?? ""} aria-label="Previsão de entrega" className="input h-10 py-1.5 text-sm" />
                  <button className="btn-ghost h-10 px-3 py-1.5">Guardar envio</button>
                </form>
              </div>
            ))}
          </div>
        )}
      </StoreGate>
    </div>
  );
}
