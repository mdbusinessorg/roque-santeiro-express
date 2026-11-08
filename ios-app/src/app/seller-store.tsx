import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Button, C, Card, Input, Loading, Screen } from '../components/ui';
import { sb } from '../lib/supabase';
import { useMyStore, pickAndUploadImage } from '../lib/seller';
import { DELIVERY, PROVINCES } from '../lib/format';

export default function SellerStore() {
  const { store, reload, user } = useMyStore('/seller-store');
  const [f, setF] = useState({ name: '', description: '', phone: '', whatsapp: '', email: '', province: 'Luanda', city: '', address: '', website: '' });
  const [methods, setMethods] = useState<string[]>([]);
  const [logo, setLogo] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!store) return;
    setF({ name: store.name ?? '', description: store.description ?? '', phone: store.phone ?? '', whatsapp: store.whatsapp ?? '', email: store.email ?? '', province: store.province ?? 'Luanda', city: store.city ?? store.commune ?? '', address: store.address ?? '', website: store.website ?? '' });
    setMethods(store.delivery_methods ?? ['seller']);
    setLogo(store.logo_url); setBanner(store.banner_url);
  }, [store]);

  async function pick(kind: 'logo' | 'banner', source: 'library' | 'camera') {
    if (!user) return;
    try {
      const url = await pickAndUploadImage(source, 'lojas', user.id);
      if (url) { if (kind === 'logo') setLogo(url); else setBanner(url); }
    } catch (e: any) { setMsg(e.message || 'Não foi possível enviar a imagem.'); }
  }

  async function save() {
    if (!store) return;
    setBusy(true); setMsg(null);
    const { error } = await sb.from('stores').update({ ...f, website: f.website.trim() || null, logo_url: logo, banner_url: banner, delivery_methods: methods.length ? methods : ['seller'] }).eq('id', store.id);
    setBusy(false);
    if (error) setMsg(error.message); else { setMsg('Perfil guardado.'); reload(); }
  }
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });

  if (store === undefined) return <Screen><Loading /></Screen>;
  if (store === null) return <Screen><Card style={{ margin: 16, padding: 20 }}><Text style={{ fontWeight: '900' }}>Sem loja</Text><Text style={{ color: C.muted, marginTop: 6 }}>Registe a sua loja primeiro.</Text></Card></Screen>;

  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}><Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={18} color={C.ink} /></Pressable><Text style={styles.title}>Perfil da loja</Text></View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <Card style={{ padding: 16 }}>
          <View style={styles.cover}>{banner ? <Image source={{ uri: banner }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <View style={[StyleSheet.absoluteFill, styles.coverEmpty]}><Ionicons name="image-outline" size={28} color="#cbd5e1" /></View>}</View>
          <View style={styles.logoRow}>
            <View style={styles.logo}>{logo ? <Image source={{ uri: logo }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Ionicons name="storefront" size={24} color={C.gold} />}</View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Foto de capa</Text>
              <View style={styles.uploadRow}><Button small variant="ghost" title="Galeria" onPress={() => pick('banner', 'library')} /><Button small variant="ghost" title="Câmara" onPress={() => pick('banner', 'camera')} /></View>
            </View>
          </View>
          <Input label="Nome" value={f.name} onChangeText={set('name')} />
          <View style={styles.row2}><View style={{ flex: 1 }}><Input label="Telefone" value={f.phone} onChangeText={set('phone')} /></View><View style={{ flex: 1 }}><Input label="WhatsApp" value={f.whatsapp} onChangeText={set('whatsapp')} /></View></View>
          <Input label="Email" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
          <Text style={styles.label}>Província</Text>
          <View style={styles.chips}>{PROVINCES.map((p) => <Pressable key={p} onPress={() => setF({ ...f, province: p })} style={[styles.chip, f.province === p && styles.chipActive]}><Text style={[styles.chipText, f.province === p && { color: '#fff' }]}>{p}</Text></Pressable>)}</View>
          <View style={styles.row2}><View style={{ flex: 1 }}><Input label="Município" value={f.city} onChangeText={set('city')} /></View><View style={{ flex: 1 }}><Input label="Endereço" value={f.address} onChangeText={set('address')} /></View></View>
          <Input label="Descrição" value={f.description} onChangeText={set('description')} multiline />
          <Input label="Site oficial (opcional)" value={f.website} onChangeText={set('website')} keyboardType="url" autoCapitalize="none" placeholder="https://www.minhaloja.ao" />
          <Text style={styles.label}>Métodos de entrega</Text>
          {Object.entries(DELIVERY).map(([k, l]) => <Pressable key={k} onPress={() => setMethods(methods.includes(k) ? methods.filter((m) => m !== k) : [...methods, k])} style={styles.checkRow}><Ionicons name={methods.includes(k) ? 'checkbox' : 'square-outline'} size={18} color={methods.includes(k) ? C.red : '#cbd5e1'} /><Text style={styles.checkText}>{l}</Text></Pressable>)}
          <View style={styles.uploadRow}><Button small variant="ghost" title={logo ? 'Logo carregado' : 'Alterar logo'} onPress={() => pick('logo', 'library')} /><Button small variant="ghost" title="Câmara" onPress={() => pick('logo', 'camera')} /></View>
          {msg ? <Text style={styles.msg}>{msg}</Text> : null}
          <Button title={busy ? 'A guardar…' : 'Guardar'} disabled={busy} onPress={save} style={{ marginTop: 12 }} />
        </Card>
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  title: { fontSize: 24, fontWeight: '900', color: C.ink },
  cover: { height: 120, borderRadius: 16, overflow: 'hidden', backgroundColor: C.mist, marginBottom: 12 },
  coverEmpty: { alignItems: 'center', justifyContent: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  logo: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', marginTop: -34 },
  label: { fontSize: 12, fontWeight: '800', color: C.ink, marginBottom: 6 },
  row2: { flexDirection: 'row', gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: { borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  chipActive: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { fontSize: 11, fontWeight: '800', color: C.ink },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  checkText: { fontSize: 13, color: C.ink, fontWeight: '600' },
  uploadRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  msg: { marginTop: 10, fontSize: 12, color: '#166534', backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10 },
});
