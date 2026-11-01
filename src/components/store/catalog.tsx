import Link from "next/link";
import { getProducts } from "@/lib/data/queries";
import { ProductGrid } from "@/components/store/product-card";
import { cn } from "@/lib/utils";

export type CatalogParams = { q?: string; ordem?: string; ofertas?: string; min?: string; max?: string; pagina?: string };
const SORTS: [string, string][] = [["", "Relevância"], ["vendidos", "Mais vendidos"], ["novos", "Novidades"], ["preco_asc", "Preço ↑"], ["preco_desc", "Preço ↓"], ["avaliacao", "Avaliação"]];

export async function Catalog({ base, sp, category }: { base: string; sp: CatalogParams; category?: string }) {
  const page = Number(sp.pagina) || 1;
  const { products, total } = await getProducts({
    q: sp.q, category, sort: sp.ordem, deals: sp.ofertas === "1",
    min: Number(sp.min) || undefined, max: Number(sp.max) || undefined, page, limit: 20,
  });
  const pages = Math.max(1, Math.ceil(total / 20));
  const href = (patch: Partial<CatalogParams>) => {
    const u = new URLSearchParams();
    Object.entries({ ...sp, ...patch }).forEach(([k, v]) => v && u.set(k, String(v)));
    const s = u.toString();
    return s ? `${base}?${s}` : base;
  };
  return (
    <div>
      <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
        {SORTS.map(([v, l]) => (
          <Link key={v} href={href({ ordem: v || undefined, pagina: undefined })} className={cn("shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold", (sp.ordem ?? "") === v ? "brand-gradient text-white" : "glass text-brand-900")}>{l}</Link>
        ))}
        <Link href={href({ ofertas: sp.ofertas === "1" ? undefined : "1", pagina: undefined })} className={cn("shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold", sp.ofertas === "1" ? "brand-gradient text-white" : "glass text-brand-900")}>Com desconto</Link>
      </div>
      <form action={base} className="mt-3 flex items-center gap-2">
        {sp.q && <input type="hidden" name="q" value={sp.q} />}
        {sp.ordem && <input type="hidden" name="ordem" value={sp.ordem} />}
        {sp.ofertas && <input type="hidden" name="ofertas" value={sp.ofertas} />}
        <input name="min" inputMode="numeric" defaultValue={sp.min} placeholder="Preço mín." className="input h-10 py-2 text-sm" />
        <input name="max" inputMode="numeric" defaultValue={sp.max} placeholder="Preço máx." className="input h-10 py-2 text-sm" />
        <button className="btn-primary h-10 px-4 py-2">Filtrar</button>
      </form>
      <p className="mb-2 mt-4 px-1 text-sm text-ink/55">{total} {total === 1 ? "resultado" : "resultados"}</p>
      <ProductGrid products={products} />
      {pages > 1 && (
        <div className="mt-5 flex justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link key={n} href={href({ pagina: n === 1 ? undefined : String(n) })} className={cn("grid h-10 w-10 place-items-center rounded-full text-sm font-semibold", n === page ? "brand-gradient text-white" : "glass")}>{n}</Link>
          ))}
        </div>
      )}
    </div>
  );
}
