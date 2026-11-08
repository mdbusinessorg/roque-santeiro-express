import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { C, Button, Empty, Loading, Screen } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { sb } from '../../lib/supabase';
import { getOrder } from '../../lib/api';
import { kz, ORDER_STATUS, PAY_METHOD, PAY_STATUS } from '../../lib/format';

export default function OrderDetail() {
  const { id, nova } = useLocalSearchParams<{ id: string; nova?: string }>();
  const { user } = useAuth();
  const [o, setO] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { if (!id) return; const data = await getOrder(id); setO(data); setLoading(false); }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => {
    if (!id || !user) return;
    const ch = sb.channel(`order-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sub_orders', filter: `order_id=eq.${id}` }, load)
      .subscribe();
    const t = setInterval(load, 60000);
    return () => { sb.removeChannel(ch); clearInterval(t); };
  }, [id, user?.id, load]);
  if (loading) return <Screen><Loading /></Screen>;
  if (!o) return <Screen><Empty icon="receipt-outline" title="Encomenda não encontrada" action="Voltar" onAction={() => router.back()} /></Screen>;
  const subs = o.sub_orders ?? [];
  return (
    <Screen>
      <View style={styles.head}><Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={C.ink} /></Pressable><Text style={styles.title}>Encomenda #{o.number}</Text><View style={{ width: 22 }} /></View>
      {nova ? <View style={styles.success}><Ionicons name="checkmark-circle" size={22} color={C.green} /><Text style={styles.successText}>Encomenda criada com sucesso!</Text></View> : null}
      <View style={styles.card}>
        <Text style={styles.section}>Estado</Text>
        <Text style={styles.big}>{ORDER_STATUS[o.status] ?? o.status}</Text>
        <Text style={styles.meta}>Pagamento: {PAY_STATUS[o.payment_status] ?? o.payment_status} · {PAY_METHOD[o.payment_method] ?? o.payment_method}</Text>
        {o.payment_reference ? <Text style={styles.meta}>Referência: {o.payment_reference}</Text> : null}
      </View>
      <View style={styles.card}>
        <Text style={styles.section}>Resumo</Text>
        <Text style={styles.row}><Text style={styles.muted}>Subtotal</Text><Text>{kz(o.subtotal)}</Text></Text>
        <Text style={styles.row}><Text style={styles.muted}>Portes</Text><Text>{kz(o.shipping_total)}</Text></Text>
        <Text style={[styles.row, styles.grand]}><Text>Total</Text><Text>{kz(o.total)}</Text></Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.section}>Entrega</Text>
        <Text style={styles.meta}>{o.address?.province}, {o.address?.city}, {o.address?.street}{o.address?.reference ? ` · ${o.address.reference}` : ''}</Text>
        <Text style={styles.meta}>{o.contact_name} · {o.contact_phone}</Text>
      </View>
      <Text style={styles.sectionTitle}>Lojas</Text>
      {subs.map((s: any, i: number) => <SubOrder key={s.id} sub={s} showProof={i === 0 && o.payment_status === 'pending'} />)}
    </Screen>
  );
}
function SubOrder({ sub, showProof }: { sub: any; showProof?: boolean }) {
  const { user } = useAuth();
  const [ref, setRef] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  async function submitProof() {
    if (!ref.trim() || !user) return;
    setBusy(true); setMsg(null);
    try {
      const { submitPaymentProof } = await import('../../lib/api');
      await submitPaymentProof(sub.order_id, ref.trim(), null);
      setMsg('Referência enviada. Aguardamos confirmação do pagamento.');
    } catch (e: any) { setMsg(e?.message ?? 'Erro ao enviar.'); }
    setBusy(false);
  }
  async function confirm() {
    if (!user) return;
    setBusy(true); setMsg(null);
    try {
      const { confirmReceived } = await import('../../lib/api');
      await confirmReceived(sub.id);
      setMsg('Recebimento confirmado. Obrigado!');
    } catch (e: any) { setMsg(e?.message ?? 'Erro ao confirmar.'); }
    setBusy(false);
  }
  return (
    <View style={styles.card}>
      <Text style={styles.store}>{sub.stores?.name ?? 'Loja'}</Text>
      <Text style={styles.meta}>{ORDER_STATUS[sub.status] ?? sub.status} · {kz(sub.subtotal)}</Text>
      {sub.tracking_code ? <Text style={styles.meta}>Tracking: {sub.tracking_code}{sub.carrier ? ` · ${sub.carrier}` : ''}</Text> : null}
      {(sub.order_items ?? []).map((i: any) => <Text key={i.id} style={styles.item}>• {i.quantity}x {i.name} · {kz(i.line_total)}</Text>)}
      {sub.status === 'delivered' && !sub.received_confirmed_at ? <Button title="Confirmar recebi" small onPress={confirm} disabled={busy} /> : null}
      {showProof ? <View style={{ marginTop: 10 }}><Text style={styles.label}>Referência de pagamento</Text><View style={{ flexDirection: 'row', gap: 8 }}><TextInput value={ref} onChangeText={setRef} placeholder="Ex: MCX123" placeholderTextColor="#9ca3af" style={styles.input} /><Button title="Enviar" small onPress={submitProof} disabled={busy || !ref.trim()} /></View></View> : null}
      {msg ? <Text style={styles.msg}>{msg}</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '900', color: C.ink },
  success: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ecfdf5', borderRadius: 14, padding: 12, marginBottom: 14 },
  successText: { color: C.green, fontWeight: '900' },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 14, marginBottom: 12 },
  section: { fontSize: 13, fontWeight: '900', color: C.ink, marginBottom: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: C.ink, marginTop: 14, marginBottom: 8 },
  big: { fontSize: 18, fontWeight: '900', color: C.ink },
  meta: { fontSize: 12.5, color: C.muted, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', fontSize: 13.5, color: C.ink, marginBottom: 6 },
  grand: { fontWeight: '900', fontSize: 16, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8, marginTop: 4 },
  muted: { color: C.muted },
  store: { fontSize: 15, fontWeight: '900', color: C.ink },
  item: { fontSize: 12.5, color: '#374151', marginTop: 4 },
  label: { fontSize: 11.5, fontWeight: '800', color: C.muted, marginBottom: 6 },
  input: { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, height: 40, fontSize: 13, color: C.ink },
  msg: { marginTop: 8, fontSize: 12, fontWeight: '800', color: C.green },
});
