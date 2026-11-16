import Link from "@/components/ui/native-link";
import { LayoutGrid } from "lucide-react";
import { getCategories } from "@/lib/data/queries";

export const revalidate = 300;
export const metadata = { title: "Categorias" };

export default async function CategoriesPage() {
  const all = await getCategories();
  const amarros = all.find((c) => c.slug === "amarros");
  const cats = all.filter((c) => c.slug !== "amarros");
  return (
    <div className="pt-5">
      <h1 className="mb-4 px-1 text-2xl font-extrabold tracking-tight">Categorias</h1>
      {amarros && (
        <Link href="/categoria/amarros" className="card mb-3 flex items-center gap-4 p-4 active:scale-[0.99]">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-neutral-950 text-white"><LayoutGrid className="h-7 w-7" /></span>
          <span className="min-w-0 flex-1">
            <b className="block text-lg font-extrabold tracking-tight">AMARROS</b>
            <span className="block text-sm text-ink/60">Produtos de particulares vendidos pela Roque Santeiro. Tem algo para vender? <b className="text-promo">Entregue à Roque</b> sem criar loja.</span>
          </span>
        </Link>
      )}
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
        {cats.map((c) => (
          <Link key={c.id} href={`/categoria/${c.slug}`} className="card flex flex-col items-center gap-2 p-3 text-center active:scale-[0.97]">
            {c.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.image_url} alt="" className="aspect-square w-full rounded-2xl bg-mist object-contain p-2" />
            ) : (
              <span className="grid aspect-square w-full place-items-center rounded-2xl bg-mist"><LayoutGrid className="h-10 w-10 text-ink/25" /></span>
            )}
            <span className="text-[12.5px] font-semibold leading-tight">{c.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
