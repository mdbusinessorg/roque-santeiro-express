import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button, C, Card, Empty, Loading, Screen } from '../components/ui';
import { sb } from '../lib/supabase';
import { isStaff } from '../lib/seller';
import { useAuth } from '../lib/auth';
import { kz } from '../lib/format';

const KIND: Record<string, string> = { affiliate: 'Afiliado', agent: 'Agente comercial', regional: 'Representante regional' };
const PST: Record<string, string> = { pending: 'Em análise', active: 'Activo', suspended: 'Suspenso', rejected: 'Rejeitado' };
const CST: Record<string, string> = { pending: 'Pendente', approved: 'Aprovada', paid: 'Paga', reversed: 'Anulada' };
const CARDS: [string, string, boolean][] = [['affiliates', 'Afiliados activos', false], ['agents', 'Agentes comerciais', false], ['regionals', 'Representantes regionais', false], ['pending_partners', 'Candidaturas por analisar', false], ['clicks', 'Visitas por links', false], ['conversions', 'Encomendas atribuídas', false], ['paid_orders', 'Encomendas pagas', false], ['sales', 'Vendas atribuídas', true], ['pending', 'Comissões pendentes', true], ['approved', 'Comissões aprovadas', true], ['paid', 'Comissões pagas', true], ['reversed', 'Comissões anuladas', true]];
const FILTERS = ['pending', 'active', 'suspended', 'rejected', 'all'];

