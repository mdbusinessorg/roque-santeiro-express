"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { rpcError } from "@/lib/rpc-error";
import { AdminShell } from "@/components/admin/admin-shell";

export default function AdminConfig() {
  const [rate, setRate] = useState("5");
  const [ship, setShip] = useState({ rse: "2500", seller: "1500", pickup: "0" });
  const [pay, setPay] = useState({ beneficiary: "Roque Santeiro Express", bank: "", iban: "", multicaixa_express_phone: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    supabaseBrowser().from("settings").select("key,value").then(({ data }) => {
      (data ?? []).forEach((r: { key: string; value: Record<string, string | number> }) => {
        if (r.key === "commission") setRate(String(r.value.rate));
        if (r.key === "shipping") setShip({ rse: String(r.value.rse ?? 0), seller: String(r.value.seller ?? 0), pickup: String(r.value.pickup ?? 0) });
        if (r.key === "payment") setPay((p) => ({ ...p, ...(r.value as Record<string, string>) }));
      });
    });
  }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const { error } = await supabaseBrowser().from("settings").upsert([
      { key: "commission", value: { rate: Number(rate) } },
      { key: "shipping", value: { rse: Number(ship.rse), seller: Number(ship.seller), pickup: Number(ship.pickup) } },
      { key: "payment", value: pay },
    ]);
    setBusy(false); setMsg(error ? rpcError(error) : "Configuração guardada.");
  }
  return (
    <AdminShell>
      <form onSubmit={save} className="card max-w-2xl space-y-4 p-5">
        <div><label className="label">Comissão global (%)</label><input value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" className="input" /><p className="mt-1 text-xs text-ink/50">Prioridade: comissão da loja → da categoria → global.</p></div>
        <div className="grid grid-cols-3 gap-2">
          <div><label className="label">Portes rede RSE</label><input value={ship.rse} onChange={(e) => setShip({ ...ship, rse: e.target.value })} className="input" /></div>
          <div><label className="label">Portes vendedor</label><input value={ship.seller} onChange={(e) => setShip({ ...ship, seller: e.target.value })} className="input" /></div>
          <div><label className="label">Levantamento</label><input value={ship.pickup} onChange={(e) => setShip({ ...ship, pickup: e.target.value })} className="input" /></div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div><label className="label">Beneficiário</label><input value={pay.beneficiary} onChange={(e) => setPay({ ...pay, beneficiary: e.target.value })} className="input" /></div>
          <div><label className="label">Banco</label><input value={pay.bank} onChange={(e) => setPay({ ...pay, bank: e.target.value })} className="input" /></div>
          <div><label className="label">IBAN</label><input value={pay.iban} onChange={(e) => setPay({ ...pay, iban: e.target.value })} className="input" /></div>
          <div><label className="label">Telefone Multicaixa Express</label><input value={pay.multicaixa_express_phone} onChange={(e) => setPay({ ...pay, multicaixa_express_phone: e.target.value })} className="input" /></div>
        </div>
        {msg && <p className="rounded-xl bg-brand-50 p-3 text-sm">{msg}</p>}
        <button disabled={busy} className="btn-primary h-12 w-full">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Guardar</button>
      </form>
    </AdminShell>
  );
}
