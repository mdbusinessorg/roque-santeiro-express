import Link from "@/components/ui/native-link";
import { ArrowLeft } from "lucide-react";
import { getStores } from "@/lib/data/queries";
import { IsoMap } from "@/components/store/iso-map";

export const revalidate = 60;
export const metadata = { title: "Mapa das lojas" };

export default async function StoresMapPage() {
  const stores = await getStores();
  return (
    <div className="pt-4">
      <div className="mb-3 flex items-center gap-3 px-1">
        <Link href="/lojas" aria-label="Voltar às lojas" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-white"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="min-w-0"><h1 className="text-[22px] font-extrabold leading-tight tracking-tight">Mapa das lojas</h1><p className="text-[12px] text-ink/55">Uma cidade em miniatura. A posição de cada loja é ilustrativa.</p></div>
      </div>
      <IsoMap stores={stores} />
    </div>
  );
}
