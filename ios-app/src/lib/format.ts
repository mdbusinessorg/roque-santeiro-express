export const kz = (n: number) => `${new Intl.NumberFormat('pt-AO', { maximumFractionDigits: 0 }).format(Number(n) || 0)} Kz`;
export const pct = (p: ProductLike) => (p.compare_at_price && p.compare_at_price > p.price ? Math.round((1 - p.price / p.compare_at_price) * 100) : 0);
export type ProductLike = { price: number; compare_at_price: number | null };
export const PROVINCES = ['Bengo','Benguela','Bié','Cabinda','Cuando Cubango','Cuanza-Norte','Cuanza-Sul','Cunene','Huambo','Huíla','Luanda','Lunda-Norte','Lunda-Sul','Malanje','Moxico','Namibe','Uíge','Zaire'];
export const PAY_METHOD: Record<string, string> = { multicaixa_express: 'Multicaixa Express', transfer: 'Transferência bancária', cash_on_delivery: 'Pagamento à entrega' };
export const PAY_STATUS: Record<string, string> = { pending: 'Pagamento pendente', paid: 'Pagamento confirmado', failed: 'Pagamento falhado', refunded: 'Reembolsado' };
export const SUB_STATUS: Record<string, string> = { pending: 'Pendente', paid: 'Pago', preparing: 'A preparar', ready: 'Pronto', shipped: 'Enviado', delivered: 'Entregue', cancelled: 'Cancelado' };
export const ORDER_STATUS: Record<string, string> = { pending: 'Pendente', paid: 'Pago', preparing: 'A preparar', ready: 'Pronto', shipped: 'Enviado', delivered: 'Entregue', cancelled: 'Cancelado', refunded: 'Reembolsado' };
export const DELIVERY: Record<string, string> = { rse: 'Envio Roque Santeiro Express', seller: 'Envio pela loja', pickup: 'Levantamento na loja' };
