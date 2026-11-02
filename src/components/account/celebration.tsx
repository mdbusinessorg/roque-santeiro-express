"use client";

import Link from "@/components/ui/native-link";
import { motion, useReducedMotion } from "motion/react";
import { MapPin } from "lucide-react";
import { BlurReveal } from "@/components/effects/blur-reveal";
import { kz } from "@/lib/utils";

const DOTS = Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * Math.PI * 2, d: 70 + (i % 3) * 22, c: i % 3 === 0 ? "#ffffff" : i % 3 === 1 ? "#ffd0d6" : "#ff8a96" }));

export function Celebration({ number, total, items, eta }: { number: number; total: number; items: number; eta?: string | null }) {
  const reduce = useReducedMotion();
  return (
    <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", damping: 24, stiffness: 220 }}
      className="brand-gradient relative overflow-hidden rounded-[2rem] p-6 text-center text-white">
      <div className="relative mx-auto grid h-20 w-20 place-items-center">
        {!reduce && DOTS.map((p, i) => (
          <motion.span key={i} className="absolute h-1.5 w-1.5 rounded-full" style={{ background: p.c }} initial={{ x: 0, y: 0, opacity: 0 }}
            animate={{ x: Math.cos(p.a) * p.d, y: Math.sin(p.a) * p.d, opacity: [0, 1, 0] }} transition={{ duration: 1.4, delay: 0.35 + (i % 4) * 0.04, ease: "easeOut" }} />
        ))}
        <motion.span className="absolute inset-0 rounded-full bg-white/20" initial={{ scale: 0 }} animate={{ scale: [0, 1.25, 1] }} transition={{ duration: 0.6 }} />
        <svg viewBox="0 0 52 52" className="relative h-14 w-14">
          <motion.circle cx="26" cy="26" r="24" fill="#fff" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }} />
          <motion.path d="M15 27 l7 7 l15 -16" fill="none" stroke="#e5484d" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, delay: 0.45 }} />
        </svg>
      </div>
      <p className="mt-3 text-2xl font-extrabold"><BlurReveal delay={0.5}>Pagamento confirmado!</BlurReveal></p>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="mx-auto mt-4 grid max-w-sm grid-cols-3 gap-2 rounded-2xl bg-white/15 p-3 text-xs backdrop-blur">
        <div><p className="text-white/70">Encomenda</p><p className="font-bold">#{number}</p></div>
        <div><p className="text-white/70">Artigos</p><p className="font-bold">{items}</p></div>
        <div><p className="text-white/70">Total pago</p><p className="font-bold">{kz(total)}</p></div>
      </motion.div>
      {eta && <p className="mt-3 text-sm text-white/85">Previsão de entrega: <b>{new Date(eta).toLocaleDateString("pt-AO")}</b></p>}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
        <Link href="#acompanhar" className="btn mt-4 bg-white px-5 py-2.5 font-bold text-brand-600"><MapPin className="h-4 w-4" />Acompanhar encomenda</Link>
      </motion.div>
    </motion.div>
  );
}
