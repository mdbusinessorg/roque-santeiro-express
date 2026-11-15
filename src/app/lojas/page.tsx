import Link from "@/components/ui/native-link";
import { BadgeCheck, Map, MapPin, Package, Pill, ShoppingBasket, Shirt, Smartphone, Sofa, Sparkles, Store as StoreIcon, UtensilsCrossed, Wrench, Flame, ArrowRight } from "lucide-react";
import { getStores, getStoreShowcase } from "@/lib/data/queries";
import { STORE_TYPES, type Store } from "@/lib/types";
import { cn } from "@/lib/utils";
import { StoreAvatar } from "@/components/store/store-avatar";
import { SlideUpText } from "@/components/effects/slide-up-text";
import { FlowButton } from "@/components/effects/flow-button";
import { AnimatedGradient } from "@/components/effects/animated-gradient";

export const revalidate = 60;
export const metadata = { title: "Lojas" };

const ORDER = ["comida", "supermercado", "farmacia", "electronica", "moda", "beleza", "casa", "tabacaria", "servicos", "geral"];
const ICON: Record<string, typeof StoreIcon> = { comida: UtensilsCrossed, supermercado: ShoppingBasket, farmacia: Pill, electronica: Smartphone, moda: Shirt, beleza: Sparkles, casa: Sofa, tabacaria: Flame, servicos: Wrench, geral: StoreIcon };
const LINE: Record<string, string> = {
  comida: "Restaurantes e takeaway", supermercado: "Mercearia, fruta e legumes", farmacia: "Higiene, protecção e suplementos", electronica: "Telemóveis, computadores e som",
  moda: "Roupa, calçado e acessórios", beleza: "Cuidados e perfumaria", casa: "Casa e cozinha", tabacaria: "Tabacaria e acessórios", servicos: "Serviços ao domicílio", geral: "Um pouco de tudo",
};

export default async function StoresPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const [stores, show, sp] = await Promise.all([getStores(), getStoreShowcase(), searchParams]);
  const rank = (a: Store, b: Store) => Number(b.is_official) - Number(a.is_official) || (show[b.id]?.sold ?? 0) - (show[a.id]?.sold ?? 0) || (show[b.id]?.count ?? 0) - (show[a.id]?.count ?? 0);
  const byType = (t: string) => stores.filter((s) => (s.store_type ?? "geral") === t).sort(rank);
  const active = ORDER.includes(sp.tipo ?? "") ? sp.tipo! : null;
  const types = active ? [active] : ORDER;

  return (
    <div className="pt-5">
      <section className="relative overflow-hidden rounded-[28px] bg-ink px-5 py-7 text-white sm:px-8 sm:py-10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold/25 blur-3xl" />
        <p className="gold-text text-[11px] font-bold uppercase tracking-[0.3em]">Mercado de lojas</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl"><SlideUpText>Lojas no Roque Santeiro</SlideUpText></h1>
        <p className="mt-2 max-w-lg text-sm text-white/70">{stores.length} lojas em {ORDER.filter((t) => byType(t).length).length} tipos. Visite, compare e fale directamente com o vendedor.</p>
      </section>

      <nav className="no-scrollbar -mx-3 mt-3 flex gap-2 overflow-x-auto px-3 py-1" aria-label="Tipos de loja">
        <Link href="/lojas" className={cn("shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold", !active ? "bg-ink text-gold" : "border border-line bg-white text-ink/70")}>Todas</Link>
        {ORDER.map((t) => {
          const I = ICON[t];
          return <Link key={t} href={`/lojas?tipo=${t}`} className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold", active === t ? "bg-ink text-gold" : "border border-line bg-white text-ink/70")}><I className="h-4 w-4" />{STORE_TYPES[t]}</Link>;
        })}
      </nav>

      {types.map((t) => {
        const list = byType(t);
        const I = ICON[t];
        if (!list.length && !active) return null;
        return (
          <section key={t} className="mt-6" id={t}>
            <div className="mb-3 flex items-center gap-3 px-1">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-ink text-gold"><I className="h-5 w-5" /></span>
              <div className="min-w-0"><h2 className="text-[19px] font-extrabold leading-tight tracking-tight">{STORE_TYPES[t]}</h2><p className="truncate text-[12px] text-ink/55">{LINE[t]}</p></div>
              <span className="ml-auto text-[12px] text-ink/45">{list.length} {list.length === 1 ? "loja" : "lojas"}</span>
            </div>
            {list.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((s) => {
                  const sh = show[s.id];
                  return (
                    <Link key={s.id} href={`/loja/${s.slug}`} className="card group relative overflow-hidden p-0 transition active:scale-[0.99]">
                      <div className="relative h-28 overflow-hidden sm:h-32">
                        {s.banner_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.banner_url} alt="" loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                        ) : <AnimatedGradient />}
                        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
                        {s.is_demo && <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink/70 backdrop-blur">Demonstração</span>}
                      </div>
                      <div className="relative -mt-8 flex items-end gap-3 px-4">
                        <span className="rounded-[30%] bg-white p-1 shadow-xl ring-1 ring-gold/40"><StoreAvatar store={s} size={56} /></span>
                        <div className="min-w-0 pb-0.5">
                          <p className="flex items-center gap-1 truncate text-[16px] font-extrabold">{s.name}{s.is_official && <BadgeCheck className="h-4 w-4 shrink-0 text-gold-700" />}</p>
                          <p className="flex items-center gap-1 text-xs text-ink/55"><MapPin className="h-3.5 w-3.5" />{[s.city, s.province].filter(Boolean).join(", ")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 px-4 pb-4 pt-3">
                        <div className="flex flex-1 gap-1.5">
                          {(sh?.images ?? []).map((src, k) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={k} src={src} alt="" loading="lazy" className="h-12 w-12 rounded-2xl border border-ink/5 bg-white object-cover" />
                          ))}
                        </div>
                        <p className="flex items-center gap-1 text-xs font-bold text-ink"><Package className="h-3.5 w-3.5 text-ink/45" />{sh?.count ?? 0}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="card flex items-center justify-between gap-3 p-4"><p className="text-sm text-ink/60">Ainda sem lojas de {STORE_TYPES[t].toLowerCase()}.</p><Link href="/vender" className="shrink-0 rounded-full bg-ink px-4 py-2 text-[12.5px] font-bold text-gold">Registar a minha</Link></div>
            )}
          </section>
        );
      })}

      <div className="card mt-6 flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="font-bold">Quer a sua loja aqui?</p><p className="text-xs text-ink/55">Painel completo, estatísticas e pagamentos centralizados.</p></div>
        <FlowButton href="/vender">Tornar-se vendedor</FlowButton>
      </div>

      <Link href="/lojas/mapa" className="relative mt-4 flex items-center gap-4 overflow-hidden rounded-[28px] bg-[#cfe9f2] p-5 transition active:scale-[0.99]">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-ink shadow-lg"><Map className="h-6 w-6" /></span>
        <div className="min-w-0 flex-1"><p className="text-[17px] font-extrabold leading-tight">Ver pelo mapa</p><p className="text-[12.5px] text-ink/60">Passeie pela cidade e entre nas lojas.</p></div>
        <ArrowRight
 className="h-5 w-5 shrink-0" />
      </Link>
    </div>
  );
}
