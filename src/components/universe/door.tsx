"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import type { Universe } from "@/lib/types";

const LABEL: Record<Universe, string> = { masculino: "Masculino", feminino: "Feminino" };
const EASE = [0.65, 0, 0.2, 1] as const;

function lowPower() {
  if (typeof window === "undefined") return true;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches || !!nav.connection?.saveData || (nav.hardwareConcurrency ?? 8) <= 2 || (nav.deviceMemory ?? 8) <= 1;
}

function Leaf({ side }: { side: "left" | "right" }) {
  const left = side === "left";
  return (
    <motion.div
      className="absolute inset-y-0 w-1/2"
      style={{ [left ? "left" : "right"]: 0, transformOrigin: left ? "0% 50%" : "100% 50%", transformStyle: "preserve-3d", backfaceVisibility: "hidden", background: "linear-gradient(180deg,#1c1c1f 0%,#0d0d0f 55%,#060607 100%)", boxShadow: left ? "inset -1px 0 0 rgba(255,255,255,.06)" : "inset 1px 0 0 rgba(255,255,255,.06)" }}
      initial={{ rotateY: 0 }}
      animate={{ rotateY: left ? -104 : 104 }}
      transition={{ delay: 1.15, duration: 1.05, ease: EASE }}
    >
      <span className="absolute inset-x-[14%] top-[6%] h-[40%] rounded-[2px] border border-white/[0.07] shadow-[inset_0_0_18px_rgba(0,0,0,.6)]" />
      <span className="absolute inset-x-[14%] bottom-[6%] h-[42%] rounded-[2px] border border-white/[0.07] shadow-[inset_0_0_18px_rgba(0,0,0,.6)]" />
      <span className="absolute top-[47%] h-[9%] w-[5%] rounded-full" style={{ [left ? "right" : "left"]: "9%", background: "linear-gradient(180deg,#ffe08a,#f2b21b 55%,#b9780a)", boxShadow: "0 2px 6px rgba(0,0,0,.5)" }} />
    </motion.div>
  );
}

function Scene({ universe }: { universe: Universe }) {
  return (
    <div className="fixed inset-0 z-[200] overflow-hidden" style={{ background: "#f3f1ec" }} role="presentation">
      <motion.div
        className="absolute inset-0"
        style={{ transformOrigin: "50% 56%" }}
        initial={{ scale: 1 }}
        animate={{ scale: 2.7 }}
        transition={{ delay: 0.25, duration: 2.1, ease: EASE }}
      >
        <div className="absolute inset-0" style={{ background: "radial-gradient(120% 80% at 50% 38%,#ffffff 0%,#f4f2ee 46%,#dedbd4 100%)" }} />
        <div className="absolute inset-x-0 bottom-0 h-[26%]" style={{ background: "linear-gradient(180deg,#d9d5cd 0%,#ebe8e2 38%,#f6f4f0 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.9), inset 0 14px 22px -14px rgba(60,50,30,.28)" }} />
        <div className="absolute inset-x-0 bottom-[26%] h-[5px] bg-white/90 shadow-[0_1px_2px_rgba(0,0,0,.12)]" />

        <motion.div className="absolute inset-x-0 top-[13%] text-center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: [0, 1, 1, 0], y: 0 }} transition={{ duration: 1.5, times: [0, 0.25, 0.7, 1] }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-cream/45">Universo</p>
          <p className="mt-1 text-[34px] font-extralight leading-none tracking-[0.06em] text-cream">{LABEL[universe]}</p>
          <span className="mx-auto mt-3 block h-px w-10 bg-gold" />
        </motion.div>

        <div className="absolute bottom-[26%] left-1/2 -translate-x-1/2" style={{ width: "clamp(150px,40vw,250px)", aspectRatio: "0.58", perspective: "900px" }}>
          <div className="absolute -inset-[7px] rounded-[3px] bg-[#0b0b0c] shadow-[0_30px_60px_-20px_rgba(20,15,5,.45)]" />
          <div className="absolute inset-0 overflow-hidden bg-white">
            <motion.div className="absolute inset-0" style={{ background: "radial-gradient(80% 60% at 50% 55%,#ffffff 0%,#fff7de 60%,#ffe9ad 100%)" }} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 0.8 }} />
          </div>
          <motion.span className="absolute inset-y-0 left-1/2 z-10 w-[2px] -translate-x-1/2 bg-white" style={{ boxShadow: "0 0 18px 6px rgba(255,236,170,.95)" }} initial={{ opacity: 0, scaleY: 0.2 }} animate={{ opacity: [0, 1, 1, 0], scaleY: 1 }} transition={{ delay: 0.75, duration: 0.9, times: [0, 0.4, 0.8, 1] }} />
          <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
            <Leaf side="left" />
            <Leaf side="right" />
          </div>
          <motion.div
            className="absolute left-1/2 top-full h-[70%] w-[190%] -translate-x-1/2"
            style={{ clipPath: "polygon(24% 0,76% 0,100% 100%,0 100%)", background: "linear-gradient(180deg,rgba(255,255,255,.98),rgba(255,244,205,.5) 55%,transparent)", transformOrigin: "50% 0%" }}
            initial={{ opacity: 0, scaleY: 0.3 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ delay: 1.2, duration: 0.9, ease: EASE }}
          />
        </div>
      </motion.div>
      <motion.div className="absolute inset-0 bg-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.75, duration: 0.6, ease: "easeIn" }} />
    </div>
  );
}

/** Porta dupla que abre para um universo. Só é usada na entrada dos Universos Masculino/Feminino. */
export function UniverseDoor({ universe, className, children }: { universe: Universe; className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const href = `/universo/${universe}`;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => { try { sessionStorage.setItem("rs-door", "1"); } catch {} window.location.href = href; }, 2380);
    const back = () => setOpen(false);
    window.addEventListener("pageshow", back);
    return () => { clearTimeout(t); document.body.style.overflow = prev; window.removeEventListener("pageshow", back); };
  }, [open, href]);

  return (
    <>
      <a href={href} className={className} onClick={(e) => { if (lowPower() || e.metaKey || e.ctrlKey) return; e.preventDefault(); setOpen(true); }}>{children}</a>
      {open && createPortal(<Scene universe={universe} />, document.body)}
    </>
  );
}

/** Do lado de dentro: o clarão branco dissolve-se e o universo aparece. */
export function DoorReveal() {
  useEffect(() => {
    const el = document.documentElement;
    if (!el.classList.contains("door-in")) return;
    try { sessionStorage.removeItem("rs-door"); } catch {}
    const a = requestAnimationFrame(() => el.classList.add("door-go"));
    const t = setTimeout(() => el.classList.remove("door-in", "door-go"), 1300);
    return () => { cancelAnimationFrame(a); clearTimeout(t); };
  }, []);
  return null;
}

export const DOOR_BOOT = `try{if(sessionStorage.getItem("rs-door")){document.documentElement.classList.add("door-in")}}catch(e){}`;
