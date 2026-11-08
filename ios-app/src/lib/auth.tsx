import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { sb } from './supabase';

type Profile = { id: string; full_name: string | null; phone: string | null; email: string | null; role: string };
type AuthCtx = { session: Session | null; user: Session['user'] | null; profile: Profile | null; loading: boolean; refresh: () => Promise<void>; signIn: (email: string, password: string) => Promise<string | null>; signUp: (name: string, phone: string, email: string, password: string) => Promise<string | null>; signOut: () => Promise<void> };
const AuthContext = createContext<AuthCtx | null>(null);

async function loadProfile(userId: string) {
  const { data } = await sb.from('profiles').select('id,full_name,phone,email,role').eq('id', userId).maybeSingle();
  return data as Profile | null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    const { data } = await sb.auth.getSession();
    setSession(data.session);
    if (data.session?.user) setProfile(await loadProfile(data.session.user.id)); else setProfile(null);
    setLoading(false);
  }, []);
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => { setSession(data.session); if (data.session?.user) loadProfile(data.session.user.id).then(setProfile); setLoading(false); });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => { setSession(s); if (s?.user) loadProfile(s.user.id).then(setProfile); else setProfile(null); });
    return () => sub.subscription.unsubscribe();
  }, []);
  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) return error.message.includes('Invalid login') ? 'Email ou palavra-passe errados.' : error.message;
    await refresh(); return null;
  }, [refresh]);
  const signUp = useCallback(async (name: string, phone: string, email: string, password: string) => {
    const { data, error } = await sb.auth.signUp({ email: email.trim().toLowerCase(), password, options: { data: { full_name: name.trim(), phone: phone.trim() } } });
    if (error) return error.message.includes('already registered') ? 'Este email já tem conta. Entre.' : error.message;
    if (!data.session) return 'Conta criada. Verifique o seu email para confirmar.';
    await refresh(); return null;
  }, [refresh]);
  const signOut = useCallback(async () => { await sb.auth.signOut(); setProfile(null); }, []);
  const value = useMemo<AuthCtx>(() => ({ session, user: session?.user ?? null, profile, loading, refresh, signIn, signUp, signOut }), [session, profile, loading, refresh, signIn, signUp, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const c = useContext(AuthContext); if (!c) throw new Error('useAuth'); return c; }
