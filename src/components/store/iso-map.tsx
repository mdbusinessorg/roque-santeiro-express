"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, MapPin, X } from "lucide-react";
import { STORE_TYPES, type Store } from "@/lib/types";

type Pin = Pick<Store, "id" | "name" | "slug" | "logo_url" | "city" | "store_type" | "is_demo" | "description">;

const N = 10, TW = 112, TH = 56, OX = (N * TW) / 2 + 40, OY = 150;
const W = N * TW + 80, H = N * TH + 330;
const r1 = (n: number) => Math.round(n * 10) / 10;
const P = (i: number, j: number, z = 0) => [r1(OX + (i - j) * (TW / 2)), r1(OY + (i + j) * (TH / 2) - z)] as const;
const pts = (a: (readonly [number, number])[]) => a.map((p) => p.join(",")).join(" ");
/** Pseudo-aleatório estável (inteiros apenas, para o servidor e o browser darem o mesmo resultado). */
const rnd = (i: number, j: number) => (((i * 73856093) ^ (j * 19349663) ^ ((i + j) * 83492791)) >>> 0) % 1000 / 1000;

const ROAD = (i: number, j: number) => i === 4 || j === 5 || (i === 8 && j > 5);
const WATER = (i: number, j: number) => i + (N - 1 - j) <= 2 || (j <= 1 && i >= 6);
const SAND = (i: number, j: number) => !WATER(i, j) && (i + (N - 1 - j) === 3 || (j === 2 && i >= 6));
/** Lotes onde ficam as lojas, do mais central para fora. */
const LOTS: [number, number][] = [[3, 3], [5, 3], [2, 4], [6, 6], [5, 7], [2, 6], [3, 1], [7, 3], [5, 1], [1, 1], [7, 9], [5, 9], [9, 3]];
const WALLS = [["#ffffff", "#e9e6df", "#d3cfc6"], ["#ffe9b8", "#f4cd7a", "#dba94a"], ["#ffd9cf", "#f3b3a3", "#d98e7c"], ["#dff1ff", "#b9dcf5", "#8fbfe0"], ["#e6f6dc", "#c3e3b0", "#9cc784"]];

function Tile({ i, j }: { i: number; j: number }) {
  const water = WATER(i, j), road = ROAD(i, j), sand = SAND(i, j);
  const fill = water ? ((i + j) % 2 ? "#5cc3ea" : "#6bcdf0") : road ? "#454b57" : sand ? "#f3e2a9" : (i + j) % 2 ? "#a6d86f" : "#9bd063";
  const d = [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)];
  return (
    <g>
      <polygon points={pts(d)} fill={fill} stroke={water ? "none" : "rgba(0,0,0,.05)"} />
      {road && !water && <line x1={r1((d[0][0] + d[1][0]) / 2)} y1={r1((d[0][1] + d[1][1]) / 2)} x2={r1((d[2][0] + d[3][0]) / 2)} y2={r1((d[2][1] + d[3][1]) / 2)} stroke="#fff" strokeOpacity={i === 4 || i === 8 ? 0 : 0.7} strokeWidth="2" strokeDasharray="7 9" />}
      {road && !water && (i === 4 || i === 8) && <line x1={r1((d[0][0] + d[3][0]) / 2)} y1={r1((d[0][1] + d[3][1]) / 2)} x2={r1((d[1][0] + d[2][0]) / 2)} y2={r1((d[1][1] + d[2][1]) / 2)} stroke="#fff" strokeOpacity="0.7" strokeWidth="2" strokeDasharray="7 9" />}
    </g>
  );
}

function Box({ i, j, h, c, inset = 0.16 }: { i: number; j: number; h: number; c: string[]; inset?: number }) {
  const a = i + inset, b = j + inset, e = i + 1 - inset, f = j + 1 - inset;
  return (
    <g>
      <polygon points={pts([P(a, f), P(e, f), P(e, f, h), P(a, f, h)])} fill={c[1]} />
      <polygon points={pts([P(e, b), P(e, f), P(e, f, h), P(e, b, h)])} fill={c[2]} />
      <polygon points={pts([P(a, b, h), P(e, b, h), P(e, f, h), P(a, f, h)])} fill={c[0]} />
    </g>
  );
}

function Tree({ i, j }: { i: number; j: number }) {
  const [x, y] = P(i + 0.5, j + 0.5);
  const s = r1(0.8 + rnd(j, i) * 0.5);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="2" rx="13" ry="6" fill="rgba(0,0,0,.12)" />
      <rect x="-2.5" y="-10" width="5" height="12" fill="#8a5a36" />
      <polygon points="0,-52 15,-8 0,-2" fill="#3f9a4f" /><polygon points="0,-52 -15,-8 0,-2" fill="#57b765" />
    </g>
  );
}

const shopH = (k: number) => 46 + (k % 3) * 14;

function Shop({ i, j, k }: { i: number; j: number; k: number }) {
  const h = shopH(k);
  return (
    <g>
      <Box i={i} j={j} h={h} c={WALLS[k % WALLS.length]} />
      <polygon points={pts([P(i + 0.16, j + 0.84, h), P(i + 0.84, j + 0.84, h), P(i + 0.84, j + 0.84, h - 9), P(i + 0.16, j + 0.84, h - 9)])} fill="#111113" />
      <polygon points={pts([P(i + 0.4, j + 0.84), P(i + 0.6, j + 0.84), P(i + 0.6, j + 0.84, 24), P(i + 0.4, j + 0.84, 24)])} fill="#111113" opacity="0.85" />
    </g>
  );
}

