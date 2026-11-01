"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Heart, MapPin, Search, ShoppingCart, User, Store } from "lucide-react";
import { useCart } from "@/lib/cart/cart";
import { useAuth, isStaff } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabase/client";
import { NotificationBell } from "@/components/notifications/bell";

type Suggest = { slug: string; name: string; images: string[] };

function SearchBox() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Suggest[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) { setItems([]); return; }
    timer.current = setTimeout(async () => {
      const { data } = await supabaseBrowser().from("products").select("slug,name,images").eq("status", "active").ilike("name", `%${q.trim()}%`).limit(6);
      setItems((data as Suggest[]) ?? []);
    }, 220);
  }, [q]);

  return (
    <form
      className="relative flex-1"
      onSubmit={(e) => { e.preventDefault(); setOpen(false); router.push(`/pesquisa?q=${encodeURIComponent(q.trim())}`); }}
    >
      <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/55" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Pesquisar no Roque Santeiro"
        className="h-11 w-full rounded-full border border-white/10 bg-white/[0.07] pl-11 pr-24 text-[15px] text-white shadow-inner outline-none placeholder:text-white/40 focus:border-white/25 focus:ring-4 focus:ring-promo/20"
        enterKeyHint="search"
        aria-label="Pesquisar"
      />
      <button className="absolute right-1 top-1 promo-gradient transition active:scale-95 h-9 rounded-full px-4 text-sm font-semibold text-white">Buscar</button>
      {open && items.length > 0 && (
        <ul className="glass absolute inset-x-0 top-12 z-50 overflow-hidden rounded-2xl py-1 text-ink">
          {items.map((s) => (
            <li key={s.slug}>
              <Link href={`/produto/${s.slug}`} className="flex items-center gap-3 px-3 py-2 hover:bg-brand-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.images[0]} alt="" className="h-9 w-9 rounded-lg bg-white object-contain" />
                <span className="line-clamp-1 text-sm">{s.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

export function Header() {
  const { count } = useCart();
  const { user, profile } = useAuth();
  return (
    <header className="sticky top-0 z-40">
      <div className="brand-gradient border-b border-white/[0.06] text-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 pb-3 pt-[calc(env(safe-area-inset-top)+0.6rem)] sm:px-5">
          <Link href="/" className="shrink-0 leading-none" aria-label="Roque Santeiro Express">
            <span className="block text-[17px] font-extrabold tracking-tight sm:text-xl">Roque Santeiro</span>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.3em] text-[#ff7a7e]">Express</span>
          </Link>
          <div className="hidden flex-1 md:flex"><Suspense><SearchBox /></Suspense></div>
          <nav className="ml-auto flex items-center gap-1 text-sm">
            <Link href="/vender" className="hidden items-center gap-1.5 rounded-full px-3 py-2 hover:bg-white/10 lg:flex"><Store className="h-4 w-4" />Vender</Link>
            {isStaff(profile?.role) && <Link href="/admin" className="hidden rounded-full px-3 py-2 hover:bg-white/10 md:block">Admin</Link>}
            <Link href={user ? "/conta" : "/entrar"} className="flex items-center gap-1.5 rounded-full px-3 py-2 hover:bg-white/10">
              <User className="h-5 w-5" /><span className="hidden max-w-28 truncate md:inline">{user ? profile?.full_name?.split(" ")[0] || "Conta" : "Entrar"}</span>
            </Link>
            <Link href="/conta/favoritos" className="hidden rounded-full p-2 hover:bg-white/10 md:block" aria-label="Favoritos"><Heart className="h-5 w-5" /></Link>
            <NotificationBell className="relative grid h-9 w-9 place-items-center rounded-full hover:bg-white/10" />
            <Link href="/carrinho" className="relative hidden rounded-full p-2 hover:bg-white/10 md:block" aria-label="Carrinho">
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-promo px-1 text-center text-[10px] font-bold leading-[18px] text-white">{count}</span>}
            </Link>
          </nav>
        </div>
        <div className="mx-auto max-w-7xl px-3 pb-3 md:hidden"><Suspense><SearchBox /></Suspense></div>
      </div>
      <div className="glass border-x-0 border-t-0">
        <div className="no-scrollbar mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-3 py-2 text-[13px] font-medium text-ink sm:px-5">
          <span className="flex shrink-0 items-center gap-1 pr-2 text-brand-600"><MapPin className="h-4 w-4" />Entregar em Luanda</span>
          {[["Ofertas", "/pesquisa?ofertas=1"], ["Mais vendidos", "/pesquisa?ordem=vendidos"], ["Novidades", "/pesquisa?ordem=novos"], ["Electrónica", "/categoria/electronica"], ["Telemóveis", "/categoria/telemoveis"], ["Moda", "/categoria/moda"], ["Casa", "/categoria/casa-cozinha"], ["Beleza", "/categoria/beleza"], ["Lojas", "/lojas"], ["Vender", "/vender"]].map(([l, h]) => (
            <Link key={h} href={h} className="shrink-0 rounded-full px-3 py-1.5 hover:bg-brand-50 hover:text-brand-600">{l}</Link>
          ))}
        </div>
      </div>
    </header>
  );
}
