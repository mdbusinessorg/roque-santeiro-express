import type { Product } from "@/lib/types";

/** Intercala produtos de lojas diferentes para a montra ficar misturada (uma loja nunca domina uma fila). */
export function mixByStore<T extends Pick<Product, "store_id">>(products: T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const p of products) (groups.get(p.store_id) ?? groups.set(p.store_id, []).get(p.store_id)!).push(p);
  const lists = [...groups.values()].sort((a, b) => b.length - a.length);
  const out: T[] = [];
  for (let i = 0; out.length < products.length; i++) for (const l of lists) if (l[i]) out.push(l[i]);
  return out;
}
