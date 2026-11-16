"use client";

import Link from "@/components/ui/native-link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Camera, Heart, Loader2, MapPin, Mic, Search, ShoppingCart, User, Store } from "lucide-react";
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
  const [canVoice, setCanVoice] = useState(false);
  const [busyPhoto, setBusyPhoto] = useState(false);
  const [listening, setListening] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { setCanVoice(typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)); }, []);

  function shrink(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const max = 1024;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/jpeg", 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("imagem")); };
      img.src = url;
    });
  }

  async function photo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusyPhoto(true);
    try {
      const blob = await shrink(file);
      const fd = new FormData();
      fd.append("image", blob, "foto.jpg");
      const r = await fetch("/api/busca-visual", { method: "POST", body: fd });
      const j = (await r.json()) as { q?: string; error?: string };
      if (!r.ok || !j.q) throw new Error(j.error || "Não consegui analisar a foto.");
      setOpen(false);
      router.push(`/pesquisa?q=${encodeURIComponent(j.q)}`);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Não consegui analisar a foto. Tenta outra imagem.");
    } finally {
      setBusyPhoto(false);
    }
  }
  function voice() {
    const W = window as unknown as Record<string, new () => { lang: string; onresult: (e: { results: { 0: { 0: { transcript: string } } } }) => void; onstart?: () => void; onend?: () => void; onerror?: () => void; start: () => void }>;
    const R = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!R) return;
    const r = new R(); r.lang = "pt-PT";
    window.dispatchEvent(new Event("site-audio-pause"));
    setListening(true);
    r.onstart = () => setListening(true);
    r.onresult = (e) => { const t = e.results[0][0].transcript; setQ(t); router.push(`/pesquisa?q=${encodeURIComponent(t)}`); };
    const done = () => { setListening(false); window.dispatchEvent(new Event("site-audio-resume")); };
    r.onend = done;
    r.onerror = done;
    r.start();
  }

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
      <button type="button" onClick={() => fileRef.current?.click()} disabled={busyPhoto} aria-label="Pesquisar por foto" className="absolute left-1.5 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-ink/45 transition active:bg-neutral-900/5 disabled:opacity-40">
        {busyPhoto ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Camera className="h-[18px] w-[18px]" />}
      </button>
      <Search className="pointer-events-none absolute left-[2.75rem] top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-neutral-500" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Pesquisar no Roque Santeiro"
        className="h-11 w-full rounded-full border border-slate-200 bg-slate-900/[0.04] pl-[5.25rem] pr-28 text-[15px] text-ink shadow-inner outline-none backdrop-blur placeholder:text-slate-400 focus:ring-4 focus:ring-neutral-900/10"
        enterKeyHint="search"
        aria-label="Pesquisar"
      />
      {canVoice && (
        <button type="button" onClick={voice} aria-label="Pesquisar por voz" aria-pressed={listening} className="absolute right-[5.5rem] top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-ink/45 transition active:bg-neutral-900/5">
          {listening && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-red-500/25" />}
          {listening && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-red-500/15 [animation-delay:0.45s]" />}
          <Mic className={listening ? "relative h-[18px] w-[18px] text-red-600" : "relative h-[18px] w-[18px]"} />
        </button>
      )}
      <button className="absolute right-1 top-1 bg-neutral-950 transition active:scale-95 h-9 rounded-full px-4 text-sm font-semibold text-white">Buscar</button>
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
      <div className="bg-white text-ink">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 pb-3 pt-[calc(env(safe-area-inset-top)+0.6rem)] sm:px-5">
          <Link href="/" className="flex shrink-0 items-center gap-2 leading-none" aria-label="Roque Santeiro Express">
            <img src="/logo.png" alt="" width={40} height={40} className="h-9 w-9 rounded-xl ring-1 ring-slate-200 sm:h-10 sm:w-10" />
            <span>
              <span className="block text-[17px] font-extrabold tracking-tight sm:text-xl">Roque Santeiro</span>
              <span className="gold-text block text-[11px] font-semibold uppercase tracking-[0.3em]">Express</span>
            </span>
          </Link>
          <div className="hidden flex-1 md:flex"><Suspense><SearchBox /></Suspense></div>
          <nav className="ml-auto flex items-center gap-1 text-sm">
            <Link href="/vender" className="hidden items-center gap-1.5 rounded-full px-3 py-2 hover:bg-slate-900/10 lg:flex"><Store className="h-4 w-4" />Vender</Link>
            {isStaff(profile?.role) && <Link href="/admin" className="hidden rounded-full px-3 py-2 hover:bg-slate-900/10 md:block">Admin</Link>}
            <Link href={user ? "/conta" : "/entrar"} className="flex items-center gap-1.5 rounded-full px-3 py-2 hover:bg-slate-900/10">
              <User className="h-5 w-5" /><span className="hidden max-w-28 truncate md:inline">{user ? profile?.full_name?.split(" ")[0] || "Conta" : "Entrar"}</span>
            </Link>
            <Link href="/conta/favoritos" className="hidden rounded-full p-2 hover:bg-slate-900/10 md:block" aria-label="Favoritos"><Heart className="h-5 w-5" /></Link>
            <NotificationBell className="relative grid h-9 w-9 place-items-center rounded-full hover:bg-slate-900/10" />
            <Link href="/carrinho" className="relative hidden rounded-full p-2 hover:bg-slate-900/10 md:block" aria-label="Carrinho">
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-neutral-900 px-1 text-center text-[10px] font-bold leading-[18px] text-white">{count}</span>}
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
