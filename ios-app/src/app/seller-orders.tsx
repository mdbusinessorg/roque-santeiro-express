import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { C, Card, Empty, Loading, Screen } from '../components/ui';
import { sb } from '../lib/supabase';
import { useMyStore } from '../lib/seller';
import { kz, DELIVERY, PAY_STATUS, SUB_STATUS } from '../lib/format';

type Row = { id: string; status: string; delivery_method: string; shipping_fee: number; subtotal: number; commission_amount: number; seller_net: number; tracking_code: string | null; carrier: string | null; estimated_delivery: string | null; created_at: string; orders: any; order_items: any[] };
const NEXT = ['confirmed', 'preparing', 'packed', 'left_store', 'handed_over', 'in_transit', 'at_hub', 'out_for_delivery', 'delivered', 'exception', 'cancelled', 'returned'];

export default function SellerOrders() {
  const { store } = useMyStore('/seller-orders');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [ship, setShip] = useState<Record<string, { carrier: string; code: string; eta: string }>>({});
  const load = useCallback(async () => {
    if (!store) return;
    const { data } = await sb.from('sub_orders').select('*, orders(number,payment_status,contact_name,contact_phone,address), order_items(id,name,quantity,line_total)').eq('store_id', store.id).order('created_at', { ascending: false });
    const list = (data as unknown as Row[]) ?? [];
    setRows(list);
    const map: Record<string, { carrier: string; code: string; eta: string }> = {};
    list.forEach((r) => (map[r.id] = { carrier: r.carrier ?? (r.delivery_method === 'seller' ? store?.name ?? '' : ''), code: r.tracking_code ?? '', eta: r.estimated_delivery ?? '' }));
    setShip(map);
  }, [store]);
  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: string) {
    const note = ['exception', 'cancelled', 'returned', 'at_hub'].includes(status) ? '' : null;
    const { error } = await sb.rpc('set_sub_order_status', { p_sub: id, p_status: status, p_note: note });
    setMsg(error ? error.message : null); load();
  }
  async function setShipping(id: string) {
    const s = ship[id] ?? { carrier: '', code: '', eta: '' };
    const { error } = await sb.rpc('set_shipping', { p_sub: id, p_carrier: s.carrier, p_code: s.code, p_eta: s.eta || null });
    setMsg(error ? error.message : 'Dados de envio guardados.'); load();
  }

  if (store === undefined) return <Screen><Loading /></Screen>;
  if (store === null) return <Screen><Empty icon="storefront-outline" title="Sem loja" action="Tornar-se vendedor" onAction={() => router.push('/vender')} /></Screen>;
  return (
    <Screen scroll={false}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}><Text style={styles.title}>Encomendas</Text></View>
      {msg ? <Text style={styles.msg}>{msg}</Text> : null}
      {!rows ? <Loading /> : rows.length === 0 ? <Empty icon="receipt-outline" title="Sem encomendas" sub="Quando um cliente comprar, a encomenda aparece aqui." /> : (
        <FlatList data={rows} keyExtractor={(r) => r.id} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 140 }} renderItem={({ item: r }) => (
          <Card style={{ padding: 14 }}>
            <View style={styles.rowBetween}><Text style={styles.orderNo}>#{r.orders?.number} · {new Date(r.created_at).toLocaleDateString('pt-AO')}</Text><Text style={[styles.pay, r.orders?.payment_status === 'paid' ? styles.payOk : styles.payWait]}>{PAY_STATUS[r.orders?.payment_status] ?? r.orders?.payment_status}</Text></View>
            {r.order_items.map((i) => <Text key={i.id} style={styles.item}>{i.quantity}× {i.name} — {kz(i.line_total)}</Text>)}
            <Text style={styles.meta}>{DELIVERY[r.delivery_method] ?? r.delivery_method} · {r.orders?.contact_name} · {[r.orders?.address?.street, r.orders?.address?.city, r.orders?.address?.province].filter(Boolean).join(', ')}</Text>
            <Text style={styles.meta}>Subtotal {kz(r.subtotal)} · Comissão −{kz(r.commission_amount)} · <Text style={{ fontWeight: '900', color: C.ink }}>A receber {kz(r.seller_net)}</Text></Text>
            <View style={styles.statusWrap}>{[r.status, ...NEXT.filter((s) => s !== r.status)].map((s) => <Pressable key={s} onPress={() => setStatus(r.id, s)} style={[styles.statusChip, r.status === s && styles.statusChipActive]}><Text style={[styles.statusChipText, r.status === s && { color: '#fff' }]}>{SUB_STATUS[s] ?? s}</Text></Pressable>)}</View>
            <View style={styles.shipRow}>
              <TextInput value={ship[r.id]?.carrier ?? ''} onChangeText={(v) => setShip({ ...ship, [r.id]: { ...ship[r.id], carrier: v } })} placeholder="Transportador" style={styles.input} />
              <TextInput value={ship[r.id]?.code ?? ''} onChangeText={(v) => setShip({ ...ship, [r.id]: { ...ship[r.id], code: v } })} placeholder="Código de seguimento" style={styles.input} />
            </View>
            <View style={styles.shipRow}>
              <TextInput value={ship[r.id]?.eta ?? ''} onChangeText={(v) => setShip({ ...ship, [r.id]: { ...ship[r.id], eta: v } })} placeholder="Previsão (AAAA-MM-DD)" style={styles.input} />
              <Pressable onPress={() => setShipping(r.id)} style={styles.shipBtn}><Text style={styles.shipBtnText}>Guardar envio</Text></Pressable>
            </View>
          </Card>
        )} />
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '900', color: C.ink },
  msg: { margin: 16, marginBottom: 0, backgroundColor: '#f0fdf4', color: '#166534', borderRadius: 12, padding: 10, fontSize: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  orderNo: { fontSize: 14, fontWeight: '900', color: C.ink },
  pay: { fontSize: 10.5, fontWeight: '900', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, overflow: 'hidden' },
  payOk: { backgroundColor: '#d1fae5', color: '#047857' },
  payWait: { backgroundColor: '#fef3c7', color: '#b45309' },
  item: { marginTop: 6, fontSize: 12.5, color: 'rgba(24,24,27,0.8)' },
  meta: { marginTop: 6, fontSize: 11.5, color: C.muted },
  statusWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  statusChip: { borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: '#fff' },
  statusChipActive: { backgroundColor: C.ink, borderColor: C.ink },
  statusChipText: { fontSize: 10.5, fontWeight: '800', color: C.ink },
  shipRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 9, fontSize: 12, color: C.ink, backgroundColor: '#fff' },
  shipBtn: { backgroundColor: C.ink, borderRadius: 12, paddingHorizontal: 12, justifyContent: 'center' },
  shipBtnText: { color: '#fff', fontSize: 11.5, fontWeight: '900' },
});
