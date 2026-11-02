"use client";

import { useEffect, useState } from "react";
import Link from "@/components/ui/native-link";
import { useRouter } from "next/navigation";
import { BadgePercent, Loader2, Package, Store, Upload, Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabaseBrowser, uploadMedia } from "@/lib/supabase/client";
import { rpcError } from "@/lib/rpc-error";
import { PROVINCES, STORE_STATUS, slugify } from "@/lib/utils";
import { AnimatedGradient } from "@/components/effects/animated-gradient";
import { SlideUpText } from "@/components/effects/slide-up-text";
import { HighlightedText } from "@/components/effects/highlighted-text";
import { DriftWall, type DriftItem } from "@/components/effects/drift-wall";
import { CurvedLoop } from "@/components/effects/curved-loop";

const perks = [
  { i: Store, t: "Loja pública própria", d: "Página com o seu logo, banner e produtos que qualquer pessoa pode visitar." },
  { i: Package, t: "Gestão simples", d: "Publique produtos, controle stock e encomendas pelo telemóvel." },
  { i: BadgePercent, t: "Comissão transparente", d: "Só paga uma comissão (5% por defeito) quando vende." },
  { i: Wallet, t: "Receba as suas vendas", d: "Acompanhe o saldo e peça levantamentos para o seu IBAN." },
];

