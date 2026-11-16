import Link from "@/components/ui/native-link";
import { ArrowRight, BadgeCheck, CreditCard, Headphones, LayoutGrid, ShieldCheck, Store as StoreIcon, Truck } from "lucide-react";
import type { Category, Product } from "@/lib/types";
import { kz } from "@/lib/utils";
import { HeroSlider, type HeroSlide } from "@/components/store/hero-slider";
import { Marquee } from "@/components/effects/marquee";

const trust = [
  { icon: Truck, t: "Entrega em todas as províncias" },
  { icon: ShieldCheck, t: "Compra protegida" },
  { icon: CreditCard, t: "Multicaixa Express e transferência" },
  { icon: BadgeCheck, t: "Vendedores verificados" },
  { icon: Headphones, t: "Apoio por WhatsApp" },
  { icon: StoreIcon, t: "Centenas de lojas angolanas" },
];

const pct = (p: Product) => (p.compare_at_price && p.compare_at_price > p.price ? Math.round((1 - p.price / p.compare_at_price) * 100) : 0);
const DEAL_TITLES = ["Grande saldo!", "Oferta da semana!", "Preço especial!", "Promoção!"];

function PromoCard({ href, image, tag, title, sub, tone }: { href: string; image?: string; tag?: string; title: React.ReactNode; sub: string; tone: string }) {
  return (
    <Link href={href} className={`group relative flex min-h-[160px] flex-col overflow-hidden rounded-[1.4rem] border border-line p-3.5 transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-24px_rgba(24,24,27,0.45)] sm:p-5 lg:min-h-0 lg:flex-1 ${tone}`}>
      <span className="pointer-events-none absolute bottom-3 right-3 h-16 w-16 bg-[radial-gradient(rgba(24,24,27,0.12)_1px,transparent_1.5px)] [background-size:8px_8px]" aria-hidden />
      {tag && <span className="mb-1.5 self-start rounded-full bg-neutral-950 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-white sm:text-[10.5px]">{tag}</span>}
      <p className="relative z-10 line-clamp-2 max-w-[62%] text-[14px] font-extrabold leading-tight text-ink sm:text-lg">{title}</p>
      <p className="relative z-10 mt-1 line-clamp-1 max-w-[60%] text-[11.5px] text-ink/60 sm:text-sm">{sub}</p>
      <span className="relative z-10 mt-auto inline-flex items-center gap-1 pt-3 text-[12px] font-bold text-ink underline decoration-neutral-900/30 underline-offset-4 group-hover:text-promo sm:text-[13px]"><span className="sm:hidden">Ver</span><span className="hidden sm:inline">Comprar agora</span> <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></span>
      {/* eslint-disable-next-line @next/next/no-img-element */ image && <img src={image} alt="" className="absolute bottom-1 right-1 aspect-square w-[42%] object-contain mix-blend-multiply transition duration-500 group-hover:-translate-y-1 group-hover:scale-105 sm:bottom-2 sm:right-2 sm:w-[40%]" />}
    </Link>
  );
}

