"use client";

import { useState } from "react";
import { Loader2, Search, Store } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { PAY_STATUS, SUB_STATUS } from "@/lib/utils";
import { Timeline, type SubEvent } from "@/components/account/sub-order-card";
import { Radar } from "@/components/effects/radar";

type Res = { number: number; created_at: string; payment_status: string; subs: { id: string; store: string; status: string; carrier: string | null; tracking_code: string | null; estimated_delivery: string | null; events: SubEvent[] | null }[] };

export default function TrackPage() {
  const [num, setNum] = useState("");
  const [phone, setPhone] = useState("");
  const [res, setRes] = useState<Res | null | undefined>();
  const [busy, setBusy] = useState(false);
  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const { data } = await supabaseBrowser().rpc("track_order", { p_number: Number(num.replace(/\D/g, "")), p_phone: phone });
    setRes((data as Res) ?? null); setBusy(false);
  }
  return (
    <div className="mx-auto max-w-xl pt-5">
      <div className="flex items-center gap-4 px-1">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Seguir encomenda</h1>
          <p className="text-sm text-ink/60">Introduza o número da encomenda e o telefone usado na compra.</p>
        </div>
        <div className={`w-20 shrink-0 transition-opacity sm:w-24 ${busy ? "opacity-100" : "opacity-60"}`}><Radar speed={busy ? 2.4 : 0.8} /></div>
      </div>
      <form onSubmit={go} className="card mt-3 grid gap-2 p-4 sm:grid-cols-[1fr_1fr_auto]">
        <input required inputMode="numeric" value={num} onChange={(e) => setNum(e.target.value)} placeholder="N.º da encomenda (ex.: 1024)" className="input" />
        <input required inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone" className="input" />
        <button disabled={busy} className="btn-primary">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Seguir</button>
      </form>
      {res === null && <p className="card mt-3 p-4 text-sm text-ink/60">Não encontrámos nenhuma encomenda com esses dados.</p>}
      {res && (
        <div className="mt-3 space-y-3">
          <div className="card flex items-center justify-between p-4"><p className="font-extrabold">Encomenda #{res.number}</p><span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold">{PAY_STATUS[res.payment_status]}</span></div>
          {(res.subs ?? []).map((s) => (
            <div key={s.id} className="card p-4">
              <div className="flex items-center justify-between"><p className="flex items-center gap-2 font-bold"><Store className="h-4 w-4 text-brand-600" />{s.store}</p><span className="text-xs font-bold text-brand-600">{SUB_STATUS[s.status]}</span></div>
              <p className="mt-1 text-xs text-ink/60">{[s.carrier && `Transportador: ${s.carrier}`, s.tracking_code && `Código: ${s.tracking_code}`, s.estimated_delivery && `Previsão: ${new Date(s.estimated_delivery).toLocaleDateString("pt-AO")}`].filter(Boolean).join(" · ")}</p>
              <Timeline status={s.status} events={s.events ?? []} createdAt={res.created_at} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
