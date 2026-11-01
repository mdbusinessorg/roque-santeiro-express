"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ProductGrid } from "@/components/store/product-card";
import type { Product } from "@/lib/types";

export default function FavoritesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Product[] | null>(null);
  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/entrar?next=/conta/favoritos"); return; }
    supabaseBrowser().from("wishlists").select("products(*, stores(id,name,slug,is_official,logo_url,province))").eq("user_id", user.id)
      .then(({ data }) => setItems(((data ?? []) as unknown as { products: Product }[]).map((w) => w.products).filter(Boolean)));
  }, [user, loading, router]);
  if (!items) return <div className="skeleton mt-6 h-60" />;
  return (
    <div className="pt-5">
      <h1 className="mb-3 px-1 text-2xl font-extrabold tracking-tight">Favoritos</h1>
      <ProductGrid products={items} />
    </div>
  );
}
