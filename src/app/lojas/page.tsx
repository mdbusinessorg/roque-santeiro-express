import Link from "@/components/ui/native-link";
import { ArrowRight, BadgeCheck, Cigarette, MapPin, Pill, Shirt, ShoppingBasket, Smartphone, Sofa, Sparkles, Store as StoreIcon, Star, UtensilsCrossed, Wrench } from "lucide-react";
import { getStores, getStoreShowcase } from "@/lib/data/queries";
import { STORE_TYPES, type Store } from "@/lib/types";
import { cn } from "@/lib/utils";
import { StoreAvatar } from "@/components/store/store-avatar";
import { SlideUpText } from "@/components/effects/slide-up-text";
import { FlowButton } from "@/components/effects/flow-button";
import { FollowersCount } from "@/components/store/followers-count";

export const revalidate = 60;
export const metadata = { title: "Lojas" };

const ORDER = ["comida", "supermercado", "farmacia", "electronica", "moda", "beleza", "casa", "tabacaria", "servicos", "geral"];
const ICON: Record<string, typeof StoreIcon> = { comida: UtensilsCrossed, supermercado: ShoppingBasket, farmacia: Pill, electronica: Smartphone, moda: Shirt, beleza: Sparkles, casa: Sofa, tabacaria: Cigarette, servicos: Wrench, geral: StoreIcon };
const LINE: Record<string, string> = {
  comida: "Restaurantes e takeaway", supermercado: "Mercearia, fruta e legumes", farmacia: "Higiene, protecção e suplementos", electronica: "Telemóveis, computadores e som",
  moda: "Roupa, calçado e acessórios", beleza: "Cuidados e perfumaria", casa: "Casa e cozinha", tabacaria: "Tabacaria e acessórios", servicos: "Serviços ao domicílio", geral: "Um pouco de tudo",
};

function StoreCard({ s, sh }: { s: Store; sh?: { sold: number; count: number } }) {
  const type = s.store_type ?? "geral";
  return (
    <Link href={`/loja/${s.slug}`} className="group relative flex flex-col overflow-hidden rounded-[1.8rem] border border-slate-900/10 bg-white transition hover:-translate-y-0.5 hover:border-beige/30 hover:shadow-[0_24px_44px_-24px_rgba(0,0,0,0.8)]">
      <div className="relative h-28 shrink-0 overflow-hidden bg-gradient-to-br from-[#1d4ed8] to-[#3b82f6]">
        {s.banner_url && <img src={s.banner_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105" />}
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        {s.is_demo && <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink backdrop-blur">Demonstração</span>}
        <span className="absolute -bottom-7 left-4 rounded-[30%] bg-white p-1 shadow-xl ring-1 ring-beige/40"><StoreAvatar store={s} size={56} /></span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4 pt-9">
        <p className="flex items-center gap-1.5 text-[17px] font-extrabold leading-tight tracking-tight text-ink">
          <span className="truncate">{s.name}</span>
          {!s.is_demo && s.is_official && <BadgeCheck className="h-4.5 w-4.5 shrink-0 text-beige" aria-label="Loja verificada" />}
        </p>
        <p className="line-clamp-2 text-[12.5px] leading-snug text-ink/60">{s.description || LINE[type] || STORE_TYPES[type]}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-[12px] text-ink/55">
          <span className="inline-flex items-center gap-1"><StoreIcon className="h-3.5 w-3.5" />{STORE_TYPES[type] ?? "Geral"}</span>
          {s.rating > 0 && <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-beige text-beige" />{s.rating.toFixed(1)}</span>}
          {sh && sh.count > 0 && <span>{sh.count} {sh.count === 1 ? "produto" : "produtos"}</span>}
          {sh && sh.sold > 0 && <span>{sh.sold} vendidos</span>}
          <FollowersCount storeId={s.id} />
          {(s.city || s.province) && <span className="inline-flex items-center gap-1 truncate"><MapPin className="h-3.5 w-3.5" />{[s.city, s.province].filter(Boolean).join(", ")}</span>}
        </div>
        <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-[13px] font-bold text-white transition group-hover:bg-beige">
          Visitar loja <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

export default async function StoresPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const [stores, show, sp] = await Promise.all([getStores(), getStoreShowcase(), searchParams]);
  const rank = (a: Store, b: Store) => Number(b.is_official) - Number(a.is_official) || (show[b.id]?.sold ?? 0) - (show[a.id]?.sold ?? 0) || (show[b.id]?.count ?? 0) - (show[a.id]?.count ?? 0);
  const byType = (t: string) => stores.filter((s) => (s.store_type ?? "geral") === t).sort(rank);
  const active = ORDER.includes(sp.tipo ?? "") ? sp.tipo! : null;
  const types = active ? [active] : ORDER;

  return (
    <div className="pt-5">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-900/10 bg-white px-5 py-7 sm:px-8 sm:py-10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-beige/15 blur-3xl" />
        <p className="gold-text text-[11px] font-bold uppercase tracking-[0.3em]">Mercado de lojas</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl"><SlideUpText>Lojas no Roque Santeiro</SlideUpText></h1>
        <p className="mt-2 max-w-lg text-sm text-ink/65">{stores.length} lojas em {ORDER.filter((t) => byType(t).length).length} tipos. Visite, compare e fale directamente com o vendedor.</p>
      </section>

      <nav className="no-scrollbar -mx-3 mt-3 flex gap-2 overflow-x-auto px-3 py-1" aria-label="Tipos de loja">
        <Link href="/lojas" className={cn("shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold", !active ? "bg-blue-600 text-white" : "border border-slate-900/15 bg-slate-900/10 text-ink/70")}>Todas</Link>
        {ORDER.map((t) => {
          const I = ICON[t];
          return <Link key={t} href={`/lojas?tipo=${t}`} className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold", active === t ? "bg-blue-600 text-white" : "border border-slate-900/15 bg-slate-900/10 text-ink/70")}><I className="h-3.5 w-3.5" />{STORE_TYPES[t]}</Link>;
        })}
      </nav>

      {types.map((t) => {
        const list = byType(t);
        const I = ICON[t];
        if (!list.length && !active) return null;
        return (
          <section key={t} className="mt-6" id={t}>
            <div className="mb-3 flex items-center gap-3 px-1">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-900 text-beige"><I className="h-5 w-5" /></span>
              <div className="min-w-0"><h2 className="text-[19px] font-extrabold leading-tight tracking-tight text-ink">{STORE_TYPES[t]}</h2><p className="truncate text-[12px] text-ink/55">{LINE[t]}</p></div>
              <span className="ml-auto text-[12px] text-ink/45">{list.length} {list.length === 1 ? "loja" : "lojas"}</span>
            </div>
            {list.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((s) => <StoreCard key={s.id} s={s} sh={show[s.id]} />)}
              </div>
            ) : (
              <div className="card flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink/65">Ainda sem lojas de {STORE_TYPES[t].toLowerCase()} verificadas. Seja a primeira a vender aqui.</p>
                <Link href="/vender" className="btn-ghost shrink-0 !px-4 !py-2 text-[13px]">Abrir a minha loja</Link>
              </div>
            )}
          </section>
        );
      })}

      <section className="card mt-8 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <h2 className="text-[20px] font-extrabold tracking-tight text-ink">Tem uma loja?</h2>
          <p className="mt-1 text-sm text-ink/60">Abra a sua loja grátis, publique produtos e receba encomendas de todo o país.</p>
        </div>
        <FlowButton href="/vender">Tornar-se vendedor</FlowButton>
      </section>
    </div>
  );
}
