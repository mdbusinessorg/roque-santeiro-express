import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { C, Card, Chip, Empty, Loading, Price, ProductCard, Screen, SectionTitle } from '../../components/ui';
import { getCategories, getProducts, getStores } from '../../lib/api';
import { track } from '../../lib/track';
import type { Product } from '../../lib/types';

const partnerSlugs = new Set(['gilberto-aqui-tem', 'muralha-de-mortalhas']);

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [deals, setDeals] = useState<Product[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [fresh, setFresh] = useState<Product[]>([]);
  const [partners, setPartners] = useState<{ store: any; products: Product[] }[]>([]);

  useEffect(() => {
    (async () => {
      const [categories, allStores, dealRes, featRes, freshRes] = await Promise.all([
        getCategories(), getStores(), getProducts({ deals: true, limit: 12 }), getProducts({ featured: true, limit: 12 }), getProducts({ limit: 12 }),
      ]);
      setCats(categories); setStores(allStores); setDeals(dealRes.products); setFeatured(featRes.products); setFresh(freshRes.products);
      const partnerStores = allStores.filter((s) => partnerSlugs.has(s.slug));
      const lists = await Promise.all(partnerStores.map(async (s) => ({ store: s, products: (await getProducts({ store: s.id, limit: 12 })).products })));
      setPartners(lists.filter((x) => x.products.length));
      track([{ kind: 'rec_impression', context: 'home' }]);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Screen><Loading /></Screen>;
  const hero = featured[0] ?? deals[0] ?? fresh[0];
  const heroImg = hero?.images?.[0];

  return (
    <Screen>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.logo}>ROQUE <Text style={{ color: C.gold }}>SANTEIRO</Text></Text>
          <Text style={styles.tagline}>Marketplace de Angola</Text>
        </View>
        <Pressable onPress={() => router.push('/catalog')} style={styles.searchBtn}><Ionicons name="search" size={20} color={C.ink} /></Pressable>
      </View>

      {hero ? (
        <Pressable onPress={() => router.push(`/product/${hero.slug}`)} style={styles.hero}>
          <View style={{ flex: 1, padding: 18 }}>
            <Text style={styles.heroKicker}>Destaque</Text>
            <Text numberOfLines={2} style={styles.heroTitle}>{hero.name}</Text>
            <View style={{ marginTop: 8 }}><Price p={hero} big /></View>
            <View style={styles.heroBtn}><Text style={styles.heroBtnText}>Ver produto</Text></View>
          </View>
          {heroImg ? <Image source={{ uri: heroImg }} style={styles.heroImg} contentFit="cover" transition={150} /> : null}
        </Pressable>
      ) : null}

      <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {cats.map((c) => <Chip key={c.id} label={c.name} onPress={() => router.push(`/catalog?category=${c.id}`)} />)}
        </ScrollView>
      </View>

      {partners.map(({ store, products }) => (
        <View key={store.id} style={{ marginTop: 22 }}>
          <View style={{ paddingHorizontal: 16 }}><SectionTitle title={store.name} sub="Produtos reais da loja parceira" action="Ver loja" onAction={() => router.push(`/loja/${store.slug}`)} /></View>
          <FlatList horizontal data={products} keyExtractor={(p) => p.id} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }} renderItem={({ item }) => <ProductCard p={item} compact width={160} />} />
        </View>
      ))}

      {deals.length ? <Rail title="Ofertas" sub="Preços com desconto" data={deals} onSeeAll={() => router.push('/catalog?deals=1')} /> : null}
      {featured.length ? <Rail title="Destaques" sub="Selecionados pelas lojas" data={featured} onSeeAll={() => router.push('/catalog?featured=1')} /> : null}
      {fresh.length ? <Rail title="Novidades" sub="Recentemente adicionados" data={fresh} onSeeAll={() => router.push('/catalog')} /> : null}

      {stores.length ? (
        <View style={{ marginTop: 22, marginBottom: 30 }}>
          <View style={{ paddingHorizontal: 16 }}><SectionTitle title="Lojas" sub="Compre directamente dos vendedores" action="Todas" onAction={() => router.push('/catalog')} /></View>
          <FlatList horizontal data={stores} keyExtractor={(s) => s.id} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }} renderItem={({ item }) => (
            <Card onPress={() => router.push(`/loja/${item.slug}`)} style={styles.storeCard}>
              <View style={styles.storeLogo}>{item.logo_url ? <Image source={{ uri: item.logo_url }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Ionicons name="storefront" size={22} color={C.gold} />}</View>
              <Text numberOfLines={1} style={styles.storeName}>{item.name}</Text>
              <Text numberOfLines={1} style={styles.storeMeta}>{item.province}</Text>
            </Card>
          )} />
        </View>
      ) : null}
    </Screen>
  );
}

function Rail({ title, sub, data, onSeeAll }: { title: string; sub: string; data: Product[]; onSeeAll: () => void }) {
  return <View style={{ marginTop: 22 }}>
    <View style={{ paddingHorizontal: 16 }}><SectionTitle title={title} sub={sub} action="Ver tudo" onAction={onSeeAll} /></View>
    <FlatList horizontal data={data} keyExtractor={(p) => p.id} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }} renderItem={({ item }) => <ProductCard p={item} compact width={160} />} />
  </View>;
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  logo: { fontSize: 22, fontWeight: '900', color: C.ink, letterSpacing: 0.3 },
  tagline: { fontSize: 12, color: C.muted, marginTop: 1 },
  searchBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  hero: { marginHorizontal: 16, marginTop: 10, borderRadius: 22, backgroundColor: C.ink, overflow: 'hidden', flexDirection: 'row', minHeight: 150 },
  heroKicker: { color: C.gold, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 4 },
  heroBtn: { marginTop: 12, alignSelf: 'flex-start', backgroundColor: C.gold, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  heroBtnText: { color: C.ink, fontWeight: '900', fontSize: 12.5 },
  heroImg: { width: '42%', backgroundColor: '#222' },
  storeCard: { width: 132, marginRight: 12, padding: 10, alignItems: 'center' },
  storeLogo: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.soft, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line },
  storeName: { marginTop: 8, fontSize: 12.5, fontWeight: '900', color: C.ink },
  storeMeta: { fontSize: 10.5, color: C.muted, marginTop: 2 },
});
