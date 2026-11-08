import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, C, Card, Input, Screen } from '../components/ui';
import { useAuth } from '../lib/auth';

export default function Auth() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function submit() {
    setBusy(true); setMsg(null);
    const err = mode === 'login' ? await signIn(form.email, form.password) : await signUp(form.name, form.phone, form.email, form.password);
    setBusy(false);
    if (err) { setMsg(err); return; }
    router.replace(next ?? '/account');
  }
  return (
    <Screen>
      <View style={styles.head}><Pressable onPress={() => router.back()}><Text style={styles.back}>Fechar</Text></Pressable></View>
      <Card style={{ padding: 18 }}>
        <Text style={styles.title}>{mode === 'login' ? 'Entrar na sua conta' : 'Criar conta grátis'}</Text>
        <Text style={styles.sub}>Compre de todas as lojas do Roque Santeiro Express.</Text>
        <View style={styles.tabs}>
          <Pressable onPress={() => setMode('login')} style={[styles.tab, mode === 'login' && styles.tabOn]}><Text style={[styles.tabText, mode === 'login' && { color: '#fff' }]}>Entrar</Text></Pressable>
          <Pressable onPress={() => setMode('signup')} style={[styles.tab, mode === 'signup' && styles.tabOn]}><Text style={[styles.tabText, mode === 'signup' && { color: '#fff' }]}>Registar</Text></Pressable>
        </View>
        {mode === 'signup' ? <><Input label="Nome completo" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} autoComplete="name" /><Input label="Telefone" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" autoComplete="tel" /></> : null}
        <Input label="Email" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} keyboardType="email-address" autoComplete="email" />
        <Input label="Palavra-passe" value={form.password} onChangeText={(v) => setForm({ ...form, password: v })} secureTextEntry autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        {msg ? <Text style={styles.msg}>{msg}</Text> : null}
        <Button title={busy ? 'A processar…' : mode === 'login' ? 'Entrar' : 'Criar conta'} onPress={submit} disabled={busy} />
        <Text style={styles.terms}>Ao continuar aceita os termos e a política de privacidade.</Text>
      </Card>
    </Screen>
  );
}
const styles = StyleSheet.create({
  head: { alignItems: 'flex-end', marginBottom: 10 },
  back: { fontSize: 14, fontWeight: '900', color: C.ink },
  title: { fontSize: 22, fontWeight: '900', color: C.ink },
  sub: { fontSize: 12.5, color: C.muted, marginTop: 4, marginBottom: 14 },
  tabs: { flexDirection: 'row', backgroundColor: C.soft, borderRadius: 999, padding: 4, marginBottom: 14 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 999, alignItems: 'center' },
  tabOn: { backgroundColor: C.ink },
  tabText: { fontSize: 13, fontWeight: '900', color: C.muted },
  msg: { color: C.red, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  terms: { marginTop: 12, fontSize: 11, color: C.muted, textAlign: 'center' },
});
