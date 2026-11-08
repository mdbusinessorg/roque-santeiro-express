import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Button, C, Card, Chip, Empty, Input, Loading, Screen } from '../components/ui';
import { useAuth } from '../lib/auth';
import { deleteAddress, getAddresses, saveAddress } from '../lib/api';
import { PROVINCES } from '../lib/format';

export default function Addresses() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ label: 'Casa', province: 'Luanda', city: '', street: '', reference: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(async () => { if (!user) { setItems([]); setLoading(false); return; } setItems(await getAddresses(user.id)); setLoading(false); }, [user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  if (!user) return <Screen><Empty icon="location-outline" title="Entre na sua conta" action="Entrar" onAction={() => router.push('/auth?next=/addresses')} /></Screen>;
  if (loading) return <Screen><Loading /></Screen>;
  async function save() {
    if (!form.city.trim() || !form.street.trim()) { setMsg('Preenche cidade e rua.'); return; }
    setBusy(true); setMsg(null);
    try { await saveAddress(user!.id, form); setForm({ label: 'Casa', province: 'Luanda', city: '', street: '', reference: '' }); await load(); setMsg('Endereço guardado.'); } catch (e: any) { setMsg(e?.message ?? 'Erro ao guardar.'); }
    setBusy(false);
  }
  return (
    <Screen>
      <View style={styles.head}><Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={C.ink} /></Pressable><Text style={styles.title}>Endereços</Text><View style={{ width: 22 }} /></View>
      {items.map((a) => (
        <Card key={a.id} style={styles.addr}>
          <View style={{ flex: 1 }}><Text style={styles.addrTitle}>{a.label}{a.is_default ? ' · Padrão' : ''}</Text><Text style={styles.addrText}>{a.province}, {a.city}, {a.street}{a.reference ? ` · ${a.reference}` : ''}</Text></View>
          <Pressable onPress={async () => { await deleteAddress(a.id); load(); }}><Ionicons name="trash-outline" size={18} color={C.red} /></Pressable>
        </Card>
      ))}
      <Card style={{ padding: 14, marginTop: 10 }}>
        <Text style={styles.section}>Adicionar endereço</Text>
        <Input label="Etiqueta" value={form.label} onChangeText={(v) => setForm({ ...form, label: v })} />
        <Text style={styles.label}>Província</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>{PROVINCES.map((p) => <Chip key={p} label={p} active={form.province === p} onPress={() => setForm({ ...form, province: p })} />)}</View>
        <Input label="Cidade / Município" value={form.city} onChangeText={(v) => setForm({ ...form, city: v })} />
        <Input label="Rua / Avenida" value={form.street} onChangeText={(v) => setForm({ ...form, street: v })} />
        <Input label="Referência" value={form.reference} onChangeText={(v) => setForm({ ...form, reference: v })} />
        {msg ? <Text style={styles.msg}>{msg}</Text> : null}
        <Button title={busy ? 'A guardar…' : 'Guardar endereço'} onPress={save} disabled={busy} />
      </Card>
    </Screen>
  );
}
const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '900', color: C.ink },
  addr: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, marginBottom: 10 },
  addrTitle: { fontSize: 14, fontWeight: '900', color: C.ink },
  addrText: { fontSize: 12.5, color: C.muted, marginTop: 3 },
  section: { fontSize: 15, fontWeight: '900', color: C.ink, marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '800', color: C.ink, marginBottom: 6 },
  msg: { marginBottom: 10, fontSize: 12, fontWeight: '800', color: C.green },
});
