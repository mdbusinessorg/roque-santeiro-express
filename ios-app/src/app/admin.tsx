import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { C, Card, Empty, Loading, Screen, SectionTitle } from '../components/ui';
import { useAuth } from '../lib/auth';
import { isStaff } from '../lib/seller';

const links = [
  { icon: 'storefront-outline' as const, label: 'Lojas e vendedores', sub: 'Aprovar, pedir informação, suspender', href: '/admin-stores' },
  { icon: 'card-outline' as const, label: 'Pagamentos e encomendas', sub: 'Confirmar pagamentos reais', href: '/admin-payments' },
  { icon: 'wallet-outline' as const, label: 'Central financeira', sub: 'Ledger, liquidações, reembolsos', href: '/admin-finance' },
  { icon: 'people-outline' as const, label: 'Roque Partners', sub: 'Afiliados, agentes e comissões', href: '/admin-partners' },
];

export default function Admin() {
  const { profile, loading, user } = useAuth();
  if (loading) return <Screen><Loading /></Screen>;
  if (!user) return <Screen><Empty icon="lock-closed-outline" title="Sessão necessária" action="Entrar" onAction={() => router.push('/auth?next=/admin')} /></Screen>;
  if (!isStaff(profile?.role)) return <Screen><Empty icon="shield-outline" title="Sem permissão" sub="Esta área é só para a equipa do Roque Santeiro Express." /></Screen>;
  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}><Text style={styles.title}>Administração</Text><Text style={styles.sub}>Painel da equipa Roque Santeiro Express</Text></View>
      <View style={{ paddingHorizontal: 16, marginTop: 10 }}><SectionTitle title="Áreas" /></View>
      {links.map((l) => <Card key={l.href} onPress={() => router.push(l.href as any)} style={styles.link}><View style={styles.icon}><Ionicons name={l.icon} size={20} color={C.ink} /></View><View style={{ flex: 1 }}><Text style={styles.linkTitle}>{l.label}</Text><Text style={styles.linkSub}>{l.sub}</Text></View><Ionicons name="chevron-forward" size={18} color="#cbd5e1" /></Card>)}
      <Text style={styles.footer}>Roque Santeiro Express · administração</Text>
    </Screen>
  );
}
const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '900', color: C.ink },
  sub: { fontSize: 12.5, color: C.muted, fontWeight: '700', marginTop: 3 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginHorizontal: 16, marginTop: 10 },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  linkTitle: { fontSize: 14.5, fontWeight: '900', color: C.ink },
  linkSub: { fontSize: 11.5, color: C.muted, marginTop: 2 },
  footer: { marginTop: 30, marginBottom: 20, textAlign: 'center', fontSize: 11, color: '#b6bec8' },
});
