import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Button, C, Card, Empty, Loading, Screen } from '../components/ui';
import { sb } from '../lib/supabase';
import { isStaff } from '../lib/seller';
import { useAuth } from '../lib/auth';
import { STORE_STATUS } from '../lib/format';
import { StoreAvatar } from '../components/store-avatar';

const FILTERS = ['pending', 'info_requested', 'approved', 'suspended', 'rejected'];

export default function AdminStores() {
  const { profile, user, loading } = useAuth();
  const [filter, setFilter] = useState('pending');
  const [rows, setRows] = useState<any[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [comm, setComm] = useState<Record<string, string>>({});
  const [sel, setSel] = useState<{ store: any; status: string } | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    const { data } = await sb.from('stores').select('*').eq('status', filter).order('created_at', { ascending: false });
    setRows((data as any[]) ?? []);
  }, [filter]);
  useEffect(() => { if (!loading && user && isStaff(profile?.role)) load(); }, [loading, user, profile, load]);

  function ask(store: any, status: string) { setSel({ store, status }); setNote(''); }
  async function act() {
    if (!sel) return;
    const c = comm[sel.store.id];
    const { error } = await sb.rpc('admin_set_store_status', { p_store: sel.store.id, p_status: sel.status, p_note: note || null, p_commission: c ? Number(c) : null });
    setMsg(error ? error.message : `${sel.store.name}: ${STORE_STATUS[sel.status]}`);
    setSel(null); load();
  }

  if (loading) return <Screen><Loading /></Screen>;
  if (!user || !isStaff(profile?.role)) return <Screen><Empty icon="shield-outline" title="Sem permissão" /></Screen>;
  return (
    <Screen scroll={false}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}><Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={18} color={C.ink} /></Pressable><Text style={styles.title}>Lojas e vendedores</Text></View>
      <View style={styles.filters}>{FILTERS.map((f) => <Pressable key={f} onPress={() => setFilter(f)} style={[styles.filter, filter === f && styles.filterActive]}><Text style={[styles.filterText, filter === f && { color: '#fff' }]}>{STORE_STATUS[f]}</Text></Pressable>)}</View>
      {msg ? <Text style={styles.msg}>{msg}</Text> : null}
      {sel ? (
        <Card style={{ margin: 16, padding: 14 }}>
          <Text style={styles.selTitle}>{sel.status === 'approved' ? 'Aprovar' : STORE_STATUS[sel.status]} · {sel.store.name}</Text>
          {sel.status !== 'approved' ? <TextInput value={note} onChangeText={setNote} placeholder="Nota para o vendedor (motivo / informação pedida)" style={styles.input} multiline /> : null}
          <TextInput value={comm[sel.store.id] ?? ''} onChangeText={(v) => setComm({ ...comm, [sel.store.id]: v })} placeholder="Comissão % (vazio = global)" keyboardType="numeric" style={styles.input} />
          <View style={styles.selActions}><Button small variant="ghost" title="Cancelar" onPress={() => setSel(null)} /><Button small title="Confirmar" onPress={act} /></View>
        </Card>
      ) : null}
      {!rows ? <Loading /> : rows.length === 0 ? <Empty icon="storefront-outline" title="Nenhuma loja neste estado" /> : (
        <FlatList data={rows} keyExtractor={(s) => s.id} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 140 }} renderItem={({ item: s }) => (
          <Card style={{ padding: 14 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <StoreAvatar store={s} size={52} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{s.name} {s.is_official ? <Text style={styles.official}>oficial</Text> : null}</Text>
                <Text style={styles.meta}>{s.responsible_name} · {s.phone} · WhatsApp {s.whatsapp} · {s.email}</Text>
                <Text style={styles.meta}>{[s.address, s.city, s.province].filter(Boolean).join(', ')} · {new Date(s.created_at).toLocaleDateString('pt-AO')}</Text>
                {s.description ? <Text numberOfLines={2} style={styles.desc}>{s.description}</Text> : null}
                {s.documents_url ? <Text style={styles.doc}>Documento anexado</Text> : null}
              </View>
            </View>
            <View style={styles.actions}>
              {s.status !== 'approved' ? <Pressable onPress={() => ask(s, 'approved')} style={styles.btnOk}><Text style={styles.btnOkText}>{s.status === 'suspended' ? 'Reactivar' : 'Aprovar'}</Text></Pressable> : null}
              {s.status !== 'info_requested' && s.status !== 'approved' ? <Pressable onPress={() => ask(s, 'info_requested')} style={styles.btnGhost}><Text style={styles.btnGhostText}>Pedir informação</Text></Pressable> : null}
              {s.status === 'approved' ? <Pressable onPress={() => ask(s, 'suspended')} style={styles.btnWarn}><Text style={styles.btnWarnText}>Suspender</Text></Pressable> : null}
              {s.status !== 'rejected' && s.status !== 'approved' ? <Pressable onPress={() => ask(s, 'rejected')} style={styles.btnBad}><Text style={styles.btnBadText}>Rejeitar</Text></Pressable> : null}
              {s.status === 'approved' ? <Pressable onPress={() => router.push(`/loja/${s.slug}`)} style={styles.btnGhost}><Text style={styles.btnGhostText}>Ver loja</Text></Pressable> : null}
            </View>
          </Card>
        )} />
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: C.ink },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 16 },
  filter: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line },
  filterActive: { backgroundColor: C.ink, borderColor: C.ink },
  filterText: { fontSize: 11.5, fontWeight: '800', color: C.ink },
  msg: { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#f0fdf4', color: '#166534', borderRadius: 12, padding: 10, fontSize: 12 },
  selTitle: { fontSize: 15, fontWeight: '900', color: C.ink, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: C.ink, marginBottom: 8, minHeight: 44, textAlignVertical: 'top' },
  selActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  name: { fontSize: 15, fontWeight: '900', color: C.ink },
  official: { fontSize: 11, color: C.red, fontWeight: '800' },
  meta: { fontSize: 11, color: C.muted, marginTop: 3 },
  desc: { fontSize: 12, color: 'rgba(24,24,27,0.75)', marginTop: 6 },
  doc: { fontSize: 11, color: '#1d4ed8', marginTop: 6, fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  btnOk: { backgroundColor: '#047857', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  btnOkText: { color: '#fff', fontSize: 11.5, fontWeight: '900' },
  btnGhost: { backgroundColor: '#eef2ff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  btnGhostText: { color: '#3730a3', fontSize: 11.5, fontWeight: '900' },
  btnWarn: { backgroundColor: '#fef3c7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  btnWarnText: { color: '#92400e', fontSize: 11.5, fontWeight: '900' },
  btnBad: { backgroundColor: '#fee2e2', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  btnBadText: { color: '#b91c1c', fontSize: 11.5, fontWeight: '900' },
});
