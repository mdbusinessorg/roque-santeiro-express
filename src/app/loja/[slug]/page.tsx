import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BadgeCheck, Mail, MapPin, MessageCircle, Phone, Star, Truck } from "lucide-react";
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

  return (
    <div className="pt-3">
      <section className="relative overflow-hidden rounded-[2rem]">
        <div className="relative h-36 sm:h-52">
          {store.banner_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.banner_url} alt="" className="h-full w-full object-cover" />
          ) : <AnimatedGradient />}
        </div>
        <div className="glass relative -mt-10 mx-3 mb-3 flex flex-col gap-3 rounded-[1.6rem] p-4 sm:mx-5 sm:flex-row sm:items-center">
          <StoreAvatar store={store} size={72} />
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-1.5 text-xl font-extrabold tracking-tight sm:text-2xl">
              <BlurReveal>{store.name}</BlurReveal>{store.is_official && <BadgeCheck className="h-5 w-5 shrink-0 text-brand-600" />}
            </h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink/60">
              <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{Number(store.rating).toFixed(1)}</span>
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{[store.city, store.province].filter(Boolean).join(", ")}</span>
              <span>{all.total} produtos</span>
              {store.is_official && <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">Loja oficial</span>}
            </p>
            {store.description && <p className="mt-2 text-sm text-ink/75">{store.description}</p>}
          </div>
          <div className="flex gap-2">
            {store.whatsapp && <a href={`https://wa.me/${store.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="btn-primary"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
            {store.phone && <a href={`tel:${store.phone.replace(/\s/g, "")}`} className="btn-ghost"><Phone className="h-4 w-4" />Ligar</a>}
          </div>
        </div>
      </section>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        <Link href={`/loja/${store.slug}`} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${!sp.cat ? "brand-gradient text-white" : "glass text-brand-900"}`}>Todos</Link>
        {storeCats.map((c) => (
          <Link key={c.id} href={`/loja/${store.slug}?cat=${c.id}`} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${sp.cat === c.id ? "brand-gradient text-white" : "glass text-brand-900"}`}>{c.name}</Link>
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
