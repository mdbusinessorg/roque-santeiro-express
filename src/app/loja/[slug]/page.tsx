import Link from "@/components/ui/native-link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BadgeCheck, CalendarDays, Mail, MapPin, MessageCircle, Package, Phone, ShoppingBag, Star, Truck } from "lucide-react";
import { ShareButton } from "@/components/store/share-button";
import { ProductCard } from "@/components/store/product-card";
import { getCategories, getProducts, getStore } from "@/lib/data/queries";
import { DELIVERY, SITE_URL } from "@/lib/utils";
import { ProductGrid } from "@/components/store/product-card";
import { StoreAvatar } from "@/components/store/store-avatar";
import { AnimatedGradient } from "@/components/effects/animated-gradient";
import { BlurReveal } from "@/components/effects/blur-reveal";
import { QRCode } from "@/components/effects/qr-code";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const s = await getStore((await params).slug);
  return s ? { title: s.name, description: s.description ?? undefined } : {};
}

export default async function StorePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ cat?: string; ordem?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const store = await getStore(slug);
  if (!store) notFound();
  const [cats, { products, total }, all] = await Promise.all([
    getCategories(),
    getProducts({ store: store.id, category: sp.cat, sort: sp.ordem, limit: 40 }),
    getProducts({ store: store.id, limit: 200 }),
  ]);
  const storeCats = cats.filter((c) => all.products.some((p) => p.category_id === c.id));
  const url = `${SITE_URL}/loja/${store.slug}`;
  const sold = all.products.reduce((a, p) => a + (p.sold_count ?? 0), 0);
  const rc = all.products.reduce((a, p) => a + (p.rating_count ?? 0), 0);
  const avg = rc ? all.products.reduce((a, p) => a + Number(p.rating) * (p.rating_count ?? 0), 0) / rc : 0;
  const highlights = [...all.products].sort((a, b) => (b.sold_count - a.sold_count) || (+new Date(b.created_at) - +new Date(a.created_at))).slice(0, 4);
  const stats: [typeof Package, string, string][] = [[Package, String(all.total), "produtos"], ...(sold > 0 ? [[ShoppingBag, String(sold), "vendidos"] as [typeof Package, string, string]] : []), ...(rc > 0 ? [[Star, avg.toFixed(1), `${rc} avaliações`] as [typeof Package, string, string]] : []), [CalendarDays, String(new Date(store.created_at).getFullYear()), "no Roque Santeiro"]];

  return (
    <div className="pt-3">
      <section className="card relative overflow-hidden p-0">
        <div className="relative h-44 sm:h-64">
          {store.banner_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.banner_url} alt="" fetchPriority="high" className="h-full w-full object-cover" />
          ) : <AnimatedGradient />}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
          <div className="absolute inset-x-4 bottom-4 flex items-end gap-3 text-white sm:inset-x-6">
            <span className="rounded-[30%] bg-white p-1 shadow-2xl ring-2 ring-gold/50"><StoreAvatar store={store} size={84} /></span>
            <div className="min-w-0 pb-1">
              {store.is_official ? <span className="gold-text text-[11px] font-bold uppercase tracking-[0.25em]">Loja oficial</span> : <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">Loja verificada</span>}
              <h1 className="flex items-center gap-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
                <BlurReveal>{store.name}</BlurReveal><BadgeCheck className="h-5 w-5 shrink-0 text-gold" />
              </h1>
              <p className="flex items-center gap-1 text-[13px] text-white/75"><MapPin className="h-4 w-4" />{[store.city, store.province].filter(Boolean).join(", ")}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-px bg-ink/5">
          {stats.map(([I, v, l]) => (
            <div key={l} className="flex flex-1 basis-[calc(50%-1px)] items-center gap-2.5 bg-white px-4 py-3 sm:basis-0">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-ink/[0.04]"><I className="h-4 w-4 text-gold-700" /></span>
              <span><b className="block text-base leading-tight">{v}</b><span className="text-[11px] text-ink/55">{l}</span></span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-6">
          {store.description && <p className="flex-1 text-sm text-ink/75">{store.description}</p>}
          <div className="flex flex-wrap gap-2">
            {store.whatsapp && <a href={`https://wa.me/${store.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="btn-primary"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
            {store.phone && <a href={`tel:${store.phone.replace(/\s/g, "")}`} className="btn-ghost"><Phone className="h-4 w-4" />Ligar</a>}
            <ShareButton title={store.name} url={url} />
          </div>
        </div>
      </section>

      {highlights.length > 0 && !sp.cat && (
        <section className="mt-5">
          <h2 className="mb-2 px-1 text-lg font-extrabold">{sold > 0 ? "Mais vendidos da loja" : "Novidades da loja"}</h2>
          <div className="no-scrollbar -mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-1">
            {highlights.map((p) => <div key={p.id} className="w-[44%] shrink-0 snap-start sm:w-56"><ProductCard p={p} /></div>)}
          </div>
        </section>
      )}

      <div className="no-scrollbar sticky top-[calc(env(safe-area-inset-top)+64px)] z-30 -mx-3 mt-5 flex gap-2 overflow-x-auto bg-white/80 px-3 py-2 backdrop-blur-xl md:top-[118px]">
        <Link href={`/loja/${store.slug}`} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${!sp.cat ? "bg-ink text-white" : "bg-ink/[0.05] text-ink/70"}`}>Todos</Link>
        {storeCats.map((c) => (
          <Link key={c.id} href={`/loja/${store.slug}?cat=${c.id}`} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${sp.cat === c.id ? "bg-ink text-white" : "bg-ink/[0.05] text-ink/70"}`}>{c.name}</Link>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
        <div>
          <p className="mb-2 px-1 text-sm text-ink/55">{total} produtos</p>
          <ProductGrid products={products} className="lg:grid-cols-4" />
        </div>
        <aside className="space-y-3">
          <div className="card space-y-2 p-4 text-sm">
            <p className="font-bold">Contactos</p>
            {store.phone && <p className="flex items-center gap-2 text-ink/70"><Phone className="h-4 w-4 text-brand-600" />{store.phone}</p>}
            {store.email && <p className="flex items-center gap-2 break-all text-ink/70"><Mail className="h-4 w-4 shrink-0 text-brand-600" />{store.email}</p>}
            {store.address && <p className="flex items-start gap-2 text-ink/70"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />{store.address}</p>}
            <p className="pt-2 font-bold">Entrega</p>
            {store.delivery_methods.map((d) => <p key={d} className="flex items-start gap-2 text-ink/70"><Truck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />{DELIVERY[d] ?? d}</p>)}
          </div>
          <div className="card flex flex-col items-center gap-2 p-4 text-center">
            <QRCode value={url} size={150} />
            <p className="text-xs text-ink/55">Partilhe esta loja: aponte a câmara para o código</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