export default function AdminPartners() {
  const { profile, user, loading } = useAuth();
  const [sum, setSum] = useState<any>(null);
  const [partners, setPartners] = useState<any[]>([]);
  const [comms, setComms] = useState<any[]>([]);
  const [filter, setFilter] = useState('pending');
  const [msg, setMsg] = useState<string | null>(null);
  const [pay, setPay] = useState<{ partner: any; due: number; reference: string; note: string } | null>(null);
  const [pact, setPact] = useState<{ partner: any; status: string; note: string } | null>(null);
  const [rev, setRev] = useState<{ comm: any; reason: string } | null>(null);

  const load = useCallback(async () => {
    const [s, p, c] = await Promise.all([
      sb.rpc('admin_partners_summary'),
      sb.from('partners').select('*').order('created_at', { ascending: false }),
      sb.from('partner_commissions').select('*, partners(display_name, code)').order('created_at', { ascending: false }).limit(300),
    ]);
    if (s.error) setMsg(s.error.message);
    setSum(s.data); setPartners((p.data as any[]) ?? []); setComms((c.data as any[]) ?? []);
  }, []);
  useEffect(() => { if (!loading && user && isStaff(profile?.role)) load(); }, [loading, user, profile, load]);

  async function run(fn: string, args: Record<string, unknown>, ok: string) {
    setMsg(null);
    const { error } = await sb.rpc(fn, args);
    if (error) setMsg(error.message); else { setMsg(ok); load(); }
    return !error;
  }
  function due(id: string) { return comms.filter((c) => c.partner_id === id && c.status === 'approved').reduce((a, c) => a + Number(c.amount), 0); }
  async function setStatus() {
    if (!pact) return;
    const note = pact.status === 'rejected' || pact.status === 'suspended' ? pact.note.trim() : null;
    if ((pact.status === 'rejected' || pact.status === 'suspended') && !note) return setMsg('Indique o motivo.');
    const ok = await run('admin_set_partner', { p_partner: pact.partner.id, p_status: pact.status, p_kind: null, p_note: note }, `Parceiro ${PST[pact.status].toLowerCase()}.`);
    if (ok) setPact(null);
  }
  async function payPartner() {
    if (!pay) return;
    const ref = pay.reference.trim();
    if (!ref) return setMsg('Indique a referência real da transferência.');
    const ok = await run('admin_pay_partner', { p_partner: pay.partner.id, p_method: 'Transferência bancária', p_reference: ref, p_note: pay.note || null }, 'Pagamento registado.');
    if (ok) setPay(null);
  }
  async function commission() {
    if (!rev) return;
    const reason = rev.reason.trim();
    if (!reason) return setMsg('Indique o motivo da anulação.');
    const ok = await run('admin_partner_commission', { p_commission: rev.comm.id, p_action: 'reverse', p_reason: reason }, 'Comissão anulada.');
    if (ok) setRev(null);
  }

  if (loading) return <Screen><Loading /></Screen>;
  if (!user || !isStaff(profile?.role)) return <Screen><Empty icon="shield-outline" title="Sem permissão" /></Screen>;
  const shownPartners = partners.filter((p) => filter === 'all' || p.status === filter);
  return (
    <Screen scroll={false}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}><Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={18} color={C.ink} /></Pressable><Text style={styles.title}>Roque Partners</Text></View>
      <FlatList data={comms} keyExtractor={(c) => c.id} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 140 }} ListHeaderComponent={(
        <View>
          <Text style={styles.note}>Regra: o parceiro recebe 20% da comissão efectivamente recebida pela plataforma (não do valor da venda). A comissão nasce quando o pagamento é confirmado, é aprovada com a entrega e anulada em cancelamentos, devoluções ou reembolsos. Não há pagamentos por recrutamento.</Text>
          {msg ? <Text style={styles.msg}>{msg}</Text> : null}
          <View style={styles.grid}>{CARDS.map(([k, l, money]) => <Card key={k} style={styles.stat}><Text style={styles.statLabel}>{l}</Text><Text style={styles.statValue}>{sum ? (money ? kz(Number(sum[k] ?? 0)) : (sum[k] ?? 0)) : '…'}</Text></Card>)}</View>
          <Card style={{ padding: 14, marginTop: 12 }}>
            <View style={styles.panelHead}><Text style={styles.panelTitle}>Parceiros</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{FILTERS.map((s) => <Pressable key={s} onPress={() => setFilter(s)} style={[styles.filter, filter === s && styles.filterActive]}><Text style={[styles.filterText, filter === s && { color: '#fff' }]}>{s === 'all' ? 'Todos' : PST[s]}</Text></Pressable>)}</ScrollView></View>
            {shownPartners.length === 0 ? <Text style={styles.hint}>Nenhum parceiro neste estado.</Text> : shownPartners.map((p) => { const d = due(p.id); return <View key={p.id} style={styles.partner}>
              <View style={styles.rowBetween}><View style={{ flex: 1 }}><Text style={styles.name}>{p.display_name} · <Text style={styles.code}>{p.code}</Text></Text><Text style={styles.meta}>{KIND[p.kind] ?? p.kind} · {PST[p.status]} · {p.phone ?? '—'} · {p.region ?? '—'} · {p.channel ?? '—'}</Text><Text style={styles.meta}>{p.iban ? `${p.bank_name ?? 'Banco'} · ${p.iban}` : 'Sem IBAN'}{p.account_holder ? ` · ${p.account_holder}` : ''}</Text></View></View>
              <View style={styles.actions}>
                {p.status !== 'active' ? <Pressable onPress={() => setPact({ partner: p, status: 'active', note: '' })} style={styles.btnOk}><Text style={styles.btnOkText}>Aprovar</Text></Pressable> : <Pressable onPress={() => setPact({ partner: p, status: 'suspended', note: '' })} style={styles.btnWarn}><Text style={styles.btnWarnText}>Suspender</Text></Pressable>}
                {p.status === 'pending' ? <Pressable onPress={() => setPact({ partner: p, status: 'rejected', note: '' })} style={styles.btnBad}><Text style={styles.btnBadText}>Rejeitar</Text></Pressable> : null}
                {d > 0 ? <Pressable onPress={() => setPay({ partner: p, due: d, reference: '', note: '' })} style={styles.btnPay}><Text style={styles.btnPayText}>Pagar {kz(d)}</Text></Pressable> : null}
              </View>
            </View>; })}
          </Card>
          {pact ? <Card style={{ padding: 14, marginTop: 12 }}><Text style={styles.panelTitle}>{pact.status === 'active' ? 'Aprovar' : PST[pact.status]} · {pact.partner.display_name}</Text>{pact.status !== 'active' ? <TextInput value={pact.note} onChangeText={(v) => setPact({ ...pact, note: v })} placeholder="Motivo (obrigatório)" style={styles.input} /> : null}<View style={styles.rowEnd}><Button small variant="ghost" title="Cancelar" onPress={() => setPact(null)} /><Button small title="Confirmar" onPress={setStatus} /></View></Card> : null}
          {pay ? <Card style={{ padding: 14, marginTop: 12 }}><Text style={styles.panelTitle}>Pagar {pay.partner.display_name}</Text><Text style={styles.hint}>A pagar: {kz(pay.due)}. Indique a referência real da transferência.</Text><TextInput value={pay.reference} onChangeText={(v) => setPay({ ...pay, reference: v })} placeholder="Referência da transferência (obrigatória)" style={styles.input} /><TextInput value={pay.note} onChangeText={(v) => setPay({ ...pay, note: v })} placeholder="Nota (opcional)" style={styles.input} /><View style={styles.rowEnd}><Button small variant="ghost" title="Cancelar" onPress={() => setPay(null)} /><Button small title="Registar pagamento" onPress={payPartner} disabled={!pay.reference.trim()} /></View></Card> : null}
          {rev ? <Card style={{ padding: 14, marginTop: 12 }}><Text style={styles.panelTitle}>Anular comissão · #{rev.comm.order_number}</Text><Text style={styles.hint}>{kz(rev.comm.amount)} · {rev.comm.partners?.display_name}</Text><TextInput value={rev.reason} onChangeText={(v) => setRev({ ...rev, reason: v })} placeholder="Motivo da anulação (obrigatório)" style={styles.input} /><View style={styles.rowEnd}><Button small variant="ghost" title="Cancelar" onPress={() => setRev(null)} /><Button small title="Anular" onPress={commission} disabled={!rev.reason.trim()} /></View></Card> : null}
        </View>
      )} ListEmptyComponent={<Card style={{ padding: 14 }}><Text style={styles.hint}>Ainda sem vendas atribuídas.</Text></Card>} renderItem={({ item: c }) => (
        <Card style={{ padding: 12 }}>
          <View style={styles.rowBetween}><Text style={styles.entryTitle}>#{c.order_number} · {c.partners?.display_name} ({c.partners?.code})</Text><Text style={styles.entryAmount}>{kz(c.amount)}</Text></View>
          <Text style={styles.entryMeta}>{new Date(c.created_at).toLocaleString('pt-AO')} · venda {kz(c.sale_amount)} · comissão plataforma {kz(c.platform_commission)}</Text>
          <View style={styles.rowEnd}><Text style={styles.badge}>{CST[c.status] ?? c.status}</Text>{c.status === 'pending' ? <Pressable onPress={() => run('admin_partner_commission', { p_commission: c.id, p_action: 'approve', p_reason: null }, 'Comissão aprovada.')} style={styles.miniOk}><Text style={styles.miniOkText}>Aprovar</Text></Pressable> : null}{c.status === 'pending' || c.status === 'approved' ? <Pressable onPress={() => setRev({ comm: c, reason: '' })} style={styles.miniBad}><Text style={styles.miniBadText}>Anular</Text></Pressable> : null}</View>
        </Card>
      )} />
    </Screen>
  );
}
const styles = StyleSheet.create({
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: C.ink },
  note: { fontSize: 11, color: C.muted, backgroundColor: '#fafafa', borderRadius: 12, padding: 10, marginBottom: 10, lineHeight: 15 },
  msg: { marginBottom: 10, backgroundColor: '#f0fdf4', color: '#166534', borderRadius: 12, padding: 10, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '31.5%', padding: 12 },
  statLabel: { fontSize: 10, color: C.muted, fontWeight: '700' },
  statValue: { fontSize: 13.5, fontWeight: '900', color: C.ink, marginTop: 4 },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  panelTitle: { fontSize: 14, fontWeight: '900', color: C.ink, marginBottom: 8 },
  filters: { gap: 6 },
  filter: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line },
  filterActive: { backgroundColor: C.ink, borderColor: C.ink },
  filterText: { fontSize: 10.5, fontWeight: '800', color: C.ink },
  hint: { fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 15 },
  partner: { borderTopWidth: 1, borderTopColor: '#f1f1f2', paddingVertical: 8 },
  name: { fontSize: 13.5, fontWeight: '900', color: C.ink },
  code: { color: '#b45309' },
  meta: { fontSize: 11, color: C.muted, marginTop: 3 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  rowEnd: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  btnOk: { backgroundColor: '#047857', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  btnOkText: { color: '#fff', fontSize: 11.5, fontWeight: '900' },
  btnWarn: { backgroundColor: '#fef3c7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  btnWarnText: { color: '#92400e', fontSize: 11.5, fontWeight: '900' },
  btnBad: { backgroundColor: '#fee2e2', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  btnBadText: { color: '#b91c1c', fontSize: 11.5, fontWeight: '900' },
  btnPay: { backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  btnPayText: { color: C.gold, fontSize: 11.5, fontWeight: '900' },
  input: { borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: C.ink, backgroundColor: '#fff', marginBottom: 8 },
  entryTitle: { fontSize: 12.5, fontWeight: '900', color: C.ink, flex: 1 },
  entryAmount: { fontSize: 13, fontWeight: '900', color: C.ink },
  entryMeta: { fontSize: 10.5, color: C.muted, marginTop: 3 },
  badge: { fontSize: 10.5, fontWeight: '900', color: C.muted, backgroundColor: '#f5f5f6', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  miniOk: { backgroundColor: '#047857', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  miniOkText: { color: '#fff', fontSize: 10.5, fontWeight: '800' },
  miniBad: { backgroundColor: '#fee2e2', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  miniBadText: { color: '#b91c1c', fontSize: 10.5, fontWeight: '800' },
});
