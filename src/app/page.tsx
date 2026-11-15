import { RecoRail } from "@/components/recs/reco-rail";
import { Zap } from "lucide-react";
import { getCategories, getProducts } from "@/lib/data/queries";
import { ProductCard, ProductGrid, Section } from "@/components/store/product-card";
import { CategoryStrip, Hero, QuadCards, TrustMarquee } from "@/components/store/home-blocks";
import { FlowButton } from "@/components/effects/flow-button";
import { WordsStagger } from "@/components/effects/words-stagger";
import { ArcSpotlight } from "@/components/store/arc-spotlight";
import { FoodSpotlight } from "@/components/store/food-spotlight";
import { RevealGrid } from "@/components/store/reveal-grid";
import { UniverseEntry } from "@/components/universe/entry";
import { TalksEntry } from "@/components/talks/talks-hub";
import { mixByStore } from "@/lib/data/mix";
import { RecentlyViewed } from "@/components/store/recently-viewed";
import { Newsletter } from "@/components/store/newsletter";
import { FlexCarousel } from "@/components/effects/flex-carousel";
import { SnapShowcase } from "@/components/effects/snap-showcase";
import { kz } from "@/lib/utils";
import type { Product } from "@/lib/types";

export const revalidate = 60;

export default async function Home() {
  const [allCats, all, deals, fresh, featured, food] = await Promise.all([
    getCategories(),
    getProducts({ limit: 80, noServices: true }),
    getProducts({ deals: true, limit: 12, noServices: true }),
    getProducts({ sort: "novos", limit: 8, noServices: true }),
    getProducts({ featured: true, limit: 14, noServices: true }),
    getProducts({ storeType: "comida", limit: 16 }),
  ]);
  // Farmácia e supermercado ficam só na aba Lojas; na página inicial só a Comida tem destaque.
  const cats = allCats.filter((c) => !["farmacia", "supermercado"].includes(c.slug));
  const partnerSlugs = new Set(["gilberto-aqui-tem", "muralha-de-mortalhas"]);
  const first = (arr: Product[]) => [...arr].sort((a, b) => Number(partnerSlugs.has(b.stores?.slug ?? "")) - Number(partnerSlugs.has(a.stores?.slug ?? "")));
  const allProducts = first(all.products);
  const dealProducts = first(deals.products);
  const freshProducts = first(fresh.products);
  const featuredProducts = first(featured.products);
  const mixed = mixByStore(allProducts);

  return (
    <div className="pt-3">
      <Hero featured={featuredProducts} all={allProducts} deals={dealProducts} fresh={freshProducts} cats={cats} />
      <TrustMarquee />
      <CategoryStrip cats={cats} />
      <FoodSpotlight dishes={mixByStore(food.products)} className="mt-6" />
      <UniverseEntry />
      <TalksEntry className="mt-2.5" />
      <Section title="Em destaque" subtitle="Deslize para ver mais" href="/pesquisa">
        <ArcSpotlight products={mixed.filter((p) => p.stock > 0)} />
      </Section>
      <Section title="Para si" subtitle="Produtos de várias lojas, misturados" href="/pesquisa">
        <RevealGrid products={mixed.slice(0, 20)} />
      </Section>
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
