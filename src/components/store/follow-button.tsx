"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function FollowButton({ storeId, storeSlug }: { storeId: string; storeSlug: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [on, setOn] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sb = supabaseBrowser();
    let alive = true;
    sb.rpc("store_followers", { p_store: storeId }).then(({ data }) => { if (alive && typeof data === "number") setCount(data); });
    if (user) sb.from("store_follows").select("store_id").eq("store_id", storeId).eq("user_id", user.id).maybeSingle().then(({ data }) => { if (alive) setOn(!!data); });
    else setOn(false);
    return () => { alive = false; };
  }, [storeId, user]);

  async function toggle() {
    if (!user) return router.push(`/entrar?next=/loja/${storeSlug}`);
    if (busy) return;
    setBusy(true);
    const sb = supabaseBrowser();
    const next = !on;
    const { error } = next
      ? await sb.from("store_follows").upsert({ store_id: storeId, user_id: user.id })
      : await sb.from("store_follows").delete().eq("store_id", storeId).eq("user_id", user.id);
    if (!error) { setOn(next); setCount((c) => (c === null ? c : Math.max(0, c + (next ? 1 : -1)))); }
    setBusy(false);
  }

  return (
    <button onClick={toggle} disabled={busy} aria-pressed={on} className={cn("btn-ghost", on && "border-blue-600/20 bg-slate-900 text-white")}>
      {on ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      {on ? "A seguir" : "Seguir"}
      {count !== null && count > 0 && <span className={cn("text-xs font-semibold", on ? "text-white/70" : "text-ink/50")}>{count}</span>}
    </button>
  );
}
