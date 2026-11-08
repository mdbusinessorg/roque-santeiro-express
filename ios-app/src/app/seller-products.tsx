import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { C, Button, Card, Empty, Loading, Screen } from '../components/ui';
import { sb } from '../lib/supabase';
import { useMyStore } from '../lib/seller';
import { kz } from '../lib/format';

const LABEL: Record<string, string> = { active: 'Activo', inactive: 'Inactivo', draft: 'Rascunho', pending_review: 'Em revisão', rejected: 'Rejeitado' };

export default function SellerProducts() {
  const { store } = useMyStore('/seller-products');
  const [items, setItems] = useState<any[] | null>(null);
  const [stats, setStats] = useState<Record<string, any>>({});
  const load = useCallback(async () => {
    if (!store) return;
    const [{ data }, { data: st }] = await Promise.all([
      sb.from('products').select('*').eq('store_id', store.id).order('created_at', { ascending: false }),
      sb.rpc('store_product_stats', { p_store: store.id }),
    ]);
    setItems((data as any[]) ?? []);
    const map: Record<string, any> = {};
    ((st as any[]) ?? []).forEach((s) => (map[s.product_id] = s));
    setStats(map);
  }, [store]);
  useEffect(() => { load(); }, [load]);

  async function toggle(p: any) {
    await sb.from('products').update({ status: p.status === 'active' ? 'inactive' : 'active' }).eq('id', p.id);
    load();
  }
  function del(p: any) {
    Alert.alert('Apagar produto', `Apagar "${p.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: async () => { await sb.from('products').delete().eq('id', p.id); load(); } },
    ]);
  }

  if (store === undefined) return <Screen><Loading /></Screen>;
  if (store === null) return <Screen><Empty icon="storefront-outline" title="Sem loja" action="Tornar-se vendedor" onAction={() => router.push('/vender')} /></Screen>;
  return (
    <Screen scroll={false}>
      <View style={styles.head}><Text style={styles.title}>Produtos</Text><Button small title="+ Novo" onPress={() => router.push('/seller-product-form')} /></View>
      {!items ? <Loading /> : items.length === 0 ? <Empty icon="cube-outline" title="Sem produtos" sub="Crie o primeiro produto da sua loja." action="Novo produto" onAction={() => router.push('/seller-product-form')} /> : (
        <FlatList data={items} keyExtractor={(p) => p.id} contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 140 }} renderItem={({ item: p }) => (
          <Card style={styles.row}>
            <View style={styles.img}>{p.images?.[0] ? <Image source={{ uri: p.images[0] }} style={{ width: 54, height: 54 }} contentFit="contain" /> : <Ionicons name="image-outline" size={24} color="#cbd5e1" />}</View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={styles.name}>{p.name}</Text>
              <Text style={styles.meta}>{kz(p.price)} · Stock {p.stock} · {p.sold_count ?? 0} vendidos</Text>
              <Text style={styles.stats}>{stats[p.id]?.views ?? 0} vistas · {stats[p.id]?.clicks ?? 0} cliques · {stats[p.id]?.wishlists ?? 0} favoritos</Text>
            </View>
            <Pressable onPress={() => toggle(p)} style={[styles.status, p.status === 'active' ? styles.statusOk : styles.statusOff]}><Text style={[styles.statusText, p.status === 'active' ? { color: '#047857' } : { color: '#1d4ed8' }]}>{LABEL[p.status] ?? p.status}</Text></Pressable>
            <Pressable onPress={() => router.push(`/seller-product-form?id=${p.id}`)} style={styles.iconBtn}><Ionicons name="create-outline" size={18} color={C.red} /></Pressable>
            <Pressable onPress={() => del(p)} style={styles.iconBtn}><Ionicons name="trash-outline" size={18} color="#b91c1c" /></Pressable>
          </Card>
        )} />
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  title: { fontSize: 24, fontWeight: '900', color: C.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  img: { width: 54, height: 54, borderRadius: 12, backgroundColor: C.mist, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  name: { fontSize: 13.5, fontWeight: '800', color: C.ink },
  meta: { fontSize: 11, color: C.muted, marginTop: 3, fontWeight: '700' },
  stats: { fontSize: 10.5, color: '#94a3b8', marginTop: 3 },
  status: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  statusOk: { backgroundColor: '#d1fae5' },
  statusOff: { backgroundColor: '#dbeafe' },
  statusText: { fontSize: 10, fontWeight: '900' },
  iconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
