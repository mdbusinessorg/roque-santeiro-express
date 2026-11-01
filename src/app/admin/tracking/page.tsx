"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { pixelConfigured } from "@/lib/tracking";
import { AdminShell } from "@/components/admin/admin-shell";

type E = { id: number; event_id: string; name: string; source: string; status: string; error: string | null; value: number | null; created_at: string };

export default function AdminTracking() {
  const [rows, setRows] = useState<E[] | null>(null);
  const [consent, setConsent] = useState<{ total: number; mk: number }>({ total: 0, mk: 0 });
  const [f, setF] = useState("all");
  useEffect(() => {
    const sb = supabaseBrowser();
    let q = sb.from("marketing_events").select("id,event_id,name,source,status,error,value,created_at").order("created_at", { ascending: false }).limit(100);
    if (f === "errors") q = q.eq("status", "error");
    if (f === "purchase") q = q.eq("name", "Purchase");
    q.then(({ data }) => setRows((data as E[]) ?? []));
    Promise.all([sb.from("customer_consent").select("id", { count: "exact", head: true }), sb.from("customer_consent").select("id", { count: "exact", head: true }).eq("marketing", true)])
      .then(([a, b]) => setConsent({ total: a.count ?? 0, mk: b.count ?? 0 }));
  }, [f]);
  const Ok = ({ on, label }: { on: boolean; label: string }) => <p className="flex items-center gap-2 text-sm">{on ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-brand-600" />}{label}</p>;
  return (
    <AdminShell>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card space-y-1 p-4"><p className="font-bold">Meta Pixel</p><Ok on={pixelConfigured()} label={pixelConfigured() ? "Configurado (NEXT_PUBLIC_META_PIXEL_ID)" : "Sem Pixel ID — eventos só registados internamente"} /></div>
        <div className="card space-y-1 p-4"><p className="font-bold">Conversions API</p><p className="text-xs text-ink/60">Purchase é enviado pelo servidor só após pagamento confirmado, com o mesmo event_id do Pixel (purchase_&lt;encomenda&gt;). Estado: ver eventos &quot;server&quot; abaixo.</p></div>
        <div className="card space-y-1 p-4"><p className="font-bold">Consentimentos</p><p className="text-sm">{consent.total} registos · {consent.mk} aceitaram marketing</p></div>
      </div>
      <div className="my-3 flex gap-2">{[["all", "Todos"], ["purchase", "Purchase"], ["errors", "Erros"]].map(([k, l]) => <button key={k} onClick={() => setF(k)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${f === k ? "bg-white text-zinc-900" : "bg-mist"}`}>{l}</button>)}</div>
      {!rows ? <div className="skeleton h-40" /> : !rows.length ? <p className="card p-8 text-center text-sm text-ink/60">Sem eventos registados.</p> : (
        <div className="card overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-mist"><tr>{["Data", "Evento", "Origem", "Estado", "Valor", "Erro"].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id} className="border-t border-line"><td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString("pt-AO")}</td><td className="p-2 font-semibold">{r.name}</td><td className="p-2">{r.source}</td><td className={`p-2 ${r.status === "error" ? "text-brand-600" : ""}`}>{r.status}</td><td className="p-2">{r.value ?? ""}</td><td className="max-w-[240px] truncate p-2 text-ink/50" title={r.error ?? ""}>{r.error}</td></tr>)}</tbody></table></div>
      )}
    </AdminShell>
  );
}
