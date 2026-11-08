import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button, C, Card, Empty, Loading, Screen } from '../components/ui';
import { sb } from '../lib/supabase';
import { isStaff } from '../lib/seller';
import { useAuth } from '../lib/auth';
import { kz } from '../lib/format';

const STATUS: Record<string, string> = { pending: 'Pendente', in_review: 'Em análise', approved: 'Aprovado', processing: 'Em processamento', paid: 'Pago', rejected: 'Rejeitado' };
const NEXT: Record<string, string[]> = { pending: ['in_review', 'approved', 'rejected'], in_review: ['approved', 'rejected'], approved: ['processing', 'rejected'], processing: ['paid', 'rejected'] };
const CARDS: [string, string][] = [['received', 'Recebido (pagamentos confirmados)'], ['attributed', 'Atribuído aos vendedores'], ['commissions', 'Comissões da plataforma'], ['shipping', 'Portes da plataforma'], ['pending', 'Vendedores: pendente'], ['available', 'Vendedores: disponível'], ['reserved', 'Reservado / disputa'], ['in_payout', 'Em liquidação'], ['paid_out', 'Liquidado (transferido)'], ['refunds', 'Reembolsos'], ['cash', 'Saldo no prestador (ledger)'], ['gateway_charges', 'Confirmado pelo gateway']];
const ENTRY: Record<string, string> = { payment_received: 'Pagamento recebido', platform_fee: 'Comissão da plataforma', shipping_fee: 'Portes', seller_credit: 'Crédito ao vendedor', seller_pending_credit: 'Vendedor pendente', reserve: 'Reserva', reserve_release: 'Reserva libertada', refund: 'Reembolso', adjustment: 'Ajuste', payout_paid: 'Liquidação paga', payout_rejected: 'Liquidação rejeitada' };

