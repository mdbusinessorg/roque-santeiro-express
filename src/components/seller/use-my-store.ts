"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Store } from "@/lib/types";

export function useMyStore(next = "/vendedor") {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [store, setStore] = useState<Store | null | undefined>();
  const reload = useCallback(async () => {
    if (!user) return;
    const { data } = await supabaseBrowser().from("stores").select("*").eq("owner_id", user.id).maybeSingle();
    setStore(data as Store | null);
  }, [user]);
  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace(`/entrar?next=${next}`); return; }
    reload();
  }, [loading, user, router, next, reload]);
  return { store, reload, user };
}