function ShopPin({ i, j, k, pin, active, onPick }: { i: number; j: number; k: number; pin: Pin; active: boolean; onPick: () => void }) {
  const [x, y] = P(i + 0.5, j + 0.5, shopH(k));
  const initials = pin.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const label = pin.name.length > 15 ? pin.name.slice(0, 14) + "…" : pin.name;
  const lw = Math.round(label.length * 6.4 + 18);
  return (
    <g role="button" tabIndex={0} aria-label={pin.name} onClick={onPick} onKeyDown={(e) => { if (e.key === "Enter") onPick(); }} style={{ cursor: "pointer" }}>
      <g className="iso-pin" style={{ animationDelay: `${(k % 5) * 0.25}s` }}>
        <line x1={x} y1={y - 4} x2={x} y2={y - 26} stroke="#111113" strokeWidth="2" />
        <circle cx={x} cy={y - 48} r={active ? 27 : 24} fill="#fff" stroke={active ? "#f2b21b" : "#111113"} strokeWidth={active ? 4 : 2.5} />
        {pin.logo_url ? <image href={pin.logo_url} x={x - 20} y={y - 68} width="40" height="40" preserveAspectRatio="xMidYMid slice" style={{ clipPath: "circle(20px at 20px 20px)" }} /> : <text x={x} y={y - 42} textAnchor="middle" fontSize="16" fontWeight="800" fill="#111113">{initials}</text>}
        <rect x={x - lw / 2} y={y - 100} width={lw} height="20" rx="10" fill="#111113" />
        <text x={x} y={y - 86} textAnchor="middle" fontSize="11" fontWeight="700" fill="#f2b21b">{label}</text>
      </g>
    </g>
  );
}

/** Mapa isométrico das lojas: uma cidade em miniatura com o logo de cada loja por cima do seu edifício. */
export function IsoMap({ stores }: { stores: Pin[] }) {
  const [sel, setSel] = useState<Pin | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = wrap.current; if (el) { el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2; el.scrollTop = 40; } }, []);

  const lot = new Map<string, { pin: Pin; k: number }>();
  stores.slice(0, LOTS.length).forEach((pin, k) => lot.set(LOTS[k].join(), { pin, k }));
  const cells: [number, number][] = [];
  for (let s = 0; s <= 2 * (N - 1); s++) for (let i = 0; i < N; i++) { const j = s - i; if (j >= 0 && j < N) cells.push([i, j]); }

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/70 bg-[#cfe9f2] shadow-[0_30px_60px_-40px_rgba(24,24,27,.55)]">
      <div ref={wrap} className="no-scrollbar h-[68dvh] min-h-[440px] overflow-auto overscroll-contain" style={{ touchAction: "pan-x pan-y" }}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="mx-auto block max-w-none" role="img" aria-label="Mapa das lojas">
          <ellipse cx={OX} cy={OY + (N * TH) / 2 + 30} rx={W * 0.52} ry={N * TH * 0.62} fill="#bfe0ec" />
          <polygon points={pts([P(0, N), P(N, N), P(N, N, -26), P(0, N, -26)])} fill="#c9a877" />
          <polygon points={pts([P(N, 0), P(N, N), P(N, N, -26), P(N, 0, -26)])} fill="#b08f60" />
          {cells.map(([i, j]) => <Tile key={`t${i}-${j}`} i={i} j={j} />)}
          {cells.map(([i, j]) => {
            const key = `${i},${j}`;
            const shop = lot.get(key);
            if (shop) return <Shop key={key} i={i} j={j} k={shop.k} />;
            if (WATER(i, j) || ROAD(i, j) || SAND(i, j)) return null;
            const r = rnd(i, j);
            if (r < 0.42) return <Tree key={key} i={i} j={j} />;
            if (r < 0.62) return <Box key={key} i={i} j={j} h={Math.round(20 + r * 30)} c={WALLS[Math.floor(r * 50) % WALLS.length]} inset={0.24} />;
            return null;
          })}
          {cells.map(([i, j]) => {
            const shop = lot.get(`${i},${j}`);
            return shop ? <ShopPin key={shop.pin.id} i={i} j={j} k={shop.k} pin={shop.pin} active={sel?.id === shop.pin.id} onPick={() => setSel(shop.pin)} /> : null;
          })}
        </svg>
      </div>

      <p className="pointer-events-none absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1.5 text-[11.5px] font-semibold text-ink/70 backdrop-blur">Arraste para passear · toque numa loja</p>

      {sel && (
        <div className="absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-[22px] bg-white/95 p-3 shadow-2xl backdrop-blur sm:left-auto sm:w-[360px]">
          <div className="min-w-0 flex-1 pl-1">
            <p className="flex items-center gap-1.5 truncate text-[15px] font-extrabold">{sel.name}{sel.is_demo && <span className="rounded-full border border-line px-1.5 py-px text-[9.5px] font-medium uppercase tracking-wide text-ink/50">Demonstração</span>}</p>
            <p className="flex items-center gap-1 truncate text-[12px] text-ink/55"><MapPin className="h-3.5 w-3.5 shrink-0" />{[STORE_TYPES[sel.store_type ?? "geral"], sel.city].filter(Boolean).join(" · ")}</p>
          </div>
          <a href={`/loja/${sel.slug}`} className="flex h-10 shrink-0 items-center gap-1 rounded-full bg-ink px-4 text-[12.5px] font-bold text-gold">Entrar<ArrowRight className="h-3.5 w-3.5" /></a>
          <button type="button" aria-label="Fechar" onClick={() => setSel(null)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink/5"><X className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}
