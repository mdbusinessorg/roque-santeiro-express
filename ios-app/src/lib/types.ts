export type Store = {
  id: string; owner_id: string; slug: string; name: string; responsible_name: string; description: string;
  logo_url: string | null; banner_url: string | null; province: string; commune: string | null; address: string | null; city?: string | null;
  phone: string | null; whatsapp: string | null; email: string | null; delivery_methods: string[]; rating: number; created_at: string;
  website?: string | null; status?: string; is_official?: boolean; commission_rate?: number | null;
};
export type Category = { id: string; slug: string; name: string; parent_id: string | null; image_url: string | null; sort: number };
export type Product = {
  id: string; store_id: string; category_id: string | null; slug: string; name: string; description: string | null;
  brand: string | null; sku: string | null; price: number; compare_at_price: number | null; stock: number;
  images: string[] | null; specs: Record<string, string> | null; status: string; featured: boolean; sponsored: boolean;
  sold_count: number; rating: number; rating_count: number; created_at: string; updated_at: string;
  stores: Store; categories: Category | null;
};
export const PRODUCT_SELECT = '*, stores!inner(id,owner_id,slug,name,responsible_name,description,logo_url,banner_url,province,commune,address,phone,whatsapp,email,delivery_methods,rating,created_at,website,status), categories(id,slug,name,parent_id,image_url,sort)';
export type CartItem = { product: Product; quantity: number };
export type Address = { id?: string; label: string; province: string; city: string; street: string; reference: string };
