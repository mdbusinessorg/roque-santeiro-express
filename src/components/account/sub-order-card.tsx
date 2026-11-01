import Link from "next/link";
import { Package, Store, Truck } from "lucide-react";
import { DELIVERY, SUB_STATUS, kz } from "@/lib/utils";

export type SubOrder = {
  id: string; status: string; delivery_method: string; shipping_fee: number; subtotal: number; tracking_code: string | null; received_confirmed_at: string | null;
  stores: { name: string; slug: string; whatsapp: string | null };
  order_items: { id: string; name: string; image: string; unit_price: number; quantity: number; line_total: number }[];
};
const STEPS = ["new", "confirmed", "preparing", "shipped", "delivered"];

export function SubOrderCard({ s, onConfirm }: { s: SubOrder; onConfirm?: (id: string) => void }) {
  const idx = STEPS.indexOf(s.status);
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <Link href={`/loja/${s.stores.slug}`} className="flex items-center gap-2 font-bold text-brand-800"><Store className="h-4 w-4" />{s.stores.name}</Link>
        <span className="text-sm font-semibold text-brand-600">{SUB_STATUS[s.status]}</span>
      </div>
      <p className="mt-1 flex items-center gap-1 text-xs text-ink/55"><Truck className="h-3.5 w-3.5" />{DELIVERY[s.delivery_method]} · {kz(s.shipping_fee)}{s.tracking_code && ` · Tracking ${s.tracking_code}`}</p>
      {idx >= 0 && <div className="mt-3 flex gap-1">{STEPS.map((st, k) => <div key={st} className={`h-1.5 flex-1 rounded-full ${k <= idx ? "brand-gradient" : "bg-brand-100"}`} title={SUB_STATUS[st]} />)}</div>}
      {s.order_items.map((i) => (
        <div key={i.id} className="mt-3 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={i.image} alt="" className="h-14 w-14 rounded-xl bg-brand-50 object-contain p-1" />
          <p className="line-clamp-2 flex-1 text-sm">{i.name} <span className="text-ink/50">× {i.quantity}</span></p>
          <p className="text-sm font-semibold">{kz(i.line_total)}</p>
        </div>
      ))}
      {onConfirm && s.status === "delivered" && !s.received_confirmed_at && <button onClick={() => onConfirm(s.id)} className="btn-primary mt-3 w-full"><Package className="h-4 w-4" />Confirmar que recebi</button>}
      {s.received_confirmed_at && <p className="mt-3 text-xs font-semibold text-emerald-600">Recepção confirmada em {new Date(s.received_confirmed_at).toLocaleDateString("pt-AO")}</p>}
    </div>
  );
}
