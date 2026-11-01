"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { AlertTriangle, Check, Package, Store, Truck } from "lucide-react";
import { DELIVERY, SUB_STATUS, kz } from "@/lib/utils";

export type SubEvent = { id?: number; status: string; note: string | null; created_at: string };
export type SubOrder = {
  id: string; status: string; delivery_method: string; shipping_fee: number; subtotal: number; tracking_code: string | null; received_confirmed_at: string | null;
  carrier?: string | null; estimated_delivery?: string | null;
  stores: { name: string; slug: string; whatsapp: string | null };
  order_items: { id: string; name: string; image: string; unit_price: number; quantity: number; line_total: number; product_id?: string }[];
  sub_order_events?: SubEvent[];
};
export const FLOW = ["new", "payment_processing", "payment_confirmed", "preparing", "packed", "handed_over", "in_transit", "at_hub", "out_for_delivery", "delivered"];
const ALIAS: Record<string, string> = { confirmed: "preparing", ready: "packed", shipped: "handed_over" };
const fmt = (d: string) => new Date(d).toLocaleString("pt-AO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function Timeline({ status, events, createdAt }: { status: string; events: SubEvent[]; createdAt?: string }) {
  const evs = [...events].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
  const reached = new Map<string, SubEvent>();
  if (createdAt) reached.set("new", { status: "new", note: null, created_at: createdAt });
  evs.forEach((e) => reached.set(ALIAS[e.status] ?? e.status, e));
  const cur = ALIAS[status] ?? status;
  const bad = ["exception", "cancelled", "returned", "payment_failed"].includes(cur);
  const lastIdx = Math.max(FLOW.indexOf(cur), ...FLOW.map((s, i) => (reached.has(s) ? i : -1)));
  const steps = FLOW.filter((s, i) => reached.has(s) || i <= lastIdx + 1 || s === "delivered").filter((s, i, a) => !(s.startsWith("payment") && !reached.has(s) && i < a.indexOf(cur)));
  return (
    <ol className="relative mt-4 space-y-0">
      {steps.map((s, i) => {
        const e = reached.get(s); const done = !!e || FLOW.indexOf(s) <= lastIdx; const active = s === cur && !bad;
        return (
          <motion.li key={s} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative flex gap-3 pb-4 last:pb-0">
            {i < steps.length - 1 && <span className="absolute left-[11px] top-6 h-full w-0.5 bg-line"><motion.span className="block w-full bg-brand-600" initial={{ height: 0 }} animate={{ height: done && FLOW.indexOf(steps[i + 1]) <= lastIdx ? "100%" : 0 }} transition={{ duration: 0.5, delay: i * 0.08 }} /></span>}
            <span className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${done ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white"}`}>
              {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              {active && <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/40 motion-reduce:hidden" />}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className={`text-sm ${done ? "font-semibold text-ink" : "text-ink/45"}`}>{SUB_STATUS[s]}</p>
              {e && <p className="text-[11.5px] text-ink/50">{fmt(e.created_at)}{e.note ? ` · ${e.note}` : ""}</p>}
            </div>
          </motion.li>
        );
      })}
      {bad && (
        <li className="mt-2 flex items-center gap-2 rounded-2xl bg-brand-50 p-3 text-sm font-semibold text-brand-700"><AlertTriangle className="h-4 w-4" />{SUB_STATUS[cur]}{reached.get(cur)?.note ? ` — ${reached.get(cur)?.note}` : ""}</li>
      )}
    </ol>
  );
}

export function SubOrderCard({ s, onConfirm, createdAt }: { s: SubOrder; onConfirm?: (id: string) => void; createdAt?: string }) {
  const events = s.sub_order_events ?? [];
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <Link href={`/loja/${s.stores.slug}`} className="flex items-center gap-2 font-bold text-ink hover:text-brand-600"><Store className="h-4 w-4 text-brand-600" />{s.stores.name}</Link>
        <motion.span key={s.status} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-600">{SUB_STATUS[s.status]}</motion.span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink/60">
        <span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" />{DELIVERY[s.delivery_method]} · {kz(s.shipping_fee)}</span>
        {s.carrier && <span>Transportador: <b className="text-ink">{s.carrier}</b></span>}
        {s.tracking_code && <span>Código: <b className="font-mono text-ink">{s.tracking_code}</b></span>}
        {s.estimated_delivery && s.status !== "delivered" && <span>Previsão: <b className="text-ink">{new Date(s.estimated_delivery).toLocaleDateString("pt-AO")}</b></span>}
      </div>
      <Timeline status={s.status} events={events} createdAt={createdAt} />
      {s.order_items.map((i) => (
        <div key={i.id} className="mt-3 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={i.image} alt="" className="h-14 w-14 rounded-xl bg-mist object-contain p-1" />
          <p className="line-clamp-2 flex-1 text-sm">{i.name} <span className="text-ink/50">× {i.quantity}</span></p>
          <p className="text-sm font-semibold">{kz(i.line_total)}</p>
        </div>
      ))}
      {onConfirm && s.status === "delivered" && !s.received_confirmed_at && <button onClick={() => onConfirm(s.id)} className="btn-primary mt-3 w-full"><Package className="h-4 w-4" />Confirmar que recebi</button>}
      {s.received_confirmed_at && <p className="mt-3 text-xs font-semibold text-emerald-600">Recepção confirmada em {new Date(s.received_confirmed_at).toLocaleDateString("pt-AO")}</p>}
    </div>
  );
}
