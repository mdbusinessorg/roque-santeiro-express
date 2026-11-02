"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "@/components/ui/native-link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Bell, CheckCheck, CreditCard, Package, Star, Truck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabase/client";

type N = { id: number; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };
const icon = (t: string) => (t.startsWith("payment") ? CreditCard : t.startsWith("review") ? Star : ["order_in_transit", "order_out_for_delivery", "order_handed_over", "order_shipped", "order_at_hub"].includes(t) ? Truck : t.startsWith("order") ? Package : Bell);

export default function Notifications() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<N[] | null>(null);
  const [lim, setLim] = useState(30);
  const load = useCallback(async () => {
    const { data } = await supabaseBrowser().from("notifications").select("*").order("created_at", { ascending: false }).limit(lim);
    setRows((data as N[]) ?? []);
  }, [lim]);
  useEffect(() => { if (!loading && !user) router.replace("/entrar?next=/conta/notificacoes"); else if (user) load(); }, [loading, user, router, load]);
  async function readAll() {
    await supabaseBrowser().from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    window.dispatchEvent(new Event("rse-notif")); load();
  }
  async function open(n: N) {
    if (!n.read_at) { await supabaseBrowser().from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id); window.dispatchEvent(new Event("rse-notif")); }
    if (n.link) router.push(n.link);
  }
  return (
    <div className="mx-auto max-w-2xl pt-5">
      <div className="mb-3 flex items-center justify-between px-1">
        <h1 className="text-xl font-extrabold">Notificações</h1>
        {rows?.some((r) => !r.read_at) && <button onClick={readAll} className="flex items-center gap-1 text-sm font-semibold text-brand-600"><CheckCheck className="h-4 w-4" />Marcar todas como lidas</button>}
      </div>
      {!rows ? <div className="skeleton h-60" /> : !rows.length ? (
        <div className="card p-8 text-center text-sm text-ink/60"><Bell className="mx-auto mb-2 h-8 w-8 text-ink/30" />Sem notificações. Aqui aparecem pagamentos, envios, entregas e respostas às suas avaliações. <Link href="/conta/encomendas" className="text-brand-600">Ver encomendas</Link></div>
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {rows.map((n, i) => { const I = icon(n.type); return (
            <motion.button key={n.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }} onClick={() => open(n)} className={`flex w-full items-start gap-3 p-4 text-left transition hover:bg-mist ${n.read_at ? "" : "bg-brand-50/60"}`}>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${n.read_at ? "bg-mist text-ink/50" : "bg-brand-600 text-white"}`}><I className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{n.title}</span>{n.body && <span className="block text-xs text-ink/60">{n.body}</span>}<span className="mt-0.5 block text-[11px] text-ink/40">{new Date(n.created_at).toLocaleString("pt-AO")}</span></span>
              {!n.read_at && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
            </motion.button>
          ); })}
        </div>
      )}
      {rows && rows.length >= lim && <button onClick={() => setLim(lim + 30)} className="btn-ghost mt-3 w-full">Ver mais</button>}
    </div>
  );
}
