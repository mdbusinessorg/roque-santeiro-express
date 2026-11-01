"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { kz } from "@/lib/utils";

export type Viewed = { slug: string; name: string; image: string; price: number };
const KEY = "rse_viewed";

export function trackViewed(v: Viewed) {
  try {
    const list: Viewed[] = JSON.parse(localStorage.getItem(KEY) || "[]").filter((x: Viewed) => x.slug !== v.slug);
    localStorage.setItem(KEY, JSON.stringify([v, ...list].slice(0, 12)));
  } catch {}
}

export function TrackView(props: Viewed) {
  useEffect(() => { trackViewed(props); }, [props]);
  return null;
}

export function RecentlyViewed() {
  const [items, setItems] = useState<Viewed[]>([]);
  useEffect(() => { try { setItems(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch {} }, []);
  if (!items.length) return null;
  return (
    <section className="mt-6">
      <h2 className="mb-3 px-1 text-[19px] font-bold tracking-tight sm:text-2xl">Vistos recentemente</h2>
      <div className="no-scrollbar -mx-3 flex gap-2.5 overflow-x-auto px-3">
        {items.map((v) => (
          <Link key={v.slug} href={`/produto/${v.slug}`} className="card w-32 shrink-0 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={v.image} alt={v.name} className="aspect-square w-full rounded-xl bg-mist object-contain p-1" />
            <p className="mt-1 line-clamp-1 text-[11.5px]">{v.name}</p>
            <p className="text-[13px] font-bold text-brand-800">{kz(v.price)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
