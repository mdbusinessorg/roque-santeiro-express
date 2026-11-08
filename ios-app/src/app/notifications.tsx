import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { C, Empty, Loading, Screen } from '../components/ui';
import { useAuth } from '../lib/auth';
import { getNotifications, markNotificationsRead } from '../lib/api';
import { sb } from '../lib/supabase';

export default function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    setItems(await getNotifications(user.id));
    await markNotificationsRead(user.id);
    setLoading(false);
  }, [user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => {
    if (!user) return;
    const ch = sb.channel(`notif-${user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, load).subscribe();
    return () => { sb.removeChannel(ch); };
  }, [user?.id, load]);
  if (!user) return <Screen><Empty icon="notifications-outline" title="Entre na sua conta" action="Entrar" onAction={() => router.push('/auth?next=/notifications')} /></Screen>;
  if (loading) return <Screen><Loading /></Screen>;
  return (
    <Screen scroll={false}>
      <View style={styles.head}><Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={C.ink} /></Pressable><Text style={styles.title}>Notificações</Text><View style={{ width: 22 }} /></View>
      <FlatList data={items} keyExtractor={(n) => n.id} contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }} ListEmptyComponent={<Empty icon="notifications-outline" title="Sem notificações" sub="As actualizações das tuas encomendas aparecem aqui." />} renderItem={({ item }) => (
        <Pressable onPress={() => { if (item.link) router.push(item.link); }} style={[styles.card, !item.read_at && styles.unread]}>
          <View style={styles.icon}><Ionicons name="notifications" size={18} color={C.ink} /></View>
          <View style={{ flex: 1 }}><Text style={styles.ntitle}>{item.title}</Text><Text style={styles.nbody}>{item.body}</Text><Text style={styles.ndate}>{new Date(item.created_at).toLocaleString('pt-AO')}</Text></View>
        </Pressable>
      )} />
    </Screen>
  );
}
const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '900', color: C.ink },
  card: { flexDirection: 'row', gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12 },
  unread: { borderColor: C.gold, backgroundColor: '#fffdf5' },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  ntitle: { fontSize: 13.5, fontWeight: '900', color: C.ink },
  nbody: { fontSize: 12, color: C.muted, marginTop: 3 },
  ndate: { fontSize: 10.5, color: '#b6bec8', marginTop: 6 },
});