export default function SellPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [existing, setExisting] = useState<{ status: string; name: string; admin_note: string | null } | null | undefined>();
  const [f, setF] = useState({ name: "", responsible: "", phone: "", whatsapp: "", email: "", province: "Luanda", city: "", address: "", description: "" });
  const [logo, setLogo] = useState<File | null>(null);
  const [doc, setDoc] = useState<File | null>(null);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [wall, setWall] = useState<DriftItem[]>([]);
  useEffect(() => {
    supabaseBrowser().from("products").select("slug,name,images").eq("status", "active").limit(16).then(({ data }) =>
      setWall((data ?? []).filter((p: { images: string[] }) => p.images?.[0]).map((p: { slug: string; name: string; images: string[] }) => ({ image: p.images[0], title: p.name, href: `/produto/${p.slug}` }))));
  }, []);

  useEffect(() => {
    if (!user) { setExisting(null); return; }
    setF((x) => ({ ...x, email: x.email || user.email || "" }));
    supabaseBrowser().from("stores").select("status,name,admin_note").eq("owner_id", user.id).maybeSingle().then(({ data }) => setExisting(data));
  }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return router.push("/entrar?next=/vender");
    setBusy(true); setErr(null);
    try {
      const [logo_url, documents_url] = await Promise.all([logo ? uploadMedia(logo, "lojas") : null, doc ? uploadMedia(doc, "documentos") : null]);
      const { error } = await supabaseBrowser().from("stores").insert({
        slug: `${slugify(f.name)}-${Math.random().toString(36).slice(2, 6)}`, name: f.name.trim(), responsible_name: f.responsible.trim(),
        phone: f.phone.trim(), whatsapp: f.whatsapp.trim(), email: f.email.trim(), province: f.province, city: f.city.trim(), address: f.address.trim(),
        description: f.description.trim(), logo_url, documents_url, terms_accepted_at: new Date().toISOString(), delivery_methods: ["seller", "rse", "pickup"],
      });
      if (error) throw error;
      router.push("/vendedor");
    } catch (e2) { setErr(rpcError(e2 as { message?: string })); }
    setBusy(false);
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="pt-3">
      <section className="relative overflow-hidden rounded-[2rem] px-5 py-12 text-white sm:px-10 sm:py-16">
        <AnimatedGradient />
        <DriftWall items={wall} className="left-[45%] opacity-60 sm:left-[52%] sm:opacity-90" tileHeight={112} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0b0b0c] via-[#0b0b0c]/70 to-transparent" />
        <div className="relative max-w-xl">
          <h1 className="text-[30px] font-extrabold leading-tight tracking-tight sm:text-5xl"><SlideUpText>Venda para toda Angola</SlideUpText></h1>
          <p className="mt-3 text-white/85">Abra a sua loja no <HighlightedText inView barClassName="bg-white/25 [background-image:none]">Roque Santeiro Express</HighlightedText> e chegue a milhares de clientes.</p>
        </div>
      </section>
      <div className="-mx-3 mt-2 text-ink/85">
        <CurvedLoop marqueeText="Venda para toda Angola ✦ Loja pública própria ✦ Comissão só quando vende ✦" shape="wave" speed={1.2} curveAmount={120} fontSize={44} fontWeight={800} edgeFade={0.15} interactive className="" separatorColor="" />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2.5 lg:grid-cols-4" id="comissoes">
        {perks.map(({ i: I, t, d }) => <div key={t} className="card p-4"><I className="h-6 w-6 text-brand-600" /><p className="mt-2 text-sm font-bold">{t}</p><p className="mt-1 text-xs text-ink/60">{d}</p></div>)}
      </div>

      <div className="mx-auto mt-6 max-w-2xl">
        {loading || existing === undefined ? <div className="skeleton h-60" /> : existing ? (
          <div className="card p-6 text-center">
            <p className="text-lg font-bold">{existing.name}</p>
            <p className="mt-1 text-sm">Estado: <b className="text-brand-700">{STORE_STATUS[existing.status]}</b></p>
            {existing.admin_note && <p className="mt-2 rounded-xl bg-brand-50 p-3 text-sm">{existing.admin_note}</p>}
            <Link href="/vendedor" className="btn-primary mt-4">Abrir painel do vendedor</Link>
          </div>
        ) : !user ? (
          <div className="card p-6 text-center"><p className="font-semibold">Crie conta ou entre para registar a sua loja.</p><Link href="/entrar?next=/vender" className="btn-primary mt-4">Entrar / Registar</Link></div>
        ) : (
          <form onSubmit={submit} className="card space-y-3 p-5">
            <h2 className="text-xl font-bold">Tornar-se vendedor</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Nome comercial</label><input required value={f.name} onChange={set("name")} className="input" /></div>
              <div><label className="label">Nome do responsável</label><input required value={f.responsible} onChange={set("responsible")} className="input" /></div>
              <div><label className="label">Telefone</label><input required value={f.phone} onChange={set("phone")} inputMode="tel" className="input" /></div>
              <div><label className="label">WhatsApp</label><input required value={f.whatsapp} onChange={set("whatsapp")} inputMode="tel" className="input" /></div>
              <div><label className="label">Email</label><input required type="email" value={f.email} onChange={set("email")} className="input" /></div>
              <div><label className="label">Província</label><select value={f.province} onChange={set("province")} className="input">{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select></div>
              <div><label className="label">Município</label><input required value={f.city} onChange={set("city")} className="input" /></div>
              <div><label className="label">Endereço</label><input value={f.address} onChange={set("address")} className="input" /></div>
            </div>
            <div><label className="label">Descrição da loja</label><textarea required value={f.description} onChange={set("description")} className="input min-h-24" /></div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="btn-ghost cursor-pointer"><Upload className="h-4 w-4" />{logo ? logo.name : "Logo da loja"}<input type="file" accept="image/*" className="hidden" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} /></label>
              <label className="btn-ghost cursor-pointer"><Upload className="h-4 w-4" />{doc ? doc.name : "Documento (NIF / alvará)"}<input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setDoc(e.target.files?.[0] ?? null)} /></label>
            </div>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" required checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 accent-brand-600" />Aceito os termos de vendedor e a comissão da plataforma.</label>
            {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
            <button disabled={busy} className="btn-primary h-12 w-full">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Enviar pedido</button>
            <p className="text-center text-xs text-ink/50">A sua loja fica “Pendente de aprovação” até a nossa equipa verificar os dados.</p>
          </form>
        )}
      </div>
    </div>
  );
}
