import { notFound } from "next/navigation";
import { getCategories } from "@/lib/data/queries";
import { Catalog, type CatalogParams } from "@/components/store/catalog";
import { SlideUpText } from "@/components/effects/slide-up-text";

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<CatalogParams> }) {
  const { slug } = await params;
  const cat = (await getCategories()).find((c) => c.slug === slug);
  if (!cat) notFound();
  return (
    <div className="pt-5">
      <h1 className="mb-3 px-1 text-2xl font-extrabold tracking-tight"><SlideUpText>{cat.name}</SlideUpText></h1>
      <Catalog base={`/categoria/${slug}`} sp={await searchParams} category={cat.id} />
    </div>
  );
}
