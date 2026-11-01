import Link from "next/link";
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

export const revalidate = 60;

export default async function Home() {
  const [cats, stores, all, deals, fresh, featured] = await Promise.all([
    getCategories(),
    getStores(),
    getProducts({ limit: 60 }),
    getProducts({ deals: true, limit: 10 }),
    getProducts({ sort: "novos", limit: 5 }),
    getProducts({ featured: true, limit: 10 }),
  ]);

  return (
    <div className="pt-3">
      <Hero featured={featured.products} />
      <TrustMarquee />
      <CategoryStrip cats={cats} />
      <QuadCards products={all.products} />

      <Section title={<span className="flex items-center gap-2"><Zap className="h-5 w-5 fill-sky-400 text-sky-500" />Ofertas relâmpago</span>} subtitle="Descontos reais por tempo limitado" href="/pesquisa?ofertas=1">
        <div className="no-scrollbar -mx-3 flex snap-x gap-2.5 overflow-x-auto px-3 pb-1">
          {deals.products.map((p) => <ProductCard key={p.id} p={p} compact className="w-[42%] shrink-0 snap-start sm:w-48" />)}
        </div>
      </Section>

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

      <Section title="Produtos em destaque" href="/pesquisa"><ProductGrid products={featured.products} /></Section>
      <Section title="Mais vendidos" href="/pesquisa?ordem=vendidos"><ProductGrid products={all.products.slice(0, 10)} /></Section>
      <Section title="Novidades" href="/pesquisa?ordem=novos"><ProductGrid products={fresh.products} /></Section>
      <RecentlyViewed />

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
