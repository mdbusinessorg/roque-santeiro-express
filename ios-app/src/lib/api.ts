import { sb } from './supabase';
import { PRODUCT_SELECT, type Product } from './types';

export async function getCategories() {
  const { data } = await sb.from('categories').select('*').order('sort');
  return (data ?? []) as any[];
}
export async function getStores() {
  const { data } = await sb.from('stores').select('*').eq('status', 'approved').order('is_official', { ascending: false }).order('created_at', { ascending: false });
  return (data ?? []) as any[];
}
export async function getStore(slug: string) {
  const { data } = await sb.from('stores').select('*').eq('slug', slug).eq('status', 'approved').maybeSingle();
  return data as any;
}
export async function getProducts(opts: { q?: string; category?: string; store?: string; sort?: string; deals?: boolean; featured?: boolean; min?: number; max?: number; limit?: number; page?: number } = {}) {
  let q = sb.from('products').select(PRODUCT_SELECT, { count: 'exact' }).eq('status', 'active').eq('stores.status', 'approved');
  if (opts.q) q = q.or(`name.ilike.%${opts.q}%,description.ilike.%${opts.q}%,brand.ilike.%${opts.q}%`);
  if (opts.category) q = q.eq('category_id', opts.category);
  if (opts.store) q = q.eq('store_id', opts.store);
  if (opts.deals) q = q.not('compare_at_price', 'is', null).gt('compare_at_price', 0);
  if (opts.featured) q = q.eq('featured', true);
  if (opts.min != null) q = q.gte('price', opts.min);
  if (opts.max != null) q = q.lte('price', opts.max);
  const limit = opts.limit ?? 24, page = opts.page ?? 0;
  if (opts.sort === 'price_asc') q = q.order('price', { ascending: true });
  else if (opts.sort === 'price_desc') q = q.order('price', { ascending: false });
  else if (opts.sort === 'rating') q = q.order('rating', { ascending: false, nullsFirst: false });
  else q = q.order('created_at', { ascending: false });
  const { data, count } = await q.range(page * limit, page * limit + limit - 1);
  return { products: (data ?? []) as Product[], count: count ?? 0, page, pages: Math.ceil((count ?? 0) / limit) };
}
export async function getProduct(slug: string) {
  const { data } = await sb.from('products').select(PRODUCT_SELECT).eq('slug', slug).eq('status', 'active').maybeSingle();
  return data as Product | null;
}
export async function getProductEngagement(id: string) {
  const { data } = await sb.rpc('product_engagement', { p_product: id });
  return (data ?? { views: 0, clicks: 0, carts: 0, wishlists: 0 }) as { views: number; clicks: number; carts: number; wishlists: number };
}
export async function interact(events: { kind: string; product_id?: string; query?: string }[], anon: string) {
  try { await sb.rpc('log_interactions', { p_anon: anon, p_events: events }); } catch {}
}
export async function getFavorites(userId: string) {
  const { data } = await sb.from('wishlists').select('product_id').eq('user_id', userId);
  const ids = (data ?? []).map((x: any) => x.product_id);
  if (!ids.length) return [] as Product[];
  const { data: products } = await sb.from('products').select(PRODUCT_SELECT).in('id', ids);
  return (products ?? []) as Product[];
}
export async function toggleFavorite(userId: string, productId: string, has: boolean) {
  if (has) await sb.from('wishlists').delete().eq('user_id', userId).eq('product_id', productId);
  else await sb.from('wishlists').insert({ user_id: userId, product_id: productId });
}
export async function getOrders(userId: string) {
  const { data } = await sb.from('orders').select('*, sub_orders(*, stores(id,name,slug,logo_url), order_items(*))').eq('customer_id', userId).order('created_at', { ascending: false }).limit(50);
  return (data ?? []) as any[];
}
export async function getOrder(id: string) {
  const { data } = await sb.from('orders').select('*, sub_orders(*, stores(id,name,slug,logo_url,whatsapp), order_items(*), sub_order_events(*))').eq('id', id).maybeSingle();
  return data as any;
}
export async function placeOrder(args: { items: { product_id: string; quantity: number }[]; contact_name: string; contact_phone: string; address: any; payment_method: string; delivery: Record<string, string>; notes?: string | null }) {
  const { data, error } = await sb.rpc('place_order', {
    p_items: args.items, p_contact_name: args.contact_name, p_contact_phone: args.contact_phone,
    p_address: args.address, p_payment_method: args.payment_method, p_delivery: args.delivery, p_notes: args.notes ?? null,
  });
  if (error) throw error;
  return data as { id: string; number: number };
}
export async function submitPaymentProof(orderId: string, reference: string, proofUrl: string | null) {
  const { error } = await sb.rpc('submit_payment_proof', { p_order: orderId, p_reference: reference, p_proof_url: proofUrl });
  if (error) throw error;
}
export async function confirmReceived(subId: string) {
  const { error } = await sb.rpc('confirm_received', { p_sub: subId });
  if (error) throw error;
}
export async function getShippingFees() {
  const { data } = await sb.from('settings').select('value').eq('key', 'shipping').maybeSingle();
  return (data?.value ?? {}) as Record<string, number>;
}
export async function getAddresses(userId: string) {
  const { data } = await sb.from('customer_addresses').select('*').eq('user_id', userId).order('is_default', { ascending: false }).order('created_at', { ascending: false });
  return (data ?? []) as any[];
}
export async function saveAddress(userId: string, a: any) {
  if (a.id) await sb.from('customer_addresses').update({ label: a.label, province: a.province, city: a.city, street: a.street, reference: a.reference || null, is_default: !!a.is_default }).eq('id', a.id).eq('user_id', userId);
  else await sb.from('customer_addresses').insert({ user_id: userId, label: a.label || 'Casa', province: a.province, city: a.city, street: a.street, reference: a.reference || null, is_default: !!a.is_default });
}
export async function deleteAddress(id: string) { await sb.from('customer_addresses').delete().eq('id', id); }
export async function getNotifications(userId: string) {
  const { data } = await sb.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
  return (data ?? []) as any[];
}
export async function markNotificationsRead(userId: string) {
  await sb.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null);
}
