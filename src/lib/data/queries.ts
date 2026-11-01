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
    case "avaliacao": q = q.order("rating", { ascending: false }); break;
    default: q = q.order("sponsored", { ascending: false }).order("sold_count", { ascending: false });
  }
  const { data, count } = await q.range((page - 1) * limit, page * limit - 1);
  return { products: (data as Product[]) ?? [], total: count ?? 0 };
}

export async function getProduct(slug: string): Promise<Product | null> {
  const { data } = await supabasePublic().from("products").select(PRODUCT_SELECT).eq("slug", slug).eq("status", "active").maybeSingle();
  return data as Product | null;
}

export async function getStore(slug: string): Promise<Store | null> {
  const { data } = await supabasePublic().from("stores").select("*").eq("slug", slug).eq("status", "approved").maybeSingle();
  return data as Store | null;
}
