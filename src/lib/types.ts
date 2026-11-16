export type Store = {
  id: string; owner_id: string | null; slug: string; name: string; responsible_name?: string | null;
  description: string | null; logo_url: string | null; banner_url: string | null; phone: string | null;
  whatsapp: string | null; email: string | null; province: string | null; city: string | null; address: string | null;
  status: string; admin_note: string | null; is_official: boolean; commission_rate: number | null;
  delivery_methods: string[]; rating: number; created_at: string; documents_url?: string | null; website?: string | null; store_type?: string; is_demo?: boolean; video_url?: string | null;
};
export type Category = { id: string; slug: string; name: string; parent_id: string | null; image_url: string | null; sort: number; commission_rate?: number | null };
export type Product = {
  id: string; store_id: string; category_id: string | null; slug: string; name: string; description: string | null;
  brand: string | null; sku: string | null; price: number; compare_at_price: number | null; stock: number;
  images: string[]; specs: Record<string, string>; status: string; featured: boolean; sponsored: boolean;
  sold_count: number; rating: number; rating_count: number; rank_score?: number; created_at: string; audience?: "masculino" | "feminino" | "unissexo";
  shipping_fee?: number | null; delivery_time?: string | null; video_url?: string | null;
  stores?: Pick<Store, "id" | "name" | "slug" | "is_official" | "logo_url" | "province" | "store_type" | "is_demo"> | null;
  categories?: Pick<Category, "id" | "name" | "slug"> | null;
};
export const PRODUCT_SELECT = "*, stores!inner(id,name,slug,is_official,logo_url,province,status,store_type,is_demo), categories(id,name,slug)";

export type Universe = "masculino" | "feminino";
export const STORE_TYPES: Record<string, string> = {
  comida: "Comida", supermercado: "Supermercado", farmacia: "Farmácia", electronica: "Electrónica", moda: "Moda",
  beleza: "Beleza", casa: "Casa", tabacaria: "Tabacaria", servicos: "Serviços", geral: "Geral",
};
export const TALK_TOPICS: Record<string, string> = {
  qualidade: "Qualidade", preco: "Preço", durabilidade: "Durabilidade", comparacoes: "Comparações", duvidas: "Dúvidas", experiencia: "Experiência de uso",
};
