"use client";

import { useCallback, useEffect, useState } from "react";
import { Flag, Star } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { rpcError } from "@/lib/rpc-error";
import { AdminShell } from "@/components/admin/admin-shell";

type R = { id: string; rating: number; title: string | null; comment: string | null; status: string; verified: boolean; report_count: number; created_at: string; products: { name: string; slug: string } | null; review_reports: { reason: string; status: string }[] };

export default function AdminReviews() {
  const [rows, setRows] = useState<R[] | null>(null);
  const [f, setF] = useState("reported");
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(async () => {
    let q = supabaseBrowser().from("reviews").select("id,rating,title,comment,status,verified,report_count,created_at,products(name,slug),review_reports(reason,status)").order("created_at", { ascending: false }).limit(100);
    if (f === "reported") q = q.gt("report_count", 0);
    if (f === "hidden") q = q.eq("status", "hidden");
    const { data } = await q; setRows((data as unknown as R[]) ?? []);
  }, [f]);
  useEffect(() => { load(); }, [load]);
  async function mod(id: string, status: string) {
    const { error } = await supabaseBrowser().rpc("moderate_review", { p_review: id, p_status: status });
    setMsg(error ? rpcError(error) : "Avaliação actualizada."); load();
  }
  return (
    <AdminShell>
      <div className="mb-3 flex gap-2">{[["reported", "Denunciadas"], ["all", "Todas"], ["hidden", "Ocultas"]].map(([k, l]) => <button key={k} onClick={() => setF(k)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${f === k ? "bg-white text-zinc-900" : "bg-mist"}`}>{l}</button>)}</div>
      {msg && <p className="mb-3 rounded-xl bg-brand-50 p-3 text-sm">{msg}</p>}
      {!rows ? <div className="skeleton h-40" /> : !rows.length ? <p className="card p-8 text-center text-sm text-ink/60">Nada para moderar.</p> : (
        <div className="space-y-3">{rows.map((r) => (
          <div key={r.id} className="card p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold">{r.products?.name}</p><span className="text-xs text-ink/50">{new Date(r.created_at).toLocaleDateString("pt-AO")} · {r.status}{r.verified ? " · verificada" : ""}</span></div>
            <p className="mt-1 flex gap-0.5">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`h-3.5 w-3.5 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-line"}`} />)}</p>
            {r.title && <p className="font-semibold">{r.title}</p>}<p className="text-ink/75">{r.comment}</p>
            {r.review_reports.map((x, i) => <p key={i} className="mt-1 flex items-center gap-1 text-xs text-brand-700"><Flag className="h-3 w-3" />{x.reason} ({x.status})</p>)}
            <div className="mt-2 flex gap-2">
              {r.status !== "hidden" && <button onClick={() => mod(r.id, "hidden")} className="btn-primary px-3 py-1.5 text-xs">Ocultar</button>}
              <button onClick={() => mod(r.id, "published")} className="btn-ghost px-3 py-1.5 text-xs">{r.status === "hidden" ? "Republicar" : "Manter (rejeitar denúncia)"}</button>
            </div>
          </div>
        ))}</div>
      )}
    </AdminShell>
  );
}
