"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Package } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabase/client";
import { PAY_STATUS, kz } from "@/lib/utils";

type Row = { id: string; number: number; total: number; payment_status: string; created_at: string; sub_orders: { id: string }[] };

export default function OrdersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/entrar?next=/conta/encomendas"); return; }
    supabaseBrowser().from("orders").select("id,number,total,payment_status,created_at,sub_orders(id)").eq("customer_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as Row[]) ?? []));
  }, [user, loading, router]);
  if (!rows) return <div className="skeleton mt-6 h-60" />;
  return (
    <div className="mx-auto max-w-2xl pt-5">
      <h1 className="mb-3 px-1 text-2xl font-extrabold tracking-tight">As minhas encomendas</h1>
      {!rows.length && <div className="card p-8 text-center"><Package className="mx-auto h-10 w-10 text-brand-400" /><p className="mt-2 text-sm text-ink/60">Ainda não fez encomendas.</p><Link href="/" className="btn-primary mt-4">Comprar</Link></div>}
      <div className="space-y-2">
        {rows.map((o) => (
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
