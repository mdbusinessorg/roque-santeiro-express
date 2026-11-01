import Link from "next/link";
import { getCategories } from "@/lib/data/queries";

export const revalidate = 300;
export const metadata = { title: "Categorias" };

export default async function CategoriesPage() {
  const cats = await getCategories();
  return (
    <div className="pt-5">
      <h1 className="mb-4 px-1 text-2xl font-extrabold tracking-tight">Categorias</h1>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
        {cats.map((c) => (
          <Link key={c.id} href={`/categoria/${c.slug}`} className="card flex flex-col items-center gap-2 p-3 text-center active:scale-[0.97]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.image_url ?? ""} alt="" className="aspect-square w-full rounded-2xl bg-mist object-contain p-2" />
            <span className="text-[12.5px] font-semibold leading-tight">{c.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
