"use client";

import * as React from "react";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";

export type Profile = { id: string; full_name: string | null; phone: string | null; email: string | null; role: string };
type Ctx = { user: User | null; profile: Profile | null; loading: boolean; refresh: () => Promise<void>; signOut: () => Promise<void> };
const AuthContext = React.createContext<Ctx>({ user: null, profile: null, loading: true, refresh: async () => {}, signOut: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const sb = supabaseBrowser();
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async (u: User | null) => {
    setUser(u);
    if (u) {
      const { data } = await sb.from("profiles").select("*").eq("id", u.id).maybeSingle();
      setProfile(data as Profile | null);
    } else setProfile(null);
    setLoading(false);
  }, [sb]);

  React.useEffect(() => {
    sb.auth.getSession().then(({ data }) => load(data.session?.user ?? null));
    const { data } = sb.auth.onAuthStateChange((_e, s) => { load(s?.user ?? null); });
    return () => data.subscription.unsubscribe();
  }, [sb, load]);

  const value = React.useMemo(() => ({
    user, profile, loading,
    refresh: async () => { const { data } = await sb.auth.getUser(); await load(data.user); },
    signOut: async () => { await sb.auth.signOut(); await load(null); },
  }), [user, profile, loading, sb, load]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => React.useContext(AuthContext);
export const isStaff = (role?: string | null) => role === "admin" || role === "super_admin" || role === "ops";
