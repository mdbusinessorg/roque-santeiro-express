"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "@/components/ui/native-link";
import { useSearchParams } from "next/navigation";
import { Clock, Loader2, Star, Upload } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabaseBrowser, uploadMedia } from "@/lib/supabase/client";
import { rpcError } from "@/lib/rpc-error";
import { PAYMENT_INFO, PAYMENT_REFERENCE, PAY_METHOD, PAY_STATUS, kz } from "@/lib/utils";
import { QRCode } from "@/components/effects/qr-code";
import { BlurReveal } from "@/components/effects/blur-reveal";
import { SubOrderCard, type SubOrder } from "@/components/account/sub-order-card";
import { Celebration } from "@/components/account/celebration";
import { PaymentProcessing } from "@/components/account/payment-processing";
import { ReviewForm } from "@/components/reviews/review-form";
import { RecoRail } from "@/components/recs/reco-rail";
import { sendServerPurchase, track } from "@/lib/tracking";

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
  const [copied, setCopied] = useState(false);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [writing, setWriting] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    const [{ data }, { data: s }] = await Promise.all([
      sb.from("orders").select("*, sub_orders(*, stores(name,slug,whatsapp), order_items(*), sub_order_events(id,status,note,created_at))").eq("id", id).maybeSingle(),
      sb.from("settings").select("value").eq("key", "payment").maybeSingle(),
    ]);
    setO(data as Order | null); setPay((s?.value as Pay) ?? {});
    const ids = ((data as Order | null)?.sub_orders ?? []).flatMap((x) => x.order_items.map((i) => i.id));
    if (ids.length) { const { data: r } = await sb.from("reviews").select("order_item_id").in("order_item_id", ids); setReviewed(new Set((r ?? []).map((x) => x.order_item_id as string))); }
  }, [id]);
  useEffect(() => { if (!loading) { if (user) load(); else setO(null); } }, [loading, user, load]);
  useEffect(() => {
    if (!user) return;
    const sb = supabaseBrowser();
    const ch = sb.channel(`order-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "sub_orders", filter: `order_id=eq.${id}` }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sub_order_events" }, () => load())
      .subscribe();
    const poll = setInterval(load, 60000);
    return () => { sb.removeChannel(ch); clearInterval(poll); };
  }, [id, user, load]);
  useEffect(() => {
    if (o?.payment_status !== "paid") return;
    const key = `rse_purchase_${o.id}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    const items = o.sub_orders.flatMap((x) => x.order_items);
    track("Purchase", { value: Number(o.total), currency: "AOA", content_type: "product", content_ids: items.map((i) => i.product_id), num_items: items.reduce((a, i) => a + i.quantity, 0) }, `purchase_${o.id}`);
    void sendServerPurchase(o.id);
  }, [o]);

  async function sendProof(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      const url = file ? await uploadMedia(file, "comprovativos") : null;
      track("AddPaymentInfo", { value: Number(o?.total ?? 0), currency: "AOA", payment_type: o?.payment_method });
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
      {o.payment_status === "paid" && (isNew || o.sub_orders.every((x) => ["new", "confirmed"].includes(x.status))) && (
        <Celebration number={o.number} total={o.total} items={o.sub_orders.reduce((a, x) => a + x.order_items.reduce((b, i) => b + i.quantity, 0), 0)} eta={o.sub_orders.map((x) => x.estimated_delivery).filter(Boolean).sort().pop()} />
      )}
      {o.payment_status !== "paid" && o.payment_status !== "awaiting_confirmation" && isNew && (
        <div className="card border-amber-200 bg-amber-50 p-5">
          <Clock className="h-7 w-7 text-amber-600" />
          <p className="mt-2 text-xl font-extrabold"><BlurReveal>Encomenda registada — pagamento pendente</BlurReveal></p>
          <p className="text-sm text-cream/70">Número #{o.number}. {canPay ? "A compra só fica confirmada depois de validarmos o pagamento. Siga as instruções abaixo." : "Pagamento na entrega: o vendedor vai preparar a encomenda."}</p>
        </div>
      )}
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div><p className="text-lg font-extrabold">Encomenda #{o.number}</p><p className="text-xs text-cream/55">{new Date(o.created_at).toLocaleString("pt-AO")} · {PAY_METHOD[o.payment_method]}</p></div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${o.payment_status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{PAY_STATUS[o.payment_status]}</span>
      </div>
      {canPay && (
        <div className="card grid gap-4 p-4 sm:grid-cols-[1fr_auto]">
          <div className="space-y-2 text-sm">
            <p className="font-bold">Como pagar {kz(o.total)}</p>
            {PAYMENT_INFO[o.payment_method] ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={PAYMENT_INFO[o.payment_method].logo} alt={PAY_METHOD[o.payment_method]} className="h-8 w-auto max-w-[110px] object-contain" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10.5px] uppercase tracking-wide text-cream/50">Referência de pagamento</p>
                    <p className="text-lg font-extrabold tracking-[0.2em] text-cream">{PAYMENT_REFERENCE}</p>
                  </div>
                  <button type="button" onClick={() => { navigator.clipboard?.writeText(PAYMENT_REFERENCE); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="shrink-0 rounded-full bg-cream px-3 py-1.5 text-[12px] font-bold text-ink">{copied ? "Copiado" : "Copiar"}</button>
                </div>
                <ol className="space-y-1 text-[12.5px] leading-snug text-cream/70">
                  {PAYMENT_INFO[o.payment_method].steps.map((st, i) => <li key={i} className="flex gap-2"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-beige/20 text-[10px] font-bold text-beige">{i + 1}</span>{st}</li>)}
                </ol>
                {o.payment_method === "multicaixa_express" && <p className="text-[12px] text-cream/55">Conta Multicaixa: <b>{pay.multicaixa_express_phone || "o número indicado pelo nosso apoio"}</b>{pay.beneficiary ? ` (${pay.beneficiary})` : ""}.</p>}
              </div>
            ) : o.payment_method === "transfer"
              ? <p>Transfira para <b>{pay.beneficiary}</b>{pay.bank ? ` · ${pay.bank}` : ""}{pay.iban ? <> · IBAN <b>{pay.iban}</b></> : " (IBAN enviado pelo apoio)"}. Descritivo <b>RSE{o.number}</b>.</p>
              : <p>Pagamento na entrega: pague ao vendedor no momento da recepção.</p>}
            <form onSubmit={sendProof} className="space-y-2 pt-2">
              <input required value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Referência / n.º da transacção" className="input" />
              <label className="btn-ghost w-full cursor-pointer"><Upload className="h-4 w-4" />{file ? file.name : "Anexar comprovativo (foto ou PDF)"}<input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
              <button disabled={busy} className="btn-primary w-full">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Enviar comprovativo</button>
            </form>
          </div>
          <div className="flex flex-col items-center gap-1"><QRCode value={`RSE${o.number}|${o.total}|${pay.iban ?? ""}`} size={140} /><p className="text-[11px] text-cream/50">Ref. RSE{o.number}</p></div>
        </div>
      )}
      {o.payment_status === "awaiting_confirmation" && <PaymentProcessing number={o.number} total={o.total} reference={o.payment_reference} />}
      {msg && <p className="rounded-2xl bg-brand-50 p-3 text-sm text-brand-900">{msg}</p>}
      <div id="acompanhar" className="scroll-mt-24 space-y-4">{o.sub_orders.map((s) => <SubOrderCard key={s.id} s={s} onConfirm={confirm} createdAt={o.created_at} />)}</div>
      {o.sub_orders.some((x) => x.status === "delivered") && (
        <div id="avaliar" className="card scroll-mt-24 p-4">
          <p className="flex items-center gap-2 font-bold"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />Avaliar produtos recebidos</p>
          {o.sub_orders.filter((x) => x.status === "delivered").flatMap((x) => x.order_items).map((i) => (
            <div key={i.id} className="mt-3 border-t border-line pt-3">
              <div className="flex items-center justify-between gap-2"><p className="line-clamp-1 text-sm">{i.name}</p>
                {reviewed.has(i.id) ? <span className="text-xs font-semibold text-emerald-600">Avaliado</span> : writing !== i.id && <button onClick={() => setWriting(i.id)} className="text-sm font-semibold text-brand-600">Avaliar</button>}</div>
              {writing === i.id && <ReviewForm itemId={i.id} name={i.name} onDone={() => { setWriting(null); setReviewed(new Set([...reviewed, i.id])); }} />}
            </div>
          ))}
        </div>
      )}
      <div className="card space-y-1 p-4 text-sm">
        <div className="flex justify-between"><span className="text-cream/60">Produtos</span><span>{kz(o.subtotal)}</span></div>
        <div className="flex justify-between"><span className="text-cream/60">Portes</span><span>{kz(o.shipping_total)}</span></div>
        <div className="flex justify-between border-t border-brand-100 pt-2 text-base font-extrabold"><span>Total</span><span className="text-brand-800">{kz(o.total)}</span></div>
        <p className="pt-2 text-xs text-cream/55">Entrega: {o.contact_name} · {o.contact_phone} · {[o.address?.street, o.address?.city, o.address?.province].filter(Boolean).join(", ")}</p>
      </div>
      {o.payment_status === "paid" && <RecoRail kind="bought_together" productId={o.sub_orders[0]?.order_items[0]?.product_id} exclude={o.sub_orders.flatMap((x) => x.order_items.map((i) => i.product_id ?? ""))} title="Complete a sua compra" subtitle="Produtos que combinam com o que comprou" />}
    </div>
  );
}
