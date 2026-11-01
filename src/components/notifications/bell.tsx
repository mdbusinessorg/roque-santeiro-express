"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Bell } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabase/client";

export function NotificationBell({ className }: { className?: string }) {
  const { user } = useAuth();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!user) return;
    const sb = supabaseBrowser();
    const count = () => sb.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null).then(({ count: c }) => setN(c ?? 0));
    count();
    const ch = sb.channel(`notif-${user.id}`).on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, count).subscribe();
    window.addEventListener("rse-notif", count);
    return () => { sb.removeChannel(ch); window.removeEventListener("rse-notif", count); };
  }, [user]);
  if (!user) return null;
  return (
    <Link href="/conta/notificacoes" aria-label={`Notificações${n ? ` (${n} novas)` : ""}`} className={className ?? "relative grid h-10 w-10 place-items-center rounded-full text-white hover:bg-white/15"}>
      <Bell className="h-5 w-5" />
      <AnimatePresence>{n > 0 && <motion.span key={n} initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} exit={{ scale: 0 }} className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-white px-1 text-[10px] font-bold text-brand-600">{n > 9 ? "9+" : n}</motion.span>}</AnimatePresence>
    </Link>
  );
}
