import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function kz(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 0 }).format(n) + " Kz";
}

export function discountPct(price: number, compare?: number | null) {
  if (!compare || compare <= price) return 0;
  return Math.round(((compare - price) / compare) * 100);
}

export function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://roque-santeiro-express.netlify.app";

export const PROVINCES = [
  "Luanda", "Bengo", "Benguela", "Bié", "Cabinda", "Cuando", "Cubango", "Cuanza Norte", "Cuanza Sul", "Cunene",
  "Huambo", "Huíla", "Icolo e Bengo", "Lunda Norte", "Lunda Sul", "Malanje", "Moxico", "Moxico Leste", "Namibe", "Uíge", "Zaire",
];

export const SUB_STATUS: Record<string, string> = {
  new: "Nova", confirmed: "Confirmada", preparing: "Em preparação", ready: "Pronta para entrega",
  shipped: "Enviada", delivered: "Entregue", cancelled: "Cancelada", returned: "Devolvida",
};
export const PAY_STATUS: Record<string, string> = {
  pending: "Pendente", awaiting_confirmation: "A aguardar confirmação", paid: "Pago",
  failed: "Falhado", refunded: "Reembolsado", partially_refunded: "Parcialmente reembolsado",
};
export const PAY_METHOD: Record<string, string> = {
  multicaixa_express: "Multicaixa Express", transfer: "Transferência bancária",
  cash_on_delivery: "Pagamento na entrega", manual: "Pagamento manual",
};
export const DELIVERY: Record<string, string> = {
  rse: "Rede logística Roque Santeiro Express", seller: "Entrega pelo vendedor", pickup: "Levantamento na loja",
};
export const STORE_STATUS: Record<string, string> = {
  pending: "Pendente de aprovação", info_requested: "Informação adicional pedida", approved: "Aprovada",
  rejected: "Rejeitada", suspended: "Suspensa",
};
