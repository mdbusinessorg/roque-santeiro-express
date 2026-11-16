"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Mic, Radio } from "lucide-react";
import Link from "@/components/ui/native-link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { TALK_TOPICS, type Product } from "@/lib/types";
import { cn, kz } from "@/lib/utils";

type Live = { room_id: string; topic: string; product_slug: string; product_name: string; product_image: string | null; store_name: string; people: number; names: string[] };

function useLiveRooms() {
  const [live, setLive] = useState<Live[] | null>(null);
  useEffect(() => {
    const sb = supabaseBrowser();
    let alive = true;
    const load = () => sb.rpc("talk_live", { p_product: null }).then(({ data, error }) => { if (alive) setLive(error ? [] : ((data ?? []) as Live[])); });
    load();
    const t = setInterval(load, 15000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  return live;
}

const LiveBadge = ({ className }: { className?: string }) => (
  <span className={cn("flex w-fit items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wider text-white", className)}><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />Ao vivo</span>
);

/** Atalho da página inicial para o BISNO TALKS. */
export function TalksEntry({ className }: { className?: string }) {
  const live = useLiveRooms();
  const people = (live ?? []).reduce((n, r) => n + r.people, 0);
  return (
    <Link href="/talks" className={cn("relative flex items-center gap-4 overflow-hidden rounded-[1.6rem] bg-neutral-950 p-4 text-white transition active:scale-[0.98] sm:p-6", className)}>
      <span aria-hidden className="absolute -right-10 -top-16 h-44 w-44 rounded-full bg-gold/20 blur-3xl" />
      <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gold text-white"><Mic className="h-6 w-6" /><span className="absolute inset-0 animate-ping rounded-full border border-gold/60" /></span>
      <span className="relative min-w-0 flex-1">
        <LiveBadge />
        <span className="mt-1.5 block text-[22px] font-black leading-none tracking-tight">BISNO <span className="text-white">TALKS</span></span>
        <span className="mt-1 block text-[12.5px] leading-snug text-white/60">{people > 0 ? `${people} ${people === 1 ? "pessoa" : "pessoas"} a falar agora sobre produtos` : "Fale ao vivo, só por voz, sobre qualquer produto"}</span>
      </span>
      <ArrowRight className="relative h-5 w-5 shrink-0 text-white" />
    </Link>
  );
}

export function TalksHub({ products }: { products: Product[] }) {
  const live = useLiveRooms();
  return (
    <div className="pb-6 pt-4">
      <section className="overflow-hidden rounded-[28px] bg-neutral-950 p-5 text-white sm:p-8">
        <LiveBadge />
        <h1 className="mt-3 text-[34px] font-black leading-none tracking-tight sm:text-5xl">BISNO <span className="text-white">TALKS</span></h1>
        <p className="mt-2 max-w-md text-[13.5px] leading-snug text-white/65">Salas de voz ao vivo sobre cada produto. Só voz, sem texto, e a sala não é gravada. Escolha um produto, um tema e entre.</p>
      </section>

      <h2 className="mt-7 flex items-center gap-2 text-lg font-extrabold tracking-tight"><Radio className="h-5 w-5 text-red-600" />Salas abertas agora</h2>
      {live === null ? (
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">{[0, 1].map((k) => <div key={k} className="h-[84px] animate-pulse rounded-3xl bg-neutral-900/[0.06]" />)}</div>
      ) : live.length === 0 ? (
        <p className="card mt-3 p-4 text-[13.5px] text-ink/65">Nenhuma sala aberta neste momento. Abra a primeira: escolha um produto em baixo.</p>
      ) : (
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {live.map((r) => (
            <li key={r.room_id}>
              <Link href={`/produto/${r.product_slug}#bisno-talks`} className="card flex items-center gap-3 p-3 transition active:scale-[0.98]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {r.product_image ? <img src={r.product_image} alt="" className="h-14 w-14 shrink-0 rounded-2xl bg-white object-contain" /> : <span className="h-14 w-14 shrink-0 rounded-2xl bg-neutral-900/5" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-bold">{r.product_name}</span>
                  <span className="block truncate text-[12px] text-ink/55">{TALK_TOPICS[r.topic] ?? r.topic} · {r.names.join(", ")}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[12px] font-bold text-white"><Mic className="h-3.5 w-3.5" />{r.people}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 text-lg font-extrabold tracking-tight">Abrir uma conversa</h2>
      <p className="text-[12.5px] text-ink/55">Toque num produto para falar sobre ele.</p>
      <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <li key={p.id}>
            <Link href={`/produto/${p.slug}#bisno-talks`} className="card flex h-full flex-col p-2.5 transition active:scale-[0.98]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.images[0]} alt="" loading="lazy" className="aspect-square w-full rounded-2xl bg-white object-contain" />
              <span className="mt-2 line-clamp-2 text-[13px] font-semibold leading-snug">{p.name}</span>
              <span className="mt-0.5 text-[12px] text-ink/50">{kz(p.price)}</span>
              <span className="mt-auto flex items-center justify-center gap-1.5 rounded-full bg-neutral-950 px-3 py-2 pt-2 text-[12px] font-bold text-white"><Mic className="h-3.5 w-3.5" />Falar ao vivo</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
