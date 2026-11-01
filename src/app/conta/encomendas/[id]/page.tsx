"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabaseBrowser, uploadMedia } from "@/lib/supabase/client";
import { rpcError } from "@/lib/rpc-error";
import { PAY_METHOD, PAY_STATUS, kz } from "@/lib/utils";
import { QRCode } from "@/components/effects/qr-code";
import { BlurReveal } from "@/components/effects/blur-reveal";
import { SubOrderCard, type SubOrder } from "@/components/account/sub-order-card";

type Order = {
  id: string; number: number; total: number; subtotal: number; shipping_total: number; payment_status: string; payment_method: string;
  payment_reference: string | null; contact_name: string; contact_phone: string; address: Record<string, string>; created_at: string; sub_orders: SubOrder[];
};
type Pay = { bank?: string; iban?: string; beneficiary?: string; multicaixa_express_phone?: string };

export default function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isNew = useSearchParams().get("nova") === "1";
  const { user, loading } = useAuth();
  const [o, setO] = useState<Order | null | undefined>();
  const [pay, setPay] = useState<Pay>({});
  const [ref, setRef] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    const [{ data }, { data: s }] = await Promise.all([
      sb.from("orders").select("*, sub_orders(*, stores(name,slug,whatsapp), order_items(*))").eq("id", id).maybeSingle(),
      sb.from("settings").select("value").eq("key", "payment").maybeSingle(),
    ]);
    setO(data as Order | null); setPay((s?.value as Pay) ?? {});
  }, [id]);
  useEffect(() => { if (!loading) { if (user) load(); else setO(null); } }, [loading, user, load]);

  async function sendProof(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      const url = file ? await uploadMedia(file, "comprovativos") : null;
      const { error } = await supabaseBrowser().rpc("submit_payment_proof", { p_order: id, p_reference: ref.trim(), p_proof_url: url });
      if (error) throw error;
      setMsg("Comprovativo enviado. Vamos verificar o pagamento."); await load();
    } catch (err) { setMsg(rpcError(err as { message?: string })); }
    setBusy(false);
  }
  async function confirm(sub: string) {
    const { error } = await supabaseBrowser().rpc("confirm_received", { p_sub: sub });
    if (error) setMsg(rpcError(error)); else load();
  }

  if (loading || o === undefined) return <div className="skeleton mt-6 h-72" />;
  if (!o) return <div className="card mt-6 p-8 text-center">Encomenda não encontrada. <Link href="/entrar" className="text-brand-600">Entrar</Link></div>;
  const canPay = ["pending", "failed"].includes(o.payment_status) && o.payment_method !== "cash_on_delivery";

  return (
    <div className="mx-auto max-w-3xl space-y-4 pt-5">
      {isNew && (
        <div className="brand-gradient rounded-[2rem] p-5 text-white">
          <CheckCircle2 className="h-8 w-8" />
          <p className="mt-2 text-2xl font-extrabold"><BlurReveal>Encomenda registada!</BlurReveal></p>
          <p className="text-sm text-white/85">Número #{o.number}. {canPay ? "Siga as instruções de pagamento abaixo." : "O vendedor vai preparar a entrega."}</p>
        </div>
      )}
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div><p className="text-lg font-extrabold">Encomenda #{o.number}</p><p className="text-xs text-ink/55">{new Date(o.created_at).toLocaleString("pt-AO")} · {PAY_METHOD[o.payment_method]}</p></div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${o.payment_status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{PAY_STATUS[o.payment_status]}</span>
      </div>
      {canPay && (
        <div className="card grid gap-4 p-4 sm:grid-cols-[1fr_auto]">
          <div className="space-y-2 text-sm">
            <p className="font-bold">Como pagar {kz(o.total)}</p>
            {o.payment_method === "multicaixa_express"
              ? <p>Envie o valor por Multicaixa Express para <b>{pay.multicaixa_express_phone || "o número indicado pelo nosso apoio"}</b> ({pay.beneficiary}). Referência <b>RSE{o.number}</b>.</p>
              : <p>Transfira para <b>{pay.beneficiary}</b>{pay.bank ? ` · ${pay.bank}` : ""}{pay.iban ? <> · IBAN <b>{pay.iban}</b></> : " (IBAN enviado pelo apoio)"}. Descritivo <b>RSE{o.number}</b>.</p>}
            <form onSubmit={sendProof} className="space-y-2 pt-2">
              <input required value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Referência / n.º da transacção" className="input" />
              <label className="btn-ghost w-full cursor-pointer"><Upload className="h-4 w-4" />{file ? file.name : "Anexar comprovativo (foto ou PDF)"}<input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
              <button disabled={busy} className="btn-primary w-full">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Enviar comprovativo</button>
            </form>
          </div>
          <div className="flex flex-col items-center gap-1"><QRCode value={`RSE${o.number}|${o.total}|${pay.iban ?? ""}`} size={140} /><p className="text-[11px] text-ink/50">Ref. RSE{o.number}</p></div>
        </div>
      )}
      {o.payment_status === "awaiting_confirmation" && <p className="card p-4 text-sm">Recebemos o comprovativo (ref. {o.payment_reference}). O pagamento está a ser verificado.</p>}
      {msg && <p className="rounded-2xl bg-brand-50 p-3 text-sm text-brand-900">{msg}</p>}
      {o.sub_orders.map((s) => <SubOrderCard key={s.id} s={s} onConfirm={confirm} />)}
      <div className="card space-y-1 p-4 text-sm">
        <div className="flex justify-between"><span className="text-ink/60">Produtos</span><span>{kz(o.subtotal)}</span></div>
        <div className="flex justify-between"><span className="text-ink/60">Portes</span><span>{kz(o.shipping_total)}</span></div>
        <div className="flex justify-between border-t border-brand-100 pt-2 text-base font-extrabold"><span>Total</span><span className="text-brand-800">{kz(o.total)}</span></div>
        <p className="pt-2 text-xs text-ink/55">Entrega: {o.contact_name} · {o.contact_phone} · {[o.address?.street, o.address?.city, o.address?.province].filter(Boolean).join(", ")}</p>
      </div>
    </div>
  );
}
