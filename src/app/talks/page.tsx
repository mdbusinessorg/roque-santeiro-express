import { getProducts } from "@/lib/data/queries";
import { mixByStore } from "@/lib/data/mix";
import { TalksHub } from "@/components/talks/talks-hub";

export const revalidate = 120;
export const metadata = { title: "BISNO TALKS", description: "Salas de voz ao vivo sobre os produtos do Roque Santeiro Express." };

export default async function TalksPage() {
  const { products } = await getProducts({ limit: 24, noServices: true });
  return <TalksHub products={mixByStore(products)} />;
}
