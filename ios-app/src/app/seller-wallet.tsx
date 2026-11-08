import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button, C, Card, Empty, Input, Loading, Screen } from '../components/ui';
import { sb } from '../lib/supabase';
import { useMyStore } from '../lib/seller';
import { kz } from '../lib/format';

type Bal = { pending: number; available: number; reserved: number; in_payout: number; withdrawn: number; to_receive: number };
type Payout = { id: string; amount: number; status: string; iban: string; account_holder: string | null; bank_name: string | null; provider_reference: string | null; rejection_reason: string | null; created_at: string; processed_at: string | null };
type Entry = { id: number; created_at: string; entry_type: string; account: string; amount: number; memo: string | null; order_id: string | null };
const PAYOUT_STATUS: Record<string, string> = { pending: 'Pendente', in_review: 'Em análise', approved: 'Aprovado', processing: 'Em processamento', paid: 'Pago', rejected: 'Rejeitado' };
const ENTRY: Record<string, string> = { seller_credit: 'Venda (aguarda entrega)', shipping_fee: 'Portes', release_to_available: 'Entrega concluída', reserve: 'Reserva', reserve_release: 'Reserva libertada', refund: 'Reembolso', adjustment: 'Ajuste', payout_requested: 'Pedido de liquidação', payout_paid: 'Liquidação paga', payout_rejected: 'Liquidação rejeitada' };
const ACCOUNT: Record<string, string> = { seller_pending: 'Pendente', seller_available: 'Disponível', seller_reserved: 'Reservado', seller_payout_hold: 'Em liquidação', seller_paid: 'Recebido' };

