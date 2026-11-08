import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { C, Card, Empty, Loading, Screen } from '../../components/ui';
import { getStores } from '../../lib/api';
import { StoreAvatar } from '../../components/store-avatar';

export default function Stores() {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getStores().then((x) => { setStores(x); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <Screen><Loading /></Screen>;
  if (!stores.length) return <Screen><Empty icon="storefront-outline" title="Sem lojas" sub="Ainda não há lojas aprovadas." /></Screen>;
  return (
    <Screen scroll={false}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}><Text style={styles.title}>Lojas</Text><Text style={styles.sub}>{stores.length} lojas verificadas</Text></View>
      <FlatList data={stores} keyExtractor={(s) => s.id} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 140 }} renderItem={({ item }) => (
        <Card onPress={() => router.push(`/loja/${item.slug}`)} style={styles.row}>
          <StoreAvatar store={item} size={64} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text numberOfLines={1} style={styles.name}>{item.name}</Text>{item.is_official ? <Ionicons name="checkmark-circle" size={15} color={C.red} /> : null}</View>
            <Text numberOfLines={1} style={styles.meta}>{[item.city, item.province].filter(Boolean).join(', ') || item.province}</Text>
            <Text style={styles.meta}>★ {Number(item.rating ?? 0).toFixed(1)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        </Card>
      )} />
    </Screen>
  );
}
const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '900', color: C.ink },
  sub: { fontSize: 12.5, color: C.muted, fontWeight: '700', marginTop: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  name: { fontSize: 15, fontWeight: '900', color: C.ink, flexShrink: 1 },
  meta: { fontSize: 11.5, color: C.muted, fontWeight: '700', marginTop: 3 },
});
