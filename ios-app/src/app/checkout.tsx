import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button, C, Card, Chip, Empty, Input, Loading, Screen } from '../components/ui';
import { useAuth } from '../lib/auth';
import { useCart } from '../lib/cart';
import { getAddresses, getShippingFees, placeOrder } from '../lib/api';
import { kz, PAY_METHOD, PROVINCES } from '../lib/format';
import { sb } from '../lib/supabase';

export default function Checkout() {
  const { user, profile, loading: authLoading } = useAuth();
  const { items, ready, clear } = useCart();
  const [fees, setFees] = useState<Record<string, number>>({});
  const [storeInfo, setStoreInfo] = useState<Record<string, { delivery_methods: string[] }>>({});
  const [addresses, setAddresses] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', phone: '', province: 'Luanda', city: '', street: '', reference: '', notes: '' });
  const [payment, setPayment] = useState('multicaixa_express');
  const [delivery, setDelivery] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitted = useRef(false);

  useEffect(() => { if (!authLoading && !user) router.replace('/auth?next=/checkout'); }, [authLoading, user]);
  useEffect(() => {
    if (!user) return;
    getShippingFees().then(setFees);
    getAddresses(user.id).then(setAddresses);
    const ids = [...new Set(items.map((i) => i.product.store_id))];
    if (ids.length) sb.from('stores').select('id,delivery_methods').in('id', ids).then(({ data }) => {
      const map: Record<string, { delivery_methods: string[] }> = {};
      (data ?? []).forEach((s: any) => { map[s.id] = { delivery_methods: s.delivery_methods ?? ['rse'] }; });
      setStoreInfo(map);
      setDelivery((d) => { const n = { ...d }; ids.forEach((id) => { if (!n[id]) n[id] = map[id]?.delivery_methods?.[0] ?? 'rse'; }); return n; });
    });
    if (profile?.full_name && !form.name) setForm((f) => ({ ...f, name: profile.full_name ?? '', phone: profile.phone ?? '' }));
  }, [user, items, profile]);

  if (authLoading || !user || !ready) return <Screen><Loading /></Screen>;
  if (!items.length) return <Screen><Empty icon="cart-outline" title="Carrinho vazio" action="Explorar" onAction={() => router.replace('/catalog')} /></Screen>;

  const groups = items.reduce<Record<string, typeof items>>((acc, i) => { (acc[i.product.store_id] ||= []).push(i); return acc; }, {});
  const subtotal = items.reduce((a, i) => a + i.quantity * Number(i.product.price), 0);
  const shipping = Object.keys(groups).reduce((a, id) => a + (fees[delivery[id] ?? 'rse'] ?? 0), 0);
  const total = subtotal + shipping;

  async function submit() {
    if (submitted.current || busy) return;
    if (!form.name.trim() || !form.phone.trim() || !form.city.trim() || !form.street.trim()) { setError('Preenche nome, telefone, cidade e rua.'); return; }
    submitted.current = true; setBusy(true); setError(null);
    try {
      const data = await placeOrder({
        items: items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        contact_name: form.name.trim(), contact_phone: form.phone.trim(),
        address: { province: form.province, city: form.city.trim(), street: form.street.trim(), reference: form.reference.trim() },
        payment_method: payment, delivery, notes: form.notes.trim() || null,
      });
      clear();
      router.replace(`/order/${data.id}?nova=1`);
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível concluir a encomenda.');
      submitted.current = false; setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.head}><Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={C.ink} /></Pressable><Text style={styles.title}>Checkout</Text><View style={{ width: 22 }} /></View>
      {addresses.length ? (
        <View style={{ marginBottom: 14 }}><Text style={styles.label}>Endereços guardados</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {addresses.map((a) => <Chip key={a.id} label={`${a.label} · ${a.city}`} onPress={() => setForm((f) => ({ ...f, province: a.province, city: a.city, street: a.street, reference: a.reference ?? '' }))} />)}
        </ScrollView></View>
      ) : null}
      <Card style={{ padding: 14, marginBottom: 14 }}>
        <Text style={styles.section}>Contacto</Text>
        <Input label="Nome completo" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} autoComplete="name" />
        <Input label="Telefone" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" autoComplete="tel" />
        <Input label="Notas (opcional)" value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} multiline />
      </Card>
      <Card style={{ padding: 14, marginBottom: 14 }}>
        <Text style={styles.section}>Entrega</Text>
        <Text style={styles.label}>Província</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
          {PROVINCES.map((p) => <Chip key={p} label={p} active={form.province === p} onPress={() => setForm({ ...form, province: p })} />)}
        </ScrollView>
        <Input label="Cidade / Município" value={form.city} onChangeText={(v) => setForm({ ...form, city: v })} />
        <Input label="Rua / Avenida" value={form.street} onChangeText={(v) => setForm({ ...form, street: v })} />
        <Input label="Referência (opcional)" value={form.reference} onChangeText={(v) => setForm({ ...form, reference: v })} />
      </Card>
      <Card style={{ padding: 14, marginBottom: 14 }}>
        <Text style={styles.section}>Pagamento</Text>
        {Object.entries(PAY_METHOD).map(([k, v]) => <Pressable key={k} onPress={() => setPayment(k)} style={styles.payRow}><View style={[styles.radio, payment === k && styles.radioOn]} />{v === 'Multicaixa Express' ? 'Multicaixa Express' : v === 'Transferência bancária' ? 'Transferência bancária' : 'Pagamento à entrega'}</Pressable>)}
      </Card>
      <Card style={{ padding: 14, marginBottom: 14 }}>
        <Text style={styles.section}>Resumo</Text>
        {Object.entries(groups).map(([storeId, arr]) => {
          const s = arr[0].product.stores;
          return <View key={storeId} style={{ marginBottom: 10 }}>
            <Text style={styles.storeName}>{s?.name}</Text>
            <Text style={styles.storeMeta}>{arr.reduce((a, i) => a + i.quantity, 0)} artigos · {kz(arr.reduce((a, i) => a + i.quantity * Number(i.product.price), 0))}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 8 }}>
              {(storeInfo[storeId]?.delivery_methods ?? ['rse']).map((m) => <Chip key={m} label={m === 'rse' ? 'Envio Roque' : m === 'seller' ? 'Envio loja' : 'Levantamento'} active={delivery[storeId] === m} onPress={() => setDelivery({ ...delivery, [storeId]: m })} />)}
            </ScrollView>
          </View>;
        })}
        <View style={styles.totals}>
          <Text style={styles.totalRow}><Text style={styles.muted}>Subtotal</Text><Text>{kz(subtotal)}</Text></Text>
          <Text style={styles.totalRow}><Text style={styles.muted}>Portes</Text><Text>{kz(shipping)}</Text></Text>
          <Text style={[styles.totalRow, styles.grand]}><Text>Total</Text><Text>{kz(total)}</Text></Text>
        </View>
      </Card>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title={busy ? 'A processar…' : `Confirmar encomenda · ${kz(total)}`} onPress={submit} disabled={busy} />
      <Text style={styles.secure}><Ionicons name="shield-checkmark" size={13} color={C.green} /> Pagamento processado com segurança. Sem cobranças duplicadas.</Text>
    </Screen>
  );
}
const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '900', color: C.ink },
  label: { fontSize: 12, fontWeight: '800', color: C.ink, marginBottom: 8 },
  section: { fontSize: 15, fontWeight: '900', color: C.ink, marginBottom: 10 },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: C.line },
  radioOn: { borderColor: C.ink, backgroundColor: C.ink },
  storeName: { fontSize: 14, fontWeight: '900', color: C.ink },
  storeMeta: { fontSize: 12, color: C.muted, marginTop: 2 },
  totals: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10, marginTop: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', fontSize: 14, color: C.ink, marginBottom: 6 },
  muted: { color: C.muted },
  grand: { fontSize: 17, fontWeight: '900', marginTop: 4 },
  error: { color: C.red, fontWeight: '800', marginVertical: 10, textAlign: 'center' },
  secure: { marginTop: 12, textAlign: 'center', fontSize: 11.5, color: C.muted, fontWeight: '700' },
});
