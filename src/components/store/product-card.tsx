import Link from "next/link";
import { BadgeCheck, Star } from "lucide-react";
import type { Product } from "@/lib/types";
import { cn, discountPct, kz } from "@/lib/utils";

export function ProductCard({ p, compact, className }: { p: Product; compact?: boolean; className?: string }) {
  const off = discountPct(Number(p.price), p.compare_at_price ? Number(p.compare_at_price) : null);
  return (
    <Link href={`/produto/${p.slug}`} className={cn("card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 active:scale-[0.98]", className)}>
      <div className="relative aspect-square bg-gradient-to-b from-white to-brand-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.images?.[0]} alt={p.name} loading="lazy" className="h-full w-full object-contain p-3 transition duration-300 group-hover:scale-105" />
        {off > 0 && <span className="brand-gradient absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-bold text-white">-{off}%</span>}
        {p.sponsored && <span className="glass absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold text-brand-800">Patrocinado</span>}
        {p.stock <= 0 && <span className="absolute inset-x-2 bottom-2 rounded-full bg-ink/75 py-1 text-center text-[11px] font-semibold text-white">Esgotado</span>}
      </div>
      <div className={cn("flex flex-1 flex-col gap-1 p-3", compact && "p-2.5")}>
        <p className={cn("line-clamp-2 text-[13.5px] leading-snug text-ink", compact && "text-[12.5px]")}>{p.name}</p>
        {p.rating_count > 0 && (
          <p className="flex items-center gap-1 text-[11.5px] text-ink/60"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{Number(p.rating).toFixed(1)} <span>({p.rating_count})</span>{p.sold_count > 0 && <span>· {p.sold_count} vendidos</span>}</p>
        )}
        <div className="mt-auto pt-1">
          <p className="text-[16px] font-bold tracking-tight text-brand-800">{kz(p.price)}</p>
          {off > 0 && <p className="text-[11.5px] text-ink/45 line-through">{kz(p.compare_at_price)}</p>}
        </div>
        {p.stores && !compact && (
          <p className="flex items-center gap-1 truncate text-[11.5px] text-ink/55">
            {p.stores.is_official && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-brand-600" />}{p.stores.name}
          </p>
        )}
      </div>
    </Link>
  );
}

export function ProductGrid({ products, className }: { products: Product[]; className?: string }) {
  if (!products.length) return <p className="card p-8 text-center text-sm text-ink/60">Nenhum produto encontrado.</p>;
  return (
    <div className={cn("grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5", className)}>
      {products.map((p) => <ProductCard key={p.id} p={p} />)}
    </div>
  );
}

export function Section({ title, href, children, subtitle }: { title: React.ReactNode; href?: string; children: React.ReactNode; subtitle?: string }) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-end justify-between gap-3 px-1">
        <div>
          <h2 className="text-[19px] font-bold tracking-tight text-ink sm:text-2xl">{title}</h2>
          {subtitle && <p className="text-[13px] text-ink/55">{subtitle}</p>}
        </div>
        {href && <Link href={href} className="shrink-0 text-sm font-semibold text-brand-600">Ver tudo</Link>}
      </div>
      {children}
    </section>
  );
}
