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

const STAGE: { img: string; cls: string; shadow: string }[] = [
  { img: "/p/tv.webp", cls: "left-[16%] top-[2%] w-[60%] z-10", shadow: "w-[70%]" },
  { img: "/p/laptop.webp", cls: "left-[0%] bottom-[8%] w-[44%] z-20", shadow: "w-[80%]" },
  { img: "/p/smartphone.webp", cls: "right-[3%] bottom-[6%] w-[25%] z-30", shadow: "w-[60%]" },
  { img: "/p/earbuds.webp", cls: "left-[47%] bottom-[-2%] w-[17%] z-40", shadow: "w-[70%]" },
  { img: "/p/sneakers.webp", cls: "right-[0%] top-[6%] hidden w-[27%] sm:block z-0", shadow: "w-[75%]" },
];
const HERO_POINTS = [
  { icon: Truck, t: "Entrega nas 18 províncias" },
  { icon: ShieldCheck, t: "Compra protegida" },
  { icon: BadgeCheck, t: "Lojas verificadas" },
];

export function Hero({ featured, all = [] }: { featured: Product[]; all?: Product[] }) {
  const pool = [...featured, ...all];
  const byImg = (src: string) => pool.find((p) => p.images?.[0] === src);
  const tags = [byImg("/p/tv.webp"), byImg("/p/smartphone.webp")];
  return (
    <section className="relative mt-3 overflow-hidden rounded-[1.75rem] border border-line bg-white shadow-[0_24px_60px_-40px_rgba(25,25,25,0.45)]">
            <div className="pointer-events-none absolute right-[8%] top-[46%] hidden h-[380px] w-[380px] -translate-y-1/2 rounded-full border border-brand-600/15 bg-[radial-gradient(circle,rgba(18,169,139,0.07),transparent_65%)] sm:block" aria-hidden />
      <div className="relative grid items-center gap-2 sm:grid-cols-[1fr_1.12fr]">
        <div className="px-5 pt-7 sm:py-14 sm:pl-12 sm:pr-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-600"><Zap className="h-3.5 w-3.5 fill-brand-600" /><SpecialText>OFERTAS DA SEMANA</SpecialText></span>
          <h1 className="mt-4 text-[31px] font-extrabold leading-[1.06] tracking-[-0.02em] text-ink sm:text-[54px]">
            <BlurReveal>O grande mercado</BlurReveal>{" "}
            <HighlightedText delay={0.6}>digital</HighlightedText>{" "}
            <BlurReveal delay={0.3}>de Angola</BlurReveal>
          </h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink/65 sm:text-base">Milhares de produtos de lojas angolanas num só carrinho. Pague com Multicaixa Express ou transferência e receba em casa.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <FlowButton href="/pesquisa?ofertas=1">Ver ofertas</FlowButton>
            <Link href="/vender" className="btn border border-line bg-white text-ink hover:border-brand-300 hover:text-brand-600">Abrir a minha loja</Link>
          </div>
          <ul className="mt-6 hidden flex-wrap gap-x-5 gap-y-2 text-[13px] font-medium text-ink/70 sm:flex">
            {HERO_POINTS.map(({ icon: I, t }) => <li key={t} className="flex items-center gap-1.5"><I className="h-4 w-4 text-brand-600" />{t}</li>)}
          </ul>
        </div>
        <div className="relative mx-auto h-[250px] w-full max-w-[460px] sm:h-[430px] sm:max-w-none">
          {STAGE.map((s) => {
            const p = byImg(s.img);
            const inner = (
              <>
                <span className={`absolute bottom-[4%] left-1/2 h-[9%] -translate-x-1/2 rounded-[50%] bg-black/20 blur-md ${s.shadow}`} aria-hidden />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.img} alt={p?.name ?? ""} className="relative aspect-square w-full object-contain mix-blend-multiply transition duration-500 group-hover:-translate-y-1.5 group-hover:scale-[1.03]" />
              </>
            );
            return p
              ? <Link key={s.img} href={`/produto/${p.slug}`} className={`group absolute ${s.cls}`}>{inner}</Link>
              : <div key={s.img} className={`group absolute ${s.cls}`}>{inner}</div>;
          })}
          {tags[0] && (
            <Link href={`/produto/${tags[0].slug}`} className="glass absolute left-[6%] top-[8%] z-50 rounded-2xl px-3 py-2 transition hover:-translate-y-0.5 sm:left-[4%] sm:top-[14%]">
              <p className="max-w-[130px] truncate text-[11px] text-ink/60">{tags[0].name}</p>
              <p className="text-sm font-extrabold text-brand-600">{kz(tags[0].price)}</p>
            </Link>
          )}
          {tags[1] && (
            <Link href={`/produto/${tags[1].slug}`} className="glass absolute bottom-[34%] right-[2%] z-50 hidden rounded-2xl px-3 py-2 transition hover:-translate-y-0.5 sm:block">
              <p className="max-w-[130px] truncate text-[11px] text-ink/60">{tags[1].name}</p>
              <p className="text-sm font-extrabold text-brand-600">{kz(tags[1].price)}</p>
            </Link>
          )}
        </div>
      </div>
      <div className="relative overflow-hidden text-white">
        <AnimatedGradient />
        <div className="relative flex items-center justify-between gap-3 px-5 py-3 sm:px-12">
          <p className="text-[13px] font-semibold sm:text-sm">Até <b className="text-base sm:text-lg">-40%</b> em electrónica<span className="hidden sm:inline">, casa e moda</span></p>
          <Link href="/pesquisa?ofertas=1" className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-brand-600 transition active:scale-95">Comprar já</Link>
        </div>
      </div>
    </section>
  );
}

export function TrustMarquee() {
  return (
    <Marquee duration={32} className="card mt-3 rounded-2xl py-2.5" pauseOnHover>
      {trust.map(({ icon: I, t }) => <span key={t} className="flex items-center gap-2 px-5 text-[13px] font-medium text-ink/80"><I className="h-4 w-4 text-brand-600" />{t}</span>)}
    </Marquee>
  );
}

export function CategoryStrip({ cats }: { cats: Category[] }) {
  return (
    <div className="no-scrollbar -mx-3 mt-5 flex gap-3 overflow-x-auto px-3 sm:mx-0 sm:grid sm:grid-cols-9 sm:px-0">
      {cats.map((c) => (
        <Link key={c.id} href={`/categoria/${c.slug}`} className="group flex w-[74px] shrink-0 flex-col items-center gap-1.5 sm:w-auto">
          <span className="grid h-[66px] w-[66px] place-items-center overflow-hidden rounded-[1.4rem] border border-line bg-white p-2 shadow-sm transition group-hover:border-brand-300 group-hover:shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.image_url ?? ""} alt="" className="h-full w-full object-contain" />
          </span>
          <span className="line-clamp-2 text-center text-[11.5px] font-medium leading-tight text-ink/80 group-hover:text-brand-600">{c.name}</span>
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
                  <img src={p.images[0]} alt={p.name} className="aspect-square w-full rounded-xl bg-mist object-contain p-2" />
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
