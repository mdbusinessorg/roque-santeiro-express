export const kz = (n: number) => `${new Intl.NumberFormat('pt-AO', { maximumFractionDigits: 0 }).format(Number(n) || 0)} Kz`;
export const pct = (p: ProductLike) => (p.compare_at_price && p.compare_at_price > p.price ? Math.round((1 - p.price / p.compare_at_price) * 100) : 0);
export type ProductLike = { price: number; compare_at_price: number | null };
export const PROVINCES = ['Luanda', 'Bengo', 'Benguela', 'Bié', 'Cabinda', 'Cuando Cubango', 'Cuanza-Norte', 'Cuanza-Sul', 'Cunene', 'Huambo', 'Huíla', 'Lunda-Norte', 'Lunda-Sul', 'Malanje', 'Moxico', 'Namibe', 'Uíge', 'Zaire'];
export const PAY_METHOD: Record<string, string> = { multicaixa_express: 'Multicaixa Express', transfer: 'Transferência bancária', cash_on_delivery: 'Pagamento na entrega', manual: 'Pagamento manual' };
export const PAY_STATUS: Record<string, string> = { pending: 'Pendente', awaiting_confirmation: 'A aguardar confirmação', paid: 'Pago', failed: 'Falhado', refunded: 'Reembolsado', partially_refunded: 'Parcialmente reembolsado' };
export const SUB_STATUS: Record<string, string> = {
  new: 'Encomenda recebida', confirmed: 'Confirmada pela loja', preparing: 'Em preparação', packed: 'Embalada', ready: 'Pronta para entrega',
  left_store: 'Saiu do armazém/loja', handed_over: 'Entregue ao transportador', shipped: 'Expedida', in_transit: 'Em trânsito', at_hub: 'No centro de distribuição',
  out_for_delivery: 'Saiu para entrega', delivered: 'Entregue', exception: 'Excepção na entrega', cancelled: 'Cancelada', returned: 'Devolvida',
  payment_processing: 'Pagamento em verificação', payment_confirmed: 'Pagamento confirmado', payment_failed: 'Pagamento não confirmado', refunded: 'Reembolsada',
};
export const ORDER_STATUS: Record<string, string> = SUB_STATUS;
export const DELIVERY: Record<string, string> = { rse: 'Rede logística Roque Santeiro Express', seller: 'Entrega pelo vendedor', pickup: 'Levantamento na loja' };
export const STORE_STATUS: Record<string, string> = { pending: 'Pendente de aprovação', info_requested: 'Informação adicional pedida', approved: 'Aprovada', rejected: 'Rejeitada', suspended: 'Suspensa' };
