import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { C, Card, Empty, Loading, Price, ProductCard, ProductGrid, Screen, Section, SectionTitle } from '../../components/ui';
import { StoreAvatar } from '../../components/store-avatar';
import { getCategories, getProducts, getStores } from '../../lib/api';
import { track } from '../../lib/track';
import { kz, pct } from '../../lib/format';
import type { Product } from '../../lib/types';

const partnerSlugs = new Set(['gilberto-aqui-tem', 'muralha-de-mortalhas']);
const trust = [
  { icon: 'car-outline' as const, t: 'Entrega em todas as províncias' },
  { icon: 'shield-checkmark-outline' as const, t: 'Compra protegida' },
  { icon: 'card-outline' as const, t: 'Multicaixa Express e transferência' },
  { icon: 'checkmark-circle-outline' as const, t: 'Vendedores verificados' },
  { icon: 'logo-whatsapp' as const, t: 'Apoio por WhatsApp' },
  { icon: 'storefront-outline' as const, t: 'Centenas de lojas angolanas' },
];
const DEAL_TITLES = ['Grande saldo!', 'Oferta da semana!', 'Preço especial!', 'Promoção!'];

function Rail({ title, sub, data, href, compact = true }: { title: string; sub?: string; data: Product[]; href: string; compact?: boolean }) {
  if (!data.length) return null;
  return (
    <Section title={title} subtitle={sub} href={href}>
      <FlatList horizontal data={data} keyExtractor={(p) => p.id} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }} renderItem={({ item }) => <ProductCard p={item} compact={compact} width={compact ? 160 : 190} />} />
    </Section>
  );
}

