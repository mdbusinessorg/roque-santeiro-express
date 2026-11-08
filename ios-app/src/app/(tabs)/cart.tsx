import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button, C, Empty, Price, Screen } from '../../components/ui';
import { useCart } from '../../lib/cart';
import { kz } from '../../lib/format';

export default function Cart() {
  const { items, ready, setQty, remove, clear, subtotal, count } = useCart();
  if (!ready) return <Screen><Text style={{ padding: 24 }}>A carregar…</Text></Screen>;
  if (!items.length) return <Screen><Empty icon="cart-outline" title="O carrinho está vazio" sub="Adiciona produtos para comprar de várias lojas de uma vez." action="Explorar produtos" onAction={() => router.push('/catalog')} /></Screen>;
  const stores = [...new Set(items.map((i) => i.product.stores?.id).filter(Boolean))];
  return (
    <Screen scroll={false}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View><Text style={styles.title}>Carrinho</Text><Text style={styles.sub}>{count} {count === 1 ? 'artigo' : 'artigos'} · {stores.length} {stores.length === 1 ? 'loja' : 'lojas'}</Text></View>
        <Pressable onPress={clear}><Text style={styles.clear}>Limpar</Text></Pressable>
      </View>
      <FlatList data={items} keyExtractor={(i) => i.product.id} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 180 }} renderItem={({ item }) => (
        <View style={styles.row}>
          <Pressable onPress={() => router.push(`/product/${item.product.slug}`)} style={styles.imgWrap}>{item.product.images?.[0] ? <Image source={{ uri: item.product.images[0] }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Ionicons name="image-outline" size={24} color="#cbd5e1" />}</Pressable>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={2} style={styles.name}>{item.product.name}</Text>
            <Text numberOfLines={1} style={styles.store}>{item.product.stores?.name}</Text>
            <Price p={item.product} />
            <View style={styles.qtyRow}>
              <Pressable onPress={() => setQty(item.product.id, item.quantity - 1)} style={styles.qtyBtn}><Ionicons name="remove" size={16} color={C.ink} /></Pressable>
              <Text style={styles.qty}>{item.quantity}</Text>
              <Pressable onPress={() => setQty(item.product.id, item.quantity + 1)} style={styles.qtyBtn}><Ionicons name="add" size={16} color={C.ink} /></Pressable>
              <Pressable onPress={() => remove(item.product.id)} style={{ marginLeft: 'auto' }}><Ionicons name="trash-outline" size={18} color={C.red} /></Pressable>
            </View>
          </View>
        </View>
      )} />
      <View style={styles.footer}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}><Text style={styles.totalLabel}>Subtotal</Text><Text style={styles.total}>{kz(subtotal)}</Text></View>
        <Text style={styles.note}>Os portes e a divisão por loja são calculados no checkout.</Text>
        <Button title="Finalizar compra" icon="lock-closed" onPress={() => router.push('/checkout')} />
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '900', color: C.ink },
  sub: { fontSize: 12, color: C.muted, fontWeight: '700', marginTop: 2 },
  clear: { fontSize: 13, fontWeight: '900', color: C.red },
  row: { flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 10 },
  imgWrap: { width: 82, height: 82, borderRadius: 12, backgroundColor: C.soft, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 13.5, fontWeight: '800', color: C.ink },
  store: { fontSize: 11.5, color: C.muted, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  qty: { fontWeight: '900', color: C.ink, minWidth: 18, textAlign: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.line, padding: 16, paddingBottom: 24 },
  totalLabel: { fontSize: 13, color: C.muted, fontWeight: '700' },
  total: { fontSize: 20, fontWeight: '900', color: C.ink },
  note: { fontSize: 11.5, color: C.muted, marginBottom: 10 },
});
