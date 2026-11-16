"use client";

import { useEffect, useState } from "react";
import Link from "@/components/ui/native-link";
import { Check, Loader2, X } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useAuth, isStaff } from "@/lib/auth";
import { rpcError } from "@/lib/rpc-error";

type Item = { id: string; name: string; description: string | null; price: number; photos: string[]; status: string; created_at: string; user_id: string };

export default function AdminConsignacao() {
  const { profile, loading } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const { data } = await supabaseBrowser().from("consignment_items").select("id,name,description,price,photos,status,created_at,user_id").order("created_at", { ascending: false }).limit(60);
    setItems((data as Item[]) ?? []);
  }
  useEffect(() => { if (isStaff(profile?.role)) void load(); }, [profile]);

  async function act(id: string, fn: "approve_consignment" | "reject_consignment") {
    setBusy(id); setErr(null);
    try {
      const { error } = await supabaseBrowser().rpc(fn, { p_id: id });
      if (error) throw error;
      await load();
    } catch (e) { setErr(rpcError(e as { message?: string })); }
    setBusy(null);
  }

  if (loading || !isStaff(profile?.role)) return <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-ink/40" /></div>;
  const pending = items.filter((i) => i.status === "pending");
  const done = items.filter((i) => i.status !== "pending");

  return (
    <div className="space-y-5 pt-5">
      <div>
        <h1 className="text-2xl font-extrabold">AMARROS — produtos de particulares</h1>
        <p className="mt-1 text-sm text-ink/60">Clientes entregam produtos à Roque Santeiro sem criar loja. Ao aceitar, o produto é publicado na categoria AMARROS com stock 1.</p>
      </div>
      {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}

      <section className="space-y-3">
        <h2 className="font-bold">Em análise ({pending.length})</h2>
        {pending.length === 0 && <p className="card p-4 text-sm text-ink/60">Nada em análise.</p>}
        {pending.map((it) => (
          <div key={it.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
            <div className="flex shrink-0 gap-2 overflow-x-auto">
              {it.photos.slice(0, 4).map((src) => <img key={src} src={src} alt="" className="h-20 w-20 shrink-0 rounded-xl bg-mist object-contain" />)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold">{it.name}</p>
              {it.description && <p className="mt-1 text-sm text-ink/65">{it.description}</p>}
              <p className="mt-1 text-sm font-semibold text-promo">{Number(it.price).toLocaleString("pt-PT")} Kz</p>
              <p className="mt-1 text-xs text-ink/45">{new Date(it.created_at).toLocaleString("pt-PT")}</p>
            </div>
            <div className="flex gap-2">
              <button disabled={busy === it.id} onClick={() => act(it.id, "approve_consignment")} className="btn-primary h-10 px-4 text-sm"><Check className="h-4 w-4" />Aceitar e publicar</button>
              <button disabled={busy === it.id} onClick={() => act(it.id, "reject_consignment")} className="btn-ghost h-10 px-4 text-sm"><X className="h-4 w-4" />Recusar</button>
            </div>
          </div>
        ))}
      </section>

      {done.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-bold">Histórico</h2>
          {done.map((it) => (
            <div key={it.id} className="card flex items-center gap-3 p-3 text-sm">
              {it.photos[0] && <img src={it.photos[0]} alt="" className="h-10 w-10 rounded-lg bg-mist object-contain" />}
              <span className="flex-1 truncate font-medium">{it.name}</span>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${it.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>{it.status === "approved" ? "Publicado" : "Recusado"}</span>
            </div>
          ))}
        </section>
      )}
      <p className="text-xs text-ink/45">Precisas de ver a categoria? <Link href="/categoria/amarros" className="font-semibold text-promo">Abrir AMARROS</Link></p>
    </div>
  );
}
