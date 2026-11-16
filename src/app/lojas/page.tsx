import Link from "@/components/ui/native-link";
import { Suspense } from "react";
import { StoreSearch } from "@/components/store/store-search";
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
      <div className="relative h-28 shrink-0 overflow-hidden bg-gradient-to-br from-[#262626] to-[#000000]">
        {s.banner_url && <img src={s.banner_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105" />}
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        {s.is_demo && <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink backdrop-blur">Demonstração</span>}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4 pt-2">
        <span className="-mt-9 mb-1 ml-1 w-fit rounded-[30%] bg-white p-1 shadow-xl ring-1 ring-beige/40"><StoreAvatar store={s} size={56} /></span>
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
        <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-[13px] font-bold text-white transition group-hover:bg-beige">
          Visitar loja <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export default async function StoresPage({ searchParams }: { searchParams: Promise<{ tipo?: string; q?: string }> }) {
  const [stores, show, sp] = await Promise.all([getStores(), getStoreShowcase(), searchParams]);
  const q = (sp.q ?? "").trim();
  const words = fold(q).split(/\s+/).filter(Boolean);
  const list0 = words.length
    ? stores.filter((s) => {
        const hay = fold(`${s.name} ${s.description ?? ""} ${s.city ?? ""} ${s.province ?? ""} ${STORE_TYPES[s.store_type ?? "geral"] ?? ""}`);
        return words.every((w) => hay.includes(w));
      })
    : stores;
  const official = list0.filter((x) => x.is_official);
  const rest = list0.filter((x) => !x.is_official);
  const rank = (a: Store, b: Store) => Number(b.is_official) - Number(a.is_official) || (show[b.id]?.sold ?? 0) - (show[a.id]?.sold ?? 0) || (show[b.id]?.count ?? 0) - (show[a.id]?.count ?? 0);
  const byType = (t: string) => rest.filter((s) => (s.store_type ?? "geral") === t).sort(rank);
  const active = ORDER.includes(sp.tipo ?? "") ? sp.tipo! : null;
  const types = q ? ORDER.filter((t) => byType(t).length) : active ? [active] : ORDER;

  return (
    <div className="pt-5">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-900/10 bg-white px-5 py-7 sm:px-8 sm:py-10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-beige/15 blur-3xl" />
        <p className="gold-text text-[11px] font-bold uppercase tracking-[0.3em]">Mercado de lojas</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl"><SlideUpText>Lojas no Roque Santeiro</SlideUpText></h1>
        <p className="mt-2 max-w-lg text-sm text-ink/65">{list0.length} {list0.length === 1 ? "loja" : "lojas"}{q ? ` para “${q}”` : ` em ${ORDER.filter((t) => byType(t).length).length} tipos`}. Visite, compare e fale directamente com o vendedor.</p>
      </section>

      {official.length > 0 && (
        <section className="mt-4">
          {official.map((s) => {
            const sh = show[s.id];
            return (
              <Link key={s.id} href={`/loja/${s.slug}`} className="group relative block overflow-hidden rounded-[1.8rem] bg-neutral-950 p-5 text-white shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)] transition hover:-translate-y-0.5 sm:p-6">
                <span aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-red-600/25 blur-3xl" />
                <span aria-hidden className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-gold/15 blur-3xl" />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
                  <span className="w-fit rounded-[30%] bg-white p-1.5 shadow-2xl ring-2 ring-gold/60"><StoreAvatar store={s} size={72} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-red-600 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em]">Loja oficial</span>
                      {s.is_demo && <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/80">Demonstração</span>}
                    </p>
                    <h2 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{s.name}</h2>
                    <p className="mt-1 line-clamp-2 max-w-xl text-[13px] text-white/65">{s.description || "A loja oficial do Roque Santeiro Express: produtos seleccionados, pagamento seguro e entrega em todo o país."}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-white/55">
                      <span className="inline-flex items-center gap-1"><StoreIcon className="h-3.5 w-3.5" />{STORE_TYPES[s.store_type ?? "geral"] ?? "Geral"}</span>
                      {s.rating > 0 && <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-gold text-gold" />{s.rating.toFixed(1)}</span>}
                      {sh && sh.count > 0 && <span>{sh.count} produtos</span>}
                      {sh && sh.sold > 0 && <span>{sh.sold} vendidos</span>}
                      <FollowersCount storeId={s.id} />
                      {(s.city || s.province) && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{[s.city, s.province].filter(Boolean).join(", ")}</span>}
                    </div>
                  </div>
                  <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13px] font-extrabold text-neutral-950 transition group-hover:bg-red-600 group-hover:text-white">
                    Visitar loja <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            );
          })}
        </section>
      )}

      <Suspense fallback={null}><StoreSearch /></Suspense>

      <nav className="no-scrollbar -mx-3 mt-3 flex gap-2 overflow-x-auto px-3 py-1" aria-label="Tipos de loja">
        <Link href={q ? `/lojas?q=${encodeURIComponent(q)}` : "/lojas"} className={cn("shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold", !active ? "bg-neutral-900 text-white" : "border border-slate-900/15 bg-slate-900/10 text-ink/70")}>Todas</Link>
        {ORDER.map((t) => {
          const I = ICON[t];
          return <Link key={t} href={`/lojas?tipo=${t}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold", active === t ? "bg-neutral-900 text-white" : "border border-slate-900/15 bg-slate-900/10 text-ink/70")}><I className="h-3.5 w-3.5" />{STORE_TYPES[t]}</Link>;
        })}
      </nav>

      {q && types.length === 0 && (
        <div className="card mt-6 p-6 text-center">
          <p className="text-[15px] font-bold text-ink">Nenhuma loja encontrada para “{q}”.</p>
          <p className="mt-1 text-[13px] text-ink/60">Experimenta outro nome, tipo de loja ou cidade.</p>
          <Link href="/lojas" className="btn-ghost mt-4 inline-flex !px-5 !py-2.5 text-[13px]">Ver todas as lojas</Link>
        </div>
      )}

      {types.map((t) => {
        const list = byType(t);
        const I = ICON[t];
        if (!list.length && !active) return null;
        return (
          <section key={t} className="mt-6" id={t}>
            <div className="mb-3 flex items-center gap-3 px-1">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-neutral-950 text-beige"><I className="h-5 w-5" /></span>
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
