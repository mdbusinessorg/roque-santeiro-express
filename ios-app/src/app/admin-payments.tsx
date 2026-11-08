import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { C, Card, Empty, Loading, Screen } from '../components/ui';
import { sb } from '../lib/supabase';
import { isStaff } from '../lib/seller';
import { useAuth } from '../lib/auth';
import { kz, PAY_METHOD, PAY_STATUS, SUB_STATUS } from '../lib/format';

const FILTERS = ['awaiting_confirmation', 'pending', 'paid', 'failed', 'refunded'];

export default function AdminPayments() {
  const { profile, user, loading } = useAuth();
  const [filter, setFilter] = useState('awaiting_confirmation');
  const [rows, setRows] = useState<any[] | null>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [o, p] = await Promise.all([
      sb.from('orders').select('*, sub_orders(id,status,subtotal,commission_amount,stores(name))').eq('payment_status', filter).order('created_at', { ascending: false }).limit(100),
      sb.from('payouts').select('*, stores(name)').in('status', ['pending', 'in_review', 'approved', 'processing']).order('created_at'),
    ]);
    setRows((o.data as any[]) ?? []); setPayouts((p.data as any[]) ?? []);
  }, [filter]);
  useEffect(() => { if (!loading && user && isStaff(profile?.role)) load(); }, [loading, user, profile, load]);

  async function setPay(o: any, status: string) {
    const { error } = await sb.rpc('admin_set_payment', { p_order: o.id, p_status: status });
    setMsg(error ? error.message : `#${o.number}: ${PAY_STATUS[status]}`); load();
  }

  if (loading) return <Screen><Loading /></Screen>;
  if (!user || !isStaff(profile?.role)) return <Screen><Empty icon="shield-outline" title="Sem permissão" /></Screen>;
  return (
    <Screen scroll={false}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}><Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={18} color={C.ink} /></Pressable><Text style={styles.title}>Pagamentos</Text></View>
      {payouts.length > 0 ? <Card style={{ margin: 16, padding: 14 }}><Text style={styles.panelTitle}>Pedidos de levantamento</Text>{payouts.map((p) => <View key={p.id} style={styles.payoutRow}><Text style={{ flex: 1, fontSize: 12, color: C.ink }}>{p.stores?.name} · {kz(p.amount)} · {p.iban}</Text><Pressable onPress={() => router.push('/admin-finance')} style={styles.financeBtn}><Text style={styles.financeBtnText}>Tratar</Text></Pressable></View>)}</Card> : null}
      <View style={styles.filters}>{FILTERS.map((f) => <Pressable key={f} onPress={() => setFilter(f)} style={[styles.filter, filter === f && styles.filterActive]}><Text style={[styles.filterText, filter === f && { color: '#fff' }]}>{PAY_STATUS[f]}</Text></Pressable>)}</View>
      {msg ? <Text style={styles.msg}>{msg}</Text> : null}
      {!rows ? <Loading /> : rows.length === 0 ? <Empty icon="card-outline" title="Sem encomendas neste estado" /> : (
        <FlatList data={rows} keyExtractor={(o) => o.id} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 140 }} renderItem={({ item: o }) => (
          <Card style={{ padding: 14 }}>
            <View style={styles.rowBetween}><Text style={styles.orderNo}>#{o.number} · {kz(o.total)}</Text><Text style={styles.meta}>{new Date(o.created_at).toLocaleString('pt-AO')} · {PAY_METHOD[o.payment_method] ?? o.payment_method}</Text></View>
            <Text style={styles.meta}>{o.contact_name} · {o.contact_phone}{o.payment_reference ? ` · Ref. ${o.payment_reference}` : ''}</Text>
            {o.sub_orders.map((s: any) => <Text key={s.id} style={styles.sub}>{s.stores?.name}: {kz(s.subtotal)} · comissão {kz(s.commission_amount)} · {SUB_STATUS[s.status] ?? s.status}</Text>)}
            <View style={styles.actions}>
              {o.payment_status !== 'paid' ? <Pressable onPress={() => setPay(o, 'paid')} style={styles.btnOk}><Text style={styles.btnOkText}>Confirmar pagamento</Text></Pressable> : null}
              {o.payment_status !== 'failed' && o.payment_status !== 'paid' ? <Pressable onPress={() => setPay(o, 'failed')} style={styles.btnBad}><Text style={styles.btnBadText}>Falhou</Text></Pressable> : null}
              {o.payment_status === 'paid' ? <Pressable onPress={() => setPay(o, 'refunded')} style={styles.btnWarn}><Text style={styles.btnWarnText}>Reembolsado</Text></Pressable> : null}
            </View>
          </Card>
        )} />
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: C.ink },
  panelTitle: { fontSize: 14, fontWeight: '900', color: C.ink, marginBottom: 6 },
  payoutRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: '#f1f1f2', paddingVertical: 8 },
  financeBtn: { backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  financeBtnText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 16 },
  filter: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line },
  filterActive: { backgroundColor: C.ink, borderColor: C.ink },
  filterText: { fontSize: 11.5, fontWeight: '800', color: C.ink },
  msg: { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#f0fdf4', color: '#166534', borderRadius: 12, padding: 10, fontSize: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  orderNo: { fontSize: 14, fontWeight: '900', color: C.ink },
  meta: { fontSize: 11, color: C.muted, marginTop: 4 },
  sub: { fontSize: 11.5, color: 'rgba(24,24,27,0.75)', marginTop: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  btnOk: { backgroundColor: '#047857', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  btnOkText: { color: '#fff', fontSize: 11.5, fontWeight: '900' },
  btnWarn: { backgroundColor: '#fef3c7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  btnWarnText: { color: '#92400e', fontSize: 11.5, fontWeight: '900' },
  btnBad: { backgroundColor: '#fee2e2', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  btnBadText: { color: '#b91c1c', fontSize: 11.5, fontWeight: '900' },
});
