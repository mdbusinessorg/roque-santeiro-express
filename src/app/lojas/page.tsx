import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { getStores } from "@/lib/data/queries";
import { StoreAvatar } from "@/components/store/store-avatar";
import { SlideUpText } from "@/components/effects/slide-up-text";
import { FlowButton } from "@/components/effects/flow-button";

export const revalidate = 60;
export const metadata = { title: "Lojas" };

export default async function StoresPage() {
  const stores = await getStores();
  return (
    <div className="pt-5">
      <h1 className="px-1 text-2xl font-extrabold tracking-tight sm:text-3xl"><SlideUpText>Lojas no Roque Santeiro</SlideUpText></h1>
      <p className="mt-1 px-1 text-sm text-ink/60">Visite qualquer loja, veja os produtos e fale directamente com o vendedor.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stores.map((s) => (
          <Link key={s.id} href={`/loja/${s.slug}`} className="card flex items-center gap-3 p-4 transition active:scale-[0.98]">
            <StoreAvatar store={s} size={60} />
            <div className="min-w-0">
              <p className="truncate font-bold">{s.name}</p>
              <p className="line-clamp-2 text-[13px] text-ink/60">{s.description}</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-ink/55"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{Number(s.rating).toFixed(1)}<MapPin className="h-3.5 w-3.5" />{s.city}</p>
            </div>
          </Link>
        ))}
      </div>
      <div className="card mt-6 flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold">Quer a sua loja aqui?</p>
        <FlowButton href="/vender">Tornar-se vendedor</FlowButton>
      </div>
    </div>
  );
}
