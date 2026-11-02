import Link from "@/components/ui/native-link";
import { BadgeCheck, MapPin, Package, Star, TrendingUp } from "lucide-react";
import { getStores, getStoreShowcase } from "@/lib/data/queries";
import { StoreAvatar } from "@/components/store/store-avatar";
import { SlideUpText } from "@/components/effects/slide-up-text";
import { FlowButton } from "@/components/effects/flow-button";
import { AnimatedGradient } from "@/components/effects/animated-gradient";

export const revalidate = 60;
export const metadata = { title: "Lojas" };

export default async function StoresPage() {
  const [stores, show] = await Promise.all([getStores(), getStoreShowcase()]);
  const ranked = [...stores].sort((a, b) => Number(b.is_official) - Number(a.is_official) || (show[b.id]?.sold ?? 0) - (show[a.id]?.sold ?? 0) || (show[b.id]?.count ?? 0) - (show[a.id]?.count ?? 0));
  const featured = ranked.slice(0, 2);
  const rest = ranked.slice(2);

  return (
    <div className="pt-5">
      <section className="relative overflow-hidden rounded-[28px] bg-ink px-5 py-7 text-white sm:px-8 sm:py-10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold/25 blur-3xl" />
        <p className="gold-text text-[11px] font-bold uppercase tracking-[0.3em]">Mercado de lojas</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl"><SlideUpText>Lojas no Roque Santeiro</SlideUpText></h1>
        <p className="mt-2 max-w-lg text-sm text-white/70">{stores.length} lojas angolanas verificadas. Visite, compare e fale directamente com o vendedor.</p>
      </section>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {featured.map((s) => {
          const sh = show[s.id];
          return (
            <Link key={s.id} href={`/loja/${s.slug}`} className="card group relative overflow-hidden p-0 transition active:scale-[0.99]">
              <div className="relative h-32 overflow-hidden sm:h-40">
                {s.banner_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.banner_url} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                ) : <AnimatedGradient />}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-ink backdrop-blur"><TrendingUp className="h-3.5 w-3.5 text-gold-700" />Em destaque</span>
              </div>
              <div className="relative -mt-9 flex items-end gap-3 px-4">
                <span className="rounded-[30%] bg-white p-1 shadow-xl ring-1 ring-gold/40"><StoreAvatar store={s} size={64} /></span>
                <div className="min-w-0 pb-1">
                  <p className="flex items-center gap-1 truncate text-lg font-extrabold">{s.name}{s.is_official && <BadgeCheck className="h-4 w-4 shrink-0 text-gold-700" />}</p>
                  <p className="flex items-center gap-1 text-xs text-ink/55"><MapPin className="h-3.5 w-3.5" />{[s.city, s.province].filter(Boolean).join(", ")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 pb-4 pt-3">
                <div className="flex flex-1 gap-1.5">
                  {(sh?.images ?? []).map((src, k) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={k} src={src} alt="" className="h-14 w-14 rounded-2xl border border-ink/5 bg-white object-contain p-1" />
                  ))}
                </div>
                <div className="text-right text-xs text-ink/60"><p className="font-bold text-ink">{sh?.count ?? 0} produtos</p>{(sh?.sold ?? 0) > 0 && <p>{sh?.sold} vendidos</p>}</div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((s) => {
          const sh = show[s.id];
          return (
            <Link key={s.id} href={`/loja/${s.slug}`} className="card flex items-center gap-3 p-4 transition active:scale-[0.98]">
              <StoreAvatar store={s} size={60} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 truncate font-bold">{s.name}{s.is_official && <BadgeCheck className="h-4 w-4 shrink-0 text-gold-700" />}</p>
                <p className="line-clamp-1 text-[13px] text-ink/60">{s.description}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink/55">
                  {Number(s.rating) > 0 && <span className="flex items-center gap-0.5"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{Number(s.rating).toFixed(1)}</span>}
                  <span className="flex items-center gap-0.5"><Package className="h-3.5 w-3.5" />{sh?.count ?? 0}</span>
                  {s.city && <span className="flex items-center gap-0.5"><MapPin className="h-3.5 w-3.5" />{s.city}</span>}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="card mt-6 flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="font-bold">Quer a sua loja aqui?</p><p className="text-xs text-ink/55">Painel completo, estatísticas e pagamentos centralizados.</p></div>
        <FlowButton href="/vender">Tornar-se vendedor</FlowButton>
      </div>
    </div>
  );
}
