"use client";

import { motion, useReducedMotion } from "motion/react";
import { BlurReveal } from "@/components/effects/blur-reveal";
import { kz } from "@/lib/utils";

const STEPS = ["Comprovativo recebido", "A verificar com o banco", "Confirmação do pagamento"];

export function PaymentProcessing({ number, total, reference }: { number: number; total: number; reference?: string | null }) {
  const reduce = useReducedMotion();
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", damping: 24, stiffness: 220 }}
      className="relative overflow-hidden rounded-[2rem] bg-[#0d0d0f] p-6 text-center text-white" role="status" aria-live="polite">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(242,178,27,0.22),transparent)]" />
      <div className="relative mx-auto grid h-24 w-24 place-items-center">
        {!reduce && [0, 1, 2].map((i) => (
          <motion.span key={i} className="absolute inset-0 rounded-full border border-gold/50"
            initial={{ scale: 0.6, opacity: 0.7 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 2.4, delay: i * 0.8, repeat: Infinity, ease: "easeOut" }} />
        ))}
        <motion.svg viewBox="0 0 52 52" className="absolute h-24 w-24" animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}>
          <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
          <circle cx="26" cy="26" r="22" fill="none" stroke="url(#rsegold)" strokeWidth="3" strokeLinecap="round" strokeDasharray="40 140" />
          <defs><linearGradient id="rsegold" x1="0" x2="1"><stop offset="0" stopColor="#ffe08a" /><stop offset="1" stopColor="#b9780a" /></linearGradient></defs>
        </motion.svg>
        <img src="/logo.png" alt="" className="h-12 w-12 rounded-xl" />
      </div>
      <p className="mt-4 text-xl font-extrabold"><BlurReveal>Pagamento em processamento</BlurReveal></p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-white/70">
        Encomenda #{number} · {kz(total)}{reference ? ` · ref. ${reference}` : ""}. Ainda não está confirmado: avisamos assim que o pagamento for validado.
      </p>
      <ol className="mx-auto mt-5 grid max-w-sm gap-2 text-left text-sm">
        {STEPS.map((s, i) => (
          <motion.li key={s} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.25 }}
            className="flex items-center gap-3 rounded-2xl bg-white/[0.06] px-3 py-2">
            {i === 0
              ? <span className="grid h-5 w-5 place-items-center rounded-full bg-gold text-[11px] font-bold text-black">✓</span>
              : <motion.span className="h-5 w-5 rounded-full border-2 border-gold/60" animate={reduce || i > 1 ? undefined : { opacity: [0.35, 1, 0.35] }} transition={{ duration: 1.4, repeat: Infinity }} />}
            <span className={i === 0 ? "font-semibold" : "text-white/70"}>{s}</span>
          </motion.li>
        ))}
      </ol>
    </motion.div>
  );
}
