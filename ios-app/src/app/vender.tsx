import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button, C, Card, Input, Loading, Screen } from '../components/ui';
import { useAuth } from '../lib/auth';
import { sb } from '../lib/supabase';
import { pickAndUploadImage, slugify } from '../lib/seller';
import { PROVINCES, STORE_STATUS } from '../lib/format';

const perks = [
  { icon: 'storefront-outline' as const, t: 'Loja pública própria', d: 'Página com o seu logo, banner e produtos que qualquer pessoa pode visitar.' },
  { icon: 'cube-outline' as const, t: 'Gestão simples', d: 'Publique produtos, controle stock e encomendas pelo telemóvel.' },
  { icon: 'pricetag-outline' as const, t: 'Comissão transparente', d: 'Só paga uma comissão quando vende.' },
  { icon: 'wallet-outline' as const, t: 'Receba as suas vendas', d: 'Acompanhe o saldo e peça levantamentos para o seu IBAN.' },
];

export default function Vender() {
  const { user, loading } = useAuth();
  const [existing, setExisting] = useState<any>(undefined);
  const [f, setF] = useState({ name: '', responsible: '', phone: '', whatsapp: '', email: '', province: 'Luanda', city: '', address: '', description: '' });
  const [logo, setLogo] = useState<string | null>(null);
  const [doc, setDoc] = useState<string | null>(null);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setExisting(null); return; }
    setF((x) => ({ ...x, email: x.email || user.email || '' }));
    sb.from('stores').select('id,status,name,admin_note,slug').eq('owner_id', user.id).maybeSingle().then(({ data }) => setExisting(data));
  }, [user]);

  async function pick(kind: 'logo' | 'doc', source: 'library' | 'camera') {
    if (!user) return router.push('/auth?next=/vender');
    setErr(null);
    try {
      const url = await pickAndUploadImage(source, kind === 'logo' ? 'lojas' : 'documentos', user.id);
      if (kind === 'logo') setLogo(url); else setDoc(url);
    } catch (e: any) { setErr(e.message || 'Não foi possível enviar o ficheiro.'); }
  }

  async function submit() {
    if (!user) return router.push('/auth?next=/vender');
    if (!terms) return setErr('Aceite os termos de vendedor.');
    setBusy(true); setErr(null);
    const { error } = await sb.from('stores').insert({
      slug: `${slugify(f.name)}-${Math.random().toString(36).slice(2, 6)}`, name: f.name.trim(), responsible_name: f.responsible.trim(),
      phone: f.phone.trim(), whatsapp: f.whatsapp.trim(), email: f.email.trim(), province: f.province, city: f.city.trim(), address: f.address.trim(),
      description: f.description.trim(), logo_url: logo, documents_url: doc, terms_accepted_at: new Date().toISOString(), delivery_methods: ['seller', 'rse', 'pickup'],
    });
    setBusy(false);
    if (error) setErr(error.message); else router.replace('/seller');
  }
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });

  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={18} color={C.ink} /></Pressable>
        <Text style={styles.title}>Venda para toda Angola</Text>
        <Text style={styles.sub}>Abra a sua loja no Roque Santeiro Express e chegue a milhares de clientes.</Text>
      </View>
      <View style={styles.perks}>{perks.map((p) => <Card key={p.t} style={styles.perk}><Ionicons name={p.icon} size={20} color={C.red} /><Text style={styles.perkTitle}>{p.t}</Text><Text style={styles.perkSub}>{p.d}</Text></Card>)}</View>
      <View style={{ paddingHorizontal: 16 }}>
        {loading || existing === undefined ? <Loading /> : existing ? (
          <Card style={{ padding: 20, alignItems: 'center' }}>
            <Text style={styles.storeName}>{existing.name}</Text>
            <Text style={styles.storeStatus}>{STORE_STATUS[existing.status] || existing.status}</Text>
            {existing.admin_note ? <Text style={styles.note}>{existing.admin_note}</Text> : null}
            <Button title="Abrir painel do vendedor" onPress={() => router.push('/seller')} style={{ marginTop: 14, alignSelf: 'stretch' }} />
          </Card>
        ) : !user ? (
          <Card style={{ padding: 20, alignItems: 'center' }}><Text style={styles.storeName}>Crie conta ou entre para registar a sua loja.</Text><Button title="Entrar / Registar" onPress={() => router.push('/auth?next=/vender')} style={{ marginTop: 14, alignSelf: 'stretch' }} /></Card>
        ) : (
          <Card style={{ padding: 16 }}>
            <Text style={styles.formTitle}>Tornar-se vendedor</Text>
            <Input label="Nome comercial" value={f.name} onChangeText={set('name')} />
            <Input label="Nome do responsável" value={f.responsible} onChangeText={set('responsible')} />
            <Input label="Telefone" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
            <Input label="WhatsApp" value={f.whatsapp} onChangeText={set('whatsapp')} keyboardType="phone-pad" />
            <Input label="Email" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
            <Text style={styles.label}>Província</Text>
            <View style={styles.chips}>{PROVINCES.map((p) => <Pressable key={p} onPress={() => setF({ ...f, province: p })} style={[styles.chip, f.province === p && styles.chipActive]}><Text style={[styles.chipText, f.province === p && { color: '#fff' }]}>{p}</Text></Pressable>)}</View>
            <Input label="Município" value={f.city} onChangeText={set('city')} />
            <Input label="Endereço" value={f.address} onChangeText={set('address')} />
            <Input label="Descrição da loja" value={f.description} onChangeText={set('description')} multiline />
            <Text style={styles.label}>Logo da loja</Text>
            <View style={styles.uploadRow}>
              <Button small variant="ghost" title={logo ? 'Logo carregado' : 'Galeria'} onPress={() => pick('logo', 'library')} />
              <Button small variant="ghost" title="Câmara" onPress={() => pick('logo', 'camera')} />
            </View>
            <Text style={styles.label}>Documento (NIF / alvará)</Text>
            <View style={styles.uploadRow}>
              <Button small variant="ghost" title={doc ? 'Documento carregado' : 'Galeria'} onPress={() => pick('doc', 'library')} />
              <Button small variant="ghost" title="Câmara" onPress={() => pick('doc', 'camera')} />
            </View>
            <Pressable onPress={() => setTerms(!terms)} style={styles.terms}><Ionicons name={terms ? 'checkbox' : 'square-outline'} size={18} color={C.red} /><Text style={styles.termsText}>Aceito os termos de vendedor e a comissão da plataforma.</Text></Pressable>
            {err ? <Text style={styles.err}>{err}</Text> : null}
            <Button title={busy ? 'A enviar…' : 'Enviar pedido'} disabled={busy} onPress={submit} style={{ marginTop: 12 }} />
            <Text style={styles.fine}>A sua loja fica “Pendente de aprovação” até a nossa equipa verificar os dados.</Text>
          </Card>
        )}
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  title: { fontSize: 26, fontWeight: '900', color: C.ink },
  sub: { marginTop: 4, fontSize: 13, color: C.muted, lineHeight: 18 },
  perks: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16 },
  perk: { width: '48%', padding: 12 },
  perkTitle: { marginTop: 8, fontSize: 13, fontWeight: '900', color: C.ink },
  perkSub: { marginTop: 4, fontSize: 11, color: C.muted, lineHeight: 15 },
  storeName: { fontSize: 18, fontWeight: '900', color: C.ink },
  storeStatus: { marginTop: 6, fontSize: 13, fontWeight: '800', color: C.red },
  note: { marginTop: 10, fontSize: 12, color: C.muted, textAlign: 'center' },
  formTitle: { fontSize: 18, fontWeight: '900', color: C.ink, marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '800', color: C.ink, marginBottom: 6, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: { borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  chipActive: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { fontSize: 11, fontWeight: '800', color: C.ink },
  uploadRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  terms: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  termsText: { flex: 1, fontSize: 12, color: C.ink, lineHeight: 17 },
  err: { marginTop: 10, fontSize: 12, color: '#b91c1c', backgroundColor: '#fee2e2', borderRadius: 10, padding: 10 },
  fine: { marginTop: 10, fontSize: 11, color: C.muted, textAlign: 'center' },
});