export default function SellerWallet() {
  const { store } = useMyStore('/seller-wallet');
  const [bal, setBal] = useState<Bal | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [mode, setMode] = useState<{ mode?: string; min_amount?: number }>({});
  const [form, setForm] = useState({ amount: '', iban: '', holder: '', bank: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (id: string) => {
    const [b, p, e, s] = await Promise.all([
      sb.rpc('store_balance', { p_store: id }),
      sb.from('payouts').select('*').eq('store_id', id).order('created_at', { ascending: false }),
      sb.from('ledger_entries').select('id,created_at,entry_type,account,amount,memo,order_id').eq('store_id', id).like('account', 'seller_%').order('id', { ascending: false }).limit(200),
      sb.from('settings').select('value').eq('key', 'payout_mode').maybeSingle(),
    ]);
    setBal(b.data as Bal); setPayouts((p.data as Payout[]) ?? []); setEntries((e.data as Entry[]) ?? []);
    setMode((s.data?.value as typeof mode) ?? {});
    const last = (p.data as Payout[] | null)?.[0];
    if (last) setForm((f) => ({ ...f, iban: f.iban || last.iban, holder: f.holder || last.account_holder || '', bank: f.bank || last.bank_name || '' }));
  }, []);
  useEffect(() => { if (store) load(store.id); }, [store, load]);

  async function request() {
    if (!store) return;
    setBusy(true); setMsg(null);
    const { error } = await sb.rpc('request_payout', { p_store: store.id, p_amount: Number(form.amount), p_iban: form.iban.trim(), p_holder: form.holder.trim(), p_bank: form.bank.trim() });
    setBusy(false);
    if (error) setMsg(error.message); else { setMsg('Pedido de liquidação enviado. Fica Pendente até a equipa analisar.'); setForm((f) => ({ ...f, amount: '' })); load(store.id); }
  }
  const enabled = mode.mode && mode.mode !== 'disabled';
  const min = Number(mode.min_amount ?? 0);
  const canRequest = enabled && bal && bal.available > 0 && bal.available >= min;

  if (store === undefined) return <Screen><Loading /></Screen>;
  if (store === null) return <Screen><Empty icon="wallet-outline" title="Sem loja" action="Tornar-se vendedor" onAction={() => router.push('/vender')} /></Screen>;
  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}><Text style={styles.title}>Carteira e liquidações</Text></View>
      <View style={{ padding: 16 }}>
        <Card style={[styles.total, { backgroundColor: C.ink, borderColor: C.ink }]}>
          <Text style={styles.totalLabel}>Total a receber</Text>
          <Text style={styles.totalValue}>{bal ? kz(bal.to_receive) : '…'}</Text>
          {bal && (bal.reserved > 0 || bal.in_payout > 0) ? <Text style={styles.totalSub}>Reservado {kz(bal.reserved)} · Em liquidação {kz(bal.in_payout)}</Text> : null}
        </Card>
        <View style={styles.grid}>
          {[['Saldo pendente', bal?.pending, 'Pago pelo cliente, aguarda entrega'], ['Disponível para liquidação', bal?.available, 'Entregue e sem disputa'], ['Total já recebido', bal?.withdrawn, 'Transferências confirmadas']].map(([l, v, h]: any) => <Card key={l} style={styles.stat}><Text style={styles.statLabel}>{l}</Text><Text style={styles.statValue}>{v === undefined ? '…' : kz(Number(v))}</Text><Text style={styles.statHint}>{h}</Text></Card>)}
        </View>
        <Card style={{ padding: 14, marginTop: 12 }}>
          <Ionicons name="information-circle-outline" size={16} color={C.muted} />
          <Text style={styles.note}>Estes valores são um registo contabilístico da Roque Santeiro, não uma conta bancária nem dinheiro electrónico. O dinheiro só chega a si quando a transferência é feita e confirmada pelo banco/prestador de pagamentos.</Text>
        </Card>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
          <Card style={{ flex: 1, padding: 14 }}>
            <Text style={styles.panelTitle}>Pedir liquidação</Text>
            <Input label="Titular da conta" value={form.holder} onChangeText={(v) => setForm({ ...form, holder: v })} />
            <View style={styles.row2}><Input label="Banco" value={form.bank} onChangeText={(v) => setForm({ ...form, bank: v })} /><Input label="Valor (Kz)" value={form.amount} onChangeText={(v) => setForm({ ...form, amount: v })} keyboardType="numeric" /></View>
            <Input label="IBAN AO06…" value={form.iban} onChangeText={(v) => setForm({ ...form, iban: v })} autoCapitalize="characters" />
            {!enabled ? <Text style={styles.warn}>As liquidações ainda não estão activas no modelo de pagamento contratado.</Text> : null}
            {enabled && !canRequest ? <Text style={styles.hint}>Ainda não há valores elegíveis{min ? ` (mínimo ${kz(min)})` : ''}.</Text> : null}
            {msg ? <Text style={styles.msg}>{msg}</Text> : null}
            <Button title={busy ? 'A enviar…' : 'Pedir liquidação'} disabled={busy || !canRequest} onPress={request} />
          </Card>
          <Card style={{ flex: 1, padding: 14 }}>
            <Text style={styles.panelTitle}>Histórico de liquidações</Text>
            {payouts.length === 0 ? <Text style={styles.hint}>Sem pedidos.</Text> : payouts.map((p) => <View key={p.id} style={styles.payout}><View style={styles.rowBetween}><Text style={styles.payoutDate}>{new Date(p.created_at).toLocaleDateString('pt-AO')}</Text><Text style={styles.payoutAmount}>{kz(p.amount)}</Text></View><Text style={styles.payoutStatus}>{PAYOUT_STATUS[p.status] ?? p.status}</Text>{p.provider_reference ? <Text style={styles.payoutRef}>Ref. {p.provider_reference}</Text> : null}{p.rejection_reason ? <Text style={styles.payoutReject}>Motivo: {p.rejection_reason}</Text> : null}</View>)}
          </Card>
        </View>

        <Card style={{ padding: 14, marginTop: 14 }}>
          <Text style={styles.panelTitle}>Histórico de movimentos</Text>
          {entries.length === 0 ? <Text style={styles.hint}>Sem movimentos. Aparecem quando um pagamento é confirmado.</Text> : entries.map((e) => <View key={e.id} style={styles.entry}><View style={{ flex: 1 }}><Text style={styles.entryTitle}>{ENTRY[e.entry_type] ?? e.entry_type}</Text><Text style={styles.entryMeta}>{new Date(e.created_at).toLocaleString('pt-AO')} · {ACCOUNT[e.account] ?? e.account}{e.memo ? ` · ${e.memo}` : ''}</Text></View><Text style={[styles.entryAmount, Number(e.amount) < 0 && { color: '#b91c1c' }]}>{Number(e.amount) > 0 ? '+' : ''}{kz(Number(e.amount))}</Text></View>)}
        </Card>
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '900', color: C.ink },
  total: { marginTop: 12, borderRadius: 22, padding: 18 },
  totalLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700' },
  totalValue: { color: C.gold, fontSize: 30, fontWeight: '900', marginTop: 6 },
  totalSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  stat: { width: '31.5%', padding: 12 },
  statLabel: { fontSize: 10.5, color: C.muted, fontWeight: '700' },
  statValue: { fontSize: 15, fontWeight: '900', color: C.ink, marginTop: 4 },
  statHint: { fontSize: 9.5, color: '#94a3b8', marginTop: 4, lineHeight: 12 },
  note: { flex: 1, fontSize: 11.5, color: C.muted, marginLeft: 6, lineHeight: 16 },
  row2: { flexDirection: 'row', gap: 8 },
  warn: { fontSize: 11, color: '#b45309', marginBottom: 8 },
  hint: { fontSize: 11, color: C.muted, marginBottom: 8 },
  msg: { fontSize: 11.5, color: '#166534', backgroundColor: '#f0fdf4', borderRadius: 10, padding: 8, marginBottom: 8 },
  panelTitle: { fontSize: 14, fontWeight: '900', color: C.ink, marginBottom: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  payout: { borderTopWidth: 1, borderTopColor: '#f1f1f2', paddingVertical: 8 },
  payoutDate: { fontSize: 11, color: C.muted },
  payoutAmount: { fontSize: 12, fontWeight: '900', color: C.ink },
  payoutStatus: { fontSize: 10.5, fontWeight: '800', color: '#b45309', marginTop: 2 },
  payoutRef: { fontSize: 10, color: '#64748b', marginTop: 2 },
  payoutReject: { fontSize: 10, color: '#b91c1c', marginTop: 2 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#f1f1f2', paddingVertical: 8 },
  entryTitle: { fontSize: 12, fontWeight: '800', color: C.ink },
  entryMeta: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  entryAmount: { fontSize: 12, fontWeight: '900', color: '#047857' },
});
