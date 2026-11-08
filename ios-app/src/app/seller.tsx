import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button, C, Card, Empty, Loading, Screen, SectionTitle } from '../components/ui';
import { StoreAvatar } from '../components/store-avatar';
import { sb } from '../lib/supabase';
import { useMyStore } from '../lib/seller';
import { kz } from '../lib/format';

type A = { series: { d: string; views: number; orders: number; revenue: number }[]; views: number; visitors: number; carts: number; orders: number; paid_orders: number; revenue: number; net: number; to_ship: number; top_viewed: any[]; top_sold: any[]; low_stock: any[]; products: { active: number; draft: number; out: number }; reviews: { n: number; avg: number; unanswered: number } };
type Bal = { available: number; pending: number; to_receive: number; withdrawn: number };
type Row = { id: string; created_at: string; status: string; subtotal: number; orders: any; order_items: any[] };

const DAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
function pct(cur: number, prev: number) { return prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null; }

export default function Seller() {
  const { store, user } = useMyStore('/seller');
  const [mode, setMode] = useState<'week' | 'month'>('month');
  const [a, setA] = useState<A | null>(null);
  const [bal, setBal] = useState<Bal | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!store) { if (store === null) setLoading(false); return; }
    setLoading(true);
    Promise.all([
      sb.rpc('store_analytics', { p_store: store.id, p_days: mode === 'month' ? 180 : 14 }),
      sb.rpc('store_balance', { p_store: store.id }),
      sb.from('sub_orders').select('id,created_at,status,subtotal,orders(number,contact_name,payment_status),order_items(name)').eq('store_id', store.id).order('created_at', { ascending: false }).limit(6),
    ]).then(([an, ba, ro]) => { setA(an.data as A); setBal(ba.data as Bal); setRows((ro.data as unknown as Row[]) ?? []); setLoading(false); });
  }, [store, mode]);

  const bars = useMemo(() => {
    const s = a?.series ?? [];
    if (mode === 'week') return s.slice(-7).map((p) => ({ label: DAYS[new Date(p.d).getDay()], v: p.views }));
    const m = new Map<string, number>();
    s.forEach((p) => { const k = p.d.slice(0, 7); m.set(k, (m.get(k) ?? 0) + p.views); });
    return [...m.entries()].slice(-6).map(([k, v]) => ({ label: MONTHS[Number(k.slice(5, 7)) - 1], v }));
  }, [a, mode]);
  const rev = (a?.series ?? []).slice(-30);
  const week = rev.slice(-7).reduce((x, p) => x + Number(p.revenue), 0);
  const prevWeek = rev.slice(0, 7).reduce((x, p) => x + Number(p.revenue), 0);
  const conv = a && a.visitors > 0 ? (a.paid_orders / a.visitors) * 100 : 0;
  const maxBar = Math.max(1, ...bars.map((b) => b.v));
  const maxRev = Math.max(1, ...rev.map((p) => Number(p.revenue)));

  if (store === undefined) return <Screen><Loading text="A carregar painel…" /></Screen>;
  if (store === null) return <Screen><Empty icon="storefront-outline" title="Ainda não tem loja" sub="Registe a sua loja e comece a vender para toda Angola." action="Tornar-se vendedor" onAction={() => router.push('/vender')} /></Screen>;

  const links = [
    { icon: 'cube-outline' as const, label: 'Produtos', sub: 'Adicionar, editar e stock', href: '/seller-products' },
    { icon: 'receipt-outline' as const, label: 'Encomendas', sub: 'Estados e envio', href: '/seller-orders' },
    { icon: 'wallet-outline' as const, label: 'Carteira', sub: 'Saldos e liquidações', href: '/seller-wallet' },
    { icon: 'business-outline' as const, label: 'Loja', sub: 'Perfil, capa e contactos', href: '/seller-store' },
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Bem-vindo de volta, <Text style={{ color: 'rgba(24,24,27,0.45)' }}>{(user?.email ?? '').split('@')[0]}</Text></Text>
            <View style={styles.storeLine}><StoreAvatar store={store} size={26} /><Text style={styles.storeName}>{store.name}</Text>{store.status !== 'approved' ? <Text style={styles.pending}>Pendente</Text> : null}</View>
          </View>
          <Button small title="+ Produto" onPress={() => router.push('/seller-product-form')} />
        </View>

        <View style={styles.grid}>
          <Card style={styles.balance}>
            <Text style={styles.balanceLabel}>Saldo da loja</Text>
            <Text style={styles.balanceValue}>{bal ? kz(bal.to_receive) : '…'}</Text>
            <Text style={styles.balanceSub}>Disponível {bal ? kz(bal.available) : '…'}</Text>
            <Button small variant="gold" title="Carteira" onPress={() => router.push('/seller-wallet')} style={{ marginTop: 12 }} />
          </Card>
          <Card style={styles.stat}><Text style={styles.statLabel}>Vendas esta semana</Text><Text style={styles.statValue}>{kz(week)}</Text>{pct(week, prevWeek) !== null ? <Text style={[styles.badge, pct(week, prevWeek)! >= 0 ? styles.badgeUp : styles.badgeDown]}>{pct(week, prevWeek)! >= 0 ? '+' : ''}{pct(week, prevWeek)}%</Text> : null}</Card>
          <Card style={styles.stat}><Text style={styles.statLabel}>Visitas à loja</Text><Text style={styles.statValue}>{a ? a.views.toLocaleString('pt-AO') : '…'}</Text><Text style={styles.statSub}>{a?.visitors ?? 0} visitantes</Text></Card>
          <Card style={styles.stat}><Text style={styles.statLabel}>Conversão</Text><Text style={styles.statValue}>{conv.toFixed(1)}%</Text><Text style={styles.statSub}>{a?.paid_orders ?? 0} pagas / {a?.orders ?? 0} encomendas</Text></Card>
        </View>

        <Card style={{ marginHorizontal: 16, marginTop: 14, padding: 14 }}>
          <View style={styles.panelHead}><Text style={styles.panelTitle}>Visitas à loja</Text><View style={styles.toggle}>{(['week', 'month'] as const).map((m) => <Pressable key={m} onPress={() => setMode(m)} style={[styles.toggleBtn, mode === m && styles.toggleBtnActive]}><Text style={[styles.toggleText, mode === m && { color: '#fff' }]}>{m === 'week' ? 'Semanal' : 'Mensal'}</Text></Pressable>)}</View></View>
          <View style={styles.bars}>{bars.map((b) => <View key={b.label} style={styles.barCol}><View style={[styles.bar, { height: Math.max(6, (b.v / maxBar) * 90) }]} /><Text style={styles.barLabel}>{b.label}</Text></View>)}</View>
        </Card>

        <Card style={{ marginHorizontal: 16, marginTop: 14, padding: 14 }}>
          <View style={styles.panelHead}><Text style={styles.panelTitle}>Vendas pagas · 30 dias</Text><Pressable onPress={() => router.push('/seller-orders')}><Text style={styles.panelLink}>Encomendas</Text></Pressable></View>
          <Text style={styles.bigValue}>{a ? kz(a.revenue) : '…'}</Text>
          <View style={styles.spark}>{rev.map((p) => <View key={p.d} style={[styles.sparkBar, { height: Math.max(4, (Number(p.revenue) / maxRev) * 56) }]} />)}</View>
          <View style={styles.tri}><Text style={styles.triLabel}>{a?.visitors ?? '…'} visitantes</Text><Text style={styles.triLabel}>{a?.orders ?? '…'} encomendas</Text><Text style={styles.triLabel}>{a && a.reviews.n ? `${Number(a.reviews.avg).toFixed(1)} ★` : '—'} {a?.reviews.n ?? 0} aval.</Text></View>
        </Card>

        <View style={{ paddingHorizontal: 16, marginTop: 18 }}><SectionTitle title="Atalhos" /></View>
        {links.map((l) => <Card key={l.href} onPress={() => router.push(l.href as any)} style={styles.link}><View style={styles.linkIcon}><Ionicons name={l.icon} size={20} color={C.ink} /></View><View style={{ flex: 1 }}><Text style={styles.linkTitle}>{l.label}</Text><Text style={styles.linkSub}>{l.sub}</Text></View><Ionicons name="chevron-forward" size={18} color="#cbd5e1" /></Card>)}

        <Card style={{ marginHorizontal: 16, marginTop: 14, padding: 14 }}>
          <View style={styles.panelHead}><Text style={styles.panelTitle}>Histórico de encomendas</Text><Pressable onPress={() => router.push('/seller-orders')}><Text style={styles.panelLink}>Ver tudo</Text></Pressable></View>
          {rows.length === 0 ? <Text style={styles.emptySmall}>Ainda sem encomendas.</Text> : rows.map((r) => <View key={r.id} style={styles.orderRow}><View style={{ flex: 1 }}><Text numberOfLines={1} style={styles.orderName}>{r.order_items?.[0]?.name ?? 'Encomenda'}</Text><Text style={styles.orderMeta}>#{r.orders?.number} · {r.orders?.contact_name}</Text></View><View style={{ alignItems: 'flex-end' }}><Text style={styles.orderValue}>{kz(r.subtotal)}</Text><Text style={styles.orderStatus}>{r.status}</Text></View></View>)}
        </Card>

        <Card style={{ marginHorizontal: 16, marginTop: 14, padding: 14 }}>
          <View style={styles.panelHead}><Text style={styles.panelTitle}>Produtos</Text><Pressable onPress={() => router.push('/seller-products')}><Text style={styles.panelLink}>Gerir</Text></Pressable></View>
          <Text style={styles.productLine}>{a?.products.active ?? 0} activos · {a?.products.out ?? 0} esgotados</Text>
          <View style={styles.avatars}>{(a?.top_viewed.length ? a.top_viewed : a?.top_sold ?? []).slice(0, 4).map((x: any, i: number) => <View key={x.id} style={[styles.avatar, i > 0 && { marginLeft: -10 }]}>{x.img ? <Ionicons name="image" size={18} color="#cbd5e1" /> : null}</View>)}<View style={[styles.avatar, styles.avatarMore]}><Text style={styles.avatarMoreText}>+{a?.products.active ?? 0}</Text></View></View>
          {(a?.low_stock.length ?? 0) > 0 ? <Text style={styles.alert}>{a?.low_stock.length} produto(s) com stock baixo</Text> : null}
          {(a?.to_ship ?? 0) > 0 ? <Text style={styles.alertBlue}>{a?.to_ship} encomenda(s) por enviar</Text> : null}
        </Card>
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  title: { fontSize: 24, fontWeight: '900', color: C.ink },
  storeLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  storeName: { fontSize: 14, fontWeight: '900', color: C.ink },
  pending: { fontSize: 10, fontWeight: '900', color: '#b45309', backgroundColor: '#fef3c7', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16 },
  balance: { width: '100%', backgroundColor: C.ink, borderColor: C.ink, padding: 16 },
  balanceLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '700' },
  balanceValue: { color: C.gold, fontSize: 26, fontWeight: '900', marginTop: 6 },
  balanceSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4 },
  stat: { width: '47.5%', padding: 14 },
  statLabel: { fontSize: 11, color: C.muted, fontWeight: '700' },
  statValue: { fontSize: 20, fontWeight: '900', color: C.ink, marginTop: 4 },
  statSub: { fontSize: 10.5, color: C.muted, marginTop: 3 },
  badge: { alignSelf: 'flex-start', marginTop: 6, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, fontSize: 10, fontWeight: '900' },
  badgeUp: { backgroundColor: C.ink, color: C.gold },
  badgeDown: { backgroundColor: '#fee2e2', color: '#b91c1c' },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelTitle: { fontSize: 14, fontWeight: '900', color: C.ink },
  toggle: { flexDirection: 'row', backgroundColor: '#f2f2f3', borderRadius: 999, padding: 2 },
  toggleBtn: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  toggleBtnActive: { backgroundColor: C.ink },
  toggleText: { fontSize: 11, fontWeight: '800', color: 'rgba(24,24,27,0.55)' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 8, marginTop: 12 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  bar: { width: '70%', borderRadius: 8, backgroundColor: C.ink },
  barLabel: { fontSize: 9, color: C.muted, marginTop: 5, fontWeight: '700' },
  bigValue: { textAlign: 'center', fontSize: 24, fontWeight: '900', color: C.ink, marginTop: 8 },
  spark: { flexDirection: 'row', alignItems: 'flex-end', height: 60, gap: 3, marginTop: 10 },
  sparkBar: { flex: 1, borderRadius: 4, backgroundColor: '#d97706' },
  tri: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  triLabel: { fontSize: 11, color: C.muted, fontWeight: '700' },
  linkCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginHorizontal: 16, marginTop: 10 },
  linkIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  linkTitle: { fontSize: 14.5, fontWeight: '900', color: C.ink },
  linkSub: { fontSize: 11.5, color: C.muted, marginTop: 2 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginHorizontal: 16, marginTop: 10 },
  panelLink: { fontSize: 12, fontWeight: '900', color: C.red, textDecorationLine: 'underline' },
  orderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f1f1f2' },
  orderName: { fontSize: 12.5, fontWeight: '800', color: C.ink },
  orderMeta: { fontSize: 10.5, color: C.muted, marginTop: 2 },
  orderValue: { fontSize: 12.5, fontWeight: '900', color: C.ink },
  orderStatus: { fontSize: 10, color: '#b45309', fontWeight: '800', marginTop: 2, textTransform: 'capitalize' },
  emptySmall: { fontSize: 12, color: C.muted, textAlign: 'center', paddingVertical: 12 },
  productLine: { fontSize: 12, color: C.muted, marginTop: 4 },
  avatars: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  avatarMore: { backgroundColor: C.ink },
  avatarMoreText: { color: C.gold, fontSize: 11, fontWeight: '900' },
  alert: { marginTop: 10, fontSize: 11.5, color: '#92400e', backgroundColor: '#fef3c7', borderRadius: 10, padding: 8 },
  alertBlue: { marginTop: 8, fontSize: 11.5, color: '#075985', backgroundColor: '#e0f2fe', borderRadius: 10, padding: 8 },
});
