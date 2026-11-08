import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { C, Empty, Loading, Screen } from '../components/ui';
import { useAuth } from '../lib/auth';
import { getOrders } from '../lib/api';
import { kz, ORDER_STATUS, PAY_METHOD, PAY_STATUS } from '../lib/format';

export default function Orders() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    setItems(await getOrders(user.id));
    setLoading(false);
  }, [user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  if (!user) return <Screen><Empty icon="receipt-outline" title="Entre na sua conta" sub="Consulta as tuas encomendas e estados de pagamento." action="Entrar" onAction={() => router.push('/auth?next=/orders')} /></Screen>;
  if (loading) return <Screen><Loading /></Screen>;
  return (
    <Screen scroll={false}>
      <View style={styles.head}><Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={C.ink} /></Pressable><Text style={styles.title}>Encomendas</Text><View style={{ width: 22 }} /></View>
      <FlatList data={items} keyExtractor={(o) => o.id} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} ListEmptyComponent={<Empty icon="receipt-outline" title="Sem encomendas" sub="Quando comprares, as tuas encomendas aparecem aqui." action="Explorar" onAction={() => router.push('/catalog')} />} renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/order/${item.id}`)} style={styles.card}>
          <View style={styles.row}><Text style={styles.number}>#{item.number}</Text><Text style={styles.date}>{new Date(item.created_at).toLocaleDateString('pt-AO')}</Text></View>
          <Text style={styles.status}>{ORDER_STATUS[item.status] ?? item.status} · {PAY_STATUS[item.payment_status] ?? item.payment_status}</Text>
          <Text style={styles.meta}>{PAY_METHOD[item.payment_method] ?? item.payment_method} · {(item.sub_orders ?? []).length} {(item.sub_orders ?? []).length === 1 ? 'loja' : 'lojas'}</Text>
          <Text style={styles.total}>{kz(item.total)}</Text>
        </Pressable>
      )} />
    </Screen>
  );
}
const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '900', color: C.ink },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  number: { fontSize: 16, fontWeight: '900', color: C.ink },
  date: { fontSize: 11.5, color: C.muted, fontWeight: '700' },
  status: { marginTop: 6, fontSize: 13, fontWeight: '900', color: C.ink },
  meta: { marginTop: 3, fontSize: 12, color: C.muted },
  total: { marginTop: 8, fontSize: 16, fontWeight: '900', color: C.ink },
});
