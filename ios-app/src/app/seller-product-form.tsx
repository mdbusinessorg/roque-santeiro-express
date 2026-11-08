import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, C, Card, Input, Loading, Screen } from '../components/ui';
import { sb } from '../lib/supabase';
import { useMyStore, pickAndUploadImage, slugify } from '../lib/seller';

const STATUSES = ['active', 'inactive', 'draft'];
const STATUS_LABEL: Record<string, string> = { active: 'Activo (visível)', inactive: 'Inactivo', draft: 'Rascunho' };

export default function SellerProductForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isNew = !id || id === 'new';
  const { store, user } = useMyStore('/seller-product-form');
  const [cats, setCats] = useState<any[]>([]);
  const [f, setF] = useState({ name: '', brand: '', sku: '', price: '', compare_at_price: '', stock: '1', category_id: '', description: '', status: 'active', specs: '' });
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    sb.from('categories').select('*').order('sort').then(({ data }) => setCats((data as any[]) ?? []));
    if (isNew) return;
    sb.from('products').select('*').eq('id', id).maybeSingle().then(({ data: p }: any) => {
      if (!p) { setErr('Produto não encontrado.'); setLoading(false); return; }
      setF({ name: p.name, brand: p.brand ?? '', sku: p.sku ?? '', price: String(p.price), compare_at_price: p.compare_at_price ? String(p.compare_at_price) : '', stock: String(p.stock), category_id: p.category_id ?? '', description: p.description ?? '', status: p.status, specs: Object.entries(p.specs ?? {}).map(([k, v]) => `${k}: ${v}`).join('\n') });
      setImages(p.images ?? []);
      setLoading(false);
    });
  }, [id, isNew]);

  async function addImage(source: 'library' | 'camera') {
    if (!user) return;
    setUp(true); setErr(null);
    try {
      for (let i = 0; i < 1; i++) {
        const url = await pickAndUploadImage(source, 'produtos', user.id);
        if (url) setImages((x) => [...x, url].slice(0, 8));
      }
    } catch (e: any) { setErr(e.message || 'Não foi possível enviar a imagem.'); }
    setUp(false);
  }

  async function save() {
    if (!store || !user) return;
    if (!images.length) return setErr('Adicione pelo menos uma fotografia.');
    setBusy(true); setErr(null);
    const specs = Object.fromEntries(f.specs.split('\n').map((l) => l.split(':')).filter((x) => x.length >= 2 && x[0].trim()).map(([k, ...v]) => [k.trim(), v.join(':').trim()]));
    const row = { name: f.name.trim(), brand: f.brand.trim() || null, sku: f.sku.trim() || null, price: Number(f.price), stock: Math.max(0, Number(f.stock) || 0), compare_at_price: f.compare_at_price ? Number(f.compare_at_price) : null, category_id: f.category_id || null, description: f.description.trim(), status: f.status, specs, images };
    const { error } = isNew
      ? await sb.from('products').insert({ ...row, store_id: store.id, slug: `${slugify(f.name)}-${Math.random().toString(36).slice(2, 7)}` })
      : await sb.from('products').update(row).eq('id', id);
    setBusy(false);
    if (error) setErr(error.message); else router.replace('/seller-products');
  }
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });

  if (store === undefined || loading) return <Screen><Loading /></Screen>;
  if (store === null) return <Screen><Card style={{ margin: 16, padding: 20 }}><Text style={{ fontWeight: '900' }}>Sem loja</Text><Text style={{ color: C.muted, marginTop: 6 }}>Registe a sua loja primeiro.</Text></Card></Screen>;

  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={18} color={C.ink} /></Pressable>
        <Text style={styles.title}>{isNew ? 'Novo produto' : 'Editar produto'}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <Card style={{ padding: 16 }}>
          <Text style={styles.label}>Fotografias</Text>
          <View style={styles.imgRow}>
            {images.map((src) => <View key={src} style={styles.imgWrap}><Image source={{ uri: src }} style={styles.img} contentFit="contain" /><Pressable onPress={() => setImages(images.filter((x) => x !== src))} style={styles.imgDel}><Ionicons name="close" size={12} color="#fff" /></Pressable></View>)}
            {images.length < 8 ? <>
              <Pressable onPress={() => addImage('library')} style={styles.addImg}><Ionicons name="images-outline" size={20} color={C.red} /><Text style={styles.addImgText}>Galeria</Text></Pressable>
              <Pressable onPress={() => addImage('camera')} style={styles.addImg}><Ionicons name="camera-outline" size={20} color={C.red} /><Text style={styles.addImgText}>Câmara</Text></Pressable>
            </> : null}
          </View>
          {up ? <Text style={styles.hint}>A enviar imagem…</Text> : null}

          <Input label="Nome" value={f.name} onChangeText={set('name')} />
          <View style={styles.row2}>
            <View style={{ flex: 1 }}><Input label="Preço (Kz)" value={f.price} onChangeText={set('price')} keyboardType="numeric" /></View>
            <View style={{ flex: 1 }}><Input label="Preço antes" value={f.compare_at_price} onChangeText={set('compare_at_price')} keyboardType="numeric" /></View>
          </View>
          <View style={styles.row2}>
            <View style={{ flex: 1 }}><Input label="Stock" value={f.stock} onChangeText={set('stock')} keyboardType="numeric" /></View>
            <View style={{ flex: 1 }}><Input label="Marca" value={f.brand} onChangeText={set('brand')} /></View>
          </View>
          <View style={styles.row2}>
            <View style={{ flex: 1 }}><Input label="SKU" value={f.sku} onChangeText={set('sku')} /></View>
            <View style={{ flex: 1 }}><Text style={styles.label}>Categoria</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 4 }}>{cats.map((c) => <Pressable key={c.id} onPress={() => setF({ ...f, category_id: c.id })} style={[styles.chip, f.category_id === c.id && styles.chipActive]}><Text style={[styles.chipText, f.category_id === c.id && { color: '#fff' }]}>{c.name}</Text></Pressable>)}</ScrollView></View>
          </View>
          <Input label="Descrição" value={f.description} onChangeText={set('description')} multiline />
          <Input label="Especificações (uma por linha, ex.: Cor: Azul)" value={f.specs} onChangeText={set('specs')} multiline />
          <Text style={styles.label}>Estado</Text>
          <View style={styles.chips}>{STATUSES.map((s) => <Pressable key={s} onPress={() => setF({ ...f, status: s })} style={[styles.chip, f.status === s && styles.chipActive]}><Text style={[styles.chipText, f.status === s && { color: '#fff' }]}>{STATUS_LABEL[s]}</Text></Pressable>)}</View>
          {err ? <Text style={styles.err}>{err}</Text> : null}
          <Button title={busy ? 'A guardar…' : 'Guardar'} disabled={busy || up} onPress={save} style={{ marginTop: 12 }} />
        </Card>
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  title: { fontSize: 24, fontWeight: '900', color: C.ink },
  label: { fontSize: 12, fontWeight: '800', color: C.ink, marginBottom: 6 },
  imgRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  imgWrap: { width: 78, height: 78, borderRadius: 14, backgroundColor: C.mist, overflow: 'hidden' },
  img: { width: 78, height: 78 },
  imgDel: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
  addImg: { width: 78, height: 78, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: '#f3c969', alignItems: 'center', justifyContent: 'center', gap: 4 },
  addImgText: { fontSize: 10, fontWeight: '800', color: C.red },
  hint: { fontSize: 11, color: C.muted, marginBottom: 8 },
  row2: { flexDirection: 'row', gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: { borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#fff' },
  chipActive: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { fontSize: 11.5, fontWeight: '800', color: C.ink },
  err: { marginTop: 10, fontSize: 12, color: '#b91c1c', backgroundColor: '#fee2e2', borderRadius: 10, padding: 10 },
});
