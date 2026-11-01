"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Bell, ChevronRight, CreditCard, Eye, Heart, LayoutDashboard, LogOut, Package, PackageCheck, Search, Shield, Star, Store, Truck } from "lucide-react";
import { useAuth, isStaff } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabase/client";

type Counts = { pay: number; ship: number; sent: number; review: number; fav: number; notif: number };
const TO_SHIP = ["new", "confirmed", "preparing", "packed", "ready"];
const SENT = ["left_store", "handed_over", "shipped", "in_transit", "at_hub", "out_for_delivery"];

export default function AccountPage() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const [c, setC] = useState<Counts | null>(null);
  useEffect(() => { if (!loading && !user) router.replace("/entrar?next=/conta"); }, [loading, user, router]);
  useEffect(() => {
    if (!user) return;
    const sb = supabaseBrowser();
    Promise.all([
      sb.from("orders").select("payment_status, sub_orders(status, order_items(id, reviews(id)))").eq("customer_id", user.id),
      sb.from("wishlists").select("product_id", { count: "exact", head: true }).eq("user_id", user.id),
      sb.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    ]).then(([o, w, n]) => {
      type O = { payment_status: string; sub_orders: { status: string; order_items: { id: string; reviews: { id: string }[] | null }[] }[] };
      const rows = (o.data ?? []) as O[];
      const k: Counts = { pay: 0, ship: 0, sent: 0, review: 0, fav: w.count ?? 0, notif: n.count ?? 0 };
      rows.forEach((r) => {
        if (["pending", "awaiting_confirmation"].includes(r.payment_status)) k.pay++;
        (r.sub_orders ?? []).forEach((s) => {
          if (r.payment_status === "paid" && TO_SHIP.includes(s.status)) k.ship++;
          if (SENT.includes(s.status)) k.sent++;
          if (s.status === "delivered") k.review += (s.order_items ?? []).filter((i) => !i.reviews?.length).length;
        });
      });
      setC(k);
    });
  }, [user]);
  if (loading || !user) return <div className="skeleton mt-6 h-60" />;

  const name = profile?.full_name || user.email?.split("@")[0] || "Cliente";
  const orders = [
    { href: "/conta/encomendas?estado=pagar", icon: CreditCard, l: "Por pagar", n: c?.pay },
    { href: "/conta/encomendas?estado=enviar", icon: Package, l: "Por enviar", n: c?.ship },
    { href: "/conta/encomendas?estado=enviadas", icon: Truck, l: "Enviadas", n: c?.sent },
    { href: "/conta/encomendas?estado=avaliar", icon: Star, l: "Por avaliar", n: c?.review },
  ];
  const tiles = [
    { href: "/conta/favoritos", icon: Heart, l: "Favoritos", n: c?.fav },
    { href: "/conta/notificacoes", icon: Bell, l: "Notificações", n: c?.notif },
    { href: "/rastrear", icon: Search, l: "Seguir encomenda" },
    { href: "/conta/encomendas", icon: PackageCheck, l: "Todas as encomendas" },
  ];
  const more = [
    { href: "/vendedor", icon: LayoutDashboard, l: "Painel do vendedor" },
    { href: "/vender", icon: Store, l: "Abrir uma loja" },
    { href: "/lojas", icon: Eye, l: "Visitar lojas" },
    ...(isStaff(profile?.role) ? [{ href: "/admin", icon: Shield, l: "Administração" }] : []),
  ];
  const Badge = ({ n }: { n?: number }) => (n ? <span className="absolute -right-2 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-promo px-1 text-[10px] font-bold text-white">{n > 99 ? "99+" : n}</span> : null);

  return (
    <div className="mx-auto max-w-2xl pt-4">
      <div className="brand-gradient relative overflow-hidden rounded-[1.75rem] p-5 text-white">
        <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-promo/30 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white/15 text-2xl font-extrabold uppercase ring-2 ring-white/30">{name.slice(0, 1)}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-extrabold">{name}</p>
            <p className="truncate text-[13px] text-white/70">{user.email}{profile?.phone ? ` · ${profile.phone}` : ""}</p>
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-3 divide-x divide-white/15 rounded-2xl bg-white/10 py-2.5 text-center">
          <Link href="/conta/favoritos"><p className="text-lg font-extrabold">{c?.fav ?? "–"}</p><p className="text-[11px] text-white/70">Favoritos</p></Link>
          <Link href="/conta/encomendas"><p className="text-lg font-extrabold">{c ? c.pay + c.ship + c.sent : "–"}</p><p className="text-[11px] text-white/70">Em curso</p></Link>
          <Link href="/conta/notificacoes"><p className="text-lg font-extrabold">{c?.notif ?? "–"}</p><p className="text-[11px] text-white/70">Mensagens</p></Link>
        </div>
      </div>

      <section className="card mt-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">As minhas encomendas</h2>
          <Link href="/conta/encomendas" className="flex items-center text-[13px] text-ink/55">Ver todas<ChevronRight className="h-4 w-4" /></Link>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1">
          {orders.map(({ href, icon: I, l, n }, i) => (
            <motion.div key={l} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link href={href} className="flex flex-col items-center gap-1.5 rounded-2xl py-2 active:bg-mist">
                <span className="relative"><I className="h-6 w-6 text-ink" strokeWidth={1.7} /><Badge n={n} /></span>
                <span className="text-center text-[12px] font-medium text-ink/75">{l}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="card mt-3 grid grid-cols-4 gap-1 p-3">
        {tiles.map(({ href, icon: I, l, n }) => (
          <Link key={l} href={href} className="flex flex-col items-center gap-1.5 rounded-2xl py-2 active:bg-mist">
            <span className="relative grid h-11 w-11 place-items-center rounded-full bg-mist"><I className="h-5 w-5 text-ink" strokeWidth={1.8} /><Badge n={n} /></span>
            <span className="text-center text-[11.5px] font-medium leading-tight text-ink/75">{l}</span>
          </Link>
        ))}
      </section>

      <div className="card mt-3 divide-y divide-line">
        {more.map(({ href, icon: I, l }) => (
          <Link key={l} href={href} className="flex items-center gap-3 p-4 text-[15px] font-medium active:bg-mist">
            <I className="h-5 w-5 text-ink/70" /><span className="flex-1">{l}</span><ChevronRight className="h-4 w-4 text-ink/30" />
          </Link>
        ))}
        <button onClick={async () => { await signOut(); router.replace("/"); }} className="flex w-full items-center gap-3 p-4 text-[15px] font-medium text-promo"><LogOut className="h-5 w-5" />Terminar sessão</button>
      </div>
    </div>
  );
}
