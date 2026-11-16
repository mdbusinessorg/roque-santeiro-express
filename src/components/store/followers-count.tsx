"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function FollowersCount({ storeId }: { storeId: string }) {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    supabaseBrowser().rpc("store_followers", { p_store: storeId }).then(({ data }) => { if (alive && typeof data === "number") setN(data); });
    return () => { alive = false; };
  }, [storeId]);
  if (n === null || n === 0) return null;
  return <span className="inline-flex items-center gap-1 text-[12px] font-medium text-cream/60"><Users className="h-3.5 w-3.5" />{n} {n === 1 ? "seguidor" : "seguidores"}</span>;
}
