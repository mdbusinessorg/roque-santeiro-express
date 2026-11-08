import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { C, Empty, Loading, ProductCard, Screen } from '../components/ui';
import { useAuth } from '../lib/auth';
import { getFavorites, toggleFavorite } from '../lib/api';
import type { Product } from '../lib/types';

export default function Favorites() {
  const { user } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { if (!user) { setItems([]); setLoading(false); return; } setItems(await getFavorites(user.id)); setLoading(false); }, [user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  if (!user) return <Screen><Empty icon="heart-outline" title="Entre na sua conta" sub="Guarda os teus produtos favoritos." action="Entrar" onAction={() => router.push('/auth?next=/favorites')} /></Screen>;
  if (loading) return <Screen><Loading /></Screen>;
  return (
    <Screen scroll={false}>
      <View style={styles.head}><Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={C.ink} /></Pressable><Text style={styles.title}>Favoritos</Text><View style={{ width: 22 }} /></View>
      <FlatList data={items} keyExtractor={(p) => p.id} numColumns={2} columnWrapperStyle={{ gap: 12 }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} ListEmptyComponent={<Empty icon="heart-outline" title="Sem favoritos" sub="Toca no coração dos produtos para os guardares aqui." />} renderItem={({ item }) => (
        <View style={{ flex: 1 }}>
          <ProductCard p={item} />
          <Pressable onPress={async () => { await toggleFavorite(user.id, item.id, true); load(); }} style={styles.remove}><Ionicons name="heart-dislike-outline" size={16} color={C.red} /><Text style={styles.removeText}>Remover</Text></Pressable>
        </View>
      )} />
    </Screen>
  );
}
const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '900', color: C.ink },
  remove: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 6 },
  removeText: { fontSize: 11.5, fontWeight: '800', color: C.red },
});
