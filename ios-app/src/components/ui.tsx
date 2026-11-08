import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { kz, pct, type ProductLike } from '../lib/format';
import { useCart } from '../lib/cart';
import { useAuth } from '../lib/auth';
import { sb } from '../lib/supabase';
import { track } from '../lib/track';
import type { Product } from '../lib/types';

export const C = { ink: '#18181b', gold: '#f2b21b', line: '#e7e7ea', muted: '#6b7280', bg: '#f5f5f6', soft: '#f5f5f6', mist: '#f5f5f6', red: '#e5484d', green: '#16a34a' };

export function Screen({ children, scroll = true, style }: { children: React.ReactNode; scroll?: boolean; style?: StyleProp<ViewStyle> }) {
  const inner = scroll ? <ScrollView contentContainerStyle={{ paddingBottom: 140 }} keyboardShouldPersistTaps="handled">{children}</ScrollView> : <View style={{ flex: 1 }}>{children}</View>;
  return <SafeAreaView style={[styles.screen, style]} edges={['top']}>{inner}</SafeAreaView>;
}
export function Card({ children, style, onPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const cls = [styles.card, style];
  if (onPress) return <Pressable onPress={onPress} style={({ pressed }) => [...cls, pressed && { opacity: 0.9 }]}>{children}</Pressable>;
  return <View style={cls}>{children}</View>;
}
export function Button({ title, onPress, variant = 'primary', disabled, small, icon, style }: { title: string; onPress?: () => void; variant?: 'primary' | 'ghost' | 'gold' | 'danger'; disabled?: boolean; small?: boolean; icon?: keyof typeof Ionicons.glyphMap; style?: StyleProp<ViewStyle> }) {
  const bg = variant === 'primary' ? C.ink : variant === 'gold' ? C.gold : variant === 'danger' ? '#fee2e2' : '#ffffff';
  const fg = variant === 'primary' ? '#fff' : variant === 'danger' ? '#b91c1c' : C.ink;
  return <Pressable disabled={disabled} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress?.(); }} style={({ pressed }) => [styles.btn, small && styles.btnSmall, style, { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1, borderWidth: variant === 'ghost' ? 1 : 0, borderColor: C.line }]}>
    {icon && <Ionicons name={icon} size={small ? 14 : 17} color={fg} style={{ marginRight: 6 }} />}
    <Text style={[styles.btnText, small && { fontSize: 12 }, { color: fg }]}>{title}</Text>
  </Pressable>;
}
export function Input({ label, ...props }: React.ComponentProps<typeof TextInput> & { label?: string }) {
  return <View style={{ marginBottom: 12 }}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor="#9ca3af" style={styles.input} {...props} /></View>;
}
export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}><Text style={[styles.chipText, active && { color: '#fff' }]}>{label}</Text></Pressable>;
}
export function Price({ p, big }: { p: ProductLike; big?: boolean }) {
  const d = pct(p);
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
    <Text style={[styles.price, big && { fontSize: 24 }, d > 0 && { color: C.red }]}>{kz(p.price)}</Text>
    {p.compare_at_price && p.compare_at_price > p.price ? <Text style={styles.old}>{kz(p.compare_at_price)}</Text> : null}
    {d ? <Text style={styles.discount}>-{d}%</Text> : null}
  </View>;
}
export function SectionTitle({ title, sub, action, onAction }: { title: string; sub?: string; action?: string; onAction?: () => void }) {
  return <View style={styles.sectionHead}><View style={{ flex: 1 }}><Text style={styles.sectionTitle}>{title}</Text>{sub ? <Text style={styles.sectionSub}>{sub}</Text> : null}</View>{action ? <Pressable onPress={onAction} style={styles.seeAll}><Text style={styles.sectionAction}>Ver tudo</Text></Pressable> : null}</View>;
}
export function Empty({ icon = 'cube-outline', title, sub, action, onAction }: { icon?: keyof typeof Ionicons.glyphMap; title: string; sub?: string; action?: string; onAction?: () => void }) {
  return <View style={styles.empty}><Ionicons name={icon} size={42} color="#cbd5e1" /><Text style={styles.emptyTitle}>{title}</Text>{sub ? <Text style={styles.emptySub}>{sub}</Text> : null}{action ? <Button title={action} onPress={onAction} small style={{ marginTop: 12 }} /> : null}</View>;
}
export function Loading({ text = 'A carregar…' }: { text?: string }) {
  return (
    <View style={styles.loading}>
      <View style={{ width: '100%', paddingHorizontal: 16 }}>
        <Skeleton height={28} width="42%" radius={10} style={{ marginBottom: 14 }} />
        <Skeleton height={180} radius={20} style={{ marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <ProductCardSkeleton width={150} />
          <ProductCardSkeleton width={150} />
        </View>
      </View>
      <Text style={{ marginTop: 18, color: C.muted, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}
export function Skeleton({ width = '100%', height = 16, radius = 12, style }: { width?: number | `${number}%` | 'auto'; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ width: width as any, height, borderRadius: radius, backgroundColor: '#ececee' }, style]} />;
}
export function ProductCardSkeleton({ width }: { width?: number }) {
  return <View style={[{ width: width ?? '100%', marginRight: width ? 12 : 0, marginBottom: 12 }]}>
    <Skeleton height={width ?? 160} radius={18} />
    <Skeleton height={14} radius={8} style={{ marginTop: 10, width: '82%' }} />
    <Skeleton height={14} radius={8} style={{ marginTop: 6, width: '55%' }} />
    <Skeleton height={20} radius={8} style={{ marginTop: 10, width: '45%' }} />
  </View>;
}

function Stars({ rating, count }: { rating: number; count: number }) {
  if (!count) return null;
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
    <Ionicons name="star" size={12} color="#f59e0b" />
    <Text style={{ fontSize: 11.5, color: C.muted, fontWeight: '700' }}>{Number(rating).toFixed(1)} ({count})</Text>
  </View>;
}

export function ProductCard({ p, compact, width }: { p: Product; compact?: boolean; width?: number }) {
  const router = useRouter(); const { add } = useCart(); const { user } = useAuth();
  const [added, setAdded] = useState(false); const [fav, setFav] = useState(false);
  const img = p.images?.[0]; const out = p.stock <= 0; const d = pct(p);

  function clickProduct() { track([{ kind: 'click', product_id: p.id }]); }
  function addCart(e?: any) {
    e?.stopPropagation?.();
    if (out) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    add(p); track([{ kind: 'cart', product_id: p.id }]); setAdded(true); setTimeout(() => setAdded(false), 1400);
  }
  function buyNow(e?: any) {
    e?.stopPropagation?.();
    if (out) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    add(p); track([{ kind: 'cart', product_id: p.id }]); router.push('/cart');
  }
  async function toggleFav(e?: any) {
    e?.stopPropagation?.();
    if (!user) { router.push(`/auth?next=/product/${p.slug}`); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { data } = await sb.from('wishlists').select('product_id').eq('user_id', user.id).eq('product_id', p.id).maybeSingle();
    if (data) { await sb.from('wishlists').delete().eq('user_id', user.id).eq('product_id', p.id); setFav(false); }
    else { await sb.from('wishlists').insert({ user_id: user.id, product_id: p.id }); setFav(true); track([{ kind: 'wishlist', product_id: p.id }]); }
  }

  return <Card onPress={() => { clickProduct(); router.push(`/product/${p.slug}`); }} style={[styles.productCard, width ? { width, marginRight: 12 } : null]}>
    <View style={styles.productImageWrap}>
      {img ? <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="contain" transition={120} /> : <View style={[StyleSheet.absoluteFill, styles.noImage]}><Ionicons name="image-outline" size={30} color="#cbd5e1" /></View>}
      {d ? <View style={styles.badge}><Text style={styles.badgeText}>-{d}%</Text></View> : null}
      {p.sponsored ? <View style={[styles.sponsored, { backgroundColor: 'rgba(255,255,255,0.75)' }]}><Text style={styles.sponsoredText}>Patrocinado</Text></View> : null}
      <Pressable onPress={toggleFav} style={[styles.favBtn, fav && { backgroundColor: C.red }]}><Ionicons name={fav ? 'heart' : 'heart-outline'} size={15} color={fav ? '#fff' : C.ink} /></Pressable>
      {!out ? <Pressable onPress={addCart} style={[styles.addBtn, added && { backgroundColor: C.green }]}>{added ? <Ionicons name="checkmark" size={18} color="#fff" /> : <Ionicons name="cart" size={17} color={C.gold} />}</Pressable> : null}
    </View>
    <View style={[styles.productBody, compact && { paddingHorizontal: 10, paddingBottom: 10 }]}>
      <Text numberOfLines={2} style={[styles.productName, compact && { fontSize: 12.5 }]}>{p.name}</Text>
      <Stars rating={p.rating} count={p.rating_count} />
      {p.sold_count > 0 ? <Text style={{ fontSize: 11, color: C.muted, fontWeight: '700', marginTop: 2 }}>{p.sold_count} vendidos</Text> : null}
      <View style={{ marginTop: 6 }}><Price p={p} /></View>
      {p.stock > 0 && p.stock <= 5 ? <Text style={{ fontSize: 11, color: '#d97706', fontWeight: '800', marginTop: 3 }}>Só restam {p.stock} em stock</Text> : null}
      {!compact && p.stores?.name ? <Text numberOfLines={1} style={styles.productStore}>{p.stores.is_official ? '✓ ' : ''}{p.stores.name}</Text> : null}
    </View>
    <View style={[styles.buyWrap, compact && { paddingHorizontal: 10, paddingBottom: 10 }]}>
      <Pressable disabled={out} onPress={buyNow} style={[styles.buyBtn, out && { opacity: 0.45 }]}><Text style={styles.buyText}>{out ? 'Esgotado' : 'Comprar agora'}</Text></Pressable>
    </View>
  </Card>;
}

export function ProductGrid({ products }: { products: Product[] }) {
  if (!products.length) return <Card style={{ padding: 24 }}><Text style={{ textAlign: 'center', color: C.muted, fontSize: 13 }}>Nenhum produto encontrado.</Text></Card>;
  return <View style={styles.grid}>{products.map((p) => <View key={p.id} style={{ flexBasis: '48%', flexGrow: 0 }}><ProductCard p={p} /></View>)}</View>;
}

export function Section({ title, href, children, subtitle }: { title: React.ReactNode; href?: string; children: React.ReactNode; subtitle?: string }) {
  const router = useRouter();
  return <View style={{ marginTop: 24 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 2 }}>
      <View style={{ flex: 1 }}><Text style={styles.sectionTitle}>{title}</Text>{subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}</View>
      {href ? <Pressable onPress={() => router.push(href as any)} style={styles.seeAll}><Text style={styles.sectionAction}>Ver tudo</Text></Pressable> : null}
    </View>
    {children}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  card: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: C.line, overflow: 'hidden' },
  btn: { minHeight: 46, borderRadius: 999, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnSmall: { minHeight: 34, paddingHorizontal: 12, borderRadius: 999 },
  btnText: { fontWeight: '800', fontSize: 14 },
  label: { fontSize: 12, fontWeight: '800', color: C.ink, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.ink, backgroundColor: '#fff' },
  chip: { borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: '#fff', marginRight: 8 },
  chipActive: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { fontSize: 12.5, fontWeight: '800', color: C.ink },
  price: { fontSize: 17, fontWeight: '900', color: C.ink },
  old: { fontSize: 12, color: C.muted, textDecorationLine: 'line-through' },
  discount: { fontSize: 11, fontWeight: '900', color: C.red },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 19, fontWeight: '900', color: C.ink },
  sectionSub: { fontSize: 12.5, color: C.muted, marginTop: 2 },
  sectionAction: { fontSize: 13, fontWeight: '800', color: C.ink },
  seeAll: { borderWidth: 1, borderColor: C.line, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  empty: { alignItems: 'center', paddingVertical: 70, paddingHorizontal: 30 },
  emptyTitle: { marginTop: 12, fontSize: 17, fontWeight: '900', color: C.ink, textAlign: 'center' },
  emptySub: { marginTop: 6, fontSize: 13, color: C.muted, textAlign: 'center' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  productCard: { width: '100%', backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: C.line, overflow: 'hidden' },
  productImageWrap: { aspectRatio: 1, backgroundColor: C.mist, position: 'relative' },
  noImage: { alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 8, left: 8, backgroundColor: C.red, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 10.5, fontWeight: '900' },
  sponsored: { position: 'absolute', top: 8, right: 52, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' },
  sponsoredText: { fontSize: 10, fontWeight: '800', color: C.ink },
  favBtn: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center' },
  addBtn: { position: 'absolute', right: 8, bottom: 8, width: 34, height: 34, borderRadius: 17, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  productBody: { padding: 12, paddingBottom: 8 },
  productName: { fontSize: 13, fontWeight: '800', color: C.ink, minHeight: 34 },
  productStore: { fontSize: 11.5, color: C.muted, marginTop: 4 },
  buyWrap: { paddingHorizontal: 12, paddingBottom: 12 },
  buyBtn: { height: 36, borderRadius: 999, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  buyText: { color: C.gold, fontSize: 12.5, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
