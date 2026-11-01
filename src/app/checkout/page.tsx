"use client";

import { track } from "@/lib/tracking";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SlideCommit } from "@/components/effects/slide-commit";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Store } from "lucide-react";
import { useCart } from "@/lib/cart/cart";
import { useAuth } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabase/client";
import { rpcError } from "@/lib/rpc-error";
import { DELIVERY, PAY_METHOD, PROVINCES, kz } from "@/lib/utils";

type StoreInfo = { id: string; delivery_methods: string[] };

export default function CheckoutPage() {
  const { items, subtotal, clear, ready } = useCart();
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [fees, setFees] = useState<Record<string, number>>({ rse: 2500, seller: 1500, pickup: 0 });
  const [stores, setStores] = useState<Record<string, StoreInfo>>({});
  const [delivery, setDelivery] = useState<Record<string, string>>({});
  const [f, setF] = useState({ name: "", phone: "", province: "Luanda", city: "", street: "", ref: "", notes: "" });
  const [pay, setPay] = useState("multicaixa_express");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const groups = useMemo(() => items.reduce<Record<string, typeof items>>((a, i) => { (a[i.store_id] ||= []).push(i); return a; }, {}), [items]);

  useEffect(() => { if (!loading && !user) router.replace("/entrar?next=/checkout"); }, [loading, user, router]);
  useEffect(() => { if (profile) setF((x) => ({ ...x, name: x.name || profile.full_name || "", phone: x.phone || profile.phone || "" })); }, [profile]);
  useEffect(() => { if (items.length) track("InitiateCheckout", { value: subtotal, currency: "AOA", num_items: items.reduce((a, i) => a + i.quantity, 0), content_ids: items.map((i) => i.product_id) }); }, [items.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const ids = Object.keys(groups);
    if (!ids.length) return;
    const sb = supabaseBrowser();
    sb.from("settings").select("value").eq("key", "shipping").maybeSingle().then(({ data }) => data && setFees(data.value));
    sb.from("stores").select("id,delivery_methods").in("id", ids).then(({ data }) => {
      const m: Record<string, StoreInfo> = {};
      (data ?? []).forEach((s: StoreInfo) => (m[s.id] = s));
      setStores(m);
      setDelivery((d) => { const n = { ...d }; ids.forEach((id) => { if (!n[id]) n[id] = m[id]?.delivery_methods[0] ?? "rse"; }); return n; });
    });
  }, [groups]);

  const shipping = Object.keys(groups).reduce((a, id) => a + (fees[delivery[id] ?? "rse"] ?? 0), 0);

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const { data, error } = await supabaseBrowser().rpc("place_order", {
      p_items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      p_contact_name: f.name.trim(), p_contact_phone: f.phone.trim(),
      p_address: { province: f.province, city: f.city.trim(), street: f.street.trim(), reference: f.ref.trim() },
      p_payment_method: pay, p_delivery: delivery, p_notes: f.notes.trim() || null,
    });
    setBusy(false);
    if (error) { setErr(rpcError(error)); return; }
    clear();
    router.replace(`/conta/encomendas/${data.id}?nova=1`);
  }

  if (!ready || loading) return <div className="skeleton mt-6 h-72" />;
  if (!items.length) return <div className="card mx-auto mt-8 max-w-md p-8 text-center"><p>Carrinho vazio.</p><Link href="/" className="btn-primary mt-4">Ver produtos</Link></div>;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <form id="checkout-form" onSubmit={placeOrder} className="pt-5 lg:grid lg:grid-cols-[1fr_360px] lg:gap-5">
      <div className="space-y-4">
        <h1 className="px-1 text-2xl font-extrabold tracking-tight">Finalizar compra</h1>
        <section className="card space-y-3 p-4">
          <h2 className="font-bold">1. Contacto e endereço</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Nome</label><input required value={f.name} onChange={set("name")} className="input" /></div>
            <div><label className="label">Telefone</label><input required value={f.phone} onChange={set("phone")} inputMode="tel" className="input" /></div>
            <div><label className="label">Província</label><select value={f.province} onChange={set("province")} className="input">{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select></div>
            <div><label className="label">Município / Bairro</label><input required value={f.city} onChange={set("city")} className="input" /></div>
            <div className="sm:col-span-2"><label className="label">Rua, casa, edifício</label><input required value={f.street} onChange={set("street")} className="input" /></div>
            <div className="sm:col-span-2"><label className="label">Ponto de referência</label><input value={f.ref} onChange={set("ref")} className="input" /></div>
          </div>
        </section>
        <section className="card space-y-3 p-4">
          <h2 className="font-bold">2. Entrega por loja</h2>
          {Object.entries(groups).map(([sid, g]) => (
            <div key={sid} className="rounded-2xl border border-brand-100 p-3">
              <p className="flex items-center gap-2 text-sm font-bold text-brand-800"><Store className="h-4 w-4" />{g[0].store_name} <span className="font-normal text-ink/50">· {g.length} {g.length === 1 ? "artigo" : "artigos"}</span></p>
              <div className="mt-2 grid gap-2">
                {(stores[sid]?.delivery_methods ?? ["rse"]).map((m) => (
                  <label key={m} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${delivery[sid] === m ? "border-brand-500 bg-brand-50" : "border-brand-100"}`}>
                    <input type="radio" name={`d-${sid}`} checked={delivery[sid] === m} onChange={() => setDelivery({ ...delivery, [sid]: m })} className="accent-brand-600" />
                    <span className="flex-1">{DELIVERY[m]}</span><span className="font-semibold">{fees[m] ? kz(fees[m]) : "Grátis"}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </section>
        <section className="card space-y-2 p-4">
          <h2 className="font-bold">3. Pagamento</h2>
          {Object.entries(PAY_METHOD).filter(([k]) => k !== "manual").map(([k, l]) => (
            <label key={k} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${pay === k ? "border-brand-500 bg-brand-50" : "border-brand-100"}`}>
              <input type="radio" name="pay" checked={pay === k} onChange={() => setPay(k)} className="accent-brand-600" />{l}
            </label>
          ))}
          <p className="text-xs text-ink/55">A encomenda fica pendente até o pagamento ser verificado pela nossa equipa. Nunca marcamos pagamentos como pagos sem confirmação.</p>
          <textarea value={f.notes} onChange={set("notes")} placeholder="Notas para a entrega (opcional)" className="input min-h-20" />
        </section>
      </div>
      <aside className="card mt-4 h-fit space-y-2 p-4 lg:sticky lg:top-36 lg:mt-12">
        <div className="flex justify-between text-sm"><span className="text-ink/60">Produtos</span><span>{kz(subtotal)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-ink/60">Portes ({Object.keys(groups).length} {Object.keys(groups).length === 1 ? "loja" : "lojas"})</span><span>{kz(shipping)}</span></div>
        <div className="flex justify-between border-t border-brand-100 pt-2 text-lg font-extrabold"><span>Total</span><span className="text-brand-800">{kz(subtotal + shipping)}</span></div>
        {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        <div className="lg:hidden"><SlideCommit label="Deslize para encomendar" doneLabel="Encomenda criada" errorLabel="Verifique os dados" disabled={busy} onConfirm={() => { const fm = document.getElementById("checkout-form") as HTMLFormElement | null; if (!fm?.reportValidity()) return false; fm.requestSubmit(); }} /></div>
        <button disabled={busy} className="btn-primary hidden h-12 w-full lg:inline-flex">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}Confirmar encomenda</button>
      </aside>
    </form>
  );
}
