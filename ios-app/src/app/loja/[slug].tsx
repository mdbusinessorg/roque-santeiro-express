import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { C, Empty, Loading, ProductCard, Screen } from '../../components/ui';
import { getProducts, getStore } from '../../lib/api';
import { DELIVERY } from '../../lib/format';
import type { Product } from '../../lib/types';

export default function StorePage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const s = await getStore(slug);
      if (!s) { setLoading(false); return; }
      setStore(s);
      const res = await getProducts({ store: s.id, limit: 60 });
      setProducts(res.products);
      setLoading(false);
    })();
  }, [slug]);
  if (loading) return <Screen><Loading /></Screen>;
  if (!store) return <Screen><Empty icon="storefront-outline" title="Loja não encontrada" action="Voltar" onAction={() => router.back()} /></Screen>;
  return (
    <Screen scroll={false}>
      <View style={styles.banner}>{store.banner_url ? <Image source={{ uri: store.banner_url }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}</View>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={20} color={C.ink} /></Pressable>
        <View style={styles.logo}>{store.logo_url ? <Image source={{ uri: store.logo_url }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Ionicons name="storefront" size={26} color={C.gold} />}</View>
        <Text style={styles.name}>{store.name}</Text>
        <Text style={styles.meta}>{store.province}{store.commune ? ` · ${store.commune}` : ''} · {products.length} produtos</Text>
        {store.description ? <Text style={styles.desc}>{store.description}</Text> : null}
        <View style={styles.methods}>{store.delivery_methods.map((m: string) => <Text key={m} style={styles.method}>• {DELIVERY[m] ?? m}</Text>)}</View>
      </View>
      <FlatList data={products} keyExtractor={(p) => p.id} numColumns={2} columnWrapperStyle={{ gap: 12 }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} ListEmptyComponent={<Empty icon="cube-outline" title="Sem produtos" sub="Esta loja ainda não tem produtos activos." />} renderItem={({ item }) => <View style={{ flex: 1 }}><ProductCard p={item} /></View>} />
    </Screen>
  );
}
const styles = StyleSheet.create({
  banner: { height: 150, backgroundColor: C.ink },
  head: { paddingHorizontal: 16, marginTop: -34, alignItems: 'center' },
  back: { position: 'absolute', left: 16, top: -120, width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  logo: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff', borderWidth: 3, borderColor: C.gold, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  name: { marginTop: 10, fontSize: 21, fontWeight: '900', color: C.ink },
  meta: { marginTop: 4, fontSize: 12, color: C.muted, fontWeight: '700' },
  desc: { marginTop: 8, fontSize: 13, lineHeight: 19, color: '#374151', textAlign: 'center' },
  methods: { marginTop: 10, alignItems: 'center' },
  method: { fontSize: 12, color: C.muted, marginBottom: 2 },
});