export default function AdminFinance() {
  const { profile, user, loading } = useAuth();
  const [sum, setSum] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [mode, setMode] = useState<{ mode?: string; min_amount?: number }>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [subs, setSubs] = useState<any[] | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [sel, setSel] = useState<{ payout: any; status: string } | null>(null);
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [adj, setAdj] = useState({ store: '', amount: '', memo: '', kind: 'adjust' });

  const load = useCallback(async () => {
    const [s, p, e, st, m] = await Promise.all([
      sb.rpc('admin_finance_summary'),
      sb.from('payouts').select('*, stores(name)').not('status', 'in', '(paid,rejected)').order('created_at'),
      sb.from('ledger_entries').select('*, stores(name), orders(number)').order('id', { ascending: false }).limit(300),
      sb.from('stores').select('id,name').order('name'),
      sb.from('settings').select('value').eq('key', 'payout_mode').maybeSingle(),
    ]);
    if (s.error) setMsg(s.error.message);
    setSum(s.data); setPayouts((p.data as any[]) ?? []); setEntries((e.data as any[]) ?? []); setStores((st.data as any[]) ?? []); setMode((m.data?.value as typeof mode) ?? {});
  }, []);
  useEffect(() => { if (!loading && user && isStaff(profile?.role)) load(); }, [loading, user, profile, load]);

  async function run(fn: string, args: Record<string, unknown>, ok: string) {
    setMsg(null);
    const { error } = await sb.rpc(fn, args);
    if (error) setMsg(error.message); else { setMsg(ok); load(); }
    return !error;
  }
  async function payoutAction() {
    if (!sel) return;
    const ok = await run('admin_set_payout_status', { p_payout: sel.payout.id, p_status: sel.status, p_reference: reference || null, p_note: note || null }, `Liquidação: ${STATUS[sel.status]}`);
    if (ok) { setSel(null); setReference(''); setNote(''); }
  }
  async function findOrder() {
    if (!orderNo) return;
    const { data } = await sb.from('orders').select('id, sub_orders(id,seller_net,commission_amount,shipping_fee,status,stores(name))').eq('number', Number(orderNo)).maybeSingle();
    setSubs(((data?.sub_orders as any[] | undefined) ?? []));
  }
  async function refund(s: any) {
    const reason = refundReason.trim();
    if (!reason) return setMsg('Indique o motivo do reembolso.');
    const ok = await run('admin_refund_sub', { p_sub: s.id, p_reason: reason }, 'Reembolso registado no ledger. Execute a devolução real no banco/prestador.');
    if (ok) { setSubs(null); setOrderNo(''); setRefundReason(''); }
  }
  async function adjust() {
    const amount = Number(adj.amount);
    const args = { p_store: adj.store, p_amount: amount, p_memo: adj.memo };
    const ok = adj.kind === 'adjust'
      ? await run('admin_ledger_adjust', args, 'Ajuste registado.')
      : await run('admin_reserve', { ...args, p_release: adj.kind === 'release' }, adj.kind === 'release' ? 'Reserva libertada.' : 'Valor reservado.');
    if (ok) setAdj({ ...adj, amount: '', memo: '' });
  }
  async function saveMode(next: string) {
    const { error } = await sb.from('settings').upsert({ key: 'payout_mode', value: { ...mode, mode: next } });
    if (error) setMsg(error.message); else load();
  }

  if (loading) return <Screen><Loading /></Screen>;
  if (!user || !isStaff(profile?.role)) return <Screen><Empty icon="shield-outline" title="Sem permissão" /></Screen>;
  const shown = entries.filter((x) => !q || String(x.orders?.number ?? '').includes(q) || (x.stores?.name ?? '').toLowerCase().includes(q.toLowerCase()) || (x.idempotency_key ?? '').includes(q));
  return (
    <Screen scroll={false}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}><Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={18} color={C.ink} /></Pressable><Text style={styles.title}>Central financeira</Text></View>
      <FlatList data={shown} keyExtractor={(e) => String(e.id)} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 140 }} ListHeaderComponent={(
        <View>
          <Text style={styles.note}>Ledger contabilístico interno. A Roque Santeiro não guarda dinheiro de terceiros: os valores são movimentados pelo banco/prestador. Uma liquidação só passa a "Pago" com a referência real da transferência.</Text>
          {msg ? <Text style={styles.msg}>{msg}</Text> : null}
          <View style={styles.grid}>{CARDS.map(([k, l]) => <Card key={k} style={styles.stat}><Text style={styles.statLabel}>{l}</Text><Text style={styles.statValue}>{sum ? kz(Number(sum[k] ?? 0)) : '…'}</Text></Card>)}</View>
          <Card style={{ padding: 14, marginTop: 12 }}>
            <View style={styles.panelHead}><Text style={styles.panelTitle}>Pedidos de liquidação ({payouts.length})</Text><View style={styles.modeRow}>{[['bank_transfer_manual', 'Transferência bancária'], ['disabled', 'Desactivado']].map(([v, l]) => <Pressable key={v} onPress={() => saveMode(v)} style={[styles.modeBtn, (mode.mode ?? 'disabled') === v && styles.modeBtnActive]}><Text style={[styles.modeText, (mode.mode ?? 'disabled') === v && { color: '#fff' }]}>{l}</Text></Pressable>)}</View></View>
            {payouts.length === 0 ? <Text style={styles.hint}>Sem pedidos em aberto.</Text> : payouts.map((p) => <View key={p.id} style={styles.payout}>
              <View style={styles.rowBetween}><Text style={styles.payoutName}>{p.stores?.name} · {kz(p.amount)}</Text><Text style={styles.payoutStatus}>{STATUS[p.status]}</Text></View>
              <Text style={styles.hint}>{new Date(p.created_at).toLocaleString('pt-AO')} · {p.account_holder ?? '—'} · {p.bank_name ?? ''} {p.iban}</Text>
              {sel && sel.payout.id === p.id ? <View style={styles.selBox}>
                <View style={styles.statusRow}>{(NEXT[p.status] ?? []).map((s) => <Pressable key={s} onPress={() => setSel({ payout: p, status: s })} style={[styles.statusChip, sel.status === s && styles.statusChipActive]}><Text style={[styles.statusChipText, sel.status === s && { color: '#fff' }]}>{STATUS[s]}</Text></Pressable>)}</View>
                {sel.status === 'paid' ? <TextInput value={reference} onChangeText={setReference} placeholder="Referência real da transferência (obrigatória)" style={styles.input} /> : null}
                {sel.status === 'rejected' ? <TextInput value={note} onChangeText={setNote} placeholder="Motivo da rejeição" style={styles.input} /> : null}
                <View style={styles.rowEnd}><Button small variant="ghost" title="Cancelar" onPress={() => setSel(null)} /><Button small title="Confirmar" onPress={payoutAction} disabled={sel.status === 'paid' && !reference.trim()} /></View>
              </View> : <View style={styles.rowEnd}>{(NEXT[p.status] ?? []).map((s) => <Pressable key={s} onPress={() => { setSel({ payout: p, status: s }); setReference(''); setNote(''); }} style={[styles.miniBtn, s === 'rejected' && styles.miniBad, s === 'paid' && styles.miniOk]}><Text style={[styles.miniText, s === 'rejected' && { color: '#b91c1c' }, s === 'paid' && { color: '#047857' }]}>{STATUS[s]}</Text></Pressable>)}</View>}
            </View>)}
          </Card>
          <View style={styles.twoCol}>
            <Card style={{ flex: 1, padding: 14 }}>
              <Text style={styles.panelTitle}>Reembolso por encomenda</Text>
              <View style={styles.row2}><TextInput value={orderNo} onChangeText={setOrderNo} placeholder="N.º da encomenda" keyboardType="numeric" style={[styles.input, { flex: 1 }]} /><Button small title="Procurar" onPress={findOrder} /></View>
              {subs?.length === 0 ? <Text style={styles.hint}>Encomenda não encontrada.</Text> : null}
              {subs?.map((s) => <View key={s.id} style={styles.subRow}><Text style={styles.subText}>{s.stores?.name} · {kz(Number(s.seller_net) + Number(s.commission_amount) + Number(s.shipping_fee))}</Text><Pressable onPress={() => refund(s)} style={styles.miniBad}><Text style={styles.miniBadText}>Reembolsar</Text></Pressable></View>)}
              {subs && subs.length > 0 ? <TextInput value={refundReason} onChangeText={setRefundReason} placeholder="Motivo do reembolso (obrigatório)" style={styles.input} /> : null}
            </Card>
            <Card style={{ flex: 1, padding: 14 }}>
              <Text style={styles.panelTitle}>Ajuste ou reserva</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 8 }}>{stores.map((s) => <Pressable key={s.id} onPress={() => setAdj({ ...adj, store: s.id })} style={[styles.chip, adj.store === s.id && styles.chipActive]}><Text style={[styles.chipText, adj.store === s.id && { color: '#fff' }]} numberOfLines={1}>{s.name}</Text></Pressable>)}</ScrollView>
              <View style={styles.row2}>{['adjust', 'reserve', 'release'].map((k) => <Pressable key={k} onPress={() => setAdj({ ...adj, kind: k })} style={[styles.chip, adj.kind === k && styles.chipActive]}><Text style={[styles.chipText, adj.kind === k && { color: '#fff' }]}>{k === 'adjust' ? 'Ajuste' : k === 'reserve' ? 'Reservar' : 'Libertar'}</Text></Pressable>)}</View>
              <View style={styles.row2}><TextInput value={adj.amount} onChangeText={(v) => setAdj({ ...adj, amount: v })} placeholder="Valor (Kz)" keyboardType="numeric" style={[styles.input, { flex: 1 }]} /><TextInput value={adj.memo} onChangeText={(v) => setAdj({ ...adj, memo: v })} placeholder="Motivo" style={[styles.input, { flex: 1 }]} /></View>
              <Button small title="Registar movimento" onPress={adjust} disabled={!adj.store || !adj.amount || !adj.memo} />
            </Card>
          </View>
          <Card style={{ padding: 14, marginTop: 12 }}>
            <View style={styles.panelHead}><Text style={styles.panelTitle}>Reconciliação</Text><TextInput value={q} onChangeText={setQ} placeholder="N.º, loja ou chave" style={[styles.input, { width: 140, marginBottom: 0 }]} /></View>
            {sum && (!sum.diffs || sum.diffs.length === 0) ? <Text style={styles.hint}>Sem diferenças entre encomendas, ledger e gateway.</Text> : null}
            {sum?.diffs?.map((d: any) => <View key={d.id} style={styles.reconRow}><Text style={styles.reconName}>#{d.number}</Text><Text style={styles.reconMeta}>Total {kz(d.total)} · Ledger {kz(d.ledger)} · Gateway {d.gateway === null ? '—' : kz(d.gateway)} · Divisão {kz(d.split)}</Text></View>)}
          </Card>
        </View>
      )} renderItem={({ item }: any) => (
        <Card style={{ padding: 12 }}>
          <View style={styles.rowBetween}><Text style={styles.entryTitle}>{ENTRY[item.entry_type] ?? item.entry_type} · {item.account}</Text><Text style={[styles.entryAmount, Number(item.amount) < 0 && { color: '#b91c1c' }]}>{Number(item.amount) > 0 ? '+' : ''}{kz(Number(item.amount))}</Text></View>
          <Text style={styles.entryMeta}>{item.stores?.name ?? '—'}{item.orders ? ` · encomenda #${item.orders.number}` : ''}{item.payout_id ? ' · liquidação' : ''} · {new Date(item.created_at).toLocaleString('pt-AO')}</Text>
          {item.memo ? <Text style={styles.entryMemo}>{item.memo}</Text> : null}
          <Text style={styles.entryAccount}>{item.idempotency_key}</Text>
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
  modeRow: { flexDirection: 'row', gap: 6 },
  modeBtn: { borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: '#fff' },
  modeBtnActive: { backgroundColor: C.ink, borderColor: C.ink },
  modeText: { fontSize: 10.5, fontWeight: '800', color: C.ink },
  hint: { fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 15 },
  payout: { borderTopWidth: 1, borderTopColor: '#f1f1f2', paddingVertical: 8 },
  payoutName: { fontSize: 13, fontWeight: '900', color: C.ink },
  payoutStatus: { fontSize: 10.5, fontWeight: '800', color: '#b45309' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  rowEnd: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  row2: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' },
  input: { borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, fontSize: 12.5, color: C.ink, backgroundColor: '#fff' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  statusChip: { borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: '#fff' },
  statusChipActive: { backgroundColor: C.ink, borderColor: C.ink },
  statusChipText: { fontSize: 10.5, fontWeight: '800', color: C.ink },
  selBox: { marginTop: 8, backgroundColor: '#fafafa', borderRadius: 12, padding: 10 },
  miniBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  miniOk: { borderColor: '#047857' },
  miniBad: { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
  miniText: { fontSize: 10.5, fontWeight: '800', color: C.ink },
  miniBadText: { fontSize: 10.5, fontWeight: '800', color: '#b91c1c' },
  twoCol: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  subRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTopWidth: 1, borderTopColor: '#f1f1f2', paddingVertical: 6 },
  subText: { flex: 1, fontSize: 11.5, color: C.ink, fontWeight: '700' },
  chip: { borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  chipActive: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { fontSize: 10.5, fontWeight: '800', color: C.ink, maxWidth: 110 },
  reconRow: { borderTopWidth: 1, borderTopColor: '#f5f5f6', paddingVertical: 6 },
  reconName: { fontSize: 12, fontWeight: '900', color: C.ink },
  reconMeta: { fontSize: 10.5, color: C.muted, marginTop: 2 },
  entryTitle: { fontSize: 12.5, fontWeight: '900', color: C.ink, flex: 1 },
  entryAmount: { fontSize: 13, fontWeight: '900', color: '#047857' },
  entryMeta: { fontSize: 10.5, color: C.muted, marginTop: 3 },
  entryMemo: { fontSize: 11, color: C.muted, marginTop: 4, fontStyle: 'italic' },
  entryAccount: { fontSize: 10, color: '#94a3b8', marginTop: 4 },
});
