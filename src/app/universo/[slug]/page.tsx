import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "@/components/ui/native-link";
import { getCategories, getProducts } from "@/lib/data/queries";
import { mixByStore } from "@/lib/data/mix";
import type { Universe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArcSpotlight } from "@/components/store/arc-spotlight";
import { RevealGrid } from "@/components/store/reveal-grid";
import { ProductCard } from "@/components/store/product-card";
import { DOOR_BOOT, DoorReveal, UniverseDoor } from "@/components/universe/door";

export const revalidate = 60;

const U: Record<Universe, { name: string; other: Universe; only: string; line: string; dark: boolean }> = {
  feminino: { name: "Feminino", other: "masculino", only: "Só para ela", line: "Tudo o que é para ela, de várias lojas, no mesmo sítio.", dark: false },
  masculino: { name: "Masculino", other: "feminino", only: "Só para ele", line: "Tudo o que é para ele, de várias lojas, no mesmo sítio.", dark: true },
};

export function generateStaticParams() { return [{ slug: "masculino" }, { slug: "feminino" }]; }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const u = U[(await params).slug as Universe];
  return u ? { title: `Universo ${u.name}`, description: u.line } : {};
}

export default async function UniversePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ cat?: string }> }) {
  const slug = (await params).slug as Universe;
  const u = U[slug];
  if (!u) notFound();
  const sp = await searchParams;
  const [cats, own, shared] = await Promise.all([getCategories(), getProducts({ audience: slug, limit: 60, noServices: true }), getProducts({ audience: "unissexo", limit: 120, noServices: true })]);
  const everything = [...own.products, ...mixByStore(shared.products)];
  const uCats = cats.filter((c) => everything.some((p) => p.category_id === c.id));
  const active = uCats.find((c) => c.slug === sp.cat);
  const list = active ? everything.filter((p) => p.category_id === active.id) : everything;
  const base = `/universo/${slug}`;

  return (
    <div className="pt-3">
      <script dangerouslySetInnerHTML={{ __html: DOOR_BOOT }} />
      <DoorReveal />
      <div className="door-stage origin-top">
        <section className={cn("relative overflow-hidden rounded-[2rem] px-5 pb-6 pt-7 sm:px-9 sm:py-10", u.dark ? "bg-[#111113] text-white" : "bg-[#eff6ff] text-ink")}>
          <span aria-hidden className={cn("absolute -right-16 -top-24 h-64 w-64 rounded-full blur-3xl", u.dark ? "bg-gold/25" : "bg-white/70")} />
          <span aria-hidden className="absolute bottom-0 right-6 h-[78%] w-[34%] max-w-[190px] rounded-t-full border border-gold/40" />
          <span aria-hidden className={cn("absolute bottom-0 right-10 h-[62%] w-[26%] max-w-[150px] rounded-t-full", u.dark ? "bg-slate-100" : "bg-white/70")} />
          <p className={cn("text-[10.5px] font-semibold uppercase tracking-[0.5em]", u.dark ? "text-gold-300" : "text-gold-700")}>Universo</p>
          <h1 className="mt-1 text-[46px] font-extralight leading-none tracking-[0.02em] sm:text-7xl">{u.name}</h1>
          <p className={cn("mt-3 max-w-[62%] text-[13px] leading-snug sm:max-w-sm sm:text-sm", u.dark ? "text-white/65" : "text-ink/60")}>{u.line}</p>
          <UniverseDoor universe={u.other} className={cn("relative mt-5 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-bold", u.dark ? "bg-slate-900/10 text-white ring-1 ring-white/15" : "bg-neutral-900 text-white")}>
            Ir para o Universo {U[u.other].name} <ArrowRight className="h-3.5 w-3.5" />
          </UniverseDoor>
        </section>

        <nav className="no-scrollbar sticky top-[calc(env(safe-area-inset-top)+64px)] z-30 -mx-3 mt-3 flex gap-2 overflow-x-auto bg-[#ffffff]/85 px-3 py-2 backdrop-blur-xl md:top-[118px]" aria-label={`Categorias do Universo ${u.name}`}>
          <Link href={base} className={cn("shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold", !active ? "bg-neutral-900 text-white" : "border border-slate-900/15 bg-slate-900/10 text-ink")}>Tudo misturado</Link>
          {uCats.map((c) => (
            <Link key={c.id} href={`${base}?cat=${c.slug}`} className={cn("flex shrink-0 items-center gap-1.5 rounded-full py-1.5 pl-1.5 pr-4 text-[13px] font-semibold", active?.id === c.id ? "bg-neutral-900 text-white" : "border border-slate-900/15 bg-slate-900/10 text-ink")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {c.image_url ? <img src={c.image_url} alt="" className="h-6 w-6 rounded-full bg-white object-contain p-0.5" /> : <span className="h-6 w-1" />}{c.name}
            </Link>
          ))}
        </nav>

        {!active && <ArcSpotlight products={everything.filter((p) => p.stock > 0)} label={`Universo ${u.name}`} className="mt-2" />}

        {!active && own.products.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 px-1 text-[19px] font-extrabold tracking-tight">{u.only}</h2>
            <div className="no-scrollbar -mx-3 flex snap-x gap-2.5 overflow-x-auto px-3 pb-1">
              {own.products.map((p) => <ProductCard key={p.id} p={p} compact className="w-[44%] shrink-0 snap-start sm:w-52" />)}
            </div>
          </section>
        )}

        <section className="mt-6">
          <div className="mb-3 flex items-end justify-between px-1">
            <h2 className="text-[19px] font-extrabold tracking-tight">{active ? active.name : "Descobrir"}</h2>
            <p className="text-[12px] text-ink/50">{list.length} produtos</p>
          </div>
          <RevealGrid products={list} />
        </section>
      </div>
    </div>
  );
}
