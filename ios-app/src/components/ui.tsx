import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { kz, pct, type ProductLike } from '../lib/format';
import { useCart } from '../lib/cart';
import type { Product } from '../lib/types';

export const C = { ink: '#101418', gold: '#f2b21b', line: '#eceff3', muted: '#6b7280', bg: '#ffffff', soft: '#f6f7f9', red: '#e0245e', green: '#16a34a' };
export function Screen({ children, scroll = true, style }: { children: React.ReactNode; scroll?: boolean; style?: StyleProp<ViewStyle> }) {
  const inner = scroll ? <ScrollView contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">{children}</ScrollView> : <View style={{ flex: 1 }}>{children}</View>;
  return <SafeAreaView style={[styles.screen, style]} edges={['top']}>{inner}</SafeAreaView>;
}
export function Card({ children, style, onPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const cls = [styles.card, style];
  if (onPress) return <Pressable onPress={onPress} style={({ pressed }) => [...cls, pressed && { opacity: 0.9 }]}>{children}</Pressable>;
  return <View style={cls}>{children}</View>;
}
export function Button({ title, onPress, variant = 'primary', disabled, small, icon, style }: { title: string; onPress?: () => void; variant?: 'primary' | 'ghost' | 'gold' | 'danger'; disabled?: boolean; small?: boolean; icon?: keyof typeof Ionicons.glyphMap; style?: StyleProp<ViewStyle> }) {
  const bg = variant === 'primary' ? C.ink : variant === 'gold' ? C.gold : variant === 'danger' ? '#fee2e2' : C.soft;
  const fg = variant === 'primary' ? '#fff' : variant === 'danger' ? '#b91c1c' : C.ink;
  return <Pressable disabled={disabled} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress?.(); }} style={({ pressed }) => [styles.btn, small && styles.btnSmall, style, { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }]}>
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
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    <Text style={[styles.price, big && { fontSize: 22 }]}>{kz(p.price)}</Text>
    {p.compare_at_price && p.compare_at_price > p.price ? <Text style={styles.old}>{kz(p.compare_at_price)}</Text> : null}
    {d ? <Text style={styles.discount}>-{d}%</Text> : null}
  </View>;
}
export function SectionTitle({ title, sub, action, onAction }: { title: string; sub?: string; action?: string; onAction?: () => void }) {
  return <View style={styles.sectionHead}><View style={{ flex: 1 }}><Text style={styles.sectionTitle}>{title}</Text>{sub ? <Text style={styles.sectionSub}>{sub}</Text> : null}</View>{action ? <Pressable onPress={onAction}><Text style={styles.sectionAction}>{action}</Text></Pressable> : null}</View>;
}
export function Empty({ icon = 'cube-outline', title, sub, action, onAction }: { icon?: keyof typeof Ionicons.glyphMap; title: string; sub?: string; action?: string; onAction?: () => void }) {
  return <View style={styles.empty}><Ionicons name={icon} size={42} color="#cbd5e1" /><Text style={styles.emptyTitle}>{title}</Text>{sub ? <Text style={styles.emptySub}>{sub}</Text> : null}{action ? <Button title={action} onPress={onAction} small style={{ marginTop: 12 }} /> : null}</View>;
}
export function Loading({ text = 'A carregar…' }: { text?: string }) {
  return <View style={styles.loading}><ActivityIndicator color={C.ink} size="large" /><Text style={{ marginTop: 10, color: C.muted }}>{text}</Text></View>;
}
export function ProductCard({ p, compact, width }: { p: Product; compact?: boolean; width?: number }) {
  const router = useRouter(); const { add } = useCart();
  const img = p.images?.[0]; const out = p.stock <= 0; const d = pct(p);
  return <Card onPress={() => router.push(`/product/${p.slug}`)} style={[styles.productCard, width ? { width } : null]}>
    <View style={styles.productImageWrap}>
      {img ? <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} /> : <View style={[StyleSheet.absoluteFill, styles.noImage]}><Ionicons name="image-outline" size={30} color="#cbd5e1" /></View>}
      {d ? <View style={styles.badge}><Text style={styles.badgeText}>-{d}%</Text></View> : null}
      {!compact ? <Pressable onPress={(e) => { e?.stopPropagation?.(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); if (!out) add(p); }} style={styles.addBtn}><Ionicons name={out ? 'remove-circle-outline' : 'add'} size={18} color="#fff" /></Pressable> : null}
    </View>
    <View style={styles.productBody}>
      <Text numberOfLines={2} style={styles.productName}>{p.name}</Text>
      <Text numberOfLines={1} style={styles.productStore}>{p.stores?.name}</Text>
      <Price p={p} />
      {out ? <Text style={{ color: C.red, fontSize: 11, fontWeight: '800' }}>Esgotado</Text> : null}
    </View>
  </Card>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  card: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: C.line, overflow: 'hidden' },
  btn: { minHeight: 46, borderRadius: 999, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnSmall: { minHeight: 34, paddingHorizontal: 12, borderRadius: 999 },
  btnText: { fontWeight: '900', fontSize: 14 },
  label: { fontSize: 12, fontWeight: '800', color: C.ink, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.ink, backgroundColor: '#fff' },
  chip: { borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: '#fff', marginRight: 8 },
  chipActive: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { fontSize: 12.5, fontWeight: '800', color: C.ink },
  price: { fontSize: 17, fontWeight: '900', color: C.ink },
  old: { fontSize: 12, color: C.muted, textDecorationLine: 'line-through' },
  discount: { fontSize: 11, fontWeight: '900', color: C.red },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: C.ink },
  sectionSub: { fontSize: 12.5, color: C.muted, marginTop: 2 },
  sectionAction: { fontSize: 13, fontWeight: '900', color: C.ink },
  empty: { alignItems: 'center', paddingVertical: 70, paddingHorizontal: 30 },
  emptyTitle: { marginTop: 12, fontSize: 17, fontWeight: '900', color: C.ink, textAlign: 'center' },
  emptySub: { marginTop: 6, fontSize: 13, color: C.muted, textAlign: 'center' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  productCard: { width: 168, marginRight: 12, marginBottom: 12 },
  productImageWrap: { aspectRatio: 1, backgroundColor: C.soft },
  noImage: { alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 8, left: 8, backgroundColor: C.red, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 10.5, fontWeight: '900' },
  addBtn: { position: 'absolute', right: 8, bottom: 8, width: 34, height: 34, borderRadius: 17, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  productBody: { padding: 10 },
  productName: { fontSize: 12.5, fontWeight: '800', color: C.ink, minHeight: 32 },
  productStore: { fontSize: 10.5, color: C.muted, marginTop: 2 },
});
