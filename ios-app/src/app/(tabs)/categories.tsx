import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { C, Screen } from '../../components/ui';
import { getCategories } from '../../lib/api';

export default function Categories() {
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getCategories().then((x) => { setCats(x); setLoading(false); }); }, []);
  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}><Text style={styles.title}>Categorias</Text><Text style={styles.sub}>Explora por categoria</Text></View>
      {loading ? <Text style={styles.sub}>A carregar…</Text> : (
        <View style={styles.grid}>
          {cats.map((c) => (
            <Pressable key={c.id} onPress={() => router.push(`/catalog?category=${c.id}`)} style={styles.card}>
              <View style={styles.icon}>{c.image_url ? <Image source={{ uri: c.image_url }} style={{ width: 44, height: 44 }} contentFit="contain" /> : <Ionicons name="grid-outline" size={26} color="#b6bec8" />}</View>
              <Text numberOfLines={2} style={styles.name}>{c.name}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '900', color: C.ink },
  sub: { fontSize: 12.5, color: C.muted, fontWeight: '700', marginTop: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16 },
  card: { width: '31.5%', backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 12, alignItems: 'center' },
  icon: { width: 58, height: 58, borderRadius: 18, backgroundColor: C.mist, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  name: { fontSize: 11.5, fontWeight: '800', color: C.ink, textAlign: 'center' },
});