function HeroSlide({ p, index, total, current, onSelect }: { p: Product; index: number; total: number; current: number; onSelect: (i: number) => void }) {
  const d = pct(p);
  return (
    <Pressable onPress={() => router.push(`/produto/${p.slug}`)} style={styles.heroCard}>
      <View style={styles.heroText}>
        <Text style={styles.heroTag}>{d ? `-${d}% de desconto` : 'Em destaque'}</Text>
        <Text numberOfLines={2} style={styles.heroTitle}>{d ? DEAL_TITLES[index % DEAL_TITLES.length] : 'Novidade!'}</Text>
        <Text numberOfLines={2} style={styles.heroSub}>{p.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
          <Text style={styles.heroPrice}>{kz(p.price)}</Text>
          {p.compare_at_price && p.compare_at_price > p.price ? <Text style={styles.heroOld}>{kz(p.compare_at_price)}</Text> : null}
        </View>
        <View style={styles.heroCta}><Text style={styles.heroCtaText}>{p.brand ? `Comprar ${p.brand}` : 'Comprar agora'}</Text><Ionicons name="arrow-forward" size={14} color="#fff" /></View>
      </View>
      <View style={styles.heroImgWrap}>
        <View style={styles.pedestal} />
        {p.images?.[0] ? <Image source={{ uri: p.images[0] }} style={styles.heroImg} contentFit="contain" transition={150} /> : null}
      </View>
      <View style={styles.dots}>{Array.from({ length: total }).map((_, i) => <Pressable key={i} onPress={() => onSelect(i)} style={[styles.dot, i === current && styles.dotActive]} />)}</View>
    </Pressable>
  );
}

function PromoCard({ href, image, tag, title, sub, tone }: { href: string; image?: string; tag?: string; title: React.ReactNode; sub: string; tone: string }) {
  return (
    <Pressable onPress={() => router.push(href as any)} style={[styles.promo, { backgroundColor: tone }]}>
      {tag ? <Text style={styles.promoTag}>{tag}</Text> : null}
      <Text numberOfLines={2} style={styles.promoTitle}>{title}</Text>
      <Text numberOfLines={1} style={styles.promoSub}>{sub}</Text>
      <View style={styles.promoLink}><Text style={styles.promoLinkText}>Ver</Text><Ionicons name="arrow-forward" size={12} color={C.ink} /></View>
      {image ? <Image source={{ uri: image }} style={styles.promoImg} contentFit="contain" transition={120} /> : null}
    </Pressable>
  );
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [cats, setCats] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [all, setAll] = useState<Product[]>([]);
  const [deals, setDeals] = useState<Product[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [fresh, setFresh] = useState<Product[]>([]);
  const [partners, setPartners] = useState<{ store: any; products: Product[] }[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);

  const load = async () => {
    setLoading(true); setError(false);
    try {
      const [categories, allStores, allRes, dealRes, featRes, freshRes] = await Promise.all([
        getCategories(), getStores(), getProducts({ limit: 80 }), getProducts({ deals: true, limit: 12 }), getProducts({ featured: true, limit: 14 }), getProducts({ limit: 8, page: 0 }),
      ]);
      const seen = new Set<string>();
      const pool = [...dealRes.products, ...featRes.products, ...allRes.products].filter((p) => p.images?.[0] && p.stock > 0 && !seen.has(p.id) && !!seen.add(p.id));
      const heroPool = pool.slice(0, 4);
      setCats(categories); setStores(allStores); setAll(allRes.products); setDeals(dealRes.products); setFeatured(featRes.products); setFresh(freshRes.products);
      const partnerStores = allStores.filter((s) => partnerSlugs.has(s.slug));
      const lists = await Promise.all(partnerStores.map(async (s) => ({ store: s, products: (await getProducts({ store: s.id, limit: 12 })).products })));
      setPartners(lists.filter((x) => x.products.length));
      setHeroIndex(0);
      track([{ kind: 'rec_impression', context: 'home' }]);
      void heroPool;
    } catch { setError(true); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const heroSlides = useMemo(() => {
    const seen = new Set<string>();
    const pool = [...deals, ...featured, ...all].filter((p) => p.images?.[0] && p.stock > 0 && !seen.has(p.id) && !!seen.add(p.id));
    return pool.slice(0, 4);
  }, [deals, featured, all]);
  useEffect(() => {
    if (heroSlides.length < 2) return;
    const t = setInterval(() => setHeroIndex((i) => (i + 1) % heroSlides.length), 5500);
    return () => clearInterval(t);
  }, [heroSlides.length]);

  const best = useMemo(() => [...deals].filter((p) => p.images?.[0] && pct(p)).sort((a, b) => pct(b) - pct(a))[0], [deals]);
  const nova = useMemo(() => [...fresh, ...all].find((p) => p.images?.[0] && p.stock > 0 && p.id !== best?.id && p.category_id !== best?.category_id), [fresh, all, best]);
  const shown = useMemo(() => new Set(heroSlides.map((p) => `/produto/${p.slug}`)), [heroSlides]);
  void shown;

  if (loading) return <Screen><Loading text="A carregar a loja…" /></Screen>;
  if (error) return <Screen><Empty icon="cloud-offline-outline" title="Não foi possível carregar" sub="Verifica a ligação e tenta novamente." action="Tentar novamente" onAction={load} /></Screen>;

  return (
    <Screen>
      <View style={styles.topbar}>
        <View style={styles.brandRow}>
          <Pressable onPress={() => router.push('/')} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={styles.logoBox}><Ionicons name="bag-handle" size={18} color={C.gold} /></View>
            <View><Text style={styles.logo}>ROQUE <Text style={{ color: C.gold }}>SANTEIRO</Text></Text><Text style={styles.logoSub}>EXPRESS</Text></View>
          </Pressable>
          <View style={styles.topActions}>
            <Pressable onPress={() => router.push('/favorites')} style={styles.topBtn}><Ionicons name="heart-outline" size={18} color="#fff" /></Pressable>
            <Pressable onPress={() => router.push('/notifications')} style={styles.topBtn}><Ionicons name="notifications-outline" size={18} color="#fff" /></Pressable>
          </View>
        </View>
        <Pressable onPress={() => router.push('/catalog')} style={styles.searchPill}>
          <Ionicons name="search" size={16} color="rgba(255,255,255,0.75)" />
          <Text style={styles.searchText}>Pesquisar no Roque Santeiro</Text>
          <View style={styles.searchBtn}><Text style={styles.searchBtnText}>Buscar</Text></View>
        </Pressable>
      </View>

      {heroSlides.length ? (
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <HeroSlide p={heroSlides[heroIndex]} index={heroIndex} total={heroSlides.length} current={heroIndex} onSelect={setHeroIndex} />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <PromoCard href="/catalog?deals=1" image={best?.images?.[0]} title={best ? <>Até <Text style={{ color: C.red }}>-{pct(best)}%</Text> de desconto</> : 'Ofertas da semana'} sub={best?.categories?.name ?? 'Descontos reais'} tone="#fff1f1" />
            <PromoCard href={nova ? `/product/${nova.slug}` : '/catalog'} image={nova?.images?.[0]} tag="Novidade" title={nova?.name ?? 'Acabou de chegar'} sub={nova ? kz(nova.price) : 'Novos produtos'} tone="#f3f4f8" />
          </View>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 18, paddingHorizontal: 16, paddingVertical: 12 }} style={{ marginTop: 8 }}>
        {trust.map((t) => <View key={t.t} style={styles.trustItem}><Ionicons name={t.icon} size={15} color={C.red} /><Text style={styles.trustText}>{t.t}</Text></View>)}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingBottom: 6 }}>
        {cats.map((c) => (
          <Pressable key={c.id} onPress={() => router.push(`/catalog?category=${c.id}`)} style={styles.catItem}>
            <View style={styles.catIcon}>{c.image_url ? <Image source={{ uri: c.image_url }} style={{ width: 34, height: 34 }} contentFit="contain" /> : <Ionicons name="grid-outline" size={22} color="#b6bec8" />}</View>
            <Text numberOfLines={2} style={styles.catName}>{c.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {partners.map(({ store, products }) => (
        <Rail key={store.id} title={store.name} sub="Produtos reais da loja parceira" data={products} href={`/loja/${store.slug}`} />
      ))}

      <Rail title="Ofertas relâmpago" sub="Descontos reais por tempo limitado" data={deals} href="/catalog?deals=1" />
      <Rail title="Escolhas da semana" sub="Toque para ver em destaque" data={featured} href="/catalog?featured=1" />

      {stores.length ? (
        <Section title="Lojas em destaque" subtitle="Visite as lojas e compre directamente" href="/stores">
          <FlatList horizontal data={stores} keyExtractor={(s) => s.id} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }} renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/loja/${item.slug}`)} style={styles.storeCard}>
              <StoreAvatar store={item} size={54} />
              <Text numberOfLines={1} style={styles.storeName}>{item.name}</Text>
              <Text numberOfLines={1} style={styles.storeMeta}>{item.province}</Text>
            </Pressable>
          )} />
        </Section>
      ) : null}

      <Section title="Produtos em destaque" href="/catalog"><ProductGrid products={featured.slice(0, 8)} /></Section>
      {all.some((x) => x.sold_count > 0) ? <Section title="Mais vendidos" href="/catalog"><ProductGrid products={[...all].filter((x) => x.sold_count > 0).sort((a, b) => b.sold_count - a.sold_count).slice(0, 8)} /></Section> : null}
      <Section title="Novidades" href="/catalog"><ProductGrid products={fresh.slice(0, 8)} /></Section>

      <Card style={{ marginHorizontal: 16, marginTop: 24, padding: 18 }}>
        <Text style={styles.promoTitle}>Tem uma loja?</Text>
        <Text style={{ marginTop: 6, color: C.muted, fontSize: 13, lineHeight: 19 }}>Venda para toda Angola no Roque Santeiro Express. Abra a sua loja grátis, publique produtos e receba as suas vendas.</Text>
        <Pressable onPress={() => router.push('/vender' as any)} style={styles.sellBtn}><Text style={styles.sellBtnText}>Tornar-se vendedor</Text></Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topbar: { backgroundColor: C.ink, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoBox: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(242,178,27,0.45)' },
  logo: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 0.2 },
  logoSub: { color: C.gold, fontSize: 10, fontWeight: '800', letterSpacing: 3, marginTop: 1 },
  topActions: { flexDirection: 'row', gap: 8 },
  topBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  searchPill: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', borderRadius: 999, paddingLeft: 14, paddingRight: 6, height: 46 },
  searchText: { flex: 1, color: 'rgba(255,255,255,0.7)', fontSize: 13.5, fontWeight: '600' },
  searchBtn: { backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 14, height: 34, justifyContent: 'center' },
  searchBtnText: { color: C.ink, fontSize: 12.5, fontWeight: '900' },
  heroCard: { marginHorizontal: 16, marginTop: 12, borderRadius: 22, backgroundColor: '#fff5f4', borderWidth: 1, borderColor: C.line, overflow: 'hidden', minHeight: 190 },
  heroText: { flex: 1, padding: 18, justifyContent: 'center' },
  heroTag: { alignSelf: 'flex-start', backgroundColor: 'rgba(229,72,77,0.12)', color: C.red, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, fontSize: 10.5, fontWeight: '900', textTransform: 'uppercase' },
  heroTitle: { marginTop: 10, fontSize: 24, fontWeight: '900', color: C.ink, textTransform: 'uppercase', letterSpacing: -0.5, lineHeight: 26 },
  heroSub: { marginTop: 6, fontSize: 12.5, color: 'rgba(24,24,27,0.62)', lineHeight: 17 },
  heroPrice: { fontSize: 18, fontWeight: '900', color: C.ink },
  heroOld: { fontSize: 12, color: 'rgba(24,24,27,0.4)', textDecorationLine: 'line-through' },
  heroCta: { marginTop: 12, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.red, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  heroCtaText: { color: '#fff', fontSize: 12.5, fontWeight: '900' },
  heroImgWrap: { width: '44%', alignItems: 'center', justifyContent: 'flex-end' },
  pedestal: { position: 'absolute', bottom: 18, width: '78%', height: 18, borderRadius: 999, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  heroImg: { width: '86%', height: 120, marginBottom: 24 },
  dots: { position: 'absolute', right: 14, bottom: 12, flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(24,24,27,0.18)' },
  dotActive: { width: 16, backgroundColor: C.red },
  promo: { flex: 1, minHeight: 120, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 12, overflow: 'hidden' },
  promoTag: { alignSelf: 'flex-start', backgroundColor: C.ink, color: '#fff', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, fontSize: 9.5, fontWeight: '900', textTransform: 'uppercase' },
  promoTitle: { marginTop: 8, fontSize: 14, fontWeight: '900', color: C.ink, lineHeight: 18 },
  promoSub: { marginTop: 4, fontSize: 11.5, color: 'rgba(24,24,27,0.58)' },
  promoLink: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
  promoLinkText: { fontSize: 11.5, fontWeight: '900', color: C.ink, textDecorationLine: 'underline' },
  promoImg: { position: 'absolute', right: -6, bottom: -4, width: 78, height: 78 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  trustText: { fontSize: 11.5, fontWeight: '700', color: 'rgba(24,24,27,0.72)' },
  catItem: { width: 74, alignItems: 'center', gap: 6 },
  catIcon: { width: 62, height: 62, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 11, fontWeight: '700', color: 'rgba(24,24,27,0.75)', textAlign: 'center' },
  storeCard: { width: 118, alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 12 },
  storeName: { marginTop: 8, fontSize: 12, fontWeight: '900', color: C.ink },
  storeMeta: { fontSize: 10.5, color: C.muted, marginTop: 2 },
  sellBtn: { marginTop: 14, alignSelf: 'flex-start', backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  sellBtnText: { color: C.gold, fontSize: 12.5, fontWeight: '900' },
});
