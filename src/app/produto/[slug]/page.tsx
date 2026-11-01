import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BadgeCheck, MapPin, MessageCircle, RotateCcw, ShieldCheck, Star, Truck } from "lucide-react";
import { getProduct, getStore } from "@/lib/data/queries";
import { DELIVERY, discountPct, kz } from "@/lib/utils";
import { Gallery } from "@/components/store/gallery";
import { ProductActions } from "@/components/store/product-actions";
import { StoreAvatar } from "@/components/store/store-avatar";
import { TrackView } from "@/components/store/recently-viewed";
import { LeadLink, TrackEvent } from "@/components/tracking/track-event";
import { ProductReviews } from "@/components/reviews/product-reviews";
import { RecoRail } from "@/components/recs/reco-rail";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  return p ? { title: p.name, description: p.description ?? undefined, openGraph: { images: p.images } } : {};
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p || !p.stores) notFound();
  const store = await getStore(p.stores.slug);
  if (!store) notFound();
  const off = discountPct(Number(p.price), p.compare_at_price ? Number(p.compare_at_price) : null);
  const specs = Object.entries(p.specs ?? {});

  return (
    <div className="pt-3">
      <TrackView slug={p.slug} name={p.name} image={p.images[0]} price={Number(p.price)} />
      <TrackEvent name="ViewContent" data={{ content_ids: [p.id], content_type: "product", content_name: p.name, content_category: p.categories?.name, value: Number(p.price), currency: "AOA" }} productId={p.id} categoryId={p.category_id} kind="view" />
      <nav className="no-scrollbar mb-3 flex gap-1 overflow-x-auto whitespace-nowrap px-1 text-xs text-ink/55">
        <Link href="/">Início</Link><span>/</span>
        {p.categories && <><Link href={`/categoria/${p.categories.slug}`}>{p.categories.name}</Link><span>/</span></>}
        <span className="truncate text-ink/80">{p.name}</span>
      </nav>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1.1fr_1fr_0.8fr]">
        <Gallery images={p.images} name={p.name} />
        <div className="space-y-4">
          <div className="card p-4">
            {p.brand && <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">{p.brand}</p>}
            <h1 className="mt-1 text-[20px] font-bold leading-snug tracking-tight sm:text-2xl">{p.name}</h1>
            {p.rating_count > 0 && (
              <p className="mt-2 flex items-center gap-1 text-sm text-ink/60">
                {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`h-4 w-4 ${n <= Math.round(p.rating) ? "fill-amber-400 text-amber-400" : "text-ink/20"}`} />)}
                <a href="#avaliacoes" className="ml-1 hover:text-brand-600">{Number(p.rating).toFixed(1)} · {p.rating_count} avaliações{p.sold_count > 0 && ` · ${p.sold_count} vendidos`}</a>
              </p>
            )}
            <div className="mt-3 flex items-end gap-2">
              <span className="text-[28px] font-extrabold tracking-tight text-brand-800">{kz(p.price)}</span>
              {off > 0 && <><span className="pb-1 text-sm text-ink/45 line-through">{kz(p.compare_at_price)}</span><span className="brand-gradient mb-1.5 rounded-full px-2 py-0.5 text-xs font-bold text-white">-{off}%</span></>}
            </div>
            {p.sku && <p className="mt-1 text-xs text-ink/45">SKU: {p.sku}</p>}
            <div className="mt-4">
              <ProductActions item={{ product_id: p.id, slug: p.slug, name: p.name, image: p.images[0], price: Number(p.price), compare_at_price: p.compare_at_price, store_id: store.id, store_name: store.name, store_slug: store.slug, stock: p.stock }} />
            </div>
          </div>
          {p.description && <div className="card p-4"><h2 className="font-bold">Descrição</h2><p className="mt-2 whitespace-pre-line text-[14.5px] leading-relaxed text-ink/75">{p.description}</p></div>}
          {specs.length > 0 && (
            <div className="card p-4">
              <h2 className="font-bold">Especificações</h2>
              <dl className="mt-2 divide-y divide-brand-100 text-sm">
                {specs.map(([k, v]) => <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-ink/55">{k}</dt><dd className="text-right font-medium">{String(v)}</dd></div>)}
              </dl>
            </div>
          )}
        </div>
        <aside className="space-y-4">
          <Link href={`/loja/${store.slug}`} className="card flex items-center gap-3 p-4">
            <StoreAvatar store={store} size={52} />
            <div className="min-w-0">
              <p className="flex items-center gap-1 font-bold">{store.name}{store.is_official && <BadgeCheck className="h-4 w-4 text-brand-600" />}</p>
              <p className="flex items-center gap-1 text-xs text-ink/55"><MapPin className="h-3.5 w-3.5" />{store.city}, {store.province} · <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{Number(store.rating).toFixed(1)}</p>
              <p className="mt-1 text-sm font-semibold text-brand-600">Visitar loja</p>
            </div>
          </Link>
          <div className="card space-y-3 p-4 text-sm">
            <p className="font-bold">Entrega</p>
            {store.delivery_methods.map((d) => <p key={d} className="flex items-start gap-2 text-ink/70"><Truck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />{DELIVERY[d] ?? d}</p>)}
            <p className="flex items-start gap-2 text-ink/70"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />Pagamento só é confirmado após verificação</p>
            <p className="flex items-start gap-2 text-ink/70"><RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />Devolução em 7 dias se o produto chegar com defeito</p>
            {store.whatsapp && <LeadLink label="whatsapp_produto" href={`https://wa.me/${store.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá, tenho interesse em: ${p.name}`)}`} className="btn-ghost w-full"><MessageCircle className="h-4 w-4" />Perguntar ao vendedor</LeadLink>}
          </div>
        </aside>
      </div>

      <RecoRail kind="bought_together" productId={p.id} title="Compre juntamente" subtitle="Clientes também compraram ou combinam com este produto" />
      <ProductReviews productId={p.id} rating={Number(p.rating)} count={p.rating_count} storeName={store.name} />
      <RecoRail kind="similar" productId={p.id} title="Produtos semelhantes" />
      <RecoRail kind="for_you" productId={p.id} exclude={[p.id]} title="Também pode gostar" subtitle="Com base no que tem visto" />
    </div>
  );
}