export function Hero({ featured, all = [], deals = [], fresh = [], cats = [] }: { featured: Product[]; all?: Product[]; deals?: Product[]; fresh?: Product[]; cats?: Category[] }) {
  const seen = new Set<string>();
  const pool = [...deals, ...featured, ...all].filter((p) => p.images?.[0] && p.stock > 0 && !seen.has(p.id) && !!seen.add(p.id));
  const slides: HeroSlide[] = pool.slice(0, 4).map((p, k) => ({
    href: `/produto/${p.slug}`,
    image: p.images[0],
    tag: pct(p) ? `-${pct(p)}% de desconto` : "Em destaque",
    title: pct(p) ? DEAL_TITLES[k % DEAL_TITLES.length] : "Novidade!",
    subtitle: p.name,
    price: p.price,
    compare: pct(p) ? p.compare_at_price : null,
    cta: p.brand ? `Comprar ${p.brand}` : "Comprar agora",
  }));
  const shown = new Set(slides.map((s) => s.href));
  const best = [...deals].filter((p) => p.images?.[0] && pct(p)).sort((a, b) => pct(b) - pct(a))[0];
  const nova = [...fresh, ...all].find((p) => p.images?.[0] && p.stock > 0 && !shown.has(`/produto/${p.slug}`) && p.id !== best?.id && p.category_id !== best?.category_id);

  return (
    <section className="mt-3">
      <h1 className="sr-only">Roque Santeiro Express — o grande mercado digital de Angola</h1>
      <div className="grid gap-3 lg:grid-cols-[230px_minmax(0,1fr)_290px]">
        <aside className="hidden flex-col rounded-[1.4rem] border border-line bg-white p-4 lg:flex">
          <p className="text-[15px] font-extrabold text-ink">Categorias</p>
          <span className="mb-2 mt-1.5 h-0.5 w-6 rounded-full bg-promo" />
          <nav className="flex flex-1 flex-col overflow-hidden">
            {cats.slice(0, 8).map((c) => (
              <Link key={c.id} href={`/categoria/${c.slug}`} className="group flex items-center gap-2.5 rounded-xl px-1.5 py-[7px] text-[13.5px] text-ink/75 transition hover:bg-mist hover:text-promo">
                {c.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image_url} alt="" className="h-6 w-6 shrink-0 object-contain" />
                ) : (
                  <LayoutGrid className="h-6 w-6 shrink-0 text-ink/30" />
                )}
                <span className="truncate">{c.name}</span>
              </Link>
            ))}
          </nav>
          <Link href="/categorias" className="mt-1 flex items-center gap-1 px-1.5 text-[13px] font-bold text-promo">Todas as categorias <ArrowRight className="h-3.5 w-3.5" /></Link>
        </aside>
        <HeroSlider slides={slides} />
        <div className="grid grid-cols-2 gap-3 lg:flex lg:flex-col">
          <PromoCard
            href="/pesquisa?ofertas=1"
            image={best?.images[0]}
            title={best ? <>Até <span className="text-promo">-{pct(best)}%</span> de desconto</> : "Ofertas da semana"}
            sub={best?.categories?.name ?? "Descontos reais"}
            tone="bg-[linear-gradient(135deg,#fff3f2,#fde4e2)]"
          />
          <PromoCard
            href={nova ? `/produto/${nova.slug}` : "/pesquisa?sort=new"}
            image={nova?.images[0]}
            tag="Novidade"
            title={nova?.name ?? "Acabou de chegar"}
            sub={nova ? kz(nova.price) : "Novos produtos"}
            tone="bg-[linear-gradient(135deg,#f3f4f8,#e6e8ef)]"
          />
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
  const [lead, ...rest] = cats.slice(0, 7);
  if (!lead) return null;
  return (
    <section className="mt-6" aria-label="Categorias">
      <div className="mb-3 flex items-end justify-between px-1">
        <div><h2 className="text-[19px] font-extrabold tracking-tight text-ink">Categorias</h2><p className="text-[12px] text-ink/50">Descubra por tipo</p></div>
        <Link href="/categorias" className="flex items-center gap-1 text-[13px] font-bold text-beige">Ver todas <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <Link href={`/categoria/${lead.slug}`} className="group relative col-span-2 row-span-2 flex min-h-[190px] flex-col justify-end overflow-hidden rounded-[1.8rem] border border-slate-900/10 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-[0_24px_44px_-24px_rgba(0,0,0,0.8)] sm:min-h-[260px] sm:p-5">
          <span aria-hidden className="pointer-events-none absolute -bottom-8 -right-6 h-44 w-44 rounded-full bg-beige/15 blur-2xl transition group-hover:bg-beige/25" />
          {lead.image_url && <img src={lead.image_url} alt="" className="pointer-events-none absolute bottom-3 right-3 h-[62%] w-[52%] object-contain transition duration-500 group-hover:scale-105 group-hover:-rotate-3" />}
          <p className="relative z-10 text-[10.5px] font-semibold uppercase tracking-[0.28em] text-beige">Categoria</p>
          <p className="relative z-10 mt-1 max-w-[70%] text-[22px] font-extrabold leading-tight tracking-tight text-ink sm:text-[26px]">{lead.name}</p>
          <span className="relative z-10 mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-neutral-900/10 px-3 py-1.5 text-[12px] font-bold text-ink backdrop-blur">Explorar <ArrowRight className="h-3.5 w-3.5" /></span>
        </Link>
        {rest.map((c, i) => (
          <Link key={c.id} href={`/categoria/${c.slug}`} className="group relative flex min-h-[92px] flex-col justify-end overflow-hidden rounded-[1.6rem] border border-slate-900/10 bg-white p-3.5 transition hover:-translate-y-0.5 hover:border-beige/30 sm:min-h-[124px]">
            {c.image_url && <img src={c.image_url} alt="" className="pointer-events-none absolute -bottom-2 -right-1 h-[86%] w-[48%] object-contain opacity-90 transition duration-500 group-hover:scale-105" />}
            <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
            <p className="relative z-10 text-[15px] font-extrabold leading-tight tracking-tight text-ink sm:text-[17px]">{c.name}</p>
            <p className="relative z-10 mt-0.5 text-[11px] font-medium text-ink/60">{["Descobrir", "Ver produtos", "Explorar", "Comprar", "Ver mais", "Entrar"][i % 6]}</p>
          </Link>
        ))}
      </div>
    </section>
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
