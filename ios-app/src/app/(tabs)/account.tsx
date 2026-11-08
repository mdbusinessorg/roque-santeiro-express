import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button, C, Card, Screen, SectionTitle } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useCart } from '../../lib/cart';
import { kz } from '../../lib/format';
import { isStaff } from '../../lib/seller';

export default function Account() {
  const { user, profile, loading, signOut } = useAuth();
  const { count, subtotal } = useCart();
  if (loading) return <Screen><Text style={{ padding: 24 }}>A carregar…</Text></Screen>;
  if (!user) {
    return <Screen><View style={styles.center}><Ionicons name="person-circle-outline" size={64} color="#cbd5e1" /><Text style={styles.title}>Entre na sua conta</Text><Text style={styles.sub}>Aceda às suas encomendas, favoritos e carteira.</Text><Button title="Entrar / Registar" onPress={() => router.push('/auth')} style={{ marginTop: 18, alignSelf: 'stretch' }} /></View></Screen>;
  }
  const links: { icon: keyof typeof Ionicons.glyphMap; label: string; sub: string; href: string }[] = [
    { icon: 'storefront-outline', label: 'Painel da loja', sub: 'Dashboard, produtos, encomendas e carteira', href: '/seller' },
    { icon: 'add-circle-outline' as const, label: 'Tornar-se vendedor', sub: 'Abrir a sua loja no Roque Santeiro', href: '/vender' },
    { icon: 'receipt-outline' as const, label: 'As minhas encomendas', sub: 'Estado, pagamentos e confirmações', href: '/orders' },
    { icon: 'heart-outline' as const, label: 'Favoritos', sub: 'Produtos guardados', href: '/favorites' },
    { icon: 'location-outline' as const, label: 'Endereços', sub: 'Moradas de entrega', href: '/addresses' },
    { icon: 'notifications-outline' as const, label: 'Notificações', sub: 'Actualizações da conta', href: '/notifications' },
  ];
  if (isStaff(profile?.role)) links.push({ icon: 'shield-checkmark-outline' as const, label: 'Administração', sub: 'Lojas, pagamentos, finanças e partners', href: '/admin' });
  return (
    <Screen>
      <View style={styles.header}><Text style={styles.title}>Conta</Text><Pressable onPress={signOut}><Text style={styles.signout}>Sair</Text></Pressable></View>
      <Card style={styles.profile}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{(profile?.full_name || user.email || '?').slice(0, 1).toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{profile?.full_name || 'Cliente Roque Santeiro'}</Text>
          <Text style={styles.email}>{profile?.email || user.email}</Text>
          {profile?.phone ? <Text style={styles.phone}>{profile.phone}</Text> : null}
        </View>
        <View style={styles.role}><Text style={styles.roleText}>{profile?.role ?? 'customer'}</Text></View>
      </Card>
      <View style={styles.stats}>
        <Card style={styles.stat}><Text style={styles.statValue}>{count}</Text><Text style={styles.statLabel}>No carrinho</Text></Card>
        <Card style={styles.stat}><Text style={styles.statValue}>{kz(subtotal)}</Text><Text style={styles.statLabel}>Subtotal</Text></Card>
      </View>
      <View style={{ marginTop: 18 }}><SectionTitle title="Atalhos" /></View>
      {links.map((l) => (
        <Card key={l.href} onPress={() => router.push(l.href as any)} style={styles.link}>
          <View style={styles.linkIcon}><Ionicons name={l.icon} size={20} color={C.ink} /></View>
          <View style={{ flex: 1 }}><Text style={styles.linkTitle}>{l.label}</Text><Text style={styles.linkSub}>{l.sub}</Text></View>
          <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        </Card>
      ))}
      <Text style={styles.footer}>Roque Santeiro Express · app cliente</Text>
    </Screen>
  );
}
const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingTop: 90, paddingHorizontal: 30 },
  title: { fontSize: 24, fontWeight: '900', color: C.ink },
  sub: { marginTop: 8, fontSize: 13.5, color: C.muted, textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  signout: { fontSize: 13, fontWeight: '900', color: C.red },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginTop: 10 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.gold, fontSize: 22, fontWeight: '900' },
  name: { fontSize: 16, fontWeight: '900', color: C.ink },
  email: { fontSize: 12.5, color: C.muted, marginTop: 2 },
  phone: { fontSize: 12.5, color: C.muted },
  role: { backgroundColor: C.soft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  roleText: { fontSize: 11, fontWeight: '900', color: C.ink, textTransform: 'capitalize' },
  stats: { flexDirection: 'row', gap: 12, marginTop: 14 },
  stat: { flex: 1, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '900', color: C.ink },
  statLabel: { fontSize: 11.5, color: C.muted, marginTop: 4, fontWeight: '700' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginTop: 10 },
  linkIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  linkTitle: { fontSize: 14.5, fontWeight: '900', color: C.ink },
  linkSub: { fontSize: 11.5, color: C.muted, marginTop: 2 },
  footer: { marginTop: 30, marginBottom: 20, textAlign: 'center', fontSize: 11, color: '#b6bec8' },
});
