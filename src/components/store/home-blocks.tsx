import Link from "next/link";
import { BadgeCheck, CreditCard, Headphones, ShieldCheck, Store as StoreIcon, Truck, Zap } from "lucide-react";
import type { Category, Product } from "@/lib/types";
import { kz } from "@/lib/utils";
import { AnimatedGradient } from "@/components/effects/animated-gradient";
import { BlurReveal } from "@/components/effects/blur-reveal";
import { HighlightedText } from "@/components/effects/highlighted-text";
import { FlowButton } from "@/components/effects/flow-button";
import { Marquee } from "@/components/effects/marquee";
import { SpecialText } from "@/components/effects/special-text";

const trust = [
  { icon: Truck, t: "Entrega em todas as províncias" },
  { icon: ShieldCheck, t: "Compra protegida" },
  { icon: CreditCard, t: "Multicaixa Express e transferência" },
  { icon: BadgeCheck, t: "Vendedores verificados" },
  { icon: Headphones, t: "Apoio por WhatsApp" },
  { icon: StoreIcon, t: "Centenas de lojas angolanas" },
];

export function Hero({ featured }: { featured: Product[] }) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] px-5 pb-7 pt-8 text-white sm:px-10 sm:py-14">
      <AnimatedGradient />
      <div className="relative max-w-xl">
        <span className="glass-dark inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"><Zap className="h-3.5 w-3.5 text-sky-200" /><SpecialText>OFERTAS DA SEMANA</SpecialText></span>
        <h1 className="mt-4 text-[30px] font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
          <BlurReveal>O grande mercado</BlurReveal>{" "}
          <HighlightedText delay={0.6} barClassName="bg-white/25 [background-image:none]">digital</HighlightedText>{" "}
          <BlurReveal delay={0.3}>de Angola</BlurReveal>
        </h1>
        <p className="mt-3 max-w-md text-[15px] text-white/85">Compre de várias lojas num só carrinho. Pague com Multicaixa Express ou transferência e receba em casa.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <FlowButton href="/pesquisa?ofertas=1" light>Ver ofertas</FlowButton>
          <Link href="/vender" className="glass-dark rounded-full px-5 py-3 text-sm font-semibold">Abrir a minha loja</Link>
        </div>
      </div>
      <div className="relative mt-7 grid grid-cols-3 gap-2 sm:absolute sm:right-8 sm:top-1/2 sm:mt-0 sm:w-[40%] sm:-translate-y-1/2">
        {featured.slice(0, 3).map((p) => (
          <Link key={p.id} href={`/produto/${p.slug}`} className="glass rounded-2xl p-2 text-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.images[0]} alt={p.name} className="aspect-square w-full rounded-xl bg-white object-contain p-1" />
            <p className="mt-1 truncate text-[11px] font-semibold text-brand-800">{kz(p.price)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function TrustMarquee() {
  return (
    <Marquee duration={32} className="glass mt-3 rounded-2xl py-2.5" pauseOnHover>
      {trust.map(({ icon: I, t }) => <span key={t} className="flex items-center gap-2 px-5 text-[13px] font-medium text-brand-900"><I className="h-4 w-4 text-brand-600" />{t}</span>)}
    </Marquee>
  );
}

export function CategoryStrip({ cats }: { cats: Category[] }) {
  return (
    <div className="no-scrollbar -mx-3 mt-5 flex gap-3 overflow-x-auto px-3 sm:mx-0 sm:grid sm:grid-cols-9 sm:px-0">
      {cats.map((c) => (
        <Link key={c.id} href={`/categoria/${c.slug}`} className="flex w-[74px] shrink-0 flex-col items-center gap-1.5 sm:w-auto">
          <span className="card grid h-[66px] w-[66px] place-items-center overflow-hidden rounded-[1.4rem] p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.image_url ?? ""} alt="" className="h-full w-full object-contain" />
          </span>
          <span className="line-clamp-2 text-center text-[11.5px] font-medium leading-tight text-ink/80">{c.name}</span>
        </Link>
      ))}
    </div>
  );
}

const QUADS: [string, string[]][] = [
  ["Electrónica e telemóveis", ["electronica", "telemoveis", "acessorios"]],
  ["Para a sua casa", ["casa-cozinha", "electrodomesticos"]],
  ["Moda e beleza", ["moda", "beleza"]],
  ["Informática e TV", ["informatica", "tv-audio"]],
];

export function QuadCards({ products }: { products: Product[] }) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {QUADS.map(([title, slugs]) => {
        const items = products.filter((p) => slugs.includes(p.categories?.slug ?? "")).slice(0, 4);
        return (
          <div key={title} className="card p-4">
            <h3 className="text-[16px] font-bold text-ink">{title}</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {items.map((p) => (
                <Link key={p.id} href={`/produto/${p.slug}`} className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.images[0]} alt={p.name} className="aspect-square w-full rounded-xl bg-brand-50 object-contain p-2" />
                  <p className="mt-1 line-clamp-1 text-[11.5px] text-ink/70">{p.name}</p>
                </Link>
              ))}
            </div>
            <Link href={`/categoria/${slugs[0]}`} className="mt-3 inline-block text-sm font-semibold text-brand-600">Ver mais</Link>
          </div>
        );
      })}
    </div>
  );
}
