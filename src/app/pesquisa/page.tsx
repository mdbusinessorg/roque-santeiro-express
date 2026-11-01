import { Catalog, type CatalogParams } from "@/components/store/catalog";

export const metadata = { title: "Pesquisa" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<CatalogParams> }) {
  const sp = await searchParams;
  return (
    <div className="pt-5">
      <h1 className="mb-3 px-1 text-xl font-extrabold tracking-tight sm:text-2xl">
        {sp.q ? <>Resultados para “{sp.q}”</> : sp.ofertas === "1" ? "Ofertas relâmpago" : "Todos os produtos"}
      </h1>
      <Catalog base="/pesquisa" sp={sp} />
    </div>
  );
}
