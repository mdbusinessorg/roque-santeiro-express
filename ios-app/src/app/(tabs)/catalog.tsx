import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { C, Chip, Empty, Loading, ProductCard, Screen } from '../../components/ui';
import { getCategories, getProducts } from '../../lib/api';
import { track } from '../../lib/track';
import type { Product } from '../../lib/types';

export default function Catalog() {
  const params = useLocalSearchParams<{ q?: string; category?: string; store?: string; deals?: string; featured?: string }>();
  const [q, setQ] = useState(params.q ?? '');
  const [cats, setCats] = useState<any[]>([]);
  const [category, setCategory] = useState(params.category ?? '');
  const [store, setStore] = useState(params.store ?? '');
  const [sort, setSort] = useState('new');
  const [deals, setDeals] = useState(params.deals === '1');
  const [featured, setFeatured] = useState(params.featured === '1');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [data, setData] = useState<Product[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { getCategories().then(setCats); }, []);
  const load = useCallback(async (p = 0, append = false) => {
    setLoading(true);
    const res = await getProducts({
      q: q.trim() || undefined, category: category || undefined, store: store || undefined,
      sort: sort === 'new' ? undefined : sort, deals: deals || undefined, featured: featured || undefined,
      min: min ? Number(min) : undefined, max: max ? Number(max) : undefined, limit: 24, page: p,
    });
    setData((prev) => append ? [...prev, ...res.products] : res.products);
    setCount(res.count); setPage(res.page); setPages(res.pages); setLoading(false);
  }, [q, category, store, sort, deals, featured, min, max]);
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(0), 350);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [load]);
  useEffect(() => {
    if (params.q) { setQ(params.q); }
    if (params.category) setCategory(params.category);
    if (params.store) setStore(params.store);
    if (params.deals === '1') setDeals(true);
    if (params.featured === '1') setFeatured(true);
  }, [params.q, params.category, params.store, params.deals, params.featured]);

  function submitSearch() { if (q.trim()) track([{ kind: 'search', query: q.trim() }]); }

  return (
    <Screen scroll={false}>
      <View style={styles.wrap}>
        <View style={styles.header}><Text style={styles.title}>Explorar</Text><Text style={styles.sub}>{count} produtos</Text></View>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={C.muted} />
          <TextInput value={q} onChangeText={setQ} onSubmitEditing={submitSearch} placeholder="Pesquisar produtos, marcas…" placeholderTextColor="#9ca3af" style={styles.search} returnKeyType="search" />
          {q ? <Pressable onPress={() => setQ('')}><Ionicons name="close-circle" size={18} color={C.muted} /></Pressable> : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 10 }}>
          <Chip label="Tudo" active={!category && !deals && !featured} onPress={() => { setCategory(''); setDeals(false); setFeatured(false); }} />
          {cats.map((c) => <Chip key={c.id} label={c.name} active={category === c.id} onPress={() => { setCategory(category === c.id ? '' : c.id); setDeals(false); setFeatured(false); }} />)}
        </ScrollView>
        <View style={styles.filters}>
          <Chip label="Ofertas" active={deals} onPress={() => setDeals((v) => !v)} />
          <Chip label="Destaques" active={featured} onPress={() => setFeatured((v) => !v)} />
          <Chip label="Mais recentes" active={sort === 'new'} onPress={() => setSort('new')} />
          <Chip label="Menor preço" active={sort === 'price_asc'} onPress={() => setSort('price_asc')} />
          <Chip label="Maior preço" active={sort === 'price_desc'} onPress={() => setSort('price_desc')} />
          <Chip label="Melhor avaliação" active={sort === 'rating'} onPress={() => setSort('rating')} />
        </View>
        <View style={styles.priceRow}>
          <TextInput value={min} onChangeText={setMin} keyboardType="numeric" placeholder="Preço mín." placeholderTextColor="#9ca3af" style={styles.priceInput} />
          <TextInput value={max} onChangeText={setMax} keyboardType="numeric" placeholder="Preço máx." placeholderTextColor="#9ca3af" style={styles.priceInput} />
          {(min || max) ? <Pressable onPress={() => { setMin(''); setMax(''); }}><Text style={styles.clear}>Limpar</Text></Pressable> : null}
        </View>
        {loading && !data.length ? <Loading /> : (
          <FlatList
            data={data}
            keyExtractor={(p) => p.id}
            numColumns={2}
            columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={{ paddingBottom: 40, gap: 12 }}
            onEndReached={() => { if (!loading && page + 1 < pages) load(page + 1, true); }}
            onEndReachedThreshold={0.4}
            ListEmptyComponent={<Empty icon="search" title="Sem resultados" sub="Tenta outra pesquisa ou categoria." action="Limpar filtros" onAction={() => { setQ(''); setCategory(''); setStore(''); setDeals(false); setFeatured(false); setMin(''); setMax(''); }} />}
            renderItem={({ item }) => <View style={{ flex: 1 }}><ProductCard p={item} /></View>}
          />
        )}
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  title: { fontSize: 26, fontWeight: '900', color: C.ink },
  sub: { fontSize: 12, color: C.muted, fontWeight: '700' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.line, borderRadius: 16, paddingHorizontal: 12, height: 46, backgroundColor: '#fff', marginTop: 10 },
  search: { flex: 1, fontSize: 15, color: C.ink },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  priceRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  priceInput: { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, height: 42, fontSize: 13, color: C.ink },
  clear: { fontSize: 12, fontWeight: '900', color: C.red, alignSelf: 'center' },
});
