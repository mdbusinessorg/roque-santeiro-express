"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Package } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabase/client";
import { PAY_STATUS, kz } from "@/lib/utils";

type Row = { id: string; number: number; total: number; payment_status: string; created_at: string; sub_orders: { id: string; status: string; order_items: { id: string; reviews: { id: string }[] | null }[] }[] };

const TABS = [
  { k: "", l: "Todas" },
  { k: "pagar", l: "Por pagar" },
  { k: "enviar", l: "Por enviar" },
  { k: "enviadas", l: "Enviadas" },
  { k: "avaliar", l: "Por avaliar" },
];
const SENT = ["left_store", "handed_over", "shipped", "in_transit", "at_hub", "out_for_delivery"];
function match(o: Row, k: string) {
  if (!k) return true;
  if (k === "pagar") return ["pending", "awaiting_confirmation"].includes(o.payment_status);
  if (k === "enviar") return o.payment_status === "paid" && o.sub_orders.some((s) => ["new", "confirmed", "preparing", "packed", "ready"].includes(s.status));
  if (k === "enviadas") return o.sub_orders.some((s) => SENT.includes(s.status));
  return o.sub_orders.some((s) => s.status === "delivered" && s.order_items.some((i) => !i.reviews?.length));
}

export default function OrdersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [tab, setTab] = useState("");
  useEffect(() => setTab(new URLSearchParams(window.location.search).get("estado") ?? ""), []);
  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/entrar?next=/conta/encomendas"); return; }
    supabaseBrowser().from("orders").select("id,number,total,payment_status,created_at,sub_orders(id,status,order_items(id,reviews(id)))").eq("customer_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as Row[]) ?? []));
  }, [user, loading, router]);
  if (!rows) return <div className="skeleton mt-6 h-60" />;
  return (
    <div className="mx-auto max-w-2xl pt-5">
      <h1 className="mb-3 px-1 text-2xl font-extrabold tracking-tight">As minhas encomendas</h1>
      <div className="no-scrollbar -mx-3 mb-3 flex gap-2 overflow-x-auto px-3">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => { setTab(t.k); window.history.replaceState(null, "", t.k ? `?estado=${t.k}` : window.location.pathname); }} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${tab === t.k ? "bg-white text-zinc-900" : "bg-surface text-ink/70 ring-1 ring-line"}`}>
            {t.l} <span className="opacity-60">{rows.filter((o) => match(o, t.k)).length}</span>
          </button>
        ))}
      </div>
      {!rows.filter((o) => match(o, tab)).length && <div className="card p-8 text-center"><Package className="mx-auto h-10 w-10 text-brand-400" /><p className="mt-2 text-sm text-ink/60">Ainda não fez encomendas.</p><Link href="/" className="btn-primary mt-4">Comprar</Link></div>}
      <div className="space-y-2">
        {rows.filter((o) => match(o, tab)).map((o) => (
          <Link key={o.id} href={`/conta/encomendas/${o.id}`} className="card flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-bold">Encomenda #{o.number}</p>
              <p className="text-xs text-ink/55">{new Date(o.created_at).toLocaleDateString("pt-AO")} · {o.sub_orders.length} {o.sub_orders.length === 1 ? "loja" : "lojas"}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-brand-800">{kz(o.total)}</p>
              <p className={`text-xs font-semibold ${o.payment_status === "paid" ? "text-emerald-600" : "text-amber-600"}`}>{PAY_STATUS[o.payment_status]}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
