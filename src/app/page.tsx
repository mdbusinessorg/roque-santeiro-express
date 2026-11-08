import Link from "@/components/ui/native-link";
import { RecoRail } from "@/components/recs/reco-rail";
import { Zap } from "lucide-react";
import { getCategories, getProducts, getStores } from "@/lib/data/queries";
import { ProductCard, ProductGrid, Section } from "@/components/store/product-card";
import { CategoryStrip, Hero, QuadCards, TrustMarquee } from "@/components/store/home-blocks";
import { FlowButton } from "@/components/effects/flow-button";
import { LogosCarousel } from "@/components/effects/logos-carousel";
import { WordsStagger } from "@/components/effects/words-stagger";
import { RecentlyViewed } from "@/components/store/recently-viewed";
import { Newsletter } from "@/components/store/newsletter";
import { StoreAvatar } from "@/components/store/store-avatar";
import { FlexCarousel } from "@/components/effects/flex-carousel";
import { SnapShowcase } from "@/components/effects/snap-showcase";
import { kz } from "@/lib/utils";
import type { Product } from "@/lib/types";

export const revalidate = 60;

export default async function Home() {
  const [cats, stores, all, deals, fresh, featured] = await Promise.all([
    getCategories(),
    getStores(),
    getProducts({ limit: 80 }),
    getProducts({ deals: true, limit: 12 }),
    getProducts({ sort: "novos", limit: 8 }),
    getProducts({ featured: true, limit: 14 }),
  ]);
  const partnerSlugs = new Set(["gilberto-aqui-tem", "muralha-de-mortalhas"]);
  const partnerStores = stores.filter((s) => partnerSlugs.has(s.slug));
  const partnerLists = await Promise.all(partnerStores.map((s) => getProducts({ store: s.id, limit: 12 })));
  const first = (arr: Product[]) => [...arr].sort((a, b) => Number(partnerSlugs.has(b.stores?.slug ?? "")) - Number(partnerSlugs.has(a.stores?.slug ?? "")));
  const allProducts = first(all.products);
  const dealProducts = first(deals.products);
  const freshProducts = first(fresh.products);
  const featuredProducts = first(featured.products);

  return (
    <div className="pt-3">
      <Hero featured={featuredProducts} all={allProducts} deals={dealProducts} fresh={freshProducts} cats={cats} />
      <TrustMarquee />
      <CategoryStrip cats={cats} />
      {partnerStores.map((s, i) => {
        const list = partnerLists[i]?.products ?? [];
        if (!list.length) return null;
        return (
          <Section key={s.id} title={s.name} subtitle="Produtos reais da loja parceira" href={`/loja/${s.slug}`}>
            <div className="no-scrollbar -mx-3 flex snap-x gap-2.5 overflow-x-auto px-3 pb-1">
              {list.map((p) => <ProductCard key={p.id} p={p} compact className="w-[42%] shrink-0 snap-start sm:w-48" />)}
            </div>
          </Section>
        );
      })}
      <QuadCards products={allProducts} />

      <Section title={<span className="flex items-center gap-2"><Zap className="h-5 w-5 fill-brand-600 text-brand-600" />Ofertas relâmpago</span>} subtitle="Descontos reais por tempo limitado" href="/pesquisa?ofertas=1">
        <div className="no-scrollbar -mx-3 flex snap-x gap-2.5 overflow-x-auto px-3 pb-1">
          {dealProducts.map((p) => <ProductCard key={p.id} p={p} compact className="w-[42%] shrink-0 snap-start sm:w-48" />)}
        </div>
      </Section>

      {featuredProducts.length >= 3 && (
        <Section title="Escolhas da semana" subtitle="Toque para ver em destaque" href="/pesquisa">
          <div className="md:hidden"><SnapShowcase items={featuredProducts.filter((p) => p.images?.[0]).slice(0, 5).map((p) => ({ src: p.images[0], alt: p.name, title: p.name, subtitle: kz(p.price), href: `/produto/${p.slug}` }))} /></div>
          <div className="hidden md:block"><FlexCarousel items={featuredProducts.filter((p) => p.images?.[0]).slice(0, 5).map((p) => ({ src: p.images[0], alt: p.name, title: p.name, subtitle: kz(p.price), href: `/produto/${p.slug}` }))} height={300} /></div>
        </Section>
      )}

      <Section title="Lojas em destaque" subtitle="Visite as lojas e compre directamente" href="/lojas">
        <div className="card flex flex-col items-center p-5">
          <LogosCarousel count={4} className="gap-3 sm:gap-10">
            {stores.concat(stores).map((s, i) => (
              <Link key={`${s.id}-${i}`} href={`/loja/${s.slug}`} className="flex w-[72px] flex-col items-center gap-1.5 sm:w-28">
                <StoreAvatar store={s} size={56} />
                <span className="line-clamp-1 text-center text-[11.5px] font-semibold text-ink/80">{s.name}</span>
              </Link>
            ))}
          </LogosCarousel>
        </div>
      </Section>

      <Section title="Produtos em destaque" href="/pesquisa"><ProductGrid products={featuredProducts} /></Section>
      {allProducts.some((x) => x.sold_count > 0) && <Section title="Mais vendidos" href="/pesquisa?ordem=vendidos"><ProductGrid products={[...allProducts].filter((x) => x.sold_count > 0).sort((a, b) => b.sold_count - a.sold_count).slice(0, 10)} /></Section>}
      <Section title="Novidades" href="/pesquisa?ordem=novos"><ProductGrid products={freshProducts} /></Section>
      <RecentlyViewed />
      <RecoRail kind="for_you" title="Recomendados para si" subtitle="Com base no que vê e compra" />
      <RecoRail kind="popular_week" title="Populares esta semana" subtitle="Mais procurados nos últimos 7 dias" />
      <RecoRail kind="top_rated" title="Mais bem avaliados" subtitle="Ranking por avaliações verificadas" href="/pesquisa?ordem=avaliacao" />

      <section className="card mt-8 overflow-hidden p-6 sm:p-10">
        <WordsStagger className="text-[22px] font-bold leading-snug tracking-tight text-ink sm:text-3xl">
          Tem uma loja? Venda para toda Angola no Roque Santeiro Express. Abra a sua loja grátis, publique produtos e receba as suas vendas.
        </WordsStagger>
        <div className="mt-5"><FlowButton href="/vender">Tornar-se vendedor</FlowButton></div>
      </section>
      <Newsletter />
    </div>
  );
}
