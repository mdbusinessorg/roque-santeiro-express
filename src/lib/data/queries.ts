import { supabasePublic } from "@/lib/supabase/server";
import { PRODUCT_SELECT, type Category, type Product, type Store } from "@/lib/types";

export async function getCategories(): Promise<Category[]> {
  const { data } = await supabasePublic().from("categories").select("*").order("sort");
  return (data as Category[]) ?? [];
}

export async function getStores(): Promise<Store[]> {
  const { data } = await supabasePublic().from("stores").select("*").eq("status", "approved").order("is_official", { ascending: false }).order("rating", { ascending: false });
  return (data as Store[]) ?? [];
}

type Opts = { q?: string; category?: string; store?: string; sort?: string; deals?: boolean; featured?: boolean; min?: number; max?: number; page?: number; limit?: number };

export async function getProducts(o: Opts = {}): Promise<{ products: Product[]; total: number }> {
  const limit = o.limit ?? 20;
  const page = Math.max(1, o.page ?? 1);
  let q = supabasePublic().from("products").select(PRODUCT_SELECT, { count: "exact" }).eq("status", "active").eq("stores.status", "approved");
  if (o.q) q = q.or(`name.ilike.%${o.q.replace(/[,%()]/g, " ")}%,brand.ilike.%${o.q.replace(/[,%()]/g, " ")}%`);
  if (o.category) q = q.eq("category_id", o.category);
  if (o.store) q = q.eq("store_id", o.store);
  if (o.deals) q = q.not("compare_at_price", "is", null);
  if (o.featured) q = q.eq("featured", true);
  if (o.min) q = q.gte("price", o.min);
  if (o.max) q = q.lte("price", o.max);
  switch (o.sort) {
    case "preco_asc": q = q.order("price"); break;
    case "preco_desc": q = q.order("price", { ascending: false }); break;
    case "novos": q = q.order("created_at", { ascending: false }); break;
    case "avaliacao": q = q.order("rank_score", { ascending: false }); break;
    case "vendidos": q = q.order("sold_count", { ascending: false }); break;
    default: q = q.order("rank_score", { ascending: false }).order("created_at", { ascending: false });
  }
  const { data, count } = await q.range((page - 1) * limit, page * limit - 1);
  return { products: (data as Product[]) ?? [], total: count ?? 0 };
}

export async function getProduct(slug: string): Promise<Product | null> {
  const { data } = await supabasePublic().from("products").select(PRODUCT_SELECT).eq("slug", slug).eq("status", "active").maybeSingle();
  return data as Product | null;
}

export type ProductEngagement = { views: number; clicks: number; carts: number; wishlists: number };
export async function getProductEngagement(productId: string): Promise<ProductEngagement> {
  const { data } = await supabasePublic().rpc("product_engagement", { p_product: productId });
  return (data as ProductEngagement) ?? { views: 0, clicks: 0, carts: 0, wishlists: 0 };
}

export async function getStore(slug: string): Promise<Store | null> {
  const { data } = await supabasePublic().from("stores").select("*").eq("slug", slug).eq("status", "approved").maybeSingle();
  return data as Store | null;
}

export type StoreShowcase = Record<string, { count: number; sold: number; images: string[] }>;
export async function getStoreShowcase(): Promise<StoreShowcase> {
  const { data } = await supabasePublic().from("products").select("store_id,images,sold_count").eq("status", "active").order("sold_count", { ascending: false }).limit(1000);
  const out: StoreShowcase = {};
  for (const p of (data as { store_id: string; images: string[]; sold_count: number }[]) ?? []) {
    const s = (out[p.store_id] ??= { count: 0, sold: 0, images: [] });
    s.count++; s.sold += p.sold_count ?? 0;
    if (s.images.length < 3 && p.images?.[0]) s.images.push(p.images[0]);
  }
  return out;
}
