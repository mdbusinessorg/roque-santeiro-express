import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, C, Empty, Loading, Price, Screen } from '../../components/ui';
import { getProduct, getProductEngagement, toggleFavorite } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useCart } from '../../lib/cart';
import { DELIVERY, pct } from '../../lib/format';
import { track } from '../../lib/track';
import type { Product } from '../../lib/types';

export default function ProductDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const { add } = useCart();
  const [p, setP] = useState<Product | null>(null);
  const [eng, setEng] = useState({ views: 0, clicks: 0, carts: 0, wishlists: 0 });
  const [fav, setFav] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const product = await getProduct(slug);
      if (!product) { setLoading(false); return; }
      setP(product);
      setEng(await getProductEngagement(product.id));
      if (user) {
        const { sb } = await import('../../lib/supabase');
        const { data } = await sb.from('wishlists').select('product_id').eq('user_id', user.id).eq('product_id', product.id).maybeSingle();
        setFav(!!data);
      }
      track([{ kind: 'view', product_id: product.id }]);
      setLoading(false);
    })();
  }, [slug, user?.id]);

  if (loading) return <Screen><Loading /></Screen>;
  if (!p) return <Screen><Empty icon="alert-circle-outline" title="Produto não encontrado" action="Voltar" onAction={() => router.back()} /></Screen>;
  const images = p.images?.length ? p.images : [null];
  const out = p.stock <= 0;
  const d = pct(p);

  async function toggleFav() {
    if (!user) { router.push(`/auth?next=/product/${p!.slug}`); return; }
    const has = fav;
    setFav(!has);
    await toggleFavorite(user.id, p!.id, has);
    track([{ kind: 'wishlist', product_id: p!.id }]);
  }
  function buy() {
    if (out) return;
    add(p!, qty);
    track([{ kind: 'cart', product_id: p!.id }]);
    router.push('/checkout');
  }

  return (
    <Screen scroll={false}>
      <View style={styles.wrap}>
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}><Ionicons name="chevron-back" size={22} color={C.ink} /></Pressable>
          <Pressable onPress={toggleFav} style={styles.iconBtn}><Ionicons name={fav ? 'heart' : 'heart-outline'} size={20} color={fav ? C.red : C.ink} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setImgIdx(Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width))}>
            {images.map((uri, i) => (
              <View key={i} style={styles.imgWrap}>
                {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} /> : <View style={[StyleSheet.absoluteFill, styles.noImg]}><Ionicons name="image-outline" size={54} color="#cbd5e1" /></View>}
              </View>
            ))}
          </ScrollView>
          <View style={styles.dots}>{images.map((_, i) => <View key={i} style={[styles.dot, i === imgIdx && styles.dotActive]} />)}</View>

          <View style={{ paddingHorizontal: 16 }}>
            <Text style={styles.brand}>{p.brand || p.categories?.name || 'Produto'}</Text>
            <Text style={styles.name}>{p.name}</Text>
            <Pressable onPress={() => router.push(`/loja/${p.stores.slug}`)} style={styles.storeRow}>
              <View style={styles.storeLogo}>{p.stores.logo_url ? <Image source={{ uri: p.stores.logo_url }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Ionicons name="storefront" size={16} color={C.gold} />}</View>
              <Text style={styles.storeName}>{p.stores.name}</Text>
              <Ionicons name="chevron-forward" size={16} color={C.muted} />
            </Pressable>
            <View style={styles.priceRow}><Price p={p} big />{d ? <Text style={styles.off}>-{d}%</Text> : null}</View>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>{out ? 'Esgotado' : `${p.stock} em stock`}</Text>
              <Text style={styles.meta}>{p.sold_count} vendidos</Text>
              {p.rating ? <Text style={styles.meta}>★ {p.rating.toFixed(1)}</Text> : null}
            </View>
            <View style={styles.engRow}>
              <Text style={styles.eng}><Ionicons name="eye-outline" size={13} color={C.muted} /> {eng.views} visualizações</Text>
              <Text style={styles.eng}><Ionicons name="analytics-outline" size={13} color={C.muted} /> {eng.clicks} cliques</Text>
              <Text style={styles.eng}><Ionicons name="heart-outline" size={13} color={C.muted} /> {eng.wishlists} favoritos</Text>
            </View>

            <View style={styles.qtyRow}>
              <Text style={styles.qtyLabel}>Quantidade</Text>
              <View style={styles.qtyBox}>
                <Pressable onPress={() => setQty((v) => Math.max(1, v - 1))} style={styles.qtyBtn}><Ionicons name="remove" size={16} color={C.ink} /></Pressable>
                <Text style={styles.qty}>{qty}</Text>
                <Pressable onPress={() => setQty((v) => Math.min(p.stock || 99, v + 1))} style={styles.qtyBtn}><Ionicons name="add" size={16} color={C.ink} /></Pressable>
              </View>
            </View>

            {p.specs && Object.keys(p.specs).length ? (
              <View style={styles.section}><Text style={styles.sectionTitle}>Especificações</Text>
                {Object.entries(p.specs).map(([k, v]) => <View key={k} style={styles.specRow}><Text style={styles.specKey}>{k}</Text><Text style={styles.specVal}>{String(v)}</Text></View>)}
              </View>
            ) : null}
            {p.description ? <View style={styles.section}><Text style={styles.sectionTitle}>Descrição</Text><Text style={styles.desc}>{p.description}</Text></View> : null}
            <View style={styles.section}><Text style={styles.sectionTitle}>Entrega</Text>{p.stores.delivery_methods.map((m) => <Text key={m} style={styles.delivery}>• {DELIVERY[m] ?? m}</Text>)}</View>
            <View style={styles.section}><Text style={styles.sectionTitle}>Pagamento</Text><Text style={styles.desc}>Multicaixa Express, transferência bancária ou pagamento à entrega. Confirmação após validação.</Text></View>
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <Button title={out ? 'Esgotado' : 'Adicionar ao carrinho'} variant="ghost" disabled={out} onPress={() => { add(p!, qty); track([{ kind: 'cart', product_id: p!.id }]); router.push('/cart'); }} />
          <Button title="Comprar agora" disabled={out} onPress={buy} />
        </View>
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  wrap: { flex: 1 },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 4 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  imgWrap: { width: 390, height: 390, backgroundColor: C.soft },
  noImg: { alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#d1d5db' },
  dotActive: { backgroundColor: C.ink, width: 18 },
  brand: { fontSize: 11, fontWeight: '900', color: C.gold, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 14 },
  name: { fontSize: 21, fontWeight: '900', color: C.ink, marginTop: 3 },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, backgroundColor: C.soft, borderRadius: 14, padding: 8, alignSelf: 'flex-start' },
  storeLogo: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#fff', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  storeName: { fontSize: 13, fontWeight: '900', color: C.ink },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  off: { fontSize: 12, fontWeight: '900', color: C.red },
  metaRow: { flexDirection: 'row', gap: 14, marginTop: 8 },
  meta: { fontSize: 12, color: C.muted, fontWeight: '700' },
  engRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  eng: { fontSize: 11.5, color: C.muted, fontWeight: '700' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  qtyLabel: { fontSize: 13, fontWeight: '900', color: C.ink },
  qtyBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.soft, borderRadius: 14, padding: 4 },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  qty: { fontWeight: '900', color: C.ink, minWidth: 20, textAlign: 'center' },
  section: { marginTop: 22 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: C.ink, marginBottom: 8 },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.line },
  specKey: { fontSize: 13, color: C.muted, fontWeight: '700' },
  specVal: { fontSize: 13, color: C.ink, fontWeight: '800', maxWidth: '60%', textAlign: 'right' },
  desc: { fontSize: 13.5, lineHeight: 20, color: '#374151' },
  delivery: { fontSize: 13, color: '#374151', marginBottom: 4 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, padding: 14, paddingBottom: 24, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.line },
});
